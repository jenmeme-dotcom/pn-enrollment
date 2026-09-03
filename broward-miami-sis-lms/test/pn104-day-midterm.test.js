const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { anatomyPhysiologyCourse } = require("../src/anatomyPhysiologyBuildout");

const examTitle = "[PN104 DAY 2026] Midterm Exam — Chapters 1–8 and 15–18";

function questionsFromContent(content) {
  const encoded = String(content).match(/QUIZ_DATA_BASE64:([^\s]+)/)?.[1];
  assert.ok(encoded, "midterm contains encoded quiz data");
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
}

test("PN104 day midterm is a distinct selectable 50-question exam", () => {
  const lessons = anatomyPhysiologyCourse.modules.flatMap((module) => module.lessons || []);
  const exam = lessons.find((lesson) => lesson.title === examTitle);
  assert.ok(exam);
  assert.equal(exam.durationMinutes, 60);
  assert.match(exam.content, /^Canvas item type: Exam\./);
  assert.match(exam.content, /DAY COURSE MIDTERM/);
  assert.match(exam.content, /separate from the evening-course midterm/i);
  const questions = questionsFromContent(exam.content);
  assert.equal(questions.length, 50);
  questions.forEach((question) => {
    assert.equal(question.options.length, 4);
    assert.ok(Number.isInteger(question.answer));
    assert.ok(question.answer >= 0 && question.answer < 4);
  });
  assert.deepEqual([...new Set(questions.map((question) => question.answer))].sort(), [0, 1, 2, 3]);
});

test("PN104 day midterm gradebook and calendar deadline use August 21", () => {
  const item = anatomyPhysiologyCourse.gradeItems.find((gradeItem) => gradeItem.title === examTitle);
  assert.ok(item);
  assert.equal(item.pointsPossible, 150);
  assert.equal(item.dueDate, "2026-08-21 23:59:59");
});

test("PN104 day midterm access window opens August 17 and closes August 21", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  assert.match(source, /PN104 DAY 2026/);
  assert.match(source, /2026-08-17T00:00:00-04:00/);
  assert.match(source, /2026-08-21T23:59:59-04:00/);
  assert.match(source, /PN 104 Day Course Midterm Exam", minutes: 60/);
});

test("timed exams enforce full-screen focus and submit when secure mode ends", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "../src/public/styles.css"), "utf8");
  assert.match(serverSource, /data-secure-exam-form/);
  assert.match(serverSource, /requestFullscreen/);
  assert.match(serverSource, /visibilitychange/);
  assert.match(serverSource, /window\.addEventListener\('blur'/);
  assert.match(serverSource, /submitForExit\('fullscreen-exit'\)/);
  assert.match(serverSource, /automatically submitted/);
  assert.match(styles, /\.secure-exam-gate/);
});
