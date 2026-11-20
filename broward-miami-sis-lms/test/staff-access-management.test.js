const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");
const defaultAdminEmail = "admin@browardmiamihi.com";
const defaultAdminPassword = "AdminPass123!";
const defaultInstructorPassword = "InstructorPass123!";

let serverProcess;
let database;
let temporaryDirectory;
let baseUrl;
let adminCookie;
let instructorCookie;
let adminUser;
let usernameUser;
let duplicateUsernameUser;
let editUser;
let lifecycleUser;

function reservePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const { port } = socket.address();
      socket.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function startServer(port, databaseFile) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`Server did not start in time.\n${output}`)), 120_000);
    serverProcess = spawn(process.execPath, ["--no-warnings", "src/server.js"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_FILE: databaseFile,
        EMAIL_DELIVERY_ENABLED: "false",
        NODE_ENV: "test",
        PORT: String(port),
        PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
        SESSION_SECRET: "staff-access-management-test-secret"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    const onOutput = (chunk) => {
      output += chunk.toString();
      if (!output.includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      resolve();
    };
    serverProcess.stdout.on("data", onOutput);
    serverProcess.stderr.on("data", onOutput);
    serverProcess.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    serverProcess.once("exit", (code, signal) => {
      if (output.includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      reject(new Error(`Server exited before startup (${code ?? signal}).\n${output}`));
    });
  });
}

async function postForm(route, body, cookie) {
  return fetch(`${baseUrl}${route}`, {
    body: new URLSearchParams(body),
    headers: { "content-type": "application/x-www-form-urlencoded", cookie },
    method: "POST",
    redirect: "manual"
  });
}

async function getPage(route, cookie) {
  const response = await fetch(`${baseUrl}${route}`, { headers: { cookie }, redirect: "manual" });
  return { response, html: await response.text() };
}

async function signIn(identifier, password, loginRole = "faculty") {
  const response = await postForm("/login", { username: identifier, password, loginRole }, "");
  const setCookie = response.headers.getSetCookie?.()[0] || response.headers.get("set-cookie") || "";
  return {
    cookie: setCookie.split(";", 1)[0],
    location: response.headers.get("location"),
    response
  };
}

function assertRedirect(response, expectedPath) {
  assert.ok([302, 303].includes(response.status), `Expected redirect, received ${response.status}`);
  const location = response.headers.get("location");
  assert.ok(location, "Expected a redirect location");
  if (expectedPath) assert.equal(new URL(location, baseUrl).pathname, expectedPath);
}

function assertValidationResponse(response) {
  assert.ok([302, 303, 400, 409, 422].includes(response.status), `Expected handled validation response, received ${response.status}`);
}

function userById(id) {
  return database.prepare(`
    SELECT id, role, first_name, last_name, email, login_username, phone, status, organization_status
    FROM users WHERE id = ?
  `).get(id);
}

function accountEvents(userId, action) {
  const actionClause = action ? "AND action = ?" : "";
  const values = action ? [userId, action] : [userId];
  return database.prepare(`
    SELECT target_user_id, action, details, changed_by, created_at
    FROM staff_account_events
    WHERE target_user_id = ? ${actionClause}
    ORDER BY id
  `).all(...values);
}

function sectionContainingHeading(html, heading) {
  const marker = `<h2>${heading}</h2>`;
  const headingIndex = html.indexOf(marker);
  assert.notEqual(headingIndex, -1, `Expected section heading ${heading}`);
  const start = html.lastIndexOf("<section", headingIndex);
  const end = html.indexOf("</section>", headingIndex);
  assert.ok(start >= 0 && end > headingIndex, `Expected complete section for ${heading}`);
  return html.slice(start, end + "</section>".length);
}

function assertAction(html, action, description) {
  assert.ok(
    html.includes(`action="${action}"`) || html.includes(`href="${action}"`),
    `Expected ${description}: ${action}`
  );
}

function insertStaffFixture({ firstName, lastName, email, loginUsername = null, role = "instructor" }) {
  const passwordHash = database.prepare("SELECT password_hash FROM users WHERE email = 'instructor@browardmiamihi.com'").get().password_hash;
  const result = database.prepare(`
    INSERT INTO users (
      role, first_name, last_name, email, login_username, phone, password_hash,
      status, organization_status, class_lock_reason
    ) VALUES (?, ?, ?, ?, ?, '(954) 555-0199', ?, 'active', 'organized', NULL)
  `).run(role, firstName, lastName, email, loginUsername, passwordHash);
  return userById(Number(result.lastInsertRowid));
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-staff-access-"));
  const databaseFile = path.join(temporaryDirectory, "staff-access.sqlite");
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile);

  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA busy_timeout = 5000;");

  const userColumns = database.prepare("PRAGMA table_info(users)").all();
  const loginUsernameColumn = userColumns.find((column) => column.name === "login_username");
  assert.ok(loginUsernameColumn, "users must include nullable login_username");
  assert.equal(loginUsernameColumn.notnull, 0, "login_username must remain nullable for existing email logins");

  const eventColumns = database.prepare("PRAGMA table_info(staff_account_events)").all().map((column) => column.name);
  assert.deepEqual(
    eventColumns,
    ["id", "target_user_id", "action", "details", "changed_by", "created_at"],
    "staff account history must retain target, action, details, administrator, and timestamp"
  );

  adminUser = database.prepare("SELECT * FROM users WHERE email = ?").get(defaultAdminEmail);
  usernameUser = insertStaffFixture({
    firstName: "Legacy",
    lastName: "Username",
    email: "legacy.username@example.test"
  });
  duplicateUsernameUser = insertStaffFixture({
    firstName: "Taken",
    lastName: "Username",
    email: "taken.username@example.test",
    loginUsername: "taken.staff"
  });
  editUser = insertStaffFixture({
    firstName: "Edit",
    lastName: "Fixture",
    email: "edit.fixture@example.test"
  });
  lifecycleUser = insertStaffFixture({
    firstName: "Lifecycle",
    lastName: "Staff",
    email: "lifecycle.staff@example.test"
  });

  database.prepare(`
    INSERT INTO staff_time_entries (user_id, clock_in_at, clock_out_at, status)
    VALUES (?, '2026-11-16T14:00:00.000Z', '2026-11-16T22:00:00.000Z', 'submitted')
  `).run(lifecycleUser.id);
  database.prepare(`
    INSERT INTO staff_pay_records (
      user_id, period_start, period_end, timesheet_due, paycheck_date,
      regular_hours, overtime_hours, gross_pay_cents, net_pay_cents, status, note, created_by
    ) VALUES (?, '2026-11-16', '2026-11-22', '2026-11-22', '2026-11-27', 8, 0, 16000, 14000, 'posted', 'Historical payroll fixture', ?)
  `).run(lifecycleUser.id, adminUser.id);

  const adminLogin = await signIn(defaultAdminEmail, defaultAdminPassword);
  assertRedirect(adminLogin.response, "/admin");
  assert.match(adminLogin.cookie, /^bmhi\.sid=/);
  adminCookie = adminLogin.cookie;

  const instructorLogin = await signIn("instructor@browardmiamihi.com", defaultInstructorPassword);
  assertRedirect(instructorLogin.response, "/admin");
  assert.match(instructorLogin.cookie, /^bmhi\.sid=/);
  instructorCookie = instructorLogin.cookie;
});

