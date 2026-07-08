require("dotenv").config({ quiet: true });

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const nodemailer = require("nodemailer");
const { db, initialize, databaseFile } = require("./db");
const {
  feeSchedule,
  tuitionNotes,
  catalogOperatingHours,
  catalogAcademicCalendar,
  catalogCredentialRequirements,
  catalogAdmissions,
  catalogGraduationRequirements,
  catalogStudentRecords,
  catalogAttendancePolicy,
  catalogProgramSummaries
} = require("./catalog");
const { onsiteVisitChecklistItems } = require("./onsiteVisitChecklist");
const { escapeHtml, layout, money, date, stat, progressBar, initialsFor } = require("./ui");

initialize();

const app = express();
const port = Number(process.env.PORT || 4321);
const instituteName = process.env.INSTITUTE_NAME || "Broward-Miami Health Institute";
const instituteAddress = process.env.INSTITUTE_ADDRESS || "6320 Miramar Pkwy Suite I, Miramar, FL 33023";
const institutePhone = process.env.INSTITUTE_PHONE || "954-248-0669";
const instituteEmail = process.env.INSTITUTE_EMAIL || "support@browardmiamihi.com";
const courseNavItems = [
  "Home",
  "Announcements",
  "Modules",
  "Assignments",
  "Discussions",
  "Grades",
  "People",
  "Pages",
  "Files",
  "Syllabus",
  "Outcomes",
  "Rubrics",
  "Quizzes",
  "Collaborations",
  "Conferences",
  "Groups",
  "Calendar",
  "Chat",
  "Inbox",
  "ePortfolios",
  "Mastery Paths",
  "Peer Reviews",
  "Course Analytics",
  "External Apps",
  "Settings"
];
const hideableCourseSections = courseNavItems.filter((item) => item !== "Home");
const lmsToolGroups = [
  {
    title: "Course content",
    description: "Build structured, accessible learning experiences with reusable course materials.",
    tools: [
      { label: "Modules", section: "Modules", description: "Organize lessons, units, prerequisites, and completion order." },
      { label: "Pages", section: "Pages", description: "Create rich instructional pages for readings, policies, and resources." },
      { label: "Files", section: "Files", description: "Store handouts, forms, slides, videos, and course documents." },
      { label: "Syllabus", section: "Syllabus", description: "Publish course expectations, pacing, grading, and required materials." },
      { label: "Course Import Tool", adminOnly: true, description: "Upload existing LMS packages, Common Cartridge files, or bulk materials." }
    ]
  },
  {
    title: "Assessment and grading",
    description: "Create graded work, feedback workflows, and progress records.",
    tools: [
      { label: "Assignments", section: "Assignments", description: "Build homework, skills checks, projects, and submission activities." },
      { label: "Quizzes", section: "Quizzes", description: "Create knowledge checks, exams, and remediation assessments." },
      { label: "Gradebook", section: "Grades", description: "Track scores, final grades, completion status, and reporting needs." },
      { label: "SpeedGrader", adminOnly: true, description: "Review student submissions and provide instructor feedback." },
      { label: "Peer Reviews", section: "Peer Reviews", description: "Support student-to-student feedback where appropriate." }
    ]
  },
  {
    title: "Communication and collaboration",
    description: "Keep students, instructors, and course groups connected.",
    tools: [
      { label: "Announcements", section: "Announcements", description: "Post course news, reminders, and updates." },
      { label: "Discussions", section: "Discussions", description: "Host guided course conversations and Q&A." },
      { label: "Chat", section: "Chat", description: "Support real-time course interaction." },
      { label: "Inbox", section: "Inbox", description: "Send and receive course messages inside the portal." },
      { label: "Collaborations", section: "Collaborations", description: "Coordinate shared student or instructor work." },
      { label: "Conferences", section: "Conferences", description: "Plan live virtual class meetings and reviews." },
      { label: "Groups", section: "Groups", description: "Organize cohorts, lab teams, clinical groups, and project teams." },
      { label: "ePortfolios", section: "ePortfolios", description: "Let students and instructors showcase work and artifacts." }
    ]
  },
  {
    title: "Outcomes and personalization",
    description: "Connect course activities to measurable skills and individualized learning paths.",
    tools: [
      { label: "Outcomes", section: "Outcomes", description: "Attach institutional and program outcomes to course learning." },
      { label: "Rubrics", section: "Rubrics", description: "Measure performance consistently across assignments and skills." },
      { label: "Mastery Paths", section: "Mastery Paths", description: "Customize learning activities based on student performance." }
    ]
  },
  {
    title: "Analytics and integrations",
    description: "Use data and external tools to support course management decisions.",
    tools: [
      { label: "Calendar", section: "Calendar", description: "Coordinate due dates, course meetings, and events." },
      { label: "Course Analytics", section: "Course Analytics", description: "Monitor engagement, progress, completion, and student success signals." },
      { label: "Canvas Data Services", adminOnly: true, description: "Prepare LMS usage data for institutional reporting and SQL-style analysis." },
      { label: "External Apps (LTI Tools)", section: "External Apps", description: "Connect approved learning apps, assessment tools, and content repositories." },
      { label: "App Center", adminOnly: true, description: "Maintain a library of approved external LMS apps and services." }
    ]
  }
];
const americanHeartAssociationSlugs = new Set([
  "basic-life-support",
  "advanced-cardiovascular-life-support",
  "pediatric-advanced-life-support"
]);
const emailDeliveryEnabled = process.env.EMAIL_DELIVERY_ENABLED === "true";
const emailFrom = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@browardmiamihi.local";
const externalBaseUrl = (process.env.PUBLIC_APP_URL || "https://bmhi-student-portal.onrender.com").replace(/\/+$/, "");
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(path.dirname(databaseFile), "uploads"));
const courseMaterialsDir = path.resolve(process.env.COURSE_MATERIALS_DIR || path.join(path.dirname(__dirname), "course_materials"));
let mailTransporter;

fs.mkdirSync(uploadDir, { recursive: true });

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required in production.");
}

const allowedUploadTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv"
]);
const allowedUploadExtensions = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".zip", ".imscc"]);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || "").toLowerCase().slice(0, 12);
      callback(null, `${crypto.randomUUID()}${extension}`);
    }
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    if (allowedUploadTypes.has(file.mimetype) || allowedUploadExtensions.has(extension)) return callback(null, true);
    callback(new Error("Upload must be a PDF, image, Office document, text file, CSV, ZIP, or IMSCC package."));
  }
});

