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

test("CoursePoint assignment pages show real points and source instructions without an invented rubric", async () => {
  const instructions = "Complete this activity in Lippincott CoursePoint. Submit your own exported report or screenshot showing your name and result.\n\nThe verified percentage is recorded out of 100.";
  const imported = assignment("CoursePoint Pre-Lecture Quiz - Chapter 1", { content: instructions });
  const completion = assignment("CoursePoint PrepU - Chapter 6", { points: 0, content: "Submit your CoursePoint completion evidence." });
  const ordinary = assignment("Ordinary nursing reflection", { content: "Reflect on your learning." });
  database.exec(`CREATE TABLE IF NOT EXISTS coursepoint_import_items (
    grade_item_id INTEGER PRIMARY KEY, lesson_id INTEGER NOT NULL, course_id INTEGER NOT NULL
  )`);
  database.prepare("INSERT INTO coursepoint_import_items (grade_item_id, lesson_id, course_id) VALUES (?, ?, ?)").run(imported.id, imported.lessonId, courseId);
  for (const [base, cookie] of [
    [`/student/enrollments/${enrollmentId}`, studentCookie],
    [`/admin/courses/${courseId}/student-view`, instructorCookie]
  ]) {
    const mode = cookie === instructorCookie ? "&mode=edit" : "";
    const modules = await fetch(`${baseUrl}${base}?view=modules${mode}`, { headers: { cookie } });
    assert.equal(modules.status, 200);
    const modulesHtml = await modules.text();
    assert.match(modulesHtml, /<strong>CoursePoint Pre-Lecture Quiz - Chapter 1<\/strong>\s*<small>100 pts<\/small>/);
    assert.match(modulesHtml, /<strong>CoursePoint PrepU - Chapter 6<\/strong>\s*<small>Completion only<\/small>/);
    const detail = await fetch(`${baseUrl}${base}?assignment=${imported.id}${mode}`, { headers: { cookie } });
    assert.equal(detail.status, 200);
    const detailHtml = await detail.text();
    assert.match(detailHtml, /Submit your own exported report or screenshot showing your name and result/);
    assert.match(detailHtml, /The verified percentage is recorded out of 100/);
    assert.doesNotMatch(detailHtml, /Review the module materials before beginning/);
    assert.doesNotMatch(detailHtml, /assignment-rubric-card/);
    const lesson = await fetch(`${baseUrl}${base}?lesson=${imported.lessonId}${mode}`, { headers: { cookie } });
    assert.equal(lesson.status, 200);
    const lessonHtml = await lesson.text();
    assert.match(lessonHtml, /Submit assignment/);
    assert.match(lessonHtml, /exported report or screenshot/);
    assert.doesNotMatch(lessonHtml, /assignment-rubric-card/);
    if (cookie === studentCookie) assert.match(lessonHtml, /name="studentResponse"/);
  }
  const ordinaryPage = await fetch(`${baseUrl}/student/enrollments/${enrollmentId}?assignment=${ordinary.id}`, { headers: { cookie: studentCookie } });
  assert.match(await ordinaryPage.text(), /assignment-rubric-card/);
  const rubric = { title: "Faculty verified CoursePoint rubric", criteria: [{ title: "Verified source result", maxPoints: 100 }] };
  database.prepare("INSERT INTO assignment_rubrics (grade_item_id, rubric_json) VALUES (?, ?)").run(imported.id, JSON.stringify(rubric));
  const savedRubricPage = await fetch(`${baseUrl}/student/enrollments/${enrollmentId}?assignment=${imported.id}`, { headers: { cookie: studentCookie } });
  assert.match(await savedRubricPage.text(), /Faculty verified CoursePoint rubric/);
});

test("PN107 Lab modules give every skill its own checklist dropdown and working student upload", async () => {
  const labCourse = database.prepare("SELECT id FROM courses WHERE slug = 'medical-surgical-nursing-i-pn107-lab'").get();
  assert.ok(labCourse);
  let labEnrollment = database.prepare(`
    SELECT id FROM enrollments
    WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed') AND withdrawn_at IS NULL
    ORDER BY id DESC LIMIT 1
  `).get(studentId, labCourse.id);
  if (!labEnrollment) {
    labEnrollment = {
      id: Number(database.prepare("INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, 'active')")
        .run(studentId, labCourse.id).lastInsertRowid)
    };
  }
  const skill = database.prepare(`
    SELECT l.id AS lesson_id, l.grade_item_id, l.title
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE m.course_id = ? AND l.title LIKE 'Week % Skill Check %'
      AND l.published = 1 AND l.instructor_only = 0 AND l.grade_item_id IS NOT NULL
    ORDER BY m.position, l.position, l.id
    LIMIT 1
  `).get(labCourse.id);
  assert.ok(skill);

  let response = await fetch(`${baseUrl}/student/enrollments/${labEnrollment.id}?view=modules`, {
    headers: { cookie: studentCookie }
  });
  assert.equal(response.status, 200);
  let html = await response.text();
  assert.match(html, /pn107-skill-check-section/);
  assert.match(html, new RegExp(`id="skill-assignment-${skill.grade_item_id}"`));
  assert.match(html, /Open instructions and upload the completed checklist/);
  assert.match(html, new RegExp(`action="/student/enrollments/${labEnrollment.id}/assignments/${skill.grade_item_id}/submit"`));
  assert.match(html, /name="assignmentFile"[^>]*required/);

  const body = new FormData();
  body.set("returnTo", "modules");
  body.set("studentResponse", "Completed during supervised lab practice.");
  body.set("assignmentFile", new Blob(["completed checklist"], { type: "application/pdf" }), "completed-checklist.pdf");
  response = await fetch(`${baseUrl}/student/enrollments/${labEnrollment.id}/assignments/${skill.grade_item_id}/submit`, {
    method: "POST",
    redirect: "manual",
    headers: { cookie: studentCookie },
    body
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), `/student/enrollments/${labEnrollment.id}?view=modules#skill-assignment-${skill.grade_item_id}`);
  const stored = database.prepare(`
    SELECT file_original_name, file_mime_type, student_note
    FROM assignment_submissions
    WHERE enrollment_id = ? AND grade_item_id = ?
  `).get(labEnrollment.id, skill.grade_item_id);
  assert.deepEqual({ ...stored }, {
    file_original_name: "completed-checklist.pdf",
    file_mime_type: "application/pdf",
    student_note: "Completed during supervised lab practice."
  });

  response = await fetch(`${baseUrl}/student/enrollments/${labEnrollment.id}?view=modules`, {
    headers: { cookie: studentCookie }
  });
  html = await response.text();
  assert.match(html, /Checklist submitted/);
  assert.match(html, /completed-checklist\.pdf/);
  assert.match(html, /Replace Completed Checklist/);

  const heicBody = new FormData();
  heicBody.set("returnTo", "modules");
  heicBody.set("assignmentFile", new Blob(["heic checklist"], { type: "image/heic" }), "completed-checklist.heic");
  response = await fetch(`${baseUrl}/student/enrollments/${labEnrollment.id}/assignments/${skill.grade_item_id}/submit`, {
    method: "POST",
    redirect: "manual",
    headers: { cookie: studentCookie },
    body: heicBody
  });
  assert.equal(response.status, 302);
  assert.equal(
    database.prepare("SELECT file_original_name FROM assignment_submissions WHERE enrollment_id = ? AND grade_item_id = ?")
      .get(labEnrollment.id, skill.grade_item_id).file_original_name,
    "completed-checklist.heic"
  );
});
