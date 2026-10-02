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
let studentCookie;
let adminCookie;

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
    const timeout = setTimeout(() => {
      reject(new Error(`Server did not start in time.\n${output}`));
    }, 120_000);

    serverProcess = spawn(process.execPath, ["--no-warnings", "src/server.js"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_FILE: databaseFile,
        EMAIL_DELIVERY_ENABLED: "false",
        NODE_ENV: "test",
        PORT: String(port),
        PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
        SESSION_SECRET: "quiz-grade-reflection-test-secret"
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

function quizQuestions(content) {
  const match = String(content || "").match(/QUIZ_DATA_BASE64:([A-Za-z0-9+/=]+)/);
  assert.ok(match, "Expected lesson content to include quiz data");
  return JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
}

function quizAnswers(lesson, { correct = true } = {}) {
  const questions = quizQuestions(lesson.content);
  const answers = new URLSearchParams({ lessonId: String(lesson.lesson_id) });
  questions.forEach((question, index) => {
    const optionCount = Array.isArray(question.options) ? question.options.length : 0;
    const answer = correct || optionCount < 2
      ? Number(question.answer)
      : (Number(question.answer) + 1) % optionCount;
    answers.set(`q${index + 1}`, String(answer));
  });
  return { answers, questions };
}

async function submitQuiz(lesson, answers) {
  return fetch(`${baseUrl}/student/enrollments/${lesson.enrollment_id}/quiz-submit`, {
    body: answers,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: studentCookie
    },
    method: "POST",
    redirect: "manual"
  });
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-quiz-grades-"));
  const databaseFile = path.join(temporaryDirectory, "quiz-grades.sqlite");
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile);

  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA busy_timeout = 5000;");
  const photoStorageName = "test-student.png";
  fs.writeFileSync(
    path.join(temporaryDirectory, "uploads", photoStorageName),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  );
  database.prepare(`
    UPDATE users
    SET organization_status = 'organized',
      photo_review_status = 'approved',
      photo_storage_name = ?,
      photo_original_name = 'test-student.png'
    WHERE email = 'student@browardmiamihi.com'
  `).run(photoStorageName);

  studentCookie = await login("student@browardmiamihi.com", "StudentPass123!", "student");
  adminCookie = await login("admin@browardmiamihi.com", "AdminPass123!", "faculty");
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

test("completed quizzes record grades even when the gradebook item is missing", async () => {
  const quizLesson = database.prepare(`
    SELECT e.id AS enrollment_id, c.id AS course_id, l.id AS lesson_id, l.title, l.content
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id AND c.published = 1
    JOIN modules m ON m.course_id = c.id AND m.published = 1
    JOIN lessons l ON l.module_id = m.id AND l.published = 1 AND l.instructor_only = 0
    WHERE u.email = 'student@browardmiamihi.com'
      AND e.status = 'active'
      AND l.content LIKE '%QUIZ_DATA_BASE64:%'
      AND lower(l.title) NOT LIKE '%midterm%'
      AND lower(l.title) NOT LIKE '%final%'
    ORDER BY c.id, m.position, l.position
    LIMIT 1
  `).get();
  assert.ok(quizLesson, "Expected a seeded student quiz lesson");

  database.prepare("UPDATE lessons SET grade_item_id = NULL WHERE id = ?").run(quizLesson.lesson_id);
  database.prepare("DELETE FROM grade_items WHERE course_id = ? AND title = ?").run(quizLesson.course_id, quizLesson.title);

  const startResponse = await fetch(`${baseUrl}/student/enrollments/${quizLesson.enrollment_id}/quizzes/${quizLesson.lesson_id}/start`, {
    headers: { cookie: studentCookie },
    method: "POST",
    redirect: "manual"
  });
  assert.ok([302, 303].includes(startResponse.status), "Expected quiz start to redirect back to the lesson");

  const questions = quizQuestions(quizLesson.content);
  assert.ok(questions.length, "Expected at least one question in the seeded quiz");
  const answers = new URLSearchParams({ lessonId: String(quizLesson.lesson_id) });
  questions.forEach((question, index) => {
    answers.set(`q${index + 1}`, String(question.answer));
  });

  const submitResponse = await fetch(`${baseUrl}/student/enrollments/${quizLesson.enrollment_id}/quiz-submit`, {
    body: answers,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: studentCookie
    },
    method: "POST",
    redirect: "manual"
  });
  const submitResponseBody = await submitResponse.text();
  assert.ok([302, 303].includes(submitResponse.status), `Expected quiz submission to redirect back to the lesson; received ${submitResponse.status}: ${submitResponseBody}`);

  const linkedLesson = database.prepare("SELECT grade_item_id FROM lessons WHERE id = ?").get(quizLesson.lesson_id);
  assert.ok(linkedLesson.grade_item_id, "Expected quiz submission to link the lesson to a grade item");

  const grade = database.prepare(`
    SELECT g.score, g.note, gi.points_possible, gi.title
    FROM grades g
    JOIN grade_items gi ON gi.id = g.grade_item_id
    WHERE g.enrollment_id = ? AND g.grade_item_id = ?
  `).get(quizLesson.enrollment_id, linkedLesson.grade_item_id);

  assert.ok(grade, "Expected completed quiz to create a visible grade record");
  assert.equal(grade.title, quizLesson.title);
  assert.equal(grade.score, grade.points_possible);
  assert.match(grade.note, /^Auto-graded:/);
});

