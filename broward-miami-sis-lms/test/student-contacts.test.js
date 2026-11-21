const assert = require("node:assert/strict");
const { before, after, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const express = require("express");
const session = require("express-session");
const { validateStudentPhone, requireStudentPhone, queryStudentContacts, renderContactDirectory, registerStudentContactRoutes } = require("../src/studentContacts");

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE users (
    id INTEGER PRIMARY KEY, role TEXT, student_number TEXT, first_name TEXT, last_name TEXT,
    email TEXT, personal_email TEXT, phone TEXT, cohort_name TEXT, status TEXT, removed_at TEXT,
    photo_storage_name TEXT, photo_original_name TEXT, photo_review_status TEXT,
    photo_submitted_at TEXT, photo_reviewed_at TEXT, password_hash TEXT DEFAULT 'PRIVATE-HASH'
  ); CREATE TABLE phone_audit(id INTEGER PRIMARY KEY, student_id INTEGER, old_phone TEXT, new_phone TEXT);`);
  const insert = db.prepare("INSERT INTO users(id,role,first_name,last_name,email,personal_email,phone,cohort_name,status) VALUES(?,?,?,?,?,?,?,?,?)");
  insert.run(1, "student", "Ada", "Card", "ada.portal@example.test", "ada.contact@example.test", "+1 (305) 555-0101", "Cohort 2", "active");
  insert.run(2, "student", "Percent%", "O'Neil", "percent@example.test", null, "", "Cohort 1", "pending");
  for (let id = 3; id <= 26; id++) insert.run(id, "student", `Student ${id}`, "Roster", `student${id}@example.test`, null, id % 5 === 0 ? null : "954-555-0123", id % 2 === 0 ? "Cohort 2" : "Cohort 1", id % 3 === 0 ? "withdrawn" : "active");
  insert.run(90, "admin", "Private", "Staff", "private-staff@example.test", null, "954-555-9999", "Cohort 2", "active");
  insert.run(91, "student", "Removed", "Student", "removed@example.test", null, "954-555-9998", "Cohort 2", "inactive");
  db.prepare("UPDATE users SET removed_at='2026-11-20' WHERE id=91").run();
  insert.run(92, "student", "Portal", "Test", "teststudent@browardmiamihi.com", null, "954-555-9997", "Test cohort", "active");
  return db;
}

test("required phone validation supports US/international extensions without treating empty or malformed values as numbers", () => {
  assert.equal(requireStudentPhone("(305) 555-0101"), "+13055550101");
  assert.equal(requireStudentPhone("1-954-555-0123 x42"), "+19545550123 ext. 42");
  assert.deepEqual(validateStudentPhone("+44 20 7946 0958 ext. 123"), { valid: true, normalized: "+442079460958 ext. 123", display: "+442079460958 ext. 123", tel: "tel:+442079460958;ext=123", error: "" });
  assert.equal(validateStudentPhone("+1 305 555 0101 #2").tel, "tel:+13055550101;ext=2");
  for (const value of ["", "  ", null, undefined, "0000000000", "1111111111", "123", "555-0101", "305-555-0101<script>", "+44 abc 55555555", "+9999999999999999", "3055550101 ext 1234567", ["3055550101"], { phone: "3055550101" }]) {
    assert.equal(validateStudentPhone(value).valid, false, String(value));
    assert.throws(() => requireStudentPhone(value));
  }
  assert.equal(validateStudentPhone("", { required: false }).normalized, "");
});

test("search and pagination stay scoped to real nonremoved students and preserve legacy missing phones", () => {
  const db = fixture();
  try {
    const first = queryStudentContacts(db);
    assert.equal(first.total, 26);
    assert.equal(first.students.length, 12);
    assert.equal(first.pages, 3);
    assert.equal(queryStudentContacts(db, { page: 999 }).page, 3);
    assert.equal(queryStudentContacts(db, { page: 3 }).students.length, 2);
    assert.equal(queryStudentContacts(db, { pageSize: 999 }).pageSize, 48);
    assert.deepEqual(queryStudentContacts(db, { query: "Ada Card" }).students.map(row => row.id), [1]);
    assert.deepEqual(queryStudentContacts(db, { query: "ada.contact" }).students.map(row => row.id), [1]);
    assert.deepEqual(queryStudentContacts(db, { query: "3055550101" }).students.map(row => row.id), [1]);
    assert.deepEqual(queryStudentContacts(db, { query: "%" }).students.map(row => row.id), [2]);
    assert.equal(queryStudentContacts(db, { query: "' OR 1=1 --" }).total, 0);
    assert.equal(queryStudentContacts(db, { cohort: "Cohort 1", status: "pending" }).students[0].id, 2);
    const missing = queryStudentContacts(db, { phone: "missing" });
    assert.equal(missing.total, 6);
    assert.ok(missing.students.every(row => !row.phone));
    assert.equal(db.prepare("SELECT phone FROM users WHERE id=2").get().phone, "");
    assert.ok(first.students.every(row => !("password_hash" in row) && ![90, 91, 92].includes(row.id)));
    assert.deepEqual(first.cohorts, ["Cohort 1", "Cohort 2"]);
  } finally { db.close(); }
});

test("cards escape stored text, expose personal email first and preserve dashboard filters without public rendering", () => {
  const db = fixture();
  try {
    const html = renderContactDirectory(db, { user: { role: "admin" }, basePath: "/admin", cohort: "Cohort 2", hiddenFields: { cohort: "Cohort 2" }, showCohortFilter: false, csrfToken: "a".repeat(64) });
    assert.match(html, /name="cohort" value="Cohort 2"/);
    assert.match(html, /name="contactCohort" value="Cohort 2"/);
    assert.match(html, /contactPage=2/);
    assert.match(html, /href="tel:\+13055550101"/);
    assert.ok(html.indexOf("ada.contact@example.test") < html.indexOf("ada.portal@example.test"));
    assert.match(html, /Portal email/);
    assert.match(html, /<h3><a href="\/admin\/students\/1\/registrar-checklist">Ada Card<\/a>/);
    assert.match(html, />Open student file<\/a>/);
    assert.doesNotMatch(html, /PRIVATE-HASH|private-staff@example|removed@example|Test cohort/);
    db.prepare("UPDATE users SET first_name='<script>alert(1)</script>', personal_email='x\" onmouseover=\"bad@example.test' WHERE id=1").run();
    const escaped = renderContactDirectory(db, { user: { role: "instructor" }, query: "<script>" });
    assert.match(escaped, /&lt;script&gt;/);
    assert.doesNotMatch(escaped, /<script>|class="student-contact-phone-form"|name="priorPhone"/);
    assert.throws(() => renderContactDirectory(db, { user: { role: "student" } }), /staff only/);
    assert.throws(() => renderContactDirectory(db), /staff only/);
  } finally { db.close(); }
});

let db, server, baseUrl, adminCookie, instructorCookie, studentCookie, failAudit = false;
before(async () => {
  db = fixture();
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(session({ secret: "student-contact-isolated-test", resave: false, saveUninitialized: false }));
  app.post("/test-login", (req, res) => { req.session.role = req.body.role; res.send("ok"); });
  const requireAuth = (req, res, next) => {
    if (!req.session.role) return res.redirect("/login");
    req.user = { id: 100, role: req.session.role }; next();
  };
  registerStudentContactRoutes(app, {
    db, requireAuth,
    render: (req, res, title, body, options) => { assert.equal(options.studentContacts, true); res.send(body); },
    recordSystemActivity: (req, event) => {
      if (failAudit) throw new Error("Synthetic audit failure");
      assert.equal(event.action, "student_phone_updated");
      db.prepare("INSERT INTO phone_audit(student_id,old_phone,new_phone) VALUES(?,?,?)").run(event.targetUserId, event.details.previousPhone, event.details.phone);
      req.systemActivityRecorded = true;
    }
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  async function login(role) {
    const response = await fetch(`${baseUrl}/test-login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ role }) });
    return response.headers.getSetCookie()[0].split(";", 1)[0];
  }
  adminCookie = await login("admin"); instructorCookie = await login("instructor"); studentCookie = await login("student");
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); db?.close(); });

