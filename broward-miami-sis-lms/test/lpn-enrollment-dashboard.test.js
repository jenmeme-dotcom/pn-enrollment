const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..");

let serverProcess;
let temporaryDirectory;
let baseUrl;
let adminCookie;
let instructorCookie;

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
        SESSION_SECRET: "lpn-enrollment-dashboard-test-secret"
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

async function login(email, password) {
  const response = await fetch(`${baseUrl}/login`, {
    body: new URLSearchParams({ email, password, loginRole: "faculty" }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    redirect: "manual"
  });
  assert.equal(response.status, 302, `Expected ${email} to sign in`);
  const setCookie = response.headers.getSetCookie?.()[0] || response.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";", 1)[0];
  assert.match(cookie, /^bmhi\.sid=/, `Expected a session cookie for ${email}`);
  return cookie;
}

async function get(route, cookie) {
  return fetch(`${baseUrl}${route}`, {
    headers: { cookie },
    redirect: "manual"
  });
}

async function post(route, cookie, body) {
  const params = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) => {
    (Array.isArray(value) ? value : [value]).forEach((item) => params.append(key, String(item ?? "")));
  });
  return fetch(`${baseUrl}${route}`, {
    body: params,
    headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    redirect: "manual"
  });
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-lpn-enrollment-"));
  const databaseFile = path.join(temporaryDirectory, "lpn-enrollment.sqlite");
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile);
  adminCookie = await login("admin@browardmiamihi.com", "AdminPass123!");
  instructorCookie = await login("instructor@browardmiamihi.com", "InstructorPass123!");
});

after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    await new Promise((resolve) => {
      serverProcess.once("exit", resolve);
      serverProcess.kill("SIGTERM");
      setTimeout(resolve, 5_000).unref();
    });
  }
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
});

test("Operations Dashboard gives admins one prominent LPN Enrollment entry point", async () => {
  const adminResponse = await get("/admin", adminCookie);
  assert.equal(adminResponse.status, 200);
  const adminHtml = await adminResponse.text();
  assert.match(
    adminHtml,
    /<details class="ops-nav-group ops-secondary-nav ops-primary-nav" open>\s*<summary class="ops-nav-label">Operations <span aria-hidden="true">⌄<\/span><\/summary>/,
    "Expected Operations to have an accessible expandable caret matching the other navigation groups"
  );
  const matchingLinks = [...adminHtml.matchAll(/<a\b[^>]*\bhref="\/admin\/lpn-enrollment"[^>]*>\s*LPN Enrollment\s*<\/a>/g)];
  assert.equal(matchingLinks.length, 1, "Expected exactly one LPN Enrollment button on the Operations Dashboard");
  assert.match(matchingLinks[0][0], /class="[^"]*\bbutton\b[^"]*"/, "Expected the LPN entry point to render as a button");

  const instructorResponse = await get("/admin", instructorCookie);
  assert.equal(instructorResponse.status, 302);
  assert.equal(instructorResponse.headers.get("location"), "/admin/courses", "Instructors must bypass the Operations Dashboard");

  const instructorCourses = await get("/admin/courses", instructorCookie);
  assert.equal(instructorCourses.status, 200);
  const instructorHtml = await instructorCourses.text();
  assert.doesNotMatch(instructorHtml, /href="\/admin\/lpn-enrollment"/, "Instructors must not see the admin enrollment action");
  assert.doesNotMatch(instructorHtml, />Operations<\/a>/, "Instructors must not see the Operations Dashboard toggle");
  assert.doesNotMatch(instructorHtml, /\/admin\/admin-roles/, "Instructors must not see Admin Roles access");
});

