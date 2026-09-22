const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { isMidtermTitle, isProtectedMajorAssessmentTitle } = require("../src/courseworkAvailability");

const serverSource = fs.readFileSync(path.join(__dirname, "..", "src", "server.js"), "utf8");
const functionSource = serverSource.match(/function assignmentTypeLabel\(item = \{\}\) \{[\s\S]*?\n\}/)?.[0];
const assignmentTypeLabel = Function(
  "isMidtermTitle",
  "isProtectedMajorAssessmentTitle",
  `${functionSource}; return assignmentTypeLabel;`
)(isMidtermTitle, isProtectedMajorAssessmentTitle);

test("assignment type labels distinguish midterms and finals from quizzes", () => {
  assert.equal(assignmentTypeLabel({ title: "[PN104 DAY] Quiz: Midterm Examination" }), "Midterm");
  assert.equal(assignmentTypeLabel({ title: "[PN104 2026] Quiz: Final Examination" }), "Final");
  assert.equal(assignmentTypeLabel({ title: "Quiz 2: Chapters 4-6" }), "Quiz");
  assert.equal(assignmentTypeLabel({ title: "Unit Exam" }), "Exam");
  assert.equal(assignmentTypeLabel({ title: "Final Impact Presentation" }), "Assignment");
  assert.equal(assignmentTypeLabel({ title: "Final Examination Study Guide" }), "Assignment");
});

test("only actual midterm and final assessments are protected from reopening", () => {
  [
    "Midterm Exam: Weeks 1-6",
    "Practice Mid-term Examination",
    "Samantha Brunvil Mid Term",
    "Final Comprehensive Exam - Chapters 1-22",
    "[PN104 2026] Quiz: Final Examination",
    "Summative Final Assessment"
  ].forEach((title) => assert.equal(isProtectedMajorAssessmentTitle(title), true, title));

  [
    "Final Impact Presentation",
    "Final Review",
    "Final Examination Study Guide",
    "Comprehensive Final Review",
    "Final Synthesis",
    "Unit Exam",
    "Quiz 4: Weeks 10-12"
  ].forEach((title) => assert.equal(isProtectedMajorAssessmentTitle(title), false, title));
});

test("the quizzes page separates practice work from actual exams", () => {
  assert.match(serverSource, /renderAssignmentTable\("Practice"/);
  assert.match(serverSource, /renderAssignmentTable\("Exams"/);
  assert.match(serverSource, /practiceRows = rows\.filter/);
  assert.match(serverSource, /examRows = rows\.filter/);
  assert.match(serverSource, /\["Midterm", "Final"\]\.includes\(assignmentTypeLabel\(item\)\)/);
  assert.match(serverSource, /quizzesOnly \? isAssessmentType\(assignmentTypeLabel\(item\)\) : true/);
});
