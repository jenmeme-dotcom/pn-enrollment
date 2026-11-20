const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const {
  medicalSurgicalNursingLabCourse,
  pn107LabFaculty,
  pn107LabFacultyContactContent
} = require("../src/medicalSurgicalNursingLabBuildout");
const videoCatalog = require("../src/pn107LabVideoCatalog.json");
const schoolDirectory = require("../src/schoolDirectory.json");

const projectRoot = path.resolve(__dirname, "..");
const labSlug = "medical-surgical-nursing-i-pn107-lab";
const theorySlug = "medical-surgical-nursing-i-pn107";
const lippincottGateway = "https://thepoint.lww.com/gateway";

let temporaryDirectory;
let databaseFile;
let database;
let activeTheoryStudentId;
let withdrawnLabStudentId;
let preservedLabRowsBeforeReflow;
let preservedVideoPageRowsBeforeReflow;

function seed() {
  const result = spawnSync(process.execPath, ["--no-warnings", "src/seed.js"], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, DATABASE_FILE: databaseFile }
  });
  assert.equal(result.status, 0, result.stderr);
}

before(() => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-pn107-lab-"));
  databaseFile = path.join(temporaryDirectory, "pn107-lab.sqlite");

  seed();

  database = new DatabaseSync(databaseFile);
  const theoryCourse = database.prepare("SELECT id FROM courses WHERE slug = ?").get(theorySlug);
  const labCourse = database.prepare("SELECT id FROM courses WHERE slug = ?").get(labSlug);
  assert.ok(theoryCourse, "PN 107 theory course must exist after the first seed");
  assert.ok(labCourse, "PN 107 Lab course must exist after the first seed");

  const insertStudent = database.prepare(`
    INSERT INTO users (
      role, first_name, last_name, email, phone, password_hash, status,
      organization_status, cohort_name, gradebook_hidden
    ) VALUES ('student', ?, ?, ?, '', 'test-password-hash', 'active', 'organized', 'Test Cohort', 0)
  `);
  activeTheoryStudentId = Number(insertStudent.run(
    "Active Theory",
    "Student",
    "pn107-lab-active@example.com"
  ).lastInsertRowid);
  withdrawnLabStudentId = Number(insertStudent.run(
    "Withdrawn Lab",
    "Student",
    "pn107-lab-withdrawn@example.com"
  ).lastInsertRowid);

  const insertTheoryEnrollment = database.prepare(`
    INSERT INTO enrollments (
      user_id, course_id, status, start_date, progress, source, external_order_id
    ) VALUES (?, ?, 'active', '2026-10-01', 0, 'test', ?)
  `);
  insertTheoryEnrollment.run(activeTheoryStudentId, theoryCourse.id, "test-active-theory");
  insertTheoryEnrollment.run(withdrawnLabStudentId, theoryCourse.id, "test-withdrawn-theory");
  database.prepare(`
    INSERT INTO enrollments (
      user_id, course_id, status, withdrawal_effective_date, withdrawal_reason,
      withdrawn_at, start_date, progress, source, external_order_id
    ) VALUES (?, ?, 'withdrawn', '2026-10-10', 'Test withdrawal',
      '2026-10-10 12:00:00', '2026-10-01', 0, 'test', 'test-withdrawn-lab')
  `).run(withdrawnLabStudentId, labCourse.id);

  preservedLabRowsBeforeReflow = database.prepare(`
    SELECT lessons.id AS lesson_id, lessons.grade_item_id
    FROM lessons
    JOIN modules ON modules.id = lessons.module_id
    WHERE modules.course_id = ?
      AND lessons.title LIKE 'Week % Skill Check %'
    ORDER BY lessons.id
  `).all(labCourse.id);
  preservedVideoPageRowsBeforeReflow = database.prepare(`
    SELECT lessons.id AS lesson_id, lessons.title
    FROM lessons
    JOIN modules ON modules.id = lessons.module_id
    WHERE modules.course_id = ?
      AND lessons.title LIKE 'Week % Required Lippincott Videos'
    ORDER BY lessons.id
  `).all(labCourse.id);
  database.prepare(`
    UPDATE lessons
    SET content = 'Legacy skill content without its publisher video instructions',
      external_url = NULL
    WHERE id = (
      SELECT lessons.id
      FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      WHERE modules.course_id = ?
        AND lessons.title LIKE 'Week % Skill Check %'
      ORDER BY lessons.id
      LIMIT 1
    )
  `).run(labCourse.id);
  database.prepare(`
    UPDATE lessons
    SET content = 'Legacy incomplete video index', external_url = NULL,
      published = 0, instructor_only = 1
    WHERE id = (
      SELECT lessons.id
      FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      WHERE modules.course_id = ?
        AND lessons.title LIKE 'Week % Required Lippincott Videos'
      ORDER BY lessons.id
      LIMIT 1
    )
  `).run(labCourse.id);
  database.prepare(`
    DELETE FROM lessons
    WHERE id = (
      SELECT lessons.id
      FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      WHERE modules.course_id = ?
        AND modules.title = 'Start Here: PN 107 Lab Orientation'
        AND lessons.title = 'Faculty and School Contact Information'
      LIMIT 1
    )
  `).run(labCourse.id);
  database.prepare(`
    DELETE FROM course_seed_versions
    WHERE course_id = ? AND seed_key IN (
      'pn107-lab:complete-required-lippincott-video-index-v2',
      'pn107-lab:faculty-school-contacts-v1'
    )
  `).run(labCourse.id);
  database.close();
  database = null;

  seed();
  database = new DatabaseSync(databaseFile);
});

