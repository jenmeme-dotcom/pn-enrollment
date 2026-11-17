const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const { inflateSync } = require("node:zlib");
const { createStudentGradePdfBuffer, gradeReportRow, gradePdfFilename } = require("../src/gradePdf");

const projectRoot = path.resolve(__dirname, "..");
let serverProcess, database, temporaryDirectory, baseUrl, studentCookie, adminCookie, enrollmentId, otherEnrollmentId;

function pdfText(buffer) {
  // PDFKit's built-in fonts encode text as hex strings inside compressed
  // content streams. Decode those streams to inspect the actual download.
  const source = buffer.toString("latin1");
  const texts = [];
  for (const match of source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let stream;
    try { stream = inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"); } catch { continue; }
    for (const block of stream.matchAll(/BT\b([\s\S]*?)\bET/g)) {
      texts.push([...block[1].matchAll(/<([0-9a-f]+)>/gi)].map(hex => Buffer.from(hex[1], "hex").toString("latin1")).join(""));
    }
  }
  return texts.join(" ").replace(/\s+/g, " ");
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const { port } = socket.address();
      socket.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function startServer(port, databaseFile) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`Server did not start.\n${output}`)), 120_000);
    serverProcess = spawn(process.execPath, ["--no-warnings", "src/server.js"], {
      cwd: projectRoot,
      env: { ...process.env, DATABASE_FILE: databaseFile, EMAIL_DELIVERY_ENABLED: "false", NODE_ENV: "test", PORT: String(port), PUBLIC_APP_URL: `http://127.0.0.1:${port}`, SESSION_SECRET: "grade-pdf-test-secret" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    const onOutput = chunk => {
      output += chunk.toString();
      if (!output.includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      resolve();
    };
    serverProcess.stdout.on("data", onOutput);
    serverProcess.stderr.on("data", onOutput);
    serverProcess.once("error", error => { clearTimeout(timeout); reject(error); });
    serverProcess.once("exit", (code, signal) => {
      if (output.includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      reject(new Error(`Server exited (${code ?? signal}).\n${output}`));
    });
  });
}

async function login(email, password, loginRole) {
  const response = await fetch(`${baseUrl}/login`, {
    method: "POST", body: new URLSearchParams({ email, password, loginRole }),
    headers: { "content-type": "application/x-www-form-urlencoded" }, redirect: "manual"
  });
  assert.equal(response.status, 302);
  const cookie = (response.headers.getSetCookie?.()[0] || response.headers.get("set-cookie") || "").split(";", 1)[0];
  assert.match(cookie, /^bmhi\.sid=/);
  return cookie;
}

function request(route, cookie = studentCookie) {
  return fetch(`${baseUrl}${route}`, { headers: cookie ? { cookie } : {}, redirect: "manual" });
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-grade-pdf-"));
  const databaseFile = path.join(temporaryDirectory, "grades.sqlite");
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile);
  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA busy_timeout = 5000;");
  const photo = "grade-test.png";
  fs.writeFileSync(path.join(temporaryDirectory, "uploads", photo), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  database.prepare("UPDATE users SET organization_status='organized', photo_review_status='approved', photo_storage_name=?, photo_original_name=? WHERE email='student@browardmiamihi.com'").run(photo, photo);
  const student = database.prepare("SELECT * FROM users WHERE email='student@browardmiamihi.com'").get();
  const otherId = Number(database.prepare("INSERT INTO users (role,first_name,last_name,email,password_hash) VALUES ('student','PrivateOther','Student','private-other@example.test',?)").run(student.password_hash).lastInsertRowid);
  const courseId = Number(database.prepare("INSERT INTO courses (title,slug,category,description,hours,published) VALUES ('Grade Download Test','grade-download-test','Test','Grade report testing course.',10,1)").run().lastInsertRowid);
  const moduleId = Number(database.prepare("INSERT INTO modules (course_id,title,position,published) VALUES (?,'Test Module',1,1)").run(courseId).lastInsertRowid);
  database.prepare("INSERT INTO lessons (module_id,title,content,position,published) VALUES (?,'Overview','Course overview.',1,1)").run(moduleId);
  enrollmentId = Number(database.prepare("INSERT INTO enrollments (user_id,course_id,status) VALUES (?,?,'active')").run(student.id, courseId).lastInsertRowid);
  otherEnrollmentId = Number(database.prepare("INSERT INTO enrollments (user_id,course_id,status) VALUES (?,?,'active')").run(otherId, courseId).lastInsertRowid);
  const item = (title, points = 100, hidden = 0, email = null) => Number(database.prepare("INSERT INTO grade_items (course_id,title,points_possible,gradebook_hidden,allowed_student_email) VALUES (?,?,?,?,?)").run(courseId, title, points, hidden, email).lastInsertRowid);
  database.exec(`CREATE TABLE course_project_items (
    course_id INTEGER NOT NULL, project_key TEXT NOT NULL, grade_item_id INTEGER NOT NULL UNIQUE,
    lesson_id INTEGER NOT NULL UNIQUE, due_week INTEGER NOT NULL, grading_pending INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY(course_id,project_key)
  )`);
  for (const week of [7, 9, 11]) {
    const title = `Course Project Week ${week}`;
    const gradeItemId = item(title, 0);
    const lessonId = Number(database.prepare("INSERT INTO lessons(module_id,title,content,position,published,item_type,grade_item_id) VALUES (?,?,'Project instructions',?,1,'assignment',?)").run(moduleId, title, week, gradeItemId).lastInsertRowid);
    database.prepare("INSERT INTO course_project_items(course_id,project_key,grade_item_id,lesson_id,due_week) VALUES (?,?,?,?,?)").run(courseId, `project_${week}`, gradeItemId, lessonId, week);
  }
  const posted = item("Posted Assignment", 100);
  const zero = item("Actual Zero Assignment", 100);
  const pending = item("Pending Review Assignment", 100);
  const missing = item("No Posted Grade", 100);
  const submitted = item("Submitted Assignment", 100);
  const completed = item("Completed PrepU", 0);
  const incomplete = item("Incomplete PrepU", 0);
  const hidden = item("SECRET HIDDEN ITEM", 100, 1);
  const restricted = item("SECRET OTHER STUDENT ITEM", 100, 0, "private-other@example.test");
  item("Syllabus Acknowledgment", 100);
  const grade = database.prepare("INSERT INTO grades (enrollment_id,grade_item_id,score,note) VALUES (?,?,?,?)");
  grade.run(enrollmentId, posted, 88.25, "Posted by instructor");
  grade.run(enrollmentId, zero, 0, "Posted by instructor");
  grade.run(enrollmentId, pending, 99.13, "[AUTO_GRADE_PENDING_APPROVAL] Secret pending assessment");
  grade.run(enrollmentId, hidden, 66.66, "Hidden");
  grade.run(enrollmentId, restricted, 77.77, "Not this student's item");
  grade.run(otherEnrollmentId, posted, 91.27, "Other student's grade");
  database.prepare("INSERT INTO assignment_completion_statuses (enrollment_id,grade_item_id,status) VALUES (?,?,'completed'), (?,?,'incomplete')").run(enrollmentId, completed, enrollmentId, incomplete);
  database.prepare("INSERT INTO assignment_submissions (enrollment_id,grade_item_id,file_storage_name,file_original_name,student_note,submitted_at) VALUES (?,?,'','', 'Ready','2026-11-17 12:00:00')").run(enrollmentId, submitted);
  assert.ok(missing);
  studentCookie = await login("student@browardmiamihi.com", "StudentPass123!", "student");
  adminCookie = await login("admin@browardmiamihi.com", "AdminPass123!", "faculty");
});

after(async () => {
  database?.close();
  if (serverProcess && serverProcess.exitCode === null) {
    await new Promise(resolve => { serverProcess.once("exit", resolve); serverProcess.kill("SIGTERM"); setTimeout(resolve, 5000).unref(); });
  }
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("PDF rows retain zero, ungraded, pending and completion distinctions", () => {
  assert.equal(gradeReportRow({ score: 0, points_possible: 100 }).score, "0");
  assert.equal(gradeReportRow({ score: null, points_possible: 100 }).score, "-");
  assert.equal(gradeReportRow({ score: "", points_possible: 100 }).hasScore, false);
  assert.equal(gradeReportRow({ score: 90, points_possible: 100, status: "pending" }).score, "-");
  assert.equal(gradeReportRow({ points_possible: 0, status: "completed" }).status, "Completed");
  assert.equal(gradeReportRow({ points_possible: 0, status: "incomplete" }).points, "Status only");
  const pendingProject = gradeReportRow({ title: "APA Paper", points_possible: 0, grading_pending: true, project_due_week: 9 });
  assert.equal(pendingProject.points, "Grading allocation pending");
  assert.equal(pendingProject.score, "-");
  assert.equal(pendingProject.due, "Week 9; calendar date pending");
  assert.equal(gradeReportRow({ points_possible: 20, grading_pending: false, project_due_week: 7, due_date: "2026-12-01" }).due, "2026-12-01");
  assert.equal(gradeReportRow({ points_possible: 20, grading_pending: false, project_due_week: 7 }).points, "20");
  assert.match(gradeReportRow({ score: 70, points_possible: 100, attempt_status: "retake" }).status, /saved grade retained/);
  assert.equal(gradePdfFilename('../../PN 101\r\n";malicious'), "PN-101-malicious-student-grades.pdf");
});

test("Grades page offers one direct download containing only this student's visible posted grades", async () => {
  const page = await request(`/student/enrollments/${enrollmentId}?view=grades`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.equal((html.match(/Download Grades PDF/g) || []).length, 1);
  assert.match(html, new RegExp(`href="/student/enrollments/${enrollmentId}/grades\\.pdf" download`));
  const response = await request(`/student/enrollments/${enrollmentId}/grades.pdf`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(response.headers.get("content-disposition"), /^attachment; filename="[A-Za-z0-9-]+\.pdf"$/);
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const pdf = Buffer.from(await response.arrayBuffer());
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.equal(Number(response.headers.get("content-length")), pdf.length);
  assert.match(pdf.subarray(-100).toString(), /%%EOF\s*$/);
  const text = pdfText(pdf);
  assert.match(text, /Posted Assignment/);
  assert.match(text, /88\.25/);
  assert.match(text, /Actual Zero Assignment 100 0 Graded/);
  assert.match(text, /No Posted Grade 100 - Not yet graded/);
  assert.match(text, /Pending Review Assignment 100 - Pending review/);
  assert.match(text, /Completed PrepU Status only - Completed/);
  assert.match(text, /Incomplete PrepU Status only - Incomplete/);
  assert.match(text, /Submitted Assignment 100 - Submitted; awaiting grade/);
  assert.match(text, /Official final grade: Not posted/);
  assert.match(text, /Recorded course points: 88\.25 \/ 500/);
  for (const week of [7, 9, 11]) {
    assert.match(text, new RegExp(`Course Project Week ${week} \\| Due: Week ${week}; calendar date pending Grading allocation pending - Not yet graded`));
    assert.doesNotMatch(text, new RegExp(`Course Project Week ${week}[^|]*Status only`));
  }
  assert.match(text, /Grading points and category allocation are pending instructor confirmation/);
  assert.doesNotMatch(text, /SECRET|Syllabus Acknowledgment|99\.13|66\.66|77\.77|91\.27|PrivateOther/);
});

test("grade downloads enforce authentication, role, enrollment ownership and access status", async () => {
  const route = `/student/enrollments/${enrollmentId}/grades.pdf`;
  const anonymous = await request(route, "");
  assert.equal(anonymous.status, 302);
  assert.equal(anonymous.headers.get("location"), "/login");
  assert.equal((await request(route, adminCookie)).status, 403);
  assert.equal((await request(`/student/enrollments/${otherEnrollmentId}/grades.pdf`)).status, 404);
  assert.equal((await request("/student/enrollments/99999999/grades.pdf")).status, 404);
  database.prepare("UPDATE enrollments SET status='withdrawn' WHERE id=?").run(enrollmentId);
  try { assert.equal((await request(route)).status, 404); }
  finally { database.prepare("UPDATE enrollments SET status='active' WHERE id=?").run(enrollmentId); }
  database.prepare("UPDATE users SET organization_status='not_organized' WHERE email='student@browardmiamihi.com'").run();
  try { assert.equal((await request(route)).status, 403); }
  finally { database.prepare("UPDATE users SET organization_status='organized' WHERE email='student@browardmiamihi.com'").run(); }
});

test("only a completed enrollment's saved final appears as official and the PDF does not change records", async () => {
  const route = `/student/enrollments/${enrollmentId}/grades.pdf`;
  database.prepare("UPDATE enrollments SET final_grade='B+' WHERE id=?").run(enrollmentId);
  assert.match(pdfText(Buffer.from(await (await request(route)).arrayBuffer())), /Official final grade: Not posted/);
  database.prepare("UPDATE enrollments SET status='completed' WHERE id=?").run(enrollmentId);
  const before = database.prepare("SELECT * FROM enrollments WHERE id=?").get(enrollmentId);
  const beforeGrades = database.prepare("SELECT * FROM grades WHERE enrollment_id=?").all(enrollmentId);
  const text = pdfText(Buffer.from(await (await request(route)).arrayBuffer()));
  assert.match(text, /Official final grade posted by the school: B\+/);
  assert.deepEqual(database.prepare("SELECT * FROM enrollments WHERE id=?").get(enrollmentId), before);
  assert.deepEqual(database.prepare("SELECT * FROM grades WHERE enrollment_id=?").all(enrollmentId), beforeGrades);
});

test("supporting results remain separate from syllabus totals and long reports paginate cleanly", async () => {
  const projectRows = [7, 9, 11].map(week => ({ title: `Course Project Week ${week}`, points_possible: 0, course_project: true, project_due_week: week, grading_pending: true }));
  const pdf = await createStudentGradePdfBuffer({
    courseTitle: "Fundamental Nursing Skills and Concepts - Cohort 2", courseCode: "PN-FUND",
    studentName: "Sample Student", studentNumber: "123456", studentEmail: "sample@example.test",
    generatedAt: "2026-11-17T15:30:00Z",
    summary: { possible: 1000, earned: 530, gradedCount: 3, requiredCount: 5 },
    rows: [
      { title: "Class Preparation Activities", points_possible: 120, score: 100 },
      ...projectRows,
      ...Array.from({ length: 35 }, (_, index) => ({ title: `Supporting Activity ${index + 1}: Nursing concepts with a long activity description to test text wrapping`, points_possible: index < 10 ? 0 : 100, score: index < 10 ? null : 88.5, status: index < 10 ? "completed" : undefined, supporting_activity: true }))
    ],
    syllabusGradeRows: [{ title: "Class Preparation Activities", points_possible: 120 }, { title: "Clinical Performance Evaluation", points_possible: 0 }, ...projectRows],
    syllabusPolicies: [["Clinical", "Clinical performance evaluation is pass/fail and requires expected competency level in all evaluated criteria."]]
  });
  const text = pdfText(pdf);
  assert.match(text, /Recorded course points: 530 \/ 1,000/);
  assert.match(text, /Supporting Activity Results/);
  assert.match(text, /require instructor allocation under the syllabus/);
  assert.match(text, /Clinical performance evaluation is pass\/fail/);
  assert.match(text, /Project due weeks are relative to this course/);
  for (const week of [7, 9, 11]) assert.ok(text.includes(`Week ${week}; calendar date pending`));
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;
  assert.ok(pages >= 3 && pages <= 7, `Expected a bounded multipage report, got ${pages}`);
  for (let page = 1; page <= pages; page++) assert.ok(text.includes(`Page ${page} of ${pages}`));
  if (process.env.GRADE_PDF_SAMPLE_OUTPUT) fs.writeFileSync(process.env.GRADE_PDF_SAMPLE_OUTPUT, pdf);
});
