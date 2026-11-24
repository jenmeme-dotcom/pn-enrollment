"use strict";

const { escapeHtml, money, date } = require("./ui");
const { PN_TERM, PN_CHARGES } = require("./billingTotals");

const DEFAULT_RECENT_LIMIT = 6;

function isoDay(value, fallback = new Date()) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return fallback.toISOString().slice(0, 10);
}

function isoMonth(value, day) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}$/.test(text)) return text;
  return day.slice(0, 7);
}

function personName(row = {}) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.email || "Student";
}

function nonNegative(value) {
  return Math.max(0, Number(value) || 0);
}

function safePaymentHref(value) {
  const href = String(value || "").trim();
  if (/^\/(?![\/\\])/.test(href) && !/[\s\\\u0000-\u001f\u007f]/.test(href)) return href;
  try {
    const parsed = new URL(href);
    if (parsed.protocol === "https:" && parsed.hostname && !parsed.username && !parsed.password
      && !/[\s\\\u0000-\u001f\u007f]/.test(href)) return href;
  } catch {
    // Fall through to the local financial page for malformed or unsafe URLs.
  }
  return "/student/financial";
}

/**
 * Read-only tuition, Vault, payment, and staff-time data for the school dashboard.
 * Dates are accepted explicitly so reports and tests do not depend on the host clock.
 */
