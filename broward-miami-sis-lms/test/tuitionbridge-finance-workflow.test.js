"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");
const term = "2026-27 Practical Nursing Term";

let temporaryDirectory;
let database;
let serverProcess;
let baseUrl;
let adminCookie;
let instructorCookie;
let studentCookie;
let studentId;
let otherStudentId;
let paymentPlanId;

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

function startServer(port, databaseFile, uploadDirectory) {
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
        SESSION_SECRET: "tuitionbridge-finance-workflow-test",
        TUITION_PAYMENT_URL: "",
        UPLOAD_DIR: uploadDirectory
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    const receive = (chunk) => {
      output += chunk.toString();
      if (!output.includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      resolve();
    };
    serverProcess.stdout.on("data", receive);
    serverProcess.stderr.on("data", receive);
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

async function signIn(email, password, loginRole) {
  const response = await fetch(`${baseUrl}/login`, {
    body: new URLSearchParams({ email, password, loginRole }),
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

function getPage(route, cookie = "") {
  return fetch(`${baseUrl}${route}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual"
  });
}

function postForm(route, body, cookie) {
  return fetch(`${baseUrl}${route}`, {
    body: new URLSearchParams(body),
    headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    redirect: "manual"
  });
}

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&#039;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

function formControlMarkup(html) {
  return [...html.matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)].map((match) => match[0]).join("\n");
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-tuitionbridge-finance-"));
  const databaseFile = path.join(temporaryDirectory, "finance.sqlite");
  const uploadDirectory = path.join(temporaryDirectory, "uploads");
  fs.mkdirSync(uploadDirectory, { recursive: true });
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile, uploadDirectory);

  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA busy_timeout = 5000;");
  const passwordHash = database.prepare("SELECT password_hash FROM users WHERE email = 'student@browardmiamihi.com'").get().password_hash;
  const avatarName = "tuitionbridge-test-student.png";
  fs.writeFileSync(path.join(uploadDirectory, avatarName), Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+cvs8AAAAASUVORK5CYII=",
    "base64"
  ));

  const insertStudent = database.prepare(`
    INSERT INTO users (
      role, first_name, last_name, email, personal_email, phone, password_hash,
      status, cohort_name, organization_status, photo_storage_name,
      photo_original_name, photo_review_status, photo_submitted_at,
      photo_reviewed_at
    ) VALUES (
      'student', ?, ?, ?, ?, ?, ?, 'active', 'Finance Test Cohort', 'organized',
      ?, ?, 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `);
  studentId = Number(insertStudent.run(
    "Tuition", "Student", "tuition.student@example.test", "tuition.student@example.test",
    "+19545550121", passwordHash, avatarName, avatarName
  ).lastInsertRowid);
  otherStudentId = Number(insertStudent.run(
    "Other", "Student", "other.finance.student@example.test", "other.finance.student@example.test",
    "+19545550122", passwordHash, avatarName, avatarName
  ).lastInsertRowid);

  const insertCharge = database.prepare(`
    INSERT INTO billing_charges (user_id, term, category, description, amount_cents, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, 'posted')
  `);
  insertCharge.run(studentId, term, "Tuition", "PN tuition contract", 1_000_000, "2026-12-01");
  insertCharge.run(studentId, term, "Fee", "Registration fee", 15_000, "2026-12-01");
  insertCharge.run(otherStudentId, term, "Tuition", "DO NOT LEAK OTHER STUDENT", 99_999, "2026-12-02");
  database.prepare(`
    INSERT INTO billing_payments (user_id, term, source, applied_to, amount_cents, paid_at, note)
    VALUES (?, ?, 'Tuition cashier receipt', 'PN tuition contract', 115000, '2026-11-24', 'Integration fixture')
  `).run(studentId, term);
  paymentPlanId = Number(database.prepare(`
    INSERT INTO billing_payment_plans (user_id, term, name, total_cents, installment_cents, next_due_date, status)
    VALUES (?, ?, 'BMHI monthly tuition plan', 1015000, 225000, '2026-12-01', 'active')
  `).run(studentId, term).lastInsertRowid);

  adminCookie = await signIn("admin@browardmiamihi.com", "AdminPass123!", "faculty");
  instructorCookie = await signIn("instructor@browardmiamihi.com", "InstructorPass123!", "faculty");
  studentCookie = await signIn("tuition.student@example.test", "StudentPass123!", "student");
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
  if (temporaryDirectory) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("admin dashboard exposes the tuition and School Vault workspace", async () => {
  const response = await getPage("/admin", adminCookie);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /id="tuition-workspace-title"[^>]*>Tuition and Vault overview</);
  assert.match(html, /href="\/admin\/billing#school-vault"[^>]*>Open School Vault</);
  assert.match(visibleText(html), /Active payment plans/);
  assert.match(visibleText(html), /Tuition Student/);

  const instructor = await getPage("/admin", instructorCookie);
  assert.equal(instructor.status, 302);
  assert.equal(new URL(instructor.headers.get("location"), baseUrl).pathname, "/admin/courses");
});

test("billing page provides a School Vault, statements, and controlled payment-plan statuses", async () => {
  const response = await getPage("/admin/billing", adminCookie);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<section class="billing-vault" id="school-vault"/);
  assert.match(visibleText(html), /Tuition Student/);
  assert.match(html, new RegExp(`href="/admin/billing/students/${studentId}/statement"`));
  assert.match(html, new RegExp(`action="/admin/billing/payment-plans/${paymentPlanId}/status"`));

  const planForm = html.match(new RegExp(`<form[^>]+action="/admin/billing/payment-plans/${paymentPlanId}/status"[\\s\\S]*?</form>`))?.[0] || "";
  assert.match(planForm, /<option value="active"[^>]*selected/);
  assert.match(planForm, /<option value="completed"/);
  assert.match(planForm, /<option value="canceled"/);
  assert.doesNotMatch(planForm, /value="(?:draft|removed|withdrawn)"/);
});

test("admin account statement is limited to the selected student", async () => {
  const response = await getPage(`/admin/billing/students/${studentId}/statement`, adminCookie);
  assert.equal(response.status, 200);
  const html = await response.text();
  const text = visibleText(html);
  assert.match(text, /Account statement/i);
  assert.match(text, /Tuition Student/);
  assert.match(text, /PN tuition contract/);
  assert.match(text, /Registration fee/);
  assert.match(text, /Tuition cashier receipt/);
  assert.match(text, /Current balance \$9,000\.00/);
  assert.doesNotMatch(text, /DO NOT LEAK OTHER STUDENT/);
});

test("student financial pages link to an owned statement and approved payment options", async () => {
  const financialResponse = await getPage("/student/financial", studentCookie);
  assert.equal(financialResponse.status, 200);
  const financialHtml = await financialResponse.text();
  assert.match(financialHtml, /href="\/student\/financial\/statement\?term=/);
  assert.match(financialHtml, /href="\/student\/financial\/payment-options\?term=/);
  assert.match(visibleText(financialHtml), /Amount due \$9,000\.00/);

  const statementResponse = await getPage("/student/financial/statement", studentCookie);
  assert.equal(statementResponse.status, 200);
  const statementText = visibleText(await statementResponse.text());
  assert.match(statementText, /Tuition Student/);
  assert.match(statementText, /PN tuition contract/);
  assert.match(statementText, /Tuition cashier receipt/);
  assert.doesNotMatch(statementText, /DO NOT LEAK OTHER STUDENT/);

  const optionsResponse = await getPage("/student/financial/payment-options", studentCookie);
  assert.equal(optionsResponse.status, 200);
  const optionsText = visibleText(await optionsResponse.text());
  assert.match(optionsText, /Payment options/i);
  assert.match(optionsText, /approved secure payment provider/i);
  assert.match(optionsText, /954-248-0669/);
  assert.match(optionsText, /support@browardmiamihi\.com/);
});

test("payment-plan status changes are validated, admin-only, persisted, and audited", async () => {
  const instructorAttempt = await postForm(
    `/admin/billing/payment-plans/${paymentPlanId}/status`,
    { status: "completed" },
    instructorCookie
  );
  assert.equal(instructorAttempt.status, 403);
  assert.equal(database.prepare("SELECT status FROM billing_payment_plans WHERE id = ?").get(paymentPlanId).status, "active");

  const invalidAttempt = await postForm(
    `/admin/billing/payment-plans/${paymentPlanId}/status`,
    { status: "withdrawn" },
    adminCookie
  );
  assert.equal(invalidAttempt.status, 422);
  assert.equal(database.prepare("SELECT status FROM billing_payment_plans WHERE id = ?").get(paymentPlanId).status, "active");

  const response = await postForm(
    `/admin/billing/payment-plans/${paymentPlanId}/status`,
    { status: "completed" },
    adminCookie
  );
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/admin/billing#payment-plans");
  assert.equal(database.prepare("SELECT status FROM billing_payment_plans WHERE id = ?").get(paymentPlanId).status, "completed");
  const activity = database.prepare(`
    SELECT action, target_user_id, entity_type, entity_id
    FROM system_activity_log
    WHERE action = 'payment_plan_status_changed' AND entity_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(String(paymentPlanId));
  assert.equal(activity.action, "payment_plan_status_changed");
  assert.equal(activity.target_user_id, studentId);
  assert.equal(activity.entity_type, "billing_payment_plan");
  assert.equal(activity.entity_id, String(paymentPlanId));
});

test("finance pages enforce anonymous, instructor, student, and admin boundaries", async () => {
  const anonymous = await getPage("/admin/billing");
  assert.equal(anonymous.status, 302);
  assert.equal(new URL(anonymous.headers.get("location"), baseUrl).pathname, "/login");

  for (const route of ["/admin/billing", `/admin/billing/students/${studentId}/statement`]) {
    assert.equal((await getPage(route, instructorCookie)).status, 403, `${route} must reject instructors`);
    assert.equal((await getPage(route, studentCookie)).status, 403, `${route} must reject students`);
  }
  for (const route of ["/student/financial/statement", "/student/financial/payment-options"]) {
    assert.equal((await getPage(route, adminCookie)).status, 403, `${route} must reject admins`);
    assert.equal((await getPage(route, instructorCookie)).status, 403, `${route} must reject instructors`);
  }
});

test("BMHI finance pages never collect bank or card credentials", async () => {
  const pages = [
    ["/admin/billing", adminCookie],
    [`/admin/billing/students/${studentId}/statement`, adminCookie],
    ["/student/financial", studentCookie],
    ["/student/financial/statement", studentCookie],
    ["/student/financial/payment-options", studentCookie]
  ];
  for (const [route, cookie] of pages) {
    const response = await getPage(route, cookie);
    assert.equal(response.status, 200, `Expected ${route} to render`);
    const html = await response.text();
    const controls = formControlMarkup(html);
    assert.doesNotMatch(
      controls,
      /(?:cc-number|cc-csc|card[-_ ]?number|cvv|cvc|routing[-_ ]?(?:number)?|bank[-_ ]?account|account[-_ ]?number|ach[-_ ]?(?:number|account)|expir(?:y|ation))/i,
      `${route} must not render a control for bank or card credentials`
    );
    assert.doesNotMatch(
      html,
      /<form\b[^>]*\baction=["'][^"']*\/student\/financial\/(?:pay|card|bank)/i,
      `${route} must not post payment credentials into the BMHI portal`
    );
  }
});
