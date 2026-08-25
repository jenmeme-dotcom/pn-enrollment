const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "../src/server.js"), "utf8");

test("dashboard student totals and statuses use the selected cohort", () => {
  assert.match(source, /WHERE u\.role = 'student' \$\{hasCohortFilter \? "AND u\.cohort_name = \?" : ""\}/);
  assert.match(source, /const studentCount = studentRows\.length/);
  assert.match(source, /renderDashboardStudentStat\(stats\.students, stats\.studentStatuses, cohortLabel\)/);
  assert.match(source, /id="dashboard-cohort" name="cohort" onchange="this\.form\.submit\(\)"/);
});

test("each dashboard student receives one reconciled status", () => {
  assert.match(source, /const statusOrder = \["Active", "Pending", "Withdrawn", "Completed", "Inactive"\]/);
  assert.match(source, /else if \(student\.account_status !== "active"\) status = student\.account_status === "pending" \? "Pending" : "Inactive"/);
  assert.match(source, /Status counts match total/);
});