app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  if (/\.(css|js)$/i.test(req.path)) {
    res.set("Cache-Control", "no-cache, must-revalidate");
  }
  next();
});
app.use(express.static(`${__dirname}/public`));
app.use(
  session({
    name: "bmhi.sid",
    secret: process.env.SESSION_SECRET || "local-development-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

function currentUser(req) {
  if (!req.session.userId) return null;
  return db.prepare("SELECT id, role, first_name, last_name, email, status, organization_status, class_lock_reason FROM users WHERE id = ?").get(req.session.userId);
}

function flash(req, message) {
  req.session.flash = message;
}

function takeFlash(req) {
  const message = req.session.flash;
  delete req.session.flash;
  return message;
}

function render(req, res, title, body, options = {}) {
  res.send(layout({ title, user: currentUser(req), flash: takeFlash(req), body, ...options }));
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.redirect("/login");
  if (user.status !== "active") {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).send("Forbidden");
    next();
  };
}

function isClassLocked(user) {
  return user?.role === "student" && user.organization_status === "not_organized";
}

function classLockMessage(user) {
  return user?.class_lock_reason || "Your class access is locked until the office marks your student file as organized.";
}

function lockedButton(label = "Locked") {
  return `<span class="button small disabled" aria-disabled="true">${escapeHtml(label)}</span>`;
}

function uniformSizeOptions(selectedSize = "") {
  return uniformSizes.map((size) => {
    const label = size || "Not recorded";
    return `<option value="${escapeHtml(size)}" ${selectedSize === size ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("");
}

const registrarChecklistItems = [
  { key: "admissions_documents", title: "Admissions documents", description: "Application, ID, enrollment agreement, entrance documents, and admissions forms." },
  { key: "payment_plan", title: "Payment plan", description: "Tuition plan, payment status, financial clearance, and business office approval." },
  { key: "clinical_requirements", title: "Clinical requirements", description: "Clinical eligibility documents, background requirements, compliance records, and site readiness." },
  { key: "immunizations", title: "Immunizations", description: "Required immunization records, titers, health documents, and expiration tracking." },
  { key: "signed_handbook", title: "Signed handbook", description: "Student handbook acknowledgement and policy agreement." },
  { key: "transcript_upload", title: "Transcript upload", description: "Prior school transcripts, transfer records, and official academic documents." },
  { key: "attendance_audit", title: "Attendance audit", description: "Attendance review, clock-hour audit, absence review, and makeup requirements." },
  { key: "graduation_approval", title: "Graduation approval workflow", description: "Final registrar approval, credential readiness, account clearance, and graduation completion." }
];
const registrarStatuses = ["pending", "received", "approved", "missing", "waived"];
const uniformSizes = ["", "XS", "Small", "Medium", "Large", "XL", "2XL", "3XL", "4XL"];
const hesiSubjects = [
  { subject: "Critical Thinking", acceptableScore: 700 },
  { subject: "Fundamentals", acceptableScore: 850 },
  { subject: "Pharmacology", acceptableScore: 850 },
  { subject: "Nutrition", acceptableScore: 850 },
  { subject: "Medical-Surgical", acceptableScore: 850 },
  { subject: "Geriatrics", acceptableScore: 850 },
  { subject: "Maternity", acceptableScore: 850 },
  { subject: "Pediatrics", acceptableScore: 850 },
  { subject: "Mental Health", acceptableScore: 850 }
];

function hesiScoreStatus(score, acceptableScore) {
  if (score === null || score === undefined || score === "") return "missing";
  return Number(score) >= Number(acceptableScore) ? "pass" : "remediation";
}

function ensureRegistrarChecklist(userId) {
  const insertItem = db.prepare(`
    INSERT OR IGNORE INTO student_record_checklist (user_id, item_key, title)
    VALUES (?, ?, ?)
  `);
  registrarChecklistItems.forEach((item) => insertItem.run(userId, item.key, item.title));
}

function registrarChecklistForStudent(userId) {
  ensureRegistrarChecklist(userId);
  const rows = db.prepare(`
    SELECT *
    FROM student_record_checklist
    WHERE user_id = ?
    ORDER BY CASE item_key
      ${registrarChecklistItems.map((item, index) => `WHEN '${item.key}' THEN ${index}`).join(" ")}
      ELSE 99
    END
  `).all(userId);
  const descriptions = new Map(registrarChecklistItems.map((item) => [item.key, item.description]));
  return rows.map((row) => ({ ...row, description: descriptions.get(row.item_key) || "" }));
}

function registrarProgress(rows = []) {
  const complete = rows.filter((row) => ["approved", "waived"].includes(row.status)).length;
  return { complete, total: registrarChecklistItems.length, percent: Math.round((complete / registrarChecklistItems.length) * 100) };
}

const onsiteVisitStatuses = ["needed", "requested", "received", "approved", "not_applicable"];
const onsiteVisitStatusLabels = {
  needed: "Needed",
  requested: "Requested",
  received: "Received",
  approved: "Approved",
  not_applicable: "N/A"
};

function ensureOnsiteVisitChecklist() {
  const upsertItem = db.prepare(`
    INSERT INTO onsite_visit_items (item_key, section, standard, title, description, presentation_order)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(item_key) DO UPDATE SET
      section = excluded.section,
      standard = excluded.standard,
      title = excluded.title,
      description = excluded.description,
      presentation_order = CASE
        WHEN onsite_visit_items.presentation_order IS NULL OR onsite_visit_items.presentation_order = 1 THEN excluded.presentation_order
        ELSE onsite_visit_items.presentation_order
      END,
      updated_at = CURRENT_TIMESTAMP
  `);
  onsiteVisitChecklistItems.forEach((item, index) => {
    upsertItem.run(item.key, item.section, item.standard, item.title, item.description, index + 1);
  });
}

function onsiteVisitRows() {
  ensureOnsiteVisitChecklist();
  const items = db.prepare(`
    SELECT *
    FROM onsite_visit_items
    ORDER BY presentation_order, section, title
  `).all();
  const files = db.prepare(`
    SELECT f.*, u.first_name, u.last_name
    FROM onsite_visit_files f
    LEFT JOIN users u ON u.id = f.uploaded_by
    ORDER BY f.uploaded_at DESC, f.id DESC
  `).all();
  const fileMap = files.reduce((map, file) => {
    if (!map.has(file.item_id)) map.set(file.item_id, []);
    map.get(file.item_id).push(file);
    return map;
  }, new Map());
  return items.map((item) => ({ ...item, files: fileMap.get(item.id) || [] }));
}

function onsiteVisitProgress(rows = []) {
  const total = rows.length;
  const approved = rows.filter((row) => row.status === "approved" || row.status === "not_applicable").length;
  const received = rows.filter((row) => row.files.length || ["received", "approved", "not_applicable"].includes(row.status)).length;
  const requested = rows.filter((row) => row.status === "requested").length;
  const missing = rows.filter((row) => !row.files.length && !["approved", "not_applicable"].includes(row.status)).length;
  return { total, approved, received, requested, missing, percent: total ? Math.round((approved / total) * 100) : 0 };
}

function groupOnsiteVisitRows(rows = []) {
  return rows.reduce((groups, row) => {
    const section = row.section || "Unsorted";
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(row);
    return groups;
  }, new Map());
}

function onsiteRequestText(rows = []) {
  const needed = rows.filter((row) => !["approved", "not_applicable"].includes(row.status));
  if (!needed.length) return "All OSV checklist items are approved or marked not applicable.";
  const grouped = groupOnsiteVisitRows(needed);
  return [...grouped.entries()].map(([section, items]) => [
    section,
    ...items.map((item) => `- ${item.title}: ${item.description}`)
  ].join("\n")).join("\n\n");
}

function formatBytes(value = 0) {
  const bytes = Number(value || 0);
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPathInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

app.get("/course-materials/:courseSlug/:fileName", requireAuth, (req, res) => {
  const courseSlug = String(req.params.courseSlug || "");
  const fileName = path.basename(String(req.params.fileName || ""));
  if (!courseSlug || !fileName) return res.status(404).send("Course material not found");

  const course = db.prepare("SELECT id, slug FROM courses WHERE slug = ?").get(courseSlug);
  if (!course) return res.status(404).send("Course material not found");

  const canAccess = req.user.role === "admin" || req.user.role === "instructor" || Boolean(db.prepare(`
    SELECT e.id
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ? AND c.slug = ? AND e.status = 'active'
  `).get(req.user.id, courseSlug));
  if (!canAccess) return res.status(403).send("Forbidden");
  if (isClassLocked(req.user)) return res.status(403).send(classLockMessage(req.user));

  const materialDir = path.join(courseMaterialsDir, course.slug);
  const filePath = path.join(materialDir, fileName);
  if (!isPathInside(materialDir, filePath) || !fs.existsSync(filePath)) return res.status(404).send("Course material not found");
  res.download(filePath, fileName);
});

function smtpReady() {
  return Boolean(emailDeliveryEnabled && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getMailTransporter() {
  if (!smtpReady()) return null;
  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return mailTransporter;
}

function plainTextMessage({ sender, recipient, subject, body }) {
  const fromName = personName(sender);
  const toName = personName(recipient);
  return [
    `${instituteName} Student Email`,
    "",
    `To: ${toName}`,
    `From: ${fromName}`,
    `Subject: ${subject}`,
    "",
    body,
    "",
    "This message was sent from the BMHI Student Portal.",
    externalBaseUrl
  ].join("\n");
}

async function deliverExternalEmail({ sender, recipient, subject, body }) {
  const transporter = getMailTransporter();
  if (!transporter) {
    return { sent: false, reason: "External delivery is not configured yet." };
  }

  try {
    await transporter.sendMail({
      from: emailFrom,
      to: recipient.email,
      replyTo: sender.email,
      subject: `[BMHI] ${subject}`,
      text: plainTextMessage({ sender, recipient, subject, body }),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.55;color:#17212b">
          <p><strong>${escapeHtml(instituteName)} Student Email</strong></p>
          <p><strong>From:</strong> ${escapeHtml(personName(sender))}<br>
          <strong>To:</strong> ${escapeHtml(personName(recipient))}</p>
          <h2 style="font-size:18px">${escapeHtml(subject)}</h2>
          <p>${renderTextWithLinks(body)}</p>
          <hr>
          <p style="color:#607080;font-size:13px">This message was sent from the BMHI Student Portal.<br>
          <a href="${escapeHtml(externalBaseUrl)}">${escapeHtml(externalBaseUrl)}</a></p>
        </div>
      `
    });
    return { sent: true };
  } catch (error) {
    console.error("External email delivery failed", error);
    return { sent: false, reason: error.message };
  }
}

function renderClassLockPage(req, res) {
  const body = `
    <section class="student-registration">
      <div class="financial-head">
        <div>
          <p class="eyebrow">Class Access</p>
          <h1>Class access is locked</h1>
          <p>${escapeHtml(classLockMessage(req.user))}</p>
        </div>
        <div class="financial-actions">
          <a class="button ghost" href="/student">Dashboard</a>
          <a class="button ghost" href="/student/financial">Fees</a>
        </div>
      </div>
      <article class="student-panel lock-panel">
        <h2>What to complete</h2>
        <p>Contact the office so staff can organize your file and clear your LMS access. Typical clearance items include admissions documents, payment plan status, signed handbook, clinical requirements, identification, and registrar approval.</p>
      </article>
    </section>
  `;
  return render(req, res, "Class Access Locked", body, { studentPortal: true, activeStudentNav: "courses" });
}

function randomPassword() {
  return `Bmhi-${crypto.randomBytes(4).toString("hex")}-2026!`;
}

function credentialNumber(enrollmentId) {
  return `BMHI-${new Date().getFullYear()}-${String(enrollmentId).padStart(5, "0")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

function dollarsToCents(value) {
  return Math.round(Math.max(0, Number(String(value || "0").replace(/[^0-9.]/g, "")) || 0) * 100);
}

function courseTotalCost(course = {}) {
  return Number(course.tuition_cents || 0) + Number(course.books_supplies_cents || 0) + Number(course.registration_fee_cents || 0);
}

function tuitionProgramRows(courses = []) {
  const order = [
    "practical-nursing",
    "medical-billing-and-coding",
    "medical-assistant",
    "patient-care-technician",
    "home-health-aide"
  ];
  const bySlug = new Map(courses.map((course) => [course.slug, course]));
  return order.map((slug) => bySlug.get(slug)).filter(Boolean);
}

function renderTuitionFeesSection(courses = [], { compact = false } = {}) {
  const programRows = tuitionProgramRows(courses);
  return `
    <section class="${compact ? "tuition-fees compact" : "tuition-fees"}">
      <div class="tuition-heading">
        <div>
          <p class="eyebrow">Tuition & Fees</p>
          <h2>Program Cost Schedule</h2>
        </div>
        <span class="pill">Subject to change</span>
      </div>
      <div class="table-card tuition-table-card">
        <table>
          <thead>
            <tr><th>Program</th><th>Tuition</th><th>Books/Supplies</th><th>Registration Fee</th><th>Total Cost</th></tr>
          </thead>
          <tbody>
            ${programRows.map((course) => `
              <tr>
                <td><strong>${escapeHtml(course.title)}</strong></td>
                <td>${money(course.tuition_cents)}</td>
                <td>${money(course.books_supplies_cents)}</td>
                <td>${money(course.registration_fee_cents)}</td>
                <td><strong>${money(courseTotalCost(course))}</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="table-card fee-table-card">
        <table>
          <thead><tr><th>Fees</th><th>Cost</th></tr></thead>
          <tbody>
            ${feeSchedule.map((fee) => `
              <tr>
                <td><strong>${escapeHtml(fee.label)}</strong>${fee.note ? ` <em>(${escapeHtml(fee.note)})</em>` : ""}</td>
                <td><strong>${money(fee.amountCents)}</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <ul class="tuition-notes">
        ${tuitionNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderCatalogList(items = []) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderCatalogDefinitionList(items = []) {
  return `
    <div class="catalog-definition-list">
      ${items.map((item) => `
        <p><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></p>
      `).join("")}
    </div>
  `;
}

function parseHiddenSections(course = {}) {
  try {
    const parsed = JSON.parse(course.hidden_sections || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function visibleCourseNavItems(course = {}) {
  const hidden = parseHiddenSections(course);
  return courseNavItems.filter((item) => item === "Home" || !hidden.has(item));
}

function canvasCourseCode(course = {}) {
  if (course.slug === "home-health-aide") return "HHA 75";
  if (course.slug === "home-health-aide-creole") return "HHA 75 Kreyol";
  if (course.slug === "medical-terminology") return "PN 101";
  if (course.slug === "introduction-to-nursing-practical-nursing") return "PN 102";
  const id = course.course_id || course.id || 0;
  if (course.category === "Practical Nursing Course") return `PN-${String(id).padStart(3, "0")}`;
  return `BMHI-${String(id).padStart(3, "0")}`;
}

function toolStatus(course = {}, tool = {}) {
  if (tool.adminOnly) return { label: "Admin tool", className: "neutral" };
  if (!tool.section) return { label: "Enabled", className: "enabled" };
  return parseHiddenSections(course).has(tool.section)
    ? { label: "Hidden from students", className: "hidden" }
    : { label: "Visible to students", className: "enabled" };
}

function renderLmsToolkit(course = {}, { compact = false } = {}) {
  return `
    <div class="${compact ? "lms-toolkit compact" : "lms-toolkit"}">
      ${lmsToolGroups.map((group) => `
        <article class="lms-tool-group">
          <div class="lms-tool-group-head">
            <div>
              <h3>${escapeHtml(group.title)}</h3>
              <p>${escapeHtml(group.description)}</p>
            </div>
          </div>
          <div class="lms-tool-list">
            ${group.tools.map((tool) => {
              const status = toolStatus(course, tool);
              return `
                <div class="lms-tool-card">
                  <div>
                    <strong>${escapeHtml(tool.label)}</strong>
                    <p>${escapeHtml(tool.description)}</p>
                  </div>
                  <span class="tool-status ${escapeHtml(status.className)}">${escapeHtml(status.label)}</span>
                </div>
              `;
            }).join("")}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function courseNavHref(baseHref, item, firstLessonId) {
  if (item === "Home") return baseHref;
  if (item === "Modules") return `${baseHref}?view=modules`;
  if (item === "Syllabus") return `${baseHref}?view=syllabus`;
  if (item === "Grades") return `${baseHref}?view=grades`;
  if (item === "People") return `${baseHref}?view=people`;
  if (item === "Groups") return `${baseHref}?view=people#groups`;
  if (item === "Settings") return `${baseHref}?view=settings`;
  if (item === "Announcements") return `${baseHref}?view=announcements`;
  if (item === "Calendar") return `${baseHref}?view=calendar`;
  if (item === "Inbox") return baseHref.startsWith("/student/") ? "/student/email" : "/admin/messages";
  if (["Assignments", "Quizzes"].includes(item)) return `${baseHref}?view=syllabus#course-assignments`;
  return baseHref;
}

function renderCourseNav(navItems, baseHref, activeItem, firstLessonId) {
  return navItems.map((item) => `
    <a class="${item === activeItem ? "active" : ""}" href="${escapeHtml(courseNavHref(baseHref, item, firstLessonId))}">${escapeHtml(item)}</a>
  `).join("");
}

function renderStudentCanvasRail(active = "courses") {
  const items = [
    { key: "account", label: "Account", href: "/student/profile", icon: "○" },
    { key: "dashboard", label: "Dashboard", href: "/student/dashboard", icon: "⌁" },
    { key: "courses", label: "Courses", href: "/student/courses", icon: "▤" },
    { key: "calendar", label: "Calendar", href: "/student/calendar", icon: "▦" },
    { key: "inbox", label: "Inbox", href: "/student/email", icon: "▧" },
    { key: "history", label: "History", href: "/student/profile#timeline", icon: "◷" },
    { key: "help", label: "Help", href: "/help/browser-cache", icon: "?" }
  ];
  return `
    <aside class="canvas-global-rail student-canvas-rail">
      <img src="/assets/bmhi-seal-blue.jpeg" alt="BMHI">
      <nav aria-label="Canvas global navigation">
        ${items.map((item) => `
          <a class="${item.key === active ? "active" : ""}" href="${escapeHtml(item.href)}">
            <span>${escapeHtml(item.icon)}</span>
            <strong>${escapeHtml(item.label)}</strong>
          </a>
        `).join("")}
      </nav>
    </aside>
  `;
}

function renderStudentCanvasHeader(courseCode, baseHref, breadcrumbs = []) {
  const crumbTrail = breadcrumbs.length ? breadcrumbs : [{ label: courseCode, href: baseHref }];
  return `
    <header class="canvas-populi-bar student-canvas-topbar">
      <a class="canvas-menu-button" href="${escapeHtml(baseHref)}" aria-label="Course menu">☰</a>
      <nav class="canvas-crumbs" aria-label="Course breadcrumbs">
        ${crumbTrail.map((crumb, index) => `
          ${index ? `<span>›</span>` : ""}
          ${crumb.href ? `<a href="${escapeHtml(crumb.href)}">${escapeHtml(crumb.label)}</a>` : `<strong>${escapeHtml(crumb.label)}</strong>`}
        `).join("")}
      </nav>
      <span class="canvas-top-spacer"></span>
      ${breadcrumbs.length ? "" : `<a class="canvas-top-button" href="${escapeHtml(baseHref)}?view=syllabus">Immersive Reader</a>`}
    </header>
  `;
}

function renderStartTiles(tiles = []) {
  return `
    <div class="start-tile-grid">
      ${tiles.map((tile) => `
        <a class="start-tile" href="${escapeHtml(tile.href)}">
          <span class="${escapeHtml(tile.icon)}"></span>
          <strong>${escapeHtml(tile.label)}</strong>
        </a>
      `).join("")}
    </div>
  `;
}

function moduleItemKind(title = "") {
  const lower = String(title).toLowerCase();
  if (lower.includes("quiz") || lower.includes("exam") || lower.includes("test")) return "quiz";
  if (lower.includes("discussion")) return "discussion";
  if (lower.endsWith(".pdf") || lower.endsWith(".ppt") || lower.endsWith(".pptx") || lower.endsWith(".doc") || lower.endsWith(".docx") || lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "file";
  if (lower.includes("syllabus") || lower.includes("acknowledgement") || lower.includes("worksheet") || lower.includes("exercise") || lower.includes("assignment")) return "assignment";
  return "page";
}

function moduleItemIcon(kind) {
  if (kind === "quiz") return "⌁";
  if (kind === "discussion") return "▱";
  if (kind === "file") return "⌕";
  if (kind === "assignment") return "▧";
  return "▤";
}

function moduleItemMeta(lesson) {
  const title = String(lesson.title || "");
  const lower = title.toLowerCase();
  const pieces = [];
  const dateMatch = title.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/i);
  if (dateMatch) pieces.push(dateMatch[0]);
  if (lower.includes("discussion")) pieces.push("10 pts");
  else if (lower.includes("quiz")) pieces.push("10 pts");
  else if (lower.includes("worksheet") || lower.includes("exercise")) pieces.push("15 pts");
  return pieces.join(" | ");
}

function renderCanvasModulesPage({ courseCode, baseHref, courseId, moduleGroups = [], instructor = false }) {
  return `
    <main class="canvas-course-main canvas-modules-main">
      <div class="canvas-modules-toolbar">
        <span></span>
        ${instructor ? `<a class="canvas-top-button" href="${escapeHtml(baseHref)}">View as Student</a>` : `<a class="canvas-top-button" href="${escapeHtml(baseHref)}?view=syllabus">Immersive Reader</a>`}
        <button type="button">Collapse All</button>
        <button type="button">View Progress</button>
        <button type="button"><span class="canvas-published-dot"></span> Publish All</button>
        ${instructor && courseId ? `<a class="canvas-module-add" href="/admin/courses/${courseId}/tools">+ Module</a>` : ""}
        <button type="button" aria-label="More options">⋮</button>
      </div>
      <div class="canvas-module-list">
        ${moduleGroups.map((module) => `
          <section class="canvas-module-block">
            <header class="canvas-module-header">
              <div>
                <span class="module-drag">⁝</span>
                <span class="module-caret">▾</span>
                <strong>${escapeHtml(module.title)}</strong>
              </div>
              <div>
                <span class="canvas-published-dot"></span>
                <span>⌄</span>
                ${instructor ? `<span>＋</span><span>⋮</span>` : ""}
              </div>
            </header>
            <div class="canvas-module-items">
              ${module.lessons.map((lesson) => {
                const kind = moduleItemKind(lesson.title);
                return `
                  <a class="canvas-module-row" href="${escapeHtml(baseHref)}?lesson=${lesson.id}">
                    <span class="module-drag">⁝</span>
                    <span class="module-type ${escapeHtml(kind)}">${escapeHtml(moduleItemIcon(kind))}</span>
                    <span class="module-title">
                      <strong>${escapeHtml(lesson.title)}</strong>
                      ${moduleItemMeta(lesson) ? `<small>${escapeHtml(moduleItemMeta(lesson))}</small>` : ""}
                    </span>
                    <span class="canvas-published-dot"></span>
                    <span class="module-menu">⋮</span>
                  </a>
                `;
              }).join("") || `
                <div class="canvas-module-row empty">
                  <span></span><span></span><span class="module-title"><strong>No items yet</strong></span><span></span><span></span>
                </div>
              `}
            </div>
          </section>
        `).join("") || `
          <section class="canvas-module-block">
            <header class="canvas-module-header"><div><strong>${escapeHtml(courseCode)} Modules</strong></div></header>
            <div class="canvas-module-row empty">
              <span></span><span></span><span class="module-title"><strong>No modules have been added yet.</strong></span><span></span><span></span>
            </div>
          </section>
        `}
      </div>
    </main>
  `;
}

function renderCourseToDo(gradeItems = [], baseHref = "#", { limit = 3, courseTitle = "Course" } = {}) {
  const fallbackItems = [
    { title: "Week 1 Objectives and Learning Activity", points_possible: 0, due_date: "2026-06-22" },
    { title: "Week 1 Discussion: Course Q & A", points_possible: 10, due_date: "2026-06-28" },
    { title: "Week 2 Objectives and Learning Activity", points_possible: 0, due_date: "2026-06-29" },
    { title: "The Nightingale Pledge Acknowledgement", points_possible: 0, due_date: "2026-06-30" },
    { title: "Week 2 Discussion: Professionalism", points_possible: 10, due_date: "2026-07-05" },
    { title: "Week 3 Objectives and Learning Activity", points_possible: 0, due_date: "2026-07-06" }
  ];
  const sourceItems = gradeItems.length >= limit
    ? gradeItems
    : [...gradeItems, ...fallbackItems].slice(0, limit);
  const items = sourceItems.slice(0, limit);
  return `
    <section class="canvas-task-panel">
      <h2>To Do</h2>
      ${items.map((item, index) => `
        <article class="canvas-task-item">
          <span>${escapeHtml(index + 1)}</span>
          <div>
            <a href="${escapeHtml(baseHref)}?view=syllabus#course-assignments">${escapeHtml(item.title)}</a>
            <em>${escapeHtml(courseTitle)}</em>
            <small>${escapeHtml(item.points_possible || 0)} points · ${item.due_date ? date(item.due_date) : "No Due Date"}</small>
          </div>
          <b aria-hidden="true">×</b>
        </article>
      `).join("") || `<p class="empty compact">No course tasks posted yet.</p>`}
    </section>
  `;
}

function renderComingUp(lessons = [], baseHref = "#") {
  return `
    <section class="canvas-task-panel">
      <div class="task-panel-head">
        <h2>Coming Up</h2>
        <a href="${escapeHtml(baseHref)}?view=syllabus">View Calendar</a>
      </div>
      ${lessons.slice(0, 3).map((lesson, index) => `
        <article class="canvas-upcoming-item">
          <span>${escapeHtml(index + 1)}</span>
          <div>
            <a href="${escapeHtml(baseHref)}?lesson=${lesson.id}">${escapeHtml(lesson.title)}</a>
            <small>${escapeHtml(lesson.duration_minutes)} minutes</small>
          </div>
        </article>
      `).join("") || `<p class="empty compact">Nothing coming up yet.</p>`}
    </section>
  `;
}

function formatGradeDue(value) {
  if (!value) return "";
  const parsed = new Date(`${value}T23:59:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(parsed)} by 11:59pm`;
}

function pnDiscussionGradeRows() {
  return [
    ["Week 1 Discussion: Nursing Identity, Purpose, and the Practical Nurse Role", "2026-06-28", 10, "missing"],
    ["Week 2 Discussion: Nursing Then and Now, Reform, Education, and Public Trust", "2026-07-05", 10],
    ["Week 3 Discussion: Caring, Comfort, Safety, Advocacy, and Healing", "2026-07-12", 10],
    ["Week 4 Discussion: Health Care Teamwork, Scope, Delegation, and Communication", "2026-07-19", 10],
    ["Week 5 Discussion: Ethics, Boundaries, Confidentiality, and Patient Rights", "2026-07-26", 10],
    ["Week 6 Discussion: Legal Foundations, Privacy, Documentation, and Accountability", "2026-08-02", 10, "", true],
    ["Week 7 Discussion: Culture, Health Equity, and Respectful Care", "2026-08-09", 10],
    ["Week 8 Discussion: Safety, Quality, Infection Prevention, and the Nurse's Watchful Eye", "2026-08-16", 10],
    ["Week 9 Discussion: Nursing Process and Clinical Judgment", "2026-08-23", 10],
    ["Week 10 Discussion: Patient Teaching, Health Promotion, and Community Impact", "2026-08-30", 10],
    ["Week 11 Discussion: Professionalism, Resilience, Leadership, and Lifelong Learning", "2026-09-06", 10]
  ].map(([title, dueDate, points, status = "", highlighted = false]) => ({
    title,
    due_date: dueDate,
    points_possible: points,
    group: "Assignments",
    status,
    highlighted
  }));
}

function studentGradebookRows(enrollment, gradeItems = [], grades = []) {
  const scoreByItemId = new Map(grades.map((grade) => [grade.grade_item_id, grade.score]));
  const savedRows = gradeItems.map((item) => ({
    ...item,
    group: item.title.toLowerCase().includes("elsevier") ? "Imported Assignments" : "Assignments",
    score: scoreByItemId.has(item.id) ? scoreByItemId.get(item.id) : null
  }));
  if (enrollment.slug !== "introduction-to-nursing-practical-nursing") return savedRows;

  const visibleSavedRows = savedRows.map((item) => {
    if (item.title === "Class Participation and Professionalism") return { ...item, title: "Class Participation and Professionalism Acknowledgement" };
    if (item.title === "Quiz 1: Weeks 1-2") return { ...item, title: "Quiz 1", points_possible: 20 };
    return item;
  });
  const extraRows = [
    { title: "Elsevier Adaptive Quizzing Quiz 1", points_possible: 100, group: "Imported Assignments", score: null },
    { title: "Elsevier Adaptive Quizzing Quiz 2", points_possible: 100, group: "Imported Assignments", score: null },
    { title: "Historical Nursing Leader Project: Legacy, Ethics, and Patient Care", points_possible: 100, group: "Assignments", score: null },
    { title: "Nightingale Pledge Acknowledgement", points_possible: null, group: "Assignments", score: null, status: "info" }
  ];
  const preferredTitles = new Set([
    "Class Participation and Professionalism Acknowledgement",
    "Professional Beginning Reflection",
    "Quiz 1"
  ]);
  const selectedSavedRows = visibleSavedRows.filter((item) => preferredTitles.has(item.title));
  return [...pnDiscussionGradeRows(), ...extraRows, ...selectedSavedRows];
}

function renderStudentGradesPage({ enrollment, courseCode, baseHref, gradeItems = [], grades = [], student }) {
  const rows = studentGradebookRows(enrollment, gradeItems, grades);
  const scoredRows = rows.filter((row) => row.score !== null && row.score !== undefined && row.points_possible);
  const earned = scoredRows.reduce((sum, row) => sum + Number(row.score || 0), 0);
  const possible = scoredRows.reduce((sum, row) => sum + Number(row.points_possible || 0), 0);
  const totalLabel = possible ? `${earned.toFixed(2)} / ${possible.toFixed(2)}` : "N/A (N/A)";
  const studentLabel = personName(student);
  const groupTotals = rows.reduce((groups, row) => {
    const group = row.group || "Assignments";
    const existing = groups.get(group) || { possible: 0, earned: 0 };
    if (row.points_possible) existing.possible += Number(row.points_possible || 0);
    if (row.score !== null && row.score !== undefined) existing.earned += Number(row.score || 0);
    groups.set(group, existing);
    return groups;
  }, new Map());

  return `
    <main class="canvas-grades-main">
      <section class="canvas-grades-content">
        <div class="grades-title-row">
          <h1>Grades for ${escapeHtml(studentLabel)}</h1>
          <button class="canvas-print-button" type="button" onclick="window.print()">Print Grades</button>
        </div>

        <form class="grades-filter-row">
          <label>
            <strong>Arrange By</strong>
            <select name="arrangeBy">
              <option>Due Date</option>
              <option>Assignment Group</option>
              <option>Title</option>
            </select>
          </label>
          <button type="button">Apply</button>
        </form>

        <div class="grades-tabs" role="tablist" aria-label="Grade views">
          <button class="active" type="button">Assignments</button>
          <button type="button">Learning Mastery</button>
        </div>

        <table class="canvas-grades-table">
          <thead>
            <tr><th>Name</th><th>Due</th><th>Submitted</th><th>Status</th><th>Score</th></tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr class="${row.highlighted ? "highlighted" : ""}">
                <td>
                  <a href="${escapeHtml(baseHref)}?view=syllabus#course-assignments">${escapeHtml(row.title)}</a>
                  <small>${escapeHtml(row.group || "Assignments")}</small>
                </td>
                <td>${escapeHtml(formatGradeDue(row.due_date))}</td>
                <td></td>
                <td>
                  ${row.status === "missing" ? `<span class="grade-status missing">missing</span>` : row.status === "info" ? `<span class="grade-status info">!</span>` : ""}
                </td>
                <td>${row.points_possible ? `${row.score === null || row.score === undefined ? "-" : escapeHtml(row.score)} / ${escapeHtml(row.points_possible)}` : "-"}</td>
              </tr>
            `).join("")}
            ${Array.from(groupTotals.entries()).map(([group, total]) => `
              <tr class="grade-summary-row">
                <td>${escapeHtml(group)}</td>
                <td></td>
                <td></td>
                <td>N/A</td>
                <td>${escapeHtml(total.earned.toFixed(2))} / ${escapeHtml(total.possible ? total.possible.toFixed(2) : "0.00")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>

      <aside class="grades-side-panel">
        <strong>Total: ${escapeHtml(totalLabel)}</strong>
        <button type="button">Show All Details</button>
        <p><strong>Course assignments are not weighted.</strong></p>
        <label><input type="checkbox" checked> Calculate based only on graded assignments</label>
        <p>You can view your grades based on What-If scores so that you know how grades will be affected by upcoming or resubmitted assignments. You can test scores for an assignment that already includes a score, or an assignment that has yet to be graded.</p>
      </aside>
    </main>
  `;
}

function instructorGradebookStudents(enrollments = []) {
  const fallback = [
    { first_name: "Guerda", last_name: "Bien" },
    { first_name: "Chauna", last_name: "Brown" },
    { first_name: "Samantha", last_name: "Brunvil" },
    { first_name: "Porledens", last_name: "Cajoux" },
    { first_name: "Cheryl", last_name: "Echols" },
    { first_name: "Ericka", last_name: "Morrison" },
    { first_name: "J Laurie", last_name: "Robert" },
    { first_name: "Rekena", last_name: "Williams" },
    { first_name: "Test", last_name: "Student" }
  ];
  const roster = enrollments.map((row) => ({
    id: row.user_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    enrollment_id: row.id
  }));
  if (roster.length >= 6) return roster;
  const existing = new Set(roster.map((row) => personName(row).toLowerCase()));
  const additions = fallback.filter((row) => !existing.has(personName(row).toLowerCase()));
  return [...roster, ...additions].slice(0, 9);
}

function instructorGradebookItems(course, gradeItems = []) {
  const pnDefaults = [
    { title: "Class Participation and Professionalism", points_possible: 100 },
    { title: "Professional Beginning Reflection", points_possible: 50 },
    { title: "Quiz 1: Weeks 1-2", points_possible: 50, unpublished: true },
    { title: "Therapeutic Communication Practice", points_possible: 50, unpublished: true },
    { title: "Quiz 2: Weeks 3-4", points_possible: 50, unpublished: true },
    { title: "Ethics Case Response", points_possible: 75, unpublished: true },
    { title: "Midterm Exam: Weeks 1-6", points_possible: 150, unpublished: true },
    { title: "Health Equity Reflection", points_possible: 50, unpublished: true }
  ];
  const source = course.slug === "introduction-to-nursing-practical-nursing" ? pnDefaults : gradeItems;
  return source.slice(0, 8).map((item) => ({
    id: item.id,
    title: item.title,
    points_possible: item.points_possible,
    unpublished: Boolean(item.unpublished)
  }));
}

function renderInstructorGradesPage({ course, courseCode, baseHref, gradeItems = [], enrollments = [], grades = [] }) {
  const students = instructorGradebookStudents(enrollments);
  const assignments = instructorGradebookItems(course, gradeItems);
  const scoreByEnrollmentAndItem = new Map(grades.map((grade) => [`${grade.enrollment_id}:${grade.grade_item_id}`, grade.score]));
  return `
    <main class="instructor-gradebook-main">
      <div class="instructor-gradebook-head">
        <a class="gradebook-switch" href="${escapeHtml(baseHref)}?view=grades">Gradebook⌄</a>
        <div class="gradebook-actions">
          <button type="button" title="Calendar">▦</button>
          <button type="button">Import</button>
          <button type="button">Export⌄</button>
          <button type="button" title="Settings">⚙</button>
        </div>
      </div>

      <section class="instructor-gradebook-filters">
        <label>
          <strong>Student Names</strong>
          <span><b>⌕</b><input placeholder="Search Students"><i>⌄</i></span>
        </label>
        <label>
          <strong>Assignment Names</strong>
          <span><b>⌕</b><input placeholder="Search Assignments"><i>⌄</i></span>
        </label>
        <button type="button">Apply Filters</button>
      </section>

      <section class="instructor-gradebook-scroll" aria-label="Instructor gradebook">
        <table class="instructor-gradebook-table">
          <thead>
            <tr>
              <th>Student Name</th>
              ${assignments.map((item) => `
                <th>
                  <span>${escapeHtml(item.title)}</span>
                  <small>Out of ${escapeHtml(item.points_possible || 0)}</small>
                  ${item.unpublished ? `<em>UNPUBLISHED</em>` : ""}
                </th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            ${students.map((student, studentIndex) => `
              <tr>
                <td>${student.id ? `<a href="/admin/students/${student.id}/registrar-checklist">${escapeHtml(personName(student))}</a>` : `<a href="${escapeHtml(baseHref)}?view=grades">${escapeHtml(personName(student))}</a>`}</td>
                ${assignments.map((item, itemIndex) => {
                  const score = scoreByEnrollmentAndItem.get(`${student.enrollment_id}:${item.id}`);
                  const iconCell = itemIndex === 0 && [1, 5].includes(studentIndex) ? "⊞" : "";
                  return `<td>${score === undefined ? iconCell || "-" : escapeHtml(score)}</td>`;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
    </main>
  `;
}

function instructorPeopleRoster(course, enrollments = [], instructor) {
  const fallbackStudents = [
    { first_name: "Guerda", last_name: "Bien", email: "guerdabien80@gmail.com", last_activity: "Jul 3 at 12:34am", total_activity: "02:59:25" },
    { first_name: "Chauna", last_name: "Brown", email: "shaunie8210@gmail.com", last_activity: "Jul 3 at 12:48am", total_activity: "02:00:51" },
    { first_name: "Samantha", last_name: "Brunvil", email: "samanthabrunvil2106@gmail.com", last_activity: "Jul 1 at 6:06pm", total_activity: "01:04:30" },
    { first_name: "Porledens", last_name: "Cajoux", email: "Porledens@gmail.com", last_activity: "Jul 3 at 8:31am", total_activity: "01:46:48" },
    { first_name: "Cheryl", last_name: "Echols", email: "", invite_status: "pending", last_activity: "", total_activity: "" },
    { first_name: "Ericka", last_name: "Morrison", email: "ericka.morrison001@outlook.com", last_activity: "Jul 2 at 10:53am", total_activity: "01:58:32" },
    { first_name: "J Laurie", last_name: "Robert", email: "", invite_status: "pending", last_activity: "", total_activity: "" },
    { first_name: "Rekena", last_name: "Williams", email: "kena_wims@yahoo.com", last_activity: "Jul 2 at 5:04pm", total_activity: "32:25" }
  ];
  const sectionFor = (row = {}) => {
    if (!row.cohort_name) return course.title;
    const dates = row.cohort_start_date || row.cohort_end_date
      ? ` (${date(row.cohort_start_date)} - ${date(row.cohort_end_date)})`
      : "";
    return `${row.cohort_name}${dates} · ${course.title}`;
  };
  const section = course.title;
  const roster = enrollments.map((row, index) => ({
    id: row.user_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    role: "Student",
    section: sectionFor(row),
    status: row.status,
    invite_status: row.status === "pending" ? "pending" : "",
    last_activity: index % 2 === 0 ? "Jul 3 at 12:34am" : "Jul 2 at 5:04pm",
    total_activity: index % 2 === 0 ? "02:59:25" : "01:58:32"
  }));
  const existing = new Set(roster.map((row) => personName(row).toLowerCase()));
  const additions = fallbackStudents
    .filter((row) => !existing.has(personName(row).toLowerCase()))
    .map((row) => ({
      ...row,
      role: "Student",
      section,
      status: "invited"
    }));
  const teacher = instructor ? {
    id: instructor.id,
    first_name: instructor.first_name,
    last_name: instructor.last_name,
    email: instructor.email,
    role: "Teacher",
    section,
    status: "active",
    last_activity: "Jul 3 at 8:32am",
    total_activity: "11:09:21",
    avatar: true
  } : null;
  return [...roster, ...additions, ...(teacher ? [teacher] : [])];
}

function renderInstructorPeoplePage({ course, courseCode, baseHref, enrollments = [], instructor }) {
  const people = instructorPeopleRoster(course, enrollments, instructor);
  const pendingCount = people.filter((person) => person.invite_status === "pending").length;
  const sections = people.reduce((groups, person) => {
    const key = person.section || course.title;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(person);
    return groups;
  }, new Map());
  return `
    <main class="canvas-people-main">
      <div class="people-toolbar-top">
        <button class="people-kebab" type="button" aria-label="People options">⋮</button>
      </div>

      <div class="people-tabs" role="tablist" aria-label="People views">
        <a class="active" href="${escapeHtml(baseHref)}?view=people">Everyone</a>
        <a href="${escapeHtml(baseHref)}?view=people#groups">Groups</a>
      </div>

      <div class="people-actions-row">
        <form class="people-filter-form">
          <label>
            <b>⌕</b>
            <input name="q" placeholder="Search people">
          </label>
          <select name="role" aria-label="Role filter">
            <option>All Roles</option>
            <option>Student</option>
            <option>Teacher</option>
          </select>
        </form>
        <div class="people-action-buttons">
          <a class="people-green-button" href="${escapeHtml(baseHref)}?view=people#groups">+ Group Set</a>
          <a class="people-green-button" href="/admin/students">+ People</a>
        </div>
      </div>

      ${pendingCount ? `<p class="people-invite-note">${escapeHtml(pendingCount)} invitations haven't been accepted. <a href="/admin/students">Resend</a></p>` : ""}

      <section class="people-section-summary" aria-label="Course sections" id="sections">
        ${Array.from(sections.entries()).map(([sectionName, sectionPeople]) => {
          const studentCount = sectionPeople.filter((person) => person.role === "Student").length;
          const teacherCount = sectionPeople.filter((person) => person.role === "Teacher").length;
          return `
            <article>
              <strong>${escapeHtml(sectionName)}</strong>
              <span>${escapeHtml(studentCount)} students · ${escapeHtml(teacherCount)} teacher${teacherCount === 1 ? "" : "s"}</span>
            </article>
          `;
        }).join("")}
      </section>

      <section class="people-roster-card" aria-label="${escapeHtml(courseCode)} course people">
        <table class="people-roster-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Login ID</th>
              <th>SIS ID</th>
              <th>Section</th>
              <th>Role</th>
              <th>Last Activity</th>
              <th>Total Activity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${people.map((person) => `
              <tr>
                <td><span class="people-avatar ${person.avatar ? "photo" : ""}">${person.avatar ? escapeHtml(initialsFor(person)) : ""}</span></td>
                <td>
                  <a href="${person.id && person.role === "Student" ? `/admin/students/${person.id}/registrar-checklist` : escapeHtml(baseHref)}">${escapeHtml(personName(person))}</a>
                  ${person.invite_status === "pending" ? `<em>pending</em>` : ""}
                </td>
                <td>${escapeHtml(person.email || "")}</td>
                <td>${person.id ? escapeHtml(`BMHI-${String(person.id).padStart(5, "0")}`) : ""}</td>
                <td>${escapeHtml(person.section || course.title)}</td>
                <td>${escapeHtml(person.role)}</td>
                <td>${escapeHtml(person.last_activity || "")}</td>
                <td>${escapeHtml(person.total_activity || "")}</td>
                <td><button type="button" aria-label="People row options">⋮</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>

      <section class="people-groups-panel" id="groups">
        <h2>Sections and groups</h2>
        ${Array.from(sections.entries()).map(([sectionName, sectionPeople]) => `
          <article>
            <strong>${escapeHtml(sectionName)}</strong>
            <span>${escapeHtml(sectionPeople.filter((person) => person.role === "Student").length)} enrolled students</span>
            <a href="${escapeHtml(baseHref)}?view=people#sections">View roster</a>
          </article>
        `).join("")}
      </section>
    </main>
  `;
}

function renderInstructorSettingsPage({ course, courseCode, baseHref, enrollments = [], instructor }) {
  const hiddenSections = parseHiddenSections(course);
  const studentCount = enrollments.length;
  const rightActions = [
    ["Share to Commons", `${baseHref}?view=settings#apps`],
    ["Course Statistics", `${baseHref}?view=grades`],
    ["Course Calendar", `${baseHref}?view=syllabus`],
    ["Conclude this Course", `${baseHref}?view=settings#feature-options`],
    ["Delete this Course", `/admin/courses/${course.id}`],
    ["Copy this Course", `/admin/courses/${course.id}`],
    ["Import Course Content", `/admin/courses/${course.id}/tools#course-import-tool`],
    ["Export Course Content", `/admin/courses/${course.id}/tools`],
    ["Reset Course Content", `${baseHref}?view=settings#navigation`],
    ["Validate Links in Content", `/admin/courses/${course.id}/tools`]
  ];
  return `
    <main class="canvas-settings-main">
      <section class="course-settings-content">
        <nav class="settings-tabs" aria-label="Course settings">
          <a class="active" href="${escapeHtml(baseHref)}?view=settings">Course Details</a>
          <a href="${escapeHtml(baseHref)}?view=settings#sections">Sections</a>
          <a href="${escapeHtml(baseHref)}?view=settings#navigation">Navigation</a>
          <a href="/admin/courses/${course.id}/tools#course-import-tool">Apps</a>
          <a href="${escapeHtml(baseHref)}?view=settings#feature-options">Feature Options</a>
          <a href="/admin/courses/${course.id}/tools">Integrations</a>
        </nav>

        <form class="settings-details-form" method="post" action="/admin/courses/${course.id}/details">
          <input type="hidden" name="redirectTo" value="${escapeHtml(baseHref)}?view=settings">
          <div class="settings-title-row">
            <h1>Course Details</h1>
            <span class="published-status">Course is ${course.published ? "Published" : "Unpublished"} ●</span>
          </div>

          <div class="settings-field image-field">
            <label>Image:</label>
            <div class="settings-course-image">
              <img src="/assets/bmhi-seal-blue.jpeg" alt="Course image">
              <button type="button" aria-label="Edit course image">⋮</button>
            </div>
          </div>

          <div class="settings-field">
            <label for="settings-title">Name:</label>
            <input id="settings-title" name="title" value="${escapeHtml(course.title)}" required>
          </div>

          <div class="settings-field">
            <label for="settings-code">Course Code:</label>
            <input id="settings-code" value="${escapeHtml(courseCode)}" readonly>
          </div>

          <div class="settings-field checkbox-field">
            <label>Blueprint Course:</label>
            <span><input type="checkbox" disabled> Enable course as a Blueprint Course</span>
          </div>

          <div class="settings-field checkbox-field">
            <label>Course Template:</label>
            <span><input type="checkbox" disabled> Enable course as a Course Template</span>
          </div>

          <div class="settings-field">
            <label for="settings-time-zone">Time Zone:</label>
            <select id="settings-time-zone" name="timeZone">
              <option>Eastern Time (US & Canada) (-05:00/-04:00)</option>
            </select>
          </div>

          <div class="settings-field">
            <label for="settings-sis-id">SIS ID:</label>
            <input id="settings-sis-id" value="${escapeHtml(`BMHI-${String(course.id).padStart(5, "0")}`)}" readonly>
          </div>

          <div class="settings-field">
            <label for="settings-subaccount">Subaccount:</label>
            <select id="settings-subaccount" name="subaccount">
              <option>Broward-Miami Health Institute</option>
            </select>
          </div>

          <div class="settings-field">
            <label for="settings-term">Term:</label>
            <select id="settings-term" name="term">
              <option>Default Term</option>
              <option>Practical Nursing Term</option>
              <option>American Heart Association Term</option>
            </select>
          </div>

          <div class="settings-field">
            <label for="settings-participation">Participation:</label>
            <select id="settings-participation" name="participation">
              <option>Course</option>
              <option>Term</option>
              <option>Section</option>
            </select>
            <p>Course participation is limited to <strong>course</strong> start and end dates. Any section dates created in the course may override course dates.</p>
          </div>

          <div class="settings-field date-field">
            <label for="settings-start">Start</label>
            <input id="settings-start" name="startDate" type="date">
          </div>

          <div class="settings-field date-field">
            <label for="settings-end">End</label>
            <input id="settings-end" name="endDate" type="date">
          </div>

          <div class="settings-field">
            <label for="settings-hours">Clock Hours:</label>
            <input id="settings-hours" name="hours" type="number" min="0" value="${escapeHtml(course.hours)}">
          </div>

          <div class="settings-field">
            <label for="settings-credential">Credential:</label>
            <input id="settings-credential" name="credentialType" value="${escapeHtml(course.credential_type)}">
          </div>

          <div class="settings-field">
            <label for="settings-delivery">Delivery Mode:</label>
            <input id="settings-delivery" name="deliveryMode" value="${escapeHtml(course.delivery_mode)}">
          </div>

          <div class="settings-field">
            <label for="settings-category">Category:</label>
            <input id="settings-category" name="category" value="${escapeHtml(course.category)}">
          </div>

          <div class="settings-field">
            <label for="settings-tuition">Tuition:</label>
            <input id="settings-tuition" name="tuition" value="${escapeHtml((Number(course.tuition_cents || 0) / 100).toFixed(2))}" inputmode="decimal">
          </div>

          <div class="settings-field">
            <label for="settings-books">Books/Supplies:</label>
            <input id="settings-books" name="booksSupplies" value="${escapeHtml((Number(course.books_supplies_cents || 0) / 100).toFixed(2))}" inputmode="decimal">
          </div>

          <div class="settings-field">
            <label for="settings-registration">Registration Fee:</label>
            <input id="settings-registration" name="registrationFee" value="${escapeHtml((Number(course.registration_fee_cents || 0) / 100).toFixed(2))}" inputmode="decimal">
          </div>

          <div class="settings-field textarea-field">
            <label for="settings-description">Description:</label>
            <textarea id="settings-description" name="description" required>${escapeHtml(course.description)}</textarea>
          </div>

          <div class="settings-submit-bar">
            <button type="submit">Update Course Details</button>
          </div>
        </form>

        <section class="settings-section-panel" id="sections">
          <h2>Sections</h2>
          <div class="settings-section-card">
            <strong>${escapeHtml(course.title)}</strong>
            <span>${escapeHtml(studentCount)} enrolled students · ${instructor ? "1 teacher" : "0 teachers"}</span>
          </div>
        </section>

        <section class="settings-section-panel" id="navigation">
          <h2>Navigation</h2>
          <p>Choose which course navigation sections students can see. Home is always visible.</p>
          <form method="post" action="/admin/courses/${course.id}/sections">
            <input type="hidden" name="redirectTo" value="${escapeHtml(baseHref)}?view=settings#navigation">
            <div class="settings-navigation-grid">
              <label class="section-toggle locked">
                <input type="checkbox" checked disabled>
                <span>Home</span>
                <small>Always visible</small>
              </label>
              ${hideableCourseSections.map((section) => `
                <label class="section-toggle">
                  <input type="checkbox" name="visibleSections" value="${escapeHtml(section)}" ${hiddenSections.has(section) ? "" : "checked"}>
                  <span>${escapeHtml(section)}</span>
                  <small>${hiddenSections.has(section) ? "Hidden from students" : "Visible to students"}</small>
                </label>
              `).join("")}
            </div>
            <button type="submit">Save Navigation</button>
          </form>
        </section>

        <section class="settings-section-panel" id="feature-options">
          <h2>Feature Options</h2>
          <div class="feature-option-list">
            <label><input type="checkbox" checked> New course analytics</label>
            <label><input type="checkbox" checked> Student view preview</label>
            <label><input type="checkbox"> Require module completion order</label>
          </div>
        </section>
      </section>

      <aside class="settings-side-panel">
        ${rightActions.map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join("")}
        <section>
          <h2>Current Users</h2>
          <p><strong>Students:</strong><span>${escapeHtml(studentCount)}</span></p>
          <p><strong>Teachers:</strong><span>${instructor ? "1" : "None"}</span></p>
          <p><strong>TAs:</strong><span>None</span></p>
          <p><strong>Designers:</strong><span>None</span></p>
          <p><strong>Observers:</strong><span>None</span></p>
        </section>
      </aside>
    </main>
  `;
}

function renderInstructorCourseActions(courseId) {
  return `
    <div class="canvas-action-stack">
      <a href="/admin/courses/${courseId}/student-view">View as Student</a>
      <a href="/admin/courses/${courseId}/tools#course-import-tool">Import Existing Content</a>
      <a href="/admin/courses/${courseId}/tools#course-import-tool">Import from Commons</a>
      <a href="/admin/courses/${courseId}/tools">Choose Home Page</a>
      <a href="/admin/courses/${courseId}/tools">View Course Stream</a>
      <a href="/admin/courses/${courseId}/tools">New Announcement</a>
      <a href="/admin/courses/${courseId}/tools">Course Analytics</a>
      <a href="/admin/courses/${courseId}/tools">View Course Notifications</a>
    </div>
  `;
}

function gradeItemType(title = "") {
  const lower = String(title).toLowerCase();
  if (lower.includes("quiz")) return "Quiz";
  if (lower.includes("exam") || lower.includes("final assessment") || lower.includes("test")) return "Exam";
  if (lower.includes("skill") || lower.includes("competency") || lower.includes("lab")) return "Skills competency";
  if (lower.includes("reflection")) return "Written reflection";
  if (lower.includes("project")) return "Project / presentation";
  if (lower.includes("presentation")) return "Presentation";
  if (lower.includes("plan")) return "Written plan";
  if (lower.includes("application")) return "Application assignment";
  if (lower.includes("professional") || lower.includes("handbook") || lower.includes("acknowledgement")) return "Professionalism / acknowledgement";
  return "Course assignment";
}

function gradeTallyRows(gradeItems = []) {
  const rows = new Map();
  gradeItems.forEach((item) => {
    const type = gradeItemType(item.title);
    rows.set(type, (rows.get(type) || 0) + Number(item.points_possible || 0));
  });
  return Array.from(rows.entries()).map(([type, points]) => ({ type, points }));
}

function renderMiniCalendar({ year = 2026, monthIndex = 6 } = {}) {
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(year, monthIndex, 1));
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const previousMonthDays = new Date(year, monthIndex, 0).getDate();
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - firstDay + 1;
    if (dayNumber < 1) {
      cells.push({ label: previousMonthDays + dayNumber, muted: true });
    } else if (dayNumber > daysInMonth) {
      cells.push({ label: dayNumber - daysInMonth, muted: true });
    } else {
      cells.push({ label: dayNumber, today: dayNumber === 3, shaded: [6, 13, 20, 27].includes(dayNumber) });
    }
  }
  return `
    <section class="syllabus-calendar" aria-label="${escapeHtml(monthName)} calendar">
      <div class="syllabus-calendar-head">
        <span>&lt;</span>
        <strong>${escapeHtml(monthName)}</strong>
        <span>&gt;</span>
      </div>
      <div class="syllabus-calendar-grid">
        ${cells.map((cell) => `<span class="${cell.muted ? "muted" : ""} ${cell.today ? "today" : ""} ${cell.shaded ? "shaded" : ""}">${escapeHtml(cell.label)}</span>`).join("")}
      </div>
    </section>
  `;
}

function formatAnnouncementDate(value) {
  if (!value) return "";
  const normalized = String(value).includes("T") ? String(value) : String(value).replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

function calendarDateKey(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return raw.slice(0, 10);
}

function calendarTimeLabel(value) {
  if (!value) return "";
  const normalized = String(value).includes("T") ? String(value) : String(value).replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(parsed);
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  return String(value).replace(" ", "T").slice(0, 16);
}

function courseAnnouncements(courseId, limit = 40) {
  return db.prepare(`
    SELECT a.*, c.title AS course_title, c.slug AS course_slug, u.first_name, u.last_name, u.email
    FROM announcements a
    JOIN courses c ON c.id = a.course_id
    LEFT JOIN users u ON u.id = a.author_id
    WHERE a.course_id = ?
    ORDER BY a.posted_at DESC, a.id DESC
    LIMIT ?
  `).all(courseId, limit);
}

function courseCalendarEvents(courseId, limit = 80) {
  const manualEvents = db.prepare(`
    SELECT ce.*, c.title AS course_title, c.slug AS course_slug
    FROM calendar_events ce
    LEFT JOIN courses c ON c.id = ce.course_id
    WHERE ce.course_id = ?
    ORDER BY ce.start_at, ce.id
    LIMIT ?
  `).all(courseId, limit);
  const assignmentEvents = db.prepare(`
    SELECT
      gi.id + 100000 AS id,
      gi.course_id,
      gi.title,
      'Assignment due date' AS description,
      CASE
        WHEN lower(gi.title) LIKE '%exam%' THEN 'exam'
        WHEN lower(gi.title) LIKE '%quiz%' THEN 'assignment'
        ELSE 'assignment'
      END AS event_type,
      gi.due_date || ' 23:59:00' AS start_at,
      NULL AS end_at,
      c.title AS course_title,
      c.slug AS course_slug
    FROM grade_items gi
    JOIN courses c ON c.id = gi.course_id
    WHERE gi.course_id = ? AND gi.due_date IS NOT NULL
    ORDER BY gi.due_date, gi.id
    LIMIT ?
  `).all(courseId, limit);
  return [...manualEvents, ...assignmentEvents]
    .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)) || Number(a.id) - Number(b.id))
    .slice(0, limit);
}

function dashboardDataForStudent(studentId) {
  const enrollments = db.prepare(`
    SELECT e.*, c.title, c.slug, c.category, c.description, c.hours, c.credential_type
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ?
    ORDER BY e.created_at DESC
  `).all(studentId);
  const courseIds = enrollments.map((row) => row.course_id);
  const placeholders = courseIds.map(() => "?").join(",");
  const announcements = courseIds.length ? db.prepare(`
    SELECT a.*, c.title AS course_title, c.slug AS course_slug, u.first_name, u.last_name, u.email
    FROM announcements a
    JOIN courses c ON c.id = a.course_id
    LEFT JOIN users u ON u.id = a.author_id
    WHERE a.course_id IN (${placeholders})
    ORDER BY a.posted_at DESC, a.id DESC
    LIMIT 20
  `).all(...courseIds) : [];
  const gradeItems = courseIds.length ? db.prepare(`
    SELECT gi.*, c.title AS course_title, c.slug AS course_slug, e.id AS enrollment_id
    FROM grade_items gi
    JOIN courses c ON c.id = gi.course_id
    JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
    WHERE gi.course_id IN (${placeholders})
    ORDER BY gi.due_date IS NULL, gi.due_date, gi.id
    LIMIT 20
  `).all(studentId, ...courseIds) : [];
  const messages = db.prepare(`
    SELECT m.*, s.first_name AS sender_first_name, s.last_name AS sender_last_name
    FROM messages m
    JOIN users s ON s.id = m.sender_id
    WHERE m.recipient_id = ?
    ORDER BY m.created_at DESC
    LIMIT 8
  `).all(studentId);
  const events = courseIds.length ? db.prepare(`
    SELECT ce.*, c.title AS course_title, c.slug AS course_slug
    FROM calendar_events ce
    LEFT JOIN courses c ON c.id = ce.course_id
    WHERE ce.course_id IN (${placeholders})
    ORDER BY ce.start_at
    LIMIT 20
  `).all(...courseIds) : [];
  return { enrollments, announcements, gradeItems, messages, events };
}

function renderCanvasDashboardPage({ user, data }) {
  const announcementRows = data.announcements.slice(0, 16);
  const conversationCount = data.messages.length;
  const assignmentCount = data.gradeItems.length;
  const discussionCount = data.gradeItems.filter((item) => String(item.title || "").toLowerCase().includes("discussion")).length;
  const toDoRows = data.gradeItems.slice(0, 5);
  const upcomingRows = [
    ...data.events.map((event) => ({ ...event, kind: "event" })),
    ...data.gradeItems.filter((item) => item.due_date).map((item) => ({
      title: item.title,
      course_title: item.course_title,
      start_at: `${item.due_date} 23:59:00`,
      kind: "assignment"
    }))
  ].sort((a, b) => String(a.start_at).localeCompare(String(b.start_at))).slice(0, 6);
  return `
    <main class="canvas-global-dashboard-main">
      <div class="dashboard-title-row">
        <h1>Dashboard</h1>
        <a class="canvas-top-button" href="/student">SIS Home</a>
      </div>
      <section class="recent-activity">
        <h2>Recent Activity</h2>
        <article class="activity-group expanded">
          <header>
            <span class="activity-icon">☰</span>
            <strong>${escapeHtml(announcementRows.length)} Announcements</strong>
            <small>${escapeHtml([...new Set(announcementRows.map((row) => canvasCourseCode(row)))].slice(0, 3).join(" and ") || "Your courses")}</small>
            <a href="/student/dashboard#announcements">SHOW LESS</a>
          </header>
          <div id="announcements">
            ${announcementRows.map((row) => `
              <a class="activity-row" href="/student/enrollments/${data.enrollments.find((enrollment) => enrollment.course_id === row.course_id)?.id || ""}?view=announcements">
                <strong>${escapeHtml(row.title)}</strong>
                <span>${escapeHtml(formatAnnouncementDate(row.posted_at))}</span>
                <b>×</b>
              </a>
            `).join("") || `<p class="empty compact">No announcements have been posted yet.</p>`}
          </div>
        </article>
        <article class="activity-group compact">
          <header>
            <span class="activity-icon">✉</span>
            <strong>${escapeHtml(conversationCount)} Conversation Messages</strong>
            <small>${escapeHtml(data.messages.map((row) => `${row.sender_first_name || ""} ${row.sender_last_name || ""}`.trim()).filter(Boolean).slice(0, 2).join(" and ") || "No unread messages")}</small>
            <a href="/student/email">SHOW MORE</a>
          </header>
        </article>
        <article class="activity-group compact">
          <header>
            <span class="activity-icon">▧</span>
            <strong>${escapeHtml(assignmentCount)} Assignment Notifications</strong>
            <small>${escapeHtml([...new Set(data.gradeItems.map((row) => canvasCourseCode(row)))].slice(0, 3).join(", ") || "Assignments")}</small>
            <a href="/student/courses">SHOW MORE</a>
          </header>
        </article>
        <article class="activity-group compact">
          <header>
            <span class="activity-icon">▱</span>
            <strong>${escapeHtml(discussionCount)} Discussions</strong>
            <small>Course discussions and Q&A</small>
            <a href="/student/courses">SHOW MORE</a>
          </header>
        </article>
      </section>
    </main>
    <aside class="canvas-rightbar global-dashboard-rightbar">
      <section class="canvas-task-panel">
        <h2>To Do</h2>
        ${toDoRows.map((item, index) => `
          <article class="canvas-task-item">
            <span>${escapeHtml(index + 1)}</span>
            <div>
              <a href="/student/enrollments/${escapeHtml(item.enrollment_id)}?view=grades">Grade ${escapeHtml(item.title)}</a>
              <em>${escapeHtml(canvasCourseCode(item))}</em>
              <small>${escapeHtml(item.points_possible || 0)} points · ${item.due_date ? date(item.due_date) : "No Due Date"}</small>
            </div>
            <b aria-hidden="true">×</b>
          </article>
        `).join("") || `<p class="empty compact">No to-do items right now.</p>`}
      </section>
      <section class="canvas-task-panel">
        <div class="task-panel-head">
          <h2>Coming Up</h2>
          <a href="/student/calendar">View Calendar</a>
        </div>
        ${upcomingRows.map((row) => `
          <article class="canvas-upcoming-item">
            <span>▦</span>
            <div>
              <a href="/student/calendar">${escapeHtml(row.title)}</a>
              <small>${escapeHtml(row.course_title || "Course")} · ${escapeHtml(formatAnnouncementDate(row.start_at))}</small>
            </div>
          </article>
        `).join("") || `<p class="empty compact">Nothing coming up yet.</p>`}
      </section>
    </aside>
  `;
}

function renderCourseAnnouncementsPage({ course, courseCode, baseHref, announcements = [], instructor = false }) {
  return `
    <main class="canvas-course-main announcements-main">
      <div class="announcement-toolbar">
        <select aria-label="Announcement filter"><option>All</option></select>
        <input type="search" placeholder="Search..." aria-label="Search announcements">
        ${instructor ? `<a class="people-green-button" href="#add-announcement">+ Add Announcement</a>` : ""}
        <button type="button">Mark All as Read</button>
      </div>
      ${instructor ? `
        <form class="announcement-form" id="add-announcement" method="post" action="/admin/courses/${course.id}/announcements">
          <h2>Add Announcement</h2>
          <input name="title" required maxlength="160" placeholder="Announcement title">
          <textarea name="body" required rows="4" placeholder="Write the announcement for all sections."></textarea>
          <button type="submit">Post Announcement</button>
        </form>
      ` : ""}
      <section class="announcement-list">
        ${announcements.map((announcement) => `
          <article class="announcement-row">
            <input type="checkbox" aria-label="Select announcement">
            <span class="announcement-avatar">${escapeHtml(initialsFor(announcement))}</span>
            <div>
              <h2>${escapeHtml(announcement.title)}</h2>
              <small>All Sections</small>
              <p>${escapeHtml(announcement.body)}</p>
              <a href="${escapeHtml(baseHref)}?view=announcements">Reply</a>
            </div>
            <aside>
              <strong>Posted on:</strong>
              <span>${escapeHtml(formatAnnouncementDate(announcement.posted_at))}</span>
              <b>⋮</b>
            </aside>
          </article>
        `).join("") || `<p class="empty">No announcements have been posted for ${escapeHtml(courseCode)} yet.</p>`}
      </section>
    </main>
  `;
}

function renderMonthCalendarPage({ events = [], courses = [], currentCourseId = "", instructor = false, postAction = "" }) {
  const year = 2026;
  const monthIndex = 6;
  const monthName = "July 2026";
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const previousMonthDays = new Date(year, monthIndex, 0).getDate();
  const eventsByDate = new Map();
  events.forEach((event) => {
    const key = calendarDateKey(event.start_at);
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key).push(event);
  });
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - firstDay + 1;
    const muted = dayNumber < 1 || dayNumber > daysInMonth;
    const label = dayNumber < 1 ? previousMonthDays + dayNumber : dayNumber > daysInMonth ? dayNumber - daysInMonth : dayNumber;
    const key = muted ? "" : `${year}-07-${String(label).padStart(2, "0")}`;
    cells.push({ label, key, muted, events: key ? eventsByDate.get(key) || [] : [] });
  }
  return `
    <main class="canvas-course-main calendar-main">
      <div class="calendar-toolbar">
        <button type="button">Today</button>
        <button type="button">←</button>
        <button type="button">→</button>
        <h1>${escapeHtml(monthName)}</h1>
        <span></span>
        <button type="button">Week</button>
        <button type="button" class="active">Month</button>
        <button type="button">Agenda</button>
        ${instructor ? `<a class="calendar-add-button" href="#add-calendar-event">+</a>` : ""}
      </div>
      ${instructor ? `
        <form class="calendar-event-form" id="add-calendar-event" method="post" action="${escapeHtml(postAction)}">
          <h2>Add Calendar Event</h2>
          <input name="title" required maxlength="160" placeholder="Event title">
          <select name="courseId">
            ${courses.map((course) => `<option value="${course.id}" ${Number(currentCourseId) === Number(course.id) ? "selected" : ""}>${escapeHtml(canvasCourseCode(course))} - ${escapeHtml(course.title)}</option>`).join("")}
          </select>
          <input name="startAt" type="datetime-local" required value="${escapeHtml(toDateTimeLocalValue("2026-07-08 18:00:00"))}">
          <textarea name="description" rows="3" placeholder="Event details"></textarea>
          <button type="submit">Add Event</button>
        </form>
      ` : ""}
      <section class="calendar-month-grid" aria-label="${escapeHtml(monthName)} calendar">
        ${["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => `<strong>${escapeHtml(day)}</strong>`).join("")}
        ${cells.map((cell) => `
          <article class="calendar-day ${cell.muted ? "muted" : ""}">
            <b>${escapeHtml(cell.label)}</b>
            ${cell.events.slice(0, 4).map((event) => `
              <a class="calendar-event ${escapeHtml(event.event_type || "event")}" href="#">
                ${calendarTimeLabel(event.start_at) ? `<span>${escapeHtml(calendarTimeLabel(event.start_at))}</span>` : ""}
                ${escapeHtml(event.title)}
              </a>
            `).join("")}
          </article>
        `).join("")}
      </section>
    </main>
    <aside class="canvas-rightbar calendar-sidebar">
      ${renderMiniCalendar({ year, monthIndex })}
      <section class="calendar-list">
        <h2>Calendars</h2>
        ${courses.slice(0, 10).map((course, index) => `
          <label>
            <input type="checkbox" ${!currentCourseId || Number(currentCourseId) === Number(course.id) || index < 3 ? "checked" : ""}>
            <span>${escapeHtml(canvasCourseCode(course))} ${escapeHtml(course.title)}</span>
            <b>⋮</b>
          </label>
        `).join("") || `<p class="empty compact">No calendars available.</p>`}
      </section>
      <a class="calendar-feed" href="#">▦ Calendar Feed</a>
    </aside>
  `;
}

function renderCourseSyllabus({ courseTitle, courseDescription, courseCode, courseHours, courseCategory, gradeItems = [], lessons = [], baseHref }) {
  const tallyRows = gradeTallyRows(gradeItems);
  const totalPoints = gradeItems.reduce((sum, item) => sum + Number(item.points_possible || 0), 0);
  const assignmentRows = gradeItems.length ? gradeItems : [
    { title: "Module Quiz", points_possible: 100, due_date: null },
    { title: "Skills Competency", points_possible: 100, due_date: null },
    { title: "Final Assessment", points_possible: 100, due_date: null }
  ];
  const upcomingRows = lessons.slice(0, 6);
  return `
    <main class="canvas-course-main canvas-syllabus-main">
      <div class="canvas-mini-head">
        <span></span>
        <strong>${escapeHtml(courseCode)} &gt; Syllabus</strong>
        <button class="immersive-reader" type="button">Immersive Reader</button>
      </div>
      <div class="syllabus-layout">
        <article class="syllabus-content">
          <div class="syllabus-title-row">
            <h1>Course Syllabus</h1>
            <a class="button ghost small" href="${escapeHtml(baseHref)}">Jump to Today</a>
          </div>

          <section class="syllabus-card" id="course-assignments">
            <h2>Course Assignments and Grade Tally</h2>
            <p>This syllabus section summarizes the assignments currently built in the BMHI LMS. Students should use the weekly Modules and course Calendar for detailed directions, opening dates, and due dates.</p>
            <p><strong>Total course points currently listed:</strong> ${escapeHtml(totalPoints || 300)} points</p>

            <h3>Grade Tally by Assignment Type</h3>
            <table class="syllabus-table">
              <thead><tr><th>Assignment Type</th><th>Points</th></tr></thead>
              <tbody>
                ${(tallyRows.length ? tallyRows : gradeTallyRows(assignmentRows)).map((row) => `
                  <tr><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.points)}</td></tr>
                `).join("")}
              </tbody>
            </table>

            <h3>Assignment Summary</h3>
            <table class="syllabus-table">
              <thead><tr><th>Assignment</th><th>Due Date</th><th>Points</th></tr></thead>
              <tbody>
                ${assignmentRows.map((item) => `
                  <tr>
                    <td>${escapeHtml(item.title)}</td>
                    <td>${item.due_date ? date(item.due_date) : "Posted in course modules"}</td>
                    <td>${escapeHtml(item.points_possible || 0)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </section>

          <section class="syllabus-card">
            <h2>Course Overview</h2>
            <p>${escapeHtml(courseDescription)}</p>
            <div class="syllabus-details">
              <p><strong>Course code</strong><span>${escapeHtml(courseCode)}</span></p>
              <p><strong>Clock hours</strong><span>${escapeHtml(courseHours)}</span></p>
              <p><strong>Program area</strong><span>${escapeHtml(courseCategory)}</span></p>
            </div>
          </section>

          <section class="syllabus-card">
            <h2>Course Summary</h2>
            <table class="syllabus-table">
              <thead><tr><th>Date</th><th>Details</th></tr></thead>
              <tbody>
                ${upcomingRows.map((lesson) => `
                  <tr>
                    <td>${escapeHtml(lesson.duration_minutes)} minutes</td>
                    <td><a href="${escapeHtml(baseHref)}?lesson=${lesson.id}">${escapeHtml(lesson.title)}</a></td>
                  </tr>
                `).join("") || `<tr><td colspan="2" class="empty">Course summary will appear as modules are added.</td></tr>`}
              </tbody>
            </table>
          </section>
        </article>

        <aside class="syllabus-side">
          ${renderMiniCalendar()}
          <div class="syllabus-side-note">
            <strong>Course assignments are not weighted.</strong>
            <p>Points are calculated from the assignment items currently listed for this course.</p>
          </div>
        </aside>
      </div>
    </main>
  `;
}

function normalizeExternalUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.replace(/^\/+/, "");
      if (videoId) return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function renderTextWithLinks(value = "") {
  const text = String(value || "");
  const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+|\/course-materials\/[^\s<]+)/gi;
  let cursor = 0;
  let output = "";
  for (const match of text.matchAll(urlPattern)) {
    output += escapeHtml(text.slice(cursor, match.index));
    const href = match[0].startsWith("/") ? match[0] : normalizeExternalUrl(match[0]);
    output += href
      ? `<a href="${escapeHtml(href)}">${escapeHtml(match[0])}</a>`
      : escapeHtml(match[0]);
    cursor = match.index + match[0].length;
  }
  output += escapeHtml(text.slice(cursor));
  return output.replaceAll("\n", "<br>");
}

function personName(row = {}) {
  return `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email || "User";
}

function formatMessageDate(value) {
  if (!value) return "";
  const normalized = String(value).includes("T") ? String(value) : String(value).replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

function messageDeliveryLabel(message = {}) {
  if (message.external_delivery_status === "sent") return "Email sent";
  if (message.external_delivery_status === "failed") return "Email failed";
  return "Portal only";
}

function messageCourseLabel(message = {}) {
  if (!message.course_title) return "General";
  return message.course_code ? `${message.course_code} · ${message.course_title}` : message.course_title;
}

function messageUrl(basePath, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function messageRowsForViewer(viewerId, filters = {}) {
  const where = ["(m.sender_id = ? OR m.recipient_id = ?)"];
  const params = [viewerId, viewerId];
  if (filters.courseId) {
    where.push("m.course_id = ?");
    params.push(filters.courseId);
  }
  if (filters.q) {
    where.push(`(
      m.subject LIKE ?
      OR m.body LIKE ?
      OR s.first_name LIKE ?
      OR s.last_name LIKE ?
      OR r.first_name LIKE ?
      OR r.last_name LIKE ?
      OR c.title LIKE ?
    )`);
    const term = `%${filters.q}%`;
    params.push(term, term, term, term, term, term, term);
  }
  return db.prepare(`
    SELECT m.*,
      s.first_name || ' ' || s.last_name AS sender_name,
      s.email AS sender_email,
      s.role AS sender_role,
      r.first_name || ' ' || r.last_name AS recipient_name,
      r.email AS recipient_email,
      r.role AS recipient_role,
      c.title AS course_title,
      NULL AS course_code
    FROM messages m
    JOIN users s ON s.id = m.sender_id
    JOIN users r ON r.id = m.recipient_id
    LEFT JOIN courses c ON c.id = m.course_id
    WHERE ${where.join(" AND ")}
    ORDER BY datetime(m.created_at) DESC, m.id DESC
    LIMIT 300
  `).all(...params);
}

function groupedMessageThreads(viewerId, filters = {}) {
  const rows = messageRowsForViewer(viewerId, filters);
  const grouped = new Map();
  rows.forEach((row) => {
    const threadId = Number(row.thread_id || row.id);
    if (!grouped.has(threadId)) grouped.set(threadId, { threadId, latest: row, messages: [] });
    grouped.get(threadId).messages.push(row);
  });
  return [...grouped.values()].filter((thread) => {
    if (filters.box === "sent") return thread.messages.some((message) => Number(message.sender_id) === Number(viewerId));
    if (filters.box === "all") return true;
    return thread.messages.some((message) => Number(message.recipient_id) === Number(viewerId));
  });
}

function messageThread(threadId, viewerId) {
  if (!threadId) return [];
  return db.prepare(`
    SELECT m.*,
      s.first_name || ' ' || s.last_name AS sender_name,
      s.email AS sender_email,
      s.role AS sender_role,
      r.first_name || ' ' || r.last_name AS recipient_name,
      r.email AS recipient_email,
      r.role AS recipient_role,
      c.title AS course_title,
      NULL AS course_code
    FROM messages m
    JOIN users s ON s.id = m.sender_id
    JOIN users r ON r.id = m.recipient_id
    LEFT JOIN courses c ON c.id = m.course_id
    WHERE COALESCE(m.thread_id, m.id) = ?
      AND (m.sender_id = ? OR m.recipient_id = ?)
    ORDER BY datetime(m.created_at) ASC, m.id ASC
  `).all(Number(threadId), viewerId, viewerId);
}

function messageCourseOptions(user) {
  if (user.role === "student") {
    return db.prepare(`
      SELECT DISTINCT c.id, c.title, NULL AS code
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = ? AND e.status IN ('active', 'completed')
      ORDER BY c.title
    `).all(user.id);
  }
  return db.prepare(`
    SELECT id, title, NULL AS code
    FROM courses
    ORDER BY title
  `).all();
}

function normalizeMessageCourseId(user, rawCourseId) {
  const courseId = Number(rawCourseId || 0);
  if (!courseId) return null;
  const allowed = messageCourseOptions(user).some((course) => Number(course.id) === courseId);
  return allowed ? courseId : null;
}

function messageComposeForm({ action, recipients, courses, selectedRecipientId = "", selectedCourseId = "", subject = "", buttonLabel = "Send message", student = false }) {
  const panelClass = student ? "student-panel" : "card";
  return `
    <form class="${panelClass} message-compose" method="post" action="${escapeHtml(action)}">
      <h2>Compose message</h2>
      <label>To</label>
      <select name="recipientId" required>
        ${recipients.map((recipient) => `<option value="${escapeHtml(recipient.value)}" ${String(selectedRecipientId) === String(recipient.value) ? "selected" : ""}>${escapeHtml(recipient.label)}</option>`).join("")}
      </select>
      <label>Course</label>
      <select name="courseId">
        <option value="">General message</option>
        ${courses.map((course) => `<option value="${course.id}" ${Number(selectedCourseId) === Number(course.id) ? "selected" : ""}>${escapeHtml(course.code ? `${course.code} · ${course.title}` : course.title)}</option>`).join("")}
      </select>
      <label>Subject</label>
      <input name="subject" maxlength="140" required value="${escapeHtml(subject)}" placeholder="Question about class">
      <label>Message</label>
      <textarea name="body" rows="8" required placeholder="Write your message here."></textarea>
      <button type="submit">${escapeHtml(buttonLabel)}</button>
    </form>
  `;
}

function renderConversationList({ threads, viewerId, selectedThreadId, basePath, filters }) {
  if (!threads.length) return `<p class="empty">No messages match this view.</p>`;
  return `
    <div class="conversation-list" role="list">
      ${threads.map((thread) => {
        const latest = thread.latest;
        const isSelected = Number(thread.threadId) === Number(selectedThreadId);
        const unreadCount = thread.messages.filter((message) => Number(message.recipient_id) === Number(viewerId) && !message.read_at).length;
        const isIncoming = Number(latest.recipient_id) === Number(viewerId);
        const otherName = isIncoming ? latest.sender_name : latest.recipient_name;
        const href = messageUrl(basePath, { ...filters, threadId: thread.threadId });
        return `
          <a class="conversation-row ${isSelected ? "active" : ""} ${unreadCount ? "unread" : ""}" href="${escapeHtml(href)}" role="listitem">
            <span class="conversation-status">${unreadCount ? `<span class="unread-dot" aria-label="Unread message"></span>` : ""}</span>
            <span>
              <strong>${escapeHtml(otherName)}</strong>
              <em>${escapeHtml(latest.subject)}</em>
              <small>${escapeHtml(messageCourseLabel(latest))} · ${escapeHtml(formatMessageDate(latest.created_at))}</small>
              <span>${escapeHtml(latest.body.slice(0, 120))}${latest.body.length > 120 ? "..." : ""}</span>
            </span>
            ${unreadCount ? `<b>${unreadCount}</b>` : ""}
          </a>
        `;
      }).join("")}
    </div>
  `;
}

function renderMessageThread({ messages, viewerId, replyAction, student = false }) {
  if (!messages.length) {
    return `
      <article class="${student ? "student-panel" : "card"} conversation-detail empty-thread">
        <h2>Select a conversation</h2>
        <p class="empty">Choose a message on the left, or compose a new one.</p>
      </article>
    `;
  }
  const first = messages[0];
  const latest = messages[messages.length - 1];
  const replyTo = Number(latest.sender_id) === Number(viewerId) ? latest.recipient_name : latest.sender_name;
  return `
    <article class="${student ? "student-panel" : "card"} conversation-detail">
      <div class="conversation-title">
        <div>
          <p class="eyebrow">${escapeHtml(messageCourseLabel(first))}</p>
          <h2>${escapeHtml(first.subject)}</h2>
        </div>
        <span class="pill">${messages.length} message${messages.length === 1 ? "" : "s"}</span>
      </div>
      <div class="thread-messages">
        ${messages.map((message) => {
          const mine = Number(message.sender_id) === Number(viewerId);
          return `
            <section class="thread-message ${mine ? "mine" : ""}">
              <div class="thread-avatar">${escapeHtml(initialsFor({ first_name: message.sender_name?.split(" ")[0], last_name: message.sender_name?.split(" ").slice(1).join(" ") }))}</div>
              <div>
                <header>
                  <strong>${escapeHtml(message.sender_name)}</strong>
                  <span>${escapeHtml(formatMessageDate(message.created_at))}</span>
                </header>
                <p class="thread-meta">${escapeHtml(mine ? `To ${message.recipient_name}` : `From ${message.sender_name}`)} · ${escapeHtml(messageDeliveryLabel(message))}</p>
                <div class="message-body">${renderTextWithLinks(message.body)}</div>
                ${message.external_delivery_status === "failed" && message.external_delivery_error ? `<p class="message-error">${escapeHtml(message.external_delivery_error)}</p>` : ""}
              </div>
            </section>
          `;
        }).join("")}
      </div>
      <form class="reply-box" method="post" action="${escapeHtml(replyAction)}">
        <input type="hidden" name="threadId" value="${escapeHtml(first.thread_id || first.id)}">
        <label>Reply to ${escapeHtml(replyTo)}</label>
        <textarea name="body" rows="5" required placeholder="Write a reply..."></textarea>
        <button type="submit">Reply</button>
      </form>
    </article>
  `;
}

function savePortalMessage({ senderId, recipientId, courseId = null, subject, body, threadId = null }) {
  const result = db.prepare(`
    INSERT INTO messages (sender_id, recipient_id, course_id, thread_id, subject, body)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(senderId, recipientId, courseId || null, threadId || null, subject, body);
  const messageId = result.lastInsertRowid;
  if (!threadId) {
    db.prepare("UPDATE messages SET thread_id = ? WHERE id = ?").run(messageId, messageId);
  }
  return messageId;
}

function replyRecipientForThread(threadId, viewer) {
  const messages = messageThread(threadId, viewer.id);
  if (!messages.length) return null;
  const latest = messages[messages.length - 1];
  const recipientId = Number(latest.sender_id) === Number(viewer.id) ? Number(latest.recipient_id) : Number(latest.sender_id);
  const recipient = db.prepare("SELECT id, role, first_name, last_name, email, status FROM users WHERE id = ? AND status = 'active'").get(recipientId);
  if (!recipient) return null;
  if (viewer.role === "student" && !["admin", "instructor"].includes(recipient.role)) return null;
  if (viewer.role !== "student" && recipient.role !== "student") return null;
  return { recipient, messages, latest };
}

function markThreadRead(threadId, viewerId) {
  if (!threadId) return;
  db.prepare(`
    UPDATE messages
    SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
    WHERE COALESCE(thread_id, id) = ? AND recipient_id = ? AND read_at IS NULL
  `).run(Number(threadId), viewerId);
}

function updateMessageDelivery(messageId, result) {
  db.prepare(`
    UPDATE messages
    SET external_delivery_status = ?,
      external_delivery_error = ?,
      external_delivered_at = CASE WHEN ? = 'sent' THEN CURRENT_TIMESTAMP ELSE external_delivered_at END
    WHERE id = ?
  `).run(result.sent ? "sent" : smtpReady() ? "failed" : "not_configured", result.reason || null, result.sent ? "sent" : "failed", messageId);
}

function splitName(payload) {
  const firstName = payload.firstName || payload.first_name || payload.contact?.firstName || "";
  const lastName = payload.lastName || payload.last_name || payload.contact?.lastName || "";
  if (firstName || lastName) return [firstName || "Student", lastName || "Learner"];
  const full = payload.name || payload.contact?.name || payload.fullName || "Student Learner";
  const parts = String(full).trim().split(/\s+/);
  return [parts.shift() || "Student", parts.join(" ") || "Learner"];
}

function findCourseFromPayload(payload) {
  const values = [
    payload.courseSlug,
    payload.course_slug,
    payload.productName,
    payload.product_name,
    payload.productId,
    payload.product_id,
    payload.offerName,
    payload.offer_name,
    payload.course,
    payload.triggerData?.productName,
    payload.triggerData?.productId
  ].filter(Boolean).map((value) => String(value).toLowerCase());

  const rows = db.prepare("SELECT * FROM courses WHERE published = 1").all();
  return rows.find((course) => {
    const keys = [course.slug, course.title, ...JSON.parse(course.ghl_product_keys || "[]")].map((value) => String(value).toLowerCase());
    return values.some((value) => keys.some((key) => value === key || value.includes(key) || key.includes(value)));
  });
}

function dashboardStats() {
  return {
    students: db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'student'").get().count,
    courses: db.prepare("SELECT COUNT(*) AS count FROM courses WHERE published = 1").get().count,
    active: db.prepare("SELECT COUNT(*) AS count FROM enrollments WHERE status = 'active'").get().count,
    completed: db.prepare("SELECT COUNT(*) AS count FROM enrollments WHERE status = 'completed'").get().count
  };
}

const adminFeatureGroups = [
  {
    title: "System Settings",
    code: "SYS",
    items: ["General preparation", "Session preparation", "Setup notification", "WhatsApp messaging", "SMS messages", "Email setup", "Payment methods", "Print header and footer", "CMS front-end setup", "Role permits", "Data retrieval", "Languages", "Users", "File types", "Sidebar menu"]
  },
  {
    title: "Reports",
    code: "RPT",
    items: [
      { label: "OSV preparation binder", href: "/admin/onsite-visit" },
      { label: "HESI score report", href: "/admin/hesi" },
      "Student information",
      "Finance",
      "Presence",
      "Exams",
      "Online exams",
      "Lesson plan",
      "Human resources",
      "Homework",
      "Library",
      "Hostel",
      "Graduates",
      "User log",
      "Review path report"
    ]
  },
  {
    title: "Student Information",
    code: "STU",
    items: [
      { label: "Student details", href: "/admin/students" },
      "Student acceptance",
      "Online admission",
      "Disabled students",
      "Multi-grade student",
      "Delete complex",
      "Student categories",
      "Student house",
      "Disabling the cause"
    ]
  },
  {
    title: "Human Resources",
    code: "HR",
    items: ["Staff directory", "Employee attendance", "Payroll statement", "Approval of leave request", "Add departure", "Type of leave", "Teacher evaluation", "Hiring", "Disabled staff"]
  },
  {
    title: "Academics",
    code: "ACD",
    items: ["Class schedule", "Teachers' schedule", "Appointing a class teacher", "Upgrade the students", "Topic group", "Topics", "Season", "Sections"]
  },
  {
    title: "Exams",
    code: "EXM",
    items: ["Exam set", "Exam schedule", "Exam result", "Design acceptance card", "Print entry card", "Marksheet design", "Marksheet printing", "Class marks", "Signs section"]
  },
  {
    title: "Online Course",
    code: "LMS",
    items: [
      { label: "Online course", href: "/admin/courses" },
      "Question bank",
      "Offline payment",
      "Course category",
      "Certificate template",
      "Online course report",
      "Session"
    ]
  },
  {
    title: "Fee Collection",
    code: "FEE",
    items: [
      { label: "Fee collection", href: "/admin/billing" },
      { label: "Financial aid packaging", href: "/admin/financial-aid" },
      "Offline banking payments",
      "Pay the research fees",
      "Search for fees due",
      "Master of fees",
      "Quick fees",
      "Fee type",
      "Fee discount",
      "Relocation fees",
      "Fee reminder"
    ]
  },
  {
    title: "Reception Desk",
    code: "REC",
    items: ["Admission inquiry", "Visitors' book", "Phone call log", "Postal mailing", "Mail receipt", "Home complaints", "Front office setup"]
  },
  {
    title: "Communications",
    code: "COM",
    items: ["WhatsApp messaging", "Zoom live class", "Live meeting", "Live lessons", "Live classes report", "Send email", "SMS template"]
  },
  {
    title: "Operations",
    code: "OPS",
    items: ["Attendance QR code", "Behavior records", "Transfer", "Certificate", "Download center", "Homework", "Library", "Hostel", "Student CV", "Income", "Expenses"]
  },
  {
    title: "School Services",
    code: "SRV",
    items: ["Multi-branch", "Graduates", "Lesson plan", "Barren", "Transfers", "Thermal printing", "Student transportation fees", "Route pickup point", "Pickup point", "Master of fees"]
  }
];

const adminQuickLinks = [
  "Reception desk",
  "Student Information",
  "Fee collection",
  "Online course",
  "Behavior Records",
  "Multi-branch",
  "Zoom Live Class",
  "Income",
  "Expenses",
  "Attendance QR code",
  "Exams",
  "Presence",
  "Academics",
  "Annual calendar",
  "Lesson plan",
  "Human Resources",
  "Transfer",
  "Download Center",
  "Homework",
  "Library",
  "Student CV",
  "Certificate",
  "CMS Front",
  "Reports",
  "System settings"
];

function featureSlug(label) {
  return String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function featureLabel(item) {
  return typeof item === "string" ? item : item.label;
}

function featureHref(item) {
  if (typeof item === "object" && item.href) return item.href;
  return `/admin/features/${featureSlug(featureLabel(item))}`;
}

function findFeature(slug) {
  for (const group of adminFeatureGroups) {
    for (const item of group.items) {
      if (featureSlug(featureLabel(item)) === slug) return { group, label: featureLabel(item) };
    }
  }
  const quick = adminQuickLinks.find((label) => featureSlug(label) === slug);
  return quick ? { group: { title: "Quick Links", code: "QL" }, label: quick } : null;
}

app.get("/", (req, res) => {
  const user = currentUser(req);
  if (!user) return res.redirect("/login");
  res.redirect(user.role === "student" ? "/student" : "/admin");
});

app.get("/healthz", (req, res) => {
  res.json({ ok: true, service: "bmhi-sis-lms" });
});

app.get("/login", (req, res) => {
  const body = `
    <section class="login-wrap">
      <div class="login-copy">
        <img class="login-logo" src="/assets/bmhi-seal-blue.jpeg" alt="${escapeHtml(instituteName)} logo">
        <h1>SIS and LMS for healthcare training operations.</h1>
        <p>Manage students, enrollments, course shells, lesson progression, grades, attendance, and printable certificates from one local Broward-Miami portal.</p>
      </div>
      <form class="login-panel" method="post" action="/login">
        <h2>Sign in</h2>
        <p class="muted">Use an admin, instructor, or student account.</p>
        <div>
          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="username" required>
        </div>
        <div>
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required>
        </div>
        <button type="submit">Sign in</button>
        <p class="muted">
          Demo admin: admin@browardmiamihi.local / AdminPass123!<br>
          Demo student: student@browardmiamihi.local / StudentPass123!
        </p>
      </form>
    </section>
  `;
  render(req, res, "Sign in", body);
});

app.post("/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE lower(email) = ? AND status = 'active'").get(email);
  if (!user || !bcrypt.compareSync(String(req.body.password || ""), user.password_hash)) {
    flash(req, "Invalid email or password.");
    return res.redirect("/login");
  }
  req.session.userId = user.id;
  res.redirect(user.role === "student" ? "/student" : "/admin");
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

app.get("/help/browser-cache", requireAuth, (req, res) => {
  const body = `
    <section class="help-page">
      <div class="page-head">
        <div>
          <p class="eyebrow">Help</p>
          <h1>Browser cache and cookies</h1>
          <p>If the portal looks wrong after an update, buttons do not respond, or a page keeps loading old formatting, clear your browser's stored site data and refresh the page.</p>
        </div>
        <form method="post" action="/logout">
          <button class="button ghost" type="submit">Sign out and reset session</button>
        </form>
      </div>

      <section class="help-reset-panel">
        <div>
          <h2>Quick portal reset</h2>
          <p>This clears local browser storage used by the portal on this device. It does not delete student records, grades, documents, messages, or school data.</p>
        </div>
        <button class="button" type="button" data-clear-portal-cache>Clear local portal cache</button>
        <p class="help-reset-status" data-clear-portal-status aria-live="polite"></p>
      </section>

      <section class="help-grid">
        <article class="help-card">
          <h2>Chrome</h2>
          <ol>
            <li>Open Chrome's menu.</li>
            <li>Choose Clear browsing data.</li>
            <li>Select the time range you want.</li>
            <li>Check cookies/site data and cached images/files.</li>
            <li>Clear the data, then reopen the portal.</li>
          </ol>
        </article>
        <article class="help-card">
          <h2>Chrome site-only reset</h2>
          <ol>
            <li>Open Chrome Settings.</li>
            <li>Go to Privacy and security, then site data.</li>
            <li>Search for bmhi-student-portal.onrender.com.</li>
            <li>Delete only this portal's stored site data.</li>
          </ol>
        </article>
        <article class="help-card">
          <h2>Microsoft Edge</h2>
          <ol>
            <li>Open Settings.</li>
            <li>Choose Privacy, search, and services.</li>
            <li>Select Choose what to clear.</li>
            <li>Clear cookies/site data and cached images/files.</li>
          </ol>
        </article>
        <article class="help-card">
          <h2>Firefox</h2>
          <ol>
            <li>Open Firefox Settings.</li>
            <li>Go to Privacy &amp; Security.</li>
            <li>In Cookies and Site Data, choose Clear Data.</li>
            <li>Select cookies/site data and cached web content.</li>
          </ol>
        </article>
        <article class="help-card">
          <h2>Safari</h2>
          <ol>
            <li>Open Safari.</li>
            <li>Choose Clear History from the Safari menu.</li>
            <li>Select the time range.</li>
            <li>Clear history, then reopen the portal and sign in.</li>
          </ol>
        </article>
        <article class="help-card">
          <h2>When to use this</h2>
          <ul>
            <li>New buttons or pages do not appear after an update.</li>
            <li>Fonts, spacing, or page layout look old.</li>
            <li>You get stuck on a stale login or blank page.</li>
            <li>Canvas-style course pages show old navigation.</li>
          </ul>
        </article>
      </section>

      <p class="help-source">Based on Canvas browser troubleshooting guidance from Instructure. For external reference, see <a href="https://community.instructure.com/en/kb/articles/662720-how-do-i-clear-my-browser-cache-and-cookies" target="_blank" rel="noopener">Instructure: clear browser cache and cookies</a>.</p>
    </section>
    <script>
      (() => {
        const button = document.querySelector("[data-clear-portal-cache]");
        const status = document.querySelector("[data-clear-portal-status]");
        if (!button || !status) return;
        button.addEventListener("click", async () => {
          try {
            localStorage.clear();
            sessionStorage.clear();
            if ("caches" in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map((key) => caches.delete(key)));
            }
            status.textContent = "Local portal cache cleared. Refresh the page or sign out and sign back in.";
          } catch (error) {
            status.textContent = "The portal could not clear all local cache automatically. Use your browser settings below.";
          }
        });
      })();
    </script>
  `;
  render(req, res, "Browser Cache Help", body, req.user.role === "student" ? { studentPortal: true, activeStudentNav: "help" } : {});
});

app.get("/catalog", requireAuth, (req, res) => {
  const catalogCourses = db.prepare("SELECT * FROM courses WHERE published = 1 ORDER BY category, title").all();
  const body = `
    <div class="page-head">
      <div>
        <h1>School Catalog</h1>
        <p>Broward-Miami Health Institute Institution Catalog 2025-2026, Vol. III. Effective March 2025. Structured details below are extracted from the current catalog PDF.</p>
      </div>
      <a class="button" href="/assets/bmhi-institution-catalog-2025-2026.pdf" target="_blank" rel="noopener">Open PDF</a>
    </div>

    <section class="grid cols-4">
      ${stat("Campus", instituteAddress)}
      ${stat("Phone", institutePhone)}
      ${stat("Email", instituteEmail)}
      ${stat("FLDOE License", "#9021")}
    </section>

    <section class="grid cols-3 catalog-summary-grid" style="margin-top:18px">
      <article class="card catalog-summary-card">
        <h2>Hours of Operation</h2>
        ${renderCatalogDefinitionList(catalogOperatingHours)}
      </article>
      <article class="card catalog-summary-card">
        <h2>Admissions Checklist</h2>
        ${renderCatalogList(catalogAdmissions)}
      </article>
      <article class="card catalog-summary-card">
        <h2>Graduation Requirements</h2>
        ${renderCatalogList(catalogGraduationRequirements)}
      </article>
    </section>

    ${renderTuitionFeesSection(catalogCourses)}

    <section class="grid cols-2 catalog-policy-grid" style="margin-top:18px">
      <article class="card catalog-summary-card">
        <h2>Credential Hours</h2>
        <div class="catalog-definition-list">
          ${catalogCredentialRequirements.map((row) => `
            <p><strong>${escapeHtml(row.program)}</strong><span>${escapeHtml(row.hours)} clock hours · ${escapeHtml(row.credential)}</span></p>
          `).join("")}
        </div>
      </article>
      <article class="card catalog-summary-card">
        <h2>Attendance Policy</h2>
        ${renderCatalogList(catalogAttendancePolicy)}
      </article>
      <article class="card catalog-summary-card">
        <h2>Student Records & FERPA</h2>
        ${renderCatalogList(catalogStudentRecords)}
      </article>
      <article class="card catalog-summary-card">
        <h2>2025-2026 Academic Calendar</h2>
        <div class="catalog-calendar-list">
          ${catalogAcademicCalendar.map((program) => `
            <details>
              <summary>${escapeHtml(program.program)}</summary>
              ${renderCatalogList(program.sessions)}
            </details>
          `).join("")}
        </div>
      </article>
    </section>

    <section class="card catalog-summary-card" style="margin-top:18px">
      <h2>Program Summaries</h2>
      <div class="catalog-program-grid">
        ${catalogProgramSummaries.map((program) => `
          <article>
            <h3>${escapeHtml(program.title)}</h3>
            <p><strong>${escapeHtml(program.hours)} clock hours</strong></p>
            <p>${escapeHtml(program.summary)}</p>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="card catalog-card">
      <iframe class="catalog-frame" src="/assets/bmhi-institution-catalog-2025-2026.pdf" title="Broward-Miami Health Institute Institution Catalog 2025-2026"></iframe>
    </section>
  `;
  render(req, res, "School Catalog", body);
});

app.get("/admin", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const stats = dashboardStats();
  const recent = db.prepare(`
    SELECT e.*, u.first_name, u.last_name, u.email, c.title AS course_title
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id
    ORDER BY e.created_at DESC
    LIMIT 8
  `).all();

  const body = `
    <div class="page-head">
      <div>
        <h1>Operations Dashboard</h1>
        <p>Monitor enrollment activity, completion progress, and credential readiness.</p>
      </div>
      <div class="actions">
        ${req.user.role === "admin" ? `<a class="button ghost" href="/admin/features">Admin features</a>` : ""}
        <a class="button" href="/admin/students">Add student</a>
      </div>
    </div>
    <section class="grid cols-4">
      ${stat("Students", stats.students)}
      ${stat("Published courses", stats.courses)}
      ${stat("Active enrollments", stats.active)}
      ${stat("Completed", stats.completed)}
    </section>
    <section class="table-card" style="margin-top:18px">
      <table>
        <thead><tr><th>Student</th><th>Course</th><th>Status</th><th>Progress</th><th>Started</th></tr></thead>
        <tbody>
          ${recent.map((row) => `
            <tr>
              <td><strong>${escapeHtml(row.first_name)} ${escapeHtml(row.last_name)}</strong><br><span class="muted">${escapeHtml(row.email)}</span></td>
              <td>${escapeHtml(row.course_title)}</td>
              <td><span class="pill">${escapeHtml(row.status)}</span></td>
              <td>${progressBar(row.progress)}<span class="muted">${escapeHtml(row.progress)}%</span></td>
              <td>${date(row.start_date)}</td>
            </tr>
          `).join("") || `<tr><td class="empty" colspan="5">No enrollments yet.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
  render(req, res, "Dashboard", body);
});

app.get("/admin/messages", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const box = ["inbox", "sent", "all"].includes(String(req.query.box || "")) ? String(req.query.box) : "inbox";
  const q = String(req.query.q || "").trim().slice(0, 80);
  const courses = messageCourseOptions(req.user);
  const courseId = normalizeMessageCourseId(req.user, req.query.courseId);
  const students = db.prepare(`
    SELECT id, first_name, last_name, email, status
    FROM users
    WHERE role = 'student' AND status = 'active'
    ORDER BY last_name, first_name
  `).all();
  const recipients = [
    { value: "all_students", label: courseId ? "All students enrolled in selected course" : "All active students" },
    ...students.map((student) => ({ value: student.id, label: `${personName(student)} · ${student.email}` }))
  ];
  const unreadCount = db.prepare("SELECT COUNT(*) AS count FROM messages WHERE recipient_id = ? AND read_at IS NULL").get(req.user.id).count;
  const filters = { box, courseId, q };
  let threads = groupedMessageThreads(req.user.id, filters);
  let selectedThreadId = Number(req.query.threadId || 0) || threads[0]?.threadId || null;
  if (selectedThreadId && !messageThread(selectedThreadId, req.user.id).length) selectedThreadId = threads[0]?.threadId || null;
  markThreadRead(selectedThreadId, req.user.id);
  threads = groupedMessageThreads(req.user.id, filters);
  const selectedMessages = messageThread(selectedThreadId, req.user.id);

  const body = `
    <div class="page-head">
      <div>
        <h1>Inbox</h1>
        <p>Communicate with students, answer course questions, and keep instructor-student conversations in one place.</p>
      </div>
      <a class="button ghost" href="/admin/students">Students</a>
    </div>

    <section class="grid cols-3">
      ${stat("Active students", String(students.length))}
      ${stat("Unread messages", String(unreadCount))}
      ${stat("External email", smtpReady() ? "Enabled" : "Setup needed")}
    </section>
    ${smtpReady() ? "" : `
      <div class="flash message-config-note">
        External delivery is not active yet. Add SMTP settings in Render to send real emails outside the portal.
      </div>
    `}

    <section class="message-center">
      <aside class="message-sidebar">
        <form class="message-toolbar" method="get" action="/admin/messages">
          <select name="courseId">
            <option value="">All courses</option>
            ${courses.map((course) => `<option value="${course.id}" ${Number(courseId) === Number(course.id) ? "selected" : ""}>${escapeHtml(course.code ? `${course.code} · ${course.title}` : course.title)}</option>`).join("")}
          </select>
          <select name="box">
            <option value="inbox" ${box === "inbox" ? "selected" : ""}>Inbox</option>
            <option value="sent" ${box === "sent" ? "selected" : ""}>Sent</option>
            <option value="all" ${box === "all" ? "selected" : ""}>All messages</option>
          </select>
          <input name="q" type="search" value="${escapeHtml(q)}" placeholder="Search messages">
          <button type="submit">Search</button>
        </form>
        ${renderConversationList({ threads, viewerId: req.user.id, selectedThreadId, basePath: "/admin/messages", filters })}
      </aside>
      <section class="message-main">
        ${renderMessageThread({ messages: selectedMessages, viewerId: req.user.id, replyAction: "/admin/messages/reply" })}
        ${messageComposeForm({ action: "/admin/messages", recipients, courses, selectedCourseId: courseId })}
      </section>
    </section>
  `;
  render(req, res, "Inbox", body);
});

app.post("/admin/messages", requireAuth, requireRole("admin", "instructor"), async (req, res) => {
  const recipientId = String(req.body.recipientId || "");
  const courseId = normalizeMessageCourseId(req.user, req.body.courseId);
  const subject = String(req.body.subject || "").trim().slice(0, 140);
  const body = String(req.body.body || "").trim();
  if (!subject || !body) {
    flash(req, "Subject and message are required.");
    return res.redirect("/admin/messages");
  }

  if (recipientId === "all_students") {
    const students = db.prepare(`
      SELECT id, first_name, last_name, email
      FROM users
      WHERE role = 'student' AND status = 'active'
        ${courseId ? "AND id IN (SELECT user_id FROM enrollments WHERE course_id = ? AND status IN ('active', 'completed'))" : ""}
    `).all(...(courseId ? [courseId] : []));
    let externalSent = 0;
    let externalFailed = 0;
    for (const student of students) {
      const messageId = savePortalMessage({ senderId: req.user.id, recipientId: student.id, courseId, subject, body });
      const delivery = await deliverExternalEmail({ sender: req.user, recipient: student, subject, body });
      updateMessageDelivery(messageId, delivery);
      if (delivery.sent) externalSent += 1;
      if (!delivery.sent && smtpReady()) externalFailed += 1;
    }
    flash(req, `Portal message sent to ${students.length} active student${students.length === 1 ? "" : "s"}. External email: ${smtpReady() ? `${externalSent} sent${externalFailed ? `, ${externalFailed} failed` : ""}` : "setup needed"}.`);
    return res.redirect("/admin/messages");
  }

  const recipient = db.prepare(`
    SELECT id, first_name, last_name, email
    FROM users
    WHERE id = ? AND role = 'student' AND status = 'active'
  `).get(Number(recipientId));
  if (!recipient) {
    flash(req, "Please choose an active student recipient.");
    return res.redirect("/admin/messages");
  }
  const messageId = savePortalMessage({ senderId: req.user.id, recipientId: recipient.id, courseId, subject, body });
  const delivery = await deliverExternalEmail({ sender: req.user, recipient, subject, body });
  updateMessageDelivery(messageId, delivery);
  flash(req, delivery.sent ? "Portal message saved and external email sent." : `Portal message saved. ${delivery.reason}`);
  res.redirect("/admin/messages");
});

app.post("/admin/messages/reply", requireAuth, requireRole("admin", "instructor"), async (req, res) => {
  const threadId = Number(req.body.threadId || 0);
  const body = String(req.body.body || "").trim();
  const reply = replyRecipientForThread(threadId, req.user);
  if (!reply || !body) {
    flash(req, "Choose a student conversation and enter a reply.");
    return res.redirect("/admin/messages");
  }
  const subject = reply.messages[0].subject;
  const courseId = reply.messages[0].course_id || null;
  const messageId = savePortalMessage({ senderId: req.user.id, recipientId: reply.recipient.id, courseId, subject, body, threadId });
  const delivery = await deliverExternalEmail({ sender: req.user, recipient: reply.recipient, subject, body });
  updateMessageDelivery(messageId, delivery);
  flash(req, delivery.sent ? "Reply saved and external email sent." : `Reply saved in the portal. ${delivery.reason}`);
  res.redirect(`/admin/messages?threadId=${threadId}`);
});

app.get("/admin/features", requireAuth, requireRole("admin"), (req, res) => {
  const body = `
    <div class="page-head">
      <div>
        <h1>Admin Features</h1>
        <p>Central command menu for SIS, LMS, student services, finance, communications, academics, reports, and school operations.</p>
      </div>
      <a class="button" href="/admin">Back to dashboard</a>
    </div>

    <section class="feature-shell">
      <div class="feature-grid">
        ${adminFeatureGroups.map((group) => `
          <article class="feature-group" id="${escapeHtml(featureSlug(group.title))}">
            <header>
              <span>${escapeHtml(group.code)}</span>
              <h2>${escapeHtml(group.title)}</h2>
            </header>
            <div class="feature-list">
              ${group.items.map((item) => `
                <a href="${escapeHtml(featureHref(item))}">
                  <span>${escapeHtml(featureLabel(item))}</span>
                </a>
              `).join("")}
            </div>
          </article>
        `).join("")}
      </div>

      <aside class="feature-rail">
        <div class="feature-rail-card">
          <h2>Quick links</h2>
          <p class="muted">Common admin areas from the expanded school management menu.</p>
          <div class="feature-quick-list">
            ${adminQuickLinks.map((label) => `
              <a href="/admin/features/${escapeHtml(featureSlug(label))}">
                <span>${escapeHtml(label)}</span>
              </a>
            `).join("")}
          </div>
        </div>
      </aside>
    </section>
  `;
  render(req, res, "Admin Features", body);
});

app.get("/admin/features/:slug", requireAuth, requireRole("admin"), (req, res) => {
  const feature = findFeature(String(req.params.slug || ""));
  const label = feature?.label || "Admin module";
  const group = feature?.group || { title: "Admin Features", code: "ADM" };
  const body = `
    <div class="page-head">
      <div>
        <p class="eyebrow">${escapeHtml(group.title)}</p>
        <h1>${escapeHtml(label)}</h1>
        <p>This module has been added to the admin feature menu and is ready for detailed workflow buildout.</p>
      </div>
      <div class="actions">
        <a class="button ghost" href="/admin/features">All features</a>
        <a class="button" href="/admin">Dashboard</a>
      </div>
    </div>

    <section class="grid cols-3">
      ${stat("Module", group.code)}
      ${stat("Status", "Planned")}
      ${stat("Access", "Admin")}
    </section>

    <section class="grid cols-2" style="margin-top:18px">
      <article class="card module-placeholder">
        <h2>Recommended setup</h2>
        <p>Define the fields, approvals, reports, user permissions, and printed documents needed for this area before activating it in daily operations.</p>
      </article>
      <article class="card module-placeholder">
        <h2>Next build steps</h2>
        <ul>
          <li>Create the data table or connect the existing records.</li>
          <li>Add staff permissions and audit history.</li>
          <li>Add import, export, and printable report options.</li>
        </ul>
      </article>
    </section>
  `;
  render(req, res, label, body);
});

function renderOnsiteVisitFileList(files = []) {
  return files.map((file) => `
    <div class="osv-file">
      <div>
        <strong>${escapeHtml(file.file_original_name)}</strong>
        <span>${escapeHtml(formatBytes(file.file_size))} · ${escapeHtml(file.first_name ? `${file.first_name} ${file.last_name}` : "Staff")} · ${escapeHtml(formatMessageDate(file.uploaded_at))}</span>
      </div>
      <div class="actions compact">
        <a class="button small ghost" href="/admin/onsite-visit/files/${file.id}">Download</a>
        <form method="post" action="/admin/onsite-visit/files/${file.id}/delete">
          <button class="small ghost danger" type="submit">Remove</button>
        </form>
      </div>
    </div>
  `).join("") || `<p class="muted registrar-file-empty">No evidence uploaded yet.</p>`;
}

function renderOnsiteVisitChecklist(rows = []) {
  const grouped = groupOnsiteVisitRows(rows);
  return [...grouped.entries()].map(([section, items]) => `
    <section class="osv-section" id="${escapeHtml(featureSlug(section))}">
      <div class="osv-section-head">
        <h2>${escapeHtml(section)}</h2>
        <span>${escapeHtml(items.length)} item${items.length === 1 ? "" : "s"}</span>
      </div>
      <div class="osv-item-list">
        ${items.map((item) => `
          <article class="card osv-item ${escapeHtml(item.status)}">
            <div class="osv-item-head">
              <div>
                <p class="eyebrow">${escapeHtml(item.standard || "OSV")}</p>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description || "")}</p>
              </div>
              <span class="pill ${item.status === "approved" ? "" : item.status === "received" ? "" : "orange"}">${escapeHtml(onsiteVisitStatusLabels[item.status] || item.status)}</span>
            </div>

            <form class="osv-detail-form" method="post" action="/admin/onsite-visit/items/${item.id}">
              <label>Status</label>
              <select name="status">
                ${onsiteVisitStatuses.map((status) => `<option value="${status}" ${item.status === status ? "selected" : ""}>${escapeHtml(onsiteVisitStatusLabels[status])}</option>`).join("")}
              </select>
              <label>Owner</label>
              <input name="owner" value="${escapeHtml(item.owner || "")}" placeholder="Staff owner">
              <label>Request from</label>
              <input name="requestedFrom" value="${escapeHtml(item.requested_from || "")}" placeholder="Person or office responsible">
              <label>Due date</label>
              <input type="date" name="dueDate" value="${escapeHtml(item.due_date || "")}">
              <label>Presentation section</label>
              <input name="section" value="${escapeHtml(item.section || "")}">
              <label>Order</label>
              <input type="number" name="presentationOrder" min="1" value="${escapeHtml(item.presentation_order || 1)}">
              <label class="span-2">Notes, missing items, or evaluator instructions</label>
              <textarea class="span-2" name="note" rows="3">${escapeHtml(item.note || "")}</textarea>
              <div class="actions span-2">
                <button class="small" type="submit" name="action" value="save">Save item</button>
                <button class="small ghost" type="submit" name="action" value="request">Mark requested</button>
                <button class="small ghost" type="submit" name="action" value="approve">Approve</button>
              </div>
            </form>

            <form class="osv-upload" method="post" action="/admin/onsite-visit/items/${item.id}/upload" enctype="multipart/form-data">
              <label>Upload evidence</label>
              <input type="file" name="documents" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" required>
              <button class="small ghost" type="submit">Upload evidence</button>
            </form>

            <div class="osv-file-list">
              ${renderOnsiteVisitFileList(item.files)}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `).join("");
}

app.get("/admin/onsite-visit", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const rows = onsiteVisitRows();
  const progress = onsiteVisitProgress(rows);
  const requestText = onsiteRequestText(rows);
  const body = `
    <div class="page-head">
      <div>
        <p class="eyebrow">Institution On-Site Visit</p>
        <h1>OSV Preparation Binder</h1>
        <p>Gather required documentation, store evidence, request missing items, and produce an organized packet for evaluator review.</p>
      </div>
      <div class="actions">
        <a class="button ghost" href="/admin/onsite-visit/presentation">Presentation view</a>
        <a class="button ghost" href="/admin/features">Admin features</a>
      </div>
    </div>

    <section class="grid cols-4">
      ${stat("Checklist items", String(progress.total))}
      ${stat("Received evidence", `${progress.received}/${progress.total}`)}
      ${stat("Approved", `${progress.approved}/${progress.total}`)}
      ${stat("Still missing", String(progress.missing))}
    </section>

    <section class="grid cols-2 osv-workspace">
      <article class="card osv-overview">
        <h2>Binder readiness</h2>
        ${progressBar(progress.percent)}
        <p class="muted">Approved and not-applicable items count toward binder readiness. Uploaded files remain attached to each evidence item.</p>
        <div class="registrar-mini-list registrar-anchor-list">
          ${[...groupOnsiteVisitRows(rows).keys()].map((section) => `<a href="#${escapeHtml(featureSlug(section))}">${escapeHtml(section)}</a>`).join("")}
        </div>
      </article>
      <article class="card osv-request-panel">
        <div class="actions" style="justify-content:space-between">
          <div>
            <h2>Request missing items</h2>
            <p class="muted">Use this request list when asking staff or departments for OSV evidence.</p>
          </div>
          <form method="post" action="/admin/onsite-visit/request-needed">
            <button class="small" type="submit">Mark needed as requested</button>
          </form>
        </div>
        <textarea readonly rows="10">${escapeHtml(requestText)}</textarea>
      </article>
    </section>

    ${renderOnsiteVisitChecklist(rows)}
  `;
  render(req, res, "OSV Preparation", body);
});

app.get("/admin/onsite-visit/presentation", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const rows = onsiteVisitRows();
  const progress = onsiteVisitProgress(rows);
  const body = `
    <div class="page-head osv-print-head">
      <div>
        <p class="eyebrow">Produced OSV Binder</p>
        <h1>${escapeHtml(instituteName)} On-Site Visit Evidence Packet</h1>
        <p>${escapeHtml(instituteAddress)} · ${escapeHtml(institutePhone)} · ${escapeHtml(instituteEmail)}</p>
      </div>
      <div class="actions">
        <button onclick="window.print()">Print packet</button>
        <a class="button ghost" href="/admin/onsite-visit">Edit binder</a>
      </div>
    </div>

    <section class="grid cols-4">
      ${stat("Prepared items", String(progress.total))}
      ${stat("Received", `${progress.received}/${progress.total}`)}
      ${stat("Approved", `${progress.approved}/${progress.total}`)}
      ${stat("Generated", new Date().toLocaleDateString("en-US"))}
    </section>

    <section class="osv-binder">
      ${[...groupOnsiteVisitRows(rows).entries()].map(([section, items]) => `
        <article class="card osv-binder-section">
          <h2>${escapeHtml(section)}</h2>
          <table>
            <thead><tr><th>Evidence item</th><th>Status</th><th>Owner</th><th>Files</th><th>Notes</th></tr></thead>
            <tbody>
              ${items.map((item) => `
                <tr>
                  <td><strong>${escapeHtml(item.title)}</strong><br><span class="muted">${escapeHtml(item.description || "")}</span></td>
                  <td>${escapeHtml(onsiteVisitStatusLabels[item.status] || item.status)}</td>
                  <td>${escapeHtml(item.owner || item.requested_from || "")}</td>
                  <td>
                    ${item.files.map((file) => `<a href="/admin/onsite-visit/files/${file.id}">${escapeHtml(file.file_original_name)}</a>`).join("<br>") || `<span class="muted">No files</span>`}
                  </td>
                  <td>${escapeHtml(item.note || "")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </article>
      `).join("")}
    </section>
  `;
  render(req, res, "OSV Evidence Packet", body);
});

app.post("/admin/onsite-visit/request-needed", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  db.prepare(`
    UPDATE onsite_visit_items
    SET status = 'requested',
      requested_at = COALESCE(requested_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP
    WHERE status = 'needed'
  `).run();
  flash(req, "Needed OSV items marked as requested.");
  res.redirect("/admin/onsite-visit");
});

app.post("/admin/onsite-visit/items/:id", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const item = db.prepare("SELECT id FROM onsite_visit_items WHERE id = ?").get(Number(req.params.id));
  if (!item) return res.status(404).send("OSV item not found");
  let status = onsiteVisitStatuses.includes(String(req.body.status || "")) ? String(req.body.status) : "needed";
  const action = String(req.body.action || "save");
  if (action === "request") status = "requested";
  if (action === "approve") status = "approved";
  db.prepare(`
    UPDATE onsite_visit_items
    SET status = ?,
      owner = ?,
      requested_from = ?,
      due_date = ?,
      section = ?,
      presentation_order = ?,
      note = ?,
      requested_at = CASE WHEN ? = 'requested' THEN COALESCE(requested_at, CURRENT_TIMESTAMP) ELSE requested_at END,
      completed_at = CASE WHEN ? IN ('approved','not_applicable') THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    status,
    String(req.body.owner || "").trim(),
    String(req.body.requestedFrom || "").trim(),
    String(req.body.dueDate || "").trim() || null,
    String(req.body.section || "").trim() || "Unsorted",
    Math.max(1, Number(req.body.presentationOrder || 1)),
    String(req.body.note || "").trim(),
    status,
    status,
    item.id
  );
  flash(req, "OSV checklist item updated.");
  res.redirect("/admin/onsite-visit");
});

app.post("/admin/onsite-visit/items/:id/upload", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const item = db.prepare("SELECT id FROM onsite_visit_items WHERE id = ?").get(Number(req.params.id));
  if (!item) return res.status(404).send("OSV item not found");

  upload.array("documents", 10)(req, res, (error) => {
    if (error) {
      flash(req, error.message || "Upload failed.");
      return res.redirect("/admin/onsite-visit");
    }
    if (!req.files?.length) {
      flash(req, "Choose at least one evidence file to upload.");
      return res.redirect("/admin/onsite-visit");
    }
    const insertFile = db.prepare(`
      INSERT INTO onsite_visit_files (item_id, file_original_name, file_storage_name, file_mime_type, file_size, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    req.files.forEach((file) => {
      insertFile.run(item.id, file.originalname, file.filename, file.mimetype, file.size, req.user.id);
    });
    db.prepare(`
      UPDATE onsite_visit_items
      SET status = CASE WHEN status IN ('needed','requested') THEN 'received' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(item.id);
    flash(req, `${req.files.length} OSV evidence file${req.files.length === 1 ? "" : "s"} uploaded.`);
    res.redirect("/admin/onsite-visit");
  });
});

app.get("/admin/onsite-visit/files/:id", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const file = db.prepare("SELECT * FROM onsite_visit_files WHERE id = ?").get(Number(req.params.id));
  if (!file?.file_storage_name) return res.status(404).send("File not found");
  const filePath = path.join(uploadDir, file.file_storage_name);
  if (!isPathInside(uploadDir, filePath) || !fs.existsSync(filePath)) return res.status(404).send("File not found");
  res.download(filePath, file.file_original_name || file.file_storage_name);
});

app.post("/admin/onsite-visit/files/:id/delete", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const file = db.prepare("SELECT * FROM onsite_visit_files WHERE id = ?").get(Number(req.params.id));
  if (!file) return res.status(404).send("File not found");
  const filePath = path.join(uploadDir, file.file_storage_name);
  if (isPathInside(uploadDir, filePath) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare("DELETE FROM onsite_visit_files WHERE id = ?").run(file.id);
  flash(req, "OSV evidence file removed.");
  res.redirect("/admin/onsite-visit");
});

app.get("/admin/hesi", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const selectedCohort = String(req.query.cohort || "Cohort 1").trim() || "Cohort 1";
  const cohorts = db.prepare(`
    SELECT DISTINCT cohort_name
    FROM users
    WHERE role = 'student' AND cohort_name IS NOT NULL AND cohort_name <> ''
    ORDER BY cohort_name
  `).all();
  const students = db.prepare(`
    SELECT id, first_name, last_name, email, cohort_name, cohort_start_date, cohort_end_date
    FROM users
    WHERE role = 'student' AND cohort_name = ?
    ORDER BY last_name, first_name
  `).all(selectedCohort);
  const scores = students.length ? db.prepare(`
    SELECT *
    FROM hesi_scores
    WHERE user_id IN (${students.map(() => "?").join(",")})
    ORDER BY subject
  `).all(...students.map((student) => student.id)) : [];
  const scoreMap = new Map(scores.map((row) => [`${row.user_id}:${row.subject}`, row]));
  const studentSummary = (student) => {
    const rows = hesiSubjects.map((subject) => scoreMap.get(`${student.id}:${subject.subject}`));
    return {
      pass: rows.filter((row) => row?.status === "pass").length,
      remediation: rows.filter((row) => row?.status === "remediation").length,
      missing: rows.filter((row) => !row || row.status === "missing").length
    };
  };
  const totals = students.reduce((summary, student) => {
    const row = studentSummary(student);
    summary.pass += row.pass;
    summary.remediation += row.remediation;
    summary.missing += row.missing;
    return summary;
  }, { pass: 0, remediation: 0, missing: 0 });
  const totalExpected = students.length * hesiSubjects.length;
  const cohortOption = (cohort) => `<option value="${escapeHtml(cohort.cohort_name)}" ${cohort.cohort_name === selectedCohort ? "selected" : ""}>${escapeHtml(cohort.cohort_name)}</option>`;

  const body = `
    <div class="page-head">
      <div>
        <p class="eyebrow">Exams</p>
        <h1>HESI Scores</h1>
        <p>Store entrance and specialty HESI results by cohort, including acceptable scores, actual scores, and remediation flags.</p>
      </div>
      <div class="actions">
        <a class="button ghost" href="/admin/students">Students</a>
        <a class="button ghost" href="/admin/features">Reports</a>
      </div>
    </div>

    <section class="grid cols-4">
      ${stat("Cohort", selectedCohort)}
      ${stat("Students", String(students.length))}
      ${stat("Passing scores", `${totals.pass}/${totalExpected}`)}
      ${stat("Needs review", String(totals.remediation + totals.missing))}
    </section>

    <section class="card hesi-toolbar">
      <form method="get" action="/admin/hesi" class="actions">
        <label>
          Cohort
          <select name="cohort">
            ${cohorts.map(cohortOption).join("")}
            ${cohorts.some((cohort) => cohort.cohort_name === selectedCohort) ? "" : `<option value="${escapeHtml(selectedCohort)}" selected>${escapeHtml(selectedCohort)}</option>`}
          </select>
        </label>
        <button class="small" type="submit">Open cohort</button>
      </form>
      <p class="muted">Scores below were imported from the Cohort 1 HESI screenshot. Leave a score blank when no result is available yet.</p>
    </section>

    <section class="table-card hesi-scorebook" style="margin-top:18px">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Summary</th>
            ${hesiSubjects.map((item) => `<th>${escapeHtml(item.subject)}<br><small>Acceptable ${escapeHtml(item.acceptableScore)}</small></th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${students.map((student) => {
            const summary = studentSummary(student);
            return `
              <tr>
                <td>
                  <strong>${escapeHtml(student.last_name)}, ${escapeHtml(student.first_name)}</strong><br>
                  <span class="muted">${escapeHtml(student.email)}</span>
                </td>
                <td>
                  <span class="hesi-mini pass">${escapeHtml(summary.pass)} pass</span>
                  <span class="hesi-mini remediation">${escapeHtml(summary.remediation)} review</span>
                  <span class="hesi-mini missing">${escapeHtml(summary.missing)} missing</span>
                </td>
                ${hesiSubjects.map((item) => {
                  const row = scoreMap.get(`${student.id}:${item.subject}`);
                  const scoreValue = row?.score ?? "";
                  const status = row?.status || "missing";
                  return `
                    <td class="hesi-score-cell ${escapeHtml(status)}">
                      <form method="post" action="/admin/hesi/scores">
                        <input type="hidden" name="userId" value="${escapeHtml(student.id)}">
                        <input type="hidden" name="cohort" value="${escapeHtml(selectedCohort)}">
                        <input type="hidden" name="subject" value="${escapeHtml(item.subject)}">
                        <input type="hidden" name="acceptableScore" value="${escapeHtml(item.acceptableScore)}">
                        <input name="score" type="number" min="0" inputmode="numeric" value="${escapeHtml(scoreValue)}" aria-label="${escapeHtml(item.subject)} score for ${escapeHtml(personName(student))}">
                        <span>${status === "pass" ? "Pass" : status === "remediation" ? "Remediation" : "Missing"}</span>
                        <button class="small ghost" type="submit">Save</button>
                      </form>
                    </td>
                  `;
                }).join("")}
              </tr>
            `;
          }).join("") || `<tr><td class="empty" colspan="${hesiSubjects.length + 2}">No students found for this cohort.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
  render(req, res, "HESI Scores", body);
});

app.post("/admin/hesi/scores", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const userId = Number(req.body.userId);
  const subject = String(req.body.subject || "").trim();
  const hesiSubject = hesiSubjects.find((item) => item.subject === subject);
  if (!hesiSubject) return res.status(404).send("HESI subject not found");
  const student = db.prepare("SELECT id, cohort_name FROM users WHERE id = ? AND role = 'student'").get(userId);
  if (!student) return res.status(404).send("Student not found");
  const rawScore = String(req.body.score || "").trim();
  const score = rawScore === "" ? null : Number(rawScore);
  if (score !== null && (!Number.isFinite(score) || score < 0)) {
    flash(req, "Enter a valid HESI score.");
    return res.redirect(`/admin/hesi?cohort=${encodeURIComponent(String(req.body.cohort || student.cohort_name || "Cohort 1"))}`);
  }
  const acceptableScore = Number(req.body.acceptableScore || hesiSubject.acceptableScore);
  const status = hesiScoreStatus(score, acceptableScore);
  db.prepare(`
    INSERT INTO hesi_scores (user_id, cohort_name, exam_name, subject, acceptable_score, score, status, source_note)
    VALUES (?, ?, 'HESI', ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, exam_name, subject) DO UPDATE SET
      cohort_name = excluded.cohort_name,
      acceptable_score = excluded.acceptable_score,
      score = excluded.score,
      status = excluded.status,
      source_note = excluded.source_note,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    userId,
    student.cohort_name || String(req.body.cohort || "Cohort 1"),
    subject,
    acceptableScore,
    score,
    status,
    `Updated by ${req.user.first_name} ${req.user.last_name}`
  );
  flash(req, "HESI score saved.");
  res.redirect(`/admin/hesi?cohort=${encodeURIComponent(String(req.body.cohort || student.cohort_name || "Cohort 1"))}`);
});

app.get("/admin/students", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const students = db.prepare(`
    SELECT u.*,
      COUNT(DISTINCT e.id) AS enrollment_count,
      COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) AS completed_count,
      COUNT(DISTINCT rc.id) AS checklist_count,
      COUNT(DISTINCT CASE WHEN rc.status IN ('approved','waived') THEN rc.id END) AS checklist_complete,
      COUNT(DISTINCT CASE WHEN rc.file_storage_name IS NOT NULL THEN rc.id END) AS checklist_uploads
    FROM users u
    LEFT JOIN enrollments e ON e.user_id = u.id
    LEFT JOIN student_record_checklist rc ON rc.user_id = u.id
    WHERE u.role = 'student'
    GROUP BY u.id
    ORDER BY u.last_name, u.first_name
  `).all();

  const courses = db.prepare("SELECT id, title FROM courses WHERE published = 1 ORDER BY title").all();
  const body = `
    <div class="page-head">
      <div>
        <h1>Students</h1>
        <p>Create student portal accounts, enroll students in programs, and reset passwords when needed.</p>
      </div>
      <div class="actions">
        <a class="button" href="/admin/hesi">HESI Scores</a>
      </div>
    </div>
    <section class="grid cols-2">
      <form class="card" method="post" action="/admin/students">
        <h2>New student</h2>
        <div class="form-grid">
          <div><label>First name</label><input name="firstName" required></div>
          <div><label>Last name</label><input name="lastName" required></div>
          <div><label>Email</label><input name="email" type="email" required></div>
          <div><label>Phone</label><input name="phone"></div>
          <div><label>Password</label><input name="password" value="StudentPass123!" required></div>
          <div><label>Uniform size</label><select name="uniformSize">${uniformSizeOptions()}</select></div>
          <div><label>Cohort</label><input name="cohortName" value="Cohort 2"></div>
          <div><label>Cohort start</label><input name="cohortStartDate" type="date" value="2026-07-01"></div>
          <div><label>Cohort end</label><input name="cohortEndDate" type="date" value="2027-07-31"></div>
          <div>
            <label>Class access</label>
            <select name="organizationStatus">
              <option value="not_organized" selected>Locked until organized</option>
              <option value="organized">Organized / ready for class</option>
            </select>
          </div>
          <div><label>Enroll in course</label><select name="courseId"><option value="">No enrollment yet</option>${courses.map((course) => `<option value="${course.id}">${escapeHtml(course.title)}</option>`).join("")}</select></div>
          <div class="span-2"><label>Lock reason</label><input name="classLockReason" value="Pending registrar organization and clearance."></div>
        </div>
        <button type="submit">Create student</button>
      </form>
      <div class="card">
        <h2>Registrar checklist</h2>
        <p class="muted">Interactive student record review with uploads, notes, status tracking, and graduation readiness controls.</p>
        <div class="registrar-mini-list">
          ${registrarChecklistItems.map((item) => `<a href="#registrar-upload-matrix">${escapeHtml(item.title)}</a>`).join("")}
        </div>
        <p class="muted registrar-mini-help">Select a student below, then click any checklist item to upload or review documents.</p>
      </div>
    </section>
    <section class="table-card registrar-upload-matrix" id="registrar-upload-matrix" style="margin-top:18px">
      <div class="table-card-head">
        <div>
          <h2>Actual Registrar Document Checklist</h2>
          <p class="muted">Click an item to open that student file, upload documents, add notes, and mark status.</p>
        </div>
      </div>
      <table>
        <thead><tr><th>Student</th><th>Progress</th><th>Checklist upload buttons</th></tr></thead>
        <tbody>
          ${students.map((student) => `
            <tr>
              <td><strong>${escapeHtml(student.last_name)}, ${escapeHtml(student.first_name)}</strong><br><span class="muted">${escapeHtml(student.email)}</span></td>
              <td>
                <strong>${escapeHtml(student.checklist_complete || 0)}/${escapeHtml(registrarChecklistItems.length)}</strong> ready<br>
                <span class="muted">${escapeHtml(student.checklist_uploads || 0)} uploaded</span>
              </td>
              <td>
                <div class="registrar-checklist-buttons">
                  ${registrarChecklistItems.map((item) => `
                    <a class="button small ghost" href="/admin/students/${student.id}/registrar-checklist#${escapeHtml(item.key)}">${escapeHtml(item.title)}</a>
                  `).join("")}
                </div>
              </td>
            </tr>
          `).join("") || `<tr><td class="empty" colspan="3">Create a student first, then registrar upload buttons will appear here.</td></tr>`}
        </tbody>
      </table>
    </section>
    <section class="table-card" style="margin-top:18px">
      <table>
        <thead><tr><th>Name</th><th>Contact</th><th>Class access</th><th>Registrar</th><th>Enrollments</th><th>Actions</th></tr></thead>
        <tbody>
          ${students.map((student) => `
            <tr>
              <td>
                <strong>${escapeHtml(student.last_name)}, ${escapeHtml(student.first_name)}</strong><br>
                <span class="muted">${escapeHtml(student.status)}</span>
                ${student.cohort_name ? `<br><span class="pill">${escapeHtml(student.cohort_name)}</span>` : ""}
                ${student.uniform_size ? `<br><span class="pill">Uniform: ${escapeHtml(student.uniform_size)}</span>` : ""}
                ${student.cohort_start_date || student.cohort_end_date ? `<br><span class="muted">${escapeHtml(date(student.cohort_start_date))} - ${escapeHtml(date(student.cohort_end_date))}</span>` : ""}
              </td>
              <td>${escapeHtml(student.email)}<br><span class="muted">${escapeHtml(student.phone || "")}</span></td>
              <td>
                <span class="pill ${student.organization_status === "not_organized" ? "orange" : ""}">${escapeHtml(student.organization_status === "not_organized" ? "Locked" : "Organized")}</span>
                ${student.class_lock_reason ? `<br><span class="muted">${escapeHtml(student.class_lock_reason)}</span>` : ""}
              </td>
              <td>
                <strong>${escapeHtml(student.checklist_complete || 0)}/${escapeHtml(registrarChecklistItems.length)}</strong> ready<br>
                <span class="muted">${escapeHtml(student.checklist_uploads || 0)} upload${Number(student.checklist_uploads || 0) === 1 ? "" : "s"}</span><br>
                <a class="button small" href="/admin/students/${student.id}/registrar-checklist">Upload documents</a>
              </td>
              <td>${student.enrollment_count || 0} total<br><span class="muted">${student.completed_count || 0} completed</span></td>
              <td>
                <form method="post" action="/admin/students/${student.id}/class-access" class="actions">
                  <select name="organizationStatus">
                    <option value="organized" ${student.organization_status === "organized" ? "selected" : ""}>Organized</option>
                    <option value="not_organized" ${student.organization_status === "not_organized" ? "selected" : ""}>Lock access</option>
                  </select>
                  <input name="classLockReason" placeholder="Reason shown to student" value="${escapeHtml(student.class_lock_reason || "Pending registrar organization and clearance.")}">
                  <button class="small" type="submit">Save access</button>
                </form>
                <form method="post" action="/admin/students/${student.id}/uniform-size" class="actions">
                  <select name="uniformSize" aria-label="Uniform size for ${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}">
                    ${uniformSizeOptions(student.uniform_size || "")}
                  </select>
                  <button class="small ghost" type="submit">Save uniform</button>
                </form>
                <form method="post" action="/admin/students/${student.id}/reset-password" class="actions">
                  <input type="hidden" name="password" value="StudentPass123!">
                  <button class="small ghost" type="submit">Reset password</button>
                </form>
              </td>
            </tr>
          `).join("") || `<tr><td class="empty" colspan="6">No students yet.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
  render(req, res, "Students", body);
});

app.get("/admin/students/:id/registrar-checklist", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const student = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(Number(req.params.id));
  if (!student) return res.status(404).send("Student not found");
  const checklist = registrarChecklistForStudent(student.id);
  const progress = registrarProgress(checklist);
  const enrollmentRows = db.prepare(`
    SELECT e.*, c.title, c.category
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ?
    ORDER BY e.created_at DESC
  `).all(student.id);

  const body = `
    <div class="page-head">
      <div>
        <p class="eyebrow">Registrar Checklist</p>
        <h1>${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</h1>
        <p>${escapeHtml(student.email)} · BMHI-${escapeHtml(String(student.id).padStart(5, "0"))}</p>
      </div>
      <div class="actions">
        <a class="button ghost" href="/admin/students">Students</a>
        <a class="button ghost" href="/admin/billing">Billing</a>
      </div>
    </div>

    <section class="grid cols-4 registrar-stats">
      ${stat("Ready items", `${progress.complete}/${progress.total}`)}
      ${stat("Readiness", `${progress.percent}%`)}
      ${stat("Uploaded files", String(checklist.filter((item) => item.file_storage_name).length))}
      ${stat("Enrollments", String(enrollmentRows.length))}
    </section>

    <section class="registrar-workbench">
      <article class="card registrar-overview">
        <h2>Student file status</h2>
        ${progressBar(progress.percent)}
        <p class="muted">Approved or waived items count toward readiness. Uploaded files stay attached to each checklist item for registrar review.</p>
        <div class="registrar-mini-list registrar-anchor-list">
          ${checklist.map((item) => `<a href="#${escapeHtml(item.item_key)}">${escapeHtml(item.title)}</a>`).join("")}
        </div>
        <div class="registrar-timeline">
          ${enrollmentRows.map((row) => `<p><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.status)} · ${escapeHtml(row.progress)}% complete</span></p>`).join("") || `<p><strong>No enrollments</strong><span>Add the student to a course when ready.</span></p>`}
        </div>
      </article>

      <div class="registrar-checklist-grid">
        ${checklist.map((item) => `
          <article class="card registrar-item ${escapeHtml(item.status)}" id="${escapeHtml(item.item_key)}">
            <div class="registrar-item-head">
              <div>
                <h2>${escapeHtml(item.title)}</h2>
                <p>${escapeHtml(item.description)}</p>
              </div>
              <span class="pill ${item.status === "missing" ? "orange" : item.status === "approved" ? "" : "orange"}">${escapeHtml(item.status)}</span>
            </div>

            <form class="registrar-form" method="post" action="/admin/students/${student.id}/registrar-checklist/${escapeHtml(item.item_key)}">
              <label>Status</label>
              <select name="status">
                ${registrarStatuses.map((status) => `<option value="${status}" ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}
              </select>
              <label>Staff note</label>
              <textarea name="note" rows="3" placeholder="Add registrar notes, missing items, or review details.">${escapeHtml(item.note || "")}</textarea>
              <button class="small" type="submit">Save review</button>
            </form>

            <form class="registrar-upload" method="post" action="/admin/students/${student.id}/registrar-checklist/${escapeHtml(item.item_key)}/upload" enctype="multipart/form-data">
              <label>Upload file</label>
              <input type="file" name="document" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/*" required>
              <button class="small ghost" type="submit">${item.file_storage_name ? "Replace file" : "Upload file"}</button>
            </form>

            ${item.file_storage_name ? `
              <div class="registrar-file">
                <strong>${escapeHtml(item.file_original_name || "Uploaded file")}</strong>
                <span>${escapeHtml(formatBytes(item.file_size))} · ${escapeHtml(item.file_mime_type || "file")} · ${escapeHtml(item.uploaded_at ? formatMessageDate(item.uploaded_at) : "")}</span>
                <a class="button small ghost" href="/admin/students/${student.id}/registrar-checklist/${escapeHtml(item.item_key)}/file">Download</a>
              </div>
            ` : `<p class="muted registrar-file-empty">No file uploaded yet.</p>`}
          </article>
        `).join("")}
      </div>
    </section>
  `;
  render(req, res, "Registrar Checklist", body);
});

app.post("/admin/students/:id/registrar-checklist/:itemKey", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const student = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'student'").get(Number(req.params.id));
  if (!student) return res.status(404).send("Student not found");
  ensureRegistrarChecklist(student.id);
  const itemKey = String(req.params.itemKey || "");
  if (!registrarChecklistItems.some((item) => item.key === itemKey)) return res.status(404).send("Checklist item not found");
  const status = registrarStatuses.includes(String(req.body.status || "")) ? String(req.body.status) : "pending";
  db.prepare(`
    UPDATE student_record_checklist
    SET status = ?,
      note = ?,
      completed_at = CASE WHEN ? IN ('approved','waived') THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND item_key = ?
  `).run(status, String(req.body.note || "").trim(), status, student.id, itemKey);
  flash(req, "Registrar checklist item updated.");
  res.redirect(`/admin/students/${student.id}/registrar-checklist`);
});

app.post("/admin/students/:id/registrar-checklist/:itemKey/upload", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const student = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'student'").get(Number(req.params.id));
  if (!student) return res.status(404).send("Student not found");
  const itemKey = String(req.params.itemKey || "");
  if (!registrarChecklistItems.some((item) => item.key === itemKey)) return res.status(404).send("Checklist item not found");
  ensureRegistrarChecklist(student.id);

  upload.single("document")(req, res, (error) => {
    if (error) {
      flash(req, error.message || "Upload failed.");
      return res.redirect(`/admin/students/${student.id}/registrar-checklist`);
    }
    if (!req.file) {
      flash(req, "Choose a file to upload.");
      return res.redirect(`/admin/students/${student.id}/registrar-checklist`);
    }
    const existing = db.prepare("SELECT file_storage_name FROM student_record_checklist WHERE user_id = ? AND item_key = ?").get(student.id, itemKey);
    if (existing?.file_storage_name) {
      const oldPath = path.join(uploadDir, existing.file_storage_name);
      if (isPathInside(uploadDir, oldPath) && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    db.prepare(`
      UPDATE student_record_checklist
      SET file_original_name = ?,
        file_storage_name = ?,
        file_mime_type = ?,
        file_size = ?,
        uploaded_by = ?,
        uploaded_at = CURRENT_TIMESTAMP,
        status = CASE WHEN status = 'pending' THEN 'received' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND item_key = ?
    `).run(req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.user.id, student.id, itemKey);
    flash(req, "Document uploaded to registrar checklist.");
    res.redirect(`/admin/students/${student.id}/registrar-checklist`);
  });
});

app.get("/admin/students/:id/registrar-checklist/:itemKey/file", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const item = db.prepare(`
    SELECT rc.*
    FROM student_record_checklist rc
    JOIN users u ON u.id = rc.user_id
    WHERE rc.user_id = ? AND rc.item_key = ? AND u.role = 'student'
  `).get(Number(req.params.id), String(req.params.itemKey || ""));
  if (!item?.file_storage_name) return res.status(404).send("File not found");
  const filePath = path.join(uploadDir, item.file_storage_name);
  if (!isPathInside(uploadDir, filePath) || !fs.existsSync(filePath)) return res.status(404).send("File not found");
  res.download(filePath, item.file_original_name || item.file_storage_name);
});

app.post("/admin/students", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const password = String(req.body.password || "StudentPass123!");
  try {
    const organizationStatus = req.body.organizationStatus === "organized" ? "organized" : "not_organized";
    const classLockReason = organizationStatus === "not_organized"
      ? String(req.body.classLockReason || "Pending registrar organization and clearance.").trim()
      : null;
    const result = db.prepare(`
      INSERT INTO users (
        role, first_name, last_name, email, phone, password_hash,
        organization_status, class_lock_reason, cohort_name, cohort_start_date, cohort_end_date, uniform_size
      )
      VALUES ('student', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(req.body.firstName || "").trim(),
      String(req.body.lastName || "").trim(),
      String(req.body.email || "").trim().toLowerCase(),
      String(req.body.phone || "").trim(),
      bcrypt.hashSync(password, 12),
      organizationStatus,
      classLockReason,
      String(req.body.cohortName || "").trim() || null,
      String(req.body.cohortStartDate || "").trim() || null,
      String(req.body.cohortEndDate || "").trim() || null,
      uniformSizes.includes(String(req.body.uniformSize || "")) && req.body.uniformSize ? String(req.body.uniformSize) : null
    );

    if (req.body.courseId) {
      db.prepare("INSERT OR IGNORE INTO enrollments (user_id, course_id, source) VALUES (?, ?, 'manual')").run(result.lastInsertRowid, Number(req.body.courseId));
    }
    flash(req, "Student created.");
  } catch (error) {
    flash(req, `Could not create student: ${error.message}`);
  }
  res.redirect("/admin/students");
});

app.post("/admin/students/:id/class-access", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const organizationStatus = req.body.organizationStatus === "organized" ? "organized" : "not_organized";
  const classLockReason = organizationStatus === "not_organized"
    ? String(req.body.classLockReason || "Pending registrar organization and clearance.").trim()
    : null;
  db.prepare(`
    UPDATE users
    SET organization_status = ?, class_lock_reason = ?
    WHERE id = ? AND role = 'student'
  `).run(organizationStatus, classLockReason, Number(req.params.id));
  flash(req, organizationStatus === "organized" ? "Student class access unlocked." : "Student class access locked.");
  res.redirect("/admin/students");
});

app.post("/admin/students/:id/uniform-size", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const requestedSize = String(req.body.uniformSize || "");
  const uniformSize = uniformSizes.includes(requestedSize) && requestedSize ? requestedSize : null;
  db.prepare("UPDATE users SET uniform_size = ? WHERE id = ? AND role = 'student'").run(uniformSize, Number(req.params.id));
  flash(req, uniformSize ? `Uniform size saved: ${uniformSize}.` : "Uniform size cleared.");
  res.redirect("/admin/students");
});

app.post("/admin/students/:id/reset-password", requireAuth, requireRole("admin"), (req, res) => {
  const password = String(req.body.password || "StudentPass123!");
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ? AND role = 'student'").run(bcrypt.hashSync(password, 12), Number(req.params.id));
  flash(req, `Password reset to ${password}`);
  res.redirect("/admin/students");
});

app.get("/admin/financial-aid", requireAuth, requireRole("admin"), (req, res) => {
  const students = db.prepare(`
    SELECT id, first_name, last_name, email
    FROM users
    WHERE role = 'student'
    ORDER BY last_name, first_name
  `).all();
  const awards = db.prepare(`
    SELECT a.*, u.first_name, u.last_name, u.email,
      COALESCE(SUM(d.amount_cents), 0) AS scheduled_cents,
      COUNT(d.id) AS disbursement_count
    FROM financial_aid_awards a
    JOIN users u ON u.id = a.user_id
    LEFT JOIN financial_aid_disbursements d ON d.award_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `).all();
  const disbursements = db.prepare(`
    SELECT d.*, a.aid_type, u.first_name, u.last_name
    FROM financial_aid_disbursements d
    JOIN financial_aid_awards a ON a.id = d.award_id
    JOIN users u ON u.id = a.user_id
    ORDER BY d.disbursement_date
    LIMIT 12
  `).all();

  const body = `
    <div class="page-head">
      <div>
        <h1>Financial Aid Packaging</h1>
        <p>Package aid, offer awards to students, track acceptance, and schedule term disbursements.</p>
      </div>
      <a class="button ghost" href="/admin/features">Admin features</a>
    </div>

    <section class="grid cols-3">
      ${stat("Awards", String(awards.length))}
      ${stat("Offered aid", money(awards.filter((award) => award.status === "offered").reduce((sum, award) => sum + award.amount_cents, 0)))}
      ${stat("Accepted aid", money(awards.filter((award) => award.status === "accepted").reduce((sum, award) => sum + award.amount_cents, 0)))}
    </section>

    <section class="grid cols-2" style="margin-top:18px">
      <form class="card aid-package-form" method="post" action="/admin/financial-aid">
        <h2>Package financial aid</h2>
        <div class="form-grid">
          <div class="span-2">
            <label>Student</label>
            <select name="userId" required>
              ${students.map((student) => `<option value="${student.id}">${escapeHtml(student.last_name)}, ${escapeHtml(student.first_name)} · ${escapeHtml(student.email)}</option>`).join("")}
            </select>
          </div>
          <div><label>Term</label><input name="term" value="2026-27 Practical Nursing Term" required></div>
          <div>
            <label>Aid type</label>
            <select name="aidType" required>
              <option>BMHI Institutional Grant</option>
              <option>CareerSource Miami</option>
              <option>CareerSource Broward</option>
            </select>
          </div>
          <div><label>Source</label><input name="source" value="Institutional"></div>
          <div><label>Amount</label><input name="amount" value="500.00" inputmode="decimal" required></div>
          <div class="span-2"><label>Packaging note</label><textarea name="note">Aid package based on student financial need review.</textarea></div>
        </div>
        <button type="submit">Add package</button>
      </form>

      <article class="card">
        <h2>Disbursement queue</h2>
        ${disbursements.map((row) => `
          <p><strong>${escapeHtml(row.first_name)} ${escapeHtml(row.last_name)} · ${escapeHtml(row.aid_type)}</strong><br>
          <span class="muted">${date(row.disbursement_date)} · ${money(row.amount_cents)} · ${escapeHtml(row.status)}</span></p>
        `).join("") || `<p class="empty">No disbursements scheduled.</p>`}
      </article>
    </section>

    <section class="table-card" style="margin-top:18px">
      <table>
        <thead><tr><th>Student</th><th>Package</th><th>Status</th><th>Disbursements</th><th>Actions</th></tr></thead>
        <tbody>
          ${awards.map((award) => `
            <tr>
              <td><strong>${escapeHtml(award.last_name)}, ${escapeHtml(award.first_name)}</strong><br><span class="muted">${escapeHtml(award.email)}</span></td>
              <td><strong>${escapeHtml(award.aid_type)}</strong><br><span class="muted">${escapeHtml(award.term)} · ${escapeHtml(award.source)} · ${money(award.amount_cents)}</span></td>
              <td><span class="pill ${award.status === "offered" ? "orange" : ""}">${escapeHtml(award.status)}</span><br><span class="muted">${escapeHtml(award.note || "")}</span></td>
              <td>${escapeHtml(award.disbursement_count)} scheduled<br><span class="muted">${money(award.scheduled_cents)} total</span></td>
              <td>
                <form class="actions" method="post" action="/admin/financial-aid/${award.id}/status">
                  <select name="status">
                    ${["setup", "offered", "accepted", "declined", "canceled"].map((status) => `<option value="${status}" ${award.status === status ? "selected" : ""}>${status}</option>`).join("")}
                  </select>
                  <button class="small" type="submit">Save</button>
                </form>
                <form class="actions" method="post" action="/admin/financial-aid/${award.id}/disbursements" style="margin-top:8px">
                  <input name="date" type="date" value="2026-07-15" required>
                  <input name="amount" value="${(Number(award.amount_cents || 0) / 200).toFixed(2)}" inputmode="decimal" required>
                  <button class="small ghost" type="submit">Add disbursement</button>
                </form>
              </td>
            </tr>
          `).join("") || `<tr><td class="empty" colspan="5">No financial aid packages yet.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
  render(req, res, "Financial Aid", body);
});

app.post("/admin/financial-aid", requireAuth, requireRole("admin"), (req, res) => {
  const amount = dollarsToCents(req.body.amount);
  const status = "setup";
  const result = db.prepare(`
    INSERT INTO financial_aid_awards (user_id, term, aid_type, source, amount_cents, status, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(req.body.userId),
    String(req.body.term || "2026-27 Practical Nursing Term").trim(),
    String(req.body.aidType || "Institutional Aid").trim(),
    String(req.body.source || "Institutional").trim(),
    amount,
    status,
    String(req.body.note || "").trim()
  );
  if (amount > 0) {
    db.prepare(`
      INSERT INTO financial_aid_disbursements (award_id, disbursement_date, amount_cents, status)
      VALUES (?, ?, ?, 'scheduled')
    `).run(result.lastInsertRowid, "2026-07-15", Math.round(amount / 2));
    db.prepare(`
      INSERT INTO financial_aid_disbursements (award_id, disbursement_date, amount_cents, status)
      VALUES (?, ?, ?, 'scheduled')
    `).run(result.lastInsertRowid, "2026-08-15", amount - Math.round(amount / 2));
  }
  flash(req, "Financial aid package added in setup status.");
  res.redirect("/admin/financial-aid");
});

app.post("/admin/financial-aid/:id/status", requireAuth, requireRole("admin"), (req, res) => {
  const status = String(req.body.status || "setup");
  const offeredAt = status === "offered" ? new Date().toISOString().slice(0, 10) : null;
  const acceptedAt = status === "accepted" ? new Date().toISOString().slice(0, 10) : null;
  db.prepare(`
    UPDATE financial_aid_awards
    SET status = ?, offered_at = COALESCE(?, offered_at), accepted_at = COALESCE(?, accepted_at)
    WHERE id = ?
  `).run(status, offeredAt, acceptedAt, Number(req.params.id));
  flash(req, "Financial aid package updated.");
  res.redirect("/admin/financial-aid");
});

app.post("/admin/financial-aid/:id/disbursements", requireAuth, requireRole("admin"), (req, res) => {
  db.prepare(`
    INSERT INTO financial_aid_disbursements (award_id, disbursement_date, amount_cents, status)
    VALUES (?, ?, ?, 'scheduled')
  `).run(Number(req.params.id), String(req.body.date || new Date().toISOString().slice(0, 10)), dollarsToCents(req.body.amount));
  flash(req, "Disbursement scheduled.");
  res.redirect("/admin/financial-aid");
});

app.get("/admin/billing", requireAuth, requireRole("admin"), (req, res) => {
  const students = db.prepare(`
    SELECT id, first_name, last_name, email
    FROM users
    WHERE role = 'student'
    ORDER BY last_name, first_name
  `).all();
  const charges = db.prepare(`
    SELECT c.*, u.first_name, u.last_name, u.email
    FROM billing_charges c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC
    LIMIT 30
  `).all();
  const payments = db.prepare(`
    SELECT p.*, u.first_name, u.last_name
    FROM billing_payments p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.paid_at DESC
    LIMIT 20
  `).all();
  const plans = db.prepare(`
    SELECT p.*, u.first_name, u.last_name
    FROM billing_payment_plans p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.next_due_date
  `).all();
  const policy = db.prepare("SELECT * FROM billing_refund_policies WHERE active = 1 ORDER BY id DESC LIMIT 1").get();
  const totalCharges = db.prepare("SELECT COALESCE(SUM(amount_cents), 0) AS total FROM billing_charges WHERE status = 'posted'").get().total;
  const totalPayments = db.prepare("SELECT COALESCE(SUM(amount_cents), 0) AS total FROM billing_payments").get().total;

  const studentOptions = students.map((student) => `<option value="${student.id}">${escapeHtml(student.last_name)}, ${escapeHtml(student.first_name)} · ${escapeHtml(student.email)}</option>`).join("");
  const body = `
    <div class="page-head">
      <div>
        <h1>Student Billing</h1>
        <p>Set tuition and fees, post charges, record payments, manage payment plans, and review refund policy.</p>
      </div>
      <a class="button ghost" href="/admin/financial-aid">Financial Aid</a>
    </div>

    <section class="grid cols-4">
      ${stat("Posted charges", money(totalCharges))}
      ${stat("Payments", money(totalPayments))}
      ${stat("Receivable", money(Math.max(0, totalCharges - totalPayments)))}
      ${stat("Payment plans", String(plans.length))}
    </section>

    <section class="grid cols-3 billing-workbench" style="margin-top:18px">
      <form class="card" method="post" action="/admin/billing/charges">
        <h2>Post charge</h2>
        <label>Student</label><select name="userId" required>${studentOptions}</select>
        <label>Term</label><input name="term" value="2026-27 Practical Nursing Term" required>
        <label>Category</label><select name="category"><option>Tuition</option><option>Fee</option><option>Bookstore</option><option>Adjustment</option></select>
        <label>Description</label><input name="description" value="Tuition charge" required>
        <label>Amount</label><input name="amount" value="500.00" inputmode="decimal" required>
        <label>Due date</label><input name="dueDate" type="date" value="2026-07-15">
        <button type="submit">Post charge</button>
      </form>

      <form class="card" method="post" action="/admin/billing/payments">
        <h2>Record payment</h2>
        <label>Student</label><select name="userId" required>${studentOptions}</select>
        <label>Term</label><input name="term" value="2026-27 Practical Nursing Term" required>
        <label>Source</label><input name="source" value="Student payment" required>
        <label>Applied to</label><input name="appliedTo" value="Account" required>
        <label>Amount</label><input name="amount" value="250.00" inputmode="decimal" required>
        <label>Paid date</label><input name="paidAt" type="date" value="2026-07-15">
        <button type="submit">Record payment</button>
      </form>

      <form class="card" method="post" action="/admin/billing/payment-plans">
        <h2>Create payment plan</h2>
        <label>Student</label><select name="userId" required>${studentOptions}</select>
        <label>Term</label><input name="term" value="2026-27 Practical Nursing Term" required>
        <label>Plan name</label><input name="name" value="Monthly tuition plan" required>
        <label>Total plan amount</label><input name="total" value="900.00" inputmode="decimal" required>
        <label>Installment amount</label><input name="installment" value="300.00" inputmode="decimal" required>
        <label>Next due date</label><input name="nextDueDate" type="date" value="2026-08-15">
        <button type="submit">Create plan</button>
      </form>
    </section>

    <section class="grid cols-2" style="margin-top:18px">
      <article class="table-card">
        <table>
          <thead><tr><th>Recent charges</th><th>Term</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${charges.map((row) => `
              <tr>
                <td><strong>${escapeHtml(row.last_name)}, ${escapeHtml(row.first_name)}</strong><br><span class="muted">${escapeHtml(row.category)} · ${escapeHtml(row.description)}</span></td>
                <td>${escapeHtml(row.term)}<br><span class="muted">Due ${date(row.due_date)}</span></td>
                <td>${money(row.amount_cents)}</td>
                <td>${escapeHtml(row.status)}</td>
              </tr>
            `).join("") || `<tr><td class="empty" colspan="4">No charges posted.</td></tr>`}
          </tbody>
        </table>
      </article>

      <article class="table-card">
        <table>
          <thead><tr><th>Recent payments</th><th>Applied to</th><th>Amount</th><th>Date</th></tr></thead>
          <tbody>
            ${payments.map((row) => `
              <tr>
                <td><strong>${escapeHtml(row.last_name)}, ${escapeHtml(row.first_name)}</strong><br><span class="muted">${escapeHtml(row.source)}</span></td>
                <td>${escapeHtml(row.applied_to)}</td>
                <td>${money(row.amount_cents)}</td>
                <td>${date(row.paid_at)}</td>
              </tr>
            `).join("") || `<tr><td class="empty" colspan="4">No payments recorded.</td></tr>`}
          </tbody>
        </table>
      </article>
    </section>

    <section class="grid cols-2" style="margin-top:18px">
      <article class="card">
        <h2>Payment plans</h2>
        ${plans.map((plan) => `
          <p><strong>${escapeHtml(plan.first_name)} ${escapeHtml(plan.last_name)} · ${escapeHtml(plan.name)}</strong><br>
          <span class="muted">${money(plan.total_cents)} total · ${money(plan.installment_cents)} installment · Next due ${date(plan.next_due_date)} · ${escapeHtml(plan.status)}</span></p>
        `).join("") || `<p class="empty">No payment plans.</p>`}
      </article>
      <article class="card">
        <h2>Refund policy</h2>
        <p><strong>${escapeHtml(policy?.name || "No active policy")}</strong></p>
        <p class="muted">${escapeHtml(policy?.description || "Add a refund policy to complete billing setup.")}</p>
      </article>
    </section>
  `;
  render(req, res, "Student Billing", body);
});

app.post("/admin/billing/charges", requireAuth, requireRole("admin"), (req, res) => {
  db.prepare(`
    INSERT INTO billing_charges (user_id, term, category, description, amount_cents, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, 'posted')
  `).run(Number(req.body.userId), String(req.body.term || "").trim(), String(req.body.category || "Tuition"), String(req.body.description || "").trim(), dollarsToCents(req.body.amount), String(req.body.dueDate || ""));
  flash(req, "Charge posted.");
  res.redirect("/admin/billing");
});

app.post("/admin/billing/payments", requireAuth, requireRole("admin"), (req, res) => {
  db.prepare(`
    INSERT INTO billing_payments (user_id, term, source, applied_to, amount_cents, paid_at, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(Number(req.body.userId), String(req.body.term || "").trim(), String(req.body.source || "Student payment").trim(), String(req.body.appliedTo || "Account").trim(), dollarsToCents(req.body.amount), String(req.body.paidAt || new Date().toISOString().slice(0, 10)), "");
  flash(req, "Payment recorded.");
  res.redirect("/admin/billing");
});

app.post("/admin/billing/payment-plans", requireAuth, requireRole("admin"), (req, res) => {
  db.prepare(`
    INSERT INTO billing_payment_plans (user_id, term, name, total_cents, installment_cents, next_due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(Number(req.body.userId), String(req.body.term || "").trim(), String(req.body.name || "Payment plan").trim(), dollarsToCents(req.body.total), dollarsToCents(req.body.installment), String(req.body.nextDueDate || ""));
  flash(req, "Payment plan created.");
  res.redirect("/admin/billing");
});

app.get("/admin/courses", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const courses = db.prepare(`
    SELECT c.*,
      COUNT(DISTINCT e.id) AS enrollments,
      COUNT(DISTINCT cr.id) AS credentials
    FROM courses c
    LEFT JOIN enrollments e ON e.course_id = c.id
    LEFT JOIN credentials cr ON cr.enrollment_id = e.id
    GROUP BY c.id
    ORDER BY c.category, c.title
  `).all();
  const programCourses = courses.filter((course) => course.category !== "Practical Nursing Course" && !americanHeartAssociationSlugs.has(course.slug));
  const practicalNursingCourses = courses.filter((course) => course.category === "Practical Nursing Course");
  const americanHeartAssociationCourses = courses.filter((course) => americanHeartAssociationSlugs.has(course.slug));
  const totalEnrollments = courses.reduce((sum, course) => sum + Number(course.enrollments || 0), 0);
  const totalCredentials = courses.reduce((sum, course) => sum + Number(course.credentials || 0), 0);
  const renderCourseGroupCard = ({ title, description, category, credentialType, deliveryMode, childLabel, childCourses }) => `
    <article class="card admin-program-card featured">
      <div class="actions" style="justify-content:space-between">
        <span class="pill">${escapeHtml(credentialType)}</span>
        <span class="muted">${escapeHtml(String(childCourses.length))} courses</span>
      </div>
      <h2>${escapeHtml(title)}</h2>
      <p class="muted">${escapeHtml(description)}</p>
      <div class="meta"><span>${escapeHtml(category)}</span><span>${escapeHtml(deliveryMode)}</span></div>
      <p><strong>${escapeHtml(childCourses.reduce((sum, course) => sum + Number(course.enrollments || 0), 0))}</strong> enrollments · <strong>${escapeHtml(childCourses.reduce((sum, course) => sum + Number(course.credentials || 0), 0))}</strong> credentials</p>
      <div class="program-subcourses admin-program-subcourses">
        <h4>${escapeHtml(childLabel)}</h4>
        ${childCourses.map((child) => `
          <div class="program-subcourse">
            <div>
              <strong>${escapeHtml(child.title)}</strong>
              <small>${escapeHtml(child.hours)} hours · ${escapeHtml(child.credential_type)} · ${escapeHtml(child.enrollments)} enrollments</small>
            </div>
            <div class="actions">
              <a class="button small" href="/admin/courses/${child.id}">Manage</a>
              <a class="button small ghost" href="/admin/courses/${child.id}/student-view">Student View</a>
            </div>
          </div>
        `).join("")}
      </div>
    </article>
  `;
  const renderProgramCard = (course) => {
    const isPracticalNursing = course.slug === "practical-nursing";
    const childCourses = isPracticalNursing ? practicalNursingCourses : [];
    return `
      <article class="card admin-program-card ${isPracticalNursing ? "featured" : ""}">
        <div class="actions" style="justify-content:space-between">
          <span class="pill ${course.credential_type === "Diploma" ? "orange" : ""}">${escapeHtml(course.credential_type)}</span>
          <span class="muted">${escapeHtml(course.hours)} hours</span>
        </div>
        <h2>${escapeHtml(course.title)}</h2>
        <p class="muted">${escapeHtml(course.description)}</p>
        <div class="meta"><span>${escapeHtml(course.category)}</span><span>${escapeHtml(course.delivery_mode)}</span></div>
        ${courseTotalCost(course) ? `<p class="program-cost"><strong>${money(courseTotalCost(course))}</strong> total cost · ${money(course.tuition_cents)} tuition</p>` : ""}
        <p><strong>${escapeHtml(course.enrollments)}</strong> enrollments · <strong>${escapeHtml(course.credentials)}</strong> credentials</p>
        ${childCourses.length ? `
          <div class="program-subcourses admin-program-subcourses">
            <h4>PN courses under this program</h4>
            ${childCourses.map((child) => `
              <div class="program-subcourse">
                <div>
                  <strong>${escapeHtml(child.title)}</strong>
                  <small>${escapeHtml(child.hours)} hours · ${escapeHtml(child.credential_type)} · ${escapeHtml(child.enrollments)} enrollments</small>
                </div>
                <div class="actions">
                  <a class="button small" href="/admin/courses/${child.id}">Manage</a>
                  <a class="button small ghost" href="/admin/courses/${child.id}/student-view">Student View</a>
                </div>
              </div>
            `).join("")}
          </div>
        ` : ""}
        <div class="actions">
          <a class="button small" href="/admin/courses/${course.id}">Manage Program</a>
          <a class="button small ghost" href="/admin/courses/${course.id}/student-view">Student View</a>
        </div>
      </article>
    `;
  };

  const body = `
    <div class="page-head">
      <div>
        <h1>Programs and Courses</h1>
        <p>Manage BMHI programs from the Courses button. Practical Nursing and American Heart Association courses are grouped into their own sections alongside the other programs the school offers.</p>
      </div>
    </div>
    <section class="grid cols-4">
      ${stat("Program sections", String(programCourses.length + (americanHeartAssociationCourses.length ? 1 : 0)))}
      ${stat("PN course shells", String(practicalNursingCourses.length))}
      ${stat("AHA courses", String(americanHeartAssociationCourses.length))}
      ${stat("Enrollments", String(totalEnrollments))}
    </section>
    ${renderTuitionFeesSection(courses)}
    <section class="grid cols-2 admin-program-grid" style="margin-top:18px">
      ${programCourses.map(renderProgramCard).join("")}
      ${americanHeartAssociationCourses.length ? renderCourseGroupCard({
        title: "American Heart Association",
        description: "BLS, ACLS, and PALS certification course shells for roster management, lesson access, completion tracking, and certificates.",
        category: "Continuing Education",
        credentialType: "Certificate",
        deliveryMode: "Campus",
        childLabel: "American Heart Association courses",
        childCourses: americanHeartAssociationCourses
      }) : ""}
    </section>
  `;
  render(req, res, "Courses", body);
});

app.get("/admin/courses/:id", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(Number(req.params.id));
  if (!course) return res.status(404).send("Course not found");

  const modules = db.prepare(`
    SELECT m.*, COUNT(l.id) AS lesson_count
    FROM modules m
    LEFT JOIN lessons l ON l.module_id = m.id
    WHERE m.course_id = ?
    GROUP BY m.id
    ORDER BY m.position
  `).all(course.id);

  const moduleLessons = db.prepare(`
    SELECT l.*, m.title AS module_title
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE m.course_id = ?
    ORDER BY m.position, l.position
  `).all(course.id);

  const enrollments = db.prepare(`
    SELECT e.*, u.first_name, u.last_name, u.email, cr.id AS credential_id
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    LEFT JOIN credentials cr ON cr.enrollment_id = e.id
    WHERE e.course_id = ?
    ORDER BY u.last_name, u.first_name
  `).all(course.id);

  const availableStudents = db.prepare(`
    SELECT id, first_name, last_name, email
    FROM users
    WHERE role = 'student'
      AND id NOT IN (SELECT user_id FROM enrollments WHERE course_id = ?)
    ORDER BY last_name, first_name
  `).all(course.id);
  const hiddenSections = parseHiddenSections(course);
  const childCourses = course.slug === "practical-nursing"
    ? db.prepare(`
      SELECT c.*,
        COUNT(DISTINCT e.id) AS enrollments,
        COUNT(DISTINCT cr.id) AS credentials
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.id
      LEFT JOIN credentials cr ON cr.enrollment_id = e.id
      WHERE c.category = 'Practical Nursing Course'
      GROUP BY c.id
      ORDER BY c.title
    `).all()
    : [];

  const body = `
    <div class="page-head">
      <div>
        <h1>${escapeHtml(course.title)}</h1>
        <p>${escapeHtml(course.description)}</p>
      </div>
      <div class="actions">
        <a class="button" href="/admin/courses/${course.id}/tools">Course Tools</a>
        <a class="button" href="/admin/courses/${course.id}/student-view">Student View</a>
        <a class="button ghost" href="/admin/courses/${course.id}">Instructor View</a>
        <a class="button ghost" href="/admin/courses">Back</a>
      </div>
    </div>
    <section class="grid cols-3">
      ${stat("Credential", course.credential_type)}
      ${stat("Clock hours", String(course.hours))}
      ${stat("Total cost", courseTotalCost(course) ? money(courseTotalCost(course)) : "Not set")}
    </section>
    <section class="card course-toolkit-card" style="margin-top:18px">
      <div class="actions" style="justify-content:space-between">
        <div>
          <h2>Course Construction Toolkit</h2>
          <p class="muted">Customize course content, assessment, collaboration, outcomes, analytics, and integrations for this course shell.</p>
        </div>
        <a class="button small" href="/admin/courses/${course.id}/tools">Open tools</a>
      </div>
      ${renderLmsToolkit(course, { compact: true })}
    </section>
    ${childCourses.length ? `
      <section class="card" style="margin-top:18px">
        <div class="actions" style="justify-content:space-between">
          <div>
            <h2>Courses under Practical Nursing</h2>
            <p class="muted">Manage the course shells students can add inside the Practical Nursing program.</p>
          </div>
          <a class="button small ghost" href="/admin/courses">All courses</a>
        </div>
        <div class="program-subcourses admin-program-subcourses">
          ${childCourses.map((child) => `
            <div class="program-subcourse">
              <div>
                <strong>${escapeHtml(child.title)}</strong>
                <small>${escapeHtml(child.hours)} hours · ${escapeHtml(child.credential_type)} · ${escapeHtml(child.enrollments)} enrollments · ${escapeHtml(child.credentials)} credentials</small>
              </div>
              <div class="actions">
                <a class="button small" href="/admin/courses/${child.id}">Manage</a>
                <a class="button small ghost" href="/admin/courses/${child.id}/student-view">Student View</a>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    ` : ""}
    <section class="card" style="margin-top:18px">
      <h2>Edit course details</h2>
      <form method="post" action="/admin/courses/${course.id}/details">
        <div class="form-grid">
          <div class="span-2"><label>Course title</label><input name="title" value="${escapeHtml(course.title)}" required></div>
          <div><label>Clock hours</label><input name="hours" type="number" min="0" value="${escapeHtml(course.hours)}"></div>
          <div><label>Credential</label><input name="credentialType" value="${escapeHtml(course.credential_type)}"></div>
          <div><label>Delivery mode</label><input name="deliveryMode" value="${escapeHtml(course.delivery_mode)}"></div>
          <div><label>Category</label><input name="category" value="${escapeHtml(course.category)}"></div>
          <div><label>Tuition</label><input name="tuition" value="${escapeHtml((Number(course.tuition_cents || 0) / 100).toFixed(2))}" inputmode="decimal"></div>
          <div><label>Books/Supplies</label><input name="booksSupplies" value="${escapeHtml((Number(course.books_supplies_cents || 0) / 100).toFixed(2))}" inputmode="decimal"></div>
          <div><label>Registration fee</label><input name="registrationFee" value="${escapeHtml((Number(course.registration_fee_cents || 0) / 100).toFixed(2))}" inputmode="decimal"></div>
          <div class="span-2"><label>Description</label><textarea name="description" required>${escapeHtml(course.description)}</textarea></div>
        </div>
        <button type="submit">Save course details</button>
      </form>
    </section>
    <section class="card" style="margin-top:18px">
      <h2>Course section visibility</h2>
      <p class="muted">Choose which course navigation sections students can see. Home is always visible.</p>
      <form method="post" action="/admin/courses/${course.id}/sections">
        <div class="section-visibility-grid">
          <label class="section-toggle locked">
            <input type="checkbox" checked disabled>
            <span>Home</span>
            <small>Always visible</small>
          </label>
          ${hideableCourseSections.map((section) => `
            <label class="section-toggle">
              <input type="checkbox" name="visibleSections" value="${escapeHtml(section)}" ${hiddenSections.has(section) ? "" : "checked"}>
              <span>${escapeHtml(section)}</span>
              <small>${hiddenSections.has(section) ? "Hidden from students" : "Visible to students"}</small>
            </label>
          `).join("")}
        </div>
        <button type="submit">Save section visibility</button>
      </form>
    </section>
    <section class="grid cols-2" style="margin-top:18px">
      <div class="card">
        <h2>Modules</h2>
        ${modules.map((module) => `<p><strong>${escapeHtml(module.position)}. ${escapeHtml(module.title)}</strong><br><span class="muted">${module.lesson_count} lessons</span></p>`).join("")}
        <h3>Add lesson</h3>
        <form method="post" action="/admin/courses/${course.id}/lessons">
          <div class="form-grid">
            <div><label>Module</label><select name="moduleId">${modules.map((module) => `<option value="${module.id}">${escapeHtml(module.title)}</option>`).join("")}</select></div>
            <div><label>Duration minutes</label><input name="duration" type="number" value="30" min="1"></div>
            <div class="span-2"><label>Title</label><input name="title" required></div>
            <div class="span-2"><label>External lesson link</label><input name="externalUrl" type="url" placeholder="https://www.youtube.com/watch?v=..."></div>
            <div class="span-2"><label>Content</label><textarea name="content" required></textarea></div>
          </div>
          <button type="submit">Add lesson</button>
        </form>
      </div>
      <div class="card">
        <h2>Edit lesson outline</h2>
        ${moduleLessons.map((lesson) => `
          <form class="lesson-edit-form" method="post" action="/admin/courses/${course.id}/lessons/${lesson.id}">
            <p><strong>${escapeHtml(lesson.module_title)}</strong></p>
            <label>Lesson title</label>
            <input name="title" value="${escapeHtml(lesson.title)}" required>
            <label>Duration minutes</label>
            <input name="duration" type="number" min="1" value="${escapeHtml(lesson.duration_minutes)}">
            <label>External lesson link</label>
            <input name="externalUrl" type="url" value="${escapeHtml(lesson.external_url || "")}" placeholder="https://www.youtube.com/watch?v=...">
            <label>Content</label>
            <textarea name="content" required>${escapeHtml(lesson.content)}</textarea>
            <button class="small" type="submit">Save lesson</button>
          </form>
        `).join("")}
      </div>
    </section>
    <section class="card" style="margin-top:18px">
      <h2>Enroll a student</h2>
      <form method="post" action="/admin/enrollments" class="actions">
        <input type="hidden" name="courseId" value="${course.id}">
        <select name="userId" required>${availableStudents.map((student) => `<option value="${student.id}">${escapeHtml(student.last_name)}, ${escapeHtml(student.first_name)} · ${escapeHtml(student.email)}</option>`).join("")}</select>
        <button type="submit">Enroll</button>
      </form>
    </section>
    <section class="table-card" style="margin-top:18px">
      <table>
        <thead><tr><th>Student</th><th>Status</th><th>Progress</th><th>Credential</th><th>Actions</th></tr></thead>
        <tbody>
          ${enrollments.map((row) => `
            <tr>
              <td><strong>${escapeHtml(row.last_name)}, ${escapeHtml(row.first_name)}</strong><br><span class="muted">${escapeHtml(row.email)}</span></td>
              <td>${escapeHtml(row.status)}<br><span class="muted">Started ${date(row.start_date)}</span></td>
              <td>${progressBar(row.progress)}<span class="muted">${escapeHtml(row.progress)}%</span></td>
              <td>${row.credential_id ? `<a href="/credentials/${row.credential_id}/print">Print credential</a>` : `<span class="muted">Not issued</span>`}</td>
              <td>
                <form class="actions" method="post" action="/admin/enrollments/${row.id}/status">
                  <select name="status">
                    ${["active", "completed", "withdrawn", "hold"].map((status) => `<option value="${status}" ${row.status === status ? "selected" : ""}>${status}</option>`).join("")}
                  </select>
                  <input name="progress" type="number" min="0" max="100" value="${row.progress}">
                  <input name="finalGrade" placeholder="Final grade" value="${escapeHtml(row.final_grade || "")}">
                  <button class="small" type="submit">Save</button>
                </form>
                <form method="post" action="/admin/enrollments/${row.id}/issue-credential" style="margin-top:8px">
                  <button class="small ghost" type="submit">Issue ${escapeHtml(course.credential_type)}</button>
                </form>
              </td>
            </tr>
          `).join("") || `<tr><td class="empty" colspan="5">No students enrolled in this course yet.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
  render(req, res, course.title, body);
});

app.get("/admin/courses/:id/tools", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(Number(req.params.id));
  if (!course) return res.status(404).send("Course not found");
  const hiddenSections = parseHiddenSections(course);
  const imports = db.prepare(`
    SELECT ci.*, u.first_name, u.last_name
    FROM course_imports ci
    LEFT JOIN users u ON u.id = ci.uploaded_by
    WHERE ci.course_id = ?
    ORDER BY ci.uploaded_at DESC
  `).all(course.id);
  const importStatuses = ["uploaded", "reviewed", "imported", "failed"];

  const body = `
    <div class="page-head">
      <div>
        <h1>Course Construction Toolkit</h1>
        <p>${escapeHtml(course.title)} tools for content, assessment, collaboration, outcomes, analytics, and integrations.</p>
      </div>
      <div class="actions">
        <a class="button" href="/admin/courses/${course.id}/student-view">Student View</a>
        <a class="button ghost" href="/admin/courses/${course.id}">Instructor View</a>
        <a class="button ghost" href="/admin/courses">All Courses</a>
      </div>
    </div>

    <section class="grid cols-3">
      ${stat("Course", course.title)}
      ${stat("Clock hours", String(course.hours))}
      ${stat("Credential", course.credential_type)}
    </section>

    <section class="card" style="margin-top:18px">
      <div class="actions" style="justify-content:space-between">
        <div>
          <h2>Built-in LMS tools</h2>
          <p class="muted">Toggle student-facing tools below, then use this map to plan course design and instructor workflows.</p>
        </div>
        <a class="button small ghost" href="#course-import-tool">Course Import Tool</a>
      </div>
      ${renderLmsToolkit(course)}
    </section>

    <section class="card" style="margin-top:18px">
      <h2>Student course navigation</h2>
      <p class="muted">Home is always visible. These settings customize what students can access in this course shell.</p>
      <form method="post" action="/admin/courses/${course.id}/sections">
        <input type="hidden" name="redirectTo" value="/admin/courses/${course.id}/tools">
        <div class="section-visibility-grid tool-customize-grid">
          <label class="section-toggle locked">
            <input type="checkbox" checked disabled>
            <span>Home</span>
            <small>Always visible</small>
          </label>
          ${hideableCourseSections.map((section) => `
            <label class="section-toggle">
              <input type="checkbox" name="visibleSections" value="${escapeHtml(section)}" ${hiddenSections.has(section) ? "" : "checked"}>
              <span>${escapeHtml(section)}</span>
              <small>${hiddenSections.has(section) ? "Hidden from students" : "Visible to students"}</small>
            </label>
          `).join("")}
        </div>
        <button type="submit">Save LMS tool visibility</button>
      </form>
    </section>

    <section class="grid cols-2" style="margin-top:18px" id="course-import-tool">
      <div class="card course-import-upload">
        <h2>Course Import Tool</h2>
        <p class="muted">Upload existing LMS packages or course materials for review before they are copied into modules, pages, assignments, quizzes, or files.</p>
        <form method="post" action="/admin/courses/${course.id}/imports" enctype="multipart/form-data">
          <label>LMS package or course material</label>
          <input type="file" name="coursePackage" accept=".zip,.imscc,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" required>
          <label>Import notes</label>
          <textarea name="note" placeholder="Example: PN Term 1 modules, quizzes, and skills checklists from prior LMS."></textarea>
          <button type="submit">Upload course import</button>
        </form>
      </div>
      <div class="card">
        <h2>Import history</h2>
        <div class="course-import-list">
          ${imports.map((item) => `
            <form class="course-import-item" method="post" action="/admin/courses/${course.id}/imports/${item.id}">
              <div class="course-import-head">
                <div>
                  <strong>${escapeHtml(item.file_original_name)}</strong>
                  <small>${escapeHtml(formatBytes(item.file_size))} · Uploaded ${date(String(item.uploaded_at || "").slice(0, 10))}${item.first_name ? ` by ${escapeHtml(item.first_name)} ${escapeHtml(item.last_name)}` : ""}</small>
                </div>
                <a class="button small ghost" href="/admin/course-imports/${item.id}/download">Download</a>
              </div>
              <label>Status</label>
              <select name="status">
                ${importStatuses.map((status) => `<option value="${status}" ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}
              </select>
              <label>Review notes</label>
              <textarea name="note">${escapeHtml(item.note || "")}</textarea>
              <button class="small" type="submit">Save import status</button>
            </form>
          `).join("") || `<p class="empty">No course imports uploaded yet.</p>`}
        </div>
      </div>
    </section>
  `;
  render(req, res, `${course.title} Tools`, body);
});

app.get("/admin/courses/:id/student-view", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(Number(req.params.id));
  if (!course) return res.status(404).send("Course not found");

  const lessons = db.prepare(`
    SELECT l.*, m.id AS module_id, m.title AS module_title, m.position AS module_position
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE m.course_id = ?
    ORDER BY m.position, l.position
  `).all(course.id);
  const gradeItems = db.prepare(`
    SELECT *
    FROM grade_items
    WHERE course_id = ?
    ORDER BY due_date IS NULL, due_date, id
  `).all(course.id);
  const enrollments = db.prepare(`
    SELECT e.*, u.id AS user_id, u.first_name, u.last_name, u.email, u.cohort_name, u.cohort_start_date, u.cohort_end_date
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    WHERE e.course_id = ?
    ORDER BY u.last_name, u.first_name
  `).all(course.id);
  const grades = db.prepare(`
    SELECT g.*
    FROM grades g
    JOIN enrollments e ON e.id = g.enrollment_id
    WHERE e.course_id = ?
  `).all(course.id);
  const announcements = courseAnnouncements(course.id);
  const calendarEvents = courseCalendarEvents(course.id);
  const allCourses = db.prepare("SELECT id, title, slug FROM courses WHERE published = 1 ORDER BY category, title").all();

  const moduleGroups = lessons.reduce((groups, lesson) => {
    const existing = groups.find((group) => group.id === lesson.module_id);
    if (existing) {
      existing.lessons.push(lesson);
    } else {
      groups.push({
        id: lesson.module_id,
        title: lesson.module_title,
        position: lesson.module_position,
        lessons: [lesson]
      });
    }
    return groups;
  }, []);

  const firstLesson = lessons[0];
  const navItems = courseNavItems;
  const adminCourseBaseHref = `/admin/courses/${course.id}/student-view`;
  const courseCode = canvasCourseCode(course);
  const startTiles = [
    { icon: "book", label: "Course Syllabus", href: `${adminCourseBaseHref}?view=syllabus` },
    { icon: "brain", label: "Learning Modules", href: `${adminCourseBaseHref}?view=modules` },
    { icon: "check", label: "Assignments & Grades", href: `${adminCourseBaseHref}?view=syllabus#course-assignments` },
    { icon: "question", label: "Course Q & A", href: firstLesson ? `${adminCourseBaseHref}?lesson=${firstLesson.id}` : adminCourseBaseHref }
  ];
  const activeView = String(req.query.view || "");
  const body = activeView === "modules" ? `
    <section class="canvas-course-shell canvas-modules-shell instructor-preview">
      <aside class="canvas-global-rail">
        <img src="/assets/bmhi-seal-blue.jpeg" alt="BMHI">
        <span>${escapeHtml(initialsFor(req.user))}</span>
        <i></i><i></i><i></i><i></i><i></i>
      </aside>

      ${renderStudentCanvasHeader(courseCode, adminCourseBaseHref, [
        { label: courseCode, href: adminCourseBaseHref },
        { label: "Modules" }
      ])}

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(navItems, adminCourseBaseHref, "Modules", firstLesson?.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>

      ${renderCanvasModulesPage({
        courseCode,
        baseHref: adminCourseBaseHref,
        courseId: course.id,
        moduleGroups,
        instructor: true
      })}
    </section>
  ` : activeView === "announcements" ? `
    <section class="canvas-course-shell instructor-preview">
      <aside class="canvas-global-rail">
        <img src="/assets/bmhi-seal-blue.jpeg" alt="BMHI">
        <span>${escapeHtml(initialsFor(req.user))}</span>
        <i></i><i></i><i></i><i></i><i></i>
      </aside>

      ${renderStudentCanvasHeader(courseCode, adminCourseBaseHref, [
        { label: courseCode, href: adminCourseBaseHref },
        { label: "Announcements" }
      ])}

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(navItems, adminCourseBaseHref, "Announcements", firstLesson?.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>

      ${renderCourseAnnouncementsPage({
        course,
        courseCode,
        baseHref: adminCourseBaseHref,
        announcements,
        instructor: true
      })}
    </section>
  ` : activeView === "calendar" ? `
    <section class="canvas-course-shell instructor-preview">
      <aside class="canvas-global-rail">
        <img src="/assets/bmhi-seal-blue.jpeg" alt="BMHI">
        <span>${escapeHtml(initialsFor(req.user))}</span>
        <i></i><i></i><i></i><i></i><i></i>
      </aside>

      ${renderStudentCanvasHeader(courseCode, adminCourseBaseHref, [
        { label: courseCode, href: adminCourseBaseHref },
        { label: "Calendar" }
      ])}

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(navItems, adminCourseBaseHref, "Calendar", firstLesson?.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>

      ${renderMonthCalendarPage({
        events: calendarEvents,
        courses: allCourses,
        currentCourseId: course.id,
        instructor: true,
        postAction: `/admin/courses/${course.id}/calendar-events`
      })}
    </section>
  ` : activeView === "grades" ? `
    <section class="canvas-course-shell instructor-gradebook-shell">
      <aside class="canvas-global-rail">
        <img src="/assets/bmhi-seal-blue.jpeg" alt="BMHI">
        <span>${escapeHtml(initialsFor(req.user))}</span>
        <i></i><i></i><i></i><i></i><i></i>
      </aside>

      ${renderStudentCanvasHeader(courseCode, adminCourseBaseHref, [
        { label: courseCode, href: adminCourseBaseHref },
        { label: "Grades" }
      ])}

      ${renderInstructorGradesPage({
        course,
        courseCode,
        baseHref: adminCourseBaseHref,
        gradeItems,
        enrollments,
        grades
      })}
    </section>
  ` : activeView === "people" ? `
    <section class="canvas-course-shell instructor-preview">
      <aside class="canvas-global-rail">
        <img src="/assets/bmhi-seal-blue.jpeg" alt="BMHI">
        <span>${escapeHtml(initialsFor(req.user))}</span>
        <i></i><i></i><i></i><i></i><i></i>
      </aside>

      ${renderStudentCanvasHeader(courseCode, adminCourseBaseHref, [
        { label: courseCode, href: adminCourseBaseHref },
        { label: "People" }
      ])}

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(navItems, adminCourseBaseHref, "People", firstLesson?.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>

      ${renderInstructorPeoplePage({
        course,
        courseCode,
        baseHref: adminCourseBaseHref,
        enrollments,
        instructor: req.user
      })}
    </section>
  ` : activeView === "settings" ? `
    <section class="canvas-course-shell instructor-preview">
      <aside class="canvas-global-rail">
        <img src="/assets/bmhi-seal-blue.jpeg" alt="BMHI">
        <span>${escapeHtml(initialsFor(req.user))}</span>
        <i></i><i></i><i></i><i></i><i></i>
      </aside>

      ${renderStudentCanvasHeader(courseCode, adminCourseBaseHref, [
        { label: courseCode, href: adminCourseBaseHref },
        { label: "Settings" }
      ])}

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(navItems, adminCourseBaseHref, "Settings", firstLesson?.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>

      ${renderInstructorSettingsPage({
        course,
        courseCode,
        baseHref: adminCourseBaseHref,
        enrollments,
        instructor: req.user
      })}
    </section>
  ` : activeView === "syllabus" ? `
    <section class="canvas-course-shell canvas-syllabus-shell instructor-preview">
      <aside class="canvas-global-rail">
        <img src="/assets/bmhi-seal-blue.jpeg" alt="BMHI">
        <span>${escapeHtml(initialsFor(req.user))}</span>
        <i></i><i></i><i></i><i></i><i></i>
      </aside>

      <header class="canvas-populi-bar">
        <a href="/admin/courses/${course.id}/student-view">${escapeHtml(courseCode)}</a>
        <a href="/admin/courses/${course.id}">Instructor View</a>
        <a href="/admin/courses/${course.id}">Edit Course</a>
        <a href="/admin/courses">All Courses</a>
        <span class="canvas-top-spacer"></span>
        <a class="canvas-top-button" href="/admin/courses/${course.id}/student-view">View as Student</a>
        <a class="canvas-top-button" href="/admin/courses/${course.id}/student-view?view=syllabus">Immersive Reader</a>
      </header>

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(navItems, adminCourseBaseHref, "Syllabus", firstLesson?.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>
      ${renderCourseSyllabus({
        courseTitle: course.title,
        courseDescription: course.description,
        courseCode,
        courseHours: course.hours,
        courseCategory: course.category,
        gradeItems,
        lessons,
        baseHref: adminCourseBaseHref
      })}
    </section>
  ` : `
    <section class="canvas-course-shell instructor-preview">
      <aside class="canvas-global-rail">
        <img src="/assets/bmhi-seal-blue.jpeg" alt="BMHI">
        <span>${escapeHtml(initialsFor(req.user))}</span>
        <i></i><i></i><i></i><i></i><i></i>
      </aside>

      <header class="canvas-populi-bar">
        <a href="/admin/courses/${course.id}/student-view">${escapeHtml(courseCode)}</a>
        <a href="/admin/courses/${course.id}">Instructor View</a>
        <a href="/admin/courses/${course.id}">Edit Course</a>
        <a href="/admin/courses">All Courses</a>
        <span class="canvas-top-spacer"></span>
        <a class="canvas-top-button" href="/admin/courses/${course.id}/student-view">View as Student</a>
        <a class="canvas-top-button" href="/admin/courses/${course.id}/student-view?view=syllabus">Immersive Reader</a>
      </header>

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(navItems, adminCourseBaseHref, "Home", firstLesson?.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>

      <main class="canvas-course-main">
        <div class="canvas-mini-head">
          <span></span>
          <strong>${escapeHtml(courseCode)}</strong>
        </div>
        <div class="preview-ribbon">
          <strong>Student View Preview</strong>
          <span>Use Instructor View to edit course details, lessons, enrollments, and credentials.</span>
          <a class="button small" href="/admin/courses/${course.id}">Instructor View</a>
        </div>
        <h1>${escapeHtml(course.title)}</h1>
        <div class="canvas-rule"></div>
        <section class="canvas-home-card">
          <h2>${escapeHtml(course.title)}</h2>
          <p>${escapeHtml(course.description)}</p>
          <p><strong>Course details:</strong> ${escapeHtml(course.hours)} clock hours · ${escapeHtml(course.credential_type)} · ${escapeHtml(course.delivery_mode)}</p>
        </section>

        <section class="canvas-start">
          <h2>Start Here</h2>
          <div class="canvas-rule thin"></div>
          ${renderStartTiles(startTiles)}
        </section>

        <section class="canvas-modules">
          <h2>Learning Modules</h2>
          ${moduleGroups.map((module) => `
            <article>
              <strong>${escapeHtml(module.position)}. ${escapeHtml(module.title)}</strong>
              <span>${escapeHtml(module.lessons.length)} lessons</span>
              <a href="${module.lessons[0] ? `/admin/courses/${course.id}/student-view?lesson=${module.lessons[0].id}` : `/admin/courses/${course.id}/student-view`}">Open</a>
            </article>
          `).join("") || `<p class="empty">No modules have been added yet.</p>`}
        </section>

        <footer class="canvas-footer">
          <strong>${escapeHtml(course.slug.toUpperCase())}</strong> | ${escapeHtml(course.hours)} Contact Hours | ${escapeHtml(course.category)}
        </footer>
      </main>

      <aside class="canvas-rightbar">
        ${renderInstructorCourseActions(course.id)}
        ${renderCourseToDo(gradeItems, adminCourseBaseHref)}
        ${renderComingUp(lessons.slice(1), adminCourseBaseHref)}
      </aside>
    </section>
  `;
  render(req, res, `${course.title} Student View`, body, { courseCanvas: true });
});

app.post("/admin/courses/:id/announcements", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(Number(req.params.id));
  if (!course) return res.status(404).send("Course not found");
  const title = String(req.body.title || "").trim();
  const body = String(req.body.body || "").trim();
  if (!title || !body) {
    flash(req, "Add a title and message before posting an announcement.");
    return res.redirect(`/admin/courses/${course.id}/student-view?view=announcements#add-announcement`);
  }
  db.prepare(`
    INSERT INTO announcements (course_id, author_id, title, body, posted_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(course.id, req.user.id, title, body);
  flash(req, "Announcement posted.");
  res.redirect(`/admin/courses/${course.id}/student-view?view=announcements`);
});

app.post("/admin/courses/:id/calendar-events", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const routeCourse = db.prepare("SELECT id FROM courses WHERE id = ?").get(Number(req.params.id));
  if (!routeCourse) return res.status(404).send("Course not found");
  const selectedCourseId = Number(req.body.courseId || routeCourse.id);
  const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(selectedCourseId) || routeCourse;
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const startAt = String(req.body.startAt || "").replace("T", " ").trim();
  if (!title || !startAt) {
    flash(req, "Add an event title and date/time.");
    return res.redirect(`/admin/courses/${routeCourse.id}/student-view?view=calendar#add-calendar-event`);
  }
  db.prepare(`
    INSERT INTO calendar_events (course_id, title, description, event_type, start_at, created_by)
    VALUES (?, ?, ?, 'event', ?, ?)
  `).run(course.id, title, description, startAt.length === 16 ? `${startAt}:00` : startAt, req.user.id);
  flash(req, "Calendar event added.");
  res.redirect(`/admin/courses/${routeCourse.id}/student-view?view=calendar`);
});

app.post("/admin/courses/:id/details", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(Number(req.params.id));
  if (!course) return res.status(404).send("Course not found");
  db.prepare(`
    UPDATE courses
    SET title = ?, category = ?, description = ?, hours = ?, credential_type = ?, delivery_mode = ?,
      tuition_cents = ?, books_supplies_cents = ?, registration_fee_cents = ?
    WHERE id = ?
  `).run(
    String(req.body.title || "").trim(),
    String(req.body.category || "").trim(),
    String(req.body.description || "").trim(),
    Number(req.body.hours || 0),
    String(req.body.credentialType || "").trim(),
    String(req.body.deliveryMode || "").trim(),
    dollarsToCents(req.body.tuition),
    dollarsToCents(req.body.booksSupplies),
    dollarsToCents(req.body.registrationFee),
    course.id
  );
  flash(req, "Course details updated.");
  const redirectTo = String(req.body.redirectTo || "");
  res.redirect(redirectTo.startsWith(`/admin/courses/${course.id}`) ? redirectTo : `/admin/courses/${course.id}`);
});

app.post("/admin/courses/:id/sections", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(Number(req.params.id));
  if (!course) return res.status(404).send("Course not found");
  const selected = req.body.visibleSections
    ? Array.isArray(req.body.visibleSections)
      ? req.body.visibleSections
      : [req.body.visibleSections]
    : [];
  const visible = new Set(selected.map((section) => String(section)));
  const hidden = hideableCourseSections.filter((section) => !visible.has(section));
  db.prepare("UPDATE courses SET hidden_sections = ? WHERE id = ?").run(JSON.stringify(hidden), course.id);
  flash(req, "Course section visibility updated.");
  const redirectTo = String(req.body.redirectTo || "");
  res.redirect(redirectTo.startsWith(`/admin/courses/${course.id}`) ? redirectTo : `/admin/courses/${course.id}`);
});

app.post("/admin/courses/:id/imports", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(Number(req.params.id));
  if (!course) return res.status(404).send("Course not found");

  upload.single("coursePackage")(req, res, (error) => {
    if (error) {
      flash(req, error.message || "Upload failed.");
      return res.redirect(`/admin/courses/${course.id}/tools`);
    }
    if (!req.file) {
      flash(req, "Choose a course package or course material to upload.");
      return res.redirect(`/admin/courses/${course.id}/tools`);
    }
    db.prepare(`
      INSERT INTO course_imports (
        course_id, file_original_name, file_storage_name, file_mime_type, file_size, note, uploaded_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      course.id,
      req.file.originalname,
      req.file.filename,
      req.file.mimetype,
      req.file.size,
      String(req.body.note || "").trim(),
      req.user.id
    );
    flash(req, "Course import uploaded for review.");
    res.redirect(`/admin/courses/${course.id}/tools`);
  });
});

app.post("/admin/courses/:id/imports/:importId", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(Number(req.params.id));
  if (!course) return res.status(404).send("Course not found");
  const status = ["uploaded", "reviewed", "imported", "failed"].includes(req.body.status) ? req.body.status : "uploaded";
  const result = db.prepare(`
    UPDATE course_imports
    SET status = ?, note = ?
    WHERE id = ? AND course_id = ?
  `).run(status, String(req.body.note || "").trim(), Number(req.params.importId), course.id);
  if (!result.changes) return res.status(404).send("Course import not found");
  flash(req, "Course import status updated.");
  res.redirect(`/admin/courses/${course.id}/tools`);
});

app.get("/admin/course-imports/:id/download", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const item = db.prepare("SELECT * FROM course_imports WHERE id = ?").get(Number(req.params.id));
  if (!item?.file_storage_name) return res.status(404).send("Course import not found");
  const filePath = path.join(uploadDir, item.file_storage_name);
  if (!isPathInside(uploadDir, filePath) || !fs.existsSync(filePath)) return res.status(404).send("Course import file not found");
  res.download(filePath, item.file_original_name || item.file_storage_name);
});

app.post("/admin/courses/:id/lessons", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const nextPosition = db.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS next FROM lessons WHERE module_id = ?").get(Number(req.body.moduleId)).next;
  db.prepare("INSERT INTO lessons (module_id, title, content, external_url, duration_minutes, position) VALUES (?, ?, ?, ?, ?, ?)").run(
    Number(req.body.moduleId),
    String(req.body.title || "").trim(),
    String(req.body.content || "").trim(),
    normalizeExternalUrl(req.body.externalUrl),
    Number(req.body.duration || 30),
    nextPosition
  );
  flash(req, "Lesson added.");
  res.redirect(`/admin/courses/${Number(req.params.id)}`);
});

app.post("/admin/courses/:id/lessons/:lessonId", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const lesson = db.prepare(`
    SELECT l.id
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE l.id = ? AND m.course_id = ?
  `).get(Number(req.params.lessonId), Number(req.params.id));
  if (!lesson) return res.status(404).send("Lesson not found");
  db.prepare(`
    UPDATE lessons
    SET title = ?, content = ?, external_url = ?, duration_minutes = ?
    WHERE id = ?
  `).run(
    String(req.body.title || "").trim(),
    String(req.body.content || "").trim(),
    normalizeExternalUrl(req.body.externalUrl),
    Number(req.body.duration || 30),
    lesson.id
  );
  flash(req, "Lesson updated.");
  res.redirect(`/admin/courses/${Number(req.params.id)}`);
});

app.post("/admin/enrollments", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const userId = Number(req.body.userId);
  const courseId = Number(req.body.courseId);
  const existing = db.prepare("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?").get(userId, courseId);
  if (existing) {
    flash(req, "Student is already enrolled in this course.");
  } else {
    db.prepare("INSERT INTO enrollments (user_id, course_id, source) VALUES (?, ?, 'manual')").run(userId, courseId);
    flash(req, "Student enrolled.");
  }
  res.redirect(`/admin/courses/${Number(req.body.courseId)}`);
});

app.post("/admin/enrollments/:id/status", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const enrollment = db.prepare("SELECT course_id FROM enrollments WHERE id = ?").get(Number(req.params.id));
  if (!enrollment) return res.status(404).send("Enrollment not found");
  const status = String(req.body.status || "active");
  const completionDate = status === "completed" ? new Date().toISOString().slice(0, 10) : null;
  db.prepare(`
    UPDATE enrollments
    SET status = ?, progress = ?, final_grade = ?, completion_date = COALESCE(?, completion_date)
    WHERE id = ?
  `).run(status, Number(req.body.progress || 0), String(req.body.finalGrade || "").trim(), completionDate, Number(req.params.id));
  flash(req, "Enrollment updated.");
  res.redirect(`/admin/courses/${enrollment.course_id}`);
});

app.post("/admin/enrollments/:id/issue-credential", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const enrollment = db.prepare(`
    SELECT e.*, c.credential_type, c.id AS course_id
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.id = ?
  `).get(Number(req.params.id));
  if (!enrollment) return res.status(404).send("Enrollment not found");

  db.prepare(`
    INSERT OR IGNORE INTO credentials (enrollment_id, type, number, issuer_name)
    VALUES (?, ?, ?, ?)
  `).run(enrollment.id, enrollment.credential_type, credentialNumber(enrollment.id), `${req.user.first_name} ${req.user.last_name}`);

  db.prepare(`
    UPDATE enrollments
    SET status = 'completed', progress = 100, completion_date = COALESCE(completion_date, date('now'))
    WHERE id = ?
  `).run(enrollment.id);

  const credential = db.prepare("SELECT id FROM credentials WHERE enrollment_id = ?").get(enrollment.id);
  flash(req, "Credential issued.");
  res.redirect(`/credentials/${credential.id}/print`);
});

app.get("/credentials/:id/print", requireAuth, (req, res) => {
  const credential = db.prepare(`
    SELECT cr.*, e.completion_date, e.final_grade, u.id AS user_id, u.first_name, u.last_name, c.title AS course_title, c.hours
    FROM credentials cr
    JOIN enrollments e ON e.id = cr.enrollment_id
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id
    WHERE cr.id = ?
  `).get(Number(req.params.id));
  if (!credential) return res.status(404).send("Credential not found");
  if (req.user.role === "student" && req.user.id !== credential.user_id) return res.status(403).send("Forbidden");

  const noun = credential.type === "Diploma" ? "Diploma" : "Certificate of Completion";
  const body = `
    <div class="print-actions">
      <button onclick="window.print()">Print</button>
      <a class="button ghost" href="${req.user.role === "student" ? "/student" : "/admin/courses"}">Back</a>
    </div>
    <article class="credential">
      <img class="credential-logo" src="/assets/bmhi-seal-blue.jpeg" alt="${escapeHtml(instituteName)} logo">
      <p class="muted">${escapeHtml(instituteName)}</p>
      <h1>${escapeHtml(noun)}</h1>
      <p>This certifies that</p>
      <h2>${escapeHtml(credential.first_name)} ${escapeHtml(credential.last_name)}</h2>
      <p>has successfully completed</p>
      <h2>${escapeHtml(credential.course_title)}</h2>
      <p>${escapeHtml(credential.hours)} clock hours · Completed ${date(credential.completion_date || credential.issued_at)}</p>
      <p><strong>Credential No.</strong> ${escapeHtml(credential.number)}</p>
      <p><strong>Issued</strong> ${date(credential.issued_at)} · <strong>Authorized by</strong> ${escapeHtml(credential.issuer_name)}</p>
    </article>
  `;
  render(req, res, noun, body, { full: true });
});

app.get("/student", requireAuth, requireRole("student"), (req, res) => {
  const enrollments = db.prepare(`
    SELECT e.*, c.title, c.slug, c.category, c.description, c.hours, c.credential_type, cr.id AS credential_id
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN credentials cr ON cr.enrollment_id = e.id
    WHERE e.user_id = ?
    ORDER BY
      CASE WHEN c.slug = 'introduction-to-nursing-practical-nursing' THEN 0 ELSE 1 END,
      e.created_at DESC
  `).all(req.user.id);

  const studentName = `${req.user.first_name} ${req.user.last_name}`.trim();
  const fallbackSubjects = [
    { title: "Introduction to Nursing", progress: 83, category: "Practical Nursing" },
    { title: "Fundamentals of Nursing", progress: 71, category: "Nursing Core" },
    { title: "Medical Terminology", progress: 80, category: "Healthcare Foundation" },
    { title: "Anatomy and Physiology", progress: 60, category: "Science" },
    { title: "Pharmacology", progress: 50, category: "Clinical Preparation" }
  ];
  const subjectRows = (enrollments.length ? enrollments : fallbackSubjects).slice(0, 6);
  const notices = [
    ["Clinical orientation meeting", "07/08/2026", "red"],
    ["Tuition payment reminder", "07/10/2026", "red"],
    ["Student handbook acknowledgement due", "07/12/2026", "red"],
    ["Student health check-up", "07/15/2026", "green"]
  ];
  const times = ["9:00 AM-10:00 AM", "10:00 AM-11:00 AM", "11:00 AM-12:00 PM", "1:00 PM-2:00 PM"];
  const upcomingRows = subjectRows.slice(0, 4);
  const homeworkRows = subjectRows.slice(0, 3);
  const lockNotice = isClassLocked(req.user)
    ? `<article class="student-panel lock-panel"><h2>Class access locked</h2><p>${escapeHtml(classLockMessage(req.user))}</p></article>`
    : "";

  const body = `
    <section class="student-dashboard">
      ${lockNotice}
      <article class="student-welcome">
        <div class="student-photo">${escapeHtml(initialsFor(req.user))}</div>
        <div>
          <h1>Welcome, ${escapeHtml(studentName || "Student")}</h1>
          <p>Use your student dashboard to continue courses, check notices, review homework, and track class progress.</p>
        </div>
      </article>

      <article class="student-panel notice-panel">
        <h2>Notice Board</h2>
        ${notices.map(([title, noticeDate, color]) => `
          <a href="/student">
            <span class="notice-icon ${color}">M</span>
            <span>${escapeHtml(title)}</span>
            <small>${escapeHtml(noticeDate)}</small>
          </a>
        `).join("")}
      </article>

      <article class="student-alert-panel">
        <div>
          <strong>Registration is open</strong>
          <p>Select upcoming courses, review current enrollments, and check your transcript from the student portal.</p>
        </div>
        <div class="actions">
          <a class="button small" href="/student/registration">Register for courses</a>
          <a class="button small ghost" href="/student/transcript">View transcript</a>
        </div>
      </article>

      <article class="student-panel subject-panel">
        <h2>Subject Progress</h2>
        <table>
          <thead><tr><th>Subject</th><th>Progress</th></tr></thead>
          <tbody>
            ${subjectRows.map((row) => `
              <tr>
                <td>${escapeHtml(row.title)}</td>
                <td><span>${escapeHtml(row.progress || 0)}%</span>${progressBar(row.progress || 0)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </article>

      <article class="student-panel class-panel">
        <h2>Upcoming Class</h2>
        ${upcomingRows.map((row, index) => `
          <div class="class-row">
            <span class="teacher-avatar">IN</span>
            <div><strong>Instructor</strong><small>${escapeHtml(row.title)}</small></div>
            <div><strong>Room No.: 05</strong><small>${escapeHtml(times[index] || times[0])}</small></div>
          </div>
        `).join("")}
      </article>

      <article class="student-panel homework-panel" id="homework">
        <h2>Homework</h2>
        ${homeworkRows.map((row, index) => `
          <div class="homework-row">
            <h3>${escapeHtml(row.title)}</h3>
            <p>Homework Date: 07/${String(18 + index).padStart(2, "0")}/2026, Submission Date: 07/${String(24 + index).padStart(2, "0")}/2026, Status: <span>Pending</span></p>
          </div>
        `).join("")}
      </article>

      <article class="student-panel courses-panel" id="enrolled-courses">
        <h2>Online Courses</h2>
        <div class="student-course-list">
          ${enrollments.map((row) => `
            <div class="student-course-row">
              <div>
                <strong>${escapeHtml(row.title)}</strong>
                <small>${escapeHtml(row.category)} · ${escapeHtml(row.hours)} clock hours · ${escapeHtml(row.status)}</small>
              </div>
              <div>
                ${progressBar(row.progress)}
                <small>${escapeHtml(row.progress)}% complete</small>
              </div>
              ${isClassLocked(req.user) ? lockedButton("Locked") : `<a class="button small" href="/student/enrollments/${row.id}">Open</a>`}
              ${row.credential_id ? `<a class="button small ghost" href="/credentials/${row.credential_id}/print">Credential</a>` : ""}
            </div>
          `).join("") || `<p class="empty">No course enrollments yet.</p>`}
        </div>
      </article>

      <article class="student-panel compact-panel">
        <h2>Teacher List</h2>
        <p><strong>Program Faculty</strong><br><span class="muted">Available through your course modules.</span></p>
      </article>
      <article class="student-panel compact-panel">
        <h2>Visitor List</h2>
        <p><strong>No visitors scheduled</strong><br><span class="muted">Check reception desk notices for updates.</span></p>
      </article>
      <article class="student-panel compact-panel">
        <h2>Library Book Issue List</h2>
        <p><strong>0 active issues</strong><br><span class="muted">Download center resources are available in the catalog.</span></p>
      </article>
    </section>
  `;
  render(req, res, "Student Dashboard", body, { studentPortal: true, activeStudentNav: "dashboard" });
});

app.get("/student/dashboard", requireAuth, requireRole("student"), (req, res) => {
  if (isClassLocked(req.user)) return renderClassLockPage(req, res);
  const data = dashboardDataForStudent(req.user.id);
  const body = `
    <section class="canvas-course-shell canvas-global-dashboard-shell">
      ${renderStudentCanvasRail("dashboard")}
      ${renderStudentCanvasHeader("Dashboard", "/student/dashboard", [{ label: "Dashboard" }])}
      ${renderCanvasDashboardPage({ user: req.user, data })}
    </section>
  `;
  render(req, res, "Dashboard", body, { courseCanvas: true });
});

app.get("/student/calendar", requireAuth, requireRole("student"), (req, res) => {
  if (isClassLocked(req.user)) return renderClassLockPage(req, res);
  const data = dashboardDataForStudent(req.user.id);
  const courses = data.enrollments.map((row) => ({
    id: row.course_id,
    title: row.title,
    slug: row.slug
  }));
  const assignmentEvents = data.gradeItems
    .filter((item) => item.due_date)
    .map((item) => ({
      id: `grade-${item.id}`,
      course_id: item.course_id,
      title: item.title,
      description: "Assignment due date",
      event_type: String(item.title || "").toLowerCase().includes("exam") ? "exam" : "assignment",
      start_at: `${item.due_date} 23:59:00`,
      course_title: item.course_title,
      course_slug: item.course_slug
    }));
  const events = [...data.events, ...assignmentEvents]
    .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
  const body = `
    <section class="canvas-course-shell canvas-global-calendar-shell">
      ${renderStudentCanvasRail("calendar")}
      ${renderStudentCanvasHeader("Calendar", "/student/calendar", [{ label: "Calendar" }])}
      ${renderMonthCalendarPage({ events, courses, instructor: false })}
    </section>
  `;
  render(req, res, "Calendar", body, { courseCanvas: true });
});

app.get("/student/courses", requireAuth, requireRole("student"), (req, res) => {
  const enrollments = db.prepare(`
    SELECT e.*, c.title, c.slug, c.category, c.description, c.hours, c.credential_type, c.delivery_mode, cr.id AS credential_id
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN credentials cr ON cr.enrollment_id = e.id
    WHERE e.user_id = ?
    ORDER BY
      CASE WHEN c.slug = 'introduction-to-nursing-practical-nursing' THEN 0 ELSE 1 END,
      CASE e.status WHEN 'active' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,
      e.created_at DESC
  `).all(req.user.id);

  const activeCount = enrollments.filter((row) => row.status === "active").length;
  const completedCount = enrollments.filter((row) => row.status === "completed").length;
  const totalHours = enrollments.reduce((total, row) => total + Number(row.hours || 0), 0);
  const lockNotice = isClassLocked(req.user)
    ? `<article class="student-panel lock-panel" style="margin-bottom:12px"><h2>Class access locked</h2><p>${escapeHtml(classLockMessage(req.user))}</p></article>`
    : "";

  const body = `
    <section class="student-registration">
      ${lockNotice}
      <div class="financial-head">
        <div>
          <p class="eyebrow">Courses</p>
          <h1>Enrolled Courses</h1>
          <p>Access your current course shells, review progress, and open completed credentials when available.</p>
        </div>
        <div class="financial-actions">
          <a class="button ghost" href="/student">Dashboard</a>
          <a class="button" href="/student/registration">Register for courses</a>
        </div>
      </div>

      <section class="grid cols-4 registration-stats">
        ${stat("Active courses", String(activeCount))}
        ${stat("Completed", String(completedCount))}
        ${stat("Total clock hours", String(totalHours))}
      </section>

      <article class="student-panel courses-panel" style="margin-top:12px">
        <h2>My Enrolled Courses</h2>
        <div class="student-course-list">
          ${enrollments.map((row) => `
            <div class="student-course-row">
              <div>
                <strong>${escapeHtml(row.title)}</strong>
                <small>${escapeHtml(row.category)} · ${escapeHtml(row.credential_type)} · ${escapeHtml(row.delivery_mode)}</small>
                <small>${escapeHtml(row.hours)} clock hours · ${escapeHtml(row.status)}</small>
              </div>
              <div>
                ${progressBar(row.progress)}
                <small>${escapeHtml(row.progress)}% complete</small>
              </div>
              ${isClassLocked(req.user) ? lockedButton("Locked") : `<a class="button small" href="/student/enrollments/${row.id}">Open</a>`}
              ${row.credential_id ? `<a class="button small ghost" href="/credentials/${row.credential_id}/print">Credential</a>` : ""}
            </div>
          `).join("") || `<p class="empty">No course enrollments yet. Use registration to add an available course.</p>`}
        </div>
      </article>
    </section>
  `;
  render(req, res, "Enrolled Courses", body, { studentPortal: true, activeStudentNav: "courses" });
});

app.get("/student/registration", requireAuth, requireRole("student"), (req, res) => {
  const enrollments = db.prepare(`
    SELECT e.*, c.title, c.category, c.hours, c.credential_type, c.delivery_mode
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ?
    ORDER BY e.created_at DESC
  `).all(req.user.id);
  const enrolledCourseIds = new Set(enrollments.map((row) => row.course_id));
  const courses = db.prepare(`
    SELECT *
    FROM courses
    WHERE published = 1
    ORDER BY category, title
  `).all();
  const courseBySlug = new Map(courses.map((course) => [course.slug, course]));
  const courseEnrollmentByCourseId = new Map(enrollments.map((row) => [row.course_id, row]));
  const programCourseSlugs = {
    "practical-nursing": [
      "introduction-to-nursing-practical-nursing",
      "medical-terminology",
      "fundamental-nursing-skills-and-concepts-new-cohort"
    ],
    "home-health-aide": ["home-health-aide", "home-health-aide-creole"],
    "medical-assistant": ["medical-assistant"],
    "patient-care-technician": ["patient-care-technician"],
    "medical-billing-and-coding": ["medical-billing-and-coding"],
    "cna-exam-prep": ["cna-exam-prep"]
  };
  const americanHeartAssociationCourses = courses.filter((course) => americanHeartAssociationSlugs.has(course.slug));
  const programCourses = courses
    .filter((course) => course.category !== "Practical Nursing Course" && !americanHeartAssociationSlugs.has(course.slug))
    .map((program) => ({
      ...program,
      subCourses: (programCourseSlugs[program.slug] || [program.slug])
        .map((slug) => courseBySlug.get(slug))
        .filter(Boolean)
    }))
    .concat(americanHeartAssociationCourses.length ? [{
      id: "american-heart-association",
      isGroup: true,
      title: "American Heart Association",
      category: "Continuing Education",
      credential_type: "Certificate",
      hours: americanHeartAssociationCourses.reduce((sum, course) => sum + Number(course.hours || 0), 0),
      delivery_mode: "Campus",
      subCourses: americanHeartAssociationCourses
    }] : []);
  const availablePrograms = programCourses.filter((program) => {
    if (program.isGroup) return program.subCourses.some((course) => !enrolledCourseIds.has(course.id));
    return !enrolledCourseIds.has(program.id);
  });
  const availableSubCourseCount = programCourses.reduce(
    (count, program) => count + program.subCourses.filter((course) => !enrolledCourseIds.has(course.id)).length,
    0
  );
  const lockNotice = isClassLocked(req.user)
    ? `<article class="student-panel lock-panel" style="margin-bottom:12px"><h2>Class access locked</h2><p>${escapeHtml(classLockMessage(req.user))}</p></article>`
    : "";
  const renderCourseAction = (course) => {
    if (isClassLocked(req.user)) return lockedButton("Locked");
    const enrollment = courseEnrollmentByCourseId.get(course.id);
    if (enrollment) return `<a class="button small ghost" href="/student/enrollments/${enrollment.id}">Open</a>`;
    return `
      <form method="post" action="/student/registration/enroll">
        <input type="hidden" name="courseId" value="${course.id}">
        <button class="small" type="submit">Add</button>
      </form>
    `;
  };

  const body = `
    <section class="student-registration">
      ${lockNotice}
      <div class="financial-head">
        <div>
          <p class="eyebrow">Registration</p>
          <h1>Program Registration</h1>
          <p>Select available programs, add individual course shells, and review your existing enrollments.</p>
        </div>
        <div class="financial-actions">
          <select aria-label="Term">
            <option>2026-27 Practical Nursing Term</option>
            <option>2026 Summer Term</option>
            <option>2026 Fall Term</option>
          </select>
          <a class="button ghost" href="/student/transcript">Transcript</a>
        </div>
      </div>

      <section class="grid cols-3 registration-stats">
        ${stat("Current courses", String(enrollments.filter((row) => row.status === "active").length))}
        ${stat("Available programs", String(availablePrograms.length))}
        ${stat("Available courses", String(availableSubCourseCount))}
        ${stat("Completed", String(enrollments.filter((row) => row.status === "completed").length))}
      </section>

      <section class="grid cols-2" style="margin-top:12px">
        <article class="student-panel registration-panel">
          <h2>Available Programs</h2>
          <div class="program-list">
            ${programCourses.map((program) => {
              const programEnrollment = program.isGroup ? null : courseEnrollmentByCourseId.get(program.id);
              return `
                <section class="program-card">
                  <div class="program-card-head">
                    <div>
                      <h3>${escapeHtml(program.title)}</h3>
                      <p>${escapeHtml(program.category)} · ${escapeHtml(program.credential_type)} · ${escapeHtml(program.hours)} hours · ${escapeHtml(program.delivery_mode)}</p>
                      ${courseTotalCost(program) ? `<p class="program-cost">${money(courseTotalCost(program))} total · ${money(program.tuition_cents)} tuition</p>` : ""}
                    </div>
                    ${program.isGroup ? `<span class="pill">Courses below</span>` : renderCourseAction(program)}
                  </div>
                  <div class="program-subcourses">
                    <h4>${escapeHtml(program.isGroup ? "American Heart Association courses" : "Courses in this program")}</h4>
                    ${program.subCourses.map((course) => {
                      const isProgramShell = course.id === program.id;
                      const enrollment = courseEnrollmentByCourseId.get(course.id);
                      return `
                        <div class="program-subcourse ${enrollment ? "registered" : ""}">
                          <div>
                            <strong>${escapeHtml(isProgramShell ? `${course.title} Program Shell` : course.title)}</strong>
                            <small>${escapeHtml(course.category)} · ${escapeHtml(course.credential_type)} · ${escapeHtml(course.hours)} hours</small>
                          </div>
                          ${renderCourseAction(course)}
                        </div>
                      `;
                    }).join("")}
                  </div>
                  ${programEnrollment ? `<p class="program-note">You are registered for this program.</p>` : ""}
                </section>
              `;
            }).join("") || `<p class="empty">No available programs right now.</p>`}
          </div>
        </article>

        <article class="student-panel registration-panel">
          <h2>My Courses</h2>
          <table>
            <thead><tr><th>Course</th><th>Status</th><th>Progress</th><th></th></tr></thead>
            <tbody>
              ${enrollments.map((row) => `
                <tr>
                  <td><strong>${escapeHtml(row.title)}</strong><br><span class="muted">${escapeHtml(row.category)} · ${escapeHtml(row.credential_type)}</span></td>
                  <td>${escapeHtml(row.status)}</td>
                  <td>${escapeHtml(row.progress)}%</td>
                  <td>
                    ${row.source === "student" ? `
                      <form method="post" action="/student/registration/drop">
                        <input type="hidden" name="enrollmentId" value="${row.id}">
                        <button class="small ghost" type="submit">Remove</button>
                      </form>
                    ` : isClassLocked(req.user) ? lockedButton("Locked") : `<a class="button small ghost" href="/student/enrollments/${row.id}">Open</a>`}
                  </td>
                </tr>
              `).join("") || `<tr><td class="empty" colspan="4">No current enrollments.</td></tr>`}
            </tbody>
          </table>
        </article>
      </section>
      ${renderTuitionFeesSection(courses, { compact: true })}
    </section>
  `;
  render(req, res, "Registration", body, { studentPortal: true, activeStudentNav: "registration" });
});

app.post("/student/registration/enroll", requireAuth, requireRole("student"), (req, res) => {
  if (isClassLocked(req.user)) {
    flash(req, "Class access is locked until the office marks your student file as organized.");
    return res.redirect("/student/registration");
  }
  const courseId = Number(req.body.courseId);
  const course = db.prepare("SELECT id FROM courses WHERE id = ? AND published = 1").get(courseId);
  if (!course) return res.status(404).send("Course not found");
  const existing = db.prepare("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?").get(req.user.id, courseId);
  if (!existing) {
    db.prepare(`
      INSERT INTO enrollments (user_id, course_id, source, external_order_id)
      VALUES (?, ?, 'student', ?)
    `).run(req.user.id, courseId, `self-${req.user.id}-${courseId}`);
    flash(req, "Course added to your registration.");
  } else {
    flash(req, "You are already registered for that course.");
  }
  res.redirect("/student/registration");
});

app.post("/student/registration/drop", requireAuth, requireRole("student"), (req, res) => {
  db.prepare("DELETE FROM enrollments WHERE id = ? AND user_id = ? AND source = 'student'").run(Number(req.body.enrollmentId), req.user.id);
  flash(req, "Course removed from your registration.");
  res.redirect("/student/registration");
});

app.get("/student/transcript", requireAuth, requireRole("student"), (req, res) => {
  const records = db.prepare(`
    SELECT e.*, c.title, c.category, c.hours, c.credential_type, cr.id AS credential_id, cr.number AS credential_number
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN credentials cr ON cr.enrollment_id = e.id
    WHERE e.user_id = ?
    ORDER BY e.start_date DESC, e.created_at DESC
  `).all(req.user.id);
  const totalHours = records.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const completedHours = records.filter((row) => row.status === "completed").reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const body = `
    <section class="student-transcript">
      <div class="financial-head">
        <div>
          <p class="eyebrow">Academic History</p>
          <h1>Transcript</h1>
          <p>${escapeHtml(req.user.first_name)} ${escapeHtml(req.user.last_name)} · BMHI-${escapeHtml(String(req.user.id).padStart(5, "0"))}</p>
        </div>
        <div class="financial-actions">
          <a class="button ghost" href="/student/registration">Registration</a>
          <button class="button" type="button">Print Transcript</button>
        </div>
      </div>

      <section class="grid cols-3 registration-stats">
        ${stat("Attempted hours", String(totalHours))}
        ${stat("Completed hours", String(completedHours))}
        ${stat("Courses", String(records.length))}
      </section>

      <article class="student-panel transcript-panel" style="margin-top:12px">
        <h2>Academic Record</h2>
        <table>
          <thead><tr><th>Course</th><th>Program</th><th>Hours</th><th>Status</th><th>Grade</th><th>Credential</th></tr></thead>
          <tbody>
            ${records.map((row) => `
              <tr>
                <td><strong>${escapeHtml(row.title)}</strong><br><span class="muted">Started ${date(row.start_date)}</span></td>
                <td>${escapeHtml(row.category)}</td>
                <td>${escapeHtml(row.hours)}</td>
                <td>${escapeHtml(row.status)}<br><span class="muted">${row.completion_date ? `Completed ${date(row.completion_date)}` : `${escapeHtml(row.progress)}% complete`}</span></td>
                <td>${escapeHtml(row.final_grade || "In progress")}</td>
                <td>${row.credential_id ? `<a href="/credentials/${row.credential_id}/print">${escapeHtml(row.credential_number)}</a>` : `<span class="muted">Not issued</span>`}</td>
              </tr>
            `).join("") || `<tr><td class="empty" colspan="6">No academic records yet.</td></tr>`}
          </tbody>
        </table>
      </article>
    </section>
  `;
  render(req, res, "Transcript", body, { studentPortal: true, activeStudentNav: "transcript" });
});

app.get("/student/email", requireAuth, requireRole("student"), (req, res) => {
  const box = ["inbox", "sent", "all"].includes(String(req.query.box || "")) ? String(req.query.box) : "inbox";
  const q = String(req.query.q || "").trim().slice(0, 80);
  const courses = messageCourseOptions(req.user);
  const courseId = normalizeMessageCourseId(req.user, req.query.courseId);
  const staff = db.prepare(`
    SELECT id, first_name, last_name, email, role
    FROM users
    WHERE role IN ('admin', 'instructor') AND status = 'active'
    ORDER BY role, last_name, first_name
  `).all();
  const recipients = staff.map((person) => ({ value: person.id, label: `${personName(person)} · ${person.role}` }));
  const unreadCount = db.prepare("SELECT COUNT(*) AS count FROM messages WHERE recipient_id = ? AND read_at IS NULL").get(req.user.id).count;
  const filters = { box, courseId, q };
  let threads = groupedMessageThreads(req.user.id, filters);
  let selectedThreadId = Number(req.query.threadId || 0) || threads[0]?.threadId || null;
  if (selectedThreadId && !messageThread(selectedThreadId, req.user.id).length) selectedThreadId = threads[0]?.threadId || null;
  markThreadRead(selectedThreadId, req.user.id);
  threads = groupedMessageThreads(req.user.id, filters);
  const selectedMessages = messageThread(selectedThreadId, req.user.id);

  const body = `
    <section class="student-registration">
      <div class="financial-head">
        <div>
          <p class="eyebrow">Inbox</p>
          <h1>Inbox</h1>
          <p>Message your instructor or BMHI staff about courses, assignments, registration, billing, records, or support.</p>
        </div>
        <div class="financial-actions">
          <a class="button ghost" href="/student">Dashboard</a>
          <a class="button ghost" href="/student/profile">My Profile</a>
        </div>
      </div>

      <section class="grid cols-3 registration-stats">
        ${stat("Unread", String(unreadCount))}
        ${stat("Conversations", String(threads.length))}
        ${stat("External email", smtpReady() ? "Enabled" : "Setup needed")}
      </section>
      ${smtpReady() ? "" : `
        <div class="flash message-config-note">
          External delivery is not active yet. Messages are saved in the portal until SMTP settings are added in Render.
        </div>
      `}

      <section class="message-center student-message-center">
        <aside class="message-sidebar">
          <form class="message-toolbar" method="get" action="/student/email">
            <select name="courseId">
              <option value="">All courses</option>
              ${courses.map((course) => `<option value="${course.id}" ${Number(courseId) === Number(course.id) ? "selected" : ""}>${escapeHtml(course.code ? `${course.code} · ${course.title}` : course.title)}</option>`).join("")}
            </select>
            <select name="box">
              <option value="inbox" ${box === "inbox" ? "selected" : ""}>Inbox</option>
              <option value="sent" ${box === "sent" ? "selected" : ""}>Sent</option>
              <option value="all" ${box === "all" ? "selected" : ""}>All messages</option>
            </select>
            <input name="q" type="search" value="${escapeHtml(q)}" placeholder="Search messages">
            <button type="submit">Search</button>
          </form>
          ${renderConversationList({ threads, viewerId: req.user.id, selectedThreadId, basePath: "/student/email", filters })}
        </aside>
        <section class="message-main">
          ${renderMessageThread({ messages: selectedMessages, viewerId: req.user.id, replyAction: "/student/email/reply", student: true })}
          ${messageComposeForm({ action: "/student/email", recipients, courses, selectedCourseId: courseId, subject: "Question about my course", student: true })}
        </section>
      </section>
    </section>
  `;
  render(req, res, "Inbox", body, { studentPortal: true, activeStudentNav: "email" });
});

app.post("/student/email", requireAuth, requireRole("student"), async (req, res) => {
  const recipient = db.prepare(`
    SELECT id, first_name, last_name, email
    FROM users
    WHERE id = ? AND role IN ('admin', 'instructor') AND status = 'active'
  `).get(Number(req.body.recipientId));
  const courseId = normalizeMessageCourseId(req.user, req.body.courseId);
  const subject = String(req.body.subject || "").trim().slice(0, 140);
  const body = String(req.body.body || "").trim();
  if (!recipient || !subject || !body) {
    flash(req, "Please choose a staff recipient and enter a subject and message.");
    return res.redirect("/student/email");
  }
  const messageId = savePortalMessage({ senderId: req.user.id, recipientId: recipient.id, courseId, subject, body });
  const delivery = await deliverExternalEmail({ sender: req.user, recipient, subject, body });
  updateMessageDelivery(messageId, delivery);
  flash(req, delivery.sent ? "Message saved and external email sent to staff." : `Message saved in the portal. ${delivery.reason}`);
  res.redirect("/student/email");
});

app.post("/student/email/reply", requireAuth, requireRole("student"), async (req, res) => {
  const threadId = Number(req.body.threadId || 0);
  const body = String(req.body.body || "").trim();
  const reply = replyRecipientForThread(threadId, req.user);
  if (!reply || !body) {
    flash(req, "Choose a staff conversation and enter a reply.");
    return res.redirect("/student/email");
  }
  const subject = reply.messages[0].subject;
  const courseId = reply.messages[0].course_id || null;
  const messageId = savePortalMessage({ senderId: req.user.id, recipientId: reply.recipient.id, courseId, subject, body, threadId });
  const delivery = await deliverExternalEmail({ sender: req.user, recipient: reply.recipient, subject, body });
  updateMessageDelivery(messageId, delivery);
  flash(req, delivery.sent ? "Reply saved and external email sent." : `Reply saved in the portal. ${delivery.reason}`);
  res.redirect(`/student/email?threadId=${threadId}`);
});

app.get("/student/profile", requireAuth, requireRole("student"), (req, res) => {
  const enrollments = db.prepare(`
    SELECT e.*, c.title, c.category, c.hours, c.credential_type, c.delivery_mode, cr.id AS credential_id
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN credentials cr ON cr.enrollment_id = e.id
    WHERE e.user_id = ?
    ORDER BY e.created_at DESC
  `).all(req.user.id);

  const attendanceRows = db.prepare(`
    SELECT a.*, c.title AS course_title
    FROM attendance a
    JOIN enrollments e ON e.id = a.enrollment_id
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ?
    ORDER BY a.meeting_date DESC
    LIMIT 6
  `).all(req.user.id);

  const name = `${req.user.first_name} ${req.user.last_name}`.trim();
  const activeEnrollment = enrollments[0];
  const averageProgress = enrollments.length
    ? Math.round(enrollments.reduce((sum, row) => sum + Number(row.progress || 0), 0) / enrollments.length)
    : 0;
  const completedCount = enrollments.filter((row) => row.status === "completed").length;
  const statusRows = [
    ["Admission No.", `BMHI-${String(req.user.id).padStart(5, "0")}`],
    ["Student Name", name],
    ["Email", req.user.email],
    ["Phone", req.user.phone || "Not on file"],
    ["Program", activeEnrollment?.title || "Not enrolled"],
    ["Student Type", activeEnrollment ? `${activeEnrollment.category} Student` : "BMHI Student"],
    ["Status", req.user.status],
    ["Registered", date(req.user.created_at?.slice(0, 10))]
  ];

  const body = `
    <section class="student-profile">
      <article class="profile-hero">
        <div class="profile-photo">${escapeHtml(initialsFor(req.user))}</div>
        <div>
          <h1>${escapeHtml(name || "Student")}</h1>
          <p>${escapeHtml(activeEnrollment?.title || "Broward-Miami Health Institute student")}</p>
          <div class="profile-badges">
            <span>Admission No. BMHI-${escapeHtml(String(req.user.id).padStart(5, "0"))}</span>
            <span>${escapeHtml(req.user.status)}</span>
            <span>${escapeHtml(enrollments.length)} course${enrollments.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      </article>

      <nav class="profile-tabs" aria-label="Profile sections">
        <a href="#profile">Profile</a>
        <a href="#fees">Fees</a>
        <a href="#exam">Exam</a>
        <a href="#attendance">Attendance</a>
        <a href="#documents">Documents</a>
        <a href="#timeline">Timeline</a>
        <a href="#behavior">Student Behaviour</a>
      </nav>

      <section class="profile-grid">
        <article class="student-panel profile-card" id="profile">
          <h2>Profile</h2>
          <div class="profile-table">
            ${statusRows.map(([label, value]) => `
              <div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value || "")}</span></div>
            `).join("")}
          </div>
        </article>

        <article class="student-panel profile-summary">
          <h2>Student Summary</h2>
          <div class="summary-stats">
            ${stat("Average progress", `${averageProgress}%`)}
            ${stat("Completed courses", String(completedCount))}
            ${stat("Credentials", String(enrollments.filter((row) => row.credential_id).length))}
          </div>
        </article>

        <article class="student-panel profile-wide" id="fees">
          <h2>Fees</h2>
          <table>
            <thead><tr><th>Description</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Registration fee</td><td>$150.00</td><td>$150.00</td><td>$0.00</td><td><span class="pill">Paid</span></td></tr>
              <tr><td>Tuition payment plan</td><td>$1,200.00</td><td>$900.00</td><td>$300.00</td><td><span class="pill orange">Pending</span></td></tr>
            </tbody>
          </table>
        </article>

        <article class="student-panel profile-wide" id="exam">
          <h2>Exam</h2>
          <table>
            <thead><tr><th>Course</th><th>Credential</th><th>Final Grade</th><th>Status</th></tr></thead>
            <tbody>
              ${enrollments.map((row) => `
                <tr>
                  <td>${escapeHtml(row.title)}</td>
                  <td>${escapeHtml(row.credential_type)}</td>
                  <td>${escapeHtml(row.final_grade || "Not posted")}</td>
                  <td>${escapeHtml(row.status)}</td>
                </tr>
              `).join("") || `<tr><td class="empty" colspan="4">No exam records yet.</td></tr>`}
            </tbody>
          </table>
        </article>

        <article class="student-panel profile-wide" id="attendance">
          <h2>Attendance</h2>
          <table>
            <thead><tr><th>Date</th><th>Course</th><th>Status</th><th>Minutes</th></tr></thead>
            <tbody>
              ${attendanceRows.map((row) => `
                <tr>
                  <td>${date(row.meeting_date)}</td>
                  <td>${escapeHtml(row.course_title)}</td>
                  <td>${escapeHtml(row.status)}</td>
                  <td>${escapeHtml(row.minutes)}</td>
                </tr>
              `).join("") || `<tr><td class="empty" colspan="4">No attendance entries yet.</td></tr>`}
            </tbody>
          </table>
        </article>

        <article class="student-panel profile-card" id="documents">
          <h2>Documents</h2>
          <div class="document-list">
            <p><strong>Student Handbook</strong><span>Received</span></p>
            <p><strong>Government ID</strong><span>Pending review</span></p>
            <p><strong>Health Records</strong><span>Pending upload</span></p>
            <p><strong>Catalog Acknowledgement</strong><span>Received</span></p>
          </div>
        </article>

        <article class="student-panel profile-card" id="timeline">
          <h2>Timeline</h2>
          <div class="timeline-list">
            <p><strong>Account created</strong><span>${date(req.user.created_at?.slice(0, 10))}</span></p>
            ${enrollments.map((row) => `<p><strong>Enrolled in ${escapeHtml(row.title)}</strong><span>${date(row.start_date)}</span></p>`).join("")}
          </div>
        </article>

        <article class="student-panel profile-wide" id="behavior">
          <h2>Student Behaviour</h2>
          <p class="profile-note">No behavior records have been posted for this student.</p>
        </article>
      </section>
    </section>
  `;
  render(req, res, "My Profile", body, { studentPortal: true, activeStudentNav: "profile" });
});

app.get("/student/financial", requireAuth, requireRole("student"), (req, res) => {
  const enrollments = db.prepare(`
    SELECT e.*, c.title, c.category, c.hours, c.credential_type, c.tuition_cents
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ?
    ORDER BY e.start_date DESC, e.created_at DESC
  `).all(req.user.id);

  const awards = db.prepare(`
    SELECT *
    FROM financial_aid_awards
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);
  const awardDisbursements = db.prepare(`
    SELECT d.*, a.aid_type
    FROM financial_aid_disbursements d
    JOIN financial_aid_awards a ON a.id = d.award_id
    WHERE a.user_id = ?
    ORDER BY d.disbursement_date
  `).all(req.user.id);

  const termName = req.query.term || "2026-27 Practical Nursing Term";
  const ledgerCharges = db.prepare(`
    SELECT *
    FROM billing_charges
    WHERE user_id = ? AND term = ? AND status = 'posted'
    ORDER BY due_date, created_at
  `).all(req.user.id, termName);
  const ledgerPayments = db.prepare(`
    SELECT *
    FROM billing_payments
    WHERE user_id = ? AND term = ?
    ORDER BY paid_at, created_at
  `).all(req.user.id, termName);
  const paymentPlans = db.prepare(`
    SELECT *
    FROM billing_payment_plans
    WHERE user_id = ? AND term = ?
    ORDER BY next_due_date
  `).all(req.user.id, termName);
  const refundPolicy = db.prepare("SELECT * FROM billing_refund_policies WHERE active = 1 ORDER BY id DESC LIMIT 1").get();

  const fallbackCharges = enrollments.map((row) => {
    const tuition = Number(row.tuition_cents || 0) || Math.max(65000, Number(row.hours || 0) * 1600);
    return {
      title: row.title,
      startDate: row.start_date,
      hours: row.hours,
      amount: tuition,
      paid: Math.round(tuition * Math.min(0.75, Math.max(0.25, Number(row.progress || 0) / 100)))
    };
  });
  const registrationFee = ledgerCharges.length ? 0 : enrollments.length ? 15000 : 0;
  const technologyFee = ledgerCharges.length ? 0 : enrollments.length ? 8500 : 0;
  const totalCharges = ledgerCharges.length
    ? ledgerCharges.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0)
    : fallbackCharges.reduce((sum, row) => sum + row.amount, registrationFee + technologyFee);
  const appliedPayments = ledgerPayments.length
    ? ledgerPayments.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0)
    : fallbackCharges.reduce((sum, row) => sum + row.paid, registrationFee);
  const financialAid = awards
    .filter((award) => ["offered", "accepted"].includes(award.status))
    .reduce((sum, award) => sum + Number(award.amount_cents || 0), 0);
  const balance = Math.max(0, totalCharges - appliedPayments - financialAid);
  const studentNumber = `BMHI-${String(req.user.id).padStart(5, "0")}`;

  const body = `
    <section class="financial-term">
      <div class="financial-head">
        <div>
          <p class="eyebrow">Financial</p>
          <h1>Financial By Term</h1>
          <p>${escapeHtml(req.user.first_name)} ${escapeHtml(req.user.last_name)} · ${escapeHtml(studentNumber)}</p>
        </div>
        <div class="financial-actions">
          <select aria-label="Term">
            <option>${escapeHtml(termName)}</option>
            <option>2026 Summer Term</option>
            <option>2026 Fall Term</option>
          </select>
          <button class="button ghost" type="button">Print Statement</button>
          <button class="button" type="button">Make Payment</button>
        </div>
      </div>

      <section class="grid cols-4 financial-stats">
        ${stat("Amount due", money(balance))}
        ${stat("Charges", money(totalCharges))}
        ${stat("Applied payments", money(appliedPayments))}
        ${stat("Financial aid", money(financialAid))}
      </section>

      <section class="financial-grid">
        <article class="student-panel financial-section">
          <h2>Term Summary</h2>
          <div class="financial-summary">
            <p><strong>Term</strong><span>${escapeHtml(termName)}</span></p>
            <p><strong>Student status</strong><span>${escapeHtml(req.user.status)}</span></p>
            <p><strong>Current balance</strong><span>${money(balance)}</span></p>
            <p><strong>Payment status</strong><span>${balance > 0 ? "Payment due" : "Paid in full"}</span></p>
          </div>
        </article>

        <article class="student-panel financial-section">
          <h2>Financial Aid</h2>
          <table>
            <thead><tr><th>Aid</th><th>Status</th><th>Amount</th><th>Action</th></tr></thead>
            <tbody>
              ${awards.map((award) => `
                <tr>
                  <td><strong>${escapeHtml(award.aid_type)}</strong><br><span class="muted">${escapeHtml(award.source)} · ${escapeHtml(award.term)}</span></td>
                  <td><span class="pill ${award.status === "offered" ? "orange" : ""}">${escapeHtml(award.status)}</span></td>
                  <td>${money(award.amount_cents)}</td>
                  <td>
                    ${award.status === "offered" ? `
                      <form class="aid-student-actions" method="post" action="/student/financial-aid/${award.id}/status">
                        <button class="small" name="status" value="accepted" type="submit">Accept</button>
                        <button class="small ghost" name="status" value="declined" type="submit">Decline</button>
                      </form>
                    ` : `<span class="muted">${award.status === "accepted" ? "Accepted" : "No action"}</span>`}
                  </td>
                </tr>
              `).join("") || `<tr><td class="empty" colspan="4">No financial aid packages have been offered yet.</td></tr>`}
            </tbody>
          </table>
        </article>

        <article class="student-panel financial-section">
          <h2>Scheduled Disbursements</h2>
          <table>
            <thead><tr><th>Date</th><th>Aid</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              ${awardDisbursements.map((row) => `
                <tr>
                  <td>${date(row.disbursement_date)}</td>
                  <td>${escapeHtml(row.aid_type)}</td>
                  <td>${money(row.amount_cents)}</td>
                  <td>${escapeHtml(row.status)}</td>
                </tr>
              `).join("") || `<tr><td class="empty" colspan="4">No disbursements scheduled.</td></tr>`}
            </tbody>
          </table>
        </article>

        <article class="student-panel financial-wide">
          <h2>Charges</h2>
          <table>
            <thead><tr><th>Date</th><th>Description</th><th>Hours</th><th>Amount</th></tr></thead>
            <tbody>
              ${registrationFee ? `<tr><td>${date(enrollments[0]?.start_date)}</td><td>Registration fee</td><td></td><td>${money(registrationFee)}</td></tr>` : ""}
              ${technologyFee ? `<tr><td>${date(enrollments[0]?.start_date)}</td><td>Technology and LMS fee</td><td></td><td>${money(technologyFee)}</td></tr>` : ""}
              ${ledgerCharges.length ? ledgerCharges.map((row) => `
                <tr>
                  <td>${date(row.due_date)}</td>
                  <td>${escapeHtml(row.category)} · ${escapeHtml(row.description)}</td>
                  <td></td>
                  <td>${money(row.amount_cents)}</td>
                </tr>
              `).join("") : fallbackCharges.map((row) => `
                <tr>
                  <td>${date(row.startDate)}</td>
                  <td>${escapeHtml(row.title)} tuition</td>
                  <td>${escapeHtml(row.hours)}</td>
                  <td>${money(row.amount)}</td>
                </tr>
              `).join("") || `<tr><td class="empty" colspan="4">No charges for this term.</td></tr>`}
            </tbody>
          </table>
        </article>

        <article class="student-panel financial-wide">
          <h2>Applied Payments and Credits</h2>
          <table>
            <thead><tr><th>Date</th><th>Source</th><th>Applied To</th><th>Amount</th></tr></thead>
            <tbody>
              ${registrationFee ? `<tr><td>${date(enrollments[0]?.start_date)}</td><td>Student payment</td><td>Registration fee</td><td>${money(registrationFee)}</td></tr>` : ""}
              ${ledgerPayments.length ? ledgerPayments.map((row) => `
                <tr>
                  <td>${date(row.paid_at)}</td>
                  <td>${escapeHtml(row.source)}</td>
                  <td>${escapeHtml(row.applied_to)}</td>
                  <td>${money(row.amount_cents)}</td>
                </tr>
              `).join("") : fallbackCharges.map((row) => `
                <tr>
                  <td>${date(row.startDate)}</td>
                  <td>Student payment plan</td>
                  <td>${escapeHtml(row.title)}</td>
                  <td>${money(row.paid)}</td>
                </tr>
              `).join("") || `<tr><td class="empty" colspan="4">No payments applied yet.</td></tr>`}
            </tbody>
          </table>
        </article>

        <article class="student-panel financial-wide">
          <h2>Enrollment History</h2>
          <table>
            <thead><tr><th>Course</th><th>Program</th><th>Status</th><th>Progress</th><th>Start Date</th></tr></thead>
            <tbody>
              ${enrollments.map((row) => `
                <tr>
                  <td>${escapeHtml(row.title)}</td>
                  <td>${escapeHtml(row.category)}</td>
                  <td>${escapeHtml(row.status)}</td>
                  <td>${escapeHtml(row.progress)}%</td>
                  <td>${date(row.start_date)}</td>
                </tr>
              `).join("") || `<tr><td class="empty" colspan="5">No enrollment history yet.</td></tr>`}
            </tbody>
          </table>
        </article>

        <article class="student-panel financial-section">
          <h2>Payment Plans</h2>
          <div class="financial-summary">
            ${paymentPlans.map((plan) => `
              <p><strong>${escapeHtml(plan.name)}</strong><span>${money(plan.total_cents)} total</span></p>
              <p><strong>Next due date</strong><span>${date(plan.next_due_date)}</span></p>
              <p><strong>Next payment</strong><span>${money(plan.installment_cents)}</span></p>
            `).join("") || `
              <p><strong>Plan</strong><span>No active plan</span></p>
              <p><strong>Next due date</strong><span>Not scheduled</span></p>
              <p><strong>Next payment</strong><span>${money(Math.min(balance, 30000))}</span></p>
            `}
          </div>
        </article>

        <article class="student-panel financial-section">
          <h2>Tuition</h2>
          <div class="financial-summary">
            <p><strong>Total tuition</strong><span>${money(ledgerCharges.length ? ledgerCharges.filter((row) => row.category === "Tuition").reduce((sum, row) => sum + row.amount_cents, 0) : fallbackCharges.reduce((sum, row) => sum + row.amount, 0))}</span></p>
            <p><strong>Fees</strong><span>${money(ledgerCharges.length ? ledgerCharges.filter((row) => row.category !== "Tuition").reduce((sum, row) => sum + row.amount_cents, 0) : registrationFee + technologyFee)}</span></p>
            <p><strong>Balance</strong><span>${money(balance)}</span></p>
          </div>
        </article>

        <article class="student-panel financial-section">
          <h2>Enrollment Agreements</h2>
          <div class="document-list">
            <p><strong>Enrollment agreement</strong><span>On file</span></p>
            <p><strong>Catalog acknowledgement</strong><span>On file</span></p>
            <p><strong>Payment plan agreement</strong><span>Pending signature</span></p>
          </div>
        </article>

        <article class="student-panel financial-section">
          <h2>Refund Policy</h2>
          <p class="profile-note">${escapeHtml(refundPolicy?.description || "Refund eligibility is based on the signed enrollment agreement, school catalog, attendance, and withdrawal date. Contact the business office for an official refund calculation.")}</p>
        </article>
      </section>
    </section>
  `;
  render(req, res, "Financial By Term", body, { studentPortal: true, activeStudentNav: "fees" });
});

app.post("/student/financial-aid/:id/status", requireAuth, requireRole("student"), (req, res) => {
  const status = String(req.body.status || "");
  if (!["accepted", "declined"].includes(status)) return res.status(422).send("Invalid status");
  const award = db.prepare("SELECT id FROM financial_aid_awards WHERE id = ? AND user_id = ? AND status = 'offered'").get(Number(req.params.id), req.user.id);
  if (!award) return res.status(404).send("Aid package not found");
  const acceptedAt = status === "accepted" ? new Date().toISOString().slice(0, 10) : null;
  db.prepare(`
    UPDATE financial_aid_awards
    SET status = ?, accepted_at = COALESCE(?, accepted_at)
    WHERE id = ?
  `).run(status, acceptedAt, award.id);
  flash(req, status === "accepted" ? "Financial aid accepted." : "Financial aid declined.");
  res.redirect("/student/financial");
});

app.get("/student/enrollments/:id", requireAuth, requireRole("student"), (req, res) => {
  const enrollment = db.prepare(`
    SELECT e.*, c.title, c.slug, c.category, c.description, c.hours, c.credential_type, c.delivery_mode, c.hidden_sections
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.id = ? AND e.user_id = ?
  `).get(Number(req.params.id), req.user.id);
  if (!enrollment) return res.status(404).send("Enrollment not found");
  if (isClassLocked(req.user)) return renderClassLockPage(req, res);

  const lessons = db.prepare(`
    SELECT l.*, m.id AS module_id, m.title AS module_title, m.position AS module_position
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE m.course_id = ?
    ORDER BY m.position, l.position
  `).all(enrollment.course_id);
  const gradeItems = db.prepare(`
    SELECT *
    FROM grade_items
    WHERE course_id = ?
    ORDER BY due_date IS NULL, due_date, id
  `).all(enrollment.course_id);
  const grades = db.prepare(`
    SELECT g.*
    FROM grades g
    JOIN grade_items gi ON gi.id = g.grade_item_id
    WHERE g.enrollment_id = ? AND gi.course_id = ?
  `).all(enrollment.id, enrollment.course_id);
  const announcements = courseAnnouncements(enrollment.course_id);
  const calendarEvents = courseCalendarEvents(enrollment.course_id);

  const totalMinutes = lessons.reduce((total, lesson) => total + Number(lesson.duration_minutes || 0), 0);
  const courseCode = canvasCourseCode(enrollment);
  const courseHomeTitle = enrollment.slug === "introduction-to-nursing-practical-nursing"
    ? "Introduction to Nursing for Practical Nursing Students"
    : enrollment.slug === "medical-terminology"
      ? "Medical Terminology for Practical Nursing Students"
    : enrollment.slug === "home-health-aide"
      ? "Home Health Aide 75 Hour Course"
    : enrollment.slug === "home-health-aide-creole"
      ? "Kou Asistan Sante Lakay 75 Edtan"
    : `${enrollment.title} Course Home`;
  const courseFocus = enrollment.slug === "introduction-to-nursing-practical-nursing"
    ? "Nursing history, nursing leaders, purpose of nursing, practical nurse role, ethics, legal responsibilities, professionalism, and student impact."
    : enrollment.slug === "medical-terminology"
      ? "Word structure, body system terminology, diagnostic and treatment language, healthcare abbreviations, clinical documentation, and practical nursing communication."
    : enrollment.slug === "home-health-aide"
      ? "Home care foundations, patient rights, interpersonal skills, HIV/AIDS, infection control, vital signs, observation, nutrition, emergency procedures, personal care, home safety, and medication self-administration assistance."
    : enrollment.slug === "home-health-aide-creole"
      ? "Fondasyon swen lakay, dwa pasyan, konpetans entepesonel, VIH/SIDA, kontwol enfeksyon, siy vital, obsevasyon, nitrisyon, pwosedi ijans, swen pesonel, sekirite lakay, ak asistans medikaman."
    : enrollment.description || `${enrollment.title} coursework, lessons, assignments, attendance, progress tracking, and completion requirements.`;
  const moduleGroups = lessons.reduce((groups, lesson) => {
    const existing = groups.find((group) => group.id === lesson.module_id);
    if (existing) {
      existing.lessons.push(lesson);
    } else {
      groups.push({
        id: lesson.module_id,
        title: lesson.module_title,
        position: lesson.module_position,
        lessons: [lesson]
      });
    }
    return groups;
  }, []);

  if (!lessons.length) {
    const emptyBody = `
      <div class="page-head">
        <div>
          <h1>${escapeHtml(enrollment.title)}</h1>
          <p>${escapeHtml(enrollment.description)}</p>
        </div>
        <a class="button ghost" href="/student">Back</a>
      </div>
      <section class="card"><p class="empty">No lessons have been added to this course yet.</p></section>
    `;
    return render(req, res, enrollment.title, emptyBody);
  }

  const firstLesson = lessons[0];
  const upcomingLessons = lessons.slice(0, 3);
  const navItems = visibleCourseNavItems(enrollment);
  const courseBaseHref = `/student/enrollments/${enrollment.id}`;
  const activeView = String(req.query.view || "");
  const studentCourseNavItems = navItems.filter((item) => ["Home", "Announcements", "Modules", "Grades", "Syllabus", "Calendar"].includes(item));
  const startTiles = [
    { icon: "book", label: "Course Syllabus", href: `${courseBaseHref}?view=syllabus` },
    { icon: "brain", label: "Learning Modules", href: `${courseBaseHref}?view=modules` },
    { icon: "check", label: "Assignments & Grades", href: `${courseBaseHref}?view=syllabus#course-assignments` },
    { icon: "question", label: "Course Q & A", href: `/student/enrollments/${enrollment.id}?lesson=${firstLesson.id}` }
  ];
  const currentLessonId = Number(req.query.lesson || 0);
  const courseOutlinePanel = `
    <aside class="course-outline-panel" aria-label="Course outline">
      <section class="course-outline-card">
        <div class="course-outline-head">
          <h2>${escapeHtml(enrollment.title)}</h2>
          <button class="course-outline-icon" type="button" data-toggle-course-sidebar aria-expanded="false" aria-controls="canvas-course-navigation" aria-label="Expand course navigation" title="Expand course navigation">&gt;</button>
        </div>
        ${progressBar(enrollment.progress)}
        <p><span>${escapeHtml(enrollment.progress)}%</span> complete</p>
      </section>
      <nav class="course-outline-list">
        ${moduleGroups.map((module) => `
          <section>
            <h3>${escapeHtml(module.position)}. ${escapeHtml(module.title)}</h3>
            ${module.lessons.map((lesson) => `
              <a class="${lesson.id === currentLessonId ? "active" : ""}" href="/student/enrollments/${enrollment.id}?lesson=${lesson.id}">
                <span class="outline-dot"></span>
                <span>${escapeHtml(lesson.title)}</span>
              </a>
            `).join("")}
          </section>
        `).join("")}
      </nav>
    </aside>
  `;
  const body = activeView === "modules" ? `
    <section class="canvas-course-shell canvas-modules-shell student-course-shell">
      ${renderStudentCanvasRail("courses")}
      ${renderStudentCanvasHeader(courseCode, courseBaseHref, [
        { label: courseCode, href: courseBaseHref },
        { label: "Modules" }
      ])}

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(studentCourseNavItems, courseBaseHref, "Modules", firstLesson.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>
      ${courseOutlinePanel}

      ${renderCanvasModulesPage({
        courseCode,
        baseHref: courseBaseHref,
        moduleGroups,
        instructor: false
      })}
    </section>
  ` : activeView === "announcements" ? `
    <section class="canvas-course-shell student-course-shell">
      ${renderStudentCanvasRail("courses")}
      ${renderStudentCanvasHeader(courseCode, courseBaseHref, [
        { label: courseCode, href: courseBaseHref },
        { label: "Announcements" }
      ])}

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(studentCourseNavItems, courseBaseHref, "Announcements", firstLesson.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>
      ${courseOutlinePanel}
      ${renderCourseAnnouncementsPage({
        course: { id: enrollment.course_id, title: enrollment.title },
        courseCode,
        baseHref: courseBaseHref,
        announcements,
        instructor: false
      })}
    </section>
  ` : activeView === "calendar" ? `
    <section class="canvas-course-shell student-course-shell">
      ${renderStudentCanvasRail("calendar")}
      ${renderStudentCanvasHeader(courseCode, courseBaseHref, [
        { label: courseCode, href: courseBaseHref },
        { label: "Calendar" }
      ])}

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(studentCourseNavItems, courseBaseHref, "Calendar", firstLesson.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>
      ${courseOutlinePanel}
      ${renderMonthCalendarPage({
        events: calendarEvents,
        courses: [{ id: enrollment.course_id, title: enrollment.title, slug: enrollment.slug }],
        currentCourseId: enrollment.course_id,
        instructor: false
      })}
    </section>
  ` : activeView === "grades" ? `
    <section class="canvas-course-shell canvas-grades-shell student-course-shell">
      ${renderStudentCanvasRail("courses")}
      ${renderStudentCanvasHeader(courseCode, courseBaseHref, [
        { label: courseCode, href: courseBaseHref },
        { label: "Grades", href: `${courseBaseHref}?view=grades` },
        { label: personName(req.user) }
      ])}

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(studentCourseNavItems, courseBaseHref, "Grades", firstLesson.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>
      ${courseOutlinePanel}
      ${renderStudentGradesPage({
        enrollment,
        courseCode,
        baseHref: courseBaseHref,
        gradeItems,
        grades,
        student: req.user
      })}
    </section>
  ` : activeView === "syllabus" ? `
    <section class="canvas-course-shell canvas-syllabus-shell student-course-shell">
      ${renderStudentCanvasRail("courses")}
      ${renderStudentCanvasHeader(courseCode, courseBaseHref)}

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(studentCourseNavItems, courseBaseHref, "Syllabus", firstLesson.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>
      ${courseOutlinePanel}
      ${renderCourseSyllabus({
        courseTitle: enrollment.title,
        courseDescription: enrollment.description,
        courseCode,
        courseHours: enrollment.hours,
        courseCategory: enrollment.category,
        gradeItems,
        lessons,
        baseHref: courseBaseHref
      })}
    </section>
  ` : req.query.lesson ? `
    <section class="canvas-course-shell canvas-lesson-shell student-course-shell">
      ${renderStudentCanvasRail("courses")}
      ${renderStudentCanvasHeader(courseCode, courseBaseHref)}

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(studentCourseNavItems, courseBaseHref, "Modules", firstLesson.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>
      ${courseOutlinePanel}

      <main class="canvas-course-main canvas-page-main">
        ${(() => {
          const selectedLesson = lessons.find((lesson) => lesson.id === Number(req.query.lesson)) || firstLesson;
          const selectedIndex = lessons.findIndex((lesson) => lesson.id === selectedLesson.id);
          const previousLesson = selectedIndex > 0 ? lessons[selectedIndex - 1] : null;
          const nextLesson = selectedIndex >= 0 && selectedIndex < lessons.length - 1 ? lessons[selectedIndex + 1] : null;
          const selectedModule = moduleGroups.find((module) => module.id === selectedLesson.module_id) || moduleGroups[0];
          return `
            <div class="canvas-mini-head">
              <span></span>
              <strong>${escapeHtml(courseCode)}</strong>
            </div>
            <article class="canvas-page-content">
              <p class="canvas-page-breadcrumb">
                <a href="/student/enrollments/${enrollment.id}">Home</a>
                <span>/</span>
                <a href="/student/enrollments/${enrollment.id}">Modules</a>
                <span>/</span>
                <strong>${escapeHtml(selectedLesson.title)}</strong>
              </p>
              <h1>${escapeHtml(selectedModule.title)}: ${escapeHtml(selectedLesson.title)}</h1>
              <h2>${escapeHtml(selectedLesson.title)}</h2>
              <div class="canvas-page-copy">
                ${selectedLesson.external_url ? `
                  <div class="external-lesson-callout">
                    <strong>This lesson opens YouTube in this tab.</strong>
                    <p>Some websites, including YouTube, block embedded playback inside course frames. Use the button below to open the lesson directly in the current tab.</p>
                    <a class="button" href="${escapeHtml(selectedLesson.external_url)}">Open ${escapeHtml(selectedLesson.title)}</a>
                  </div>
                ` : ""}
                <p>${renderTextWithLinks(selectedLesson.content)}</p>
              </div>
              <form method="post" action="/student/enrollments/${enrollment.id}/progress" class="canvas-complete-action">
                <input type="hidden" name="progress" value="100">
                <button class="button ghost" type="submit">Mark As Complete</button>
              </form>
              <nav class="canvas-page-actions" aria-label="Lesson navigation">
                ${previousLesson ? `<a class="button ghost" href="/student/enrollments/${enrollment.id}?lesson=${previousLesson.id}">Previous</a>` : `<span></span>`}
                ${nextLesson ? `<a class="button ghost" href="/student/enrollments/${enrollment.id}?lesson=${nextLesson.id}">Next</a>` : `<a class="button ghost" href="/student/enrollments/${enrollment.id}">Finish</a>`}
              </nav>
            </article>
          `;
        })()}
      </main>
    </section>
  ` : `
    <section class="canvas-course-shell student-course-shell student-course-home">
      ${renderStudentCanvasRail("courses")}
      ${renderStudentCanvasHeader(courseCode, courseBaseHref)}

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${renderCourseNav(studentCourseNavItems, courseBaseHref, "Home", firstLesson.id)}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>
      ${courseOutlinePanel}

      <main class="canvas-course-main">
        <h1>${escapeHtml(enrollment.title)}</h1>
        <div class="canvas-rule"></div>
        <section class="canvas-home-card">
          <h2>${escapeHtml(courseHomeTitle)}</h2>
          <p>${escapeHtml(enrollment.description)}</p>
          <p><strong>Course objectives:</strong> ${escapeHtml(courseFocus)}</p>
        </section>

        <section class="canvas-start">
          <h2>Start Here</h2>
          <div class="canvas-rule thin"></div>
          ${renderStartTiles(startTiles)}
        </section>

        <footer class="canvas-footer">
          <strong>${escapeHtml(courseCode)}</strong> | 12 Weeks | 3 Credits | ${escapeHtml(enrollment.hours)} Contact Hours | ${escapeHtml(enrollment.category)}
        </footer>
      </main>

      <aside class="canvas-rightbar">
        <div class="canvas-action-stack student-actions">
          <a href="/student/enrollments/${enrollment.id}?lesson=${firstLesson.id}">View Course Stream</a>
          <a href="/student/enrollments/${enrollment.id}?view=calendar">View Course Calendar</a>
          <a href="/student/profile">View Course Notifications</a>
        </div>
        ${renderCourseToDo(gradeItems, courseBaseHref, { limit: 6, courseTitle: enrollment.title })}
      </aside>
    </section>
  `;
  render(req, res, enrollment.title, body, { courseCanvas: true });
});

app.post("/student/enrollments/:id/progress", requireAuth, requireRole("student"), (req, res) => {
  if (isClassLocked(req.user)) {
    flash(req, "Class access is locked until the office marks your student file as organized.");
    return res.redirect("/student");
  }
  const progress = Math.max(0, Math.min(100, Number(req.body.progress || 0)));
  db.prepare("UPDATE enrollments SET progress = ? WHERE id = ? AND user_id = ?").run(progress, Number(req.params.id), req.user.id);
  flash(req, "Progress updated.");
  res.redirect(`/student/enrollments/${Number(req.params.id)}`);
});

app.get("/admin/ghl", requireAuth, requireRole("admin"), (req, res) => {
  const events = db.prepare("SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 20").all();
  const body = `
    <div class="page-head">
      <div>
        <h1>GoHighLevel Integration</h1>
        <p>Use this webhook after a course purchase to create or update a student and enroll them in the matching course.</p>
      </div>
    </div>
    <section class="card">
      <h2>Webhook endpoint</h2>
      <p><code>POST http://localhost:${port}/webhooks/ghl/purchase</code></p>
      <p class="muted">Set the header <code>x-bmhi-webhook-secret</code> to your <code>GHL_WEBHOOK_SECRET</code>. Payloads can include <code>email</code>, <code>firstName</code>, <code>lastName</code>, <code>phone</code>, <code>productName</code>, <code>productId</code>, <code>courseSlug</code>, and <code>transactionId</code>. New GHL students are enrolled but class access stays locked until staff marks the student as organized.</p>
    </section>
    <section class="table-card" style="margin-top:18px">
      <table>
        <thead><tr><th>Time</th><th>External ID</th><th>Status</th><th>Message</th></tr></thead>
        <tbody>
          ${events.map((event) => `
            <tr>
              <td>${escapeHtml(event.created_at)}</td>
              <td>${escapeHtml(event.external_id || "")}</td>
              <td><span class="pill">${escapeHtml(event.status)}</span></td>
              <td>${escapeHtml(event.message || "")}</td>
            </tr>
          `).join("") || `<tr><td class="empty" colspan="4">No webhook events received yet.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
  render(req, res, "GHL Integration", body);
});

app.post("/webhooks/ghl/purchase", (req, res) => {
  const expected = process.env.GHL_WEBHOOK_SECRET;
  if (expected && req.get("x-bmhi-webhook-secret") !== expected) {
    return res.status(401).json({ ok: false, error: "Invalid webhook secret" });
  }

  const payload = req.body || {};
  const email = String(payload.email || payload.contact?.email || "").trim().toLowerCase();
  const externalId = String(payload.transactionId || payload.orderId || payload.paymentId || payload.id || "");

  try {
    if (!email) throw new Error("Missing student email");
    const course = findCourseFromPayload(payload);
    if (!course) throw new Error("Could not match payload to a published course");

    let user = db.prepare("SELECT * FROM users WHERE lower(email) = ?").get(email);
    let temporaryPassword = null;
    if (!user) {
      const [firstName, lastName] = splitName(payload);
      temporaryPassword = randomPassword();
      const result = db.prepare(`
        INSERT INTO users (role, first_name, last_name, email, phone, password_hash, organization_status, class_lock_reason)
        VALUES ('student', ?, ?, ?, ?, ?, 'not_organized', ?)
      `).run(
        firstName,
        lastName,
        email,
        String(payload.phone || payload.contact?.phone || ""),
        bcrypt.hashSync(temporaryPassword, 12),
        "Purchased through GHL; pending registrar organization and clearance."
      );
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    }

    const enrollment = db.prepare(`
      INSERT OR IGNORE INTO enrollments (user_id, course_id, source, external_order_id)
      VALUES (?, ?, 'ghl', ?)
    `).run(user.id, course.id, externalId || null);

    const message = `Enrolled ${email} in ${course.title}${user.organization_status === "not_organized" ? "; class access locked pending organization" : ""}`;
    db.prepare("INSERT INTO webhook_events (source, external_id, payload, status, message) VALUES ('ghl', ?, ?, 'processed', ?)").run(
      externalId,
      JSON.stringify(payload),
      message
    );

    res.json({
      ok: true,
      createdStudent: Boolean(temporaryPassword),
      temporaryPassword,
      enrollmentCreated: enrollment.changes > 0,
      classAccess: user.organization_status === "not_organized" ? "locked" : "unlocked",
      course: { id: course.id, title: course.title, slug: course.slug }
    });
  } catch (error) {
    db.prepare("INSERT INTO webhook_events (source, external_id, payload, status, message) VALUES ('ghl', ?, ?, 'failed', ?)").run(
      externalId,
      JSON.stringify(payload),
      error.message
    );
    res.status(422).json({ ok: false, error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).send(layout({ title: "Not found", user: currentUser(req), body: `<div class="card"><h1>Not found</h1><p class="muted">That page does not exist.</p></div>` }));
});

app.listen(port, () => {
  console.log(`${instituteName} SIS/LMS running at http://localhost:${port}`);
});
