const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const serverSource = fs.readFileSync(path.join(__dirname, "..", "src", "server.js"), "utf8");
const functionSource = serverSource.match(/function assignmentTypeLabel\(item = \{\}\) \{[\s\S]*?\n\}/)?.[0];
const assignmentTypeLabel = Function(`${functionSource}; return assignmentTypeLabel;`)();

test("assignment type labels distinguish midterms and finals from quizzes", () => {
  assert.equal(assignmentTypeLabel({ title: "[PN104 DAY] Quiz: Midterm Examination" }), "Midterm");
  assert.equal(assignmentTypeLabel({ title: "[PN104 2026] Quiz: Final Examination" }), "Final");
  assert.equal(assignmentTypeLabel({ title: "Quiz 2: Chapters 4-6" }), "Quiz");
  assert.equal(assignmentTypeLabel({ title: "Unit Exam" }), "Exam");
});

test("the quizzes footer provides direct midterm and final exam links", () => {
  assert.match(serverSource, /aria-label="Course exams"/);
  assert.match(serverSource, /Open \$\{escapeHtml\(assignmentTypeLabel\(item\)\)\} Exam/);
  assert.match(serverSource, /\["Midterm", "Final"\]\.includes\(assignmentTypeLabel\(item\)\)/);
  assert.match(serverSource, /quizzesOnly \? isAssessmentType\(assignmentTypeLabel\(item\)\) : true/);
});
