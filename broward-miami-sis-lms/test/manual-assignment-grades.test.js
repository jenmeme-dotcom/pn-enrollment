const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { before, after, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");
let server, database, temporaryDirectory, baseUrl, adminCookie, instructorCookie, studentCookie;
let courseId, otherCourseId, moduleId, enrollmentId, otherEnrollmentId, studentId;

async function login(email, password, loginRole) {
  const response = await fetch(`${baseUrl}/login`, {
    method: "POST", redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password, loginRole })
  });
  assert.equal(response.status, 302);
  return response.headers.getSetCookie()[0].split(";", 1)[0];
}

function assignment(title, { points = 100, content = "Submit evidence of your work.", type = "assignment", allowedEmail = null } = {}) {
  const id = Number(database.prepare("INSERT INTO grade_items (course_id, title, points_possible, allowed_student_email) VALUES (?, ?, ?, ?)")
    .run(courseId, title, points, allowedEmail).lastInsertRowid);
  const lessonId = Number(database.prepare("INSERT INTO lessons (module_id, title, content, item_type, grade_item_id) VALUES (?, ?, ?, ?, ?)")
    .run(moduleId, title, content, type, id).lastInsertRowid);
  return { id, lessonId };
}

function save(itemId, fields = {}, cookie = instructorCookie, targetCourse = courseId) {
  return fetch(`${baseUrl}/admin/courses/${targetCourse}/assignments/${itemId}/grades`, {
    method: "POST", redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}) },
    body: new URLSearchParams({ enrollmentId: String(enrollmentId), ...fields })
  });
}

function submit(itemId, response = "Evidence from the external activity.") {
  const body = new FormData();
  body.set("studentResponse", response);
  return fetch(`${baseUrl}/student/enrollments/${enrollmentId}/assignments/${itemId}/submit`, {
    method: "POST", redirect: "manual", headers: { cookie: studentCookie }, body
  });
}

function grade(itemId) {
  return database.prepare("SELECT score, note FROM grades WHERE enrollment_id = ? AND grade_item_id = ?").get(enrollmentId, itemId);
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-manual-assignment-"));
  const databaseFile = path.join(temporaryDirectory, "grades.sqlite");
  const port = await new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const port = socket.address().port;
      socket.close((error) => error ? reject(error) : resolve(port));
    });
  });
  baseUrl = `http://127.0.0.1:${port}`;
  await new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`Server startup timeout: ${output}`)), 120_000);
    server = spawn(process.execPath, ["--no-warnings", "src/server.js"], {
      cwd: projectRoot,
      env: { ...process.env, DATABASE_FILE: databaseFile, UPLOAD_DIR: path.join(temporaryDirectory, "uploads"), PORT: String(port), NODE_ENV: "test", EMAIL_DELIVERY_ENABLED: "false", PUBLIC_APP_URL: baseUrl, SESSION_SECRET: "manual-assignment-grades-test" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    const read = (chunk) => {
      output += chunk;
      if (output.includes("SIS/LMS running at")) { clearTimeout(timeout); resolve(); }
    };
    server.stdout.on("data", read);
    server.stderr.on("data", read);
    server.once("error", (error) => { clearTimeout(timeout); reject(error); });
    server.once("exit", () => { clearTimeout(timeout); reject(new Error(output)); });
  });
  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA busy_timeout = 5000");
  const addCourse = (slug) => Number(database.prepare("INSERT INTO courses (title, slug, category, description) VALUES (?, ?, 'Test', 'Test course')").run(slug, slug).lastInsertRowid);
  courseId = addCourse("manual-grading-test");
  otherCourseId = addCourse("other-manual-grading-test");
  moduleId = Number(database.prepare("INSERT INTO modules (course_id, title) VALUES (?, 'Assignments')").run(courseId).lastInsertRowid);
  studentId = database.prepare("SELECT id FROM users WHERE email = 'student@browardmiamihi.com'").get().id;
  fs.mkdirSync(path.join(temporaryDirectory, "uploads"), { recursive: true });
  fs.writeFileSync(path.join(temporaryDirectory, "uploads", "student.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH3cAAAAASUVORK5CYII=", "base64"));
  database.prepare("UPDATE users SET organization_status = 'organized', photo_storage_name = 'student.png', photo_review_status = 'approved' WHERE id = ?").run(studentId);
  enrollmentId = Number(database.prepare("INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, 'active')").run(studentId, courseId).lastInsertRowid);
  otherEnrollmentId = Number(database.prepare("INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, 'active')").run(studentId, otherCourseId).lastInsertRowid);
  adminCookie = await login("admin@browardmiamihi.com", "AdminPass123!", "faculty");
  instructorCookie = await login("instructor@browardmiamihi.com", "InstructorPass123!", "faculty");
  studentCookie = await login("student@browardmiamihi.com", "StudentPass123!", "student");
});