test("the Skills Lab directory stores the official school and faculty contacts", () => {
  assert.deepEqual(schoolDirectory.institution, {
    name: "Broward-Miami Health Institute",
    address: "6320 Miramar Pkwy, Suite I, Miramar, FL 33023",
    phone: "954-248-0669",
    email: "support@browardmiamihi.com"
  });
  assert.deepEqual(pn107LabFaculty, [
    {
      firstName: "Stacy",
      lastName: "Milan",
      credentials: "MSN, RN",
      title: "Professor",
      email: "stacy@browardmiamihi.com",
      phone: "954-248-0669"
    },
    {
      firstName: "Marilu",
      lastName: "Suarez",
      credentials: "MSN, FNP",
      title: "Professor",
      email: "marilu.suarez@browardmiamihi.com",
      phone: "954-248-0669"
    },
    {
      firstName: "Dorthia",
      lastName: "Daudier",
      credentials: "MSN-Ed, MHA, APRN, PMHNP-BC, RN, CNML, CCM",
      title: "Director of Nursing",
      email: "dorthia.daudier@browardmiamihi.com",
      phone: "954-248-0669"
    }
  ]);
  assert.ok(pn107LabFaculty.every((faculty) => faculty.phone === schoolDirectory.institution.phone));

  const serializedCourse = JSON.stringify(medicalSurgicalNursingLabCourse);
  const contactContent = pn107LabFacultyContactContent();
  for (const faculty of pn107LabFaculty) {
    assert.ok(serializedCourse.includes(faculty.email), faculty.email);
    assert.ok(contactContent.includes(faculty.email), faculty.email);
  }
  assert.ok(contactContent.includes(schoolDirectory.institution.address));
  assert.ok(contactContent.includes(schoolDirectory.institution.email));
  assert.ok(contactContent.includes(schoolDirectory.institution.phone));
  assert.doesNotMatch(serializedCourse, /sabahadur84@gmail\.com/i);
  assert.doesNotMatch(serializedCourse, /(?:\(954\)\s*558-5174|954-558-5174)/);
});

test("students receive a published PN 107 Lab faculty and school contact page", () => {
  const row = database.prepare(`
    SELECT lessons.content, lessons.item_type, lessons.published,
      lessons.instructor_only, lessons.external_url
    FROM lessons
    JOIN modules ON modules.id = lessons.module_id
    JOIN courses ON courses.id = modules.course_id
    WHERE courses.slug = ?
      AND modules.title = 'Start Here: PN 107 Lab Orientation'
      AND lessons.title = 'Faculty and School Contact Information'
  `).get(labSlug);

  assert.ok(row);
  assert.equal(row.item_type, "page");
  assert.equal(row.published, 1);
  assert.equal(row.instructor_only, 0);
  assert.equal(row.external_url, null);
  for (const faculty of pn107LabFaculty) {
    assert.ok(row.content.includes(`${faculty.firstName} ${faculty.lastName}`));
    assert.ok(row.content.includes(faculty.title));
    assert.ok(row.content.includes(faculty.email));
  }
  assert.ok(row.content.includes(schoolDirectory.institution.address));
  assert.ok(row.content.includes(schoolDirectory.institution.phone));
  assert.ok(row.content.includes(schoolDirectory.institution.email));
  assert.doesNotMatch(row.content, /sabahadur84@gmail\.com/i);
  assert.doesNotMatch(row.content, /(?:\(954\)\s*558-5174|954-558-5174)/);
});

