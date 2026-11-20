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

test("staff account rows expose explicit, recoverable admin actions", () => {
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
    assert.match(pageSource, /action="\/admin\/staff\/\$\{[^}]+\.id\}\/remove"/, `${pageName} rows need a Remove control`);
    assert.match(pageSource, /historical records|preserved|recoverable/i, `${pageName} removal UI should explain that history is preserved`);
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

test("staff removal is soft and leaves an auditable recovery path", () => {
  const removeRoute = routeSource(
    'app.post("/admin/staff/:id/remove"',
    'app.post("/admin/staff/:id/reactivate"'
  );

  assert.match(removeRoute, /status\s*=\s*'inactive'/);
  assert.match(removeRoute, /staff_account_events|recordStaffAccountEvent/);
  assert.doesNotMatch(removeRoute, /DELETE\s+FROM\s+users/i);
});
