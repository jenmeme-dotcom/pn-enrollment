const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { anatomyPhysiologyCourse } = require("../src/anatomyPhysiologyBuildout");

const projectRoot = path.resolve(__dirname, "..");

test("Chapter 16 neurological exam video is removed from the course", () => {
  const lesson = anatomyPhysiologyCourse.modules
    .flatMap((module) => module.lessons || [])
    .find((item) => item.title === "Chapter 16 Additional Reference: Neurological Exam Video");

  assert.equal(lesson, undefined);

  const chapter16PowerPoint = anatomyPhysiologyCourse.modules
    .flatMap((module) => module.lessons || [])
    .find((item) => item.title === "Chapter 16: The Neurological Examination — PowerPoint");
  assert.ok(chapter16PowerPoint);
  assert.doesNotMatch(chapter16PowerPoint.content, /Panopto|Neurological exam video/i);

  const serverSource = fs.readFileSync(path.join(projectRoot, "src/server.js"), "utf8");
  assert.match(serverSource, /if \(itemType === "page" \|\| itemType === "link"\) return "page";/);

  const dbSource = fs.readFileSync(path.join(projectRoot, "src/db.js"), "utf8");
  assert.match(dbSource, /DELETE FROM lessons[\s\S]*Chapter 16 Additional Reference: Neurological Exam Video/);
});