after(async () => {
  database?.close();
  if (server && server.exitCode === null) await new Promise((resolve) => { server.once("exit", resolve); server.kill("SIGTERM"); });
  if (temporaryDirectory) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("faculty can record an explicit zero without a submission; blanks retain saved score and feedback", async () => {
  const item = assignment("Client case for manual grading");
  const messagesBefore = database.prepare("SELECT COUNT(*) AS n FROM messages").get().n;
  assert.equal((await save(item.id, { score: "0", note: "Reviewed external score" })).status, 302);
  assert.deepEqual({ ...grade(item.id) }, { score: 0, note: "Reviewed external score" });
  assert.equal((await save(item.id, { score: " ", note: "Must not replace feedback" })).status, 302);
  assert.deepEqual({ ...grade(item.id) }, { score: 0, note: "Reviewed external score" });
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM assignment_submissions WHERE grade_item_id = ?").get(item.id).n, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM messages").get().n, messagesBefore);
  const response = await fetch(`${baseUrl}/admin/courses/${courseId}/student-view?assignment=${item.id}&mode=edit`, { headers: { cookie: instructorCookie } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Record assignment grades/);
  assert.match(html, /value="0" aria-label="Score for/);
  assert.match(html, /Reviewed external score/);
  assert.match(html, /Student submission form/);
});

test("invalid scores, other courses, inactive enrollments and student-specific restrictions are rejected", async () => {
  const item = assignment("Restricted grade entry");
  for (const score of ["NaN", "Infinity", "-1", "100.01", "bad"]) {
    assert.equal((await save(item.id, { score })).status, 400, score);
    assert.equal(grade(item.id), undefined);
  }
  assert.equal((await save(item.id, { score: "85", enrollmentId: String(otherEnrollmentId) })).status, 400);
  assert.equal((await save(item.id, { score: "85" }, adminCookie, otherCourseId)).status, 404);
  assert.equal((await save(item.id, { score: "85" }, studentCookie)).status, 403);
  assert.equal((await save(item.id, { score: "85" }, null)).status, 302);
  for (const status of ["completed", "withdrawn"]) {
    database.prepare("UPDATE enrollments SET status = ? WHERE id = ?").run(status, enrollmentId);
    assert.equal((await save(item.id, { score: "85" })).status, 400);
  }
  database.prepare("UPDATE enrollments SET status = 'active' WHERE id = ?").run(enrollmentId);
  database.prepare("UPDATE grade_items SET allowed_student_email = 'another@example.test' WHERE id = ?").run(item.id);
  assert.equal((await save(item.id, { score: "85" })).status, 400);
  database.prepare("UPDATE grade_items SET allowed_student_email = NULL WHERE id = ?").run(item.id);
  database.prepare("UPDATE lessons SET allowed_student_email = 'another@example.test' WHERE id = ?").run(item.lessonId);
  assert.equal((await save(item.id, { score: "85" })).status, 400);
  assert.equal(grade(item.id), undefined);
});

test("completion-only items save status without a numeric grade and show it in both gradebooks", async () => {
  const item = assignment("PrepU Chapter 6 completion", { points: 0 });
  assert.equal((await save(item.id, { completionStatus: "completed", note: "Spreadsheet completion" })).status, 302);
  assert.equal(grade(item.id), undefined);
  let status = database.prepare("SELECT status, note FROM assignment_completion_statuses WHERE enrollment_id = ? AND grade_item_id = ?").get(enrollmentId, item.id);
  assert.deepEqual({ ...status }, { status: "completed", note: "Spreadsheet completion" });
  assert.equal((await save(item.id, { completionStatus: "", note: "ignored" })).status, 302);
  assert.equal((await save(item.id, { completionStatus: "0" })).status, 400);
  for (const [url, cookie] of [
    [`/student/enrollments/${enrollmentId}?assignment=${item.id}`, studentCookie],
    [`/student/enrollments/${enrollmentId}?view=grades`, studentCookie],
    [`/admin/courses/${courseId}/student-view?view=grades&mode=edit`, instructorCookie]
  ]) {
    const response = await fetch(baseUrl + url, { headers: { cookie } });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Completed/);
  }
  assert.equal((await save(item.id, { completionStatus: "incomplete" }, adminCookie)).status, 302);
  assert.equal(database.prepare("SELECT status FROM assignment_completion_statuses WHERE enrollment_id = ? AND grade_item_id = ?").get(enrollmentId, item.id).status, "incomplete");
  assert.equal(grade(item.id), undefined);
});

test("completion controls retain and display an existing zero-point legacy grade and note", async () => {
  const item = assignment("Legacy clinical performance", { points: 0 });
  database.prepare("INSERT INTO grades (enrollment_id, grade_item_id, score, note) VALUES (?, ?, 0, 'Prior clinical result')").run(enrollmentId, item.id);
  assert.equal((await save(item.id, { completionStatus: "completed" })).status, 302);
  assert.deepEqual({ ...grade(item.id) }, { score: 0, note: "Prior clinical result" });
  const response = await fetch(`${baseUrl}/admin/courses/${courseId}/student-view?assignment=${item.id}&mode=edit`, { headers: { cookie: instructorCookie } });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Recorded grade: 0 - Prior clinical result/);
  const studentResponse = await fetch(`${baseUrl}/student/enrollments/${enrollmentId}?assignment=${item.id}`, { headers: { cookie: studentCookie } });
  assert.match(await studentResponse.text(), /0 \/ 0/);
});