after(() => {
  database?.close();
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
});

test("PN 107 Lab seeds once as a 20-hour, 12-week companion course", () => {
  const courses = database.prepare("SELECT * FROM courses WHERE slug = ?").all(labSlug);
  assert.equal(courses.length, 1);
  assert.equal(courses[0].title, "PN 107 Lab: Medical-Surgical Nursing Skills Lab");
  assert.equal(courses[0].hours, 20);
  assert.match(courses[0].description, /12-week companion shell/i);
  assert.match(courses[0].description, /not additional Practical Nursing program hours/i);

  const modules = database.prepare(`
    SELECT title, position
    FROM modules
    WHERE course_id = ?
    ORDER BY position, id
  `).all(courses[0].id);
  assert.equal(modules.length, 13, "Expected Start Here plus exactly twelve weekly modules");
  assert.equal(modules[0].title, "Start Here: PN 107 Lab Orientation");
  const weeklyModules = modules.filter((module) => /^Week \d+:/.test(module.title));
  assert.equal(weeklyModules.length, 12);
  assert.deepEqual(
    weeklyModules.map((module) => Number(module.title.match(/^Week (\d+):/)[1])),
    Array.from({ length: 12 }, (_, index) => index + 1)
  );
  assert.deepEqual(
    weeklyModules.map((module) => module.title),
    videoCatalog.weeks.map((week) => `Week ${week.week}: ${week.title}`)
  );

  const weeklyLessonCounts = database.prepare(`
    SELECT modules.title, COUNT(lessons.id) AS lesson_count
    FROM modules
    LEFT JOIN lessons ON lessons.module_id = modules.id
    WHERE modules.course_id = ? AND modules.title LIKE 'Week %:%'
    GROUP BY modules.id
    ORDER BY modules.position, modules.id
  `).all(courses[0].id);
  assert.deepEqual(
    weeklyLessonCounts.map((row) => row.lesson_count),
    [9, 5, 5, 2, 5, 3, 5, 3, 5, 5, 9, 5],
    "Each module should contain its complete video index plus selected competency checkoffs"
  );

  const mergedWeekOneTitles = database.prepare(`
    SELECT lessons.title
    FROM lessons JOIN modules ON modules.id = lessons.module_id
    WHERE modules.course_id = ? AND modules.title = ?
    ORDER BY lessons.position, lessons.id
  `).all(courses[0].id, weeklyModules[0].title).map((row) => row.title);
  assert.ok(mergedWeekOneTitles.some((title) => /Alcohol-Based Hand Hygiene/.test(title)));
  assert.ok(mergedWeekOneTitles.some((title) => /Pain Assessment/.test(title)));

  const mergedWeekElevenTitles = database.prepare(`
    SELECT lessons.title
    FROM lessons JOIN modules ON modules.id = lessons.module_id
    WHERE modules.course_id = ? AND modules.title = ?
    ORDER BY lessons.position, lessons.id
  `).all(courses[0].id, weeklyModules[10].title).map((row) => row.title);
  assert.ok(mergedWeekElevenTitles.some((title) => /Neurologic Assessment/.test(title)));
  assert.ok(mergedWeekElevenTitles.some((title) => /Intake Output and Daily Weight/.test(title)));
});

test("the authoritative video catalog contains all 191 unique contiguous skills", () => {
  const videos = videoCatalog.weeks.flatMap((week) => week.videos);
  assert.equal(videoCatalog.durationWeeks, 12);
  assert.equal(videoCatalog.totalVideos, 191);
  assert.equal(videos.length, 191);
  assert.equal(new Set(videos.map((video) => video.code)).size, 191);
  assert.equal(new Set(videos.map((video) => video.title)).size, 191);
  assert.deepEqual(
    videoCatalog.weeks.map((week) => week.videoCount),
    [15, 17, 24, 17, 14, 19, 10, 24, 16, 7, 15, 13]
  );

  for (let topic = 1; topic <= 18; topic += 1) {
    const topicNumbers = videos
      .filter((video) => Number(video.code.split("-")[0]) === topic)
      .map((video) => Number(video.code.split("-")[1]));
    assert.deepEqual(
      topicNumbers,
      Array.from({ length: Math.max(...topicNumbers) }, (_, index) => index + 1),
      `Topic ${topic} should have no missing or out-of-order skill codes`
    );
  }
});

