"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const {
  tuitionDashboardData,
  billingVaultRows,
  renderTuitionDashboardPanel,
  renderBillingVault,
  renderPaymentStatement,
  renderPaymentOptions
} = require("../src/tuitionWorkspace");

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY, role TEXT, student_number TEXT, first_name TEXT, last_name TEXT,
      email TEXT, status TEXT, removed_at TEXT
    );
    CREATE TABLE billing_payment_plans (
      id INTEGER PRIMARY KEY, user_id INTEGER, term TEXT, name TEXT, total_cents INTEGER,
      installment_cents INTEGER, next_due_date TEXT, status TEXT
    );
    CREATE TABLE billing_payments (
      id INTEGER PRIMARY KEY, user_id INTEGER, term TEXT, source TEXT, applied_to TEXT,
      amount_cents INTEGER, paid_at TEXT, note TEXT
    );
    CREATE TABLE billing_charges (
      id INTEGER PRIMARY KEY, user_id INTEGER, term TEXT, category TEXT,
      description TEXT, amount_cents INTEGER, status TEXT
    );
    CREATE TABLE courses (
      id INTEGER PRIMARY KEY, slug TEXT, category TEXT
    );
    CREATE TABLE enrollments (
      id INTEGER PRIMARY KEY, user_id INTEGER, course_id INTEGER, status TEXT
    );
    CREATE TABLE financial_aid_awards (
      id INTEGER PRIMARY KEY, user_id INTEGER
    );
    CREATE TABLE financial_aid_disbursements (
      id INTEGER PRIMARY KEY, award_id INTEGER, amount_cents INTEGER, status TEXT
    );
    CREATE TABLE staff_time_entries (
      id INTEGER PRIMARY KEY, user_id INTEGER, clock_in_at TEXT, clock_out_at TEXT
    );
    CREATE TABLE system_activity_log (
      id INTEGER PRIMARY KEY, actor_user_id INTEGER, target_user_id INTEGER, action TEXT,
      entity_type TEXT, entity_id TEXT, summary TEXT, route TEXT, method TEXT, created_at TEXT
    );
    CREATE TABLE student_record_checklist (
      id INTEGER PRIMARY KEY, user_id INTEGER, status TEXT, file_storage_name TEXT
    );
    CREATE TABLE student_admissions_document_checklist (
      id INTEGER PRIMARY KEY, user_id INTEGER, status TEXT, file_storage_name TEXT
    );
  `);
  const addUser = db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?,?,?)");
  addUser.run(1, "student", "100001", "Ada", "Card", "ada@example.test", "active", null);
  addUser.run(2, "student", "100002", "Bri", "Ready", "bri@example.test", "active", null);
  addUser.run(3, "student", "100003", "Removed", "Student", "removed@example.test", "inactive", "2026-11-01");
  addUser.run(10, "admin", null, "Admin", "User", "admin@example.test", "active", null);

  const addPlan = db.prepare("INSERT INTO billing_payment_plans VALUES(?,?,?,?,?,?,?,?)");
  addPlan.run(1, 1, "2026-27", "LPN plan", 1000000, 25000, "2026-11-10", "active");
  addPlan.run(2, 2, "2026-27", "LPN plan", 800000, 20000, "2026-11-30", "active");
  addPlan.run(3, 3, "2026-27", "Removed plan", 900000, 30000, "2026-11-01", "active");
  addPlan.run(4, 1, "2025-26", "Old plan", 10000, 10000, "2025-12-01", "completed");

  const addPayment = db.prepare("INSERT INTO billing_payments VALUES(?,?,?,?,?,?,?,?)");
  addPayment.run(1, 1, "2026-27", "Student payment", "Tuition", 25000, "2026-11-20", "Received");
  addPayment.run(2, 2, "2026-27", "Student payment", "Tuition", 20000, "2026-11-21 09:30:00", null);
  addPayment.run(3, 3, "2026-27", "Student payment", "Tuition", 30000, "2026-11-22", null);
  addPayment.run(4, 1, "2025-26", "Student payment", "Tuition", 10000, "2026-10-01", null);
  addPayment.run(5, 1, "Unrelated term", "Student payment", "Other account", 12345, "2025-01-01", null);

  db.exec(`
    INSERT INTO courses VALUES(1,'practical-nursing','Practical Nursing Course');
    INSERT INTO enrollments VALUES(1,1,1,'active'),(2,2,1,'active');
    INSERT INTO billing_charges VALUES
      (1,1,'2026-27 Practical Nursing Term','Tuition','PN tuition',1000000,'posted'),
      (2,2,'2026-27 Practical Nursing Term','Tuition','PN tuition',800000,'posted'),
      (3,1,'2026-27 Practical Nursing Term','Adjustment','Void adjustment',99999,'void');
    INSERT INTO financial_aid_awards VALUES(1,1);
    INSERT INTO financial_aid_disbursements VALUES
      (1,1,25000,'posted'),(2,1,100000,'scheduled');
    INSERT INTO staff_time_entries VALUES
      (1,10,'2026-11-24 08:00:00','2026-11-24 12:00:00'),
      (2,10,'2026-11-24 13:00:00',NULL),
      (3,10,'2026-11-23 08:00:00','2026-11-23 09:00:00');
    INSERT INTO system_activity_log VALUES
      (1,10,1,'payment_recorded','billing','1','Recorded Ada payment','/admin/billing','POST','2026-11-24 09:00:00'),
      (2,10,2,'document_reviewed','student','2','Approved Bri file','/admin/students/2','POST','2026-11-24 10:00:00');
    INSERT INTO student_record_checklist VALUES
      (1,1,'approved','ada-id.pdf'),(2,1,'pending',NULL),
      (3,2,'approved','bri-id.pdf'),(4,2,'waived',NULL);
    INSERT INTO student_admissions_document_checklist VALUES
      (1,1,'complete','ada-app.pdf'),(2,1,'missing',NULL),
      (3,2,'complete','bri-app.pdf'),(4,2,'waived',NULL);
  `);
  return db;
}

test("tuition dashboard data reports plans, collections, past due accounts, staff time, activity, and Vault counts", () => {
  const db = fixture();
  try {
    const data = tuitionDashboardData(db, { today: "2026-11-24", monthKey: "2026-11" });
    assert.equal(data.activePlans.count, 2);
    assert.equal(data.activePlans.totalCents, 1800000);
    assert.equal(data.activePlans.rows[0].studentName, "Ada Card");
    assert.equal(data.activePlans.rows[0].outstandingCents, 975000);
    assert.deepEqual(data.monthly, { collectedCents: 75000, scheduledCents: 45000 });
    assert.deepEqual(data.pastDuePlans.map((plan) => plan.userId), [1]);
    assert.deepEqual(data.staffTime, { hours: 4, completedEntries: 1, openEntries: 1 });
    assert.deepEqual(data.recentPayments.map((payment) => payment.userId), [2, 1, 1, 1]);
    assert.equal(data.recentActivity[0].summary, "Approved Bri file");
    assert.equal(data.recentActivity[0].targetName, "Bri Ready");
    assert.deepEqual(data.vault, { itemCount: 8, readyCount: 6, uploadedCount: 4, studentCount: 2 });
  } finally { db.close(); }
});

test("staff-time totals honor explicit Eastern-day UTC boundaries near midnight", () => {
  const db = fixture();
  try {
    db.prepare("INSERT INTO staff_time_entries VALUES(?,?,?,?)")
      .run(4, 10, "2026-11-25 02:00:00", "2026-11-25 03:00:00");
    const data = tuitionDashboardData(db, {
      today: "2026-11-24",
      monthKey: "2026-11",
      dayStartAt: "2026-11-24 05:00:00",
      dayEndAt: "2026-11-25 05:00:00"
    });
    assert.deepEqual(data.staffTime, { hours: 5, completedEntries: 2, openEntries: 1 });
  } finally { db.close(); }
});

test("billing Vault rows aggregate once per student and expose readiness without cross-join inflation", () => {
  const db = fixture();
  try {
    const rows = billingVaultRows(db);
    assert.deepEqual(rows.map((row) => row.id), [1, 2]);
    const ada = rows[0];
    assert.deepEqual(ada.registrar, { count: 2, readyCount: 1, uploadedCount: 1, ready: false });
    assert.deepEqual(ada.admissions, { count: 2, readyCount: 1, uploadedCount: 1, ready: false });
    assert.deepEqual(ada.plan, { count: 2, activeCount: 1, totalCents: 1010000, paidCents: 35000, balanceCents: 975000, nextDueDate: "2026-11-10", ready: true });
    assert.deepEqual(ada.account, { chargeCents: 1015000, paidCents: 47345, aidCents: 25000, balanceCents: 942655, ready: false });
    const bri = rows[1];
    assert.equal(bri.registrar.ready, true);
    assert.equal(bri.admissions.ready, true);
    assert.equal(bri.plan.ready, true);
    assert.equal(bri.account.ready, true);
    assert.deepEqual(bri.account, { chargeCents: 815000, paidCents: 20000, aidCents: 0, balanceCents: 795000, ready: true });
  } finally { db.close(); }
});

test("dashboard and Vault renderers use accessible reference-inspired classes and escape every dynamic value", () => {
  const db = fixture();
  try {
    const data = tuitionDashboardData(db, { today: "2026-11-24", monthKey: "2026-11" });
    data.recentActivity[0].summary = '<img src=x onerror="bad">';
    const dashboard = renderTuitionDashboardPanel(data);
    assert.match(dashboard, /class="tuition-workspace"/);
    assert.match(dashboard, /Open School Vault/);
    assert.match(dashboard, /Collections this month/);
    assert.match(dashboard, /&lt;img src=x onerror=&quot;bad&quot;&gt;/);
    assert.doesNotMatch(dashboard, /<img src=x|onerror="bad"/);

    const rows = billingVaultRows(db);
    rows[0].studentName = '<script>alert("x")</script>';
    const vault = renderBillingVault(rows);
    assert.match(vault, /class="billing-vault"/);
    assert.match(vault, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
    assert.doesNotMatch(vault, /<script>/);
  } finally { db.close(); }
});

test("statement and payment-option renderers never collect bank or card credentials in the BMHI portal", () => {
  const unsafe = 'javascript:alert("x")';
  const statement = renderPaymentStatement({
    studentName: '<b>Student</b>', programName: "PN 107", planName: "LPN plan",
    amountDueCents: 33210, dueDate: "2026-12-01", balanceAfterPaymentCents: 757099,
    installmentLabel: "10 of 36", paymentHref: unsafe, contactEmail: 'billing"@example.test'
  });
  assert.match(statement, /Account statement/);
  assert.match(statement, /\$332\.10/);
  assert.match(statement, /&lt;b&gt;Student&lt;\/b&gt;/);
  assert.match(statement, /href="\/student\/financial"/);
  assert.doesNotMatch(statement, /javascript:|<form|<input/i);

  const options = renderPaymentOptions({ amountDueCents: 33210, dueDate: "2026-12-01", paymentHref: "https://payments.example.test/session/1" });
  assert.match(options, /Bank account \(ACH\)/);
  assert.match(options, /Debit or credit card/);
  assert.match(options, /href="https:\/\/payments\.example\.test\/session\/1"/);
  assert.doesNotMatch(options, /<form|<input|<select|<textarea|name="/i);

  const disguisedExternal = renderPaymentOptions({ paymentHref: "/\\attacker.example/pay" });
  assert.match(disguisedExternal, /href="\/student\/financial"/);
  assert.doesNotMatch(disguisedExternal, /attacker\.example/);
});

test("statements preserve signed account adjustments so line items reconcile with totals", () => {
  const statement = renderPaymentStatement({
    balance: 130000,
    totalCharges: 130000,
    charges: [
      { description: "Tuition", amount_cents: 140000 },
      { description: "Scholarship adjustment", amount_cents: -10000 }
    ]
  });
  assert.match(statement, /Scholarship adjustment/);
  assert.match(statement, /-\$100\.00/);
  assert.match(statement, /Total charges<\/span><strong>\$1,300\.00/);
});

test("database readers require a database connection", () => {
  assert.throws(() => tuitionDashboardData(null), /database connection/i);
  assert.throws(() => billingVaultRows(), /database connection/i);
});