test("LPN Enrollment is an admin-only Practical Nursing batch enrollment workflow", async () => {
  const adminResponse = await get("/admin/lpn-enrollment", adminCookie);
  assert.equal(adminResponse.status, 200);
  const html = await adminResponse.text();
  assert.match(html, /<h1>LPN Enrollment<\/h1>/);
  assert.match(html, /<form\b[^>]*method="post"[^>]*action="\/admin\/lpn-enrollment"/);
  assert.match(html, /Select PN 101(?:&ndash;|–)104/, "Expected a shortcut for the core PN 101–104 course sequence");
  assert.match(html, /name="studentId"/, "Expected the workflow to select an existing student");
  assert.match(html, /data-lpn-student-picker/, "Selecting a student must reload their saved cohort and enrollments");
  assert.match(html, /type="submit" disabled>Enroll Student/, "Enrollment must stay disabled until a student's current record is loaded");
  assert.match(html, /name="courseIds"/, "Expected the workflow to select one or more LPN course shells");

  const instructorResponse = await get("/admin/lpn-enrollment", instructorCookie);
  assert.equal(instructorResponse.status, 403, "The enrollment destination must reject non-admin faculty");
  assert.equal(await instructorResponse.text(), "Forbidden");
});

test("staff account management routes remain admin-only", async () => {
  for (const route of ["/admin/admin-roles", "/admin/instructor-roles"]) {
    const response = await get(route, instructorCookie);
    assert.equal(response.status, 403, `${route} must reject instructor accounts`);
    assert.equal(await response.text(), "Forbidden");
  }
});

test("LPN Enrollment adds selected course shells once and preserves repeat submissions", async () => {
  const email = `lpn-enrollment-${Date.now()}@example.com`;
  const createStudentResponse = await post("/admin/students", adminCookie, {
    firstName: "Enrollment",
    lastName: "Test Student",
    email,
    personalEmail: email,
    phone: "954-555-0199",
    organizationStatus: "organized",
    cohortName: "Cohort Test"
  });
  assert.equal(createStudentResponse.status, 302);

  const formResponse = await get("/admin/lpn-enrollment", adminCookie);
  assert.equal(formResponse.status, 200);
  const formHtml = await formResponse.text();
  const studentOption = formHtml.match(new RegExp(`<option value="(\\d+)"[^>]*>[^<]*${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.ok(studentOption, "Expected the newly created active student in the LPN selector");
  const studentId = studentOption[1];
  const courseIds = [...formHtml.matchAll(/name="courseIds" value="(\d+)"/g)].slice(0, 2).map((match) => match[1]);
  assert.equal(courseIds.length, 2, "Expected at least two published LPN course shells");

  const enrollmentBody = {
    studentId,
    courseIds,
    cohortName: "Cohort Test",
    cohortStartDate: "2026-07-01",
    cohortEndDate: "2027-07-31",
    note: "Integration test enrollment"
  };
  const enrollResponse = await post("/admin/lpn-enrollment", adminCookie, enrollmentBody);
  assert.equal(enrollResponse.status, 302);
  assert.equal(enrollResponse.headers.get("location"), `/admin/lpn-enrollment?studentId=${studentId}`);

  const enrolledResponse = await get(`/admin/lpn-enrollment?studentId=${studentId}`, adminCookie);
  const enrolledHtml = await enrolledResponse.text();
  assert.match(enrolledHtml, /2 new LPN course enrollments created/);
  assert.match(enrolledHtml, /name="cohortName" value="Cohort Test"/);
  assert.doesNotMatch(enrolledHtml, /type="submit" disabled>Enroll Student/);
  assert.match(enrolledHtml, /Current LPN enrollments for Enrollment Test Student/);
  assert.equal((enrolledHtml.match(/Already enrolled/g) || []).length, 2);

  const repeatResponse = await post("/admin/lpn-enrollment", adminCookie, enrollmentBody);
  assert.equal(repeatResponse.status, 302);
  const repeatedHtml = await (await get(`/admin/lpn-enrollment?studentId=${studentId}`, adminCookie)).text();
  assert.match(repeatedHtml, /0 new LPN course enrollments created; 2 already enrolled/);
});
