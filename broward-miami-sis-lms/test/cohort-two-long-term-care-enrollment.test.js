const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");

test("every Cohort 2 student is active in long-term care and removed from Fundamentals", () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-cohort-two-pn103-"));
  const databaseFile = path.join(temporaryDirectory, "cohort.sqlite");

  try {
    execFileSync(process.execPath, ["--no-warnings", "-e", "require('./src/db').initialize()"], {
      cwd: projectRoot,
      env: { ...process.env, DATABASE_FILE: databaseFile, NODE_ENV: "test" }
    });
    const database = new DatabaseSync(databaseFile);
    const cohortCount = database.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND cohort_name = 'Cohort 2'").get().count;
    const activeLongTermCare = database.prepare(`
      SELECT COUNT(DISTINCT u.id) AS count
      FROM users u
      JOIN enrollments e ON e.user_id = u.id
      JOIN courses c ON c.id = e.course_id
      WHERE u.role = 'student' AND u.cohort_name = 'Cohort 2'
        AND c.slug = 'long-term-care-nursing-pn103'
        AND e.status = 'active' AND e.withdrawn_at IS NULL
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
    assert.equal(activeFundamentals, 0);
  } finally {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});
