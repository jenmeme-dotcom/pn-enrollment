const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");
const expectedTitles = [
  "PN 105: Fundamental Nursing Skills and Concepts - Cohort 2",
  "PN 106: Pharmacology - Introductory Clinical Pharmacology",
  "PN 107: Medical-Surgical Nursing I"
];

let serverProcess;
let database;
let temporaryDirectory;
let baseUrl;
let adminCookie;
let studentCookie;
let studentId;

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
        SESSION_SECRET: "course-title-display-test-secret"
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

async function getHtml(route, cookie) {
  const response = await fetch(`${baseUrl}${route}`, { headers: { cookie }, redirect: "manual" });
  const html = await response.text();
  assert.equal(response.status, 200, `Expected ${route} to render.\n${html.slice(0, 800)}`);
  return html;
}

function htmlText(value) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

function assertCanonicalCourseTitles(html, surface) {
  const text = htmlText(html);
  for (const title of expectedTitles) {
    assert.ok(text.includes(title), `Expected ${surface} to show ${title}`);
  }
  assert.doesNotMatch(text, /PN 106\s*(?:—|–|:|-)\s*PN 106\b/i, `${surface} must not repeat the PN 106 code`);
  assert.doesNotMatch(text, /PN 107\s*(?:—|–|:|-)\s*PN 107\b/i, `${surface} must not repeat the PN 107 code`);
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-course-title-display-"));
  const databaseFile = path.join(temporaryDirectory, "course-titles.sqlite");
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile);

  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA busy_timeout = 5000;");
  const student = database.prepare("SELECT id FROM users WHERE email = 'student@browardmiamihi.com'").get();
  assert.ok(student?.id, "Expected the seeded demo student");
  studentId = student.id;
  const photoStorageName = "course-title-display-student.png";
  fs.writeFileSync(
    path.join(temporaryDirectory, "uploads", photoStorageName),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  );
  database.prepare(`
    UPDATE users
    SET organization_status = 'organized',
      photo_review_status = 'approved',
      photo_storage_name = ?,
      photo_original_name = 'course-title-display-student.png'
    WHERE id = ?
  `).run(photoStorageName, studentId);

  const slugs = [
    "fundamental-nursing-skills-and-concepts-new-cohort",
    "introductory-clinical-pharmacology-pn106",
    "medical-surgical-nursing-i-pn107"
  ];
  const courses = database.prepare(`
    SELECT id, slug, title
    FROM courses
    WHERE slug IN (${slugs.map(() => "?").join(", ")})
    ORDER BY slug
  `).all(...slugs);
  assert.equal(courses.length, 3, "Expected the seeded PN 105, PN 106, and PN 107 courses");
  assert.equal(courses.find((course) => course.slug === slugs[0])?.title, "Fundamental Nursing Skills and Concepts - Cohort 2");
  assert.match(courses.find((course) => course.slug === slugs[1])?.title || "", /^PN 106:/);
  assert.match(courses.find((course) => course.slug === slugs[2])?.title || "", /^PN 107:/);

  const insertEnrollment = database.prepare(`
    INSERT OR IGNORE INTO enrollments (
      user_id, course_id, status, progress, source, external_order_id
    ) VALUES (?, ?, 'active', 0, 'test', ?)
  `);
  for (const course of courses) {
    insertEnrollment.run(studentId, course.id, `course-title-display-${course.slug}`);
  }

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

test("registrar enrollment records use one canonical code-first course title", async () => {
  const html = await getHtml(`/admin/students/${studentId}/registrar-checklist`, adminCookie);
  assertCanonicalCourseTitles(html, "the registrar checklist");
});

test("student course cards use the same canonical code-first course title", async () => {
  const html = await getHtml("/student/courses", studentCookie);
  assertCanonicalCourseTitles(html, "the student course list");
});
