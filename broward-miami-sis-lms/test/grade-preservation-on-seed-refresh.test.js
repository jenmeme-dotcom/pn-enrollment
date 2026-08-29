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