after(async () => {
  database?.close();
  if (serverProcess && serverProcess.exitCode === null) {
    await new Promise((resolve) => {
      serverProcess.once("exit", resolve);
      serverProcess.kill("SIGTERM");
      setTimeout(resolve, 5_000).unref();
    });
  }
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
});

test("existing staff email remains the login fallback until an administrator assigns a username", async () => {
  const loginPage = await getPage("/login", "");
  assert.equal(loginPage.response.status, 200);
  assert.match(loginPage.html, /<input[^>]+name="username"[^>]+type="text"/);

  const legacyLogin = await signIn(usernameUser.email, defaultInstructorPassword);
  assertRedirect(legacyLogin.response, "/admin");

  const response = await postForm(`/admin/users/${usernameUser.id}/login-username`, {
    loginUsername: "legacy.staff"
  }, adminCookie);
  assertRedirect(response);

  const updated = userById(usernameUser.id);
  assert.equal(updated.login_username, "legacy.staff");
  assert.equal(updated.email, usernameUser.email, "changing a login username must not change the contact email");

  const usernameLogin = await signIn("legacy.staff", defaultInstructorPassword);
  assertRedirect(usernameLogin.response, "/admin");

  const oldEmailLogin = await signIn(usernameUser.email, defaultInstructorPassword);
  assertRedirect(oldEmailLogin.response, "/login");
  const deniedPage = await getPage("/admin", oldEmailLogin.cookie);
  assertRedirect(deniedPage.response, "/login");

  const events = accountEvents(usernameUser.id, "changed_username");
  assert.equal(events.length, 1);
  assert.equal(events[0].changed_by, adminUser.id);
  assert.match(events[0].details, /legacy\.staff/i);
  assert.ok(events[0].created_at);
});

