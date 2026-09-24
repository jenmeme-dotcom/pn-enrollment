const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const serverSource = fs.readFileSync(path.resolve(__dirname, "../src/server.js"), "utf8");

test("Natacha Andrea Aleman has an approved instructor login", () => {
  assert.match(serverSource, /firstName: "Natacha Andrea", lastName: "Aleman", email: "natacha\.aleman@browardmiamihi\.com"/);
  assert.match(serverSource, /\["natacha\.aleman@browardmiamihi\.com", \{ firstName: "Natacha Andrea", lastName: "Aleman" \}\]/);
});

test("Ashley Anaya has an approved instructor login", () => {
  assert.match(serverSource, /firstName: "Ashley", lastName: "Anaya", email: "ashleypadilla226@yahoo\.com"/);
  assert.match(serverSource, /\["ashleypadilla226@yahoo\.com", \{ firstName: "Ashley", lastName: "Anaya" \}\]/);
});
