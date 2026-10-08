const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");

let serverProcess;
let database;
let temporaryDirectory;
let baseUrl;
let adminCookie;
let studentCookie;
let transcriptStudent;
let statusEnrollment;
const transcriptEnrollments = new Map();

function reservePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const { port } = socket.address();
      socket.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function startServer(port, databaseFile) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`Server did not start in time.\n${output}`)), 120_000);
    serverProcess = spawn(process.execPath, ["--no-warnings", "src/server.js"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_FILE: databaseFile,
        EMAIL_DELIVERY_ENABLED: "false",
        NODE_ENV: "test",
        PORT: String(port),
        PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
        SESSION_SECRET: "transcript-grade-status-test-secret"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    const onOutput = (chunk) => {
      output += chunk.toString();
      if (!output.includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      resolve();
    };
    serverProcess.stdout.on("data", onOutput);
    serverProcess.stderr.on("data", onOutput);
    serverProcess.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    serverProcess.once("exit", (code, signal) => {
      if (output.includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      reject(new Error(`Server exited before startup (${code ?? signal}).\n${output}`));
    });
  });
}

async function login(email, password, loginRole) {
  const response = await fetch(`${baseUrl}/login`, {
    body: new URLSearchParams({ email, password, loginRole }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    redirect: "manual"
  });
  assert.equal(response.status, 302, `Expected ${email} to sign in`);
  const setCookie = response.headers.getSetCookie?.()[0] || response.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";", 1)[0];
  assert.match(cookie, /^bmhi\.sid=/);
  return cookie;
}

async function getHtml(route, cookie) {
  const response = await fetch(`${baseUrl}${route}`, { headers: { cookie }, redirect: "manual" });
  const html = await response.text();
  assert.equal(response.status, 200, `Expected ${route} to render.\n${html.slice(0, 800)}`);
  return html;
}

async function updateEnrollmentStatus(enrollmentId, { status, finalGrade, progress = 100 }) {
  return fetch(`${baseUrl}/admin/enrollments/${enrollmentId}/status`, {
    body: new URLSearchParams({ status, progress: String(progress), finalGrade }),
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: adminCookie },
    method: "POST",
    redirect: "manual"
  });
}

async function issueCredential(enrollmentId) {
  return fetch(`${baseUrl}/admin/enrollments/${enrollmentId}/issue-credential`, {
    headers: { cookie: adminCookie },
    method: "POST",
    redirect: "manual"
  });
}

function htmlText(value) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

function tableRowContaining(html, text) {
  const row = [...html.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/g)]
    .map((match) => match[0])
    .find((candidate) => htmlText(candidate).includes(text));
  assert.ok(row, `Expected a table row containing ${text}`);
  return row;
}