test("username changes reject invalid and duplicate identifiers and are admin-only", async () => {
  const original = userById(editUser.id);
  const invalid = await postForm(`/admin/users/${editUser.id}/login-username`, {
    loginUsername: "invalid username!"
  }, adminCookie);
  assertValidationResponse(invalid);
  assert.equal(userById(editUser.id).login_username, original.login_username);

  const duplicate = await postForm(`/admin/users/${editUser.id}/login-username`, {
    loginUsername: duplicateUsernameUser.login_username.toUpperCase()
  }, adminCookie);
  assertValidationResponse(duplicate);
  assert.equal(userById(editUser.id).login_username, original.login_username);

  const instructorAttempt = await postForm(`/admin/users/${editUser.id}/login-username`, {
    loginUsername: "forbidden.staff"
  }, instructorCookie);
  assert.equal(instructorAttempt.status, 403);
  assert.equal(userById(editUser.id).login_username, original.login_username);
});

test("admins can edit staff contact details and roles without conflating them with login usernames", async () => {
  const editPage = await getPage(`/admin/staff/${editUser.id}/edit`, adminCookie);
  assert.equal(editPage.response.status, 200);
  assert.match(editPage.html, /Edit Account/i);
  assert.match(editPage.html, /name="firstName"/);
  assert.match(editPage.html, /name="lastName"/);
  assert.match(editPage.html, /name="email"/);
  assert.match(editPage.html, /name="phone"/);
  assert.match(editPage.html, /name="role"/);
  assert.doesNotMatch(
    editPage.html,
    /name="loginUsername"/,
    "contact-account editing and login-username editing must remain separate workflows"
  );

  const instructorGet = await getPage(`/admin/staff/${editUser.id}/edit`, instructorCookie);
  assert.equal(instructorGet.response.status, 403);
  const instructorPost = await postForm(`/admin/staff/${editUser.id}/edit`, {
    firstName: "Forbidden",
    lastName: "Edit",
    email: editUser.email,
    phone: "954-555-0000",
    role: "admin"
  }, instructorCookie);
  assert.equal(instructorPost.status, 403);

  const response = await postForm(`/admin/staff/${editUser.id}/edit`, {
    firstName: "Updated",
    lastName: "Account",
    email: "updated.account@example.test",
    phone: "954-555-0137",
    role: "admin"
  }, adminCookie);
  assertRedirect(response);
  assert.deepEqual({ ...userById(editUser.id) }, {
    id: editUser.id,
    role: "admin",
    first_name: "Updated",
    last_name: "Account",
    email: "updated.account@example.test",
    login_username: null,
    phone: "954-555-0137",
    status: "active",
    organization_status: "organized"
  });

  const editEvents = accountEvents(editUser.id, "edited_account");
  assert.equal(editEvents.length, 1);
  assert.equal(editEvents[0].changed_by, adminUser.id);
  assert.match(editEvents[0].details, /updated\.account@example\.test/i);

  for (const invalidUpdate of [
    {
      firstName: "Updated",
      lastName: "Account",
      email: "not-an-email",
      phone: "954-555-0137",
      role: "admin"
    },
    {
      firstName: "Updated",
      lastName: "Account",
      email: defaultAdminEmail.toUpperCase(),
      phone: "954-555-0137",
      role: "admin"
    },
    {
      firstName: "Updated",
      lastName: "Account",
      email: "updated.account@example.test",
      phone: "954-555-0137",
      role: "student"
    },
    {
      firstName: "",
      lastName: "Account",
      email: "updated.account@example.test",
      phone: "954-555-0137",
      role: "admin"
    }
  ]) {
    const invalidResponse = await postForm(`/admin/staff/${editUser.id}/edit`, invalidUpdate, adminCookie);
    assertValidationResponse(invalidResponse);
    assert.equal(userById(editUser.id).email, "updated.account@example.test");
    assert.equal(userById(editUser.id).role, "admin");
  }

  const restoreInstructorRole = await postForm(`/admin/staff/${editUser.id}/edit`, {
    firstName: "Updated",
    lastName: "Account",
    email: "updated.account@example.test",
    phone: "954-555-0137",
    role: "instructor"
  }, adminCookie);
  assertRedirect(restoreInstructorRole);
  assert.equal(userById(editUser.id).role, "instructor");
});

