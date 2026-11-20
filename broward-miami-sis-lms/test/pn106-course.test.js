const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const pharmacologyCourse = require('../src/pharmacologyCourseData.json');

function pn106Lessons(db, courseId) {
  return db.prepare(`
    SELECT l.*, m.title AS module_title
    FROM lessons l JOIN modules m ON m.id = l.module_id
    WHERE m.course_id = ?
    ORDER BY l.id
  `).all(courseId);
}

function assertChapterCaseStudies(lessons) {
  const caseStudies = lessons.filter((lesson) => /^Chapter \d+ Case Study:/.test(lesson.title));
  assert.equal(caseStudies.length, 54);
  assert.deepEqual(
    caseStudies.map((lesson) => Number(lesson.title.match(/^Chapter (\d+)/)[1])).sort((a, b) => a - b),
    Array.from({ length: 54 }, (_, index) => index + 1)
  );
  assert.equal(new Set(caseStudies.map((lesson) => lesson.title)).size, 54);

  for (const weeklyModule of pharmacologyCourse.weeklyModules) {
    const weeklyCases = caseStudies.filter((lesson) => lesson.module_title.startsWith(`Week ${weeklyModule.week}:`));
    assert.deepEqual(
      weeklyCases.map((lesson) => Number(lesson.title.match(/^Chapter (\d+)/)[1])).sort((a, b) => a - b),
      weeklyModule.chapters
    );
    assert.deepEqual(
      weeklyCases.map((lesson) => lesson.position).sort((a, b) => a - b),
      weeklyModule.chapters.map((_, index) => 4 + (index * 2))
    );
  }

  for (const caseStudy of caseStudies) {
    assert.equal(caseStudy.item_type, 'assignment');
    assert.ok(caseStudy.grade_item_id);
    assert.match(caseStudy.content, /Original BMHI Case Study/);
    assert.match(caseStudy.content, /assigned Lippincott chapter/);
    assert.match(caseStudy.content, /Scenario/);
    assert.match(caseStudy.content, /Student response/);
    assert.match(caseStudy.content, /not copied from publisher case-study text/i);
  }

  return caseStudies;
}

function assertInstructorGuides(lessons) {
  const guides = lessons.filter((lesson) => /^Chapter \d+ Instructor Answer Guide:/.test(lesson.title));
  assert.equal(guides.length, 54);
  assert.deepEqual(
    guides.map((lesson) => Number(lesson.title.match(/^Chapter (\d+)/)[1])).sort((a, b) => a - b),
    Array.from({ length: 54 }, (_, index) => index + 1)
  );
  for (const weeklyModule of pharmacologyCourse.weeklyModules) {
    const weeklyGuides = guides.filter((lesson) => lesson.module_title.startsWith(`Week ${weeklyModule.week}:`));
    assert.deepEqual(
      weeklyGuides.map((lesson) => lesson.position).sort((a, b) => a - b),
      weeklyModule.chapters.map((_, index) => 5 + (index * 2))
    );
  }
  for (const guide of guides) {
    assert.equal(guide.item_type, 'page');
    assert.equal(guide.instructor_only, 1);
    assert.equal(guide.grade_item_id, null);
    assert.match(guide.content, /Instructor-only material/);
    assert.match(guide.content, /not visible in the student portal/i);
    assert.match(guide.content, /Expected response elements/);
  }
  return guides;
}

