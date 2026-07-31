const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");
const expectedAdminLabels = [
  "Home",
  "Announcements",
  "Modules",
  "Assignments",
  "Discussions",
  "Grades",
  "People",
  "Pages",
  "Files",
  "Syllabus",
  "Outcomes",
  "Rubrics",
  "Quizzes",
  "Collaborations",
  "Conferences",
  "Groups",
  "Calendar",
  "Chat",
  "Inbox",
  "ePortfolios",
  "Mastery Paths",
  "Peer Reviews",
  "Course Analytics",
  "External Apps",
  "Course Details",
  "Settings"
];
const expectedStudentLabels = [
  "Home",
  "Announcements",
  "Modules",
  "Assignments",
  "Discussions",
  "Grades",
  "Files",
  "Syllabus",
  "Rubrics",
  "Quizzes",
  "Conferences",
  "Calendar"
];

let serverProcess;
let database;
let temporaryDirectory;
let baseUrl;
let adminCookie;
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
        SESSION_SECRET: "course-navigation-test-secret"
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

async function getHtml(route, cookie) {
  const response = await fetch(`${baseUrl}${route}`, {
    headers: { cookie },
    redirect: "manual"
  });
  assert.equal(response.status, 200, `Expected ${route} to render successfully`);
  return response.text();
}

function decodeText(value) {
  return value
    .replace(/<[^>]*>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .trim();
}

function courseNavigation(html) {
  const navigation = html.match(
    /<aside class="canvas-course-nav" id="canvas-course-navigation">([\s\S]*?)<\/aside>/
  );
  assert.ok(navigation, "Expected the course navigation aside");

  return [...navigation[1].matchAll(/<a class="([^"]*)" href="([^"]*)">([\s\S]*?)<\/a>/g)]
    .map((match) => ({
      active: match[1].split(/\s+/).includes("active"),
      href: match[2].replaceAll("&amp;", "&"),
      label: decodeText(match[3])
    }));
}

function assertNavigation(html, expectedLabels, activeLabel) {
  const navigation = courseNavigation(html);
  assert.deepEqual(navigation.map((item) => item.label), expectedLabels);
  assert.equal(new Set(navigation.map((item) => item.label)).size, navigation.length, "Navigation labels must not repeat");
  assert.deepEqual(navigation.filter((item) => item.active).map((item) => item.label), [activeLabel]);
  return navigation;
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-course-navigation-"));
  const databaseFile = path.join(temporaryDirectory, "navigation.sqlite");
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile);

  database = new DatabaseSync(databaseFile);
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

test("admin course menus keep identical labels and order on home, modules, and lesson routes", async (t) => {
  const courses = database.prepare(`
    SELECT c.id, c.slug, MIN(l.id) AS lesson_id
    FROM courses c
    JOIN modules m ON m.course_id = c.id AND m.published = 1
    JOIN lessons l ON l.module_id = m.id AND l.published = 1
    WHERE c.published = 1
    GROUP BY c.id, c.slug
    ORDER BY c.id
    LIMIT 3
  `).all();
  assert.ok(courses.length >= 2, "Expected at least two seeded courses with lessons");

  for (const course of courses) {
    await t.test(course.slug, async () => {
      const baseRoute = `/admin/courses/${course.id}/student-view`;
      assertNavigation(await getHtml(baseRoute, adminCookie), expectedAdminLabels, "Home");
      assertNavigation(await getHtml(`${baseRoute}?view=modules`, adminCookie), expectedAdminLabels, "Modules");
      assertNavigation(await getHtml(`${baseRoute}?lesson=${course.lesson_id}`, adminCookie), expectedAdminLabels, "Modules");
    });
  }
});

test("student course menus keep identical labels and order on home, modules, and lesson routes", async (t) => {
  const enrollments = database.prepare(`
    SELECT e.id, c.slug, MIN(l.id) AS lesson_id
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id AND c.published = 1
    JOIN modules m ON m.course_id = c.id AND m.published = 1
    JOIN lessons l ON l.module_id = m.id AND l.published = 1 AND l.instructor_only = 0
    WHERE u.email = 'student@browardmiamihi.com' AND e.status = 'active'
    GROUP BY e.id, c.slug
    ORDER BY e.id
    LIMIT 3
  `).all();
  assert.ok(enrollments.length >= 2, "Expected at least two active seeded student enrollments with lessons");

  for (const enrollment of enrollments) {
    await t.test(enrollment.slug, async () => {
      const baseRoute = `/student/enrollments/${enrollment.id}`;
      assertNavigation(await getHtml(baseRoute, studentCookie), expectedStudentLabels, "Home");
      assertNavigation(await getHtml(`${baseRoute}?view=modules`, studentCookie), expectedStudentLabels, "Modules");
      assertNavigation(await getHtml(`${baseRoute}?lesson=${enrollment.lesson_id}`, studentCookie), expectedStudentLabels, "Modules");
    });
  }
});
