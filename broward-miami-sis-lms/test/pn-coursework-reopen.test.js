const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const { courses } = require("../src/catalog");
const {
  PN_COURSE_SLUGS,
  PN_COURSEWORK_REOPEN_SEED_KEY,
  canonicalReopenableTaskTitles,
  isProtectedMajorAssessmentTitle
} = require("../src/courseworkAvailability");

const projectRoot = path.resolve(__dirname, "..");

function initializeDatabase(databaseFile) {
  execFileSync(process.execPath, ["--no-warnings", "-e", "require('./src/db').initialize()"], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_FILE: databaseFile, NODE_ENV: "test" }
  });
}

function targetSnapshot(database) {
  return database.prepare(`
    SELECT c.slug, c.published AS course_published, m.id AS module_id, m.published AS module_published,
      l.id AS lesson_id, l.title, l.published AS lesson_published, l.instructor_only,
      l.allowed_student_email, l.grade_item_id
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    JOIN courses c ON c.id = m.course_id
    WHERE c.slug IN (${PN_COURSE_SLUGS.map(() => "?").join(",")})
    ORDER BY c.slug, m.position, l.position, l.id
  `).all(...PN_COURSE_SLUGS);
}

test("PN 101-104 regular coursework reopens once while major exams and completed work stay intact", () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-pn-reopen-"));
  const databaseFile = path.join(temporaryDirectory, "reopen.sqlite");

  try {
    initializeDatabase(databaseFile);
    const database = new DatabaseSync(databaseFile);
    const demoStudent = database.prepare("SELECT id FROM users WHERE email = 'student@browardmiamihi.com'").get();
    assert.ok(demoStudent);

    const protectedBefore = [];
    const canonicalRows = [];
    const canonicalTopicRows = [];
    for (const slug of PN_COURSE_SLUGS) {
      const definition = courses.find((course) => course.slug === slug);
      const course = database.prepare("SELECT id FROM courses WHERE slug = ?").get(slug);
      assert.ok(definition && course, `Expected ${slug}`);
      database.prepare("DELETE FROM course_seed_versions WHERE course_id = ? AND seed_key = ?")
        .run(course.id, PN_COURSEWORK_REOPEN_SEED_KEY);
      database.prepare("UPDATE courses SET published = 0 WHERE id = ?").run(course.id);

      for (const title of canonicalReopenableTaskTitles(definition)) {
        const row = database.prepare(`
          SELECT l.id, l.title, l.module_id
          FROM lessons l JOIN modules m ON m.id = l.module_id
          WHERE m.course_id = ? AND l.title = ?
          ORDER BY l.id LIMIT 1
        `).get(course.id, title);
        assert.ok(row, `Missing canonical task: ${slug} / ${title}`);
        canonicalRows.push({ slug, courseId: course.id, ...row });
        database.prepare("UPDATE modules SET published = 0 WHERE id = ?").run(row.module_id);
        database.prepare("UPDATE lessons SET published = 0, instructor_only = 1 WHERE id = ?").run(row.id);
      }
      const seededTopics = database.prepare(`
        SELECT id, title FROM discussion_topics
        WHERE course_id = ?
      `).all(course.id);
      canonicalTopicRows.push(...seededTopics.map((topic) => ({ slug, ...topic })));
      if (["medical-terminology", "introduction-to-nursing-practical-nursing"].includes(slug) && seededTopics[0]) {
        database.prepare("UPDATE discussion_topics SET source_external_id = ? WHERE id = ?")
          .run(slug === "medical-terminology" ? "462" : "531", seededTopics[0].id);
      }
      database.prepare("UPDATE discussion_topics SET status = 'closed' WHERE course_id = ?").run(course.id);

      const majorTitles = definition.modules
        .flatMap((module) => module.lessons || [])
        .map((lesson) => lesson.title)
        .filter(isProtectedMajorAssessmentTitle);
      for (const title of majorTitles) {
        const row = database.prepare(`
          SELECT l.id, l.title, l.published, l.instructor_only, l.allowed_student_email, l.grade_item_id,
            gi.id AS matched_grade_item_id, gi.points_possible, gi.due_date, gi.allowed_student_email AS grade_item_student_email
          FROM lessons l
          JOIN modules m ON m.id = l.module_id
          LEFT JOIN grade_items gi ON gi.course_id = m.course_id AND gi.title = l.title
          WHERE m.course_id = ? AND l.title = ?
          ORDER BY l.id LIMIT 1
        `).get(course.id, title);
        assert.ok(row, `Missing protected assessment: ${slug} / ${title}`);
        protectedBefore.push({ slug, ...row });
      }

      database.prepare(`
        INSERT OR IGNORE INTO enrollments (user_id, course_id, source)
        VALUES (?, ?, 'reopen-test')
      `).run(demoStudent.id, course.id);
    }

    const pn101 = database.prepare("SELECT id FROM courses WHERE slug = 'medical-terminology'").get();
    const enrollment = database.prepare("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?").get(demoStudent.id, pn101.id);
    const quizzes = database.prepare(`
      SELECT l.id, l.title, COALESCE(l.grade_item_id, gi.id) AS grade_item_id
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      LEFT JOIN grade_items gi ON gi.course_id = m.course_id AND gi.title = l.title
      WHERE m.course_id = ? AND l.content LIKE '%QUIZ_DATA_BASE64:%'
        AND lower(l.title) NOT LIKE '%midterm%' AND lower(l.title) NOT LIKE '%final%'
        AND gi.id IS NOT NULL
      ORDER BY l.id LIMIT 2
    `).all(pn101.id);
    assert.equal(quizzes.length, 2);
    const major = protectedBefore.find((row) => row.slug === "medical-terminology");
    assert.ok(major);

    database.prepare(`
      INSERT INTO exam_attempts (enrollment_id, lesson_id, expires_at, submitted_at, status)
      VALUES (?, ?, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z', 'expired')
    `).run(enrollment.id, quizzes[0].id);
    const abandonedAttemptId = Number(database.prepare("SELECT last_insert_rowid() AS id").get().id);
    database.prepare(`
      INSERT INTO exam_attempts (enrollment_id, lesson_id, expires_at, submitted_at, status)
      VALUES (?, ?, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z', 'submitted')
    `).run(enrollment.id, quizzes[1].id);
    const completedAttemptId = Number(database.prepare("SELECT last_insert_rowid() AS id").get().id);
    database.prepare("INSERT INTO grades (enrollment_id, grade_item_id, score, note) VALUES (?, ?, 91, 'Preserve completed quiz')")
      .run(enrollment.id, quizzes[1].grade_item_id);
    database.prepare("INSERT OR IGNORE INTO lesson_completions (enrollment_id, lesson_id) VALUES (?, ?)")
      .run(enrollment.id, quizzes[1].id);
    database.prepare(`
      INSERT INTO exam_attempts (enrollment_id, lesson_id, expires_at, submitted_at, status)
      VALUES (?, ?, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z', 'submitted')
    `).run(enrollment.id, major.id);
    const protectedAttemptId = Number(database.prepare("SELECT last_insert_rowid() AS id").get().id);

    const retiredModule = canonicalRows.find((row) => row.slug === "medical-terminology").module_id;
    const retiredLessonId = Number(database.prepare(`
      INSERT INTO lessons (module_id, title, content, position, published, instructor_only, item_type)
      VALUES (?, '[PN101 2026] Retired Combined Quiz', 'QUIZ_DATA_BASE64:W10=', 999, 0, 0, 'quiz')
    `).run(retiredModule).lastInsertRowid);
    database.prepare(`
      INSERT INTO exam_attempts (enrollment_id, lesson_id, expires_at, submitted_at, status)
      VALUES (?, ?, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z', 'expired')
    `).run(enrollment.id, retiredLessonId);
    const retiredAttemptId = Number(database.prepare("SELECT last_insert_rowid() AS id").get().id);
    const retiredTopicId = Number(database.prepare(`
      INSERT INTO discussion_topics (
        course_id, title, prompt, status, posted_at, source_external_id
      ) VALUES (?, '[PN101 2026] Retired Discussion', 'Retired topic', 'closed', CURRENT_TIMESTAMP, ?)
    `).run(pn101.id, "medical-terminology:retired-discussion").lastInsertRowid);

    const pn102 = database.prepare("SELECT id FROM courses WHERE slug = 'introduction-to-nursing-practical-nursing'").get();
    const finalImpactPresentation = canonicalRows.find((row) => (
      row.slug === "introduction-to-nursing-practical-nursing" && row.title === "Final Impact Presentation"
    ));
    assert.ok(finalImpactPresentation);
    database.prepare("UPDATE modules SET title = 'Final Exam and Course Wrap-Up' WHERE id = ?")
      .run(finalImpactPresentation.module_id);
    const retiredPn102TopicId = Number(database.prepare(`
      INSERT INTO discussion_topics (
        course_id, title, prompt, status, posted_at, source_external_id
      ) VALUES (?, 'Week 4 Discussion: Retired Instructor Draft', 'Retired topic', 'closed', CURRENT_TIMESTAMP, '999')
    `).run(pn102.id).lastInsertRowid);

    const copiedTask = canonicalRows.find((row) => row.slug === "medical-terminology" && /quiz/i.test(row.title));
    assert.ok(copiedTask);
    const retiredCopyModuleId = Number(database.prepare(`
      INSERT INTO modules (course_id, title, position, published)
      VALUES (?, 'Retired copies', 999, 0)
    `).run(pn101.id).lastInsertRowid);
    const retiredExactTitleLessonId = Number(database.prepare(`
      INSERT INTO lessons (module_id, title, content, position, published, instructor_only, item_type)
      VALUES (?, ?, 'QUIZ_DATA_BASE64:W10=', 1, 0, 0, 'quiz')
    `).run(retiredCopyModuleId, copiedTask.title).lastInsertRowid);
    const sameModuleCopyLessonId = Number(database.prepare(`
      INSERT INTO lessons (module_id, title, content, position, published, instructor_only, item_type)
      VALUES (?, ?, 'QUIZ_DATA_BASE64:W10=', 999, 0, 0, 'quiz')
    `).run(copiedTask.module_id, copiedTask.title).lastInsertRowid);

    const pn102Final = database.prepare("SELECT id FROM grade_items WHERE course_id = ? AND title = 'Cumulative Final Exam'").get(pn102.id);
    const pn102CanonicalQuiz = canonicalRows.find((row) => row.slug === "introduction-to-nursing-practical-nursing" && /quiz/i.test(row.title));
    assert.ok(pn102Final && pn102CanonicalQuiz);
    const disguisedFinalLessonId = Number(database.prepare(`
      INSERT INTO lessons (
        module_id, title, content, position, published, instructor_only, item_type, grade_item_id
      ) VALUES (?, ?, 'QUIZ_DATA_BASE64:W10=', 998, 0, 0, 'quiz', ?)
    `).run(pn102CanonicalQuiz.module_id, pn102CanonicalQuiz.title, pn102Final.id).lastInsertRowid);
    database.close();

    initializeDatabase(databaseFile);
    const reopened = new DatabaseSync(databaseFile);
    for (const row of canonicalRows) {
      const current = reopened.prepare(`
        SELECT c.published AS course_published, m.published AS module_published,
          l.published AS lesson_published, l.instructor_only
        FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
        WHERE l.id = ?
      `).get(row.id);
      assert.deepEqual({ ...current }, {
        course_published: 1,
        module_published: 1,
        lesson_published: 1,
        instructor_only: 0
      }, `${row.slug} / ${row.title}`);
    }
    assert.equal(
      reopened.prepare("SELECT m.title FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = ?")
        .get(finalImpactPresentation.id).title,
      "Final Exam and Course Wrap-Up"
    );
    const protectedAfter = protectedBefore.map((row) => {
      const current = reopened.prepare(`
        SELECT l.id, l.title, l.published, l.instructor_only, l.allowed_student_email, l.grade_item_id,
          gi.id AS matched_grade_item_id, gi.points_possible, gi.due_date, gi.allowed_student_email AS grade_item_student_email
        FROM lessons l
        JOIN modules m ON m.id = l.module_id
        LEFT JOIN grade_items gi ON gi.course_id = m.course_id AND gi.title = l.title
        WHERE l.id = ?
      `).get(row.id);
      return { slug: row.slug, ...current };
    });
    assert.deepEqual(protectedAfter, protectedBefore);
    canonicalTopicRows.forEach((topic) => {
      assert.equal(
        reopened.prepare("SELECT status FROM discussion_topics WHERE id = ?").get(topic.id).status,
        "published",
        `${topic.slug} / ${topic.title}`
      );
    });
    assert.equal(reopened.prepare("SELECT id FROM exam_attempts WHERE id = ?").get(abandonedAttemptId), undefined);
    assert.ok(reopened.prepare("SELECT id FROM exam_attempts WHERE id = ?").get(completedAttemptId));
    assert.ok(reopened.prepare("SELECT id FROM exam_attempts WHERE id = ?").get(protectedAttemptId));
    assert.ok(reopened.prepare("SELECT id FROM exam_attempts WHERE id = ?").get(retiredAttemptId));
    assert.equal(reopened.prepare("SELECT score FROM grades WHERE enrollment_id = ? AND grade_item_id = ?").get(enrollment.id, quizzes[1].grade_item_id).score, 91);
    assert.ok(reopened.prepare("SELECT id FROM lesson_completions WHERE enrollment_id = ? AND lesson_id = ?").get(enrollment.id, quizzes[1].id));
    assert.deepEqual({ ...reopened.prepare("SELECT published, instructor_only FROM lessons WHERE id = ?").get(retiredLessonId) }, { published: 0, instructor_only: 0 });
    assert.deepEqual({ ...reopened.prepare(`
      SELECT m.published AS module_published, l.published AS lesson_published, l.instructor_only
      FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = ?
    `).get(retiredExactTitleLessonId) }, { module_published: 0, lesson_published: 0, instructor_only: 0 });
    assert.deepEqual({ ...reopened.prepare("SELECT published, instructor_only FROM lessons WHERE id = ?").get(sameModuleCopyLessonId) }, { published: 0, instructor_only: 0 });
    assert.deepEqual({ ...reopened.prepare("SELECT published, instructor_only FROM lessons WHERE id = ?").get(disguisedFinalLessonId) }, { published: 0, instructor_only: 0 });
    assert.equal(reopened.prepare("SELECT status FROM discussion_topics WHERE id = ?").get(retiredTopicId).status, "closed");
    assert.equal(reopened.prepare("SELECT status FROM discussion_topics WHERE id = ?").get(retiredPn102TopicId).status, "closed");
    const markerCount = reopened.prepare(`
      SELECT COUNT(*) AS count FROM course_seed_versions csv
      JOIN courses c ON c.id = csv.course_id
      WHERE c.slug IN (?, ?, ?, ?) AND csv.seed_key = ?
    `).get(...PN_COURSE_SLUGS, PN_COURSEWORK_REOPEN_SEED_KEY).count;
    assert.equal(markerCount, 4);
    const firstSnapshot = targetSnapshot(reopened);
    reopened.close();

    initializeDatabase(databaseFile);
    const secondRun = new DatabaseSync(databaseFile);
    assert.deepEqual(targetSnapshot(secondRun), firstSnapshot);
    assert.deepEqual(secondRun.prepare("PRAGMA foreign_key_check").all(), []);
    secondRun.close();
  } finally {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});