test('PN106 adds one case study per chapter and preserves legacy academic records on restart', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pn106-seed-test-'));
  const databaseFile = path.join(directory, 'test.sqlite');
  const seed = () => {
    const result = spawnSync(process.execPath, ['--no-warnings', 'src/seed.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_FILE: databaseFile },
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
  };

  try {
    seed();
    let db = new DatabaseSync(databaseFile);
    const savedCourse = db.prepare('SELECT * FROM courses WHERE slug = ?')
      .get('introductory-clinical-pharmacology-pn106');
    assert.equal(savedCourse.hours, 90);
    assert.equal(savedCourse.published, 1);

    const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position').all(savedCourse.id);
    assert.equal(modules.length, 13);
    assert.match(modules.at(-1).title, /^Week 12:/);

    let lessons = pn106Lessons(db, savedCourse.id);
    assert.equal(lessons.length, 173);
    assert.equal(lessons.filter((lesson) => lesson.instructor_only).length, 55);
    assert.equal(lessons.filter((lesson) => lesson.item_type === 'assignment' && lesson.grade_item_id).length, 78);
    const caseStudies = assertChapterCaseStudies(lessons);
    const instructorGuides = assertInstructorGuides(lessons);
    const reflections = lessons.filter((lesson) => /^Week \d+ Case Study Reflection and Completion Check$/.test(lesson.title));
    assert.equal(reflections.length, 12);
    assert.equal(lessons.filter((lesson) => /Case Studies and Learning Reflection/.test(lesson.title)).length, 0);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM video_assignments WHERE course_id = ?').get(savedCourse.id).count, 12);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM grade_items WHERE course_id = ?').get(savedCourse.id).count, 78);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM grade_items WHERE course_id = ? AND points_possible <> 0').get(savedCourse.id).count, 0);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);

    const student = db.prepare("SELECT id FROM users WHERE role='student' LIMIT 1").get();
    const enrollmentId = Number(db.prepare('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)')
      .run(student.id, savedCourse.id).lastInsertRowid);
    const reflection = reflections[0];
    const reflectionGradeItemId = reflection.grade_item_id;
    db.prepare('INSERT INTO grades (enrollment_id, grade_item_id, score, note) VALUES (?, ?, 0, ?)')
      .run(enrollmentId, reflectionGradeItemId, 'Instructor reviewed legacy reflection');
    db.prepare(`
      INSERT INTO assignment_submissions
        (grade_item_id, enrollment_id, file_storage_name, file_original_name, file_mime_type, file_size, student_note)
      VALUES (?, ?, 'legacy.txt', 'legacy.txt', 'text/plain', 12, ?)
    `).run(reflectionGradeItemId, enrollmentId, 'Legacy weekly case response');
    const orientation = lessons.find((lesson) => lesson.module_title.startsWith('Start Here:'));
    db.prepare('INSERT INTO lesson_completions (enrollment_id, lesson_id) VALUES (?, ?)')
      .run(enrollmentId, orientation.id);

    // Simulate the deployed 65-lesson version: retain the weekly assignment and
    // its records, restore its legacy title, and remove only the new unsubmitted
    // chapter cases. The next seed must reconcile this database in place.
    const legacyReflectionTitle = 'Week 1 Case Studies and Learning Reflection';
    db.prepare('UPDATE lessons SET title = ? WHERE id = ?').run(legacyReflectionTitle, reflection.id);
    db.prepare('UPDATE grade_items SET title = ? WHERE id = ?').run(legacyReflectionTitle, reflectionGradeItemId);
    for (const caseStudy of caseStudies) {
      db.prepare('DELETE FROM lessons WHERE id = ?').run(caseStudy.id);
      db.prepare('DELETE FROM grade_items WHERE id = ?').run(caseStudy.grade_item_id);
    }
    for (const guide of instructorGuides) {
      db.prepare('DELETE FROM lessons WHERE id = ?').run(guide.id);
    }
    const legacyLessonIds = pn106Lessons(db, savedCourse.id).map((lesson) => lesson.id);
    assert.equal(legacyLessonIds.length, 65);
    db.close();

    seed();
    db = new DatabaseSync(databaseFile);
    lessons = pn106Lessons(db, savedCourse.id);
    assert.equal(lessons.length, 173);
    assertChapterCaseStudies(lessons);
    assertInstructorGuides(lessons);
    for (const legacyLessonId of legacyLessonIds) {
      assert.ok(lessons.some((lesson) => lesson.id === legacyLessonId), `legacy lesson ${legacyLessonId} was replaced`);
    }
    const migratedReflection = lessons.find((lesson) => lesson.id === reflection.id);
    assert.equal(migratedReflection.title, 'Week 1 Case Study Reflection and Completion Check');
    assert.equal(migratedReflection.grade_item_id, reflectionGradeItemId);
    assert.equal(
      db.prepare('SELECT note FROM grades WHERE enrollment_id = ? AND grade_item_id = ?')
        .get(enrollmentId, reflectionGradeItemId).note,
      'Instructor reviewed legacy reflection'
    );
    assert.equal(
      db.prepare('SELECT student_note FROM assignment_submissions WHERE enrollment_id = ? AND grade_item_id = ?')
        .get(enrollmentId, reflectionGradeItemId).student_note,
      'Legacy weekly case response'
    );
    assert.equal(db.prepare('SELECT COUNT(*) count FROM lesson_completions WHERE enrollment_id = ?').get(enrollmentId).count, 1);

    const migratedCase = lessons.find((lesson) => /^Chapter 1 Case Study:/.test(lesson.title));
    const migratedGuide = lessons.find((lesson) => /^Chapter 1 Instructor Answer Guide:/.test(lesson.title));
    db.prepare(`
      INSERT INTO assignment_completion_statuses (enrollment_id, grade_item_id, status, note)
      VALUES (?, ?, 'completed', 'Chapter case complete')
    `).run(enrollmentId, migratedCase.grade_item_id);
    db.prepare("UPDATE lessons SET content = 'Instructor customized case prompt', published = 0 WHERE id = ?")
      .run(migratedCase.id);
    db.prepare("UPDATE lessons SET content = 'Instructor customized private guide', published = 0 WHERE id = ?")
      .run(migratedGuide.id);
    db.prepare("UPDATE lessons SET content = 'Instructor customized reflection', published = 0 WHERE id = ?")
      .run(migratedReflection.id);
    const migratedLessonIds = lessons.map((lesson) => lesson.id);
    db.close();

    seed();
    db = new DatabaseSync(databaseFile);
    lessons = pn106Lessons(db, savedCourse.id);
    assert.deepEqual(lessons.map((lesson) => lesson.id), migratedLessonIds);
    assert.equal(lessons.filter((lesson) => /^Chapter \d+ Case Study:/.test(lesson.title)).length, 54);
    assert.equal(lessons.filter((lesson) => /^Chapter \d+ Instructor Answer Guide:/.test(lesson.title)).length, 54);
    const preservedCase = lessons.find((lesson) => lesson.id === migratedCase.id);
    const preservedGuide = lessons.find((lesson) => lesson.id === migratedGuide.id);
    const preservedReflection = lessons.find((lesson) => lesson.id === migratedReflection.id);
    assert.equal(preservedCase.content, 'Instructor customized case prompt');
    assert.equal(preservedCase.published, 0);
    assert.equal(preservedGuide.content, 'Instructor customized private guide');
    assert.equal(preservedGuide.published, 0);
    assert.equal(preservedGuide.instructor_only, 1);
    assert.equal(preservedReflection.content, 'Instructor customized reflection');
    assert.equal(preservedReflection.published, 0);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM grade_items WHERE course_id = ?').get(savedCourse.id).count, 78);
    assert.equal(
      db.prepare('SELECT status FROM assignment_completion_statuses WHERE enrollment_id = ? AND grade_item_id = ?')
        .get(enrollmentId, migratedCase.grade_item_id).status,
      'completed'
    );
    assert.equal(db.prepare('SELECT COUNT(*) count FROM video_assignments WHERE course_id = ?').get(savedCourse.id).count, 12);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    db.close();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
