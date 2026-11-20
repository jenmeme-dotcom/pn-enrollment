const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const serverSource = fs.readFileSync(path.join(projectRoot, "src/server.js"), "utf8");

function routeSource(start, end) {
  const startIndex = serverSource.indexOf(start);
  const endIndex = serverSource.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  assert.notEqual(endIndex, -1, `Missing source marker: ${end}`);
  return serverSource.slice(startIndex, endIndex);
}

test("staff account rows offer inactivation without a remove action", () => {
  const adminRolesPage = routeSource(
    'app.get("/admin/admin-roles"',
    'app.post("/admin/admin-roles/:email/reset-password"'
  );
  const instructorRolesPage = routeSource(
    'app.get("/admin/instructor-roles"',
    'app.post("/admin/instructor-roles"'
  );

  for (const [pageName, pageSource] of [
    ["admin", adminRolesPage],
    ["instructor", instructorRolesPage]
  ]) {
    assert.match(pageSource, /href="\/admin\/staff\/\$\{[^}]+\.id\}\/edit"[^>]*>Edit Account<\/a>/, `${pageName} rows need an Edit Account button`);
    assert.match(pageSource, /action="\/admin\/users\/\$\{[^}]+\.id\}\/login-username"/, `${pageName} rows need a separate username control`);
    assert.match(pageSource, /action="\/admin\/staff\/\$\{[^}]+\.id\}\/inactivate"/, `${pageName} rows need an Inactivate control`);
    assert.match(pageSource, /<button class="small danger" type="submit">Inactivate<\/button>/, `${pageName} Inactivate control needs danger styling`);
    assert.doesNotMatch(pageSource, /action="\/admin\/staff\/\$\{[^}]+\.id\}\/remove"/, `${pageName} rows must not expose a Remove control`);
    assert.doesNotMatch(pageSource, />\s*(?:Confirm )?Remove\s*</, `${pageName} rows must not show a Remove button`);
    assert.match(pageSource, /historical records|preserved/i, `${pageName} inactivation UI should explain that history is preserved`);
  }
});

test("removed staff and traceable changes have visible admin destinations", () => {
  const adminRolesPage = routeSource(
    'app.get("/admin/admin-roles"',
    'app.post("/admin/admin-roles/:email/reset-password"'
  );

  assert.match(adminRolesPage, /Removed Staff Accounts/);
  assert.match(adminRolesPage, /action="\/admin\/staff\/\$\{[^}]+\.id\}\/reactivate"/);
  assert.match(adminRolesPage, />Restore(?: access)?<\/button>/i);
  assert.match(adminRolesPage, /href="\/admin\/system-activity"[^>]*>System Activity<\/a>/);
  assert.match(serverSource, /app\.get\("\/admin\/system-activity", requireAuth, requireRole\("admin"\)/);
  assert.match(serverSource, /<h1>System Activity<\/h1>/);
  assert.match(serverSource, /Who|Actor/i);
  assert.match(serverSource, /Action/);
  assert.match(serverSource, /Affected|Target/i);
  assert.match(serverSource, /When|Timestamp|Date/i);
  assert.match(serverSource, /Details/);
});

test("staff removal endpoint is not available", () => {
  assert.doesNotMatch(serverSource, /app\.post\("\/admin\/staff\/:id\/remove"/);
});