test("explicit external quiz assignments accept evidence; empty work, private items and real assessments do not", async () => {
  const external = assignment("Pre-Lecture Quiz: external activity");
  let response = await fetch(`${baseUrl}/student/enrollments/${enrollmentId}?assignment=${external.id}`, { headers: { cookie: studentCookie } });
  assert.match(await response.text(), /name="studentResponse"/);
  assert.equal((await submit(external.id, "")).status, 302);
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM assignment_submissions WHERE grade_item_id = ?").get(external.id).n, 0);
  assert.equal((await submit(external.id)).status, 302);
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM assignment_submissions WHERE grade_item_id = ?").get(external.id).n, 1);
  const quizData = Buffer.from(JSON.stringify([{ prompt: "Which is correct?", options: ["A", "B"], answer: 0 }])).toString("base64");
  for (const item of [
    assignment("Quiz with a real bank", { content: `<!-- QUIZ_DATA_BASE64:${quizData} -->` }),
    assignment("Final Examination", { type: "assignment" }),
    assignment("Native Quiz", { type: "quiz" })
  ]) {
    const page = await fetch(`${baseUrl}/student/enrollments/${enrollmentId}?assignment=${item.id}`, { headers: { cookie: studentCookie } });
    assert.doesNotMatch(await page.text(), /name="studentResponse"/);
    assert.equal((await submit(item.id)).status, 302);
    assert.equal(database.prepare("SELECT COUNT(*) AS n FROM assignment_submissions WHERE grade_item_id = ?").get(item.id).n, 0);
  }
  const restricted = assignment("Private external quiz", { allowedEmail: "another@example.test" });
  assert.equal((await submit(restricted.id)).status, 403);
  const unpublished = assignment("Unpublished external quiz");
  database.prepare("UPDATE lessons SET published = 0 WHERE id = ?").run(unpublished.lessonId);
  assert.equal((await submit(unpublished.id)).status, 403);
  const duplicate = assignment("Linked assessment evidence");
  database.prepare("INSERT INTO lessons (module_id, title, content, item_type, grade_item_id) VALUES (?, 'Real linked assessment', ?, 'quiz', ?)").run(moduleId, `<!-- QUIZ_DATA_BASE64:${quizData} -->`, duplicate.id);
  const duplicatePage = await fetch(`${baseUrl}/student/enrollments/${enrollmentId}?assignment=${duplicate.id}`, { headers: { cookie: studentCookie } });
  assert.doesNotMatch(await duplicatePage.text(), /name="studentResponse"/);
  assert.equal((await submit(duplicate.id)).status, 302);
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM assignment_submissions WHERE grade_item_id = ?").get(duplicate.id).n, 0);
});