function request(route, cookie = adminCookie, body) {
  return fetch(`${baseUrl}${route}`, { method: body ? "POST" : "GET", redirect: "manual", headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}) }, body: body ? new URLSearchParams(body) : undefined });
}
async function token() {
  const response = await request("/admin/student-contacts/1");
  assert.equal(response.status, 200);
  return (await response.text()).match(/name="csrfToken" value="([a-f0-9]+)"/)[1];
}

test("contact routes reject public/student access and preserve read-only instructor access", async () => {
  for (const route of ["/admin/student-contacts", "/admin/student-contacts/1"]) {
    assert.equal((await request(route, "")).status, 302);
    const denied = await request(route, studentCookie);
    assert.equal(denied.status, 403); assert.doesNotMatch(await denied.text(), /ada|305/);
    const staff = await request(route, instructorCookie);
    assert.equal(staff.status, 200);
    assert.equal(staff.headers.get("cache-control"), "private, no-store, max-age=0");
    const html = await staff.text();
    assert.match(html, /ada\.contact@example\.test/);
    assert.doesNotMatch(html, /student-contact-phone-form|registrar-checklist|Open student file/);
  }
  assert.equal((await request("/admin/student-contacts/90")).status, 404);
  assert.equal((await request("/admin/student-contacts/91")).status, 404);
  assert.equal((await request("/admin/student-contacts/not-a-number")).status, 404);
  assert.equal((await request("/admin/student-contacts/1/phone", instructorCookie, { phone: "3055550102" })).status, 403);
  assert.equal((await request("/admin/student-contacts/1/phone", studentCookie, { phone: "3055550102" })).status, 403);
});

