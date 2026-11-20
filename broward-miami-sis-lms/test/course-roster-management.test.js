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
let studentCookie;
let course;
let seededStudentEnrollment;
let rosterStudentId;

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
        SESSION_SECRET: "course-roster-management-test-secret",
        UPLOAD_DIR: path.join(temporaryDirectory, "uploads")
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

async function get(route, cookie) {
  return fetch(`${baseUrl}${route}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual"
  });
}

async function post(route, fields, cookie) {
  return fetch(`${baseUrl}${route}`, {
    body: new URLSearchParams(fields),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie
    },
    method: "POST",
    redirect: "manual"
  });
}

function extractRemovalFields(html, enrollmentId) {
  const pattern = new RegExp(`<form[^>]+action="/admin/courses/${course.id}/roster/${enrollmentId}/remove"[^>]*>([\\s\\S]*?)<\\/form>`);
  const form = html.match(pattern)?.[1] || "";
  assert.ok(form, "Expected the roster removal form for the enrolled student");
  const csrfToken = form.match(/name="csrfToken" value="([a-f0-9]{64})"/)?.[1];
  const expectedStatus = form.match(/name="expectedStatus" value="([^"]+)"/)?.[1];
  assert.ok(csrfToken, "Expected a roster CSRF token");
  assert.ok(expectedStatus, "Expected the enrollment status guard");
  return { csrfToken, expectedStatus };
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-course-roster-"));
  fs.mkdirSync(path.join(temporaryDirectory, "uploads"), { recursive: true });
  const databaseFile = path.join(temporaryDirectory, "roster.sqlite");
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile);

  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

  const seededStudent = database.prepare("SELECT id, password_hash FROM users WHERE email = 'student@browardmiamihi.com'").get();
  assert.ok(seededStudent);
  seededStudentEnrollment = database.prepare(`
    SELECT e.id, e.course_id
    FROM enrollments e
    WHERE e.user_id = ? AND e.status != 'withdrawn' AND e.withdrawn_at IS NULL
    ORDER BY e.id
    LIMIT 1
  `).get(seededStudent.id);
  assert.ok(seededStudentEnrollment, "Expected the seeded student to have a current course");
  course = database.prepare("SELECT * FROM courses WHERE id = ?").get(seededStudentEnrollment.course_id);
  assert.ok(course);

  const studentPhoto = "course-roster-student.png";
  fs.writeFileSync(
    path.join(temporaryDirectory, "uploads", studentPhoto),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  );
  database.prepare(`
    UPDATE users
    SET organization_status = 'organized', photo_review_status = 'approved',
      photo_storage_name = ?, photo_original_name = ?
    WHERE id = ?
  `).run(studentPhoto, studentPhoto, seededStudent.id);

  const created = database.prepare(`
    INSERT INTO users (
      role, student_number, first_name, last_name, email, password_hash,
      status, organization_status, photo_review_status, cohort_name
    ) VALUES ('student', 'ROSTER-001', 'Roster', 'Workflow', 'roster.workflow@example.test', ?,
      'active', 'organized', 'approved', 'Test Cohort')
  `).run(seededStudent.password_hash);
  rosterStudentId = Number(created.lastInsertRowid);

  adminCookie = await login("admin@browardmiamihi.com", "AdminPass123!", "faculty");
  instructorCookie = await login("instructor@browardmiamihi.com", "InstructorPass123!", "faculty");
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

test("staff can find the dedicated Course Roster and View as Student controls while students cannot", async () => {
  for (const cookie of [adminCookie, instructorCookie]) {
    let response = await get(`/admin/courses/${course.id}/student-view`, cookie);
    let html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, new RegExp(`href="/admin/courses/${course.id}/roster"[^>]*>Course Roster</a>`));

    response = await get(`/admin/courses/${course.id}/student-view?mode=edit`, cookie);
    html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, />View as Student</);

    response = await get(`/admin/courses/${course.id}/roster`, cookie);
    html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, />Course Roster</);
    assert.match(html, />View as Student</);
    assert.match(html, new RegExp(`action="/admin/enrollments"`));
    assert.match(html, new RegExp(`href="/admin/courses/${course.id}/roster.csv"`));
    assert.match(html, new RegExp(`href="/admin/courses/${course.id}/attendance-sheet.csv"`));

    response = await get(`/admin/courses/${course.id}/manage`, cookie);
    html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, />Remove from Course</);
    assert.match(html, new RegExp(`action="/admin/courses/${course.id}/roster/${seededStudentEnrollment.id}/remove"`));
    assert.match(html, /name="returnTo" value="manage"/);
  }

  let response = await get(`/student/enrollments/${seededStudentEnrollment.id}`, studentCookie);
  const studentHtml = await response.text();
  assert.equal(response.status, 200);
  assert.doesNotMatch(studentHtml, new RegExp(`/admin/courses/${course.id}/roster`));

  response = await get(`/admin/courses/${course.id}/roster`, studentCookie);
  assert.equal(response.status, 403);
  response = await get(`/admin/courses/${course.id}/roster.csv`, studentCookie);
  assert.equal(response.status, 403);
  response = await get(`/admin/courses/${course.id}/attendance-sheet.csv`, studentCookie);
  assert.equal(response.status, 403);
  response = await get(`/admin/courses/${course.id}/manage`, studentCookie);
  assert.equal(response.status, 403);
});

test("course roster and attendance downloads contain the current class list", async () => {
  let response = await get(`/admin/courses/${course.id}/roster.csv`, adminCookie);
  let csv = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^text\/csv/i);
  assert.match(response.headers.get("content-disposition") || "", /^attachment;/i);
  assert.match(csv, /Student Name,?"?/);
  assert.match(csv, /student@browardmiamihi\.com/i);

  response = await get(`/admin/courses/${course.id}/attendance-sheet.csv`, instructorCookie);
  csv = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^text\/csv/i);
  assert.match(csv, /Present/);
  assert.match(csv, /Absent/);
  assert.match(csv, /Time In/);
  assert.match(csv, /Instructor Initials/);
  assert.match(csv, /Student, Demo/i);
});

test("add, remove, and re-add preserve academic history and create audit records", async () => {
  let response = await post("/admin/enrollments", {
    userId: String(rosterStudentId),
    courseId: String(course.id),
    returnTo: "roster"
  }, adminCookie);
  assert.ok([302, 303].includes(response.status));
  assert.equal(response.headers.get("location"), `/admin/courses/${course.id}/roster`);

  let currentEnrollment = database.prepare(`
    SELECT * FROM enrollments
    WHERE user_id = ? AND course_id = ? AND status != 'withdrawn' AND withdrawn_at IS NULL
    ORDER BY id DESC LIMIT 1
  `).get(rosterStudentId, course.id);
  assert.ok(currentEnrollment);
  assert.equal(currentEnrollment.source, "manual");

  response = await post("/admin/enrollments", {
    userId: String(rosterStudentId),
    courseId: String(course.id),
    returnTo: "roster"
  }, instructorCookie);
  assert.ok([302, 303].includes(response.status));
  assert.equal(database.prepare(`
    SELECT COUNT(*) AS count FROM enrollments
    WHERE user_id = ? AND course_id = ? AND status != 'withdrawn' AND withdrawn_at IS NULL
  `).get(rosterStudentId, course.id).count, 1);

  const gradeItemId = Number(database.prepare(`
    INSERT INTO grade_items (course_id, title, points_possible)
    VALUES (?, 'Roster preservation test', 25)
  `).run(course.id).lastInsertRowid);
  database.prepare(`
    INSERT INTO grades (enrollment_id, grade_item_id, score, note)
    VALUES (?, ?, 23, 'Must survive course removal')
  `).run(currentEnrollment.id, gradeItemId);

  response = await get(`/admin/courses/${course.id}/manage`, instructorCookie);
  const rosterHtml = await response.text();
  assert.equal(response.status, 200);
  assert.match(rosterHtml, /roster\.workflow@example\.test/);
  assert.match(rosterHtml, />Remove from Course</);
  const removalFields = extractRemovalFields(rosterHtml, currentEnrollment.id);

  response = await post(`/admin/courses/${course.id}/roster/${currentEnrollment.id}/remove`, {
    ...removalFields,
    returnTo: "manage",
    reason: "Moved out of this course section",
    confirmed: "1"
  }, instructorCookie);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), `/admin/courses/${course.id}/manage#course-roster`);

  const removed = database.prepare("SELECT * FROM enrollments WHERE id = ?").get(currentEnrollment.id);
  assert.equal(removed.status, "withdrawn");
  assert.equal(removed.withdrawal_reason, "Moved out of this course section");
  assert.ok(removed.withdrawn_at);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM grades WHERE enrollment_id = ? AND grade_item_id = ?").get(currentEnrollment.id, gradeItemId).count, 1);

  const event = database.prepare(`
    SELECT * FROM student_withdrawal_events
    WHERE enrollment_id = ? AND course_id = ? AND scope = 'course'
  `).get(currentEnrollment.id, course.id);
  assert.ok(event);
  assert.equal(event.student_id, rosterStudentId);
  assert.equal(event.previous_enrollment_status, "active");
  assert.equal(event.reason, "Moved out of this course section");

  const removalAudit = database.prepare(`
    SELECT * FROM system_activity_log
    WHERE action = 'course_roster_remove' AND target_user_id = ? AND entity_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(rosterStudentId, String(currentEnrollment.id));
  assert.ok(removalAudit);
  assert.equal(removalAudit.actor_user_id, database.prepare("SELECT id FROM users WHERE email = 'instructor@browardmiamihi.com'").get().id);

  const afterRemovalPage = await get(`/admin/courses/${course.id}/roster`, adminCookie);
  const afterRemovalHtml = await afterRemovalPage.text();
  const rosterRows = afterRemovalHtml.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || "";
  assert.doesNotMatch(rosterRows, /roster\.workflow@example\.test/);

  response = await post("/admin/enrollments", {
    userId: String(rosterStudentId),
    courseId: String(course.id),
    returnTo: "roster"
  }, adminCookie);
  assert.ok([302, 303].includes(response.status));
  assert.equal(response.headers.get("location"), `/admin/courses/${course.id}/roster`);

  const allEnrollments = database.prepare(`
    SELECT * FROM enrollments WHERE user_id = ? AND course_id = ? ORDER BY id
  `).all(rosterStudentId, course.id);
  assert.equal(allEnrollments.length, 2, "Expected the withdrawn academic record plus a new current enrollment");
  assert.equal(allEnrollments[0].id, currentEnrollment.id);
  assert.equal(allEnrollments[0].status, "withdrawn");
  assert.equal(allEnrollments[1].status, "active");
  assert.equal(allEnrollments[1].withdrawn_at, null);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM grades WHERE enrollment_id = ? AND grade_item_id = ?").get(currentEnrollment.id, gradeItemId).count, 1);

  const addAudits = database.prepare(`
    SELECT * FROM system_activity_log
    WHERE action = 'course_roster_add' AND target_user_id = ?
    ORDER BY id
  `).all(rosterStudentId);
  assert.equal(addAudits.length, 2);
});
