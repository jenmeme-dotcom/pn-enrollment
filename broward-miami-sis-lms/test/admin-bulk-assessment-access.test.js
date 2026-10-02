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
let instructorCookie;

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
        SESSION_SECRET: "admin-bulk-assessment-access-test-secret"
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
  assert.match(cookie, /^bmhi\.sid=/, `Expected a session cookie for ${email}`);
  return cookie;
}

function pn104Final() {
  const lesson = database.prepare(`
    SELECT c.id AS course_id, l.id AS lesson_id, l.title, l.content, l.grade_item_id
    FROM courses c
    JOIN modules m ON m.course_id = c.id
    JOIN lessons l ON l.module_id = m.id
    WHERE c.slug = 'anatomy-and-physiology'
      AND l.title = '[PN104 2026] Quiz: Final Examination'
    LIMIT 1
  `).get();
  assert.ok(lesson, "Expected the seeded PN 104 final examination");
  if (!lesson.grade_item_id) {
    const existing = database.prepare("SELECT id FROM grade_items WHERE course_id = ? AND title = ? LIMIT 1")
      .get(lesson.course_id, lesson.title);
    const gradeItemId = existing?.id || database.prepare(`
      INSERT INTO grade_items (course_id, title, points_possible)
      VALUES (?, ?, 100)
    `).run(lesson.course_id, lesson.title).lastInsertRowid;
    database.prepare("UPDATE lessons SET grade_item_id = ? WHERE id = ?").run(gradeItemId, lesson.lesson_id);
    lesson.grade_item_id = Number(gradeItemId);
  }
  return lesson;
}

function addStudentEnrollment({ courseId, key, enrollmentStatus = "active", userStatus = "active", withdrawn = false }) {
  const user = database.prepare(`
    INSERT INTO users (role, first_name, last_name, email, password_hash, status)
    SELECT 'student', ?, ?, ?, password_hash, ?
    FROM users
    WHERE email = 'student@browardmiamihi.com'
  `).run("Bulk", key, `bulk-${key.toLowerCase()}@example.test`, userStatus);
  const enrollment = database.prepare(`
    INSERT INTO enrollments (user_id, course_id, status, withdrawn_at, source)
    VALUES (?, ?, ?, ?, 'bulk-assessment-test')
  `).run(
    user.lastInsertRowid,
    courseId,
    enrollmentStatus,
    withdrawn ? new Date(Date.now() - 86_400_000).toISOString() : null
  );
  return {
    email: `bulk-${key.toLowerCase()}@example.test`,
    enrollmentId: Number(enrollment.lastInsertRowid),
    userId: Number(user.lastInsertRowid)
  };
}

function seedPriorResult({ enrollmentId, lessonId, gradeItemId, score, note }) {
  const now = Date.now();
  const startedAt = new Date(now - 7_200_000).toISOString();
  const expiresAt = new Date(now - 3_600_000).toISOString();
  database.prepare(`
    INSERT INTO grades (enrollment_id, grade_item_id, score, note)
    VALUES (?, ?, ?, ?)
  `).run(enrollmentId, gradeItemId, score, note);
  database.prepare(`
    INSERT INTO exam_attempts (
      enrollment_id, lesson_id, questions_json, question_set_hash,
      started_at, expires_at, submitted_at, status
    ) VALUES (?, ?, '[{"question":"Preserved?"}]', 'prior-question-set', ?, ?, ?, 'submitted')
  `).run(enrollmentId, lessonId, startedAt, expiresAt, expiresAt);
  database.prepare(`
    INSERT INTO quiz_attempt_history (
      enrollment_id, lesson_id, grade_item_id, attempt_number,
      score, correct_answers, total_questions, submitted_at
    ) VALUES (?, ?, ?, 1, ?, 8, 10, ?)
  `).run(enrollmentId, lessonId, gradeItemId, score, expiresAt);
  database.prepare("INSERT INTO lesson_completions (enrollment_id, lesson_id) VALUES (?, ?)")
    .run(enrollmentId, lessonId);
}

function priorResult(enrollmentId, lesson) {
  return {
    attempt: { ...database.prepare(`
      SELECT questions_json, question_set_hash, started_at, expires_at, submitted_at, status
      FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
    `).get(enrollmentId, lesson.lesson_id) },
    completion: { ...database.prepare(`
      SELECT completed_at FROM lesson_completions WHERE enrollment_id = ? AND lesson_id = ?
    `).get(enrollmentId, lesson.lesson_id) },
    grade: { ...database.prepare(`
      SELECT score, note FROM grades WHERE enrollment_id = ? AND grade_item_id = ?
    `).get(enrollmentId, lesson.grade_item_id) },
    history: database.prepare(`
      SELECT attempt_number, score, correct_answers, total_questions, submitted_at
      FROM quiz_attempt_history WHERE enrollment_id = ? AND lesson_id = ? ORDER BY attempt_number
    `).all(enrollmentId, lesson.lesson_id).map((row) => ({ ...row }))
  };
}

