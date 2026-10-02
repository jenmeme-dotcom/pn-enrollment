const assert = require("node:assert/strict");
const test = require("node:test");
const { introNursingCourse } = require("../src/introNursingBuildout");

const lessons = introNursingCourse.modules.flatMap((module) => module.lessons || []);

test("PN 102 includes a published quiz and grade item for every chapter", () => {
  for (let chapter = 1; chapter <= 13; chapter += 1) {
    const title = `[PN102 2026] Quiz ${chapter} - Chapter ${chapter}`;
    const lesson = lessons.find((candidate) => candidate.title === title);
    const gradeItem = introNursingCourse.gradeItems.find((candidate) => candidate.title === title);
    assert.ok(lesson, `missing lesson: ${title}`);
    assert.match(lesson.content, /QUIZ_DATA_BASE64:/);
    assert.ok(gradeItem, `missing grade item: ${title}`);
    assert.equal(gradeItem.pointsPossible, 50);
  }
});

test("PN 102 includes grade-linked midterm and final definitions", () => {
  for (const title of ["Midterm Exam: Weeks 1-6", "Cumulative Final Exam"]) {
    assert.ok(lessons.find((lesson) => lesson.title === title), `missing lesson: ${title}`);
    assert.ok(introNursingCourse.gradeItems.find((item) => item.title === title), `missing grade item: ${title}`);
  }
});
