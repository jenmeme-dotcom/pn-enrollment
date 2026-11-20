const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, beforeEach, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");
const timeZone = "America/New_York";

let serverProcess;
let database;
let temporaryDirectory;
let baseUrl;
let adminCookie;
let instructorCookie;
let studentCookie;
let adminId;
let instructorId;

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
        SESSION_SECRET: "staff-timesheet-test-secret"
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

async function postForm(route, fields, cookie) {
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

async function getHtml(route, cookie) {
  const response = await fetch(`${baseUrl}${route}`, { headers: { cookie }, redirect: "manual" });
  const html = await response.text();
  assert.equal(response.status, 200, `Expected ${route} to render.\n${html.slice(0, 800)}`);
  return html;
}

function addDays(dateText, days) {
  const value = new Date(`${dateText}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function currentEasternWeek() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const weekStart = addDays(today, -weekday);
  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
    dueDate: addDays(weekStart, 7),
    previousWeekStart: addDays(weekStart, -7),
    nextWeekStart: addDays(weekStart, 7)
  };
}

function insertEntry({ clockInDate, clockOutDate = clockInDate, status = "open", userId = instructorId }) {
  return Number(database.prepare(`
    INSERT INTO staff_time_entries (user_id, clock_in_at, clock_out_at, status)
    VALUES (?, ?, ?, ?)
  `).run(
    userId,
    `${clockInDate} 12:00:00`,
    clockOutDate ? `${clockOutDate} 13:00:00` : null,
    status
  ).lastInsertRowid);
}

function parseStoredInstant(value) {
  const text = String(value || "");
  return new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(text) ? text : `${text.replace(" ", "T")}Z`);
}

function newYorkDateTimeParts(value) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    weekday: "long",
    year: "numeric"
  }).formatToParts(parseStoredInstant(value)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-staff-timesheet-"));
  const databaseFile = path.join(temporaryDirectory, "timesheet.sqlite");
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile);

  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA busy_timeout = 5000;");
  const photoStorageName = "test-photo.png";
  fs.mkdirSync(path.join(temporaryDirectory, "uploads"), { recursive: true });
  fs.writeFileSync(
    path.join(temporaryDirectory, "uploads", photoStorageName),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  );
  database.prepare(`
    UPDATE users
    SET organization_status = 'organized', photo_review_status = 'approved', photo_storage_name = ?
    WHERE email = 'student@browardmiamihi.com'
  `).run(photoStorageName);
  adminId = database.prepare("SELECT id FROM users WHERE email = 'admin@browardmiamihi.com'").get().id;
  instructorId = database.prepare("SELECT id FROM users WHERE email = 'instructor@browardmiamihi.com'").get().id;

  adminCookie = await login("admin@browardmiamihi.com", "AdminPass123!", "faculty");
  instructorCookie = await login("instructor@browardmiamihi.com", "InstructorPass123!", "faculty");
  studentCookie = await login("student@browardmiamihi.com", "StudentPass123!", "student");
});

beforeEach(() => {
  database.prepare("DELETE FROM staff_weekly_timesheets").run();
  database.prepare("DELETE FROM staff_time_entries").run();
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

test("clock-out leaves an entry ready for one weekly Sunday-deadline submission", async () => {
  let response = await postForm("/admin/staff-portal/clock-in", { note: "Start shift" }, instructorCookie);
  assert.equal(response.status, 302);
  response = await postForm("/admin/staff-portal/clock-out", { note: "End shift" }, instructorCookie);
  assert.equal(response.status, 302);

  const entry = database.prepare("SELECT * FROM staff_time_entries WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(instructorId);
  assert.ok(entry.clock_out_at, "Expected clock-out to close the time entry");
  assert.equal(entry.status, "open", "Closed entries stay unsubmitted until the weekly Submit button is used");

  const { weekStart } = currentEasternWeek();
  const html = await getHtml("/admin/staff-portal", instructorCookie);
  assert.match(html, />\s*Weekly Timesheets\s*</i);
  assert.match(html, /Sunday[^<]*12:00\s*AM[^<]*(?:ET|Eastern)[^<]*00:00/i);
  assert.match(html, /action="\/admin\/staff-portal\/timesheets\/submit"/);
  assert.match(html, new RegExp(`name="weekStart"[^>]*value="${weekStart}"`));
  assert.match(html, />\s*Submit (?:this )?week\s*</i);
  assert.match(html, />\s*Ready\s*</i, "Closed entries should be labeled Ready before weekly submission");
});

test("an open clock entry blocks weekly submission without partial updates", async () => {
  const { weekStart } = currentEasternWeek();
  const closedId = insertEntry({ clockInDate: addDays(weekStart, 1) });
  insertEntry({ clockInDate: addDays(weekStart, 2), clockOutDate: null });

  const response = await postForm("/admin/staff-portal/timesheets/submit", { weekStart }, instructorCookie);
  assert.equal(response.status, 303);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM staff_weekly_timesheets").get().count, 0);
  assert.equal(database.prepare("SELECT status FROM staff_time_entries WHERE id = ?").get(closedId).status, "open");

  const html = await getHtml("/admin/staff-portal", instructorCookie);
  assert.match(html, /clock out[^.]*before submitting/i);
});

test("weekly submission is scoped to the signed-in staff member, preserves adjacent weeks, and is idempotent", async () => {
  const { weekStart, weekEnd, dueDate, previousWeekStart, nextWeekStart } = currentEasternWeek();
  const previousId = insertEntry({ clockInDate: addDays(previousWeekStart, 2) });
  const currentIds = [
    insertEntry({ clockInDate: weekStart }),
    insertEntry({ clockInDate: addDays(weekStart, 5) })
  ];
  const nextId = insertEntry({ clockInDate: nextWeekStart });

  const response = await postForm("/admin/staff-portal/timesheets/submit", {
    staffId: String(adminId),
    weekStart
  }, instructorCookie);
  assert.equal(response.status, 303);

  const submission = database.prepare("SELECT * FROM staff_weekly_timesheets WHERE user_id = ? AND week_start = ?").get(instructorId, weekStart);
  assert.ok(submission, "Expected one weekly submission for the signed-in instructor");
  assert.equal(submission.week_end, weekEnd);
  assert.ok(submission.submitted_at);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM staff_weekly_timesheets WHERE user_id = ?").get(adminId).count, 0, "Injected staffId must be ignored");

  const dueParts = newYorkDateTimeParts(submission.due_at);
  assert.equal(dueParts.weekday, "Sunday");
  assert.equal(`${dueParts.year}-${dueParts.month}-${dueParts.day}`, dueDate);
  assert.equal(dueParts.hour, "00");
  assert.equal(dueParts.minute, "00");

  for (const entryId of currentIds) {
    assert.equal(database.prepare("SELECT status FROM staff_time_entries WHERE id = ?").get(entryId).status, "submitted");
  }
  assert.equal(database.prepare("SELECT status FROM staff_time_entries WHERE id = ?").get(previousId).status, "open");
  assert.equal(database.prepare("SELECT status FROM staff_time_entries WHERE id = ?").get(nextId).status, "open");

  const firstSubmittedAt = submission.submitted_at;
  const duplicate = await postForm("/admin/staff-portal/timesheets/submit", { weekStart }, instructorCookie);
  assert.equal(duplicate.status, 303);
  const repeated = database.prepare("SELECT * FROM staff_weekly_timesheets WHERE user_id = ? AND week_start = ?").all(instructorId, weekStart);
  assert.equal(repeated.length, 1, "A repeated weekly submission must not create another record");
  assert.equal(repeated[0].submitted_at, firstSubmittedAt, "A repeated submission must not rewrite the original timestamp");

  const html = await getHtml("/admin/staff-portal", instructorCookie);
  assert.match(html, />\s*Submitted\s*</i);
  assert.doesNotMatch(html, new RegExp(`action="/admin/staff-portal/timesheets/submit"[\\s\\S]{0,500}name="weekStart"[^>]*value="${weekStart}"`));
});

test("a missed Sunday midnight deadline remains submittable and is clearly marked late", async () => {
  const { previousWeekStart } = currentEasternWeek();
  const entryId = insertEntry({ clockInDate: addDays(previousWeekStart, 3) });

  const response = await postForm("/admin/staff-portal/timesheets/submit", { weekStart: previousWeekStart }, instructorCookie);
  assert.equal(response.status, 303);
  const submission = database.prepare("SELECT * FROM staff_weekly_timesheets WHERE user_id = ? AND week_start = ?").get(instructorId, previousWeekStart);
  assert.ok(submission, "Late work should still be recorded instead of discarded");
  assert.equal(submission.status, "submitted");
  assert.ok(
    parseStoredInstant(submission.submitted_at) > parseStoredInstant(submission.due_at),
    "A late submission must retain evidence that it arrived after the deadline"
  );
  assert.equal(database.prepare("SELECT status FROM staff_time_entries WHERE id = ?").get(entryId).status, "submitted");

  const html = await getHtml("/admin/staff-portal", instructorCookie);
  assert.match(html, />\s*Submitted late\s*</i);
});

test("only staff can submit their own week and an admin viewing another employee sees no submit control", async () => {
  const { weekStart } = currentEasternWeek();
  insertEntry({ clockInDate: addDays(weekStart, 1) });

  const adminView = await getHtml(`/admin/staff-portal?staffId=${instructorId}`, adminCookie);
  assert.doesNotMatch(adminView, /action="\/admin\/staff-portal\/timesheets\/submit"/);

  const response = await postForm("/admin/staff-portal/timesheets/submit", { weekStart }, studentCookie);
  assert.equal(response.status, 403);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM staff_weekly_timesheets").get().count, 0);
});