function rowCells(row) {
  return [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) => htmlText(match[1]));
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-transcript-grade-status-"));
  const databaseFile = path.join(temporaryDirectory, "transcript.sqlite");
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile);

  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  const demo = database.prepare("SELECT password_hash FROM users WHERE email = 'student@browardmiamihi.com'").get();
  assert.ok(demo?.password_hash);
  const insertUser = database.prepare(`
    INSERT INTO users (
      role, student_number, first_name, last_name, email, password_hash,
      status, organization_status, photo_review_status
    ) VALUES ('student', ?, ?, ?, ?, ?, 'active', 'organized', 'approved')
  `);
  transcriptStudent = insertUser.run(
    "TRANSCRIPT-001",
    "Transcript",
    "Student",
    "transcript-status@example.test",
    demo.password_hash
  ).lastInsertRowid;
  const photoStorageName = "transcript-status-student.png";
  fs.writeFileSync(
    path.join(temporaryDirectory, "uploads", photoStorageName),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  );
  database.prepare(`
    UPDATE users
    SET photo_storage_name = ?, photo_original_name = 'transcript-status-student.png'
    WHERE id = ?
  `).run(photoStorageName, transcriptStudent);
  const statusStudent = insertUser.run(
    "TRANSCRIPT-002",
    "Status",
    "Student",
    "enrollment-status@example.test",
    demo.password_hash
  ).lastInsertRowid;

  const courses = database.prepare("SELECT id FROM courses WHERE published = 1 ORDER BY id LIMIT 12").all();
  assert.equal(courses.length, 12, "Expected twelve published courses for transcript fixtures");
  // Keep fixture course totals independent of the seeded catalog.
  for (const course of courses) {
    database.prepare("DELETE FROM grades WHERE grade_item_id IN (SELECT id FROM grade_items WHERE course_id = ?)").run(course.id);
    database.prepare("DELETE FROM grade_items WHERE course_id = ?").run(course.id);
  }
  const fixtures = [
    ["A", "completed", "A"],
    ["F", "completed", "F"],
    ["P", "completed", "P"],
    ["PASS", "completed", "PASS"],
    ["W", "withdrawn", "A"],
    ["I", "completed", "I"],
    ["INC", "completed", "INC"],
    ["IP", "completed", "IP"],
    ["ACTIVE", "active", "A"],
    ["INVALID", "completed", "not-a-grade"],
    ["BLANK_CALCULATED", "active", null],
    ["CREDENTIAL", "active", null]
  ];
  const updateCourse = database.prepare("UPDATE courses SET title = ?, category = 'Category must not become program', hours = 1 WHERE id = ?");
  const insertEnrollment = database.prepare(`
    INSERT INTO enrollments (user_id, course_id, status, start_date, completion_date, progress, final_grade, source)
    VALUES (?, ?, ?, '2026-09-01', ?, 100, ?, 'manual')
  `);
  fixtures.forEach(([key, status, finalGrade], index) => {
    const title = `Transcript Test ${key}`;
    updateCourse.run(title, courses[index].id);
    const result = insertEnrollment.run(
      transcriptStudent,
      courses[index].id,
      status,
      status === "completed" ? "2026-09-30" : null,
      finalGrade
    );
    transcriptEnrollments.set(key, { courseId: courses[index].id, enrollmentId: result.lastInsertRowid, title });
  });

  const insertGradeItem = database.prepare("INSERT INTO grade_items (course_id, title, points_possible, due_date) VALUES (?, ?, 100, '2026-09-30')");
  const insertGrade = database.prepare("INSERT INTO grades (enrollment_id, grade_item_id, score, note) VALUES (?, ?, ?, NULL)");
  for (const [key, score] of [["A", 80], ["ACTIVE", 80], ["INVALID", 100], ["BLANK_CALCULATED", 85]]) {
    const fixture = transcriptEnrollments.get(key);
    const gradeItem = insertGradeItem.run(fixture.courseId, `Transcript fixture ${key}`).lastInsertRowid;
    insertGrade.run(fixture.enrollmentId, gradeItem, score);
  }
  const activeFixture = transcriptEnrollments.get("ACTIVE");
  const pendingGradeItem = insertGradeItem.run(activeFixture.courseId, "Pending instructor review").lastInsertRowid;
  database.prepare("INSERT INTO grades (enrollment_id, grade_item_id, score, note) VALUES (?, ?, 100, ?)").run(
    activeFixture.enrollmentId,
    pendingGradeItem,
    "[AUTO_GRADE_PENDING_APPROVAL] Pending review must not count as posted work"
  );
  const statusResult = insertEnrollment.run(statusStudent, courses[0].id, "completed", "2025-01-02", "A");
  statusEnrollment = statusResult.lastInsertRowid;

  adminCookie = await login("admin@browardmiamihi.com", "AdminPass123!", "faculty");
  assert.equal((await updateEnrollmentStatus(transcriptEnrollments.get("BLANK_CALCULATED").enrollmentId, {
    status: "completed",
    finalGrade: ""
  })).status, 302);
  assert.equal((await issueCredential(transcriptEnrollments.get("CREDENTIAL").enrollmentId)).status, 302);
  studentCookie = await login("transcript-status@example.test", "StudentPass123!", "student");
});

