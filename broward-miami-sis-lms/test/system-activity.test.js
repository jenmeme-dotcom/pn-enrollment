const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");

let serverProcess;
let database;
let temporaryDirectory;
let baseUrl;
let adminCookie;
let instructorCookie;
let studentCookie;
let targetUserId;
let courseId;

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
        SESSION_SECRET: "system-activity-test-secret",
        UPLOAD_DIR: path.join(temporaryDirectory, "uploads")
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

async function login(email, password, loginRole) {
  const response = await fetch(`${baseUrl}/login`, {
    body: new URLSearchParams({ email, password, loginRole }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    redirect: "manual"
  });
  assert.equal(response.status, 302, `Expected ${email} to sign in`);
  const setCookie = response.headers.getSetCookie?.()[0] || response.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";", 1)[0];
  assert.match(cookie, /^bmhi\.sid=/);
  return cookie;
}

async function postForm(route, fields, cookie = adminCookie) {
  return fetch(`${baseUrl}${route}`, {
    body: new URLSearchParams(fields),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie
    },
    method: "POST",
    redirect: "manual"
  });
}

async function getPage(route, cookie) {
  const response = await fetch(`${baseUrl}${route}`, {
    headers: { cookie },
    redirect: "manual"
  });
  return { response, html: await response.text() };
}

function activityActionsForTarget() {
  return database.prepare(`
    SELECT action, details, created_at
    FROM staff_account_events
    WHERE target_user_id = ?
    ORDER BY id
  `).all(targetUserId);
}

async function waitForSystemActivity(route) {
  const query = database.prepare(`
    SELECT activity.*, actor.first_name AS actor_first_name, actor.last_name AS actor_last_name,
      actor.email AS actor_email
    FROM system_activity_log activity
    JOIN users actor ON actor.id = activity.actor_user_id
    WHERE activity.route = ?
    ORDER BY activity.id DESC
    LIMIT 1
  `);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const activity = query.get(route);
    if (activity) return activity;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return null;
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-system-activity-"));
  fs.mkdirSync(path.join(temporaryDirectory, "uploads"), { recursive: true });
  const databaseFile = path.join(temporaryDirectory, "activity.sqlite");
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile);

  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA busy_timeout = 5000;");

  const studentPhoto = "system-activity-student.png";
  fs.writeFileSync(
    path.join(temporaryDirectory, "uploads", studentPhoto),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  );
  database.prepare(`
    UPDATE users
    SET organization_status = 'organized', photo_review_status = 'approved', photo_storage_name = ?
    WHERE email = 'student@browardmiamihi.com'
  `).run(studentPhoto);

  const instructorPassword = database.prepare("SELECT password_hash FROM users WHERE email = 'instructor@browardmiamihi.com'").get().password_hash;
  const result = database.prepare(`
    INSERT INTO users (
      role, first_name, last_name, email, phone, password_hash, status,
      organization_status, class_lock_reason
    )
    VALUES ('instructor', 'Audit', 'Target', 'audit.target@example.com', '954-555-0142', ?, 'active', 'organized', NULL)
  `).run(instructorPassword);
  targetUserId = Number(result.lastInsertRowid);
  courseId = Number(database.prepare("SELECT id FROM courses ORDER BY id LIMIT 1").get().id);

  adminCookie = await login("admin@browardmiamihi.com", "AdminPass123!", "faculty");
  instructorCookie = await login("instructor@browardmiamihi.com", "InstructorPass123!", "faculty");
  studentCookie = await login("student@browardmiamihi.com", "StudentPass123!", "student");
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

test("System Activity is an admin-only trace page", async () => {
  const adminPage = await getPage("/admin/system-activity", adminCookie);
  assert.equal(adminPage.response.status, 200);
  assert.match(adminPage.html, />\s*System Activity\s*</i);
  assert.match(adminPage.html, /Who|Performed by|Administrator/i);
  assert.match(adminPage.html, /Action/i);
  assert.match(adminPage.html, /Affected (?:account|user)|Target/i);
  assert.match(adminPage.html, /Date|Time/i);

  const instructorPage = await getPage("/admin/system-activity", instructorCookie);
  assert.equal(instructorPage.response.status, 403);
  const studentPage = await getPage("/admin/system-activity", studentCookie);
  assert.equal(studentPage.response.status, 403);
});

