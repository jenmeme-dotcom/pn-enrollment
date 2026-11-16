const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");

test("the Long-Term Care Nursing shell is labeled PN 103 throughout the portal", () => {
  const source = fs.readFileSync(path.join(projectRoot, "src", "server.js"), "utf8");
  assert.match(
    source,
    /const slug = course\.slug \|\| course\.course_slug;[\s\S]*?slug === "long-term-care-nursing-pn103"\) return "PN 103";/,
    "The canonical PN 103 shell must not fall back to an internal database-based course code"
  );
  assert.match(
    source,
    /code: "PN 103",\s+slug: "long-term-care-nursing-pn103",\s+title: "Long-Term Care Nursing"/,
    "The Cohort 2 schedule must link PN 103 to the Long-Term Care Nursing shell"
  );
});

test("Cohort 2 long-term care seeding preserves authorized Fundamentals enrollments", () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-cohort-two-pn103-"));
  const databaseFile = path.join(temporaryDirectory, "cohort.sqlite");

  try {
    const initialize = () => execFileSync(process.execPath, ["--no-warnings", "-e", "require('./src/db').initialize()"], {
      cwd: projectRoot,
      env: { ...process.env, DATABASE_FILE: databaseFile, NODE_ENV: "test" }
    });
    initialize();
    const database = new DatabaseSync(databaseFile);
    const fundamentals = database.prepare("SELECT id FROM courses WHERE slug = ?")
      .get("fundamental-nursing-skills-and-concepts-new-cohort");
    const students = database.prepare("SELECT id FROM users WHERE role = 'student' AND cohort_name = 'Cohort 2' ORDER BY id").all();
    assert.ok(students.length >= 2);
    const enrollmentId = database.prepare(`
      INSERT INTO enrollments (user_id, course_id, status, start_date, progress, source, external_order_id)
      VALUES (?, ?, 'active', '2026-11-16', 35, 'manual', 'authorized-cohort-2-fundamentals')
    `).run(students[0].id, fundamentals.id).lastInsertRowid;
    const withdrawnEnrollmentId = database.prepare(`
      INSERT INTO enrollments (
        user_id, course_id, status, start_date, source, external_order_id,
        withdrawal_effective_date, withdrawal_reason, withdrawn_at
      ) VALUES (?, ?, 'withdrawn', '2026-11-16', 'manual', 'manual-fundamentals-withdrawal',
        '2026-11-16', 'Student requested withdrawal', '2026-11-16 12:00:00')
    `).run(students[1].id, fundamentals.id).lastInsertRowid;
    const enrollmentBefore = database.prepare("SELECT * FROM enrollments WHERE id = ?").get(enrollmentId);
    const withdrawnBefore = database.prepare("SELECT * FROM enrollments WHERE id = ?").get(withdrawnEnrollmentId);
    const completionItemId = database.prepare(`
      INSERT INTO grade_items (course_id, title, points_possible)
      VALUES (?, 'PrepU completion imported from source', 0)
    `).run(fundamentals.id).lastInsertRowid;
    database.prepare(`
      INSERT INTO assignment_completion_statuses (enrollment_id, grade_item_id, status, note)
      VALUES (?, ?, 'completed', 'Source reports completion without a numeric score')
    `).run(enrollmentId, completionItemId);
    const completionBefore = database.prepare(`
      SELECT * FROM assignment_completion_statuses WHERE enrollment_id = ? AND grade_item_id = ?
    `).get(enrollmentId, completionItemId);

    for (let pass = 0; pass < 2; pass += 1) {
      initialize();
      assert.deepEqual(database.prepare("SELECT * FROM enrollments WHERE id = ?").get(enrollmentId), enrollmentBefore);
      assert.deepEqual(database.prepare("SELECT * FROM enrollments WHERE id = ?").get(withdrawnEnrollmentId), withdrawnBefore);
      assert.equal(database.prepare("SELECT title FROM courses WHERE id = ?").get(fundamentals.id).title,
        "Fundamental Nursing Skills and Concepts - Cohort 2");
      assert.deepEqual(database.prepare(`
        SELECT * FROM assignment_completion_statuses WHERE enrollment_id = ? AND grade_item_id = ?
      `).get(enrollmentId, completionItemId), completionBefore);
      assert.equal(database.prepare(`
        SELECT COUNT(*) AS count FROM grades WHERE enrollment_id = ? AND grade_item_id = ?
      `).get(enrollmentId, completionItemId).count, 0);
    }
    const cohortCount = database.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND cohort_name = 'Cohort 2'").get().count;
    const activeLongTermCare = database.prepare(`
      SELECT COUNT(*) AS count
      FROM users u
      JOIN enrollments e ON e.user_id = u.id
      JOIN courses c ON c.id = e.course_id
      WHERE u.role = 'student' AND u.cohort_name = 'Cohort 2'
        AND c.slug = 'long-term-care-nursing-pn103'
        AND e.status = 'active' AND e.withdrawn_at IS NULL
    `).get().count;
    const mostActiveLongTermCareRowsForOneStudent = database.prepare(`
      SELECT COALESCE(MAX(enrollment_count), 0) AS count
      FROM (
        SELECT COUNT(*) AS enrollment_count
        FROM users u
        JOIN enrollments e ON e.user_id = u.id
        JOIN courses c ON c.id = e.course_id
        WHERE u.role = 'student' AND u.cohort_name = 'Cohort 2'
          AND c.slug = 'long-term-care-nursing-pn103'
          AND e.status = 'active' AND e.withdrawn_at IS NULL
        GROUP BY u.id
      )
    `).get().count;
    const activeFundamentals = database.prepare(`
      SELECT COUNT(DISTINCT u.id) AS count
      FROM users u
      JOIN enrollments e ON e.user_id = u.id
      JOIN courses c ON c.id = e.course_id
      WHERE u.role = 'student' AND u.cohort_name = 'Cohort 2'
        AND c.slug = 'fundamental-nursing-skills-and-concepts-new-cohort'
        AND e.status != 'withdrawn' AND e.withdrawn_at IS NULL
    `).get().count;
    database.close();

    assert.ok(cohortCount > 0);
    assert.equal(activeLongTermCare, cohortCount);
    assert.equal(mostActiveLongTermCareRowsForOneStudent, 1);
    assert.equal(activeFundamentals, 1);
  } finally {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});
