const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "../src/server.js"), "utf8");
const gradebookFunction = source.match(/function studentGradebookRows[\s\S]*?\n}\n\nfunction renderStudentGradesPage/)?.[0] || "";

test("student gradebook renders every saved course grade item", () => {
  assert.match(gradebookFunction, /const savedRows = gradeItems\.map/);
  assert.match(gradebookFunction, /return savedRows\.map/);
  assert.doesNotMatch(gradebookFunction, /selectedSavedRows|preferredTitles|extraRows/);
});

test("posted grades remain visible while pending auto-grades remain hidden", () => {
  assert.match(gradebookFunction, /!isAutoGradeApprovalPending/);
  assert.match(gradebookFunction, /status: isAutoGradeApprovalPending[^\n]*\? "pending"/);
});