function tuitionDashboardData(db, { today, monthKey, dayStartAt, dayEndAt } = {}) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("A database connection is required.");
  const reportDay = isoDay(today);
  const reportMonth = isoMonth(monthKey, reportDay);

  const activePlanRows = db.prepare(`
    SELECT plan.id, plan.user_id, plan.term, plan.name, plan.total_cents,
      plan.installment_cents, plan.next_due_date,
      student.first_name, student.last_name, student.email,
      COALESCE((
        SELECT SUM(payment.amount_cents)
        FROM billing_payments payment
        WHERE payment.user_id = plan.user_id AND payment.term = plan.term
      ), 0) AS paid_cents
    FROM billing_payment_plans plan
    JOIN users student ON student.id = plan.user_id
    WHERE plan.status = 'active'
      AND student.role = 'student'
      AND student.removed_at IS NULL
    ORDER BY date(plan.next_due_date), student.last_name, student.first_name, plan.id
  `).all().map((row) => ({
    id: row.id,
    userId: row.user_id,
    studentName: personName(row),
    email: row.email || "",
    term: row.term,
    planName: row.name,
    totalCents: nonNegative(row.total_cents),
    installmentCents: nonNegative(row.installment_cents),
    nextDueDate: row.next_due_date || null,
    paidCents: nonNegative(row.paid_cents),
    outstandingCents: Math.max(0, nonNegative(row.total_cents) - nonNegative(row.paid_cents))
  }));

  const monthlyCollectedCents = nonNegative(db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) AS amount
    FROM billing_payments
    WHERE substr(paid_at, 1, 7) = ?
  `).get(reportMonth).amount);
  const monthlyScheduledCents = activePlanRows
    .filter((plan) => String(plan.nextDueDate || "").slice(0, 7) === reportMonth)
    .reduce((sum, plan) => sum + Math.min(plan.installmentCents, plan.outstandingCents), 0);

  const pastDuePlans = activePlanRows.filter((plan) => plan.nextDueDate && plan.nextDueDate < reportDay);

  const validUtcBoundary = (value) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(value || ""));
  const useUtcBoundaries = validUtcBoundary(dayStartAt) && validUtcBoundary(dayEndAt);
  const staff = db.prepare(`
    SELECT
      COUNT(CASE WHEN clock_out_at IS NOT NULL THEN 1 END) AS completed_entries,
      COUNT(CASE WHEN clock_out_at IS NULL THEN 1 END) AS open_entries,
      COALESCE(SUM(CASE
        WHEN clock_out_at IS NOT NULL THEN MAX(0, (julianday(clock_out_at) - julianday(clock_in_at)) * 24)
        ELSE 0
      END), 0) AS hours
    FROM staff_time_entries
    WHERE ${useUtcBoundaries ? "clock_in_at >= ? AND clock_in_at < ?" : "date(clock_in_at) = ?"}
  `).get(...(useUtcBoundaries ? [dayStartAt, dayEndAt] : [reportDay]));

  const recentPayments = db.prepare(`
    SELECT payment.id, payment.user_id, payment.term, payment.source, payment.applied_to,
      payment.amount_cents, payment.paid_at, payment.note,
      student.first_name, student.last_name, student.email
    FROM billing_payments payment
    JOIN users student ON student.id = payment.user_id
    WHERE student.role = 'student' AND student.removed_at IS NULL
    ORDER BY datetime(payment.paid_at) DESC, payment.id DESC
    LIMIT ?
  `).all(DEFAULT_RECENT_LIMIT).map((row) => ({
    id: row.id,
    userId: row.user_id,
    studentName: personName(row),
    email: row.email || "",
    term: row.term,
    source: row.source,
    appliedTo: row.applied_to,
    amountCents: nonNegative(row.amount_cents),
    paidAt: row.paid_at,
    note: row.note || ""
  }));

  const recentActivity = db.prepare(`
    SELECT activity.id, activity.target_user_id, activity.action, activity.entity_type, activity.entity_id,
      activity.summary, activity.route, activity.method, activity.created_at,
      actor.first_name AS actor_first_name, actor.last_name AS actor_last_name, actor.email AS actor_email,
      target.first_name AS target_first_name, target.last_name AS target_last_name, target.email AS target_email
    FROM system_activity_log activity
    LEFT JOIN users actor ON actor.id = activity.actor_user_id
    LEFT JOIN users target ON target.id = activity.target_user_id
    ORDER BY datetime(activity.created_at) DESC, activity.id DESC
    LIMIT ?
  `).all(DEFAULT_RECENT_LIMIT).map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    summary: row.summary,
    route: row.route || "",
    method: row.method || "",
    createdAt: row.created_at,
    actorName: personName({ first_name: row.actor_first_name, last_name: row.actor_last_name, email: row.actor_email || "System" }),
    targetName: row.target_user_id ? personName({ first_name: row.target_first_name, last_name: row.target_last_name, email: row.target_email }) : ""
  }));

  const vault = db.prepare(`
    WITH vault_items AS (
      SELECT user_id,
        CASE WHEN status IN ('approved', 'waived') THEN 1 ELSE 0 END AS ready,
        CASE WHEN file_storage_name IS NOT NULL AND trim(file_storage_name) <> '' THEN 1 ELSE 0 END AS uploaded
      FROM student_record_checklist
      UNION ALL
      SELECT user_id,
        CASE WHEN status IN ('complete', 'waived') THEN 1 ELSE 0 END AS ready,
        CASE WHEN file_storage_name IS NOT NULL AND trim(file_storage_name) <> '' THEN 1 ELSE 0 END AS uploaded
      FROM student_admissions_document_checklist
    )
    SELECT COUNT(*) AS item_count,
      COALESCE(SUM(ready), 0) AS ready_count,
      COALESCE(SUM(uploaded), 0) AS uploaded_count,
      COUNT(DISTINCT user_id) AS student_count
    FROM vault_items
  `).get();

  return {
    today: reportDay,
    monthKey: reportMonth,
    activePlans: {
      count: activePlanRows.length,
      totalCents: activePlanRows.reduce((sum, plan) => sum + plan.totalCents, 0),
      installmentCents: activePlanRows.reduce((sum, plan) => sum + plan.installmentCents, 0),
      rows: activePlanRows
    },
    monthly: { collectedCents: monthlyCollectedCents, scheduledCents: monthlyScheduledCents },
    pastDuePlans,
    staffTime: {
      hours: Math.round(nonNegative(staff.hours) * 100) / 100,
      completedEntries: Number(staff.completed_entries || 0),
      openEntries: Number(staff.open_entries || 0)
    },
    recentPayments,
    recentActivity,
    vault: {
      itemCount: Number(vault.item_count || 0),
      readyCount: Number(vault.ready_count || 0),
      uploadedCount: Number(vault.uploaded_count || 0),
      studentCount: Number(vault.student_count || 0)
    }
  };
}

/** Return one readiness row per nonremoved student without cross-join inflation. */
function billingVaultRows(db) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("A database connection is required.");
  return db.prepare(`
    WITH registrar AS (
      SELECT user_id, COUNT(*) AS item_count,
        SUM(CASE WHEN status IN ('approved', 'waived') THEN 1 ELSE 0 END) AS ready_count,
        SUM(CASE WHEN file_storage_name IS NOT NULL AND trim(file_storage_name) <> '' THEN 1 ELSE 0 END) AS uploaded_count
      FROM student_record_checklist GROUP BY user_id
    ), admissions AS (
      SELECT user_id, COUNT(*) AS item_count,
        SUM(CASE WHEN status IN ('complete', 'waived') THEN 1 ELSE 0 END) AS ready_count,
        SUM(CASE WHEN file_storage_name IS NOT NULL AND trim(file_storage_name) <> '' THEN 1 ELSE 0 END) AS uploaded_count
      FROM student_admissions_document_checklist GROUP BY user_id
    ), plans AS (
      SELECT user_id,
        COUNT(CASE WHEN status IN ('active', 'completed') THEN 1 END) AS plan_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_plan_count,
        COALESCE(SUM(CASE WHEN status IN ('active', 'completed') THEN total_cents ELSE 0 END), 0) AS plan_total_cents,
        MIN(CASE WHEN status = 'active' THEN next_due_date END) AS next_due_date
      FROM billing_payment_plans GROUP BY user_id
    ), plan_terms AS (
      SELECT DISTINCT user_id, term
      FROM billing_payment_plans
      WHERE status IN ('active', 'completed')
    ), plan_payments AS (
      SELECT payment.user_id, COALESCE(SUM(payment.amount_cents), 0) AS paid_cents
      FROM billing_payments payment
      JOIN plan_terms ON plan_terms.user_id = payment.user_id AND plan_terms.term = payment.term
      GROUP BY payment.user_id
    ), payments AS (
      SELECT user_id, COALESCE(SUM(amount_cents), 0) AS paid_cents
      FROM billing_payments GROUP BY user_id
    ), aid AS (
      SELECT award.user_id,
        COALESCE(SUM(CASE WHEN disbursement.status IN ('posted', 'disbursed') THEN disbursement.amount_cents ELSE 0 END), 0) AS aid_cents
      FROM financial_aid_awards award
      JOIN financial_aid_disbursements disbursement ON disbursement.award_id = award.id
      GROUP BY award.user_id
    ), pn_enrollments AS (
      SELECT enrollment.user_id, 1 AS has_pn
      FROM enrollments enrollment
      JOIN courses course ON course.id = enrollment.course_id
      WHERE enrollment.status <> 'withdrawn'
        AND (course.slug = 'practical-nursing' OR course.category = 'Practical Nursing Course')
      GROUP BY enrollment.user_id
    ), charges AS (
      SELECT user_id,
        COALESCE(SUM(CASE WHEN status = 'posted' THEN amount_cents ELSE 0 END), 0) AS charge_cents,
        MAX(CASE WHEN status = 'posted' AND term = ? AND category = 'Tuition' THEN 1 ELSE 0 END) AS has_current_tuition,
        MAX(CASE WHEN status = 'posted' AND term = ? AND lower(description) LIKE '%registration%' THEN 1 ELSE 0 END) AS has_current_registration
      FROM billing_charges GROUP BY user_id
    )
    SELECT student.id, student.student_number, student.first_name, student.last_name,
      student.email, student.status,
      COALESCE(registrar.item_count, 0) AS registrar_count,
      COALESCE(registrar.ready_count, 0) AS registrar_ready,
      COALESCE(registrar.uploaded_count, 0) AS registrar_uploaded,
      COALESCE(admissions.item_count, 0) AS admissions_count,
      COALESCE(admissions.ready_count, 0) AS admissions_ready,
      COALESCE(admissions.uploaded_count, 0) AS admissions_uploaded,
      COALESCE(plans.plan_count, 0) AS plan_count,
      COALESCE(plans.active_plan_count, 0) AS active_plan_count,
      COALESCE(plans.plan_total_cents, 0) AS plan_total_cents,
      plans.next_due_date,
      COALESCE(plan_payments.paid_cents, 0) AS plan_paid_cents,
      COALESCE(payments.paid_cents, 0) AS account_paid_cents,
      COALESCE(aid.aid_cents, 0) AS aid_cents,
      COALESCE(pn_enrollments.has_pn, 0) AS has_pn,
      COALESCE(charges.charge_cents, 0) AS charge_cents,
      COALESCE(charges.has_current_tuition, 0) AS has_current_tuition,
      COALESCE(charges.has_current_registration, 0) AS has_current_registration
    FROM users student
    LEFT JOIN registrar ON registrar.user_id = student.id
    LEFT JOIN admissions ON admissions.user_id = student.id
    LEFT JOIN plans ON plans.user_id = student.id
    LEFT JOIN plan_payments ON plan_payments.user_id = student.id
    LEFT JOIN payments ON payments.user_id = student.id
    LEFT JOIN aid ON aid.user_id = student.id
    LEFT JOIN pn_enrollments ON pn_enrollments.user_id = student.id
    LEFT JOIN charges ON charges.user_id = student.id
    WHERE student.role = 'student' AND student.removed_at IS NULL
    ORDER BY student.last_name, student.first_name, student.id
  `).all(PN_TERM, PN_TERM).map((row) => {
    const registrarCount = Number(row.registrar_count || 0);
    const registrarReadyCount = Number(row.registrar_ready || 0);
    const admissionsCount = Number(row.admissions_count || 0);
    const admissionsReadyCount = Number(row.admissions_ready || 0);
    const planCount = Number(row.plan_count || 0);
    const planTotalCents = nonNegative(row.plan_total_cents);
    const planPaidCents = nonNegative(row.plan_paid_cents);
    const accountPaidCents = nonNegative(row.account_paid_cents);
    const tuitionDefault = PN_CHARGES.find((charge) => charge.category === "Tuition")?.amount_cents || 0;
    const registrationDefault = PN_CHARGES.find((charge) => charge.category === "Fee")?.amount_cents || 0;
    const scheduledDefaults = Number(row.has_pn || 0)
      ? (Number(row.has_current_tuition || 0) ? 0 : tuitionDefault)
        + (Number(row.has_current_registration || 0) ? 0 : registrationDefault)
      : 0;
    const chargeCents = Number(row.charge_cents || 0) + scheduledDefaults;
    const aidCents = nonNegative(row.aid_cents);
    const registrarReady = registrarCount > 0 && registrarReadyCount === registrarCount;
    const admissionsReady = admissionsCount > 0 && admissionsReadyCount === admissionsCount;
    const planReady = planCount > 0;
    return {
      id: row.id,
      studentNumber: row.student_number || "",
      studentName: personName(row),
      email: row.email || "",
      status: row.status || "",
      registrar: { count: registrarCount, readyCount: registrarReadyCount, uploadedCount: Number(row.registrar_uploaded || 0), ready: registrarReady },
      admissions: { count: admissionsCount, readyCount: admissionsReadyCount, uploadedCount: Number(row.admissions_uploaded || 0), ready: admissionsReady },
      plan: {
        count: planCount,
        activeCount: Number(row.active_plan_count || 0),
        totalCents: planTotalCents,
        paidCents: planPaidCents,
        balanceCents: Math.max(0, planTotalCents - planPaidCents),
        nextDueDate: row.next_due_date || null,
        ready: planReady
      },
      account: {
        chargeCents,
        paidCents: accountPaidCents,
        aidCents,
        balanceCents: Math.max(0, chargeCents - accountPaidCents - aidCents),
        ready: registrarReady && admissionsReady && planReady
      }
    };
  });
}

function renderTuitionDashboardPanel(data = {}) {
  const activePlans = data.activePlans || {};
  const monthly = data.monthly || {};
  const staffTime = data.staffTime || {};
  const vault = data.vault || {};
  const payments = Array.isArray(data.recentPayments) ? data.recentPayments : [];
  const activities = Array.isArray(data.recentActivity) ? data.recentActivity : [];
  const pastDue = Array.isArray(data.pastDuePlans) ? data.pastDuePlans : [];
  return `
    <section class="tuition-workspace" aria-labelledby="tuition-workspace-title">
      <header class="tuition-workspace-head">
        <div><p class="tuition-eyebrow">School finance &amp; records</p><h2 id="tuition-workspace-title">Tuition and Vault overview</h2><p>Review plan readiness, school collections, documents, and staff activity.</p></div>
        <a class="button tuition-vault-action" href="/admin/billing#school-vault">Open School Vault</a>
      </header>
      <div class="tuition-vault-callout">
        <div><strong>Your records are in the School Vault</strong><p>${escapeHtml(vault.uploadedCount || 0)} uploaded documents across ${escapeHtml(vault.studentCount || 0)} student files.</p></div>
        <span>${escapeHtml(vault.readyCount || 0)}/${escapeHtml(vault.itemCount || 0)} checklist items ready</span>
      </div>
      <div class="tuition-metrics">
        <article class="tuition-metric"><span>Active payment plans</span><strong>${escapeHtml(activePlans.count || 0)}</strong><small>${money(nonNegative(activePlans.totalCents))} planned</small></article>
        <article class="tuition-metric tuition-metric-primary"><span>Collections this month</span><strong>${money(nonNegative(monthly.collectedCents))}</strong><small>of ${money(nonNegative(monthly.scheduledCents))} currently scheduled</small></article>
        <article class="tuition-metric tuition-metric-alert"><span>Past-due alerts</span><strong>${escapeHtml(pastDue.length)}</strong><small>For authorized staff follow-up</small></article>
        <article class="tuition-metric"><span>Staff hours today</span><strong>${escapeHtml(Number(staffTime.hours || 0).toFixed(2))}</strong><small>${escapeHtml(staffTime.openEntries || 0)} currently clocked in</small></article>
      </div>
      <div class="tuition-dashboard-columns">
        <section class="tuition-panel"><h3>Recent payments</h3><div class="table-scroll"><table><thead><tr><th>Student</th><th>Term</th><th>Date</th><th>Amount</th></tr></thead><tbody>
          ${payments.map((payment) => `<tr><td><strong>${escapeHtml(payment.studentName || "Student")}</strong></td><td>${escapeHtml(payment.term || "")}</td><td>${escapeHtml(date(payment.paidAt) || "Not recorded")}</td><td>${money(nonNegative(payment.amountCents))}</td></tr>`).join("") || '<tr><td colspan="4" class="empty">No payments recorded yet.</td></tr>'}
        </tbody></table></div></section>
        <section class="tuition-panel"><h3>Today at your school</h3><ul class="tuition-activity-list">
          ${activities.map((activity) => `<li><span><strong>${escapeHtml(activity.summary || "Portal activity")}</strong><small>${escapeHtml(activity.actorName || "System")}</small></span><time>${escapeHtml(date(activity.createdAt) || "Recent")}</time></li>`).join("") || '<li class="empty">No recent system activity.</li>'}
        </ul></section>
      </div>
    </section>
  `;
}

function statusBadge(ready, readyText, pendingText) {
  return `<span class="tuition-status ${ready ? "is-ready" : "needs-review"}">${escapeHtml(ready ? readyText : pendingText)}</span>`;
}

function renderBillingVault(rows = []) {
  const records = Array.isArray(rows) ? rows : [];
  return `
    <section class="billing-vault" id="school-vault" aria-labelledby="billing-vault-title">
      <header class="billing-vault-head"><div><p class="tuition-eyebrow">School Vault</p><h2 id="billing-vault-title">Student billing and document readiness</h2><p>Open a student file to review supporting documents and account details.</p></div><a class="button ghost" href="/admin/system-activity">View audit trail</a></header>
      <div class="table-scroll"><table><thead><tr><th>Student</th><th>Registrar</th><th>Admissions</th><th>Payment plan</th><th>Account</th></tr></thead><tbody>
        ${records.map((row) => `<tr>
          <td><a href="/admin/students/${escapeHtml(row.id)}/registrar-checklist"><strong>${escapeHtml(row.studentName || "Student")}</strong></a><br><span class="muted">${escapeHtml(row.studentNumber || row.email || "")}</span></td>
          <td>${statusBadge(row.registrar?.ready, "Ready", "Needs review")}<small>${escapeHtml(row.registrar?.readyCount || 0)}/${escapeHtml(row.registrar?.count || 0)} items · ${escapeHtml(row.registrar?.uploadedCount || 0)} uploaded</small></td>
          <td>${statusBadge(row.admissions?.ready, "Ready", "Needs review")}<small>${escapeHtml(row.admissions?.readyCount || 0)}/${escapeHtml(row.admissions?.count || 0)} items · ${escapeHtml(row.admissions?.uploadedCount || 0)} uploaded</small></td>
          <td>${statusBadge(row.plan?.ready, "Plan on file", "Plan needed")}<small>${money(nonNegative(row.plan?.balanceCents))} remaining${row.plan?.nextDueDate ? ` · due ${escapeHtml(date(row.plan.nextDueDate))}` : ""}</small></td>
          <td>${statusBadge(row.account?.ready, "Ready", "Action needed")}<small>${money(nonNegative(row.account?.balanceCents))} account balance</small></td>
        </tr>`).join("") || '<tr><td colspan="5" class="empty">No student billing records found.</td></tr>'}
      </tbody></table></div>
    </section>
  `;
}

function renderPaymentStatement(model = {}) {
  const institution = model.institutionName || "Broward-Miami Health Institute";
  const studentName = model.studentName || personName(model.student || {});
  const amountDueCents = nonNegative(model.amountDueCents ?? model.balance);
  const plans = Array.isArray(model.plans) ? model.plans : [];
  const activePlan = plans.find((plan) => plan.status === "active") || plans[0] || {};
  const dueDate = model.dueDate || activePlan.next_due_date || "";
  const installmentCents = nonNegative(model.installmentCents ?? activePlan.installment_cents);
  const charges = Array.isArray(model.charges) ? model.charges : [];
  const payments = Array.isArray(model.payments) ? model.payments : [];
  const aid = Array.isArray(model.aid) ? model.aid : [];
  const paymentHref = model.paymentHref || "/student/financial/payment-options";
  return `
    <section class="payment-statement" aria-labelledby="payment-statement-title">
      <div class="print-actions payment-statement-actions"><button type="button" onclick="window.print()">Print statement</button><a class="button ghost" href="${escapeHtml(safePaymentHref(model.backHref || "/student/financial"))}">${escapeHtml(model.backLabel || "Back to Financial")}</a></div>
      <header><p class="tuition-eyebrow">${escapeHtml(institution)}</p><h1 id="payment-statement-title">Account statement</h1><p>${escapeHtml(model.institutionAddress || "")}</p><small>Statement date ${escapeHtml(date(model.statementDate) || "Not recorded")}</small></header>
      <p>Hello ${escapeHtml(studentName)}, here is your current account information.</p>
      <div class="payment-statement-due"><span>Amount due</span><strong>${money(amountDueCents)}</strong><small>${dueDate ? `Due ${escapeHtml(date(dueDate))}` : "No due date scheduled"}</small></div>
      <dl class="payment-statement-details">
        <div><dt>Student</dt><dd>${escapeHtml(studentName)}</dd></div>
        <div><dt>Student ID</dt><dd>${escapeHtml(model.studentNumber || "Not assigned")}</dd></div>
        <div><dt>Term</dt><dd>${escapeHtml(model.termName || model.term || "Current term")}</dd></div>
        <div><dt>Program</dt><dd>${escapeHtml(model.programName || "Program")}</dd></div>
        <div><dt>Payment plan</dt><dd>${escapeHtml(model.planName || activePlan.name || "No active plan")}</dd></div>
        <div><dt>Next installment</dt><dd>${installmentCents ? money(installmentCents) : "Not scheduled"}</dd></div>
      </dl>
      <div class="payment-statement-ledgers">
        <section><h2>Charges</h2><div class="table-scroll"><table><thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead><tbody>${charges.map((row) => `<tr><td>${escapeHtml(date(row.due_date) || "Not scheduled")}</td><td>${escapeHtml(row.description || row.category || "Charge")}</td><td>${money(Number(row.amount_cents) || 0)}</td></tr>`).join("") || '<tr><td colspan="3" class="empty">No charges recorded.</td></tr>'}</tbody></table></div></section>
        <section><h2>Payments and credits</h2><div class="table-scroll"><table><thead><tr><th>Date</th><th>Source</th><th>Amount</th></tr></thead><tbody>${payments.map((row) => `<tr><td>${escapeHtml(date(row.paid_at) || "Not recorded")}</td><td>${escapeHtml(row.source || "Payment")}</td><td>${money(nonNegative(row.amount_cents))}</td></tr>`).join("")}${aid.map((row) => `<tr><td>${escapeHtml(date(row.disbursement_date) || "Not recorded")}</td><td>${escapeHtml(row.aid_type || "Financial aid")}</td><td>${money(nonNegative(row.amount_cents))}</td></tr>`).join("") || (!payments.length ? '<tr><td colspan="3" class="empty">No payments or credits recorded.</td></tr>' : "")}</tbody></table></div></section>
      </div>
      <div class="payment-statement-totals"><p><span>Total charges</span><strong>${money(Number(model.totalCharges) || 0)}</strong></p><p><span>Payments</span><strong>${money(nonNegative(model.appliedPayments))}</strong></p><p><span>Financial aid</span><strong>${money(nonNegative(model.financialAid))}</strong></p><p><span>Current balance</span><strong>${money(amountDueCents)}</strong></p></div>
      <a class="button payment-statement-action" href="${escapeHtml(safePaymentHref(paymentHref))}">${escapeHtml(model.securePaymentConfigured ? "Open secure payment portal" : "Review payment options")}</a>
      ${model.contactEmail ? `<p class="payment-statement-help">Questions? Contact <a href="mailto:${escapeHtml(model.contactEmail)}">${escapeHtml(model.contactEmail)}</a>.</p>` : ""}
    </section>
  `;
}

function renderPaymentOptions(model = {}) {
  const href = safePaymentHref(model.paymentHref || "/student/financial");
  return `
    <section class="payment-options" aria-labelledby="payment-options-title">
      <header><p class="tuition-eyebrow">Student financial account</p><h2 id="payment-options-title">Payment options</h2><p>Payments are completed only through the school's approved secure payment provider.</p></header>
      <div class="payment-options-summary"><span>Amount due</span><strong>${money(nonNegative(model.amountDueCents))}</strong><small>${escapeHtml(date(model.dueDate) || "No due date posted")}</small></div>
      <div class="payment-option-grid">
        <article><h3>Bank account (ACH)</h3><p>Use the approved payment provider to enter bank information securely. Banking details are never entered or stored on this portal page.</p></article>
        <article><h3>Debit or credit card</h3><p>Card details are collected only by the approved payment provider. This portal does not store card numbers.</p></article>
      </div>
      <a class="button payment-options-action" href="${escapeHtml(href)}">${escapeHtml(model.paymentHref ? `Continue securely to pay ${money(nonNegative(model.amountDueCents))}` : "Return to financial account")}</a>
      ${model.paymentHref ? "" : `<div class="payment-options-contact"><strong>Online payment connection is not configured in this portal.</strong><p>Contact the business office before sending payment information.</p>${model.contactPhone ? `<a href="tel:${escapeHtml(model.contactPhone.replace(/[^0-9+]/g, ""))}">${escapeHtml(model.contactPhone)}</a>` : ""}${model.contactEmail ? `<a href="mailto:${escapeHtml(model.contactEmail)}">${escapeHtml(model.contactEmail)}</a>` : ""}</div>`}
      <p class="payment-options-note">A receipt is issued by the school after a completed payment is recorded.</p>
    </section>
  `;
}

module.exports = {
  tuitionDashboardData,
  billingVaultRows,
  renderTuitionDashboardPanel,
  renderBillingVault,
  renderPaymentStatement,
  renderPaymentOptions
};