test("each week has one complete published non-graded Lippincott video page", () => {
  const rows = database.prepare(`
    SELECT modules.title AS module_title, lessons.id, lessons.title,
      lessons.content, lessons.external_url, lessons.item_type,
      lessons.grade_item_id, lessons.published, lessons.instructor_only,
      lessons.position
    FROM lessons
    JOIN modules ON modules.id = lessons.module_id
    JOIN courses ON courses.id = modules.course_id
    WHERE courses.slug = ?
      AND lessons.title LIKE 'Week % Required Lippincott Videos'
    ORDER BY modules.position, lessons.position, lessons.id
  `).all(labSlug);

  assert.equal(rows.length, 12);
  assert.equal(new Set(rows.map((row) => row.id)).size, 12);
  rows.forEach((row, index) => {
    const week = videoCatalog.weeks[index];
    assert.equal(row.title, `Week ${week.week} Required Lippincott Videos`);
    assert.equal(row.module_title, `Week ${week.week}: ${week.title}`);
    assert.equal(row.external_url, lippincottGateway);
    assert.equal(row.item_type, "page");
    assert.equal(row.grade_item_id, null);
    assert.equal(row.published, 1);
    assert.equal(row.instructor_only, 0);
    assert.equal(row.position, 1);
    assert.match(row.content, /Open the Videos tab and watch every assigned video in full/i);
    assert.match(row.content, new RegExp(`Required videos: ${week.videoCount}`));
    for (const video of week.videos) {
      assert.ok(
        row.content.includes(`Skill ${video.code}: ${video.title}`),
        `${row.title} is missing ${video.code}: ${video.title}`
      );
    }
  });
});

test("every skill checklist is a safe Lippincott-linked, zero-point completion item", () => {
  const course = database.prepare("SELECT id FROM courses WHERE slug = ?").get(labSlug);
  const rows = database.prepare(`
    SELECT lessons.id, lessons.title, lessons.content, lessons.item_type,
      lessons.external_url, lessons.published, lessons.instructor_only,
      lessons.grade_item_id, grade_items.points_possible,
      grade_items.course_id AS grade_item_course_id
    FROM lessons
    JOIN modules ON modules.id = lessons.module_id
    LEFT JOIN grade_items ON grade_items.id = lessons.grade_item_id
    WHERE modules.course_id = ?
      AND lessons.title LIKE 'Week % Skill Check %'
    ORDER BY modules.position, lessons.position, lessons.id
  `).all(course.id);

  assert.equal(rows.length, 49);
  assert.equal(new Set(rows.map((row) => row.title)).size, 49);
  assert.equal(new Set(rows.map((row) => row.grade_item_id)).size, 49);
  for (const row of rows) {
    assert.equal(row.item_type, "assignment", row.title);
    assert.equal(row.external_url, lippincottGateway, row.title);
    assert.equal(new URL(row.external_url).protocol, "https:", row.title);
    assert.equal(row.published, 1, row.title);
    assert.equal(row.instructor_only, 0, row.title);
    assert.match(row.content, /Open the BMHI Skills Lab course and Lippincott Skills for Nursing Education 2\.0/i, row.title);
    assert.match(row.content, /Search for:\s*\S+/i, row.title);
    assert.match(row.content, /watch the assigned video/i, row.title);
    assert.ok(row.grade_item_id, `${row.title} should link to a grade item`);
    assert.equal(row.grade_item_course_id, course.id, row.title);
    assert.equal(row.points_possible, 0, row.title);
  }
});

test("students have one published Lippincott video-finder resource", () => {
  const row = database.prepare(`
    SELECT lessons.content, lessons.external_url, lessons.published,
      lessons.instructor_only
    FROM lessons
    JOIN modules ON modules.id = lessons.module_id
    JOIN courses ON courses.id = modules.course_id
    WHERE courses.slug = ?
      AND lessons.title = 'Open Lippincott Skills and Find Assigned Videos'
  `).get(labSlug);

  assert.ok(row);
  assert.equal(row.external_url, lippincottGateway);
  assert.equal(row.published, 1);
  assert.equal(row.instructor_only, 0);
  assert.match(row.content, /all 191 enumerated skill videos/i);
  assert.match(row.content, /Open the Videos tab/i);
});

