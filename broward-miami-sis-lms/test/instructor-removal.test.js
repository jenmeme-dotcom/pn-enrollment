const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const serverSource = fs.readFileSync(path.resolve(__dirname, "../src/server.js"), "utf8");
const dbSource = fs.readFileSync(path.resolve(__dirname, "../src/db.js"), "utf8");

test("instructors can be inactivated while historical records are preserved", () => {
  assert.match(serverSource, /\/admin\/instructor-roles\/\$\{encodeURIComponent\(instructor\.email\)\}\/deactivate/);
  assert.match(serverSource, /app\.post\("\/admin\/instructor-roles\/:email\/deactivate"/);
  assert.match(serverSource, />Inactivate access<\/button>/);
  assert.match(serverSource, /SET status = 'inactive'/);
  assert.match(serverSource, /Historical records were preserved/);
});

test("Dayana Diaz is no longer recreated as an approved instructor", () => {
  assert.doesNotMatch(serverSource, /\["dayana\.diaz@browardmiamihi\.com", \{ firstName: "Dayana", lastName: "Diaz" \}\]/);
  assert.doesNotMatch(serverSource, /\{ firstName: "Dayana", lastName: "Diaz", email: "dayana\.diaz@browardmiamihi\.com"/);
  assert.doesNotMatch(dbSource, /createUser\.run\("instructor", "Dayana", "Diaz"/);
});
