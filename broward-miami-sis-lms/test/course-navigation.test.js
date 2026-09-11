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

function formSubmission(html, pattern, description) {
  const form = html.match(pattern);
  assert.ok(form, `Expected ${description}`);
  const body = new URLSearchParams();
  for (const input of form[2].matchAll(/<input\b[^>]*\btype="hidden"[^>]*>/g)) {
    const name = input[0].match(/\bname="([^"]+)"/);
    const value = input[0].match(/\bvalue="([^"]*)"/);
    if (name) body.append(name[1], (value?.[1] || "").replaceAll("&amp;", "&"));
  }
  return {
    action: form[1].replaceAll("&amp;", "&"),
    body
  };
}

async function postForm(action, body, cookie) {
  return fetch(`${baseUrl}${action}`, {
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie
    },
    method: "POST",
    redirect: "manual"
  });
}

function assertEditRedirect(response, { courseId, view, hash = "" }) {
  assert.equal(response.status, 302);
  const location = response.headers.get("location");
  assert.ok(location, "Expected a redirect location");
  const destination = new URL(location, baseUrl);
  assert.equal(destination.pathname, `/admin/courses/${courseId}/student-view`);
  assert.equal(destination.searchParams.get("view"), view);
  assert.equal(destination.searchParams.get("mode"), "edit");
  assert.equal(destination.hash, hash);
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

function assertPageHref(html, expectedHref, description) {
  const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)]
    .map((match) => match[1].replaceAll("&amp;", "&"));
  assert.ok(hrefs.includes(expectedHref), `Expected ${description} to link to ${expectedHref}`);
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

function assertCourseShellClasses(html, expectedClasses) {
  const shell = html.match(/<section class="([^"]*\bcanvas-course-shell\b[^"]*)">/);
  assert.ok(shell, "Expected the Canvas course shell");
  const classes = new Set(shell[1].split(/\s+/));
  expectedClasses.forEach((className) => {
    assert.ok(classes.has(className), `Expected course shell class ${className}`);
  });
}

function assertInstructorPreviewEditButton(html, expectedHref) {
  const header = html.match(/<header class="[^"]*\bcanvas-populi-bar\b[^"]*">([\s\S]*?)<\/header>/);
  assert.ok(header, "Expected the course top bar");
  assert.match(header[0], /\bstudent-canvas-topbar\b/, "Instructor preview should use the student course top bar");

  const links = [...header[1].matchAll(/<a class="([^"]*)" href="([^"]*)">([\s\S]*?)<\/a>/g)]
    .map((match) => ({
      classes: match[1].split(/\s+/),
      href: match[2].replaceAll("&amp;", "&"),
      label: decodeText(match[3]),
      offset: match.index
    }));
  const editLinks = links.filter((link) => link.label === "Edit Course");
  assert.equal(editLinks.length, 1, "Expected exactly one Edit Course button in the instructor preview top bar");
  assert.equal(editLinks[0].href, expectedHref);
  assert.ok(editLinks[0].classes.includes("canvas-top-button"), "Edit Course should use the top-bar button style");
  assert.ok(
    editLinks[0].offset > header[1].indexOf('class="canvas-top-spacer"'),
    "Edit Course should appear in the upper-right action area after the top-bar spacer"
  );
  assert.doesNotMatch(header[0], />\s*View as Student\s*</, "The preview should not link back to itself");
}

