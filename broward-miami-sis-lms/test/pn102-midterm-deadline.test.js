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
