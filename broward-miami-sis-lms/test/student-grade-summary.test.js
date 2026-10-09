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
let adminCookie;
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

async function getInstructorGradesHtml() {
  const route = `/admin/courses/${enrollment.course_id}/student-view?view=grades`;
  const response = await fetch(`${baseUrl}${route}`, {
    headers: { cookie: adminCookie },
    redirect: "manual"
  });
  const html = await response.text();
  assert.equal(response.status, 200, `Expected ${route} to render successfully.\n${html.slice(0, 800)}`);
  return html;
}

function assertPrivateNoStore(response, route) {
  const cacheControl = response.headers.get("cache-control") || "";
  assert.match(cacheControl, /(?:^|,)\s*private(?:\s*,|$)/i, `Expected ${route} to be private`);
  assert.match(cacheControl, /(?:^|,)\s*no-store(?:\s*,|$)/i, `Expected ${route} to disable browser storage`);
  assert.match(cacheControl, /(?:^|,)\s*max-age=0(?:\s*,|$)/i, `Expected ${route} to expire immediately`);
  assert.equal(response.headers.get("pragma"), "no-cache", `Expected ${route} to disable legacy caches`);
  assert.equal(response.headers.get("expires"), "0", `Expected ${route} to be immediately expired`);
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
    SELECT e.id, e.course_id, e.user_id
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
  const submittedFileItemId = Number(insertItem.run(enrollment.course_id, "Submitted File Awaiting Grade", 100, "2026-09-04").lastInsertRowid);
  const submittedDiscussionItemId = Number(insertItem.run(enrollment.course_id, "Submitted Discussion Awaiting Grade", 100, "2026-09-05").lastInsertRowid);
  insertItem.run(enrollment.course_id, "Not Yet Graded", 100, "2026-09-06");
  insertItem.run(enrollment.course_id, "Missing Midterm 1", 100, "2026-09-07");
  insertItem.run(enrollment.course_id, "Missing Midterm 2", 100, "2026-09-08");
  insertItem.run(enrollment.course_id, "Missing Final Exam", 100, "2026-09-09");
  insertItem.run(enrollment.course_id, "Ungraded Acknowledgment", 0, "2026-09-09");
  insertItem.run(enrollment.course_id, "Syllabus and Course Orientation Acknowledgment", 100, "2026-09-09");

  const insertGrade = database.prepare(`
    INSERT INTO grades (enrollment_id, grade_item_id, score, note)
    VALUES (?, ?, ?, ?)
  `);
  insertGrade.run(enrollment.id, passingItemId, 100, "Posted by instructor.");
  insertGrade.run(enrollment.id, zeroItemId, 0, "Posted by instructor.");
  insertGrade.run(enrollment.id, pendingItemId, 100, `${pendingApprovalPrefix}\nAwaiting instructor approval.`);
  database.prepare(`
    INSERT INTO assignment_submissions (
      grade_item_id, enrollment_id, file_storage_name, file_original_name,
      file_mime_type, file_size, student_note, submitted_at, updated_at
    ) VALUES (?, ?, 'submitted-test.txt', 'submitted-test.txt', 'text/plain', 12, 'Ready for grading.', ?, ?)
  `).run(submittedFileItemId, enrollment.id, "2026-10-04 12:30:00", "2026-10-04 12:30:00");
  const discussionTopicId = Number(database.prepare(`
    INSERT INTO discussion_topics (course_id, title, prompt, points_possible, status)
    VALUES (?, 'Submitted Discussion Awaiting Grade', 'Test prompt', 100, 'published')
  `).run(enrollment.course_id).lastInsertRowid);
  database.prepare(`
    INSERT INTO discussion_entries (
      topic_id, user_id, author_name, author_email, body, source, posted_at
    ) VALUES (?, ?, 'Demo Student', 'student@browardmiamihi.com', 'Ready for grading.', 'portal', ?)
  `).run(discussionTopicId, enrollment.user_id, "2026-10-04 13:45:00");

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

test("student Grades shows saved posted scores and calculates overall grade from all required work", async () => {
  const html = await getGradesHtml();
  assert.doesNotMatch(html, /Syllabus and Course Orientation Acknowledgment/);

  assert.match(gradeRow(html, "Posted Passing Score"), /100 \/ 100/, "Expected the saved passing score to be visible");
  assert.match(gradeRow(html, "Posted Zero Score"), /0 \/ 100/, "A posted zero is a grade, not an ungraded item");
  assert.match(gradeRow(html, "Pending Written Work"), /pending review.*- \/ 100/i, "Pending approval must not display as posted");
  assert.match(gradeRow(html, "Submitted File Awaiting Grade"), /Oct 4, 2026.*Submitted — awaiting instructor grade.*- \/ 100/i);
  assert.match(gradeRow(html, "Submitted Discussion Awaiting Grade"), /Oct 4, 2026.*Submitted — awaiting instructor grade.*- \/ 100/i);
  assert.match(gradeRow(html, "Not Yet Graded"), /- \/ 100/, "An ungraded item must remain unscored");
  assert.doesNotMatch(gradeRow(html, "Not Yet Graded"), /awaiting instructor grade/i);

  const summary = gradeSummaryText(html);
  assert.match(summary, /Total: 100\.00 \/ 900\.00/, "All nine required items must contribute possible points");
  assert.match(summary, /Overall (?:Percentage|Grade)[^%]*11\.11%/i, "Expected zero to count in the 50% overall percentage");
  assert.match(summary, /Letter Grade[^A-F]*F\b/i, "Expected the overall letter grade to be shown");
  assert.doesNotMatch(summary, /100(?:\.0+)?%/, "Pending scores must not be counted as earned points");

  const instructorHtml = await getInstructorGradesHtml();
  const instructorStudentRow = gradeRow(instructorHtml, "Demo Student");
  assert.match(instructorHtml, /Student Gradebook/);
  assert.doesNotMatch(instructorHtml, /Syllabus and Course Orientation Acknowledgment/);
  assert.doesNotMatch(instructorHtml, /Student Preview/);
  assert.match(instructorStudentRow, /Demo Student 11\.11% F\b/, "Instructor should see the student's current percentage and letter grade");
  assert.match(
    instructorStudentRow,
    /100 0 — pending review Submitted — awaiting instructor grade Submitted — awaiting instructor grade -/,
    "Instructor should distinguish submitted-ungraded work from an item with no submission"
  );
});

test("authenticated student and instructor grade pages cannot be served from browser cache", async () => {
  const routes = [
    {
      cookie: studentCookie,
      path: `/student/enrollments/${enrollment.id}?view=grades`
    },
    {
      cookie: adminCookie,
      path: `/admin/courses/${enrollment.course_id}/student-view?view=grades`
    }
  ];

  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route.path}`, {
      headers: { cookie: route.cookie },
      redirect: "manual"
    });
    assert.equal(response.status, 200, `Expected ${route.path} to render successfully`);
    assertPrivateNoStore(response, route.path);
  }
});

test("an official final grade overrides the calculated letter grade in both grade views", async () => {
  database.prepare("UPDATE enrollments SET final_grade = ?, status = 'completed' WHERE id = ?").run("B+", enrollment.id);

  try {
    const studentHtml = await getGradesHtml();
    const instructorHtml = await getInstructorGradesHtml();
    assert.match(visibleText(studentHtml), /Letter Grade B\+/, "Student should see the official final letter grade");
    assert.match(gradeRow(instructorHtml, "Demo Student"), /Demo Student 11\.11% B\+/, "Instructor should see the official final letter grade");
  } finally {
    database.prepare("UPDATE enrollments SET final_grade = NULL, status = 'active' WHERE id = ?").run(enrollment.id);
  }
});

test("required work with no posted scores contributes zero", async () => {
  database.prepare("DELETE FROM grades WHERE enrollment_id = ?").run(enrollment.id);

  const html = await getGradesHtml();
  const summary = gradeSummaryText(html);
  assert.match(summary, /Total: 0\.00 \/ 900\.00/);
  assert.match(summary, /Letter Grade[^A-F]*F\b/i);
  assert.match(summary, /Overall (?:Percentage|Grade)[^%]*0(?:\.0+)?%/i);

  const instructorHtml = await getInstructorGradesHtml();
  assert.match(gradeRow(instructorHtml, "Demo Student"), /Demo Student 0\.00% F/, "Instructor should see an explicit ungraded state");
});


test("discussion grading validates submissions and publishes score and feedback", async () => {
  const title = "Discussion grading integration test";
  const itemId = Number(database.prepare("INSERT INTO grade_items (course_id, title, points_possible) VALUES (?, ?, 10)").run(enrollment.course_id, title).lastInsertRowid);
  const topicId = Number(database.prepare("INSERT INTO discussion_topics (course_id, title, prompt, points_possible) VALUES (?, ?, 'Explain terminology', 10)").run(enrollment.course_id, title).lastInsertRowid);
  const route = `${baseUrl}/admin/courses/${enrollment.course_id}/discussions/${topicId}/grades`;
  const post = (score, cookie = adminCookie) => fetch(route, {method: "POST", redirect: "manual", headers: {cookie, "content-type": "application/x-www-form-urlencoded"}, body: new URLSearchParams({enrollmentId: enrollment.id, score, note: "Clear explanation."})});
  assert.equal((await post("8")).status, 400, "must have a submission");
  database.prepare("INSERT INTO discussion_entries (topic_id, user_id, author_name, body, source) VALUES (?, ?, 'Demo Student', 'My response', 'portal')").run(topicId, enrollment.user_id);
  for (const score of ["", "11", "-1", "NaN"]) assert.equal((await post(score)).status, 400);
  assert.equal((await post("8", studentCookie)).status, 403);
  const page = await fetch(`${baseUrl}/admin/courses/${enrollment.course_id}/student-view?view=discussions&topicId=${topicId}&mode=edit`, {headers: {cookie: adminCookie}});
  assert.match(await page.text(), /Save discussion grade/);
  assert.equal((await post("8.5")).status, 302);
  assert.deepEqual({...database.prepare("SELECT score, note FROM grades WHERE enrollment_id = ? AND grade_item_id = ?").get(enrollment.id, itemId)}, {score: 8.5, note: "Clear explanation."});
  assert.match(gradeRow(await getGradesHtml(), title), /8.5 \/ 10/);
  database.prepare("DELETE FROM grades WHERE grade_item_id = ?").run(itemId);
  database.prepare("DELETE FROM discussion_entries WHERE topic_id = ?").run(topicId);
  database.prepare("DELETE FROM discussion_topics WHERE id = ?").run(topicId);
  database.prepare("DELETE FROM grade_items WHERE id = ?").run(itemId);
});


test("school-withdrawn students are hidden from course roster and gradebook without deleting records", async () => {
  const student = database.prepare("SELECT * FROM users WHERE id = ?").get(enrollment.user_id);
  database.prepare("UPDATE users SET status = 'withdrawn' WHERE id = ?").run(student.id);
  try {
    const grades = await getInstructorGradesHtml();
    assert.doesNotMatch(grades, new RegExp(`/admin/students/${student.id}/registrar-checklist`));
    const response = await fetch(`${baseUrl}/admin/courses/${enrollment.course_id}/manage`, {headers: {cookie: adminCookie}});
    assert.equal(response.status, 200);
    const roster = (await response.text()).split('id="course-roster"')[1];
    assert.ok(roster);
    assert.doesNotMatch(roster, new RegExp(`/admin/students/${student.id}/registrar-checklist`));
    assert.ok(database.prepare("SELECT id FROM enrollments WHERE id = ?").get(enrollment.id));
    assert.ok(database.prepare("SELECT id FROM users WHERE id = ?").get(student.id));
  } finally { database.prepare("UPDATE users SET status = ? WHERE id = ?").run(student.status, student.id); }
});


test("gradebook hiding preserves student access and saved academic records", async () => {
  const gradeCount = database.prepare("SELECT count(*) n FROM grades WHERE enrollment_id = ?").get(enrollment.id).n;
  database.prepare("UPDATE users SET gradebook_hidden = 1 WHERE id = ?").run(enrollment.user_id);
  try {
    assert.doesNotMatch(await getInstructorGradesHtml(), new RegExp(`/admin/students/${enrollment.user_id}/registrar-checklist`));
    assert.equal((await fetch(`${baseUrl}/student/enrollments/${enrollment.id}?view=grades`, {headers: {cookie: studentCookie}})).status, 200);
    assert.equal(database.prepare("SELECT count(*) n FROM grades WHERE enrollment_id = ?").get(enrollment.id).n, gradeCount);
    assert.equal(database.prepare("SELECT status FROM users WHERE id = ?").get(enrollment.user_id).status, 'active');
  } finally { database.prepare("UPDATE users SET gradebook_hidden = 0 WHERE id = ?").run(enrollment.user_id); }
});