async function reopenAssessment(courseId, fields, cookie = adminCookie) {
  return fetch(`${baseUrl}/admin/courses/${courseId}/assessment-access`, {
    body: new URLSearchParams(fields),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie
    },
    method: "POST",
    redirect: "manual"
  });
}

async function assessmentAccessForm(courseId, cookie = adminCookie) {
  const response = await fetch(`${baseUrl}/admin/courses/${courseId}/manage`, {
    headers: { cookie }
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  const tokenMatch = html.match(/<input[^>]*name="requestToken"[^>]*value="([A-Za-z0-9_-]{16,128})"[^>]*>/i);
  assert.ok(tokenMatch, "Expected a session-bound assessment reset request token");
  return { html, requestToken: tokenMatch[1] };
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-bulk-assessment-access-"));
  const databaseFile = path.join(temporaryDirectory, "bulk-assessment-access.sqlite");
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile);
  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA busy_timeout = 5000;");
  adminCookie = await login("admin@browardmiamihi.com", "AdminPass123!", "faculty");
  instructorCookie = await login("instructor@browardmiamihi.com", "InstructorPass123!", "faculty");
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

test("course management offers one-student and all-eligible-students exam reset scopes", async () => {
  const lesson = pn104Final();
  const { html } = await assessmentAccessForm(lesson.course_id);
  assert.match(html, /<option value="all"[^>]*>\s*All eligible students(?:\s*\(\d+\))?\s*<\/option>/i);
  assert.match(html, /name="enrollmentId"/);
  assert.match(html, /name="lessonId"/);
  assert.match(html, /name="requestToken"\s+value="[A-Za-z0-9_-]{16,128}"/);
  assert.match(html, /<option(?=[^>]*value="")(?=[^>]*disabled)(?=[^>]*selected)[^>]*>\s*Choose a student\s*<\/option>/i);
  assert.match(html, /<option(?=[^>]*value="")(?=[^>]*disabled)(?=[^>]*selected)[^>]*>\s*Choose an exam\s*<\/option>/i);
  assert.match(html, /'Reopen ' \+ examLabel \+ ' for ' \+ studentLabel \+ '\? Existing grades and attempts will remain in the audit history\.'/i);
});

test("exam reset choices exclude unpublished and instructor-only assessments", async () => {
  const lesson = pn104Final();
  const moduleId = database.prepare("SELECT module_id FROM lessons WHERE id = ?").get(lesson.lesson_id).module_id;
  const hiddenLessonIds = [];
  let hiddenModuleId;
  try {
    hiddenLessonIds.push(Number(database.prepare(`
      INSERT INTO lessons (module_id, title, content, published, instructor_only, item_type)
      VALUES (?, '[PN104 2026] Hidden Unpublished Final', ?, 0, 0, 'quiz')
    `).run(moduleId, lesson.content).lastInsertRowid));
    hiddenLessonIds.push(Number(database.prepare(`
      INSERT INTO lessons (module_id, title, content, published, instructor_only, item_type)
      VALUES (?, '[PN104 2026] Hidden Instructor Final', ?, 1, 1, 'quiz')
    `).run(moduleId, lesson.content).lastInsertRowid));
    hiddenModuleId = Number(database.prepare(`
      INSERT INTO modules (course_id, title, position, published)
      VALUES (?, 'Hidden assessment module', 999, 0)
    `).run(lesson.course_id).lastInsertRowid);
    hiddenLessonIds.push(Number(database.prepare(`
      INSERT INTO lessons (module_id, title, content, published, instructor_only, item_type)
      VALUES (?, '[PN104 2026] Hidden Module Final', ?, 1, 0, 'quiz')
    `).run(hiddenModuleId, lesson.content).lastInsertRowid));

    const { html } = await assessmentAccessForm(lesson.course_id);
    const examOptions = html.match(/<select name="lessonId" required>([\s\S]*?)<\/select>/i)?.[1] || "";
    assert.match(examOptions, new RegExp(`value="${lesson.lesson_id}"`));
    assert.doesNotMatch(examOptions, /Hidden Unpublished Final/);
    assert.doesNotMatch(examOptions, /Hidden Instructor Final/);
    assert.doesNotMatch(examOptions, /Hidden Module Final/);
  } finally {
    if (hiddenModuleId) database.prepare("DELETE FROM modules WHERE id = ?").run(hiddenModuleId);
    for (const lessonId of hiddenLessonIds) database.prepare("DELETE FROM lessons WHERE id = ?").run(lessonId);
  }
});

test("personalized exams are available for their assigned student but reject bulk reset", async () => {
  const lesson = pn104Final();
  const personalized = database.prepare(`
    SELECT l.id AS lesson_id, l.title, lower(l.allowed_student_email) AS allowed_student_email,
      e.id AS enrollment_id
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    JOIN users u ON lower(u.email) = lower(l.allowed_student_email)
    JOIN enrollments e ON e.user_id = u.id AND e.course_id = m.course_id
    WHERE m.course_id = ?
      AND COALESCE(m.published, 1) = 1
      AND COALESCE(l.published, 1) = 1
      AND COALESCE(l.instructor_only, 0) = 0
      AND trim(COALESCE(l.allowed_student_email, '')) <> ''
      AND l.content LIKE '%QUIZ_DATA_BASE64:%'
    LIMIT 1
  `).get(lesson.course_id);
  assert.ok(personalized, "Expected a seeded student-specific PN 104 examination");

  const { html, requestToken } = await assessmentAccessForm(lesson.course_id);
  const examOptions = html.match(/<select name="lessonId" required>([\s\S]*?)<\/select>/i)?.[1] || "";
  assert.match(examOptions, new RegExp(`value="${personalized.lesson_id}"`));
  assert.match(examOptions, /Individual only:/i);
  assert.ok(examOptions.includes(`data-allowed-email="${personalized.allowed_student_email}"`));

  const response = await reopenAssessment(lesson.course_id, {
    enrollmentId: "all",
    lessonId: String(personalized.lesson_id),
    closesOn: new Date(Date.now() + (14 * 86_400_000)).toISOString().slice(0, 10),
    reason: "Personalized exam must stay individual",
    requestToken
  });
  assert.equal(response.status, 422);
  assert.match(await response.text(), /only be reopened for its assigned student/i);
  assert.equal(database.prepare(`
    SELECT id FROM assessment_reopen_batches WHERE request_token = ?
  `).get(requestToken), undefined);
});

test("bulk exam reset is admin-only while the instructor page retains individual controls", async () => {
  const lesson = pn104Final();
  const { html, requestToken } = await assessmentAccessForm(lesson.course_id, instructorCookie);
  assert.doesNotMatch(html, /<option value="all"/i);
  assert.match(html, /name="enrollmentId"/);

  const response = await reopenAssessment(lesson.course_id, {
    enrollmentId: "all",
    lessonId: String(lesson.lesson_id),
    closesOn: new Date(Date.now() + (14 * 86_400_000)).toISOString().slice(0, 10),
    reason: "Instructor must not bulk reset",
    requestToken
  }, instructorCookie);
  assert.equal(response.status, 403);
  assert.equal(database.prepare(`
    SELECT id FROM assessment_reopen_batches WHERE request_token = ?
  `).get(requestToken), undefined);
});

test("the existing one-student reset still targets only the selected enrollment", async () => {
  const lesson = pn104Final();
  const selected = addStudentEnrollment({ courseId: lesson.course_id, key: "Selected" });
  const control = addStudentEnrollment({ courseId: lesson.course_id, key: "Control" });
  seedPriorResult({
    enrollmentId: selected.enrollmentId,
    lessonId: lesson.lesson_id,
    gradeItemId: lesson.grade_item_id,
    score: 88,
    note: "Selected prior final"
  });
  const accommodation = database.prepare(`
    INSERT INTO exam_access_overrides (enrollment_id, lesson_id, opens_at, closes_at, minutes, reason)
    VALUES (?, ?, ?, ?, 135, 'Existing extra-time accommodation')
  `).run(
    selected.enrollmentId,
    lesson.lesson_id,
    new Date(Date.now() - 86_400_000).toISOString(),
    new Date(Date.now() + 86_400_000).toISOString()
  );
  database.prepare(`
    UPDATE exam_attempts SET access_override_id = ? WHERE enrollment_id = ? AND lesson_id = ?
  `).run(accommodation.lastInsertRowid, selected.enrollmentId, lesson.lesson_id);
  seedPriorResult({
    enrollmentId: control.enrollmentId,
    lessonId: lesson.lesson_id,
    gradeItemId: lesson.grade_item_id,
    score: 72,
    note: "Control prior final"
  });
  const selectedBefore = priorResult(selected.enrollmentId, lesson);
  const controlBefore = priorResult(control.enrollmentId, lesson);
  const closesOn = new Date(Date.now() + (14 * 86_400_000)).toISOString().slice(0, 10);
  const { requestToken } = await assessmentAccessForm(lesson.course_id);
  const response = await reopenAssessment(lesson.course_id, {
    enrollmentId: String(selected.enrollmentId),
    lessonId: String(lesson.lesson_id),
    closesOn,
    reason: "Individual reset regression",
    requestToken
  });
  assert.ok([302, 303].includes(response.status));

  assert.deepEqual(priorResult(selected.enrollmentId, lesson), selectedBefore);
  assert.deepEqual(priorResult(control.enrollmentId, lesson), controlBefore);
  assert.deepEqual({ ...database.prepare(`
    SELECT reason, minutes FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
  `).get(selected.enrollmentId, lesson.lesson_id) }, {
    reason: "Individual reset regression",
    minutes: 135
  });
  assert.equal(database.prepare(`
    SELECT reason FROM assessment_reopen_audit WHERE enrollment_id = ? AND lesson_id = ?
  `).get(selected.enrollmentId, lesson.lesson_id).reason, "Individual reset regression");
  assert.ok(database.prepare(`
    SELECT id FROM messages WHERE recipient_id = ? AND course_id = ? AND subject = ?
  `).get(selected.userId, lesson.course_id, `Assessment reopened: ${lesson.title}`));

  assert.equal(database.prepare(`
    SELECT id FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
  `).get(control.enrollmentId, lesson.lesson_id), undefined);
  assert.equal(database.prepare(`
    SELECT id FROM assessment_reopen_audit WHERE enrollment_id = ? AND lesson_id = ?
  `).get(control.enrollmentId, lesson.lesson_id), undefined);
  assert.equal(database.prepare(`
    SELECT id FROM messages WHERE recipient_id = ? AND course_id = ? AND subject = ?
  `).get(control.userId, lesson.course_id, `Assessment reopened: ${lesson.title}`), undefined);
});

test("one-student reset rejects a genuinely live exam attempt without changing it", async () => {
  const lesson = pn104Final();
  const student = addStudentEnrollment({ courseId: lesson.course_id, key: "IndividualLiveAttempt" });
  seedPriorResult({
    enrollmentId: student.enrollmentId,
    lessonId: lesson.lesson_id,
    gradeItemId: lesson.grade_item_id,
    score: 81,
    note: "Live attempt prior result"
  });
  const opensAt = new Date(Date.now() - 3_600_000).toISOString();
  const closesAt = new Date(Date.now() + 2 * 86_400_000).toISOString();
  const expiresAt = new Date(Date.now() + 45 * 60_000).toISOString();
  const override = database.prepare(`
    INSERT INTO exam_access_overrides (enrollment_id, lesson_id, opens_at, closes_at, minutes, reason)
    VALUES (?, ?, ?, ?, 90, 'Live individual attempt')
  `).run(student.enrollmentId, lesson.lesson_id, opensAt, closesAt);
  database.prepare(`
    UPDATE exam_attempts
    SET status = 'in_progress', submitted_at = NULL, expires_at = ?, access_override_id = ?
    WHERE enrollment_id = ? AND lesson_id = ?
  `).run(expiresAt, override.lastInsertRowid, student.enrollmentId, lesson.lesson_id);
  const attemptBefore = { ...database.prepare(`
    SELECT * FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
  `).get(student.enrollmentId, lesson.lesson_id) };
  const overrideBefore = { ...database.prepare(`
    SELECT * FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
  `).get(student.enrollmentId, lesson.lesson_id) };
  const { requestToken } = await assessmentAccessForm(lesson.course_id);
  const response = await reopenAssessment(lesson.course_id, {
    enrollmentId: String(student.enrollmentId),
    lessonId: String(lesson.lesson_id),
    closesOn: new Date(Date.now() + (14 * 86_400_000)).toISOString().slice(0, 10),
    reason: "Must not interrupt live attempt",
    requestToken
  });
  assert.equal(response.status, 409);
  assert.match(await response.text(), /currently taking the examination/i);
  assert.deepEqual({ ...database.prepare(`
    SELECT * FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
  `).get(student.enrollmentId, lesson.lesson_id) }, attemptBefore);
  assert.deepEqual({ ...database.prepare(`
    SELECT * FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
  `).get(student.enrollmentId, lesson.lesson_id) }, overrideBefore);
  assert.equal(database.prepare(`
    SELECT id FROM assessment_reopen_batches WHERE request_token = ?
  `).get(requestToken), undefined);
  assert.equal(database.prepare(`
    SELECT id FROM assessment_reopen_audit
    WHERE enrollment_id = ? AND lesson_id = ? AND reason = 'Must not interrupt live attempt'
  `).get(student.enrollmentId, lesson.lesson_id), undefined);
  assert.equal(database.prepare(`
    SELECT id FROM messages WHERE recipient_id = ? AND course_id = ? AND subject = ?
  `).get(student.userId, lesson.course_id, `Assessment reopened: ${lesson.title}`), undefined);
});

test("one-student reset preserves an in-flight submission during the five-second grace window", async () => {
  const lesson = pn104Final();
  const student = addStudentEnrollment({ courseId: lesson.course_id, key: "SubmissionGrace" });
  seedPriorResult({
    enrollmentId: student.enrollmentId,
    lessonId: lesson.lesson_id,
    gradeItemId: lesson.grade_item_id,
    score: 79,
    note: "Grace-window prior result"
  });
  const { requestToken } = await assessmentAccessForm(lesson.course_id);
  const opensAt = new Date(Date.now() - 3_600_000).toISOString();
  const closesAt = new Date(Date.now() + 2 * 86_400_000).toISOString();
  const expiresAt = new Date(Date.now() - 1_000).toISOString();
  const override = database.prepare(`
    INSERT INTO exam_access_overrides (enrollment_id, lesson_id, opens_at, closes_at, minutes, reason)
    VALUES (?, ?, ?, ?, 90, 'Submission grace window')
  `).run(student.enrollmentId, lesson.lesson_id, opensAt, closesAt);
  database.prepare(`
    UPDATE exam_attempts
    SET status = 'in_progress', submitted_at = NULL, expires_at = ?, access_override_id = ?
    WHERE enrollment_id = ? AND lesson_id = ?
  `).run(expiresAt, override.lastInsertRowid, student.enrollmentId, lesson.lesson_id);
  const attemptBefore = { ...database.prepare(`
    SELECT * FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
  `).get(student.enrollmentId, lesson.lesson_id) };
  const overrideBefore = { ...database.prepare(`
    SELECT * FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
  `).get(student.enrollmentId, lesson.lesson_id) };

  const response = await reopenAssessment(lesson.course_id, {
    enrollmentId: String(student.enrollmentId),
    lessonId: String(lesson.lesson_id),
    closesOn: new Date(Date.now() + (14 * 86_400_000)).toISOString().slice(0, 10),
    reason: "Must preserve submission grace",
    requestToken
  });
  assert.equal(response.status, 409);
  assert.match(await response.text(), /currently taking the examination/i);
  assert.deepEqual({ ...database.prepare(`
    SELECT * FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
  `).get(student.enrollmentId, lesson.lesson_id) }, attemptBefore);
  assert.deepEqual({ ...database.prepare(`
    SELECT * FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
  `).get(student.enrollmentId, lesson.lesson_id) }, overrideBefore);
  assert.equal(database.prepare(`
    SELECT id FROM assessment_reopen_batches WHERE request_token = ?
  `).get(requestToken), undefined);
  assert.equal(database.prepare(`
    SELECT id FROM assessment_reopen_audit
    WHERE enrollment_id = ? AND lesson_id = ? AND reason = 'Must preserve submission grace'
  `).get(student.enrollmentId, lesson.lesson_id), undefined);
  assert.equal(database.prepare(`
    SELECT id FROM messages WHERE recipient_id = ? AND course_id = ? AND subject = ?
  `).get(student.userId, lesson.course_id, `Assessment reopened: ${lesson.title}`), undefined);
});

test("all-students reset is atomic, eligibility-scoped, access-aware, and non-destructive", async () => {
  const lesson = pn104Final();
  database.prepare("UPDATE enrollments SET status = 'hold' WHERE course_id = ?").run(lesson.course_id);
  const active = addStudentEnrollment({ courseId: lesson.course_id, key: "EligibleActive" });
  const completed = addStudentEnrollment({
    courseId: lesson.course_id,
    key: "EligibleCompleted",
    enrollmentStatus: "completed"
  });
  const inProgress = addStudentEnrollment({ courseId: lesson.course_id, key: "EligibleInProgress" });
  const expiredInProgress = addStudentEnrollment({ courseId: lesson.course_id, key: "EligibleExpiredInProgress" });
  const closedOverrideInProgress = addStudentEnrollment({ courseId: lesson.course_id, key: "EligibleClosedOverrideInProgress" });
  const hold = addStudentEnrollment({ courseId: lesson.course_id, key: "ExcludedHold", enrollmentStatus: "hold" });
  const withdrawn = addStudentEnrollment({
    courseId: lesson.course_id,
    key: "ExcludedWithdrawn",
    enrollmentStatus: "withdrawn",
    withdrawn: true
  });
  const withdrawnActive = addStudentEnrollment({
    courseId: lesson.course_id,
    key: "ExcludedWithdrawnActive",
    withdrawn: true
  });
  const inactiveUser = addStudentEnrollment({
    courseId: lesson.course_id,
    key: "ExcludedInactiveUser",
    userStatus: "inactive"
  });
  const fixtures = [
    active,
    completed,
    inProgress,
    expiredInProgress,
    closedOverrideInProgress,
    hold,
    withdrawn,
    withdrawnActive,
    inactiveUser
  ];
  fixtures.forEach((student, index) => seedPriorResult({
    enrollmentId: student.enrollmentId,
    lessonId: lesson.lesson_id,
    gradeItemId: lesson.grade_item_id,
    score: 60 + index,
    note: `Prior result ${index + 1}`
  }));
  const priorOverrideOpensAt = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const priorOverrideClosesAt = new Date(Date.now() + 2 * 86_400_000).toISOString();
  const completedPriorOverride = database.prepare(`
    INSERT INTO exam_access_overrides (enrollment_id, lesson_id, opens_at, closes_at, minutes, reason)
    VALUES (?, ?, ?, ?, 75, 'Earlier individual accommodation')
  `).run(completed.enrollmentId, lesson.lesson_id, priorOverrideOpensAt, priorOverrideClosesAt);
  database.prepare(`
    UPDATE exam_attempts SET access_override_id = ? WHERE enrollment_id = ? AND lesson_id = ?
  `).run(completedPriorOverride.lastInsertRowid, completed.enrollmentId, lesson.lesson_id);
  const inProgressOverride = database.prepare(`
    INSERT INTO exam_access_overrides (enrollment_id, lesson_id, opens_at, closes_at, minutes, reason)
    VALUES (?, ?, ?, ?, 90, 'Student is taking this exam now')
  `).run(inProgress.enrollmentId, lesson.lesson_id, priorOverrideOpensAt, priorOverrideClosesAt);
  database.prepare(`
    UPDATE exam_attempts
    SET status = 'in_progress', submitted_at = NULL, expires_at = ?, access_override_id = ?
    WHERE enrollment_id = ? AND lesson_id = ?
  `).run(
    new Date(Date.now() + 60 * 60_000).toISOString(),
    inProgressOverride.lastInsertRowid,
    inProgress.enrollmentId,
    lesson.lesson_id
  );
  const expiredInProgressOverride = database.prepare(`
    INSERT INTO exam_access_overrides (enrollment_id, lesson_id, opens_at, closes_at, minutes, reason)
    VALUES (?, ?, ?, ?, 90, 'Attempt timer already expired')
  `).run(expiredInProgress.enrollmentId, lesson.lesson_id, priorOverrideOpensAt, priorOverrideClosesAt);
  database.prepare(`
    UPDATE exam_attempts
    SET status = 'in_progress', submitted_at = NULL, access_override_id = ?
    WHERE enrollment_id = ? AND lesson_id = ?
  `).run(expiredInProgressOverride.lastInsertRowid, expiredInProgress.enrollmentId, lesson.lesson_id);
  const closedOverrideClosesAt = new Date(Date.now() - 60 * 60_000).toISOString();
  const closedOverrideInProgressOverride = database.prepare(`
    INSERT INTO exam_access_overrides (enrollment_id, lesson_id, opens_at, closes_at, minutes, reason)
    VALUES (?, ?, ?, ?, 90, 'Override window already closed')
  `).run(
    closedOverrideInProgress.enrollmentId,
    lesson.lesson_id,
    priorOverrideOpensAt,
    closedOverrideClosesAt
  );
  database.prepare(`
    UPDATE exam_attempts
    SET status = 'in_progress', submitted_at = NULL, expires_at = ?, access_override_id = ?
    WHERE enrollment_id = ? AND lesson_id = ?
  `).run(
    new Date(Date.now() + 60 * 60_000).toISOString(),
    closedOverrideInProgressOverride.lastInsertRowid,
    closedOverrideInProgress.enrollmentId,
    lesson.lesson_id
  );
  const before = new Map(fixtures.map((student) => [student.enrollmentId, priorResult(student.enrollmentId, lesson)]));
  const inProgressAttemptBefore = { ...database.prepare(`
    SELECT status, submitted_at, questions_json, question_set_hash, started_at, expires_at, access_override_id
    FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
  `).get(inProgress.enrollmentId, lesson.lesson_id) };
  const inProgressOverrideBefore = { ...database.prepare(`
    SELECT opens_at, closes_at, minutes, reason
    FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
  `).get(inProgress.enrollmentId, lesson.lesson_id) };
  const closesOn = new Date(Date.now() + (21 * 86_400_000)).toISOString().slice(0, 10);
  const reason = "All eligible students regression";
  const { requestToken } = await assessmentAccessForm(lesson.course_id);
  const response = await reopenAssessment(lesson.course_id, {
    enrollmentId: "all",
    lessonId: String(lesson.lesson_id),
    closesOn,
    reason,
    requestToken
  });
  assert.ok([302, 303].includes(response.status));

  fixtures.forEach((student) => {
    assert.deepEqual(
      priorResult(student.enrollmentId, lesson),
      before.get(student.enrollmentId),
      `Expected reset to preserve prior records for ${student.email}`
    );
  });

  for (const student of [active, completed, expiredInProgress, closedOverrideInProgress]) {
    const override = database.prepare(`
      SELECT reason, opens_at, closes_at FROM exam_access_overrides
      WHERE enrollment_id = ? AND lesson_id = ?
    `).get(student.enrollmentId, lesson.lesson_id);
    assert.equal(override.reason, reason);
    assert.ok(new Date(override.opens_at).getTime() <= Date.now());
    assert.ok(new Date(override.closes_at).getTime() > Date.now());
    const audit = database.prepare(`
      SELECT previous_score, previous_note, previous_attempt_status, reason
      FROM assessment_reopen_audit
      WHERE enrollment_id = ? AND lesson_id = ? AND reason = ?
    `).get(student.enrollmentId, lesson.lesson_id, reason);
    assert.deepEqual({ ...audit }, {
      previous_score: before.get(student.enrollmentId).grade.score,
      previous_note: before.get(student.enrollmentId).grade.note,
      previous_attempt_status: [expiredInProgress, closedOverrideInProgress].includes(student) ? "in_progress" : "submitted",
      reason
    });
    assert.ok(database.prepare(`
      SELECT id FROM messages WHERE recipient_id = ? AND course_id = ? AND subject = ?
    `).get(student.userId, lesson.course_id, `Assessment reopened: ${lesson.title}`));
  }

  const completedAuditSnapshot = database.prepare(`
    SELECT previous_attempt_questions_json, previous_attempt_question_set_hash,
      previous_attempt_access_override_id, previous_override_opens_at,
      previous_override_closes_at, previous_override_minutes, previous_override_reason
    FROM assessment_reopen_audit
    WHERE enrollment_id = ? AND lesson_id = ? AND reason = ?
  `).get(completed.enrollmentId, lesson.lesson_id, reason);
  assert.deepEqual({ ...completedAuditSnapshot }, {
    previous_attempt_questions_json: '[{"question":"Preserved?"}]',
    previous_attempt_question_set_hash: "prior-question-set",
    previous_attempt_access_override_id: Number(completedPriorOverride.lastInsertRowid),
    previous_override_opens_at: priorOverrideOpensAt,
    previous_override_closes_at: priorOverrideClosesAt,
    previous_override_minutes: 75,
    previous_override_reason: "Earlier individual accommodation"
  });

  assert.deepEqual({ ...database.prepare(`
    SELECT status, submitted_at, questions_json, question_set_hash, started_at, expires_at, access_override_id
    FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
  `).get(inProgress.enrollmentId, lesson.lesson_id) }, inProgressAttemptBefore);
  assert.deepEqual({ ...database.prepare(`
    SELECT opens_at, closes_at, minutes, reason
    FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
  `).get(inProgress.enrollmentId, lesson.lesson_id) }, inProgressOverrideBefore);
  assert.equal(database.prepare(`
    SELECT id FROM assessment_reopen_audit WHERE enrollment_id = ? AND lesson_id = ? AND reason = ?
  `).get(inProgress.enrollmentId, lesson.lesson_id, reason), undefined);
  assert.equal(database.prepare(`
    SELECT id FROM messages WHERE recipient_id = ? AND course_id = ? AND subject = ?
  `).get(inProgress.userId, lesson.course_id, `Assessment reopened: ${lesson.title}`), undefined);
  assert.deepEqual({ ...database.prepare(`
    SELECT affected_count, skipped_count FROM assessment_reopen_batches WHERE request_token = ?
  `).get(requestToken) }, { affected_count: 4, skipped_count: 1 });

  for (const student of [hold, withdrawn, withdrawnActive, inactiveUser]) {
    assert.equal(database.prepare(`
      SELECT id FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
    `).get(student.enrollmentId, lesson.lesson_id), undefined, `Expected no override for ${student.email}`);
    assert.equal(database.prepare(`
      SELECT id FROM assessment_reopen_audit WHERE enrollment_id = ? AND lesson_id = ?
    `).get(student.enrollmentId, lesson.lesson_id), undefined);
    assert.equal(database.prepare(`
      SELECT id FROM messages WHERE recipient_id = ? AND course_id = ? AND subject = ?
    `).get(student.userId, lesson.course_id, `Assessment reopened: ${lesson.title}`), undefined);
  }

  const activeOverride = database.prepare(`
    SELECT id FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
  `).get(active.enrollmentId, lesson.lesson_id);
  database.prepare(`
    UPDATE exam_attempts
    SET status = 'in_progress', submitted_at = NULL, access_override_id = ?
    WHERE enrollment_id = ? AND lesson_id = ?
  `).run(activeOverride.id, active.enrollmentId, lesson.lesson_id);
  const auditCountBeforeRetry = database.prepare(`
    SELECT COUNT(*) AS count FROM assessment_reopen_audit WHERE batch_id = (
      SELECT id FROM assessment_reopen_batches WHERE request_token = ?
    )
  `).get(requestToken).count;
  const messageCountBeforeRetry = database.prepare(`
    SELECT COUNT(*) AS count FROM messages WHERE recipient_id IN (?, ?) AND course_id = ? AND subject = ?
  `).get(active.userId, completed.userId, lesson.course_id, `Assessment reopened: ${lesson.title}`).count;
  const duplicateResponse = await reopenAssessment(lesson.course_id, {
    enrollmentId: "all",
    lessonId: String(lesson.lesson_id),
    closesOn,
    reason,
    requestToken
  });
  assert.ok([302, 303].includes(duplicateResponse.status));
  assert.equal(database.prepare(`
    SELECT COUNT(*) AS count FROM assessment_reopen_audit WHERE batch_id = (
      SELECT id FROM assessment_reopen_batches WHERE request_token = ?
    )
  `).get(requestToken).count, auditCountBeforeRetry);
  assert.equal(database.prepare(`
    SELECT COUNT(*) AS count FROM messages WHERE recipient_id IN (?, ?) AND course_id = ? AND subject = ?
  `).get(active.userId, completed.userId, lesson.course_id, `Assessment reopened: ${lesson.title}`).count, messageCountBeforeRetry);
  assert.deepEqual({ ...database.prepare(`
    SELECT status, access_override_id FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
  `).get(active.enrollmentId, lesson.lesson_id) }, {
    status: "in_progress",
    access_override_id: activeOverride.id
  });

  database.prepare("UPDATE lessons SET allowed_student_email = ? WHERE id = ?")
    .run(completed.email, lesson.lesson_id);
  const restrictedReason = "Restricted assessment access regression";
  const { requestToken: restrictedRequestToken } = await assessmentAccessForm(lesson.course_id);
  assert.notEqual(restrictedRequestToken, requestToken, "Expected a fresh request token for a deliberate new reset");
  const messageCountsBefore = new Map([active, completed].map((student) => [
    student.userId,
    database.prepare(`
      SELECT COUNT(*) AS count FROM messages WHERE recipient_id = ? AND course_id = ? AND subject = ?
    `).get(student.userId, lesson.course_id, `Assessment reopened: ${lesson.title}`).count
  ]));
  const restrictedResponse = await reopenAssessment(lesson.course_id, {
    enrollmentId: "all",
    lessonId: String(lesson.lesson_id),
    closesOn,
    reason: restrictedReason,
    requestToken: restrictedRequestToken
  });
  assert.equal(restrictedResponse.status, 422);
  assert.match(await restrictedResponse.text(), /only be reopened for its assigned student/i);
  assert.equal(database.prepare(`
    SELECT id FROM assessment_reopen_batches WHERE request_token = ?
  `).get(restrictedRequestToken), undefined);
  assert.equal(database.prepare(`
    SELECT COUNT(*) AS count FROM assessment_reopen_audit
    WHERE enrollment_id = ? AND lesson_id = ? AND reason = ?
  `).get(active.enrollmentId, lesson.lesson_id, restrictedReason).count, 0);
  assert.equal(database.prepare(`
    SELECT COUNT(*) AS count FROM assessment_reopen_audit
    WHERE enrollment_id = ? AND lesson_id = ? AND reason = ?
  `).get(completed.enrollmentId, lesson.lesson_id, restrictedReason).count, 0);
  assert.equal(database.prepare(`
    SELECT reason FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
  `).get(active.enrollmentId, lesson.lesson_id).reason, reason);
  assert.equal(database.prepare(`
    SELECT reason FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
  `).get(completed.enrollmentId, lesson.lesson_id).reason, reason);
  assert.equal(database.prepare(`
    SELECT COUNT(*) AS count FROM messages WHERE recipient_id = ? AND course_id = ? AND subject = ?
  `).get(active.userId, lesson.course_id, `Assessment reopened: ${lesson.title}`).count, messageCountsBefore.get(active.userId));
  assert.equal(database.prepare(`
    SELECT COUNT(*) AS count FROM messages WHERE recipient_id = ? AND course_id = ? AND subject = ?
  `).get(completed.userId, lesson.course_id, `Assessment reopened: ${lesson.title}`).count, messageCountsBefore.get(completed.userId));

  const { requestToken: individualRestrictedToken } = await assessmentAccessForm(lesson.course_id);
  const individualRestrictedResponse = await reopenAssessment(lesson.course_id, {
    enrollmentId: String(completed.enrollmentId),
    lessonId: String(lesson.lesson_id),
    closesOn,
    reason: restrictedReason,
    requestToken: individualRestrictedToken
  });
  assert.ok([302, 303].includes(individualRestrictedResponse.status));
  assert.equal(database.prepare(`
    SELECT COUNT(*) AS count FROM assessment_reopen_audit
    WHERE enrollment_id = ? AND lesson_id = ? AND reason = ?
  `).get(active.enrollmentId, lesson.lesson_id, restrictedReason).count, 0);
  assert.equal(database.prepare(`
    SELECT COUNT(*) AS count FROM assessment_reopen_audit
    WHERE enrollment_id = ? AND lesson_id = ? AND reason = ?
  `).get(completed.enrollmentId, lesson.lesson_id, restrictedReason).count, 1);
  assert.equal(database.prepare(`
    SELECT reason FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
  `).get(completed.enrollmentId, lesson.lesson_id).reason, restrictedReason);
  assert.equal(database.prepare(`
    SELECT COUNT(*) AS count FROM messages WHERE recipient_id = ? AND course_id = ? AND subject = ?
  `).get(completed.userId, lesson.course_id, `Assessment reopened: ${lesson.title}`).count, messageCountsBefore.get(completed.userId) + 1);
});
