const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");

function initializeDatabase(databaseFile) {
  execFileSync(process.execPath, ["--no-warnings", "-e", "require('./src/db').initialize()"], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_FILE: databaseFile, NODE_ENV: "test" }
  });
}

test("catalog seed changes preserve grades in courses with enrollments", () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-grade-preservation-"));
  const databaseFile = path.join(temporaryDirectory, "grades.sqlite");

  try {
    initializeDatabase(databaseFile);
    const database = new DatabaseSync(databaseFile);
    const row = database.prepare(`
      SELECT e.id AS enrollment_id, e.course_id, gi.id AS grade_item_id
      FROM enrollments e
      JOIN grade_items gi ON gi.course_id = e.course_id
      JOIN course_seed_versions csv ON csv.course_id = e.course_id
      ORDER BY e.id, gi.id
      LIMIT 1
    `).get();
    assert.ok(row, "Expected a seeded enrollment and grade item");

    database.prepare(`
      INSERT INTO grades (enrollment_id, grade_item_id, score, note)
      VALUES (?, ?, 88, 'Completed quiz score')
    `).run(row.enrollment_id, row.grade_item_id);
    database.prepare("DELETE FROM course_seed_versions WHERE course_id = ?").run(row.course_id);
    database.close();

    initializeDatabase(databaseFile);
    const reopened = new DatabaseSync(databaseFile);
    const grade = reopened.prepare(`
      SELECT score, note FROM grades
      WHERE enrollment_id = ? AND grade_item_id = ?
    `).get(row.enrollment_id, row.grade_item_id);
    const seedVersion = reopened.prepare("SELECT id FROM course_seed_versions WHERE course_id = ?").get(row.course_id);
    reopened.close();

    assert.equal(grade?.score, 88);
    assert.equal(grade?.note, "Completed quiz score");
    assert.ok(seedVersion, "Expected the protected live course to record the current seed version");
  } finally {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});

test("startup cleanup preserves historical PN 104 discussions and the legacy PN 102 final when student records exist", () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-legacy-grade-preservation-"));
  const databaseFile = path.join(temporaryDirectory, "grades.sqlite");

  try {
    initializeDatabase(databaseFile);
    const database = new DatabaseSync(databaseFile);
    const pn104 = database.prepare(`
      SELECT c.id AS course_id, e.id AS enrollment_id, e.user_id, m.id AS module_id
      FROM courses c
      JOIN enrollments e ON e.course_id = c.id
      JOIN modules m ON m.course_id = c.id
      WHERE c.slug = 'anatomy-and-physiology'
      ORDER BY e.id, m.position, m.id
      LIMIT 1
    `).get();
    const pn102 = database.prepare(`
      SELECT c.id AS course_id, e.id AS enrollment_id
      FROM courses c
      JOIN enrollments e ON e.course_id = c.id
      WHERE c.slug = 'introduction-to-nursing-practical-nursing'
      ORDER BY e.id
      LIMIT 1
    `).get();
    assert.ok(pn104);
    assert.ok(pn102);

    const historicalDiscussionTitle = "[PN104 2026] Week 99 Discussion: Historical Student Record";
    const discussionGradeItemId = Number(database.prepare(`
      INSERT INTO grade_items (course_id, title, points_possible, due_date)
      VALUES (?, ?, 10, '2026-06-01')
    `).run(pn104.course_id, historicalDiscussionTitle).lastInsertRowid);
    const discussionLessonId = Number(database.prepare(`
      INSERT INTO lessons (
        module_id, title, content, duration_minutes, position, published,
        instructor_only, item_type, grade_item_id
      ) VALUES (?, ?, 'Historical discussion', 30, 999, 1, 0, 'discussion', ?)
    `).run(pn104.module_id, historicalDiscussionTitle, discussionGradeItemId).lastInsertRowid);
    database.prepare(`
      INSERT INTO grades (enrollment_id, grade_item_id, score, note)
      VALUES (?, ?, 9, 'Historical discussion grade')
    `).run(pn104.enrollment_id, discussionGradeItemId);
    const discussionTopicId = Number(database.prepare(`
      INSERT INTO discussion_topics (
        course_id, title, prompt, points_possible, status, source_external_id
      ) VALUES (?, ?, 'Historical discussion prompt', 10, 'published', ?)
    `).run(
      pn104.course_id,
      historicalDiscussionTitle,
      "anatomy-and-physiology:discussion:99"
    ).lastInsertRowid);
    database.prepare(`
      INSERT INTO discussion_entries (topic_id, user_id, author_name, body, source)
      VALUES (?, ?, 'Historical Student', 'Historical discussion response', 'portal')
    `).run(discussionTopicId, pn104.user_id);

    const legacyFinalTitle = "[PN102 2026] Final Exam - Introduction to Nursing Chapters 1-6";
    const legacyFinalGradeItemId = Number(database.prepare(`
      INSERT INTO grade_items (course_id, title, points_possible, due_date)
      VALUES (?, ?, 100, '2026-08-01')
    `).run(pn102.course_id, legacyFinalTitle).lastInsertRowid);
    database.prepare(`
      INSERT INTO grades (enrollment_id, grade_item_id, score, note)
      VALUES (?, ?, 88, 'Historical final grade')
    `).run(pn102.enrollment_id, legacyFinalGradeItemId);
    database.close();

    initializeDatabase(databaseFile);
    const reopened = new DatabaseSync(databaseFile);
    const discussionGrade = reopened.prepare(`
      SELECT score, note FROM grades
      WHERE enrollment_id = ? AND grade_item_id = ?
    `).get(pn104.enrollment_id, discussionGradeItemId);
    const discussionLesson = reopened.prepare(`
      SELECT published, instructor_only FROM lessons WHERE id = ?
    `).get(discussionLessonId);
    const discussionTopic = reopened.prepare(`
      SELECT status FROM discussion_topics WHERE id = ?
    `).get(discussionTopicId);
    const discussionEntryCount = reopened.prepare(`
      SELECT COUNT(*) AS count FROM discussion_entries WHERE topic_id = ?
    `).get(discussionTopicId).count;
    const legacyFinalGrade = reopened.prepare(`
      SELECT score, note FROM grades
      WHERE enrollment_id = ? AND grade_item_id = ?
    `).get(pn102.enrollment_id, legacyFinalGradeItemId);
    reopened.close();

    assert.deepEqual({ ...discussionGrade }, { score: 9, note: "Historical discussion grade" });
    assert.deepEqual({ ...discussionLesson }, { published: 0, instructor_only: 1 });
    assert.deepEqual({ ...discussionTopic }, { status: "closed" });
    assert.equal(discussionEntryCount, 1);
    assert.deepEqual({ ...legacyFinalGrade }, { score: 88, note: "Historical final grade" });
  } finally {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});
