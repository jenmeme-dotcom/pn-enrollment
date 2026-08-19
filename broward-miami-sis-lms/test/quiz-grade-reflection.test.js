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
  assert.ok([302, 303].includes(submitResponse.status), "Expected quiz submission to redirect back to the lesson");

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