test("the targeted 12-week reflow preserves existing lesson and grade-item IDs", () => {
  const course = database.prepare("SELECT id FROM courses WHERE slug = ?").get(labSlug);
  const rowsAfterReflow = database.prepare(`
    SELECT lessons.id AS lesson_id, lessons.grade_item_id
    FROM lessons
    JOIN modules ON modules.id = lessons.module_id
    WHERE modules.course_id = ?
      AND lessons.title LIKE 'Week % Skill Check %'
    ORDER BY lessons.id
  `).all(course.id);

  const beforeByLessonId = new Map(
    preservedLabRowsBeforeReflow.map((row) => [row.lesson_id, row.grade_item_id])
  );
  assert.equal(beforeByLessonId.size, 49);
  for (const row of rowsAfterReflow) {
    if (!beforeByLessonId.has(row.lesson_id)) continue;
    assert.equal(row.grade_item_id, beforeByLessonId.get(row.lesson_id));
  }
  const videoPagesAfterReflow = database.prepare(`
    SELECT lessons.id AS lesson_id, lessons.title
    FROM lessons
    JOIN modules ON modules.id = lessons.module_id
    WHERE modules.course_id = ?
      AND lessons.title LIKE 'Week % Required Lippincott Videos'
    ORDER BY lessons.id
  `).all(course.id);
  assert.deepEqual(videoPagesAfterReflow, preservedVideoPageRowsBeforeReflow);
  assert.equal(
    database.prepare(`
      SELECT COUNT(*) AS count FROM course_seed_versions
      WHERE course_id = ? AND seed_key = 'pn107-lab:complete-required-lippincott-video-index-v2'
    `).get(course.id).count,
    1
  );
  assert.equal(
    database.prepare(`
      SELECT COUNT(*) AS count FROM course_seed_versions
      WHERE course_id = ? AND seed_key = 'pn107-lab:faculty-school-contacts-v1'
    `).get(course.id).count,
    1
  );
});

test("the official 12-week syllabus is available as a nonempty PDF", () => {
  const syllabusPath = path.join(
    projectRoot,
    "course_materials",
    labSlug,
    "PN107-Lab-Syllabus-12-Weeks.pdf"
  );
  assert.equal(fs.existsSync(syllabusPath), true);
  assert.ok(fs.statSync(syllabusPath).size > 1_000);

  const lesson = database.prepare(`
    SELECT lessons.external_url
    FROM lessons JOIN modules ON modules.id = lessons.module_id
    JOIN courses ON courses.id = modules.course_id
    WHERE courses.slug = ? AND lessons.title = 'Official PN 107 Lab 12-Week Syllabus'
  `).get(labSlug);
  assert.equal(
    lesson.external_url,
    "/course-materials/medical-surgical-nursing-i-pn107-lab/PN107-Lab-Syllabus-12-Weeks.pdf"
  );
});

test("the portal QA student receives one hidden PN 107 Lab enrollment without a cohort", () => {
  const student = database.prepare(`
    SELECT id, cohort_name, cohort_start_date, cohort_end_date, gradebook_hidden
    FROM users WHERE email = 'teststudent@browardmiamihi.com'
  `).get();
  assert.ok(student);
  assert.equal(student.cohort_name, null);
  assert.equal(student.cohort_start_date, null);
  assert.equal(student.cohort_end_date, null);
  assert.equal(student.gradebook_hidden, 1);

  const rows = database.prepare(`
    SELECT enrollments.status, enrollments.withdrawn_at
    FROM enrollments JOIN courses ON courses.id = enrollments.course_id
    WHERE enrollments.user_id = ? AND courses.slug = ?
  `).all(student.id, labSlug);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "active");
  assert.equal(rows[0].withdrawn_at, null);
});

test("active PN 107 theory students auto-enroll once while withdrawn lab records stay withdrawn", () => {
  const labCourse = database.prepare("SELECT id FROM courses WHERE slug = ?").get(labSlug);
  const activeRows = database.prepare(`
    SELECT status, withdrawn_at, source
    FROM enrollments
    WHERE user_id = ? AND course_id = ?
  `).all(activeTheoryStudentId, labCourse.id);
  assert.equal(activeRows.length, 1);
  assert.equal(activeRows[0].status, "active");
  assert.equal(activeRows[0].withdrawn_at, null);
  assert.equal(activeRows[0].source, "linked-course");

  const withdrawnRows = database.prepare(`
    SELECT status, withdrawn_at, withdrawal_reason
    FROM enrollments
    WHERE user_id = ? AND course_id = ?
  `).all(withdrawnLabStudentId, labCourse.id);
  assert.equal(withdrawnRows.length, 1);
  assert.equal(withdrawnRows[0].status, "withdrawn");
  assert.equal(withdrawnRows[0].withdrawn_at, "2026-10-10 12:00:00");
  assert.equal(withdrawnRows[0].withdrawal_reason, "Test withdrawal");
});