function assertReadOnlyAssignmentSubmissionPreview(html, assignmentId) {
  const card = html.match(/<section class="lesson-action-card assignment-submission-card">([\s\S]*?)<\/section>/);
  assert.ok(card, "Expected the student assignment submission layout in instructor preview");
  assert.match(card[0], /Student submission form/);
  assert.match(card[0], /Instructor preview/);
  assert.match(card[0], /<input type="file" disabled>/);
  assert.match(card[0], /<button class="button" type="button" disabled>Submit Assignment<\/button>/);
  assert.doesNotMatch(card[0], /<form\b/i, "Preview submission controls must not be wrapped in a form");
  assert.doesNotMatch(card[0], /\baction=/i, "Preview submission controls must not have a POST target");
  assert.doesNotMatch(
    html,
    new RegExp(`action="/student/enrollments/[^"]+/assignments/${assignmentId}/submit"`),
    "Instructor preview must not expose an actionable student submission endpoint"
  );
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

test("instructor student view matches the student course chrome and exposes one upper-right edit action", async (t) => {
  const courses = database.prepare(`
    SELECT c.id, c.slug, e.id AS enrollment_id, MIN(l.id) AS lesson_id
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id
    JOIN modules m ON m.course_id = c.id AND m.published = 1
    JOIN lessons l ON l.module_id = m.id AND l.published = 1 AND l.instructor_only = 0
    WHERE u.email = 'student@browardmiamihi.com'
      AND e.status = 'active'
      AND e.withdrawn_at IS NULL
      AND c.published = 1
    GROUP BY c.id, c.slug, e.id
    ORDER BY c.id
    LIMIT 3
  `).all();
  assert.ok(courses.length >= 2, "Expected at least two seeded courses shared by the student and instructor previews");

  for (const course of courses) {
    await t.test(course.slug, async () => {
      const adminBaseRoute = `/admin/courses/${course.id}/student-view`;
      const studentBaseRoute = `/student/enrollments/${course.enrollment_id}`;
      const routeCases = [
        {
          adminRoute: adminBaseRoute,
          studentRoute: studentBaseRoute,
          activeLabel: "Home",
          shellClasses: ["student-course-shell", "student-course-home"],
          editHref: `/admin/courses/${course.id}`,
          sharedLandmarks: ["course-outline-panel", "course-welcome-banner", "welcoming-course-intro", "weekly-pattern", "canvas-rightbar"]
        },
        {
          adminRoute: `${adminBaseRoute}?view=modules`,
          studentRoute: `${studentBaseRoute}?view=modules`,
          activeLabel: "Modules",
          shellClasses: ["student-course-shell", "canvas-modules-shell"],
          editHref: `${adminBaseRoute}?view=modules&mode=edit`,
          sharedLandmarks: ["course-outline-panel", "canvas-modules-main", "canvas-module-list"]
        },
        {
          adminRoute: `${adminBaseRoute}?lesson=${course.lesson_id}`,
          studentRoute: `${studentBaseRoute}?lesson=${course.lesson_id}`,
          activeLabel: "Modules",
          shellClasses: ["student-course-shell", "canvas-lesson-shell"],
          editHref: `${adminBaseRoute}?lesson=${course.lesson_id}&mode=edit`,
          sharedLandmarks: ["course-outline-panel", "canvas-page-main"]
        }
      ];

      for (const routeCase of routeCases) {
        const instructorHtml = await getHtml(routeCase.adminRoute, adminCookie);
        const studentHtml = await getHtml(routeCase.studentRoute, studentCookie);

        assertCourseShellClasses(instructorHtml, ["instructor-preview", ...routeCase.shellClasses]);
        assertCourseShellClasses(studentHtml, routeCase.shellClasses);
        assertNavigation(instructorHtml, expectedStudentLabels, routeCase.activeLabel);
        assertNavigation(studentHtml, expectedStudentLabels, routeCase.activeLabel);
        assertInstructorPreviewEditButton(instructorHtml, routeCase.editHref);
        assert.doesNotMatch(studentHtml, new RegExp(`href="/admin/courses/${course.id}"`));
        assert.doesNotMatch(instructorHtml, /\bpreview-ribbon\b/, "The student-style preview should not show the legacy instructor ribbon");

        if (routeCase.adminRoute.includes("view=modules")) {
          assert.doesNotMatch(
            instructorHtml,
            /\b(?:canvas-module-create|canvas-module-item-create|module-action-button)\b/,
            "Preview mode should not mix module editing controls into the student layout"
          );
        }

        for (const landmark of routeCase.sharedLandmarks) {
          assert.match(instructorHtml, new RegExp(`\\b${landmark}\\b`), `Instructor preview should include student landmark ${landmark}`);
          assert.match(studentHtml, new RegExp(`\\b${landmark}\\b`), `Student course should include landmark ${landmark}`);
        }
      }
    });
  }
});

test("instructor student preview keeps student actions read-only", async () => {
  const quizLesson = database.prepare(`
    SELECT c.id AS course_id, l.id AS lesson_id
    FROM courses c
    JOIN modules m ON m.course_id = c.id AND m.published = 1
    JOIN lessons l ON l.module_id = m.id AND l.published = 1 AND l.instructor_only = 0
    WHERE LOWER(l.title) LIKE '%quiz%'
    ORDER BY c.id, m.position, l.position
    LIMIT 1
  `).get();
  assert.ok(quizLesson, "Expected a published quiz lesson for preview testing");

  const quizHtml = await getHtml(
    `/admin/courses/${quizLesson.course_id}/student-view?lesson=${quizLesson.lesson_id}`,
    adminCookie
  );
  assert.match(quizHtml, /Student preview/);
  assert.match(quizHtml, /<button class="button exam-start-button" type="button" disabled>Start Now<\/button>/);
  assert.doesNotMatch(quizHtml, /action="\/student\/enrollments\/(?:null|undefined)\//);

  const discussion = database.prepare(`
    SELECT c.id AS course_id, dt.id AS topic_id
    FROM discussion_topics dt
    JOIN courses c ON c.id = dt.course_id
    ORDER BY c.id, dt.id
    LIMIT 1
  `).get();
  assert.ok(discussion, "Expected a discussion topic for preview testing");

  const discussionHtml = await getHtml(
    `/admin/courses/${discussion.course_id}/student-view?view=discussions&topicId=${discussion.topic_id}`,
    adminCookie
  );
  assert.doesNotMatch(discussionHtml, /discussion-reply-form/);
  assert.doesNotMatch(discussionHtml, /id="add-discussion"/);
});

test("instructor preview preserves the scheduled exam availability state", async () => {
  const closedExam = database.prepare(`
    SELECT c.id AS course_id, l.id AS lesson_id
    FROM courses c
    JOIN modules m ON m.course_id = c.id AND m.published = 1
    JOIN lessons l ON l.module_id = m.id AND l.published = 1 AND l.instructor_only = 0
    WHERE l.title = 'Midterm Exam: Weeks 1-6'
    LIMIT 1
  `).get();
  assert.ok(closedExam, "Expected the scheduled PN 102 midterm lesson");

  const html = await getHtml(
    `/admin/courses/${closedExam.course_id}/student-view?lesson=${closedExam.lesson_id}`,
    adminCookie
  );
  assert.match(html, /Exam closed/);
  assert.doesNotMatch(html, />Start Now</);
});

test("instructor preview shows read-only assignment submission controls on detail and lesson pages", async () => {
  const fixture = database.prepare(`
    SELECT c.id AS course_id, m.id AS module_id,
      COALESCE(MAX(l.position), 0) + 1 AS next_position
    FROM courses c
    JOIN modules m ON m.course_id = c.id AND m.published = 1
    LEFT JOIN lessons l ON l.module_id = m.id
    WHERE c.published = 1
    GROUP BY c.id, m.id
    ORDER BY c.id, m.position
    LIMIT 1
  `).get();
  assert.ok(fixture, "Expected a published course module for assignment preview testing");

  const title = `Instructor Preview Assignment ${Date.now()}`;
  const gradeItemId = Number(database.prepare(`
    INSERT INTO grade_items (course_id, title, points_possible, due_date)
    VALUES (?, ?, 25, '2026-09-30')
  `).run(fixture.course_id, title).lastInsertRowid);
  const lessonId = Number(database.prepare(`
    INSERT INTO lessons (
      module_id, title, content, duration_minutes, position,
      published, instructor_only, item_type, grade_item_id
    ) VALUES (?, ?, ?, 30, ?, 1, 0, 'assignment', ?)
  `).run(
    fixture.module_id,
    title,
    "Complete the assignment and submit your written response or file.",
    fixture.next_position,
    gradeItemId
  ).lastInsertRowid);

  try {
    const baseRoute = `/admin/courses/${fixture.course_id}/student-view`;
    const detailHtml = await getHtml(`${baseRoute}?assignment=${gradeItemId}`, adminCookie);
    assertReadOnlyAssignmentSubmissionPreview(detailHtml, gradeItemId);

    const lessonHtml = await getHtml(`${baseRoute}?lesson=${lessonId}`, adminCookie);
    assertReadOnlyAssignmentSubmissionPreview(lessonHtml, gradeItemId);
  } finally {
    database.prepare("DELETE FROM lessons WHERE id = ?").run(lessonId);
    database.prepare("DELETE FROM grade_items WHERE id = ?").run(gradeItemId);
  }
});

test("contextual edit form stays in edit mode after a successful submission", async () => {
  const course = database.prepare(`
    SELECT c.id
    FROM courses c
    JOIN modules m ON m.course_id = c.id
    WHERE c.published = 1
    GROUP BY c.id
    ORDER BY c.id
    LIMIT 1
  `).get();
  assert.ok(course, "Expected a seeded course for contextual edit redirects");
  const baseRoute = `/admin/courses/${course.id}/student-view`;

  const modulesHtml = await getHtml(`${baseRoute}?view=modules&mode=edit`, adminCookie);
  const moduleForm = formSubmission(
    modulesHtml,
    /<details class="canvas-module-create">[\s\S]*?<form method="post" action="([^"]+)">([\s\S]*?)<\/form>/,
    "the contextual add-module form"
  );
  const moduleTitle = `Context Redirect Module ${Date.now()}`;
  moduleForm.body.set("title", moduleTitle);
  moduleForm.body.set("published", "1");
  const moduleResponse = await postForm(moduleForm.action, moduleForm.body, adminCookie);
  try {
    assertEditRedirect(moduleResponse, { courseId: course.id, view: "modules" });
  } finally {
    const createdModule = database.prepare("SELECT id FROM modules WHERE course_id = ? AND title = ?").get(course.id, moduleTitle);
    if (createdModule) database.prepare("DELETE FROM modules WHERE id = ?").run(createdModule.id);
  }
});

