const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../src/server.js"), "utf8");
const functionStart = source.indexOf("function studentGradebookRows(");
const functionEnd = source.indexOf("\nfunction ", functionStart + 1);
assert.ok(functionStart >= 0 && functionEnd > functionStart, "The gradebook row builder must be available for behavioral checks");
const buildRows = vm.runInNewContext(`(${source.slice(functionStart, functionEnd)})`, {
  db: {},
  markCoursePointActivities: (_database, _course, items) => items,
  markCourseProjects: (_database, items) => items,
  isSyllabusAcknowledgment: item => /syllabus/i.test(item.title) && /acknowledg(?:e)?ment/i.test(item.title),
  isAutoGradeApprovalPending: note => String(note || "").startsWith("[AUTO_GRADE_PENDING_APPROVAL]")
});

test("saved grade items remain visible regardless of seeded titles or lesson publication, except explicit hidden items and syllabus acknowledgments", () => {
  const items = [
    { id: 1, title: "Instructor-created assessment outside the seed", points_possible: 100, published: 1 },
    { id: 2, title: "Legacy renamed assessment", points_possible: 50, published: 0, unpublished: true },
    { id: 3, title: "Explicitly hidden item", points_possible: 100, gradebook_hidden: 1 },
    { id: 4, title: "Syllabus and Course Orientation Acknowledgment", points_possible: 10 }
  ];
  const before = structuredClone(items);
  const rows = buildRows({ slug: "medical-terminology" }, items, [
    { grade_item_id: 1, score: 92 }, { grade_item_id: 2, score: 41 },
    { grade_item_id: 3, score: 99 }, { grade_item_id: 4, score: 10 }
  ]);
  assert.deepEqual(Array.from(rows, row => row.id), [1, 2]);
  assert.deepEqual(Array.from(rows, row => row.score), [92, 41]);
  assert.equal(rows[1].title, "Legacy renamed assessment");
  assert.deepEqual(items, before, "Rendering must not modify saved item records");
});

test("posted scores including zero remain visible while pending grades and ungraded submissions stay distinct", () => {
  const items = [1, 2, 3, 4, 5].map(id => ({ id, title: `Saved work ${id}`, points_possible: 100 }));
  const rows = buildRows({ slug: "test-course" }, items,
    [{ grade_item_id: 1, score: 0 }, { grade_item_id: 2, score: 90, note: "[AUTO_GRADE_PENDING_APPROVAL] Draft feedback" }, { grade_item_id: 5, score: 70 }],
    [{ grade_item_id: 4, status: "in_progress" }, { grade_item_id: 5, status: "in_progress", ordinary_quiz: true }],
    [{ grade_item_id: 3, submitted_at: "2026-11-17 12:00:00" }]
  );
  assert.equal(rows[0].score, 0);
  assert.equal(rows[1].score, null); assert.equal(rows[1].status, "pending");
  assert.equal(rows[2].score, null); assert.equal(rows[2].status, "submitted_ungraded");
  assert.equal(rows[2].submitted_at, "2026-11-17 12:00:00");
  assert.equal(rows[3].attempt_status, "started");
  assert.equal(rows[4].score, 70); assert.equal(rows[4].attempt_status, "retake");
});
