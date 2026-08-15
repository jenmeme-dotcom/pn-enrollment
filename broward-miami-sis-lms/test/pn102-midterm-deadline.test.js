const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { introNursingCourse } = require("../src/introNursingBuildout");

test("PN102 midterm is due Friday August 21", () => {
  const item = introNursingCourse.gradeItems.find((gradeItem) => gradeItem.title === "Midterm Exam: Weeks 1-6");
  assert.ok(item);
  assert.equal(item.pointsPossible, 150);
  assert.equal(item.dueDate, "2026-08-21 23:59:59");
});

test("PN102 midterm remains available through its new deadline", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const settingsLine = source.split("\n").find((line) => line.includes('title === "Midterm Exam: Weeks 1-6"'));
  assert.ok(settingsLine);
  assert.match(settingsLine, /minutes: 60/);
  assert.match(settingsLine, /2026-08-21T23:59:59-04:00/);
});

test("instructor gradebook uses complete database items and displays due dates", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const gradebookFunction = source.slice(
    source.indexOf("function instructorGradebookItems"),
    source.indexOf("function renderInstructorGradesPage")
  );
  assert.match(gradebookFunction, /gradeItems\.length \? gradeItems : pnDefaults/);
  assert.doesNotMatch(gradebookFunction, /source\.slice\(0, 8\)/);
  assert.match(source, /Due \$\{escapeHtml\(date\(item\.due_date\)\)\}/);
});
