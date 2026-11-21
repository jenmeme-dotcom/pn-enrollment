"use strict";

const crypto = require("node:crypto");
const { escapeHtml, initialsFor } = require("./ui");

const CONTACT_PATH = "/admin/student-contacts";
const PHONE_HELP = "Enter a 10-digit phone number, or an international number beginning with + and its country code. An extension may follow ext. or x.";
const STUDENT_COLUMNS = "id, student_number, first_name, last_name, email, personal_email, phone, cohort_name, status, photo_storage_name, photo_original_name, photo_review_status, photo_submitted_at, photo_reviewed_at";
const staffRoles = new Set(["admin", "instructor"]);
const studentStatuses = ["active", "pending", "completed", "inactive", "withdrawn"];
const filterNames = ["contactQuery", "contactCohort", "contactStatus", "contactPhone", "contactPage"];

function validateStudentPhone(value, { required = true } = {}) {
  const invalid = error => ({ valid: false, normalized: "", display: "", tel: "", error });
  if (value !== null && value !== undefined && typeof value !== "string") return invalid(PHONE_HELP);
  const raw = (value || "").trim();
  if (!raw) return required ? invalid("A student phone number is required.") : { valid: true, normalized: "", display: "", tel: "", error: "" };
  if (raw.length > 80) return invalid(PHONE_HELP);
  const extension = raw.match(/\s*(?:ext\.?|x|#)\s*(\d{1,6})$/i);
  const base = extension ? raw.slice(0, extension.index).trim() : raw;
  if (!/^\+?[\d\s().-]+$/.test(base)) return invalid(PHONE_HELP);
  let digits = base.replace(/\D/g, "");
  const international = base.startsWith("+");
  if (!international && digits.length === 10) digits = `1${digits}`;
  else if (!international && !(digits.length === 11 && digits.startsWith("1"))) return invalid(PHONE_HELP);
  if (!/^[1-9]\d{7,14}$/.test(digits) || /^(\d)\1+$/.test(digits)) return invalid(PHONE_HELP);
  if (digits.startsWith("1") && !/^1[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return invalid(PHONE_HELP);
  const number = `+${digits}`;
  const display = digits.startsWith("1")
    ? `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    : number;
  return {
    valid: true,
    normalized: `${number}${extension ? ` ext. ${extension[1]}` : ""}`,
    display: `${display}${extension ? ` ext. ${extension[1]}` : ""}`,
    tel: `tel:${number}${extension ? `;ext=${extension[1]}` : ""}`,
    error: ""
  };
}

function requireStudentPhone(value) {
  const phone = validateStudentPhone(value);
  if (!phone.valid) throw new Error(phone.error);
  return phone.normalized;
}

function cleanText(value, length = 100) {
  return typeof value === "string" ? value.trim().slice(0, length) : "";
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, character => `\\${character}`);
}

function queryStudentContacts(database, options = {}) {
  const query = cleanText(options.query);
  const cohort = cleanText(options.cohort);
  const status = studentStatuses.includes(options.status) ? options.status : "";
  const phone = options.phone === "missing" ? "missing" : "";
  const pageSize = Math.max(1, Math.min(48, Number.isSafeInteger(Number(options.pageSize)) ? Number(options.pageSize) : 12));
  const clauses = ["role = 'student'", "removed_at IS NULL", "lower(email) <> 'teststudent@browardmiamihi.com'"];
  const parameters = [];
  if (cohort) { clauses.push("COALESCE(cohort_name, '') = ?"); parameters.push(cohort); }
  if (status) { clauses.push("status = ?"); parameters.push(status); }
  if (phone) clauses.push("trim(COALESCE(phone, '')) = ''");
  if (query) {
    const like = `%${escapeLike(query.toLowerCase())}%`;
    const searchDigits = /^[+\d\s().-]+$/.test(query) ? query.replace(/\D/g, "") : "";
    const textMatch = "lower(first_name || ' ' || last_name || ' ' || email || ' ' || COALESCE(personal_email, '') || ' ' || COALESCE(student_number, '') || ' ' || COALESCE(cohort_name, '') || ' ' || COALESCE(phone, '')) LIKE ? ESCAPE '\\'";
    if (searchDigits.length >= 3) {
      clauses.push(`(${textMatch} OR replace(replace(replace(replace(replace(COALESCE(phone, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?)`);
      parameters.push(like, `%${searchDigits}%`);
    } else { clauses.push(`(${textMatch})`); parameters.push(like); }
  }
  const where = clauses.join(" AND ");
  const total = database.prepare(`SELECT COUNT(*) AS count FROM users WHERE ${where}`).get(...parameters).count;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(pages, Number.isSafeInteger(Number(options.page)) ? Number(options.page) : 1));
  const students = database.prepare(`SELECT ${STUDENT_COLUMNS} FROM users WHERE ${where}
    ORDER BY lower(last_name), lower(first_name), id LIMIT ? OFFSET ?`).all(...parameters, pageSize, (page - 1) * pageSize);
  const cohorts = database.prepare("SELECT DISTINCT cohort_name FROM users WHERE role='student' AND removed_at IS NULL AND lower(email)<>'teststudent@browardmiamihi.com' AND trim(COALESCE(cohort_name,''))<>'' ORDER BY cohort_name").all().map(row => row.cohort_name);
  return { students, total, pages, page, pageSize, query, cohort, status, phone, cohorts };
}

function studentContactsCsrfToken(req) {
  if (!req.session) throw new Error("Student contacts require an authenticated session.");
  if (!req.session.studentContactsCsrfToken) req.session.studentContactsCsrfToken = crypto.randomBytes(32).toString("hex");
  return req.session.studentContactsCsrfToken;
}

function validCsrf(req) {
  const supplied = req.body?.csrfToken;
  const expected = req.session?.studentContactsCsrfToken;
  return typeof supplied === "string" && typeof expected === "string" && /^[a-f0-9]{64}$/.test(supplied) && /^[a-f0-9]{64}$/.test(expected) && crypto.timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
}

function safeReturnPath(value) {
  if (typeof value !== "string" || value.length > 2000) return CONTACT_PATH;
  try {
    const parsed = new URL(value, "http://contacts.local");
    return parsed.origin === "http://contacts.local" && ["/admin", CONTACT_PATH].includes(parsed.pathname)
      ? `${parsed.pathname}${parsed.search}${parsed.hash}` : CONTACT_PATH;
  } catch { return CONTACT_PATH; }
}

function hiddenFieldsFor(options) {
  return Object.entries(options.hiddenFields || {}).filter(([key, value]) => /^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(key) && !filterNames.includes(key) && ["string", "number"].includes(typeof value))
    .map(([key, value]) => [key, String(value).slice(0, 200)]);
}

function directoryUrl(model, options, page = model.page) {
  const base = options.basePath === "/admin" ? "/admin" : CONTACT_PATH;
  const params = new URLSearchParams(hiddenFieldsFor(options));
  for (const [key, value] of [["contactQuery", model.query], ["contactCohort", model.cohort], ["contactStatus", model.status], ["contactPhone", model.phone]]) if (value) params.set(key, value);
  if (page > 1) params.set("contactPage", String(page));
  return `${base}${params.size ? `?${params}` : ""}`;
}

function emailLink(value) {
  const email = cleanText(value, 254);
  return email ? `<a href="mailto:${escapeHtml(encodeURIComponent(email))}">${escapeHtml(email)}</a>` : "Not recorded";
}

function renderContactCard(student, options) {
  const name = `${student.first_name} ${student.last_name}`.trim();
  const phone = validateStudentPhone(student.phone, { required: false });
  const phoneMissing = !cleanText(student.phone, 80);
  const canEdit = options.user?.role === "admin" && options.canEdit !== false;
  const returnTo = safeReturnPath(options.returnTo || CONTACT_PATH);
  const profileHref = `${CONTACT_PATH}/${student.id}?returnTo=${encodeURIComponent(returnTo)}`;
  const fileHref = `/admin/students/${student.id}/registrar-checklist`;
  const nameHref = options.user.role === "admin" ? fileHref : profileHref;
  const avatar = options.renderAvatar
    ? options.renderAvatar(student, "student-contact-avatar")
    : `<span class="student-contact-avatar" aria-hidden="true">${escapeHtml(initialsFor(student))}</span>`;
  return `<article class="student-contact-card" id="student-contact-${student.id}">
    <header class="student-contact-card-head">${avatar}<div class="student-contact-identity">
      <h3><a href="${escapeHtml(nameHref)}">${escapeHtml(name)}</a></h3>
      <span>Student ID ${escapeHtml(student.student_number || String(100000 + Number(student.id)))}</span>
    </div></header>
    <div class="student-contact-badges"><span class="student-contact-status ${escapeHtml(student.status)}">${escapeHtml(student.status || "Not recorded")}</span><span class="student-contact-cohort">${escapeHtml(student.cohort_name || "No cohort assigned")}</span></div>
    <dl class="student-contact-details">
      <div><dt>Phone</dt><dd>${phoneMissing ? '<span class="student-contact-missing">Phone required</span>' : phone.valid ? `<a href="${escapeHtml(phone.tel)}">${escapeHtml(phone.display)}</a>` : `${escapeHtml(student.phone)} <span class="student-contact-missing">Phone needs review</span>`}</dd></div>
      ${student.personal_email ? `<div><dt>Contact email</dt><dd>${emailLink(student.personal_email)}</dd></div>` : ""}
      <div><dt>Portal email</dt><dd>${emailLink(student.email)}</dd></div>
    </dl>
    <div class="student-contact-card-actions">${options.user.role === "admin" ? `<a class="button small ghost" href="${fileHref}">Open student file</a>` : ""}${!options.profile ? `<a class="button small ghost" href="${escapeHtml(profileHref)}">Contact details</a>` : ""}</div>
    ${canEdit ? `<details class="student-contact-edit" ${options.error ? "open" : ""}><summary>${phoneMissing ? "Add phone number" : "Edit phone number"}</summary>
      <form class="student-contact-phone-form" method="post" action="${CONTACT_PATH}/${student.id}/phone">
        <input type="hidden" name="csrfToken" value="${escapeHtml(options.csrfToken || "")}">
        <input type="hidden" name="priorPhone" value="${escapeHtml(student.phone || "")}">
        <input type="hidden" name="returnTo" value="${escapeHtml(returnTo)}">
        <label>Phone number<input type="tel" name="phone" autocomplete="tel" maxlength="80" required value="${escapeHtml(options.enteredPhone ?? student.phone ?? "")}" aria-describedby="contact-phone-help-${student.id}"></label>
        <small id="contact-phone-help-${student.id}">${escapeHtml(PHONE_HELP)}</small>
        ${options.error ? `<p class="student-contact-error" role="alert">${escapeHtml(options.error)}</p>` : ""}
        <button class="small" type="submit">Save phone</button>
      </form></details>` : ""}
  </article>`;
}

function renderContactDirectory(database, options = {}) {
  if (!staffRoles.has(options.user?.role)) throw new Error("Student contacts are available to staff only.");
  const model = queryStudentContacts(database, options);
  const returnTo = directoryUrl(model, options);
  const selected = (actual, expected) => actual === expected ? "selected" : "";
  return `<section class="student-contact-directory" id="student-contacts">
    <header class="student-contact-directory-head"><div><h2>Student contacts</h2><p>${model.total} student${model.total === 1 ? "" : "s"}${model.phone ? " with no phone number recorded" : ""}</p></div></header>
    <form class="student-contact-filters" method="get" action="${options.basePath === "/admin" ? "/admin" : CONTACT_PATH}#student-contacts">
      ${hiddenFieldsFor(options).map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`).join("")}
      <label>Search students<input type="search" name="contactQuery" value="${escapeHtml(model.query)}" maxlength="100" placeholder="Name, email, phone or student ID"></label>
      ${options.showCohortFilter === false ? `<input type="hidden" name="contactCohort" value="${escapeHtml(model.cohort)}">` : `<label>Cohort<select name="contactCohort"><option value="">All cohorts</option>${model.cohorts.map(cohort => `<option value="${escapeHtml(cohort)}" ${selected(model.cohort, cohort)}>${escapeHtml(cohort)}</option>`).join("")}</select></label>`}
      <label>Status<select name="contactStatus"><option value="">All statuses</option>${studentStatuses.map(status => `<option value="${status}" ${selected(model.status, status)}>${status[0].toUpperCase()}${status.slice(1)}</option>`).join("")}</select></label>
      <label>Phone<select name="contactPhone"><option value="">All students</option><option value="missing" ${selected(model.phone, "missing")}>Missing phone</option></select></label><button class="small" type="submit">Filter contacts</button>
    </form>
    <div class="student-contact-grid">${model.students.map(student => renderContactCard(student, { ...options, returnTo: `${returnTo}#student-contact-${student.id}` })).join("") || '<p class="empty">No students match these filters.</p>'}</div>
    <nav class="student-contact-pagination" aria-label="Student contact pages">
      ${model.page > 1 ? `<a class="button small ghost" href="${escapeHtml(directoryUrl(model, options, model.page - 1))}#student-contacts">Previous</a>` : ""}
      <span>Page ${model.page} of ${model.pages}${model.total ? ` · ${(model.page - 1) * model.pageSize + 1}-${Math.min(model.page * model.pageSize, model.total)} of ${model.total}` : ""}</span>
      ${model.page < model.pages ? `<a class="button small ghost" href="${escapeHtml(directoryUrl(model, options, model.page + 1))}#student-contacts">Next</a>` : ""}
    </nav>
  </section>`;
}

function registerStudentContactRoutes(app, { db, requireAuth, render, flash, renderAvatar, recordSystemActivity }) {
  if (typeof recordSystemActivity !== "function") throw new TypeError("Student phone updates require recordSystemActivity.");
  const staffOnly = (req, res, next) => staffRoles.has(req.user?.role) ? next() : res.status(403).send("Forbidden");
  const privateResponse = (req, res, next) => { res.set({ "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" }); next(); };
  const findStudent = rawId => /^\d+$/.test(String(rawId)) && Number.isSafeInteger(Number(rawId))
    ? db.prepare(`SELECT ${STUDENT_COLUMNS} FROM users WHERE id=? AND role='student' AND removed_at IS NULL`).get(Number(rawId)) : null;
  function profile(req, res, student, extra = {}) {
    const body = `<section class="student-contact-profile"><div class="page-head"><div><p class="eyebrow">Student profile</p><h1>Contact information</h1></div><a class="button ghost" href="${escapeHtml(safeReturnPath(req.body?.returnTo || req.query.returnTo))}">Back to student contacts</a></div>${renderContactCard(student, { user: req.user, csrfToken: studentContactsCsrfToken(req), renderAvatar, profile: true, returnTo: safeReturnPath(req.body?.returnTo || req.query.returnTo), ...extra })}</section>`;
    return render(req, res, "Student contact profile", body, { studentContacts: true });
  }
  app.get(CONTACT_PATH, requireAuth, staffOnly, privateResponse, (req, res) => {
    const body = renderContactDirectory(db, { user: req.user, query: req.query.contactQuery, cohort: req.query.contactCohort, status: req.query.contactStatus, phone: req.query.contactPhone, page: req.query.contactPage, csrfToken: studentContactsCsrfToken(req), renderAvatar });
    render(req, res, "Student contacts", body, { studentContacts: true });
  });
  app.get(`${CONTACT_PATH}/:id`, requireAuth, staffOnly, privateResponse, (req, res) => {
    const student = findStudent(req.params.id);
    if (!student) return res.status(404).send("Student not found");
    return profile(req, res, student);
  });
  app.post(`${CONTACT_PATH}/:id/phone`, requireAuth, staffOnly, privateResponse, (req, res) => {
    if (req.user.role !== "admin") return res.status(403).send("Forbidden");
    if (!validCsrf(req)) return res.status(403).send("Invalid or expired contact form. Reload the page and try again.");
    const student = findStudent(req.params.id);
    if (!student) return res.status(404).send("Student not found");
    const phone = validateStudentPhone(req.body.phone);
    if (!phone.valid) { res.status(422); return profile(req, res, student, { error: phone.error, enteredPhone: typeof req.body.phone === "string" ? req.body.phone.slice(0, 80) : "" }); }
    if (typeof req.body.priorPhone !== "string" || req.body.priorPhone !== (student.phone || "")) {
      res.status(409); return profile(req, res, student, { error: "This phone number changed after you opened the form. Review the current number before saving again." });
    }
    const previouslyRecorded = req.systemActivityRecorded;
    try {
      db.exec("BEGIN IMMEDIATE");
      const result = db.prepare("UPDATE users SET phone=? WHERE id=? AND role='student' AND removed_at IS NULL AND COALESCE(phone,'')=?").run(phone.normalized, student.id, req.body.priorPhone);
      if (result.changes !== 1) { db.exec("ROLLBACK"); return res.status(409).send("The student contact changed. Reload the page before saving again."); }
      recordSystemActivity(req, { action: "student_phone_updated", summary: "Updated student contact phone", targetUserId: student.id, entityType: "student", entityId: student.id, details: { previousPhone: student.phone || "", phone: phone.normalized }, statusCode: 303 });
      db.exec("COMMIT");
    } catch (error) {
      try { db.exec("ROLLBACK"); } catch {}
      req.systemActivityRecorded = previouslyRecorded;
      console.error("Student phone update could not be saved:", error.message);
      res.status(500); return profile(req, res, student, { error: "The phone number could not be saved. Please try again." });
    }
    if (flash) flash(req, "Student phone number saved.");
    res.redirect(303, safeReturnPath(req.body.returnTo));
  });
}

module.exports = { PHONE_HELP, validateStudentPhone, requireStudentPhone, queryStudentContacts, renderContactDirectory, studentContactsCsrfToken, registerStudentContactRoutes };
