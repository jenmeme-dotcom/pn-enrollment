const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { anatomyPhysiologyCourse } = require("../src/anatomyPhysiologyBuildout");

const projectRoot = path.resolve(__dirname, "..");

test("Chapter 16 neurological exam video remains an external reference, not a quiz", () => {
  const lesson = anatomyPhysiologyCourse.modules
    .flatMap((module) => module.lessons || [])
    .find((item) => item.title === "Chapter 16 Additional Reference: Neurological Exam Video");

  assert.ok(lesson);
  assert.match(lesson.externalUrl, /Panopto\/Pages\/Viewer\.aspx/);
  assert.doesNotMatch(lesson.content, /QUIZ_DATA_BASE64:/);

  const serverSource = fs.readFileSync(path.join(projectRoot, "src/server.js"), "utf8");
  assert.match(serverSource, /if \(itemType === "page" \|\| itemType === "link"\) return "page";/);
});