test("inactivation blocks login, preserves staff history, and is not undone by password reset", async () => {
  const beforeTimeEntries = database.prepare("SELECT COUNT(*) AS count FROM staff_time_entries WHERE user_id = ?").get(lifecycleUser.id).count;
  const beforePayRecords = database.prepare("SELECT COUNT(*) AS count FROM staff_pay_records WHERE user_id = ?").get(lifecycleUser.id).count;

  for (const route of [
    `/admin/staff/${lifecycleUser.id}/inactivate`,
    `/admin/staff/${lifecycleUser.id}/reactivate`,
    `/admin/staff/${lifecycleUser.id}/remove`
  ]) {
    const forbidden = await postForm(route, { reason: "Instructor must not manage staff access" }, instructorCookie);
    assert.equal(forbidden.status, 403, `${route} must remain admin-only`);
  }

  const inactivate = await postForm(`/admin/staff/${lifecycleUser.id}/inactivate`, {
    reason: "Employment access paused"
  }, adminCookie);
  assertRedirect(inactivate);
  assert.equal(userById(lifecycleUser.id).status, "inactive");
  assert.equal(userById(lifecycleUser.id).organization_status, "not_organized");
  const inactiveRoles = await getPage("/admin/instructor-roles", adminCookie);
  assert.equal(inactiveRoles.response.status, 200);
  const inactiveSection = sectionContainingHeading(inactiveRoles.html, "Inactive Instructor Accounts");
  assert.match(inactiveSection, /Lifecycle Staff/);
  assertAction(inactiveSection, `/admin/staff/${lifecycleUser.id}/reactivate`, "inactive instructor Reactivate control");
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM staff_time_entries WHERE user_id = ?").get(lifecycleUser.id).count,
    beforeTimeEntries
  );
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM staff_pay_records WHERE user_id = ?").get(lifecycleUser.id).count,
    beforePayRecords
  );

  const inactiveLogin = await signIn(lifecycleUser.email, defaultInstructorPassword);
  assertRedirect(inactiveLogin.response, "/login");

  const inactivatedEvents = accountEvents(lifecycleUser.id, "inactivated");
  assert.equal(inactivatedEvents.length, 1);
  assert.equal(inactivatedEvents[0].changed_by, adminUser.id);
  assert.match(inactivatedEvents[0].details, /Employment access paused/i);

  const resetPassword = await postForm(
    `/admin/instructor-roles/${encodeURIComponent(lifecycleUser.email)}/reset-password`,
    {},
    adminCookie
  );
  assertRedirect(resetPassword, "/admin/instructor-roles");
  assert.equal(userById(lifecycleUser.id).status, "inactive", "password reset must not reactivate access");
  assert.equal(userById(lifecycleUser.id).organization_status, "not_organized");

  const reactivate = await postForm(`/admin/staff/${lifecycleUser.id}/reactivate`, {
    reason: "Access restored by administrator"
  }, adminCookie);
  assertRedirect(reactivate);
  assert.equal(userById(lifecycleUser.id).status, "active");
  assert.equal(userById(lifecycleUser.id).organization_status, "organized");
  assert.equal(accountEvents(lifecycleUser.id, "reactivated").length, 1);

  const restoredLogin = await signIn(lifecycleUser.email, defaultInstructorPassword);
  assertRedirect(restoredLogin.response, "/admin");
});