after(async () => {
  database?.close();
  if (serverProcess && serverProcess.exitCode === null) {
    await new Promise((resolve) => {
      serverProcess.once("exit", resolve);
      serverProcess.kill("SIGTERM");
      setTimeout(resolve, 5_000).unref();
    });
  }
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
});

test("completed enrollments retain a transcript grade when completion paths leave final_grade blank", async () => {
  for (const key of ["BLANK_CALCULATED", "CREDENTIAL"]) {
    const row = database.prepare(`
      SELECT status, progress, final_grade FROM enrollments WHERE id = ?
    `).get(transcriptEnrollments.get(key).enrollmentId);
    assert.equal(row.status, "completed");
    assert.equal(row.progress, 100);
    assert.ok(row.final_grade === null || row.final_grade === "", "The regression fixture must exercise a blank stored final grade");
  }

  const html = await getHtml("/student/transcript", studentCookie);
  assert.match(html, /<span>Attempted hours<\/span><strong>12<\/strong>/);
  assert.match(html, /<span>Completed hours<\/span><strong>5<\/strong>/);
  assert.match(html, /<span>Cumulative GPA<\/span><strong>2\.33<\/strong>/);
  assert.match(html, /<span>Program \/ Major<\/span><strong>Program not recorded<\/strong>/);

  assert.equal(rowCells(tableRowContaining(html, "Transcript Test P"))[3], "P");
  assert.equal(rowCells(tableRowContaining(html, "Transcript Test PASS"))[3], "P");
  for (const code of ["I", "INC", "IP"]) {
    assert.equal(rowCells(tableRowContaining(html, `Transcript Test ${code}`))[3], code);
  }
  assert.equal(rowCells(tableRowContaining(html, "Transcript Test W"))[3], "W");

  const activeCells = rowCells(tableRowContaining(html, "Transcript Test ACTIVE"));
  assert.equal(activeCells[2], "40.0%");
  assert.equal(activeCells[3], "IP", "An active enrollment must not expose a saved final grade");
  const invalidCells = rowCells(tableRowContaining(html, "Transcript Test INVALID"));
  assert.equal(invalidCells[2], "—");
  assert.equal(invalidCells[3], "—", "An invalid saved final must not fall back to the current percentage");
  const calculatedCells = rowCells(tableRowContaining(html, "Transcript Test BLANK_CALCULATED"));
  assert.equal(calculatedCells[2], "85.0%");
  assert.equal(calculatedCells[3], "B", "A completed blank final should use its posted-grade calculation");
  const credentialCells = rowCells(tableRowContaining(html, "Transcript Test CREDENTIAL"));
  assert.equal(credentialCells[2], "—");
  assert.equal(credentialCells[3], "P", "An issued credential should provide a pass grade when no scored work exists");
});

test("print transcript uses neutral labeling and the same earned-credit rules", async () => {
  const html = await getHtml("/student/transcript/print", studentCookie);
  assert.match(html, /<span>Academic Transcript<\/span>/);
  assert.doesNotMatch(html, /Undergraduate Academic Transcript/);
  assert.match(html, /<dt>Degree \/ Program<\/dt><dd>Program not recorded<\/dd>/);
  assert.match(html, /<dt>Major<\/dt><dd>Program not recorded<\/dd>/);

  assert.equal(rowCells(tableRowContaining(html, "Transcript Test P"))[2], "1");
  assert.equal(rowCells(tableRowContaining(html, "Transcript Test PASS"))[2], "1");
  assert.equal(rowCells(tableRowContaining(html, "Transcript Test BLANK_CALCULATED"))[2], "1");
  assert.equal(rowCells(tableRowContaining(html, "Transcript Test CREDENTIAL"))[2], "1");
  for (const key of ["F", "W", "I", "INC", "IP", "ACTIVE", "INVALID"]) {
    assert.equal(rowCells(tableRowContaining(html, `Transcript Test ${key}`))[2], "0");
  }
  const termEarned = [...html.matchAll(/<tr class="transcript-term-total">([\s\S]*?)<\/tr>/g)]
    .map((match) => Number(rowCells(match[0])[2]));
  assert.equal(termEarned.reduce((sum, hours) => sum + hours, 0), 5);
});

