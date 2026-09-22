const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { isProtectedMajorAssessmentTitle } = require("../src/courseworkAvailability");

const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
const functionSource = serverSource.match(
  /function examSettingsForLesson\(lesson = \{\}\) \{[\s\S]*?\n\}(?=\n\nfunction studentCanAccessLesson)/
)?.[0];

function settingsFunction(contextByLessonId = {}) {
  assert.ok(functionSource, "exam settings function is present");
  const fakeDatabase = {
    prepare() {
      return {
        get(id) {
          return contextByLessonId[id] || null;
        }
      };
    }
  };
  return Function(
    "db",
    "isProtectedMajorAssessmentTitle",
    `${functionSource}; return examSettingsForLesson;`
  )(fakeDatabase, isProtectedMajorAssessmentTitle);
}

test("historical PN104 final titles keep the Week 12 exam window", () => {
  const settings = settingsFunction()({
    title: "[PN104 2026] Final Examination",
    course_slug: "anatomy-and-physiology"
  });
  assert.deepEqual(settings, {
    label: "PN 104 Final Examination",
    minutes: 90,
    opensAt: "2026-09-28T00:00:00-04:00",
    closesAt: "2026-10-04T23:59:59-04:00"
  });
});

test("a generic lesson linked to a final grade item keeps the final schedule", () => {
  const settings = settingsFunction({
    77: {
      course_slug: "introduction-to-nursing-practical-nursing",
      linked_grade_item_title: "Cumulative Final Exam"
    }
  })({
    id: 77,
    title: "Week 12 Comprehensive Assessment",
    grade_item_id: 99
  });
  assert.deepEqual(settings, {
    label: "PN 102 Cumulative Final Exam",
    minutes: 90,
    opensAt: "2026-09-07T00:00:00-04:00",
    closesAt: "2026-09-13T23:59:59-04:00"
  });
});

test("a specifically scheduled protected lesson takes precedence over a generic linked title", () => {
  const settings = settingsFunction({
    88: {
      course_slug: "anatomy-and-physiology",
      linked_grade_item_title: "[PN104 2026] Midterm Examination"
    }
  })({
    id: 88,
    title: "[PN104 DAY 2026] Midterm Exam — Chapters 1–8 and 15–18",
    grade_item_id: 100
  });
  assert.equal(settings.label, "PN 104 Day Course Midterm Exam");
  assert.equal(settings.opensAt, "2026-08-31T00:00:00-04:00");
  assert.equal(settings.closesAt, "2026-09-04T23:59:59-04:00");
});

test("a generic protected PN101 lesson falls back to its specifically titled grade item", () => {
  const settings = settingsFunction({
    91: {
      course_slug: "medical-terminology",
      linked_grade_item_title: "[PN101 2026] Midterm Exam 1 - Chapters 1-12"
    }
  })({
    id: 91,
    title: "Midterm Assessment",
    grade_item_id: 101
  });
  assert.equal(settings.label, "Midterm Exam 1");
  assert.equal(settings.opensAt, "2026-07-29T00:00:00-04:00");
  assert.equal(settings.closesAt, "2026-08-05T23:59:59-04:00");
});

test("ordinary coursework with final in its title is not converted into an exam", () => {
  const settings = settingsFunction()({
    title: "Final Impact Presentation",
    course_slug: "introduction-to-nursing-practical-nursing"
  });
  assert.equal(settings, null);
});