test("soft removal retains the user and history, separates removed staff, and permits restoration", async () => {
  const beforeUserCount = database.prepare("SELECT COUNT(*) AS count FROM users WHERE id = ?").get(lifecycleUser.id).count;
  const beforeTimeEntries = database.prepare("SELECT COUNT(*) AS count FROM staff_time_entries WHERE user_id = ?").get(lifecycleUser.id).count;
  const beforePayRecords = database.prepare("SELECT COUNT(*) AS count FROM staff_pay_records WHERE user_id = ?").get(lifecycleUser.id).count;

  const remove = await postForm(`/admin/staff/${lifecycleUser.id}/remove`, {
    reason: "No longer employed"
  }, adminCookie);
  assertRedirect(remove);

  const removedUser = userById(lifecycleUser.id);
  assert.equal(removedUser.status, "inactive");
  assert.equal(removedUser.organization_status, "not_organized");
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM users WHERE id = ?").get(lifecycleUser.id).count,
    beforeUserCount,
    "Remove must never delete the user row"
  );
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM staff_time_entries WHERE user_id = ?").get(lifecycleUser.id).count,
    beforeTimeEntries
  );
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM staff_pay_records WHERE user_id = ?").get(lifecycleUser.id).count,
    beforePayRecords
  );

  const removedEvents = accountEvents(lifecycleUser.id, "removed");
  assert.equal(removedEvents.length, 1);
  assert.equal(removedEvents[0].changed_by, adminUser.id);
  assert.match(removedEvents[0].details, /No longer employed/i);
  assert.ok(removedEvents[0].created_at);

  const instructorRoles = await getPage("/admin/instructor-roles", adminCookie);
  assert.equal(instructorRoles.response.status, 200);
  const activeStaff = sectionContainingHeading(instructorRoles.html, "Faculty usernames and passwords");
  assert.doesNotMatch(activeStaff, /Lifecycle Staff/, "removed people must be hidden from the active staff list");
  const removedStaff = sectionContainingHeading(instructorRoles.html, "Removed Staff Accounts");
  assert.match(removedStaff, /Lifecycle Staff/);
  assert.match(removedStaff, /No longer employed/);
  assert.match(removedStaff, /Removed by/i);
  assertAction(removedStaff, `/admin/staff/${lifecycleUser.id}/reactivate`, "Restore or Reactivate control");
  assert.match(removedStaff, />\s*(?:Restore|Reactivate)(?: access)?\s*</i);

  const history = sectionContainingHeading(instructorRoles.html, "Account Change History");
  assert.match(history, /Lifecycle Staff/);
  assert.match(history, /removed/i);
  assert.match(history, /No longer employed/i);

  const restore = await postForm(`/admin/staff/${lifecycleUser.id}/reactivate`, {
    reason: "Employee returned"
  }, adminCookie);
  assertRedirect(restore);
  assert.equal(userById(lifecycleUser.id).status, "active");
  assert.equal(userById(lifecycleUser.id).organization_status, "organized");
  const reactivatedEvents = accountEvents(lifecycleUser.id, "reactivated");
  assert.equal(reactivatedEvents.length, 2);
  assert.match(reactivatedEvents.at(-1).details, /Employee returned/i);
});

