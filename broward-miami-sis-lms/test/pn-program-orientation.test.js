const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const express = require("express");

const {
  PN_ORIENTATION_PATH,
  PN_ORIENTATION_LESSON_TITLE,
  hasPnOrientationAccess,
  renderPnOrientationCard,
  renderPnOrientationPageContent,
  registerPnOrientationMediaRoutes
} = require("../src/pnOrientation");

let database;
let server;
let materialsDirectory;
let orientationDirectory;
let baseUrl;

const videoBytes = Buffer.from("0123456789abcdefghijklmnopqrstuvwxyz");
const transcript = "Welcome to Nurse Joy's LPN program.\n\nComplete Complio before clinicals.\n\n<script>alert('unsafe')</script> & review.";

function studentHeaders(userId = 1) {
  return { "x-test-user-id": String(userId), "x-test-role": "student" };
}

before(async () => {
  // This suite owns an in-memory database and synthetic media only; it never
  // starts the application initializer or opens the school's student database.
  database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE courses (id INTEGER PRIMARY KEY, slug TEXT, category TEXT);
    CREATE TABLE enrollments (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      course_id INTEGER,
      status TEXT,
      withdrawn_at TEXT
    );
    INSERT INTO courses (id, slug, category) VALUES
      (1, 'introduction-to-nursing-practical-nursing', 'Practical Nursing Course'),
      (2, 'practical-nursing', 'Diploma Program'),
      (3, 'home-health-aide', 'Diploma Program'),
      (4, 'unrelated-course', 'Practical Nursing');
    INSERT INTO enrollments (user_id, course_id, status, withdrawn_at) VALUES
      (1, 1, 'active', NULL),
      (2, 2, 'completed', NULL),
      (3, 3, 'active', NULL),
      (4, 1, 'active', '2026-11-01'),
      (5, 1, 'cancelled', NULL),
      (6, 1, 'inactive', NULL),
      (7, 4, 'active', NULL),
      (8, 1, 'completed', NULL),
      (9, 2, 'active', NULL),
      (10, 3, 'completed', NULL);
  `);

  materialsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-pn-orientation-"));
  orientationDirectory = path.join(materialsDirectory, "lpn-program-orientation");
  fs.mkdirSync(orientationDirectory);
  fs.writeFileSync(path.join(orientationDirectory, "nurse-joy-lpn-welcome.mp4"), videoBytes);
  fs.writeFileSync(path.join(orientationDirectory, "nurse-joy-lpn-welcome-poster.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  fs.writeFileSync(path.join(orientationDirectory, "transcript.txt"), transcript);

  const app = express();
  app.use((req, _res, next) => {
    const userId = Number(req.get("x-test-user-id"));
    if (userId) req.user = { id: userId, role: req.get("x-test-role") || "student" };
    next();
  });
  const requireAuth = (req, res, next) => req.user ? next() : res.sendStatus(401);
  const requireRole = (role) => (req, res, next) => req.user?.role === role ? next() : res.sendStatus(403);
  registerPnOrientationMediaRoutes({ app, db: database, requireAuth, requireRole, courseMaterialsDir: materialsDirectory });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (database) database.close();
  if (materialsDirectory) fs.rmSync(materialsDirectory, { recursive: true, force: true });
});

test("orientation access includes both PN course enrollments and the full diploma", () => {
  for (const userId of [1, 2, 8, 9]) {
    assert.equal(hasPnOrientationAccess(database, userId), true, `PN student ${userId} should have access`);
  }
});

test("other programs, withdrawn/cancelled enrollments, and unenrolled users do not get PN orientation", () => {
  for (const userId of [3, 4, 5, 6, 7, 10, 99]) {
    assert.equal(hasPnOrientationAccess(database, userId), false, `User ${userId} should not have access`);
  }
});

test("every orientation media endpoint requires an authenticated PN student", async () => {
  for (const resource of ["video", "poster", "transcript"]) {
    const resourceUrl = `${baseUrl}${PN_ORIENTATION_PATH}/${resource}`;
    const anonymous = await fetch(resourceUrl);
    assert.equal(anonymous.status, 401, `${resource}: anonymous`);

    for (const userId of [3, 4, 5, 99]) {
      const denied = await fetch(resourceUrl, { headers: studentHeaders(userId) });
      assert.equal(denied.status, 403, `${resource}: user ${userId}`);
    }

    const instructor = await fetch(resourceUrl, { headers: { ...studentHeaders(), "x-test-role": "instructor" } });
    assert.equal(instructor.status, 403, `${resource}: instructor using student media route`);
  }
});

test("the MP4 supports byte ranges and HEAD without exposing a public media URL", async () => {
  const response = await fetch(`${baseUrl}${PN_ORIENTATION_PATH}/video`, {
    headers: { ...studentHeaders(), range: "bytes=4-12" }
  });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-type"), "video/mp4");
  assert.equal(response.headers.get("accept-ranges"), "bytes");
  assert.equal(response.headers.get("content-range"), `bytes 4-12/${videoBytes.length}`);
  assert.match(response.headers.get("cache-control"), /\bprivate\b/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), videoBytes.subarray(4, 13));

  const head = await fetch(`${baseUrl}${PN_ORIENTATION_PATH}/video`, { method: "HEAD", headers: studentHeaders(2) });
  assert.equal(head.status, 200);
  assert.equal(Number(head.headers.get("content-length")), videoBytes.length);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
});

test("poster and transcript are available to an eligible student with correct content types", async () => {
  const poster = await fetch(`${baseUrl}${PN_ORIENTATION_PATH}/poster`, { headers: studentHeaders() });
  assert.equal(poster.status, 200);
  assert.match(poster.headers.get("content-type"), /^image\/jpeg/);
  assert.match(poster.headers.get("cache-control"), /\bprivate\b/);

  const response = await fetch(`${baseUrl}${PN_ORIENTATION_PATH}/transcript`, { headers: studentHeaders(8) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/plain;.*charset=utf-8/i);
  assert.equal(await response.text(), transcript);
});

test("missing orientation media returns 404 while ineligible users remain forbidden", async () => {
  const original = path.join(orientationDirectory, "nurse-joy-lpn-welcome.mp4");
  const held = `${original}.test-held`;
  fs.renameSync(original, held);
  try {
    const missing = await fetch(`${baseUrl}${PN_ORIENTATION_PATH}/video`, { headers: studentHeaders() });
    assert.equal(missing.status, 404);
    const denied = await fetch(`${baseUrl}${PN_ORIENTATION_PATH}/video`, { headers: studentHeaders(3) });
    assert.equal(denied.status, 403);
  } finally {
    fs.renameSync(held, original);
  }
});

test("orientation UI supplies an opt-in video, the closed-mouth poster route, transcript, and Complio reminder", () => {
  const card = renderPnOrientationCard();
  assert.match(card, /Start Here/i);
  assert.match(card, /LPN Program Orientation/i);
  assert.ok(card.includes(PN_ORIENTATION_PATH));
  assert.match(card, /Complio/);

  const page = renderPnOrientationPageContent(transcript);
  assert.match(page, /<video\b[^>]*\bcontrols\b/);
  assert.match(page, /\bplaysinline\b/);
  assert.ok(page.includes(`${PN_ORIENTATION_PATH}/video`));
  assert.ok(page.includes(`${PN_ORIENTATION_PATH}/poster`));
  assert.doesNotMatch(page, /\bautoplay\b/i);
  assert.doesNotMatch(page, /<track\b/i, "The final MP4 already has captions; a default second layer would duplicate them");
  assert.match(page, /Complio/);
  assert.match(page, /before[^<.]{0,90}clinical/i);
  assert.ok(page.includes("&lt;script&gt;"), "Transcript is rendered as escaped text");
  assert.doesNotMatch(page, /<script>alert/);
  assert.match(PN_ORIENTATION_LESSON_TITLE, /LPN Program Orientation with Nurse Joy/);
});