test("student current grade report truthfully separates current calculations from enrollment status", async () => {
  const before = {
    enrollments: database.prepare("SELECT COUNT(*) AS count FROM enrollments WHERE user_id = ?").get(transcriptStudent).count,
    grades: database.prepare("SELECT COUNT(*) AS count FROM grades WHERE enrollment_id IN (SELECT id FROM enrollments WHERE user_id = ?)").get(transcriptStudent).count
  };
  const activeFixture = transcriptEnrollments.get("ACTIVE");
  const insertRestrictedGradeItem = database.prepare(`
    INSERT INTO grade_items (course_id, title, points_possible, due_date, allowed_student_email)
    VALUES (?, ?, 100, '2026-09-30', ?)
  `);
  const crossCourseGradeItem = insertRestrictedGradeItem.run(
    transcriptEnrollments.get("A").courseId,
    "Cross-course item must not count",
    null
  ).lastInsertRowid;
  const otherStudentGradeItem = insertRestrictedGradeItem.run(
    activeFixture.courseId,
    "Other student's personalized item must not count",
    "different-student@example.test"
  ).lastInsertRowid;
  const insertRogueGrade = database.prepare("INSERT INTO grades (enrollment_id, grade_item_id, score, note) VALUES (?, ?, 0, NULL)");
  insertRogueGrade.run(activeFixture.enrollmentId, crossCourseGradeItem);
  insertRogueGrade.run(activeFixture.enrollmentId, otherStudentGradeItem);
  const html = await getHtml("/student/current-grade-report", studentCookie);
  database.prepare("DELETE FROM grade_items WHERE id IN (?, ?)").run(crossCourseGradeItem, otherStudentGradeItem);

  assert.match(html, /Unofficial Current Progress Report/i);
  assert.match(html, /includes all graded course work/i);
  assert.match(html, /not an official transcript or final grade/i);
  assert.match(html, /does not change any enrollment or academic record/i);
  assert.match(html, /Print \/ Save as PDF/);

  const activeCells = rowCells(tableRowContaining(html, "Transcript Test ACTIVE"));
  assert.equal(activeCells[2], "active", "Enrollment status must be shown independently from the calculated letter");
  assert.equal(activeCells[3], "1", "Pending-review grades must not count as posted graded work");
  assert.equal(activeCells[4], "80.00 / 200.00");
  assert.equal(activeCells[5], "40.00%");
  assert.equal(activeCells[6], "F", "Active courses need a current calculated letter instead of IP");

  const completedCells = rowCells(tableRowContaining(html, "Transcript Test A"));
  assert.equal(completedCells[2], "completed");
  assert.equal(completedCells[5], "40.00%");
  assert.equal(completedCells[6], "F", "The current report must calculate from posted work instead of re-labeling a saved final grade");

  const ungradedCells = rowCells(tableRowContaining(html, "Transcript Test P"));
  assert.equal(ungradedCells[2], "completed");
  assert.equal(ungradedCells[4], "Not yet graded");
  assert.equal(ungradedCells[5], "—");
  assert.equal(ungradedCells[6], "—");

  const after = {
    enrollments: database.prepare("SELECT COUNT(*) AS count FROM enrollments WHERE user_id = ?").get(transcriptStudent).count,
    grades: database.prepare("SELECT COUNT(*) AS count FROM grades WHERE enrollment_id IN (SELECT id FROM enrollments WHERE user_id = ?)").get(transcriptStudent).count
  };
  assert.deepEqual(after, before, "Opening a current grade report must not alter grades or enrollments");
});