test("admin and instructor role tables expose separate edit, username, access, and remove controls", async () => {
  const adminRoles = await getPage("/admin/admin-roles", adminCookie);
  assert.equal(adminRoles.response.status, 200);
  const staticAdmin = database.prepare("SELECT id FROM users WHERE email = 'rome.liwag@browardmiamihi.com'").get();
  assert.ok(staticAdmin);
  assertAction(adminRoles.html, `/admin/staff/${staticAdmin.id}/edit`, "Edit Account button for an administrator");
  assertAction(adminRoles.html, `/admin/users/${staticAdmin.id}/login-username`, "administrator username form");
  assertAction(adminRoles.html, `/admin/staff/${staticAdmin.id}/inactivate`, "administrator Inactivate control");
  assertAction(adminRoles.html, `/admin/staff/${staticAdmin.id}/remove`, "administrator Remove control");
  assert.match(adminRoles.html, />\s*Edit Account\s*</i);

  const instructorRoles = await getPage("/admin/instructor-roles", adminCookie);
  assert.equal(instructorRoles.response.status, 200);
  assertAction(instructorRoles.html, `/admin/staff/${editUser.id}/edit`, "Edit Account button for an instructor");
  assertAction(instructorRoles.html, `/admin/users/${editUser.id}/login-username`, "instructor username form");
  assertAction(instructorRoles.html, `/admin/staff/${editUser.id}/inactivate`, "instructor Inactivate control");
  assertAction(instructorRoles.html, `/admin/staff/${editUser.id}/remove`, "instructor Remove control");
  assert.match(instructorRoles.html, />\s*Edit Account\s*</i);
  assert.match(instructorRoles.html, /Account Change History/);
});

test("an administrator cannot inactivate their own account or the last active admin", async () => {
  const selfRoleChange = await postForm(`/admin/staff/${adminUser.id}/edit`, {
    firstName: adminUser.first_name,
    lastName: adminUser.last_name,
    email: adminUser.email,
    phone: adminUser.phone || "",
    role: "instructor"
  }, adminCookie);
  assertValidationResponse(selfRoleChange);
  assert.equal(userById(adminUser.id).role, "admin", "an admin must not demote their own signed-in account");

  const selfAttempt = await postForm(`/admin/staff/${adminUser.id}/inactivate`, {
    reason: "Self-inactivation should be blocked"
  }, adminCookie);
  assertValidationResponse(selfAttempt);
  assert.equal(userById(adminUser.id).status, "active", "an admin must not inactivate their own account");

  database.prepare(`
    UPDATE users
    SET status = 'inactive', organization_status = 'not_organized'
    WHERE role = 'admin' AND id != ?
  `).run(adminUser.id);
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 'active'").get().count,
    1,
    "fixture should leave the signed-in administrator as the last active admin"
  );

  const lastAdminAttempt = await postForm(`/admin/staff/${adminUser.id}/inactivate`, {
    reason: "Last-active-admin protection"
  }, adminCookie);
  assertValidationResponse(lastAdminAttempt);
  assert.equal(userById(adminUser.id).status, "active");
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 'active'").get().count,
    1
  );
  assert.equal(accountEvents(adminUser.id, "inactivated").length, 0);
});
