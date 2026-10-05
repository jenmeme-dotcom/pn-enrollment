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

test("seeded PN quizzes keep a permanent, exact gradebook link across restarts", () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-quiz-grade-links-"));
  const databaseFile = path.join(temporaryDirectory, "quiz-grade-links.sqlite");

  try {
    initializeDatabase(databaseFile);
    let database = new DatabaseSync(databaseFile);
    const assessments = database.prepare(`
      SELECT l.id AS lesson_id, l.title, l.grade_item_id, gi.id AS exact_grade_item_id,
        c.slug AS course_slug
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      JOIN grade_items gi ON gi.course_id = c.id AND gi.title = l.title
      WHERE c.slug IN ('medical-terminology', 'introduction-to-nursing-practical-nursing',
        'long-term-care-nursing-pn103', 'anatomy-and-physiology')
        AND l.content LIKE '%QUIZ_DATA_BASE64:%'
      ORDER BY c.slug, l.id
    `).all();

    assert.ok(assessments.length > 20, "Expected the seeded PN assessment catalog");
    assessments.forEach((assessment) => {
      assert.equal(
        assessment.grade_item_id,
        assessment.exact_grade_item_id,
        `Expected ${assessment.course_slug}: ${assessment.title} to be permanently linked`
      );
    });

    const repairTarget = assessments.find((assessment) => assessment.course_slug === "long-term-care-nursing-pn103");
    assert.ok(repairTarget, "Expected a PN 103 assessment to verify restart repair");
    database.prepare("UPDATE lessons SET grade_item_id = NULL WHERE id = ?").run(repairTarget.lesson_id);
    database.close();

    initializeDatabase(databaseFile);
    database = new DatabaseSync(databaseFile);
    const repaired = database.prepare("SELECT grade_item_id FROM lessons WHERE id = ?").get(repairTarget.lesson_id);
    database.close();
    assert.equal(repaired.grade_item_id, repairTarget.exact_grade_item_id);
  } finally {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});
