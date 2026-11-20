const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

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
  database.prepare(`
    DELETE FROM course_seed_versions
    WHERE course_id = ? AND seed_key = 'pn107-lab:merge-source-weeks-1-2-and-12-13-v1'
  `).run(labCourse.id);
  database.close();
  database = null;

  seed();
  database = new DatabaseSync(databaseFile);
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
  assert.equal(
    weeklyModules[0].title,
    "Week 1: Asepsis, Infection Control, Safety, Vital Signs, and Pain Assessment"
  );
  assert.equal(weeklyModules[1].title, "Week 2: Health Assessment Safety and Communication");
  assert.equal(weeklyModules[8].title, "Week 9: Urinary and Renal Care");
  assert.equal(weeklyModules[9].title, "Week 10: Musculoskeletal Care");
  assert.equal(weeklyModules[10].title, "Week 11: Skin Integrity, Wound, and Perioperative Care");
  assert.equal(weeklyModules[11].title, "Week 12: Integrated Medical-Surgical Competency");

  const weeklyLessonCounts = database.prepare(`
    SELECT modules.title, COUNT(lessons.id) AS lesson_count
    FROM modules
    LEFT JOIN lessons ON lessons.module_id = modules.id
    WHERE modules.course_id = ? AND modules.title LIKE 'Week %:%'
    GROUP BY modules.id
    ORDER BY modules.position, modules.id
  `).all(courses[0].id);
  assert.equal(weeklyLessonCounts[0].lesson_count, 8, "Merged Week 1 should contain source Weeks 1 and 2");
  assert.equal(weeklyLessonCounts[8].lesson_count, 2, "Week 9 should contain the urinary and renal block");
  assert.equal(weeklyLessonCounts[9].lesson_count, 2, "Week 10 should contain the musculoskeletal block");
  assert.equal(weeklyLessonCounts[10].lesson_count, 5, "Merged Week 11 should include perioperative safety");

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
  assert.ok(mergedWeekElevenTitles.some((title) => /Preoperative and Postoperative Safety Checks/.test(title)));
});

test("every skill checklist is a safe Lippincott-linked, zero-point completion item", () => {
  const course = database.prepare("SELECT id FROM courses WHERE slug = ?").get(labSlug);
  const rows = database.prepare(`
    SELECT lessons.id, lessons.title, lessons.item_type, lessons.external_url,
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
    assert.ok(row.grade_item_id, `${row.title} should link to a grade item`);
    assert.equal(row.grade_item_course_id, course.id, row.title);
    assert.equal(row.points_possible, 0, row.title);
  }
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
  assert.equal(
    database.prepare(`
      SELECT COUNT(*) AS count FROM course_seed_versions
      WHERE course_id = ? AND seed_key = 'pn107-lab:merge-source-weeks-1-2-and-12-13-v1'
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
