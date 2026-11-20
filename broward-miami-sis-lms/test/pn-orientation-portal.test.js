const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");

const projectRoot = path.resolve(__dirname, "..");
const orientationPath = "/student/lpn-orientation";
const password = "OrientationFixtureOnly2026!";
const mediaBytes = Buffer.from("0123456789abcdefghijklmnopqrstuvwxyz");
const transcript = "Welcome to the fixture LPN program.\n\nComplete Complio before clinicals.\n\n<script>not markup</script> & review.";
let temporaryDirectory;
let database;
let serverProcess;
let baseUrl;
let pnCourseId;
let pnEnrollmentId;
let pnCookie;
let fullProgramCookie;
let nonPnCookie;
let lockedCookie;
let photoRequiredCookie;
let initialAcademicState;
let privateOrientationDirectory;

async function reservePort() {
  const socket = net.createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const { port } = socket.address();
  await new Promise((resolve, reject) => socket.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function startServer(port, databaseFile, materialsDirectory, uploadDirectory) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`Fixture server startup timed out.\n${output}`)), 120_000);
    serverProcess = spawn(process.execPath, ["--no-warnings", "src/server.js"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_FILE: databaseFile,
        COURSE_MATERIALS_DIR: materialsDirectory,
        UPLOAD_DIR: uploadDirectory,
        EMAIL_DELIVERY_ENABLED: "false",
        NODE_ENV: "test",
        PORT: String(port),
        PUBLIC_APP_URL: baseUrl,
        SESSION_SECRET: "pn-orientation-fixture-session-only"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    const observe = (chunk) => {
      output += chunk.toString();
      if (!output.includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      resolve();
    };
    serverProcess.stdout.on("data", observe);
    serverProcess.stderr.on("data", observe);
    serverProcess.once("error", (error) => { clearTimeout(timeout); reject(error); });
    serverProcess.once("exit", (code, signal) => {
      if (output.includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      reject(new Error(`Fixture server exited before startup (${code ?? signal}).\n${output}`));
    });
  });
}

async function login(email) {
  const response = await fetch(`${baseUrl}/login`, {
    method: "POST",
    body: new URLSearchParams({ email, password, loginRole: "student" }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    redirect: "manual"
  });
  assert.equal(response.status, 302, `Expected fixture ${email} to sign in`);
  const setCookie = response.headers.getSetCookie()[0] || "";
  const cookie = setCookie.split(";", 1)[0];
  assert.match(cookie, /^bmhi\.sid=/);
  return cookie;
}

async function request(route, cookie, options = {}) {
  return fetch(`${baseUrl}${route}`, {
    ...options,
    headers: { ...(cookie ? { cookie } : {}), ...(options.headers || {}) },
    redirect: "manual"
  });
}

async function html(route, cookie) {
  const response = await request(route, cookie);
  const body = await response.text();
  assert.equal(response.status, 200, `${route}: ${body.slice(0, 500)}`);
  return body;
}

function academicState() {
  return {
    lessons: database.prepare(`SELECT l.* FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ? ORDER BY l.id`).all(pnCourseId),
    gradeItems: database.prepare("SELECT * FROM grade_items WHERE course_id = ? ORDER BY id").all(pnCourseId),
    grades: database.prepare("SELECT * FROM grades WHERE enrollment_id = ? ORDER BY id").all(pnEnrollmentId),
    completions: database.prepare("SELECT * FROM lesson_completions WHERE enrollment_id = ? ORDER BY id").all(pnEnrollmentId),
    enrollment: database.prepare("SELECT * FROM enrollments WHERE id = ?").get(pnEnrollmentId)
  };
}

before(async () => {
  // This process always owns a fresh temporary database and synthetic files.
  // It does not open, copy, or modify any school/student production data.
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-pn-orientation-portal-"));
  const databaseFile = path.join(temporaryDirectory, "fixtures.sqlite");
  const materialsDirectory = path.join(temporaryDirectory, "materials");
  const uploadDirectory = path.join(temporaryDirectory, "uploads");
  const orientationDirectory = path.join(uploadDirectory, "lpn-program-orientation");
  privateOrientationDirectory = orientationDirectory;
  fs.mkdirSync(orientationDirectory, { recursive: true });
  fs.mkdirSync(materialsDirectory, { recursive: true });
  fs.writeFileSync(path.join(orientationDirectory, "nurse-joy-lpn-welcome.mp4"), mediaBytes);
  fs.writeFileSync(path.join(orientationDirectory, "nurse-joy-lpn-welcome-poster.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  fs.writeFileSync(path.join(orientationDirectory, "transcript.txt"), transcript);
  const photoStorageName = "orientation-fixture.png";
  fs.writeFileSync(path.join(uploadDirectory, photoStorageName), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile, materialsDirectory, uploadDirectory);
  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  const userPasswordHash = bcrypt.hashSync(password, 4);
  const insertUser = database.prepare(`
    INSERT INTO users (role, first_name, last_name, email, password_hash, status, organization_status, photo_review_status, photo_storage_name, photo_original_name)
    VALUES ('student', ?, 'Orientation Fixture', ?, ?, 'active', ?, ?, ?, ?)
  `);
  const insertEnrollment = database.prepare("INSERT INTO enrollments (user_id, course_id, status, progress, final_grade) VALUES (?, ?, 'active', ?, ?)");
  const courseId = (slug) => {
    const course = database.prepare("SELECT id FROM courses WHERE slug = ?").get(slug);
    assert.ok(course, `Expected seeded fixture course ${slug}`);
    return course.id;
  };
  pnCourseId = courseId("introduction-to-nursing-practical-nursing");
  const createFixture = (name, slug, { locked = false, approved = true, progress = 0, grade = null } = {}) => {
    const email = `orientation-${name}@example.test`;
    const user = insertUser.run(name, email, userPasswordHash, locked ? "not_organized" : "organized", approved ? "approved" : "not_submitted", photoStorageName, photoStorageName);
    const enrollment = insertEnrollment.run(user.lastInsertRowid, courseId(slug), progress, grade);
    return { email, id: Number(user.lastInsertRowid), enrollmentId: Number(enrollment.lastInsertRowid) };
  };
  const pn = createFixture("pn", "introduction-to-nursing-practical-nursing", { progress: 37, grade: "B" });
  const fullProgram = createFixture("full-program", "practical-nursing");
  const nonPn = createFixture("non-pn", "home-health-aide");
  const locked = createFixture("locked", "introduction-to-nursing-practical-nursing", { locked: true });
  const photoRequired = createFixture("photo-required", "introduction-to-nursing-practical-nursing", { approved: false });
  pnEnrollmentId = pn.enrollmentId;
  const lesson = database.prepare("SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ? ORDER BY l.id LIMIT 1").get(pnCourseId);
  const gradeItem = database.prepare("SELECT id FROM grade_items WHERE course_id = ? ORDER BY id LIMIT 1").get(pnCourseId);
  assert.ok(lesson && gradeItem, "Expected PN102 lessons and grades for preservation checks");
  database.prepare("INSERT INTO lesson_completions (enrollment_id, lesson_id) VALUES (?, ?)").run(pnEnrollmentId, lesson.id);
  database.prepare("INSERT INTO grades (enrollment_id, grade_item_id, score, note) VALUES (?, ?, 88, 'Preserve fixture grade')").run(pnEnrollmentId, gradeItem.id);
  initialAcademicState = academicState();
  [pnCookie, fullProgramCookie, nonPnCookie, lockedCookie, photoRequiredCookie] = await Promise.all([
    login(pn.email), login(fullProgram.email), login(nonPn.email), login(locked.email), login(photoRequired.email)
  ]);
}, { timeout: 120_000 });

after(async () => {
  database?.close();
  if (serverProcess && serverProcess.exitCode === null) {
    const stopped = once(serverProcess, "exit");
    serverProcess.kill("SIGTERM");
    await stopped;
  }
  if (temporaryDirectory) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("PN student Dashboard puts the orientation above Recent Activity", async () => {
  const body = await html("/student/dashboard", pnCookie);
  const title = body.indexOf("Start Here: LPN Program Orientation");
  const activity = body.indexOf("<h2>Recent Activity</h2>");
  assert.ok(title >= 0 && activity > title);
  assert.match(body, /href="\/student\/lpn-orientation"/);
  assert.match(body, /Complete Complio requirements before starting clinicals/);
});

test("the full practical-nursing diploma enrollment gets the same program orientation", async () => {
  assert.match(await html("/student/dashboard", fullProgramCookie), /Start Here: LPN Program Orientation/);
  assert.match(await html(orientationPath, fullProgramCookie), /LPN Program Orientation with Nurse Joy/);
});

test("other-program students have no card and cannot open the page or any media", async () => {
  assert.doesNotMatch(await html("/student/dashboard", nonPnCookie), /Start Here: LPN Program Orientation/);
  for (const suffix of ["", "/video", "/poster", "/transcript"]) {
    const response = await request(orientationPath + suffix, nonPnCookie);
    assert.equal(response.status, 403, suffix || "orientation page");
  }
});

test("PN102 exposes a course orientation link without changing academic records", async () => {
  const body = await html(`/student/enrollments/${pnEnrollmentId}?view=modules`, pnCookie);
  const module = body.match(/<section class="canvas-module-block[^"]*"[^>]*>[\s\S]*?Orientation and Course Resources[\s\S]*?<\/section>/);
  assert.ok(module, "Expected the PN102 orientation module");
  assert.match(module[0], /class="canvas-module-row pn-orientation-module-link" href="\/student\/lpn-orientation"/);
  assert.match(module[0], /LPN Program Orientation with Nurse Joy/);
  await html(orientationPath, pnCookie);
  await html(`/student/enrollments/${pnEnrollmentId}?view=modules`, pnCookie);
  assert.deepEqual(academicState(), initialAcademicState, "Viewing orientation must not add lessons/grade items, alter progress, or change completions/grades");
});

test("the orientation page uses protected video and poster and safely displays the full transcript", async () => {
  const body = await html(orientationPath, pnCookie);
  assert.match(body, /<video\b[^>]*\bcontrols\b[^>]*\bplaysinline\b[^>]*poster="\/student\/lpn-orientation\/poster"/);
  assert.match(body, /<source src="\/student\/lpn-orientation\/video" type="video\/mp4">/);
  assert.match(body, /Complete Complio requirements before starting clinicals/);
  assert.match(body, /&lt;script&gt;not markup&lt;\/script&gt;/);
  assert.doesNotMatch(body, /<script>not markup/);
  assert.doesNotMatch(body, /<video\b[^>]*\bautoplay\b/);
  assert.doesNotMatch(body, /<track\b/);
  const response = await request(`${orientationPath}/transcript`, pnCookie);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), transcript);
});

test("actual application media routes support Range/HEAD and reject anonymous access", async () => {
  const response = await request(`${orientationPath}/video`, pnCookie, { headers: { range: "bytes=4-12" } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-range"), `bytes 4-12/${mediaBytes.length}`);
  assert.match(response.headers.get("cache-control"), /\bprivate\b/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), mediaBytes.subarray(4, 13));
  const head = await request(`${orientationPath}/video`, pnCookie, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(Number(head.headers.get("content-length")), mediaBytes.length);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  for (const suffix of ["", "/video", "/poster", "/transcript"]) {
    const anonymous = await request(orientationPath + suffix);
    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.get("location"), "/login");
  }
});

test("existing class lock also blocks orientation media for PN students", async () => {
  const body = await html(orientationPath, lockedCookie);
  assert.match(body, /Class access is locked/);
  assert.doesNotMatch(body, /<source src="\/student\/lpn-orientation\/video"/);
  for (const suffix of ["/video", "/poster", "/transcript"]) {
    const response = await request(orientationPath + suffix, lockedCookie);
    assert.equal(response.status, 403, suffix);
  }
});

test("existing required-photo approval gate applies to orientation page and media", async () => {
  for (const suffix of ["", "/video", "/poster", "/transcript"]) {
    const response = await request(orientationPath + suffix, photoRequiredCookie);
    assert.equal(response.status, 302, suffix || "orientation page");
    assert.equal(response.headers.get("location"), "/student/photo-required");
  }
});

test("private orientation files cannot be fetched through course or public upload paths", async () => {
  for (const route of [
    "/course-materials/lpn-program-orientation/nurse-joy-lpn-welcome.mp4?inline=1",
    "/uploads/lpn-program-orientation/nurse-joy-lpn-welcome.mp4",
    "/assets/lpn-program-orientation/nurse-joy-lpn-welcome.mp4"
  ]) {
    for (const cookie of [undefined, pnCookie, nonPnCookie]) {
      const response = await request(route, cookie);
      assert.ok([302, 403, 404].includes(response.status), `${route}: expected no media response, got ${response.status}`);
    }
  }
});

test("an unprovisioned private transcript leaves an accessible orientation page", async () => {
  const filePath = path.join(privateOrientationDirectory, "transcript.txt");
  fs.unlinkSync(filePath);
  try {
    const body = await html(orientationPath, pnCookie);
    assert.match(body, /The transcript is not available yet/);
    const response = await request(`${orientationPath}/transcript`, pnCookie);
    assert.equal(response.status, 404);
    assert.doesNotMatch(await html("/student/dashboard", pnCookie), /Start Here: LPN Program Orientation/,
      "Do not advertise the orientation until all private media are provisioned");
    assert.doesNotMatch(await html(`/student/enrollments/${pnEnrollmentId}?view=modules`, pnCookie),
      /class="canvas-module-row pn-orientation-module-link"/,
      "PN102 should not link students to a partly provisioned orientation");
  } finally {
    fs.writeFileSync(filePath, transcript);
  }
  assert.match(await html("/student/dashboard", pnCookie), /Start Here: LPN Program Orientation/,
    "The card becomes available once the missing private media are restored");
});
