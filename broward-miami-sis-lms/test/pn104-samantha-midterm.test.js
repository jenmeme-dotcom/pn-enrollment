const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const { anatomyPhysiologyCourse } = require("../src/anatomyPhysiologyBuildout");
const samanthaMidterm = require("../src/pn104SamanthaMidterm");

const projectRoot = path.resolve(__dirname, "..");

function questionsFromContent(content) {
  const encoded = String(content).match(/QUIZ_DATA_BASE64:([^\s]+)/)?.[1];
  return encoded ? JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) : [];
}

test("Samantha's PN104 midterm has 50 original four-option questions", () => {
  assert.equal(samanthaMidterm.questions.length, 50);
  samanthaMidterm.questions.forEach((question) => {
    assert.equal(question.options.length, 4);
    assert.ok(question.answer >= 0 && question.answer < 4);
  });
  const originalExam = anatomyPhysiologyCourse.modules
    .flatMap((module) => module.lessons || [])
    .find((lesson) => lesson.title === "[PN104 DAY 2026] Midterm Exam — Chapters 1–8 and 15–18");
  const originalPrompts = new Set(questionsFromContent(originalExam.content).map((question) => question.prompt.toLowerCase()));
  assert.equal(samanthaMidterm.questions.filter((question) => originalPrompts.has(question.prompt.toLowerCase())).length, 0);
});

test("the new midterm is stored as a Samantha-only lesson and grade item", () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-samantha-midterm-"));
  const databaseFile = path.join(temporaryDirectory, "midterm.sqlite");
  try {
    execFileSync(process.execPath, ["--no-warnings", "-e", "require('./src/db').initialize()"], {
      cwd: projectRoot,
      env: { ...process.env, DATABASE_FILE: databaseFile, NODE_ENV: "test" }
    });
    const database = new DatabaseSync(databaseFile);
    const lesson = database.prepare("SELECT allowed_student_email, grade_item_id FROM lessons WHERE title = ?").get(samanthaMidterm.title);
    const gradeItem = database.prepare("SELECT allowed_student_email, points_possible, due_date FROM grade_items WHERE title = ?").get(samanthaMidterm.title);
    database.close();
    assert.equal(lesson.allowed_student_email, samanthaMidterm.studentEmail);
    assert.ok(lesson.grade_item_id);
    assert.equal(gradeItem.allowed_student_email, samanthaMidterm.studentEmail);
    assert.equal(gradeItem.points_possible, 150);
    assert.equal(gradeItem.due_date, samanthaMidterm.dueDate);
  } finally {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});

test("student routes enforce personalized access and secure exam mode", () => {
  const source = fs.readFileSync(path.join(projectRoot, "src/server.js"), "utf8");
  assert.match(source, /studentCanAccessLesson\(lesson, req\.user\)/);
  assert.match(source, /allowed_student_email IS NULL OR lower\(l\.allowed_student_email\) = lower\(\?\)/);
  assert.match(source, /data-secure-exam-form/);
  assert.match(source, /requestFullscreen/);
  assert.match(source, /submitForExit\('tab-or-window-change'\)/);
});