test("student navigation and registrar checklist link to the appropriate current grade reports", async () => {
  const transcriptHtml = await getHtml("/student/transcript", studentCookie);
  assert.match(transcriptHtml, /href="\/student\/current-grade-report"[^>]*>Current Grade Report<\/a>/);

  const registrarHtml = await getHtml(`/admin/students/${transcriptStudent}/registrar-checklist`, adminCookie);
  assert.match(
    registrarHtml,
    new RegExp(`href="/admin/students/${transcriptStudent}/current-grade-report"[^>]*>Current Grade Report</a>`)
  );

  const adminReport = await getHtml(`/admin/students/${transcriptStudent}/current-grade-report`, adminCookie);
  assert.match(adminReport, /Transcript Student/);
  const activeCells = rowCells(tableRowContaining(adminReport, "Transcript Test ACTIVE"));
  assert.equal(activeCells[2], "active");
  assert.equal(activeCells[5], "40.00%");
  assert.equal(activeCells[6], "F");

  const forbidden = await fetch(`${baseUrl}/admin/students/${transcriptStudent}/current-grade-report`, {
    headers: { cookie: studentCookie },
    redirect: "manual"
  });
  assert.equal(forbidden.status, 403, "A student must not be able to request another student's admin report");
});

test("instructor gradebook uses final grades only for completed enrollments", async () => {
  const active = transcriptEnrollments.get("ACTIVE");
  const activeHtml = await getHtml(`/admin/courses/${active.courseId}/student-view?view=grades`, adminCookie);
  const activeRow = tableRowContaining(activeHtml, "Transcript Student");
  assert.match(activeRow, /<td>40\.00%<\/td>/);
  assert.match(activeRow, /<td><strong>F<\/strong><\/td>/);
  assert.doesNotMatch(activeRow, /<td><strong>A<\/strong><\/td>/);

  const completed = transcriptEnrollments.get("A");
  const completedHtml = await getHtml(`/admin/courses/${completed.courseId}/student-view?view=grades`, adminCookie);
  const completedRow = tableRowContaining(completedHtml, "Transcript Student");
  assert.match(completedRow, /<td>80\.00%<\/td>/);
  assert.match(completedRow, /<td><strong>A<\/strong><\/td>/);
});

test("admin status updates validate final grades and clear non-completion dates", async () => {
  for (const finalGrade of ["", "a-", "P", "PASS", "W", "I", "INC", "IP", "0", "92.5", "100%"] ) {
    const response = await updateEnrollmentStatus(statusEnrollment, { status: "completed", finalGrade });
    assert.equal(response.status, 302, `Expected ${finalGrade || "blank"} to be accepted`);
  }

  for (const finalGrade of ["A+", "101", "-1", "92oops"]) {
    const beforeRow = database.prepare("SELECT status, progress, final_grade, completion_date FROM enrollments WHERE id = ?").get(statusEnrollment);
    const response = await updateEnrollmentStatus(statusEnrollment, { status: "hold", finalGrade, progress: 12 });
    assert.equal(response.status, 422, `Expected ${finalGrade} to be rejected`);
    const afterRow = database.prepare("SELECT status, progress, final_grade, completion_date FROM enrollments WHERE id = ?").get(statusEnrollment);
    assert.deepEqual(afterRow, beforeRow, "Invalid final grades must not partially update an enrollment");
  }

  database.prepare("UPDATE enrollments SET status = 'completed', completion_date = '2025-01-02' WHERE id = ?").run(statusEnrollment);
  assert.equal((await updateEnrollmentStatus(statusEnrollment, { status: "active", finalGrade: "A" })).status, 302);
  assert.equal(database.prepare("SELECT completion_date FROM enrollments WHERE id = ?").get(statusEnrollment).completion_date, null);

  database.prepare("UPDATE enrollments SET status = 'completed', completion_date = '2025-01-02' WHERE id = ?").run(statusEnrollment);
  assert.equal((await updateEnrollmentStatus(statusEnrollment, { status: "hold", finalGrade: "IP" })).status, 302);
  assert.equal(database.prepare("SELECT completion_date FROM enrollments WHERE id = ?").get(statusEnrollment).completion_date, null);

  assert.equal((await updateEnrollmentStatus(statusEnrollment, { status: "completed", finalGrade: "A" })).status, 302);
  assert.match(database.prepare("SELECT completion_date FROM enrollments WHERE id = ?").get(statusEnrollment).completion_date, /^\d{4}-\d{2}-\d{2}$/);
});
