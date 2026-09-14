const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const { createCourseSyllabusPdfBuffer } = require("../src/syllabusPdf");

const projectRoot = path.resolve(__dirname, "..");

let serverProcess;
let database;
let temporaryDirectory;
let baseUrl;
let adminCookie;
let studentCookie;
let otherStudentEnrollmentId;

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
        SESSION_SECRET: "course-syllabus-pdf-test-secret"
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

async function request(route, cookie = "") {
  return fetch(`${baseUrl}${route}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual"
  });
}

function decodeText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replace(/\s+/g, " ")
    .trim();
}

function assertDownloadLink(html, href, description) {
  const matchingLinks = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].filter((match) => {
    const linkedHref = match[1].match(/\bhref="([^"]+)"/i)?.[1]?.replaceAll("&amp;", "&");
    return linkedHref === href && /(?:^|\s)download(?:\s|=|$)/i.test(match[1]);
  });
  assert.equal(matchingLinks.length, 1, `Expected one immediate-download link for ${description}`);
  assert.equal(decodeText(matchingLinks[0][2]), "Download Syllabus PDF");
}

test("a short syllabus remains one page when page numbers are added", async () => {
  const pdf = await createCourseSyllabusPdfBuffer({
    courseCode: "QA 101",
    courseTitle: "Footer Pagination Check",
    courseDescription: "A short course syllabus used to verify footer placement."
  });
  const pageObjects = pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) || [];
  assert.equal(pageObjects.length, 1, "Footer text must not generate extra blank pages");
});

async function assertPdfResponse(response, description) {
  assert.equal(response.status, 200, `Expected ${description} to download successfully`);
  assert.match(response.headers.get("content-type") || "", /^application\/pdf\b/i);
  assert.match(
    response.headers.get("content-disposition") || "",
    /^attachment; filename="[A-Za-z0-9][A-Za-z0-9._-]*\.pdf"$/,
    "The browser should receive a safe PDF attachment filename"
  );
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");

  const pdf = Buffer.from(await response.arrayBuffer());
  assert.ok(pdf.length > 1_000, `${description} should contain a non-empty syllabus PDF`);
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-", `${description} should begin with a PDF signature`);
  assert.match(pdf.subarray(-1_024).toString("latin1"), /%%EOF\s*$/, `${description} should end as a complete PDF`);
  assert.equal(Number(response.headers.get("content-length")), pdf.length, "Content-Length should match the complete generated file");
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-course-syllabus-pdf-"));
  const databaseFile = path.join(temporaryDirectory, "syllabus.sqlite");
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

  const demoStudent = database.prepare(`
    SELECT id, password_hash
    FROM users
    WHERE email = 'student@browardmiamihi.com'
  `).get();
  const firstCourse = database.prepare("SELECT id FROM courses ORDER BY id LIMIT 1").get();
  assert.ok(demoStudent && firstCourse, "Expected seeded student and course records");

  const otherStudentId = Number(database.prepare(`
    INSERT INTO users (
      role, first_name, last_name, email, password_hash,
      organization_status, photo_review_status, photo_storage_name, photo_original_name
    ) VALUES ('student', 'Other', 'Student', 'other-syllabus-student@example.test', ?, 'organized', 'approved', ?, 'test-student.png')
  `).run(demoStudent.password_hash, photoStorageName).lastInsertRowid);
  otherStudentEnrollmentId = Number(database.prepare(`
    INSERT INTO enrollments (user_id, course_id, status, source, external_order_id)
    VALUES (?, ?, 'active', 'test', 'syllabus-ownership-test')
  `).run(otherStudentId, firstCourse.id).lastInsertRowid);

  adminCookie = await login("admin@browardmiamihi.com", "AdminPass123!", "faculty");
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

test("staff can immediately download a complete syllabus PDF for every seeded course", async (t) => {
  const courses = database.prepare("SELECT id, title, slug FROM courses ORDER BY id").all();
  assert.ok(courses.length > 0, "Expected the seeded course catalog");

  for (const course of courses) {
    await t.test(course.slug, async () => {
      const response = await request(`/admin/courses/${course.id}/syllabus.pdf`, adminCookie);
      await assertPdfResponse(response, course.title);
    });
  }
});

test("every course syllabus view exposes one top-level immediate-download link", async (t) => {
  const courses = database.prepare("SELECT id, title, slug FROM courses ORDER BY id").all();
  for (const course of courses) {
    await t.test(`staff ${course.slug}`, async () => {
      const route = `/admin/courses/${course.id}/student-view?view=syllabus`;
      const response = await request(route, adminCookie);
      const html = await response.text();
      assert.equal(response.status, 200, `Expected ${course.title} staff syllabus view to render`);
      assertDownloadLink(html, `/admin/courses/${course.id}/syllabus.pdf`, `${course.title} staff view`);
    });
  }

  const enrollments = database.prepare(`
    SELECT e.id, c.title, c.slug
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id
    WHERE u.email = 'student@browardmiamihi.com'
      AND e.status IN ('active', 'completed')
      AND e.withdrawn_at IS NULL
    ORDER BY e.id
  `).all();
  assert.ok(enrollments.length > 0, "Expected seeded Demo Student enrollments");

  for (const enrollment of enrollments) {
    await t.test(`student ${enrollment.slug}`, async () => {
      const route = `/student/enrollments/${enrollment.id}?view=syllabus`;
      const response = await request(route, studentCookie);
      const html = await response.text();
      assert.equal(response.status, 200, `Expected ${enrollment.title} student syllabus view to render`);
      assertDownloadLink(html, `/student/enrollments/${enrollment.id}/syllabus.pdf`, `${enrollment.title} student view`);
    });
  }
});

test("student syllabus PDFs require an eligible enrollment owned by the signed-in student", async () => {
  const enrollment = database.prepare(`
    SELECT e.id, c.title
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id
    WHERE u.email = 'student@browardmiamihi.com'
      AND e.status IN ('active', 'completed')
      AND e.withdrawn_at IS NULL
    ORDER BY e.id
    LIMIT 1
  `).get();
  assert.ok(enrollment, "Expected an eligible student enrollment");

  await assertPdfResponse(
    await request(`/student/enrollments/${enrollment.id}/syllabus.pdf`, studentCookie),
    `${enrollment.title} student syllabus`
  );

  const otherEnrollment = await request(`/student/enrollments/${otherStudentEnrollmentId}/syllabus.pdf`, studentCookie);
  assert.equal(otherEnrollment.status, 404, "A student must not download another student's enrollment syllabus");

  const missingEnrollment = await request("/student/enrollments/999999999/syllabus.pdf", studentCookie);
  assert.equal(missingEnrollment.status, 404);

  database.prepare(`
    UPDATE users SET organization_status = 'not_organized'
    WHERE email = 'student@browardmiamihi.com'
  `).run();
  try {
    const locked = await request(`/student/enrollments/${enrollment.id}/syllabus.pdf`, studentCookie);
    assert.equal(locked.status, 403, "A class-access lock must also protect the downloadable syllabus");
  } finally {
    database.prepare(`
      UPDATE users SET organization_status = 'organized'
      WHERE email = 'student@browardmiamihi.com'
    `).run();
  }
});

test("syllabus PDF routes enforce authentication and portal roles", async () => {
  const course = database.prepare("SELECT id FROM courses ORDER BY id LIMIT 1").get();
  const enrollment = database.prepare(`
    SELECT e.id
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    WHERE u.email = 'student@browardmiamihi.com'
      AND e.status IN ('active', 'completed')
      AND e.withdrawn_at IS NULL
    ORDER BY e.id
    LIMIT 1
  `).get();
  assert.ok(course && enrollment);

  const anonymousStaff = await request(`/admin/courses/${course.id}/syllabus.pdf`);
  assert.equal(anonymousStaff.status, 302);
  assert.equal(anonymousStaff.headers.get("location"), "/login");

  const anonymousStudent = await request(`/student/enrollments/${enrollment.id}/syllabus.pdf`);
  assert.equal(anonymousStudent.status, 302);
  assert.equal(anonymousStudent.headers.get("location"), "/login");

  assert.equal(
    (await request(`/admin/courses/${course.id}/syllabus.pdf`, studentCookie)).status,
    403,
    "Students must not use the staff PDF route"
  );
  assert.equal(
    (await request(`/student/enrollments/${enrollment.id}/syllabus.pdf`, adminCookie)).status,
    403,
    "Staff must not bypass student enrollment ownership through the student route"
  );
  assert.equal((await request("/admin/courses/999999999/syllabus.pdf", adminCookie)).status, 404);
});
