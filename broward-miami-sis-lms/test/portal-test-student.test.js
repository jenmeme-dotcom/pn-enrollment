const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");

const projectRoot = path.resolve(__dirname, "..");
const testEmail = "teststudent@browardmiamihi.com";
const testPassword = "BMHITestStudent2026!";

let serverProcess;
let database;
let temporaryDirectory;
let databaseFile;
let baseUrl;

function seed() {
  const result = spawnSync(process.execPath, ["--no-warnings", "src/seed.js"], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, DATABASE_FILE: databaseFile }
  });
  assert.equal(result.status, 0, result.stderr);
}

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

function startServer(port) {
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
        SESSION_SECRET: "portal-test-student-secret",
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

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-portal-test-student-"));
  fs.mkdirSync(path.join(temporaryDirectory, "uploads"), { recursive: true });
  databaseFile = path.join(temporaryDirectory, "portal-test.sqlite");
  seed();
  seed();
  database = new DatabaseSync(databaseFile);
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port);
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

test("the portal test student stays outside cohorts and has one enrollment in every published course", () => {
  const student = database.prepare(`
    SELECT role, first_name, last_name, email, password_hash, status,
      organization_status, cohort_name, cohort_start_date, cohort_end_date,
      gradebook_hidden
    FROM users WHERE email = ?
  `).get(testEmail);
  assert.ok(student);
  assert.equal(student.role, "student");
  assert.equal(`${student.first_name} ${student.last_name}`, "Portal Test Student");
  assert.equal(student.status, "active");
  assert.equal(student.organization_status, "organized");
  assert.equal(student.cohort_name, null);
  assert.equal(student.cohort_start_date, null);
  assert.equal(student.cohort_end_date, null);
  assert.equal(student.gradebook_hidden, 1);
  assert.equal(bcrypt.compareSync(testPassword, student.password_hash), true);

  const rows = database.prepare(`
    SELECT courses.id, courses.title, COUNT(enrollments.id) AS enrollment_count,
      SUM(CASE WHEN enrollments.status = 'active' AND enrollments.withdrawn_at IS NULL THEN 1 ELSE 0 END) AS active_count
    FROM courses
    LEFT JOIN enrollments
      ON enrollments.course_id = courses.id
      AND enrollments.user_id = (SELECT id FROM users WHERE email = ?)
    WHERE courses.published = 1
    GROUP BY courses.id
    ORDER BY courses.id
  `).all(testEmail);
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.equal(row.enrollment_count, 1, `${row.title} should have one QA enrollment`);
    assert.equal(row.active_count, 1, `${row.title} should have one active QA enrollment`);
  }
});

