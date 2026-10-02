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

test("PN101 duplicate assessments retain grades, submissions, attempts, and audit history", () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-pn101-assessment-dedup-"));
  const databaseFile = path.join(temporaryDirectory, "pn101.sqlite");

  try {
    initializeDatabase(databaseFile);
    let database = new DatabaseSync(databaseFile);
    database.exec("PRAGMA foreign_keys = ON;");

    const title = "[PN101 2026] Quiz 1 - Chapter 1: Basic Word Structure";
    const originalLesson = database.prepare(`
      SELECT l.*
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE c.slug = 'medical-terminology' AND l.title = ?
      ORDER BY l.id
      LIMIT 1
    `).get(title);
    assert.ok(originalLesson?.grade_item_id, "Expected the seeded quiz to have a gradebook link");

    const enrollments = database.prepare(`
      SELECT e.id
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE c.slug = 'medical-terminology'
      ORDER BY e.id
      LIMIT 2
    `).all();
    assert.equal(enrollments.length, 2, "Expected two PN101 enrollments in the seed fixture");
    const [firstEnrollment, secondEnrollment] = enrollments;

    const duplicateGradeItemId = Number(database.prepare(`
      INSERT INTO grade_items (course_id, title, points_possible, due_date, allowed_student_email)
      SELECT course_id, title, points_possible, due_date, allowed_student_email
      FROM grade_items
      WHERE id = ?
    `).run(originalLesson.grade_item_id).lastInsertRowid);
    const duplicateLessonId = Number(database.prepare(`
      INSERT INTO lessons (
        module_id, title, content, external_url, duration_minutes, position,
        published, instructor_only, item_type, grade_item_id, allowed_student_email
      )
      SELECT module_id, title, content, external_url, duration_minutes, position + 1,
        published, instructor_only, item_type, ?, allowed_student_email
      FROM lessons
      WHERE id = ?
    `).run(duplicateGradeItemId, originalLesson.id).lastInsertRowid);

    database.prepare(`
      INSERT INTO grades (enrollment_id, grade_item_id, score, note, updated_at)
      VALUES (?, ?, 7, 'older score', '2026-09-01 12:00:00')
    `).run(firstEnrollment.id, originalLesson.grade_item_id);
    database.prepare(`
      INSERT INTO grades (enrollment_id, grade_item_id, score, note, updated_at)
      VALUES (?, ?, 9, 'higher retake score', '2026-09-30 12:00:00')
    `).run(firstEnrollment.id, duplicateGradeItemId);
    database.prepare(`
      INSERT INTO grades (enrollment_id, grade_item_id, score, note, updated_at)
      VALUES (?, ?, 8, 'second student score', '2026-09-30 13:00:00')
    `).run(secondEnrollment.id, duplicateGradeItemId);
    database.prepare(`
      INSERT INTO assignment_submissions (
        grade_item_id, enrollment_id, file_storage_name, file_original_name,
        file_mime_type, file_size, student_note, submitted_at, updated_at
      ) VALUES (?, ?, 'pn101-work.txt', 'pn101-work.txt', 'text/plain', 12,
        'Preserve this submission', '2026-09-29 09:00:00', '2026-09-29 09:00:00')
    `).run(originalLesson.grade_item_id, secondEnrollment.id);
    database.prepare(`
      INSERT INTO assignment_rubrics (grade_item_id, rubric_json, updated_at)
      VALUES (?, '{"criteria":[]}', '2026-09-29 09:00:00')
    `).run(originalLesson.grade_item_id);

    database.prepare(`
      INSERT INTO lesson_completions (enrollment_id, lesson_id, completed_at)
      VALUES (?, ?, '2026-09-30 12:30:00')
    `).run(firstEnrollment.id, duplicateLessonId);
    database.prepare(`
      INSERT INTO exam_attempts (enrollment_id, lesson_id, started_at, expires_at, status)
      VALUES (?, ?, '2026-09-01 10:00:00', '2026-09-01 10:30:00', 'in_progress')
    `).run(firstEnrollment.id, originalLesson.id);
    database.prepare(`
      INSERT INTO exam_attempts (enrollment_id, lesson_id, started_at, expires_at, submitted_at, status)
      VALUES (?, ?, '2026-09-30 10:00:00', '2026-09-30 10:30:00', '2026-09-30 10:15:00', 'submitted')
    `).run(firstEnrollment.id, duplicateLessonId);
    database.prepare(`
      INSERT INTO exam_attempts (enrollment_id, lesson_id, started_at, expires_at, submitted_at, status)
      VALUES (?, ?, '2026-09-01 10:00:00', '2026-09-01 10:30:00', '2026-09-01 10:15:00', 'submitted')
    `).run(secondEnrollment.id, originalLesson.id);
    database.prepare(`
      INSERT INTO exam_attempts (enrollment_id, lesson_id, started_at, expires_at, status)
      VALUES (?, ?, '2026-10-01 10:00:00', '2099-10-01 10:30:00', 'in_progress')
    `).run(secondEnrollment.id, duplicateLessonId);
    database.prepare(`
      INSERT INTO exam_access_overrides (
        enrollment_id, lesson_id, opens_at, closes_at, minutes, reason, created_at
      ) VALUES (?, ?, '2026-09-01T00:00:00-04:00', '2099-12-31T23:59:59-04:00', 30,
        'Superseded broad window', '2026-09-01 09:00:00')
    `).run(firstEnrollment.id, originalLesson.id);
    database.prepare(`
      INSERT INTO exam_access_overrides (
        enrollment_id, lesson_id, opens_at, closes_at, minutes, reason, created_at
      ) VALUES (?, ?, '2026-09-30T00:00:00-04:00', '2026-10-15T23:59:59-04:00', 30,
        'Completion extension', '2026-10-01 09:00:00')
    `).run(firstEnrollment.id, duplicateLessonId);
    database.prepare(`
      INSERT INTO assessment_reopen_audit (
        enrollment_id, lesson_id, grade_item_id, previous_score, previous_note,
        previous_attempt_status, closes_at, reason
      ) VALUES (?, ?, ?, 9, 'higher retake score', 'submitted', '2026-10-15T23:59:59-04:00', 'Completion extension')
    `).run(firstEnrollment.id, duplicateLessonId, originalLesson.grade_item_id);
    database.prepare(`
      INSERT INTO quiz_attempt_history (
        enrollment_id, lesson_id, grade_item_id, attempt_number, score, correct_answers, total_questions
      ) VALUES (?, ?, ?, 1, 7, 7, 10)
    `).run(firstEnrollment.id, originalLesson.id, originalLesson.grade_item_id);
    database.prepare(`
      INSERT INTO quiz_attempt_history (
        enrollment_id, lesson_id, grade_item_id, attempt_number, score, correct_answers, total_questions
      ) VALUES (?, ?, ?, 1, 9, 9, 10)
    `).run(firstEnrollment.id, duplicateLessonId, duplicateGradeItemId);
    database.prepare(`
      INSERT INTO quiz_attempt_history (
        enrollment_id, lesson_id, grade_item_id, attempt_number, score, correct_answers, total_questions
      ) VALUES (?, ?, ?, 2, 8, 8, 10)
    `).run(firstEnrollment.id, duplicateLessonId, duplicateGradeItemId);
    database.close();

    initializeDatabase(databaseFile);
    database = new DatabaseSync(databaseFile);
    database.exec("PRAGMA foreign_keys = ON;");

    const lessons = database.prepare(`
      SELECT l.id, l.grade_item_id
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE c.slug = 'medical-terminology' AND l.title = ?
    `).all(title);
    assert.equal(lessons.length, 1);
    assert.equal(lessons[0].id, originalLesson.id);
    assert.equal(lessons[0].grade_item_id, duplicateGradeItemId);

    const gradeItems = database.prepare(`
      SELECT gi.id
      FROM grade_items gi
      JOIN courses c ON c.id = gi.course_id
      WHERE c.slug = 'medical-terminology' AND gi.title = ?
    `).all(title);
    assert.deepEqual(gradeItems.map((item) => item.id), [duplicateGradeItemId]);
    assert.deepEqual(
      database.prepare(`
        SELECT enrollment_id, score FROM grades WHERE grade_item_id = ? ORDER BY enrollment_id
      `).all(duplicateGradeItemId).map((row) => ({ ...row })),
      [
        { enrollment_id: firstEnrollment.id, score: 9 },
        { enrollment_id: secondEnrollment.id, score: 8 }
      ]
    );

    const submission = database.prepare(`
      SELECT grade_item_id, student_note FROM assignment_submissions WHERE enrollment_id = ? AND grade_item_id = ?
    `).get(secondEnrollment.id, duplicateGradeItemId);
    assert.equal(submission.student_note, "Preserve this submission");
    assert.equal(
      database.prepare("SELECT COUNT(*) AS count FROM assignment_rubrics WHERE grade_item_id = ?").get(duplicateGradeItemId).count,
      1
    );
    assert.equal(
      database.prepare("SELECT COUNT(*) AS count FROM lesson_completions WHERE enrollment_id = ? AND lesson_id = ?").get(firstEnrollment.id, originalLesson.id).count,
      1
    );

    const attempt = database.prepare(`
      SELECT status, submitted_at FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
    `).get(firstEnrollment.id, originalLesson.id);
    assert.equal(attempt.status, "submitted");
    assert.equal(attempt.submitted_at, "2026-09-30 10:15:00");
    const activeRetake = database.prepare(`
      SELECT status, started_at, expires_at FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
    `).get(secondEnrollment.id, originalLesson.id);
    assert.equal(activeRetake.status, "in_progress");
    assert.equal(activeRetake.started_at, "2026-10-01 10:00:00");
    assert.equal(activeRetake.expires_at, "2099-10-01 10:30:00");
    const override = database.prepare(`
      SELECT closes_at, reason FROM exam_access_overrides WHERE enrollment_id = ? AND lesson_id = ?
    `).get(firstEnrollment.id, originalLesson.id);
    assert.deepEqual({ ...override }, {
      closes_at: "2026-10-15T23:59:59-04:00",
      reason: "Completion extension"
    });

    const audit = database.prepare(`
      SELECT lesson_id, grade_item_id FROM assessment_reopen_audit WHERE enrollment_id = ?
    `).get(firstEnrollment.id);
    assert.deepEqual({ ...audit }, { lesson_id: originalLesson.id, grade_item_id: duplicateGradeItemId });
    const history = database.prepare(`
      SELECT lesson_id, grade_item_id, attempt_number, score
      FROM quiz_attempt_history
      WHERE enrollment_id = ?
      ORDER BY attempt_number
    `).all(firstEnrollment.id).map((row) => ({ ...row }));
    assert.deepEqual(history, [
      { lesson_id: originalLesson.id, grade_item_id: duplicateGradeItemId, attempt_number: 1, score: 7 },
      { lesson_id: originalLesson.id, grade_item_id: duplicateGradeItemId, attempt_number: 2, score: 9 },
      { lesson_id: originalLesson.id, grade_item_id: duplicateGradeItemId, attempt_number: 3, score: 8 }
    ]);
    database.close();
  } finally {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});