test("contextual edit form stays in edit mode after validation failure", async () => {
  const course = database.prepare("SELECT id FROM courses WHERE published = 1 ORDER BY id LIMIT 1").get();
  assert.ok(course, "Expected a seeded course for contextual edit redirects");
  const baseRoute = `/admin/courses/${course.id}/student-view`;
  const announcementsHtml = await getHtml(`${baseRoute}?view=announcements&mode=edit`, adminCookie);
  const announcementForm = formSubmission(
    announcementsHtml,
    /<form class="announcement-form" id="add-announcement" method="post" action="([^"]+)">([\s\S]*?)<\/form>/,
    "the contextual announcement form"
  );
  announcementForm.body.set("title", "");
  announcementForm.body.set("body", "");
  const validationResponse = await postForm(announcementForm.action, announcementForm.body, adminCookie);
  assertEditRedirect(validationResponse, {
    courseId: course.id,
    view: "announcements",
    hash: "#add-announcement"
  });
});

test("upper-right edit action restores contextual instructor tools", async () => {
  const editableCourse = database.prepare(`
    SELECT c.id, MIN(dt.id) AS topic_id, MIN(gi.id) AS rubric_item_id
    FROM courses c
    JOIN discussion_topics dt ON dt.course_id = c.id
    JOIN modules m ON m.course_id = c.id
    JOIN lessons l ON l.module_id = m.id
    JOIN grade_items gi ON gi.course_id = c.id
      AND gi.points_possible > 0
      AND LOWER(gi.title) NOT LIKE '%quiz%'
      AND LOWER(gi.title) NOT LIKE '%exam%'
      AND LOWER(gi.title) NOT LIKE '%midterm%'
      AND LOWER(gi.title) NOT LIKE '%final%'
      AND LOWER(gi.title) NOT LIKE '%discussion%'
      AND LOWER(gi.title) NOT LIKE '%acknowledg%'
    GROUP BY c.id
    ORDER BY c.id
    LIMIT 1
  `).get();
  assert.ok(editableCourse, "Expected a seeded course with editable content");
  const baseRoute = `/admin/courses/${editableCourse.id}/student-view`;

  const modulesHtml = await getHtml(`${baseRoute}?view=modules&mode=edit`, adminCookie);
  assert.match(modulesHtml, /class="canvas-module-create"/);
  assert.match(modulesHtml, /class="canvas-module-item-create"/);
  assert.match(modulesHtml, /class="module-action-button/);
  assert.match(modulesHtml, new RegExp(`href="${baseRoute.replaceAll("/", "\\/")}\\?view=modules">Done<\\/a>`));
  assertPageHref(modulesHtml, `${baseRoute}?view=grades&mode=edit`, "module progress");

  const assignmentsHtml = await getHtml(`${baseRoute}?view=assignments&mode=edit`, adminCookie);
  assertPageHref(assignmentsHtml, `${baseRoute}?view=modules&mode=edit`, "Manage Modules");
  assertPageHref(assignmentsHtml, `${baseRoute}?view=grades&mode=edit`, "Open Gradebook");

  const announcementsHtml = await getHtml(`${baseRoute}?view=announcements&mode=edit`, adminCookie);
  assert.match(announcementsHtml, /id="add-announcement"/);

  const discussionsHtml = await getHtml(
    `${baseRoute}?view=discussions&topicId=${editableCourse.topic_id}&mode=edit`,
    adminCookie
  );
  assert.match(discussionsHtml, /id="add-discussion"/);
  assert.match(discussionsHtml, /discussion-reply-form/);
  assertPageHref(
    discussionsHtml,
    `${baseRoute}?view=discussions&topicId=${editableCourse.topic_id}&mode=edit`,
    "discussion topic selection"
  );

  const calendarHtml = await getHtml(`${baseRoute}?view=calendar&mode=edit`, adminCookie);
  assert.match(calendarHtml, /id="add-calendar-event"/);

  const rubricsHtml = await getHtml(`${baseRoute}?view=rubrics&mode=edit`, adminCookie);
  assert.ok(
    rubricsHtml.includes(
      `<a class="button ghost small" href="${baseRoute}?assignment=${editableCourse.rubric_item_id}&amp;mode=edit">Edit Rubric</a>`
    ),
    "Expected Edit Rubric to open the contextual assignment editor directly"
  );
  const rubricEditorHtml = await getHtml(
    `${baseRoute}?assignment=${editableCourse.rubric_item_id}&mode=edit`,
    adminCookie
  );
  assert.match(rubricEditorHtml, /class="rubric-editor"/);
  assertPageHref(rubricEditorHtml, `${baseRoute}?view=grades&mode=edit`, "assignment Open Gradebook");

  const gradesHtml = await getHtml(`${baseRoute}?view=grades&mode=edit`, adminCookie);
  assertCourseShellClasses(gradesHtml, ["instructor-preview", "instructor-gradebook-shell"]);
  assert.match(gradesHtml, /class="instructor-gradebook-main"/);
  assertPageHref(gradesHtml, `${baseRoute}?view=grades&mode=edit`, "gradebook switch");
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
  assertCourseShellClasses(adminHtml, ["canvas-course-calendar-shell", "student-course-shell", "instructor-preview"]);
  assertNavigation(adminHtml, expectedStudentLabels, "Calendar");
  assertInstructorPreviewEditButton(adminHtml, `/admin/courses/${course.id}/student-view?view=calendar&mode=edit`);
  assertCalendarStructure(adminHtml);
  assert.doesNotMatch(adminHtml, /<form class="calendar-event-form" id="add-calendar-event"/, "Preview mode should not expose the instructor calendar form");

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