test("the portal test credentials sign in directly to the student portal", async () => {
  const response = await fetch(`${baseUrl}/login`, {
    body: new URLSearchParams({ email: testEmail, password: testPassword, loginRole: "student" }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    redirect: "manual"
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/student");
  const setCookie = response.headers.getSetCookie?.()[0] || response.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";", 1)[0];
  assert.match(cookie, /^bmhi\.sid=/);

  const portal = await fetch(`${baseUrl}/student`, { headers: { cookie }, redirect: "manual" });
  assert.equal(portal.status, 200);
  const html = await portal.text();
  assert.match(html, /Portal Test Student/);
  assert.doesNotMatch(html, /photo-required/i);
});

test("the QA account is excluded from operations cohort totals and roster", async () => {
  const login = await fetch(`${baseUrl}/login`, {
    body: new URLSearchParams({ email: "admin@browardmiamihi.com", password: "AdminPass123!", loginRole: "faculty" }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    redirect: "manual"
  });
  const cookie = (login.headers.getSetCookie?.()[0] || login.headers.get("set-cookie") || "").split(";", 1)[0];
  const dashboard = await fetch(`${baseUrl}/admin`, { headers: { cookie } });
  assert.equal(dashboard.status, 200);
  const html = await dashboard.text();
  const expectedStudents = database.prepare(`
    SELECT COUNT(*) AS count FROM users
    WHERE role = 'student' AND lower(email) <> ?
  `).get(testEmail).count;
  const expectedActiveEnrollments = database.prepare(`
    SELECT COUNT(*) AS count
    FROM enrollments JOIN users ON users.id = enrollments.user_id
    WHERE enrollments.status = 'active' AND lower(users.email) <> ?
  `).get(testEmail).count;
  assert.match(html, new RegExp(`Students · All cohorts<\\/span>\\s*<strong>${expectedStudents}<\\/strong>`));
  assert.match(html, new RegExp(`Active enrollments<\\/span>\\s*<strong>${expectedActiveEnrollments}<\\/strong>`));
  assert.doesNotMatch(html, /Portal Test Student/);
  assert.doesNotMatch(html, /teststudent@browardmiamihi\.com/);
});

test("PN106 students can submit chapter cases while answer guides remain instructor-only", async () => {
  const studentLogin = await fetch(`${baseUrl}/login`, {
    body: new URLSearchParams({ email: testEmail, password: testPassword, loginRole: "student" }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    redirect: "manual"
  });
  const studentCookie = (studentLogin.headers.getSetCookie?.()[0] || studentLogin.headers.get("set-cookie") || "").split(";", 1)[0];
  const course = database.prepare("SELECT id FROM courses WHERE slug = 'introductory-clinical-pharmacology-pn106'").get();
  const enrollment = database.prepare(`
    SELECT enrollments.id
    FROM enrollments JOIN users ON users.id = enrollments.user_id
    WHERE users.email = ? AND enrollments.course_id = ?
  `).get(testEmail, course.id);
  const caseLesson = database.prepare(`
    SELECT lessons.id, lessons.grade_item_id
    FROM lessons JOIN modules ON modules.id = lessons.module_id
    WHERE modules.course_id = ? AND lessons.title LIKE 'Chapter 1 Case Study:%'
  `).get(course.id);
  const guideLesson = database.prepare(`
    SELECT lessons.id
    FROM lessons JOIN modules ON modules.id = lessons.module_id
    WHERE modules.course_id = ? AND lessons.title LIKE 'Chapter 1 Instructor Answer Guide:%'
  `).get(course.id);

  const studentModules = await fetch(`${baseUrl}/student/enrollments/${enrollment.id}?view=modules`, {
    headers: { cookie: studentCookie }
  });
  assert.equal(studentModules.status, 200);
  const studentModulesHtml = await studentModules.text();
  assert.match(studentModulesHtml, /Chapter 1 Case Study: General Principles of Pharmacology/);
  assert.doesNotMatch(studentModulesHtml, /Instructor Answer Guide/);
  const guessedGuidePage = await fetch(`${baseUrl}/student/enrollments/${enrollment.id}?lesson=${guideLesson.id}`, {
    headers: { cookie: studentCookie }
  });
  assert.equal(guessedGuidePage.status, 200);
  const guessedGuideHtml = await guessedGuidePage.text();
  assert.doesNotMatch(guessedGuideHtml, /Instructor-only material/);
  assert.doesNotMatch(guessedGuideHtml, /Expected response elements/);

  const casePage = await fetch(`${baseUrl}/student/enrollments/${enrollment.id}?assignment=${caseLesson.grade_item_id}`, {
    headers: { cookie: studentCookie }
  });
  assert.equal(casePage.status, 200);
  const caseHtml = await casePage.text();
  assert.match(caseHtml, /name="studentResponse"/);
  assert.match(caseHtml, /Original BMHI Case Study/);
  assert.doesNotMatch(caseHtml, /Expected response elements/);

  const responseText = "Test response identifying priority cues, medication risks, nursing monitoring, patient teaching, and evaluation.";
  const responseForm = new FormData();
  responseForm.set("studentResponse", responseText);
  const submission = await fetch(`${baseUrl}/student/enrollments/${enrollment.id}/assignments/${caseLesson.grade_item_id}/submit`, {
    body: responseForm,
    headers: { cookie: studentCookie },
    method: "POST",
    redirect: "manual"
  });
  assert.equal(submission.status, 302);
  assert.equal(
    database.prepare("SELECT student_note FROM assignment_submissions WHERE enrollment_id = ? AND grade_item_id = ?")
      .get(enrollment.id, caseLesson.grade_item_id).student_note,
    responseText
  );

  const instructorLogin = await fetch(`${baseUrl}/login`, {
    body: new URLSearchParams({ email: "instructor@browardmiamihi.com", password: "InstructorPass123!", loginRole: "faculty" }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    redirect: "manual"
  });
  const instructorCookie = (instructorLogin.headers.getSetCookie?.()[0] || instructorLogin.headers.get("set-cookie") || "").split(";", 1)[0];
  const instructorModules = await fetch(`${baseUrl}/admin/courses/${course.id}/student-view?view=modules&mode=edit`, {
    headers: { cookie: instructorCookie }
  });
  assert.equal(instructorModules.status, 200);
  assert.match(await instructorModules.text(), /Chapter 1 Instructor Answer Guide: General Principles of Pharmacology/);
  const guidePage = await fetch(`${baseUrl}/admin/courses/${course.id}/student-view?lesson=${guideLesson.id}&mode=edit`, {
    headers: { cookie: instructorCookie }
  });
  assert.equal(guidePage.status, 200);
  const guideHtml = await guidePage.text();
  assert.match(guideHtml, /Instructor-only material/);
  assert.match(guideHtml, /Expected response elements/);
});

test("PN107 Lab gives every skill its own student upload target while staff previews stay read-only", async () => {
  const course = database.prepare(`
    SELECT id FROM courses WHERE slug = 'medical-surgical-nursing-i-pn107-lab'
  `).get();
  assert.ok(course);
  const enrollment = database.prepare(`
    SELECT enrollments.id
    FROM enrollments JOIN users ON users.id = enrollments.user_id
    WHERE users.email = ? AND enrollments.course_id = ?
      AND enrollments.status = 'active' AND enrollments.withdrawn_at IS NULL
  `).get(testEmail, course.id);
  assert.ok(enrollment);

  const skillAssignments = database.prepare(`
    SELECT lessons.id AS lesson_id, lessons.title, lessons.grade_item_id,
      lessons.published, lessons.instructor_only, modules.published AS module_published
    FROM lessons
    JOIN modules ON modules.id = lessons.module_id
    WHERE modules.course_id = ? AND lessons.title LIKE 'Week % Skill Check %'
    ORDER BY modules.position, lessons.position, lessons.id
  `).all(course.id);
  assert.equal(skillAssignments.length, 49);
  assert.equal(
    new Set(skillAssignments.map((assignment) => assignment.grade_item_id)).size,
    skillAssignments.length,
    "Each skill checklist must have a separate grade item and submission target"
  );
  for (const assignment of skillAssignments) {
    assert.ok(assignment.grade_item_id, `${assignment.title} should have a grade item`);
    assert.equal(assignment.published, 1, assignment.title);
    assert.equal(assignment.instructor_only, 0, assignment.title);
    assert.equal(assignment.module_published, 1, assignment.title);
  }

  const login = async (email, password, loginRole) => {
    const response = await fetch(`${baseUrl}/login`, {
      body: new URLSearchParams({ email, password, loginRole }),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
      redirect: "manual"
    });
    assert.equal(response.status, 302);
    return (response.headers.getSetCookie?.()[0] || response.headers.get("set-cookie") || "").split(";", 1)[0];
  };
  const studentCookie = await login(testEmail, testPassword, "student");
  const selectedSkills = skillAssignments.slice(0, 2);
  const savedSubmissions = [];

  for (const [index, assignment] of selectedSkills.entries()) {
    const detail = await fetch(
      `${baseUrl}/student/enrollments/${enrollment.id}?assignment=${assignment.grade_item_id}`,
      { headers: { cookie: studentCookie } }
    );
    assert.equal(detail.status, 200);
    const html = await detail.text();
    const expectedAction = `/student/enrollments/${enrollment.id}/assignments/${assignment.grade_item_id}/submit`;
    assert.match(html, new RegExp(`action="${expectedAction}"`));
    assert.match(html, /name="assignmentFile"/);
    assert.match(html, /type="submit">Submit Assignment<\/button>/);

    const attachmentText = `PN107 Lab checklist evidence ${index + 1}: ${assignment.title}`;
    const form = new FormData();
    form.set("studentResponse", `Student preparation note for ${assignment.title}.`);
    form.set(
      "assignmentFile",
      new Blob([attachmentText], { type: "text/plain" }),
      `pn107-skill-${index + 1}-checklist.txt`
    );
    const submitted = await fetch(`${baseUrl}${expectedAction}`, {
      body: form,
      headers: { cookie: studentCookie },
      method: "POST",
      redirect: "manual"
    });
    assert.equal(submitted.status, 302);
    assert.equal(
      submitted.headers.get("location"),
      `/student/enrollments/${enrollment.id}?assignment=${assignment.grade_item_id}`
    );

    const saved = database.prepare(`
      SELECT id, grade_item_id, file_storage_name, file_original_name, file_mime_type,
        file_size, student_note
      FROM assignment_submissions
      WHERE enrollment_id = ? AND grade_item_id = ?
    `).get(enrollment.id, assignment.grade_item_id);
    assert.ok(saved);
    assert.equal(saved.file_original_name, `pn107-skill-${index + 1}-checklist.txt`);
    assert.equal(saved.file_mime_type, "text/plain");
    assert.ok(saved.file_size > 0);
    assert.equal(saved.student_note, `Student preparation note for ${assignment.title}.`);
    savedSubmissions.push(saved);

    const download = await fetch(`${baseUrl}/student/assignment-submissions/${saved.id}/file`, {
      headers: { cookie: studentCookie }
    });
    assert.equal(download.status, 200);
    assert.equal(await download.text(), attachmentText);
  }

  assert.equal(savedSubmissions.length, 2);
  assert.equal(new Set(savedSubmissions.map((row) => row.grade_item_id)).size, 2);
  assert.equal(new Set(savedSubmissions.map((row) => row.file_storage_name)).size, 2);

  const staffAccounts = [
    { email: "instructor@browardmiamihi.com", password: "InstructorPass123!" },
    { email: "admin@browardmiamihi.com", password: "AdminPass123!" }
  ];
  for (const staff of staffAccounts) {
    const cookie = await login(staff.email, staff.password, "faculty");
    const assignment = selectedSkills[0];
    const preview = await fetch(
      `${baseUrl}/admin/courses/${course.id}/student-view?assignment=${assignment.grade_item_id}`,
      { headers: { cookie } }
    );
    assert.equal(preview.status, 200);
    const previewHtml = await preview.text();
    assert.match(previewHtml, /Instructor preview/);
    assert.match(previewHtml, /<input type="file" disabled>/);
    assert.match(previewHtml, /<button class="button" type="button" disabled>Submit Assignment<\/button>/);
    assert.doesNotMatch(
      previewHtml,
      new RegExp(`action="/student/enrollments/[^"]+/assignments/${assignment.grade_item_id}/submit"`)
    );

    const prohibitedSubmission = await fetch(
      `${baseUrl}/student/enrollments/${enrollment.id}/assignments/${assignment.grade_item_id}/submit`,
      {
        body: new URLSearchParams({ studentResponse: "Staff must not submit student work." }),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie
        },
        method: "POST",
        redirect: "manual"
      }
    );
    assert.equal(prohibitedSubmission.status, 403);
  }
});