test("ordinary quizzes can be retaken and keep the highest submitted score", async () => {
  const quizLesson = database.prepare(`
    SELECT e.id AS enrollment_id, c.id AS course_id, l.id AS lesson_id,
      l.title, l.content, l.grade_item_id
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id
    JOIN modules m ON m.course_id = c.id AND m.published = 1
    JOIN lessons l ON l.module_id = m.id AND l.published = 1 AND l.instructor_only = 0
    WHERE u.email = 'student@browardmiamihi.com'
      AND e.status = 'active'
      AND c.slug = 'medical-terminology'
      AND l.title LIKE '[PN101 2026] Quiz 1 - Chapter 1:%'
      AND l.content LIKE '%QUIZ_DATA_BASE64:%'
    LIMIT 1
  `).get();
  assert.ok(quizLesson, "Expected the seeded PN 101 Quiz 1 lesson");

  const gradeItem = database.prepare(`
    SELECT * FROM grade_items WHERE course_id = ? AND title = ? LIMIT 1
  `).get(quizLesson.course_id, quizLesson.title);
  assert.ok(gradeItem, "Expected the seeded quiz grade item");
  database.prepare("UPDATE lessons SET grade_item_id = ? WHERE id = ?").run(gradeItem.id, quizLesson.lesson_id);
  database.prepare("DELETE FROM quiz_attempt_history WHERE enrollment_id = ? AND lesson_id = ?")
    .run(quizLesson.enrollment_id, quizLesson.lesson_id);
  database.prepare("DELETE FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
    .run(quizLesson.enrollment_id, quizLesson.lesson_id);
  database.prepare("DELETE FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
    .run(quizLesson.enrollment_id, gradeItem.id);

  const firstStart = await fetch(`${baseUrl}/student/enrollments/${quizLesson.enrollment_id}/quizzes/${quizLesson.lesson_id}/start`, {
    headers: { cookie: studentCookie },
    method: "POST",
    redirect: "manual"
  });
  assert.ok([302, 303].includes(firstStart.status));

  const firstAttempt = quizAnswers(quizLesson, { correct: true });
  const firstSubmit = await submitQuiz(quizLesson, firstAttempt.answers);
  assert.ok([302, 303].includes(firstSubmit.status));
  const perfectScore = Number(gradeItem.points_possible);
  assert.equal(
    database.prepare("SELECT score FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
      .get(quizLesson.enrollment_id, gradeItem.id).score,
    perfectScore
  );

  const submittedPage = await fetch(
    `${baseUrl}/student/enrollments/${quizLesson.enrollment_id}?lesson=${quizLesson.lesson_id}`,
    { headers: { cookie: studentCookie } }
  );
  assert.equal(submittedPage.status, 200);
  assert.match(await submittedPage.text(), />Retake Quiz</);

  const secondStart = await fetch(`${baseUrl}/student/enrollments/${quizLesson.enrollment_id}/quizzes/${quizLesson.lesson_id}/start`, {
    headers: { cookie: studentCookie },
    method: "POST",
    redirect: "manual"
  });
  assert.ok([302, 303].includes(secondStart.status));
  assert.equal(
    database.prepare("SELECT status FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
      .get(quizLesson.enrollment_id, quizLesson.lesson_id).status,
    "in_progress"
  );

  const retakePage = await fetch(
    `${baseUrl}/student/enrollments/${quizLesson.enrollment_id}?lesson=${quizLesson.lesson_id}`,
    { headers: { cookie: studentCookie } }
  );
  assert.equal(retakePage.status, 200);
  assert.match(await retakePage.text(), /name="q1"/, "Expected the retake to reopen the quiz questions");

  const lowerAttempt = quizAnswers(quizLesson, { correct: false });
  const secondSubmit = await submitQuiz(quizLesson, lowerAttempt.answers);
  assert.ok([302, 303].includes(secondSubmit.status));

  const retainedGrade = database.prepare(`
    SELECT score, note FROM grades WHERE enrollment_id = ? AND grade_item_id = ?
  `).get(quizLesson.enrollment_id, gradeItem.id);
  assert.equal(retainedGrade.score, perfectScore, "Expected a lower retake not to replace the highest score");
  assert.match(retainedGrade.note, /highest score retained:/i);
  const attempts = database.prepare(`
    SELECT attempt_number, score
    FROM quiz_attempt_history
    WHERE enrollment_id = ? AND lesson_id = ?
    ORDER BY attempt_number
  `).all(quizLesson.enrollment_id, quizLesson.lesson_id);
  assert.deepEqual(attempts.map((attempt) => attempt.attempt_number), [1, 2]);
  assert.equal(attempts[0].score, perfectScore);
  assert.ok(attempts[1].score < perfectScore);
});

test("completed enrollments hide an in-progress regular quiz until an instructor reactivates the course", async () => {
  const quizLesson = database.prepare(`
    SELECT e.id AS enrollment_id, l.id AS lesson_id
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id
    JOIN modules m ON m.course_id = c.id
    JOIN lessons l ON l.module_id = m.id
    WHERE u.email = 'student@browardmiamihi.com'
      AND c.slug = 'medical-terminology'
      AND l.title LIKE '[PN101 2026] Quiz 2 - Chapter 2:%'
      AND l.content LIKE '%QUIZ_DATA_BASE64:%'
      AND lower(l.title) NOT LIKE '%midterm%'
      AND lower(l.title) NOT LIKE '%final%'
    ORDER BY m.position, l.position, l.id
    LIMIT 1
  `).get();
  assert.ok(quizLesson);
  database.prepare("DELETE FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
    .run(quizLesson.enrollment_id, quizLesson.lesson_id);
  database.prepare("UPDATE enrollments SET status = 'active' WHERE id = ?").run(quizLesson.enrollment_id);
  const startedQuiz = await fetch(
    `${baseUrl}/student/enrollments/${quizLesson.enrollment_id}/quizzes/${quizLesson.lesson_id}/start`,
    { headers: { cookie: studentCookie }, method: "POST", redirect: "manual" }
  );
  assert.ok([302, 303].includes(startedQuiz.status));
  assert.equal(
    database.prepare("SELECT status FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
      .get(quizLesson.enrollment_id, quizLesson.lesson_id)?.status,
    "in_progress"
  );
  database.prepare("UPDATE enrollments SET status = 'completed' WHERE id = ?").run(quizLesson.enrollment_id);
  try {
    const page = await fetch(
      `${baseUrl}/student/enrollments/${quizLesson.enrollment_id}?lesson=${quizLesson.lesson_id}`,
      { headers: { cookie: studentCookie } }
    );
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /Course completed/);
    assert.match(html, /reactivate this enrollment/i);
    assert.doesNotMatch(html, />Start Now</);
    assert.doesNotMatch(html, />Retake Quiz</);
    assert.doesNotMatch(html, /name="q1"/);

    const blockedStart = await fetch(
      `${baseUrl}/student/enrollments/${quizLesson.enrollment_id}/quizzes/${quizLesson.lesson_id}/start`,
      { headers: { cookie: studentCookie }, method: "POST", redirect: "manual" }
    );
    assert.equal(blockedStart.status, 404);
  } finally {
    database.prepare("UPDATE enrollments SET status = 'active' WHERE id = ?").run(quizLesson.enrollment_id);
    database.prepare("DELETE FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
      .run(quizLesson.enrollment_id, quizLesson.lesson_id);
  }
});

test("an in-progress quiz is graded against the question snapshot saved at start", async () => {
  const quizLesson = database.prepare(`
    SELECT e.id AS enrollment_id, c.id AS course_id, l.id AS lesson_id,
      l.title, l.content, l.grade_item_id
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id
    JOIN modules m ON m.course_id = c.id
    JOIN lessons l ON l.module_id = m.id
    WHERE u.email = 'student@browardmiamihi.com'
      AND e.status = 'active'
      AND l.content LIKE '%QUIZ_DATA_BASE64:%'
      AND lower(l.title) NOT LIKE '%midterm%'
      AND lower(l.title) NOT LIKE '%final%'
    ORDER BY c.id, m.position, l.position
    LIMIT 1
  `).get();
  assert.ok(quizLesson);
  const originalQuestions = quizQuestions(quizLesson.content);
  database.prepare("DELETE FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
    .run(quizLesson.enrollment_id, quizLesson.lesson_id);
  database.prepare("DELETE FROM quiz_attempt_history WHERE enrollment_id = ? AND lesson_id = ?")
    .run(quizLesson.enrollment_id, quizLesson.lesson_id);
  if (quizLesson.grade_item_id) {
    database.prepare("DELETE FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
      .run(quizLesson.enrollment_id, quizLesson.grade_item_id);
  }

  const startResponse = await fetch(`${baseUrl}/student/enrollments/${quizLesson.enrollment_id}/quizzes/${quizLesson.lesson_id}/start`, {
    headers: { cookie: studentCookie },
    method: "POST",
    redirect: "manual"
  });
  assert.ok([302, 303].includes(startResponse.status));
  const startedAttempt = database.prepare(`
    SELECT questions_json, question_set_hash FROM exam_attempts
    WHERE enrollment_id = ? AND lesson_id = ?
  `).get(quizLesson.enrollment_id, quizLesson.lesson_id);
  assert.deepEqual(JSON.parse(startedAttempt.questions_json), originalQuestions);
  assert.match(startedAttempt.question_set_hash, /^[a-f0-9]{64}$/);

  const changedQuestions = originalQuestions.map((question, index) => ({
    ...question,
    prompt: `Changed after start ${index + 1}`,
    answer: (Number(question.answer) + 1) % question.options.length
  }));
  const changedContent = quizLesson.content.replace(
    /QUIZ_DATA_BASE64:[A-Za-z0-9+/=]+/,
    `QUIZ_DATA_BASE64:${Buffer.from(JSON.stringify(changedQuestions)).toString("base64")}`
  );
  database.prepare("UPDATE lessons SET content = ? WHERE id = ?").run(changedContent, quizLesson.lesson_id);
  try {
    const originalAnswers = new URLSearchParams({ lessonId: String(quizLesson.lesson_id) });
    originalQuestions.forEach((question, index) => originalAnswers.set(`q${index + 1}`, String(question.answer)));
    const submitResponse = await submitQuiz(quizLesson, originalAnswers);
    assert.ok([302, 303].includes(submitResponse.status));
    const gradeItem = database.prepare("SELECT grade_item_id FROM lessons WHERE id = ?").get(quizLesson.lesson_id);
    const grade = database.prepare("SELECT score FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
      .get(quizLesson.enrollment_id, gradeItem.grade_item_id);
    const points = database.prepare("SELECT points_possible FROM grade_items WHERE id = ?").get(gradeItem.grade_item_id);
    assert.equal(grade.score, points.points_possible);
  } finally {
    database.prepare("UPDATE lessons SET content = ? WHERE id = ?").run(quizLesson.content, quizLesson.lesson_id);
  }
});

test("the PN 104 final is a protected scheduled exam and cannot restart after submission", async () => {
  const finalLesson = database.prepare(`
    SELECT e.id AS enrollment_id, c.id AS course_id, l.id AS lesson_id,
      l.title, l.content, l.grade_item_id
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id
    JOIN modules m ON m.course_id = c.id
    JOIN lessons l ON l.module_id = m.id
    WHERE u.email = 'student@browardmiamihi.com'
      AND e.status = 'active'
      AND c.slug = 'anatomy-and-physiology'
      AND l.title = '[PN104 2026] Quiz: Final Examination'
      AND l.content LIKE '%QUIZ_DATA_BASE64:%'
    LIMIT 1
  `).get();
  assert.ok(finalLesson, "Expected the seeded PN 104 final examination");

  const gradeItem = database.prepare(`
    SELECT * FROM grade_items WHERE course_id = ? AND title = ? LIMIT 1
  `).get(finalLesson.course_id, finalLesson.title);
  assert.ok(gradeItem, "Expected the PN 104 final grade item");
  database.prepare("UPDATE lessons SET grade_item_id = ? WHERE id = ?").run(gradeItem.id, finalLesson.lesson_id);
  database.prepare("DELETE FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?")
    .run(finalLesson.enrollment_id, finalLesson.lesson_id);
  database.prepare("DELETE FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
    .run(finalLesson.enrollment_id, finalLesson.lesson_id);
  database.prepare("DELETE FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
    .run(finalLesson.enrollment_id, gradeItem.id);

  const now = Date.now();
  const overrideId = Number(database.prepare(`
    INSERT INTO exam_access_overrides (enrollment_id, lesson_id, opens_at, closes_at, minutes, reason, created_at)
    VALUES (?, ?, ?, ?, 90, 'Regression test window', ?)
  `).run(
    finalLesson.enrollment_id,
    finalLesson.lesson_id,
    new Date(now - 60_000).toISOString(),
    new Date(now + 86_400_000).toISOString(),
    new Date(now - 86_400_000).toISOString()
  ).lastInsertRowid);
  database.prepare(`
    INSERT INTO grades (enrollment_id, grade_item_id, score, note)
    VALUES (?, ?, 175, 'Previously submitted final')
  `).run(finalLesson.enrollment_id, gradeItem.id);
  database.prepare(`
    INSERT INTO exam_attempts (enrollment_id, lesson_id, access_override_id, started_at, expires_at, submitted_at, status)
    VALUES (?, ?, ?, ?, ?, ?, 'submitted')
  `).run(
    finalLesson.enrollment_id,
    finalLesson.lesson_id,
    overrideId,
    new Date(now - 7_200_000).toISOString(),
    new Date(now - 3_600_000).toISOString(),
    new Date(now - 3_600_000).toISOString()
  );

  const ordinaryQuizStart = await fetch(`${baseUrl}/student/enrollments/${finalLesson.enrollment_id}/quizzes/${finalLesson.lesson_id}/start`, {
    headers: { cookie: studentCookie },
    method: "POST",
    redirect: "manual"
  });
  assert.equal(ordinaryQuizStart.status, 404, "Expected the PN 104 final not to use the unlimited-quiz start route");

  const secondExamStart = await fetch(`${baseUrl}/student/enrollments/${finalLesson.enrollment_id}/exams/${finalLesson.lesson_id}/start`, {
    headers: { cookie: studentCookie },
    method: "POST",
    redirect: "manual"
  });
  assert.ok([302, 303].includes(secondExamStart.status));
  const protectedAttempt = database.prepare(`
    SELECT status, started_at, submitted_at
    FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
  `).get(finalLesson.enrollment_id, finalLesson.lesson_id);
  assert.equal(protectedAttempt.status, "submitted");
  assert.ok(protectedAttempt.submitted_at);
  assert.equal(
    database.prepare("SELECT score FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
      .get(finalLesson.enrollment_id, gradeItem.id).score,
    175
  );
});

test("loading an abandoned timed exam finalizes the expired attempt and records zero", async () => {
  const finalLesson = database.prepare(`
    SELECT e.id AS enrollment_id, c.id AS course_id, l.id AS lesson_id,
      l.title, l.content, l.grade_item_id
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id
    JOIN modules m ON m.course_id = c.id
    JOIN lessons l ON l.module_id = m.id
    WHERE u.email = 'student@browardmiamihi.com'
      AND e.status = 'active'
      AND c.slug = 'anatomy-and-physiology'
      AND l.title = '[PN104 2026] Quiz: Final Examination'
    LIMIT 1
  `).get();
  assert.ok(finalLesson);
  const gradeItem = database.prepare("SELECT * FROM grade_items WHERE course_id = ? AND title = ? LIMIT 1")
    .get(finalLesson.course_id, finalLesson.title);
  database.prepare("UPDATE lessons SET grade_item_id = ? WHERE id = ?").run(gradeItem.id, finalLesson.lesson_id);
  database.prepare("DELETE FROM assessment_reopen_audit WHERE enrollment_id = ? AND lesson_id = ?")
    .run(finalLesson.enrollment_id, finalLesson.lesson_id);
  database.prepare("DELETE FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?")
    .run(finalLesson.enrollment_id, finalLesson.lesson_id);
  database.prepare("DELETE FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
    .run(finalLesson.enrollment_id, finalLesson.lesson_id);
  database.prepare("DELETE FROM quiz_attempt_history WHERE enrollment_id = ? AND lesson_id = ?")
    .run(finalLesson.enrollment_id, finalLesson.lesson_id);
  database.prepare("DELETE FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
    .run(finalLesson.enrollment_id, gradeItem.id);

  const now = Date.now();
  database.prepare(`
    INSERT INTO exam_access_overrides (enrollment_id, lesson_id, opens_at, closes_at, minutes, reason)
    VALUES (?, ?, ?, ?, 90, 'Expiry regression test')
  `).run(
    finalLesson.enrollment_id,
    finalLesson.lesson_id,
    new Date(now - 60_000).toISOString(),
    new Date(now + 86_400_000).toISOString()
  );
  const started = await fetch(`${baseUrl}/student/enrollments/${finalLesson.enrollment_id}/exams/${finalLesson.lesson_id}/start`, {
    headers: { cookie: studentCookie },
    method: "POST",
    redirect: "manual"
  });
  assert.ok([302, 303].includes(started.status));
  database.prepare("UPDATE exam_attempts SET expires_at = ? WHERE enrollment_id = ? AND lesson_id = ?")
    .run(new Date(Date.now() - 60_000).toISOString(), finalLesson.enrollment_id, finalLesson.lesson_id);

  const page = await fetch(`${baseUrl}/student/enrollments/${finalLesson.enrollment_id}?lesson=${finalLesson.lesson_id}`, {
    headers: { cookie: studentCookie }
  });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Your quiz has been graded|Attempt ended/);
  assert.equal(
    database.prepare("SELECT status FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
      .get(finalLesson.enrollment_id, finalLesson.lesson_id).status,
    "expired"
  );
  assert.equal(
    database.prepare("SELECT score FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
      .get(finalLesson.enrollment_id, gradeItem.id).score,
    0
  );
  const history = database.prepare(`
    SELECT score, correct_answers FROM quiz_attempt_history
    WHERE enrollment_id = ? AND lesson_id = ? ORDER BY attempt_number DESC LIMIT 1
  `).get(finalLesson.enrollment_id, finalLesson.lesson_id);
  assert.deepEqual({ ...history }, { score: 0, correct_answers: 0 });
});

test("assessment reopening preserves prior records until the selected student starts and submits", async () => {
  const finalLesson = database.prepare(`
    SELECT c.id AS course_id, l.id AS lesson_id, l.title, l.content, l.grade_item_id
    FROM courses c
    JOIN modules m ON m.course_id = c.id
    JOIN lessons l ON l.module_id = m.id
    WHERE c.slug = 'anatomy-and-physiology'
      AND l.title = '[PN104 2026] Quiz: Final Examination'
    LIMIT 1
  `).get();
  assert.ok(finalLesson);
  const gradeItem = database.prepare("SELECT * FROM grade_items WHERE course_id = ? AND title = ? LIMIT 1")
    .get(finalLesson.course_id, finalLesson.title);
  assert.ok(gradeItem);
  database.prepare("UPDATE lessons SET grade_item_id = ? WHERE id = ?").run(gradeItem.id, finalLesson.lesson_id);

  const enrollments = database.prepare(`
    SELECT e.id, u.email
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    WHERE e.course_id = ? AND e.status IN ('active', 'completed') AND e.withdrawn_at IS NULL
    ORDER BY CASE WHEN u.email = 'student@browardmiamihi.com' THEN 0 ELSE 1 END, e.id
    LIMIT 2
  `).all(finalLesson.course_id);
  assert.equal(enrollments.length, 2, "Expected two PN 104 enrollments for isolation testing");
  const [selected, control] = enrollments;

  for (const enrollment of enrollments) {
    database.prepare("DELETE FROM assessment_reopen_audit WHERE enrollment_id = ? AND lesson_id = ?")
      .run(enrollment.id, finalLesson.lesson_id);
    database.prepare("DELETE FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?")
      .run(enrollment.id, finalLesson.lesson_id);
    database.prepare("DELETE FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
      .run(enrollment.id, finalLesson.lesson_id);
    database.prepare("DELETE FROM quiz_attempt_history WHERE enrollment_id = ? AND lesson_id = ?")
      .run(enrollment.id, finalLesson.lesson_id);
    database.prepare("DELETE FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
      .run(enrollment.id, gradeItem.id);
    database.prepare("DELETE FROM lesson_completions WHERE enrollment_id = ? AND lesson_id = ?")
      .run(enrollment.id, finalLesson.lesson_id);
  }

  const now = Date.now();
  const seedPriorState = (enrollmentId, score, note) => {
    database.prepare("INSERT INTO grades (enrollment_id, grade_item_id, score, note) VALUES (?, ?, ?, ?)")
      .run(enrollmentId, gradeItem.id, score, note);
    database.prepare(`
      INSERT INTO exam_attempts (enrollment_id, lesson_id, started_at, expires_at, submitted_at, status)
      VALUES (?, ?, ?, ?, ?, 'submitted')
    `).run(
      enrollmentId,
      finalLesson.lesson_id,
      new Date(now - 7_200_000).toISOString(),
      new Date(now - 3_600_000).toISOString(),
      new Date(now - 3_600_000).toISOString()
    );
    database.prepare("INSERT INTO lesson_completions (enrollment_id, lesson_id) VALUES (?, ?)")
      .run(enrollmentId, finalLesson.lesson_id);
  };
  seedPriorState(selected.id, 88, "Selected prior final");
  seedPriorState(control.id, 72, "Control prior final");

  const closesOn = new Date(Date.now() + (14 * 86_400_000)).toISOString().slice(0, 10);
  const reopenResponse = await fetch(`${baseUrl}/admin/courses/${finalLesson.course_id}/assessment-access`, {
    body: new URLSearchParams({
      enrollmentId: String(selected.id),
      lessonId: String(finalLesson.lesson_id),
      closesOn,
      reason: "Targeted regression test"
    }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: adminCookie
    },
    method: "POST",
    redirect: "manual"
  });
  assert.ok([302, 303].includes(reopenResponse.status));

  const preservedGrade = database.prepare("SELECT score, note FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
    .get(selected.id, gradeItem.id);
  assert.deepEqual({ ...preservedGrade }, { score: 88, note: "Selected prior final" });
  const preservedAttempt = database.prepare(`
    SELECT status, submitted_at FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
  `).get(selected.id, finalLesson.lesson_id);
  assert.equal(preservedAttempt.status, "submitted");
  assert.ok(preservedAttempt.submitted_at);
  assert.ok(
    database.prepare("SELECT id FROM lesson_completions WHERE enrollment_id = ? AND lesson_id = ?")
      .get(selected.id, finalLesson.lesson_id),
    "Expected reopening itself to preserve the existing completion"
  );
  const audit = database.prepare(`
    SELECT previous_score, previous_note, previous_attempt_status, reason
    FROM assessment_reopen_audit
    WHERE enrollment_id = ? AND lesson_id = ?
  `).get(selected.id, finalLesson.lesson_id);
  assert.deepEqual({ ...audit }, {
    previous_score: 88,
    previous_note: "Selected prior final",
    previous_attempt_status: "submitted",
    reason: "Targeted regression test"
  });
  const override = database.prepare(`
    SELECT reason FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
  `).get(selected.id, finalLesson.lesson_id);
  assert.equal(override.reason, "Targeted regression test");

  const controlGrade = database.prepare("SELECT score, note FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
    .get(control.id, gradeItem.id);
  assert.deepEqual({ ...controlGrade }, { score: 72, note: "Control prior final" });
  assert.equal(
    database.prepare("SELECT status FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
      .get(control.id, finalLesson.lesson_id).status,
    "submitted"
  );
  assert.ok(
    database.prepare("SELECT id FROM lesson_completions WHERE enrollment_id = ? AND lesson_id = ?")
      .get(control.id, finalLesson.lesson_id)
  );
  assert.equal(
    database.prepare("SELECT * FROM assessment_reopen_audit WHERE enrollment_id = ? AND lesson_id = ?")
      .get(control.id, finalLesson.lesson_id),
    undefined
  );
  assert.equal(
    database.prepare("SELECT * FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?")
      .get(control.id, finalLesson.lesson_id),
    undefined
  );

  const reopenedPage = await fetch(
    `${baseUrl}/student/enrollments/${selected.id}?lesson=${finalLesson.lesson_id}`,
    { headers: { cookie: studentCookie } }
  );
  assert.equal(reopenedPage.status, 200);
  assert.match(await reopenedPage.text(), />Start Now</, "Expected the selected student to see the fresh exam start action");

  const startResponse = await fetch(`${baseUrl}/student/enrollments/${selected.id}/exams/${finalLesson.lesson_id}/start`, {
    headers: { cookie: studentCookie },
    method: "POST",
    redirect: "manual"
  });
  assert.ok([302, 303].includes(startResponse.status));
  const freshAttempt = database.prepare(`
    SELECT status, submitted_at FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
  `).get(selected.id, finalLesson.lesson_id);
  assert.equal(freshAttempt.status, "in_progress");
  assert.equal(freshAttempt.submitted_at, null);
  assert.deepEqual(
    {
      ...database.prepare("SELECT score, note FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
        .get(selected.id, gradeItem.id)
    },
    { score: 88, note: "Selected prior final" },
    "Expected starting the reopened exam to preserve the prior score until submission"
  );

  const finalAttempt = quizAnswers({ ...finalLesson, enrollment_id: selected.id }, { correct: true });
  const submitResponse = await submitQuiz(
    { ...finalLesson, enrollment_id: selected.id },
    finalAttempt.answers
  );
  assert.ok([302, 303].includes(submitResponse.status));
  const replacedGrade = database.prepare("SELECT score, note FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
    .get(selected.id, gradeItem.id);
  assert.equal(replacedGrade.score, Number(gradeItem.points_possible));
  assert.match(replacedGrade.note, /^Auto-graded:/);
  assert.equal(
    database.prepare("SELECT status FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
      .get(selected.id, finalLesson.lesson_id).status,
    "submitted"
  );
  assert.ok(
    database.prepare("SELECT id FROM lesson_completions WHERE enrollment_id = ? AND lesson_id = ?")
      .get(selected.id, finalLesson.lesson_id)
  );

  const secondReopenResponse = await fetch(`${baseUrl}/admin/courses/${finalLesson.course_id}/assessment-access`, {
    body: new URLSearchParams({
      enrollmentId: String(selected.id),
      lessonId: String(finalLesson.lesson_id),
      closesOn,
      reason: "Second targeted reopen"
    }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: adminCookie
    },
    method: "POST",
    redirect: "manual"
  });
  assert.ok([302, 303].includes(secondReopenResponse.status));
  assert.equal(
    database.prepare("SELECT access_override_id FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
      .get(selected.id, finalLesson.lesson_id).access_override_id,
    null,
    "Expected another reopen to invalidate the used attempt generation"
  );
  const secondReopenedPage = await fetch(
    `${baseUrl}/student/enrollments/${selected.id}?lesson=${finalLesson.lesson_id}`,
    { headers: { cookie: studentCookie } }
  );
  assert.match(await secondReopenedPage.text(), />Start Now</, "Expected a second instructor reopen to allow one new sitting");

  const untouchedControlGrade = database.prepare("SELECT score, note FROM grades WHERE enrollment_id = ? AND grade_item_id = ?")
    .get(control.id, gradeItem.id);
  assert.deepEqual({ ...untouchedControlGrade }, { score: 72, note: "Control prior final" });
  assert.equal(
    database.prepare("SELECT status FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?")
      .get(control.id, finalLesson.lesson_id).status,
    "submitted"
  );
});

test("students see and can clear an unread assignment-grade notification", async () => {
  const student = database.prepare("SELECT id FROM users WHERE email = 'student@browardmiamihi.com'").get();
  const instructor = database.prepare("SELECT id FROM users WHERE email = 'instructor@browardmiamihi.com'").get();
  const result = database.prepare(`
    INSERT INTO messages (sender_id, recipient_id, subject, body)
    VALUES (?, ?, 'Assignment graded: Clinical Reflection', 'Your work was graded.')
  `).run(instructor.id, student.id);
  database.prepare("UPDATE messages SET thread_id = ? WHERE id = ?").run(result.lastInsertRowid, result.lastInsertRowid);

  for (const route of ["/student", "/student/dashboard"]) {
    const response = await fetch(`${baseUrl}${route}`, { headers: { cookie: studentCookie } });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /An assignment has been graded/);
    assert.match(html, /Clinical Reflection/);
    assert.match(html, new RegExp(`/student/email\\?threadId=${result.lastInsertRowid}`));
  }

  const inbox = await fetch(`${baseUrl}/student/email?threadId=${result.lastInsertRowid}`, { headers: { cookie: studentCookie } });
  assert.equal(inbox.status, 200);
  const dashboard = await fetch(`${baseUrl}/student/dashboard`, { headers: { cookie: studentCookie } });
  assert.doesNotMatch(await dashboard.text(), /An assignment has been graded/);
});
