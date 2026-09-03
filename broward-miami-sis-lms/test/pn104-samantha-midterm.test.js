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
  assert.match(samanthaMidterm.title, /Official Midterm/);
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

test("the legacy Samantha exam becomes a fresh Official Midterm", () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-samantha-practice-reset-"));
  const databaseFile = path.join(temporaryDirectory, "practice-midterm.sqlite");
  const initialize = () => execFileSync(process.execPath, ["--no-warnings", "-e", "require('./src/db').initialize()"], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_FILE: databaseFile, NODE_ENV: "test" }
  });
  try {
    initialize();
    let database = new DatabaseSync(databaseFile);
    const lesson = database.prepare("SELECT id, grade_item_id FROM lessons WHERE title = ?").get(samanthaMidterm.title);
    const enrollment = database.prepare(`
      SELECT e.id FROM enrollments e JOIN users u ON u.id = e.user_id JOIN courses c ON c.id = e.course_id
      WHERE lower(u.email) = lower(?) AND c.slug = 'anatomy-and-physiology'
    `).get(samanthaMidterm.studentEmail);
    database.prepare("UPDATE lessons SET title = ? WHERE id = ?").run(samanthaMidterm.legacyTitle, lesson.id);
    database.prepare("UPDATE grade_items SET title = ? WHERE id = ?").run(samanthaMidterm.legacyTitle, lesson.grade_item_id);
    database.prepare("INSERT INTO exam_attempts (enrollment_id, lesson_id, expires_at, status) VALUES (?, ?, '2026-09-04T23:59:59-04:00', 'submitted')").run(enrollment.id, lesson.id);
    database.prepare("INSERT INTO grades (enrollment_id, grade_item_id, score) VALUES (?, ?, 120)").run(enrollment.id, lesson.grade_item_id);
    database.prepare("INSERT INTO lesson_completions (enrollment_id, lesson_id) VALUES (?, ?)").run(enrollment.id, lesson.id);
    database.close();

    initialize();
    database = new DatabaseSync(databaseFile);
    assert.ok(database.prepare("SELECT id FROM lessons WHERE id = ? AND title = ?").get(lesson.id, samanthaMidterm.title));
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?").get(enrollment.id, lesson.id).count, 0);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM grades WHERE enrollment_id = ? AND grade_item_id = ?").get(enrollment.id, lesson.grade_item_id).count, 0);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM lesson_completions WHERE enrollment_id = ? AND lesson_id = ?").get(enrollment.id, lesson.id).count, 0);
    database.close();
  } finally {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  }
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
