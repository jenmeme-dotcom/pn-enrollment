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
  const html = await response.text();
  assert.equal(response.status, 200, `Expected ${route} to render successfully.\n${html.slice(0, 800)}`);
  return html;
}

async function setVisibleCourseSections(courseId, visibleSections) {
  const body = new URLSearchParams({ redirectTo: `/admin/courses/${courseId}` });
  visibleSections.forEach((section) => body.append("visibleSections", section));
  const response = await fetch(`${baseUrl}/admin/courses/${courseId}/sections`, {
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: adminCookie
    },
    method: "POST",
    redirect: "manual"
  });
  assert.equal(response.status, 302, `Expected course ${courseId} section visibility to update`);
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

function studentPortalNavigation(html) {
  const sidebar = html.match(/<aside class="student-sidebar">([\s\S]*?)<\/aside>/);
  assert.ok(sidebar, "Expected the student portal sidebar");
  return [...sidebar[1].matchAll(/<a class="([^"]*)" href="([^"]*)">([\s\S]*?)<\/a>/g)].map((match) => ({
    active: match[1].split(/\s+/).includes("active"),
    href: match[2],
    label: decodeText(match[3])
  }));
}

function assertCalendarStructure(html) {
  assert.match(html, /<main class="canvas-course-main calendar-main">/, "Expected the calendar main region");
  assert.match(html, /<div class="calendar-toolbar">/, "Expected the calendar toolbar");
  assert.match(html, /<div class="calendar-month-scroll">/, "Expected the local month-grid scroll region");
  assert.match(html, /<aside class="canvas-rightbar calendar-sidebar">/, "Expected the calendar sidebar");

  const grid = html.match(/<section class="calendar-month-grid"[^>]*>([\s\S]*?)<\/section>/);
  assert.ok(grid, "Expected the month grid");
  const weekdays = [...grid[1].matchAll(/<strong>(SUN|MON|TUE|WED|THU|FRI|SAT)<\/strong>/g)].map((match) => match[1]);
  const dayBoxes = [...grid[1].matchAll(/<article class="calendar-day(?: [^"]*)?">/g)];
  const dayNumbers = [...grid[1].matchAll(/<article class="calendar-day(?: [^"]*)?">\s*<b>\d+<\/b>/g)];

  assert.deepEqual(weekdays, ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);
  assert.equal(dayBoxes.length, 42, "Expected six complete seven-day rows");
  assert.equal(dayBoxes.length % 7, 0, "Calendar weeks must contain seven equal day boxes");
  assert.equal(dayNumbers.length, dayBoxes.length, "Every day box must show one date number");
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-course-navigation-"));
  const databaseFile = path.join(temporaryDirectory, "navigation.sqlite");
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

test("student course menus stay fixed after customization requests", async (t) => {
  const enrollments = database.prepare(`
    SELECT e.id, e.course_id, c.slug, c.hidden_sections, MIN(l.id) AS lesson_id
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id AND c.published = 1
    JOIN modules m ON m.course_id = c.id AND m.published = 1
    JOIN lessons l ON l.module_id = m.id AND l.published = 1 AND l.instructor_only = 0
    WHERE u.email = 'student@browardmiamihi.com' AND e.status = 'active'
    GROUP BY e.id, e.course_id, c.slug, c.hidden_sections
    ORDER BY e.id
    LIMIT 2
  `).all();
  assert.equal(enrollments.length, 2, "Expected two seeded enrollments for the opposite-configuration check");

  const hideAlternatingItems = expectedStudentLabels.filter((label, index) => label !== "Home" && index % 2 === 0);
  const hideOppositeItems = expectedStudentLabels.filter((label, index) => label !== "Home" && index % 2 === 1);
  const configurableCourseSections = expectedAdminLabels.filter((label) => label !== "Home" && label !== "Course Details");
  await setVisibleCourseSections(
    enrollments[0].course_id,
    configurableCourseSections.filter((label) => !hideAlternatingItems.includes(label))
  );
  await setVisibleCourseSections(
    enrollments[1].course_id,
    configurableCourseSections.filter((label) => !hideOppositeItems.includes(label))
  );

  try {
    for (const enrollment of enrollments) {
      await t.test(enrollment.slug, async () => {
        const baseRoute = `/student/enrollments/${enrollment.id}`;
        assertNavigation(await getHtml(baseRoute, studentCookie), expectedStudentLabels, "Home");
        assertNavigation(await getHtml(`${baseRoute}?view=modules`, studentCookie), expectedStudentLabels, "Modules");
        assertNavigation(await getHtml(`${baseRoute}?lesson=${enrollment.lesson_id}`, studentCookie), expectedStudentLabels, "Modules");
      });
    }
  } finally {
    for (const enrollment of enrollments) {
      await setVisibleCourseSections(enrollment.course_id, configurableCourseSections);
    }
  }
});

test("course navigation settings endpoint resets legacy customization", async () => {
  const course = database.prepare("SELECT id FROM courses ORDER BY id LIMIT 1").get();
  await setVisibleCourseSections(course.id, ["Home"]);
  assert.equal(database.prepare("SELECT hidden_sections FROM courses WHERE id = ?").get(course.id).hidden_sections, "[]");
});

test("student evaluations have a dedicated page and compact profile entry", async () => {
  const profileHtml = await getHtml("/student/profile", studentCookie);
  const profileNavigation = studentPortalNavigation(profileHtml);
  assert.ok(profileNavigation.some((item) => item.label === "Student Evaluations" && item.href === "/student/evaluations"));
  assert.deepEqual(profileNavigation.filter((item) => item.active).map((item) => item.label), ["My Profile"]);
  assert.match(profileHtml, /href="\/student\/evaluations">Open Student Evaluations<\/a>/);
  assert.doesNotMatch(profileHtml, /class="student-self-eval-card/);
  assert.doesNotMatch(profileHtml, /class="course-survey-card/);

  const evaluationsHtml = await getHtml("/student/evaluations", studentCookie);
  const evaluationsNavigation = studentPortalNavigation(evaluationsHtml);
  assert.deepEqual(evaluationsNavigation.filter((item) => item.active).map((item) => item.label), ["Student Evaluations"]);
  assert.match(evaluationsHtml, /<h1>Student Evaluations and Surveys<\/h1>/);
  assert.match(evaluationsHtml, /id="self-evaluations"/);
  assert.match(evaluationsHtml, /id="course-surveys"/);
  assert.match(evaluationsHtml, /Back to My Profile/);
});

test("student profile keeps long account values in dedicated wrapping containers", async () => {
  const profileHtml = await getHtml("/student/profile", studentCookie);
  const profileGrid = profileHtml.match(/<section class="profile-grid">([\s\S]*?)<\/section>\s*<\/section>/);
  assert.ok(profileGrid, "Expected the student profile grid");
  assert.match(profileGrid[1], /<article class="student-panel profile-card" id="profile">/);
  assert.match(profileGrid[1], /<article class="student-panel profile-summary">/);

  const profileTable = profileGrid[1].match(/<div class="profile-table">([\s\S]*?)<\/div>\s*<form class="profile-reminder-email"/);
  assert.ok(profileTable, "Expected the profile details table");
  assert.match(profileTable[1], /<strong>Email<\/strong><span>[^<]+<\/span>/);
  assert.match(profileTable[1], /<strong>Personal reminder email<\/strong><span>[^<]+<\/span>/);

  const summary = profileGrid[1].match(/<div class="summary-stats">([\s\S]*?)<\/div>\s*<\/article>/);
  assert.ok(summary, "Expected the student summary statistics");
  assert.equal([...summary[1].matchAll(/class="stat"/g)].length, 3, "Expected three separate summary boxes");
});

test("student profile CSS stacks constrained panels and safely wraps long words", () => {
  const styles = fs.readFileSync(path.join(projectRoot, "src", "public", "styles.css"), "utf8");
  assert.match(
    styles,
    /@media \(max-width: 1400px\) and \(min-width: 821px\)[\s\S]*?\.profile-card,\s*\.profile-summary\s*\{[\s\S]*?grid-column:\s*span 12;/,
    "Expected the two profile panels to stack while the persistent student sidebar constrains the content area"
  );
  assert.match(
    styles,
    /\.profile-table div\s*\{[\s\S]*?min-width:\s*0;/,
    "Expected profile detail cells to be allowed to shrink inside the grid"
  );
  assert.match(
    styles,
    /\.profile-table span\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/,
    "Expected long email addresses and program names to wrap instead of overlapping adjacent cells"
  );
  assert.match(
    styles,
    /\.profile-reminder-email input\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?width:\s*100%;/,
    "Expected the personal email input to stay inside the profile card"
  );
  assert.match(
    styles,
    /\.summary-stats\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(144px,\s*1fr\)\);/,
    "Expected summary boxes to reflow before their labels become too narrow"
  );
  assert.match(
    styles,
    /\.summary-stats \.stat span,[\s\S]*?overflow-wrap:\s*normal;[\s\S]*?word-break:\s*normal;/,
    "Expected summary labels to wrap between words rather than splitting words"
  );
  assert.match(styles, /\.stat\s*\{[\s\S]*?min-width:\s*0;/);
  assert.match(styles, /\.stat span\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
});

test("evaluation submissions return to the dedicated sections", async () => {
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
  assert.ok(enrollment, "Expected an evaluation-eligible enrollment");

  const selfResponse = await fetch(`${baseUrl}/student/self-evaluations/${enrollment.id}/4`, {
    body: new URLSearchParams(),
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: studentCookie },
    method: "POST",
    redirect: "manual"
  });
  assert.equal(selfResponse.status, 302);
  assert.equal(selfResponse.headers.get("location"), "/student/evaluations#self-evaluations");

  const surveyResponse = await fetch(`${baseUrl}/student/evaluations/${enrollment.id}/4`, {
    body: new URLSearchParams(),
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: studentCookie },
    method: "POST",
    redirect: "manual"
  });
  assert.equal(surveyResponse.status, 302);
  assert.equal(surveyResponse.headers.get("location"), "/student/evaluations#course-surveys");
});

test("course calendar routes render complete month grids in the responsive course shell", async () => {
  const course = database.prepare(`
    SELECT c.id
    FROM courses c
    JOIN modules m ON m.course_id = c.id AND m.published = 1
    JOIN lessons l ON l.module_id = m.id AND l.published = 1
    WHERE c.published = 1
    ORDER BY c.id
    LIMIT 1
  `).get();
  const enrollment = database.prepare(`
    SELECT e.id
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id AND c.published = 1
    WHERE u.email = 'student@browardmiamihi.com' AND e.status = 'active'
    ORDER BY e.id
    LIMIT 1
  `).get();
  assert.ok(course && enrollment, "Expected seeded calendar fixtures");

  const adminHtml = await getHtml(`/admin/courses/${course.id}/student-view?view=calendar`, adminCookie);
  assert.match(adminHtml, /<section class="canvas-course-shell canvas-course-calendar-shell instructor-preview">/);
  assertNavigation(adminHtml, expectedAdminLabels, "Calendar");
  assertCalendarStructure(adminHtml);
  assert.match(adminHtml, /<form class="calendar-event-form" id="add-calendar-event"/);

  const studentHtml = await getHtml(`/student/enrollments/${enrollment.id}?view=calendar`, studentCookie);
  assert.match(studentHtml, /<section class="canvas-course-shell canvas-course-calendar-shell student-course-shell">/);
  assertNavigation(studentHtml, expectedStudentLabels, "Calendar");
  assertCalendarStructure(studentHtml);
  assert.doesNotMatch(studentHtml, /<form class="calendar-event-form" id="add-calendar-event"/);
});

test("global student calendar retains a complete month grid", async () => {
  const html = await getHtml("/student/calendar", studentCookie);
  assert.match(html, /<section class="canvas-course-shell canvas-global-calendar-shell">/);
  assertCalendarStructure(html);
});

test("calendar CSS scopes global placement and preserves seven equal columns", () => {
  const styles = fs.readFileSync(path.join(projectRoot, "src", "public", "styles.css"), "utf8");
  assert.match(styles, /\.canvas-global-calendar-shell > \.calendar-main\s*\{[\s\S]*?grid-column:\s*2;/);
  assert.match(styles, /\.canvas-global-calendar-shell > \.calendar-sidebar\s*\{[\s\S]*?grid-column:\s*3;/);
  assert.match(styles, /\.canvas-course-calendar-shell > \.calendar-main\s*\{[\s\S]*?grid-column:\s*3 \/ 5;/);
  assert.match(styles, /\.calendar-month-scroll\s*\{[\s\S]*?overflow-x:\s*auto;/);
  assert.match(styles, /\.calendar-month-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(7, minmax\(0, 1fr\)\);[\s\S]*?width:\s*100%;/);
  assert.match(styles, /@media \(max-width: 820px\)[\s\S]*?\.calendar-month-grid\s*\{\s*min-width:\s*760px;/);
});