test("phone edits require CSRF and matching prior value; successful save changes only the intended phone with an audit", async () => {
  const route = "/admin/student-contacts/1/phone";
  const before = db.prepare("SELECT * FROM users WHERE id=1").get();
  const other = db.prepare("SELECT * FROM users WHERE id=2").get();
  assert.equal((await request(route, adminCookie, { phone: "3055550102", priorPhone: before.phone })).status, 403);
  const csrfToken = await token();
  assert.equal((await request(route, adminCookie, { csrfToken, phone: "", priorPhone: before.phone })).status, 422);
  assert.equal((await request(route, adminCookie, { csrfToken, phone: "3055550102", priorPhone: "outdated" })).status, 409);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM phone_audit").get().n, 0);
  assert.deepEqual(db.prepare("SELECT * FROM users WHERE id=1").get(), before);
  const result = await request(route, adminCookie, { csrfToken, phone: "305 555 0102 ext. 7", priorPhone: before.phone, returnTo: "/admin?cohort=Cohort%202&contactPage=2#student-contact-1" });
  assert.equal(result.status, 303);
  assert.equal(result.headers.get("location"), "/admin?cohort=Cohort%202&contactPage=2#student-contact-1");
  assert.deepEqual({ ...db.prepare("SELECT * FROM users WHERE id=1").get() }, { ...before, phone: "+13055550102 ext. 7" });
  assert.deepEqual(db.prepare("SELECT * FROM users WHERE id=2").get(), other);
  assert.deepEqual({ ...db.prepare("SELECT student_id,old_phone,new_phone FROM phone_audit").get() }, { student_id: 1, old_phone: before.phone, new_phone: "+13055550102 ext. 7" });
});

test("audit failure rolls back phone change and redirect targets cannot leave the contact/dashboard pages", async () => {
  const before = db.prepare("SELECT phone FROM users WHERE id=1").get().phone;
  const csrfToken = await token();
  failAudit = true;
  try {
    assert.equal((await request("/admin/student-contacts/1/phone", adminCookie, { csrfToken, phone: "+44 20 7946 0958", priorPhone: before })).status, 500);
    assert.equal(db.prepare("SELECT phone FROM users WHERE id=1").get().phone, before);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM phone_audit").get().n, 1);
  } finally { failAudit = false; }
  const result = await request("/admin/student-contacts/1/phone", adminCookie, { csrfToken, phone: before, priorPhone: before, returnTo: "//evil.example" });
  assert.equal(result.status, 303);
  assert.equal(result.headers.get("location"), "/admin/student-contacts");
});
