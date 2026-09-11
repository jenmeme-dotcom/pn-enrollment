const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");
const pendingApprovalPrefix = "[AUTO_GRADE_PENDING_APPROVAL]";

let serverProcess;
let database;
let temporaryDirectory;
let baseUrl;
let studentCookie;
let enrollment;

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
        SESSION_SECRET: "student-grade-summary-test-secret"
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

async function getGradesHtml() {
  const route = `/student/enrollments/${enrollment.id}?view=grades`;
  const response = await fetch(`${baseUrl}${route}`, {
    headers: { cookie: studentCookie },
    redirect: "manual"
  });
  const html = await response.text();
  assert.equal(response.status, 200, `Expected ${route} to render successfully.\n${html.slice(0, 800)}`);
  return html;
}

function visibleText(html) {
  return html
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function gradeRow(html, title) {
  const row = [...html.matchAll(/<tr(?:\s[^>]*)?>([\s\S]*?)<\/tr>/g)]
    .find((match) => visibleText(match[0]).includes(title));
  assert.ok(row, `Expected a gradebook row for ${title}`);
  return visibleText(row[0]);
}

function gradeSummaryText(html) {
  const summary = html.match(/<aside class="grades-side-panel">([\s\S]*?)<\/aside>/);
  assert.ok(summary, "Expected the student grade summary panel");
  return visibleText(summary[0]);
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-student-grade-summary-"));
  const databaseFile = path.join(temporaryDirectory, "grades.sqlite");
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

  enrollment = database.prepare(`
    SELECT e.id, e.course_id
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id AND c.published = 1
    WHERE u.email = 'student@browardmiamihi.com'
      AND e.status = 'active'
      AND e.withdrawn_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM modules m
        JOIN lessons l ON l.module_id = m.id
        WHERE m.course_id = c.id
          AND m.published = 1
          AND l.published = 1
          AND l.instructor_only = 0
      )
    ORDER BY e.id
    LIMIT 1
  `).get();
  assert.ok(enrollment, "Expected a seeded active enrollment with visible course content");

  database.prepare("DELETE FROM grades WHERE enrollment_id = ?").run(enrollment.id);
  database.prepare("DELETE FROM grade_items WHERE course_id = ?").run(enrollment.course_id);

  const insertItem = database.prepare(`
    INSERT INTO grade_items (course_id, title, points_possible, due_date)
    VALUES (?, ?, ?, ?)
  `);
  const passingItemId = Number(insertItem.run(enrollment.course_id, "Posted Passing Score", 100, "2026-09-01").lastInsertRowid);
  const zeroItemId = Number(insertItem.run(enrollment.course_id, "Posted Zero Score", 100, "2026-09-02").lastInsertRowid);
  const pendingItemId = Number(insertItem.run(enrollment.course_id, "Pending Written Work", 100, "2026-09-03").lastInsertRowid);
  insertItem.run(enrollment.course_id, "Not Yet Graded", 100, "2026-09-04");

  const insertGrade = database.prepare(`
    INSERT INTO grades (enrollment_id, grade_item_id, score, note)
    VALUES (?, ?, ?, ?)
  `);
  insertGrade.run(enrollment.id, passingItemId, 100, "Posted by instructor.");
  insertGrade.run(enrollment.id, zeroItemId, 0, "Posted by instructor.");
  insertGrade.run(enrollment.id, pendingItemId, 100, `${pendingApprovalPrefix}\nAwaiting instructor approval.`);

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

test("student Grades shows saved posted scores and calculates overall grade from posted work only", async () => {
  const html = await getGradesHtml();

  assert.match(gradeRow(html, "Posted Passing Score"), /100 \/ 100/, "Expected the saved passing score to be visible");
  assert.match(gradeRow(html, "Posted Zero Score"), /0 \/ 100/, "A posted zero is a grade, not an ungraded item");
  assert.match(gradeRow(html, "Pending Written Work"), /pending review.*- \/ 100/i, "Pending approval must not display as posted");
  assert.match(gradeRow(html, "Not Yet Graded"), /- \/ 100/, "An ungraded item must remain unscored");

  const summary = gradeSummaryText(html);
  assert.match(summary, /Total: 100\.00 \/ 200\.00/, "Only the two posted scores should contribute earned and possible points");
  assert.match(summary, /Overall (?:Percentage|Grade)[^%]*50(?:\.0+)?%/i, "Expected zero to count in the 50% overall percentage");
  assert.match(summary, /Letter Grade[^A-F]*F\b/i, "Expected the overall letter grade to be shown");
  assert.doesNotMatch(summary, /100(?:\.0+)?%/, "Pending and ungraded work must not alter the posted-grade calculation");
});

test("student Grades uses an explicit no-grade state instead of assigning F", async () => {
  database.prepare("DELETE FROM grades WHERE enrollment_id = ?").run(enrollment.id);

  const html = await getGradesHtml();
  const summary = gradeSummaryText(html);
  assert.match(summary, /(?:No posted grades|Not yet graded|N\/A)/i, "Expected a clear no-grade state");
  assert.doesNotMatch(summary, /Letter Grade[^A-F]*F\b/i, "No posted grades must not be reported as F");
  assert.doesNotMatch(summary, /Overall (?:Percentage|Grade)[^%]*0(?:\.0+)?%/i, "No posted grades must not be reported as 0%");
});