test("staff account changes record the actor, target, action, time, and useful details", async () => {
  const expectedActions = [];
  let response = await postForm(`/admin/users/${targetUserId}/login-username`, {
    loginUsername: "audit.target.login"
  });
  assert.equal(response.status, 302);
  expectedActions.push("changed_username");

  response = await postForm(`/admin/staff/${targetUserId}/inactivate`, {
    reason: "Access review"
  });
  assert.equal(response.status, 302);
  expectedActions.push("inactivated");

  response = await postForm(`/admin/staff/${targetUserId}/reactivate`, {});
  assert.equal(response.status, 302);
  expectedActions.push("reactivated");

  response = await postForm("/admin/instructor-roles/audit.target%40example.com/reset-password", {});
  assert.equal(response.status, 302);
  expectedActions.push("password_reset");

  response = await postForm(`/admin/staff/${targetUserId}/edit`, {
    email: "audit.target@example.com",
    firstName: "Audited",
    lastName: "Staff Account",
    phone: "954-555-0199",
    role: "instructor"
  });
  assert.equal(response.status, 302);
  expectedActions.push("edited_account");

  const events = activityActionsForTarget();
  const actions = events.map((event) => event.action);
  for (const action of expectedActions) {
    assert.ok(actions.includes(action), `Expected ${action} in ${actions.join(", ")}`);
  }
  assert.ok(events.every((event) => event.created_at), "Every activity row should have a timestamp");

  const { response: pageResponse, html } = await getPage("/admin/system-activity", adminCookie);
  assert.equal(pageResponse.status, 200);
  assert.match(html, /Audited Staff Account/);
  assert.match(html, /System Administrator|Admin User|admin@browardmiamihi\.com/i);
  assert.match(html, /Changed username/i);
  assert.match(html, /Inactivated/i);
  assert.match(html, /Password reset/i);
  assert.match(html, /Edited account/i);
  assert.match(html, /Reactivated/i);
});

test("activity history never exposes credentials or password hashes", async () => {
  const knownHash = database.prepare("SELECT password_hash FROM users WHERE id = ?").get(targetUserId).password_hash;
  const eventText = activityActionsForTarget().map((event) => String(event.details || "")).join("\n");
  const { html } = await getPage("/admin/system-activity", adminCookie);

  assert.doesNotMatch(eventText, /BMHIAdmin2026!|InstructorPass123!|StudentPass123!/);
  assert.ok(!eventText.includes(knownHash), "Audit details must not contain a password hash");
  assert.doesNotMatch(html, /BMHIAdmin2026!|InstructorPass123!|StudentPass123!/);
  assert.ok(!html.includes(knownHash), "System Activity must not render a password hash");
});

test("ordinary admin mutations are automatically traced with sanitized request details", async () => {
  const course = database.prepare("SELECT * FROM courses WHERE id = ?").get(courseId);
  const response = await postForm(`/admin/courses/${courseId}/details`, {
    title: `Audit Trace - ${course.title}`,
    category: course.category,
    description: course.description,
    hours: String(course.hours),
    credentialType: course.credential_type,
    deliveryMode: course.delivery_mode,
    tuition: String(Number(course.tuition_cents || 0) / 100),
    booksSupplies: String(Number(course.books_supplies_cents || 0) / 100),
    registrationFee: String(Number(course.registration_fee_cents || 0) / 100),
    published: String(course.published),
    redirectTo: `/admin/courses/${courseId}/manage#course-details`,
    password: "NeverLogThisPassword!",
    apiToken: "never-log-api-token",
    authorization: "Bearer never-log-authorization",
    sessionSecret: "never-log-session-secret"
  });
  assert.equal(response.status, 302);

  const activity = await waitForSystemActivity(`/admin/courses/${courseId}/details`);

  assert.ok(activity, "Expected the course update to create a system activity row");
  assert.equal(activity.action, "admin_post");
  assert.equal(activity.method, "POST");
  assert.equal(activity.entity_type, "admin_route");
  assert.equal(activity.actor_email, "admin@browardmiamihi.com");
  assert.match(`${activity.actor_first_name} ${activity.actor_last_name}`, /BMHI Administrator/i);
  assert.ok(activity.created_at, "Expected a trace timestamp");
  assert.match(activity.details_json, /Audit Trace/);
  assert.doesNotMatch(activity.details_json, /NeverLogThisPassword|never-log-api-token|never-log-authorization|never-log-session-secret/i);

  const { response: pageResponse, html } = await getPage("/admin/system-activity", adminCookie);
  assert.equal(pageResponse.status, 200);
  assert.match(html, /admin post/i);
  assert.match(html, new RegExp(`/admin/courses/${courseId}/details`));
  assert.match(html, /BMHI Administrator/i);
  assert.doesNotMatch(html, /NeverLogThisPassword|never-log-api-token|never-log-authorization|never-log-session-secret/i);
});
