const assert = require("node:assert/strict");
const { test } = require("node:test");
const { chapterTitles, medicalTerminologyCourse } = require("../src/medicalTerminologyBuildout");

test("PN101 PowerPoint module rows include chapter subject titles", () => {
  const lessons = medicalTerminologyCourse.modules.flatMap((module) => module.lessons);
  const powerPoints = lessons.filter((lesson) => /Chapter_\d{3}\.pptx/.test(lesson.content || ""));

  assert.equal(powerPoints.length, 22);
  Object.entries(chapterTitles).forEach(([chapter, title]) => {
    const expectedTitle = `Chapter ${chapter}: ${title} — PowerPoint`;
    assert.ok(powerPoints.some((lesson) => lesson.title === expectedTitle), `Missing ${expectedTitle}`);
  });
  assert.ok(powerPoints.every((lesson) => !lesson.title.endsWith(".pptx")));
});

test("PN101 quiz rows use the same verified chapter titles", () => {
  const lessons = medicalTerminologyCourse.modules.flatMap((module) => module.lessons);

  Object.entries(chapterTitles).forEach(([chapter, title]) => {
    const expectedTitle = `[PN101 2026] Quiz ${chapter} - Chapter ${chapter}: ${title}`;
    assert.ok(lessons.some((lesson) => lesson.title === expectedTitle), `Missing ${expectedTitle}`);
  });
});
