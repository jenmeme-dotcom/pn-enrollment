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
const { escapeHtml, layout, money, date, stat, progressBar, initialsFor } = require("./ui");

initialize();

const app = express();
const port = Number(process.env.PORT || 4321);
const instituteName = process.env.INSTITUTE_NAME || "Broward-Miami Health Institute";
const courseNavItems = ["Home", "Announcements", "Modules", "Assignments", "Discussions", "Grades", "People", "Pages", "Files", "Syllabus", "Outcomes", "Rubrics", "Quizzes", "Collaborations", "Course Analytics", "Settings"];
const hideableCourseSections = courseNavItems.filter((item) => item !== "Home");
const americanHeartAssociationSlugs = new Set([
  "basic-life-support",
  "advanced-cardiovascular-life-support",
  "pediatric-advanced-life-support"
]);
const emailDeliveryEnabled = process.env.EMAIL_DELIVERY_ENABLED === "true";
const emailFrom = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@browardmiamihi.local";
const externalBaseUrl = (process.env.PUBLIC_APP_URL || "https://bmhi-student-portal.onrender.com").replace(/\/+$/, "");
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(path.dirname(databaseFile), "uploads"));
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
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || "").toLowerCase().slice(0, 12);
      callback(null, `${crypto.randomUUID()}${extension}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (allowedUploadTypes.has(file.mimetype)) return callback(null, true);
    callback(new Error("Upload must be a PDF, image, Word document, or Excel file."));
  }
});

app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "1mb" }));
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
  const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  let cursor = 0;
  let output = "";
  for (const match of text.matchAll(urlPattern)) {
    output += escapeHtml(text.slice(cursor, match.index));
    const href = normalizeExternalUrl(match[0]);
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

function messageList(messages, viewerId, emptyText) {
  if (!messages.length) return `<p class="empty">${escapeHtml(emptyText)}</p>`;
  return `
    <div class="message-list">
      ${messages.map((message) => {
        const isIncoming = Number(message.recipient_id) === Number(viewerId);
        const isUnread = isIncoming && !message.read_at;
        const deliveryLabel = message.external_delivery_status === "sent"
          ? "Email sent"
          : message.external_delivery_status === "failed"
            ? "Email failed"
            : "Portal only";
        return `
          <article class="message-item ${isUnread ? "unread" : ""}">
            <div class="message-head">
              <div>
                <h3>${isUnread ? `<span class="unread-dot" aria-label="Unread message"></span>` : ""}${escapeHtml(message.subject)}</h3>
                <p>${escapeHtml(isIncoming ? `From ${message.sender_name}` : `To ${message.recipient_name}`)} · ${escapeHtml(formatMessageDate(message.created_at))}</p>
              </div>
              <div class="message-badges">
                <span class="pill ${isUnread ? "orange" : ""}">${escapeHtml(isUnread ? "Unread" : isIncoming ? "Read" : "Sent")}</span>
                <span class="pill ${message.external_delivery_status === "failed" ? "orange" : ""}">${escapeHtml(deliveryLabel)}</span>
              </div>
            </div>
            <div class="message-body">${renderTextWithLinks(message.body)}</div>
            ${message.external_delivery_status === "failed" && message.external_delivery_error ? `<p class="message-error">${escapeHtml(message.external_delivery_error)}</p>` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
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
    items: ["Student information", "Finance", "Presence", "Exams", "Online exams", "Lesson plan", "Human resources", "Homework", "Library", "Hostel", "Graduates", "User log", "Review path report"]
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

app.get("/catalog", requireAuth, (req, res) => {
  const body = `
    <div class="page-head">
      <div>
        <h1>School Catalog</h1>
        <p>Broward-Miami Health Institute Institution Catalog 2025-2026, Vol. III. Effective March 2025.</p>
      </div>
      <a class="button" href="/assets/bmhi-institution-catalog-2025-2026.pdf" target="_blank" rel="noopener">Open PDF</a>
    </div>

    <section class="grid cols-4">
      ${stat("Campus", "6320 Miramar Pkwy Suite I")}
      ${stat("Phone", "(754) 204-2704")}
      ${stat("Email", "Info@flcna.com")}
      ${stat("FLDOE License", "#9021")}
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
  const students = db.prepare(`
    SELECT id, first_name, last_name, email, status
    FROM users
    WHERE role = 'student' AND status = 'active'
    ORDER BY last_name, first_name
  `).all();
  const unreadCount = db.prepare("SELECT COUNT(*) AS count FROM messages WHERE recipient_id = ? AND read_at IS NULL").get(req.user.id).count;
  const inbox = db.prepare(`
    SELECT m.*, s.first_name || ' ' || s.last_name AS sender_name, r.first_name || ' ' || r.last_name AS recipient_name
    FROM messages m
    JOIN users s ON s.id = m.sender_id
    JOIN users r ON r.id = m.recipient_id
    WHERE m.recipient_id = ?
    ORDER BY m.created_at DESC
    LIMIT 20
  `).all(req.user.id);
  const sent = db.prepare(`
    SELECT m.*, s.first_name || ' ' || s.last_name AS sender_name, r.first_name || ' ' || r.last_name AS recipient_name
    FROM messages m
    JOIN users s ON s.id = m.sender_id
    JOIN users r ON r.id = m.recipient_id
    WHERE m.sender_id = ?
    ORDER BY m.created_at DESC
    LIMIT 20
  `).all(req.user.id);
  db.prepare("UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE recipient_id = ? AND read_at IS NULL").run(req.user.id);

  const body = `
    <div class="page-head">
      <div>
        <h1>Student Email</h1>
        <p>Send portal messages to students, answer student questions, and keep school communications in one place.</p>
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

    <section class="grid cols-2 message-workspace">
      <form class="card message-compose" method="post" action="/admin/messages">
        <h2>Compose message</h2>
        <label>To</label>
        <select name="recipientId" required>
          <option value="all_students">All active students</option>
          ${students.map((student) => `<option value="${student.id}">${escapeHtml(personName(student))} · ${escapeHtml(student.email)}</option>`).join("")}
        </select>
        <label>Subject</label>
        <input name="subject" maxlength="140" required placeholder="Registration reminder">
        <label>Message</label>
        <textarea name="body" rows="8" required placeholder="Write the student email message here."></textarea>
        <button type="submit">Send message</button>
      </form>

      <article class="card">
        <h2>Inbox</h2>
        ${messageList(inbox, req.user.id, "No student replies yet.")}
      </article>

      <article class="card span-2">
        <h2>Recently sent</h2>
        ${messageList(sent, req.user.id, "No messages sent yet.")}
      </article>
    </section>
  `;
  render(req, res, "Student Email", body);
});

app.post("/admin/messages", requireAuth, requireRole("admin", "instructor"), async (req, res) => {
  const recipientId = String(req.body.recipientId || "");
  const subject = String(req.body.subject || "").trim().slice(0, 140);
  const body = String(req.body.body || "").trim();
  if (!subject || !body) {
    flash(req, "Subject and message are required.");
    return res.redirect("/admin/messages");
  }

  const insertMessage = db.prepare(`
    INSERT INTO messages (sender_id, recipient_id, subject, body)
    VALUES (?, ?, ?, ?)
  `);

  if (recipientId === "all_students") {
    const students = db.prepare(`
      SELECT id, first_name, last_name, email
      FROM users
      WHERE role = 'student' AND status = 'active'
    `).all();
    let externalSent = 0;
    let externalFailed = 0;
    for (const student of students) {
      const messageId = insertMessage.run(req.user.id, student.id, subject, body).lastInsertRowid;
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
  const messageId = insertMessage.run(req.user.id, recipient.id, subject, body).lastInsertRowid;
  const delivery = await deliverExternalEmail({ sender: req.user, recipient, subject, body });
  updateMessageDelivery(messageId, delivery);
  flash(req, delivery.sent ? "Portal message saved and external email sent." : `Portal message saved. ${delivery.reason}`);
  res.redirect("/admin/messages");
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
          ${registrarChecklistItems.map((item) => `<span>${escapeHtml(item.title)}</span>`).join("")}
        </div>
      </div>
    </section>
    <section class="table-card" style="margin-top:18px">
      <table>
        <thead><tr><th>Name</th><th>Contact</th><th>Class access</th><th>Registrar</th><th>Enrollments</th><th>Actions</th></tr></thead>
        <tbody>
          ${students.map((student) => `
            <tr>
              <td><strong>${escapeHtml(student.last_name)}, ${escapeHtml(student.first_name)}</strong><br><span class="muted">${escapeHtml(student.status)}</span></td>
              <td>${escapeHtml(student.email)}<br><span class="muted">${escapeHtml(student.phone || "")}</span></td>
              <td>
                <span class="pill ${student.organization_status === "not_organized" ? "orange" : ""}">${escapeHtml(student.organization_status === "not_organized" ? "Locked" : "Organized")}</span>
                ${student.class_lock_reason ? `<br><span class="muted">${escapeHtml(student.class_lock_reason)}</span>` : ""}
              </td>
              <td>
                <strong>${escapeHtml(student.checklist_complete || 0)}/${escapeHtml(registrarChecklistItems.length)}</strong> ready<br>
                <span class="muted">${escapeHtml(student.checklist_uploads || 0)} upload${Number(student.checklist_uploads || 0) === 1 ? "" : "s"}</span><br>
                <a class="button small ghost" href="/admin/students/${student.id}/registrar-checklist">Checklist</a>
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
        <div class="registrar-timeline">
          ${enrollmentRows.map((row) => `<p><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.status)} · ${escapeHtml(row.progress)}% complete</span></p>`).join("") || `<p><strong>No enrollments</strong><span>Add the student to a course when ready.</span></p>`}
        </div>
      </article>

      <div class="registrar-checklist-grid">
        ${checklist.map((item) => `
          <article class="card registrar-item ${escapeHtml(item.status)}">
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
      INSERT INTO users (role, first_name, last_name, email, phone, password_hash, organization_status, class_lock_reason)
      VALUES ('student', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(req.body.firstName || "").trim(),
      String(req.body.lastName || "").trim(),
      String(req.body.email || "").trim().toLowerCase(),
      String(req.body.phone || "").trim(),
      bcrypt.hashSync(password, 12),
      organizationStatus,
      classLockReason
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
      AND id NOT IN (SELECT user_id FROM enrollments WHERE course_id = ? AND external_order_id IS NULL)
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
        <a class="button" href="/admin/courses/${course.id}/student-view">Student View</a>
        <a class="button ghost" href="/admin/courses/${course.id}">Instructor View</a>
        <a class="button ghost" href="/admin/courses">Back</a>
      </div>
    </div>
    <section class="grid cols-3">
      ${stat("Credential", course.credential_type)}
      ${stat("Clock hours", String(course.hours))}
      ${stat("GHL keys", JSON.parse(course.ghl_product_keys || "[]").join(", "))}
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
  const navItems = visibleCourseNavItems(course);
  const body = `
    <section class="canvas-course-shell instructor-preview">
      <aside class="canvas-global-rail">
        <img src="/assets/bmhi-seal-blue.jpeg" alt="BMHI">
        <span>${escapeHtml(initialsFor(req.user))}</span>
        <i></i><i></i><i></i><i></i><i></i>
      </aside>

      <header class="canvas-populi-bar">
        <a href="/admin/courses/${course.id}/student-view">Student View</a>
        <a href="/admin/courses/${course.id}">Instructor View</a>
        <a href="/admin/courses/${course.id}">Edit Course</a>
        <a href="/admin/courses">All Courses</a>
      </header>

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        <a class="active" href="/admin/courses/${course.id}/student-view">Home</a>
        ${navItems.slice(1).map((item) => `<a href="${item === "Modules" && firstLesson ? `/admin/courses/${course.id}/student-view?lesson=${firstLesson.id}` : `/admin/courses/${course.id}/student-view`}">${escapeHtml(item)}</a>`).join("")}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>

      <main class="canvas-course-main">
        <div class="canvas-mini-head">
          <span></span>
          <strong>${escapeHtml(course.slug === "introduction-to-nursing-practical-nursing" ? "PN 102" : "BMHI 101")}</strong>
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
          <div class="start-tile-grid">
            ${[
              ["book", "Course Syllabus"],
              ["brain", "Learning Modules"],
              ["check", "Assignments & Grades"],
              ["question", "Course Q & A"]
            ].map(([icon, label]) => `
              <a class="start-tile" href="${firstLesson ? `/admin/courses/${course.id}/student-view?lesson=${firstLesson.id}` : `/admin/courses/${course.id}/student-view`}">
                <span class="${icon}"></span>
                <strong>${label}</strong>
              </a>
            `).join("")}
          </div>
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
        <div class="canvas-status">
          <h2>Course Status</h2>
          <p><span class="${course.published ? "published" : ""}"></span>${escapeHtml(course.published ? "Published" : "Unpublished")}</p>
          <small>Instructor preview</small>
        </div>
        <a href="/admin/courses/${course.id}">Edit Course Content</a>
        <a href="/admin/courses/${course.id}">Manage Enrollments</a>
        <a href="/admin/courses/${course.id}">Issue Credentials</a>
      </aside>
    </section>
  `;
  render(req, res, `${course.title} Student View`, body, { courseCanvas: true });
});

app.post("/admin/courses/:id/details", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(Number(req.params.id));
  if (!course) return res.status(404).send("Course not found");
  db.prepare(`
    UPDATE courses
    SET title = ?, category = ?, description = ?, hours = ?, credential_type = ?, delivery_mode = ?
    WHERE id = ?
  `).run(
    String(req.body.title || "").trim(),
    String(req.body.category || "").trim(),
    String(req.body.description || "").trim(),
    Number(req.body.hours || 0),
    String(req.body.credentialType || "").trim(),
    String(req.body.deliveryMode || "").trim(),
    course.id
  );
  flash(req, "Course details updated.");
  res.redirect(`/admin/courses/${course.id}`);
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
  res.redirect(`/admin/courses/${course.id}`);
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
  db.prepare("INSERT OR IGNORE INTO enrollments (user_id, course_id, source) VALUES (?, ?, 'manual')").run(Number(req.body.userId), Number(req.body.courseId));
  flash(req, "Student enrolled.");
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
    SELECT e.*, c.title, c.category, c.description, c.hours, c.credential_type, cr.id AS credential_id
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN credentials cr ON cr.enrollment_id = e.id
    WHERE e.user_id = ?
    ORDER BY e.created_at DESC
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

app.get("/student/courses", requireAuth, requireRole("student"), (req, res) => {
  const enrollments = db.prepare(`
    SELECT e.*, c.title, c.category, c.description, c.hours, c.credential_type, c.delivery_mode, cr.id AS credential_id
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN credentials cr ON cr.enrollment_id = e.id
    WHERE e.user_id = ?
    ORDER BY
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
    "home-health-aide": ["home-health-aide"],
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
  const staff = db.prepare(`
    SELECT id, first_name, last_name, email, role
    FROM users
    WHERE role IN ('admin', 'instructor') AND status = 'active'
    ORDER BY role, last_name, first_name
  `).all();
  const unreadCount = db.prepare("SELECT COUNT(*) AS count FROM messages WHERE recipient_id = ? AND read_at IS NULL").get(req.user.id).count;
  const inbox = db.prepare(`
    SELECT m.*, s.first_name || ' ' || s.last_name AS sender_name, r.first_name || ' ' || r.last_name AS recipient_name
    FROM messages m
    JOIN users s ON s.id = m.sender_id
    JOIN users r ON r.id = m.recipient_id
    WHERE m.recipient_id = ?
    ORDER BY m.created_at DESC
    LIMIT 20
  `).all(req.user.id);
  const sent = db.prepare(`
    SELECT m.*, s.first_name || ' ' || s.last_name AS sender_name, r.first_name || ' ' || r.last_name AS recipient_name
    FROM messages m
    JOIN users s ON s.id = m.sender_id
    JOIN users r ON r.id = m.recipient_id
    WHERE m.sender_id = ?
    ORDER BY m.created_at DESC
    LIMIT 20
  `).all(req.user.id);
  db.prepare("UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE recipient_id = ? AND read_at IS NULL").run(req.user.id);

  const body = `
    <section class="student-registration">
      <div class="financial-head">
        <div>
          <p class="eyebrow">Student Email</p>
          <h1>Inbox</h1>
          <p>Message BMHI staff about courses, registration, billing, records, or student support.</p>
        </div>
        <div class="financial-actions">
          <a class="button ghost" href="/student">Dashboard</a>
          <a class="button ghost" href="/student/profile">My Profile</a>
        </div>
      </div>

      <section class="grid cols-3 registration-stats">
        ${stat("Unread", String(unreadCount))}
        ${stat("Inbox", String(inbox.length))}
        ${stat("External email", smtpReady() ? "Enabled" : "Setup needed")}
      </section>
      ${smtpReady() ? "" : `
        <div class="flash message-config-note">
          External delivery is not active yet. Messages are saved in the portal until SMTP settings are added in Render.
        </div>
      `}

      <section class="grid cols-2 message-workspace">
        <form class="student-panel message-compose" method="post" action="/student/email">
          <h2>New message</h2>
          <label>To</label>
          <select name="recipientId" required>
            ${staff.map((person) => `<option value="${person.id}">${escapeHtml(personName(person))} · ${escapeHtml(person.role)}</option>`).join("")}
          </select>
          <label>Subject</label>
          <input name="subject" maxlength="140" required placeholder="Question about my course">
          <label>Message</label>
          <textarea name="body" rows="8" required placeholder="Write your message to BMHI staff."></textarea>
          <button type="submit">Send message</button>
        </form>

        <article class="student-panel">
          <h2>Inbox</h2>
          ${messageList(inbox, req.user.id, "No messages yet.")}
        </article>

        <article class="student-panel span-2">
          <h2>Sent</h2>
          ${messageList(sent, req.user.id, "No sent messages yet.")}
        </article>
      </section>
    </section>
  `;
  render(req, res, "Student Email", body, { studentPortal: true, activeStudentNav: "email" });
});

app.post("/student/email", requireAuth, requireRole("student"), async (req, res) => {
  const recipient = db.prepare(`
    SELECT id, first_name, last_name, email
    FROM users
    WHERE id = ? AND role IN ('admin', 'instructor') AND status = 'active'
  `).get(Number(req.body.recipientId));
  const subject = String(req.body.subject || "").trim().slice(0, 140);
  const body = String(req.body.body || "").trim();
  if (!recipient || !subject || !body) {
    flash(req, "Please choose a staff recipient and enter a subject and message.");
    return res.redirect("/student/email");
  }
  const result = db.prepare(`
    INSERT INTO messages (sender_id, recipient_id, subject, body)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, recipient.id, subject, body);
  const delivery = await deliverExternalEmail({ sender: req.user, recipient, subject, body });
  updateMessageDelivery(result.lastInsertRowid, delivery);
  flash(req, delivery.sent ? "Message saved and external email sent to staff." : `Message saved in the portal. ${delivery.reason}`);
  res.redirect("/student/email");
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

  const totalMinutes = lessons.reduce((total, lesson) => total + Number(lesson.duration_minutes || 0), 0);
  const courseCode = enrollment.category === "Practical Nursing Course"
    ? `PN-${String(enrollment.id).padStart(3, "0")}`
    : `BMHI-${String(enrollment.id).padStart(3, "0")}`;
  const courseHomeTitle = `${enrollment.title} Course Home`;
  const courseFocus = enrollment.description || `${enrollment.title} coursework, lessons, assignments, attendance, progress tracking, and completion requirements.`;
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
  const populiItems = ["Home", "Files", "Calendar", "Email", "Financial", "Bookstore", "Library"];
  const startTiles = [
    { icon: "book", label: "Course Syllabus", href: `/student/enrollments/${enrollment.id}?lesson=${firstLesson.id}` },
    { icon: "brain", label: "Learning Modules", href: `/student/enrollments/${enrollment.id}?lesson=${firstLesson.id}` },
    { icon: "check", label: "Assignments & Grades", href: `/student/enrollments/${enrollment.id}?lesson=${firstLesson.id}` },
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
  const body = req.query.lesson ? `
    <section class="canvas-course-shell canvas-lesson-shell">
      <aside class="canvas-global-rail">
        <img src="/assets/bmhi-seal-blue.jpeg" alt="BMHI">
        <span>${escapeHtml(initialsFor(req.user))}</span>
        <i></i><i></i><i></i><i></i><i></i>
      </aside>

      <header class="canvas-populi-bar">
        <a href="/student">Student Home</a>
        ${populiItems.map((item) => `<a href="${item === "Home" ? "/student" : item === "Financial" ? "/student/financial" : "/student/profile"}">${escapeHtml(item)}</a>`).join("")}
      </header>

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        ${navItems.map((item) => `<a class="${item === "Modules" ? "active" : ""}" href="/student/enrollments/${enrollment.id}">${escapeHtml(item)}</a>`).join("")}
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
    <section class="canvas-course-shell">
      <aside class="canvas-global-rail">
        <img src="/assets/bmhi-seal-blue.jpeg" alt="BMHI">
        <span>${escapeHtml(initialsFor(req.user))}</span>
        <i></i><i></i><i></i><i></i><i></i>
      </aside>

      <header class="canvas-populi-bar">
        <a href="/student">Student Home</a>
        ${populiItems.map((item) => `<a href="${item === "Home" ? "/student" : item === "Financial" ? "/student/financial" : "/student/profile"}">${escapeHtml(item)}</a>`).join("")}
      </header>

      <aside class="canvas-course-nav" id="canvas-course-navigation">
        <a class="active" href="/student/enrollments/${enrollment.id}">Home</a>
        ${navItems.slice(1).map((item) => `<a href="/student/enrollments/${enrollment.id}">${escapeHtml(item)}</a>`).join("")}
      </aside>
      <button class="canvas-sidebar-toggle" type="button" data-toggle-course-sidebar aria-expanded="true" aria-controls="canvas-course-navigation" aria-label="Collapse course navigation" title="Collapse course navigation">&lt;</button>
      ${courseOutlinePanel}

      <main class="canvas-course-main">
        <div class="canvas-mini-head">
          <span></span>
          <strong>${escapeHtml(courseCode)}</strong>
        </div>
        <h1>${escapeHtml(enrollment.title)}</h1>
        <div class="canvas-rule"></div>
        <section class="canvas-home-card">
          <h2>${escapeHtml(courseHomeTitle)}</h2>
          <p>${escapeHtml(enrollment.description)}</p>
          <p><strong>Course focus:</strong> ${escapeHtml(courseFocus)}</p>
        </section>

        <section class="canvas-start">
          <h2>Start Here</h2>
          <div class="canvas-rule thin"></div>
          <div class="start-tile-grid">
            ${startTiles.map((tile) => `
              <a class="start-tile" href="${escapeHtml(tile.href)}">
                <span class="${escapeHtml(tile.icon)}"></span>
                <strong>${escapeHtml(tile.label)}</strong>
              </a>
            `).join("")}
          </div>
        </section>

        <section class="canvas-modules">
          <h2>Learning Modules</h2>
          ${moduleGroups.slice(0, 6).map((module) => `
            <article>
              <strong>${escapeHtml(module.position)}. ${escapeHtml(module.title)}</strong>
              <span>${escapeHtml(module.lessons.length)} lessons</span>
              <a href="/student/enrollments/${enrollment.id}?lesson=${module.lessons[0].id}">Open</a>
            </article>
          `).join("")}
        </section>

        <footer class="canvas-footer">
          <strong>${escapeHtml(courseCode)}</strong> | ${escapeHtml(enrollment.hours)} Contact Hours | ${escapeHtml(enrollment.category)} | ${escapeHtml(enrollment.delivery_mode)}
        </footer>
      </main>

      <aside class="canvas-rightbar">
        <div class="canvas-status">
          <h2>Course Status</h2>
          <p><span class="${enrollment.status === "completed" ? "published" : ""}"></span>${escapeHtml(enrollment.status === "completed" ? "Completed" : "Active")}</p>
          ${progressBar(enrollment.progress)}
          <small>${escapeHtml(enrollment.progress)}% complete</small>
        </div>
        <a href="/student/enrollments/${enrollment.id}?lesson=${firstLesson.id}">View Course Stream</a>
        <a href="/student/enrollments/${enrollment.id}?lesson=${firstLesson.id}">Course Analytics</a>
        <a href="/student/profile">View Course Notifications</a>
        <div class="coming-up">
          <h2>Coming Up</h2>
          ${upcomingLessons.map((lesson) => `
            <p><a href="/student/enrollments/${enrollment.id}?lesson=${lesson.id}">${escapeHtml(lesson.title)}</a><br><span>${escapeHtml(lesson.duration_minutes)} minutes</span></p>
          `).join("")}
        </div>
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
