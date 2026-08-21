const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const serverSource = fs.readFileSync(path.resolve(__dirname, "../src/server.js"), "utf8");

test("Natacha Andrea Aleman has an approved instructor login", () => {
  assert.match(serverSource, /firstName: "Natacha Andrea", lastName: "Aleman", email: "natacha\.aleman@browardmiamihi\.com"/);
  assert.match(serverSource, /\["natacha\.aleman@browardmiamihi\.com", \{ firstName: "Natacha Andrea", lastName: "Aleman" \}\]/);
});
