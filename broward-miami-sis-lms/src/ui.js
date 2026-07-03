function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(cents = 0) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function date(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function percent(value = 0) {
  return `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
}

function navFor(user) {
  if (!user) return "";
  const adminLinks = `
    <a href="/admin">Dashboard</a>
    <a href="/admin/features">Features</a>
    <a href="/admin/students">Students</a>
    <a href="/admin/courses">Courses</a>
    <a href="/admin/financial-aid">Financial Aid</a>
    <a href="/admin/billing">Billing</a>
    <a href="/admin/messages">Email</a>
    <a href="/catalog">Catalog</a>
    <a href="/admin/ghl">GHL</a>
  `;
  const instructorLinks = `
    <a href="/admin">Dashboard</a>
    <a href="/admin/students">Students</a>
    <a href="/admin/courses">Courses</a>
    <a href="/admin/messages">Email</a>
    <a href="/catalog">Catalog</a>
  `;
  const studentLinks = `
    <a href="/student">My Courses</a>
    <a href="/student/email">Email</a>
    <a href="/catalog">Catalog</a>
  `;
  return user.role === "student" ? studentLinks : user.role === "instructor" ? instructorLinks : adminLinks;
}

function initialsFor(user) {
  if (!user) return "";
  return `${String(user.first_name || "").charAt(0)}${String(user.last_name || "").charAt(0)}`.toUpperCase() || "U";
}

function studentPortalLink(activeStudentNav, key, href, label) {
  return `<a class="${activeStudentNav === key ? "active" : ""}" href="${href}">${label}</a>`;
}

function layout({ title, user, flash, body, full = false, studentPortal = false, activeStudentNav = "dashboard", courseCanvas = false }) {
  const institute = escapeHtml(process.env.INSTITUTE_NAME || "Broward-Miami Health Institute");
  const isSis = Boolean(user && user.role !== "student" && !full);
  const isStudentPortal = Boolean(user && user.role === "student" && studentPortal && !full && !courseCanvas);
  const bodyClass = full ? "credential-page" : courseCanvas ? "course-canvas-mode" : isSis ? "sis-mode" : isStudentPortal ? "student-portal-mode" : "";
  const courseCanvasScript = courseCanvas ? `
  <script>
    (() => {
      const key = "bmhiCourseNavCollapsed";
      const buttons = [...document.querySelectorAll("[data-toggle-course-sidebar]")];
      if (!buttons.length) return;

      const applyState = (collapsed) => {
        document.body.classList.toggle("course-nav-collapsed", collapsed);
        buttons.forEach((button) => {
          const isCaret = button.classList.contains("canvas-sidebar-toggle") || button.classList.contains("course-outline-icon");
          button.setAttribute("aria-expanded", collapsed ? "false" : "true");
          button.setAttribute("aria-label", collapsed ? "Expand course navigation" : "Collapse course navigation");
          button.setAttribute("title", collapsed ? "Expand course navigation" : "Collapse course navigation");
          button.textContent = isCaret ? (collapsed ? ">" : "<") : (collapsed ? "Show menu" : "Hide menu");
        });
      };

      applyState(localStorage.getItem(key) === "true");
      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          const collapsed = !document.body.classList.contains("course-nav-collapsed");
          localStorage.setItem(key, String(collapsed));
          applyState(collapsed);
        });
      });
    })();
  </script>` : "";
  const header = full || courseCanvas ? "" : isSis ? `
    <header class="sis-header">
      <div class="sis-topbar">
        <a class="sis-logo" href="/admin">
          <img src="/assets/bmhi-wordmark.jpeg" alt="${institute}">
        </a>
        <form class="sis-search" action="/admin/features" method="get">
          <label class="sr-only" for="sis-search">Search</label>
          <input id="sis-search" type="search" placeholder="Search students, courses, reports">
        </form>
        <nav class="sis-app-nav" aria-label="SIS applications">
          <a href="/admin">Home</a>
          <a href="/admin/students">People</a>
          <a href="/admin/courses">Academics</a>
          <a href="/admin/courses">LMS</a>
          <a href="/admin/financial-aid">Financial Aid</a>
          <a href="/admin/billing">Billing</a>
          <a href="/admin/messages">Email</a>
          <a href="/admin/features/reports">Reports</a>
        </nav>
        <div class="sis-tools">
          <a class="sis-tool" href="/admin/features/system-settings" title="Settings">Settings</a>
          <a class="sis-tool" href="/catalog" title="Catalog">Catalog</a>
          <span class="sis-avatar" title="${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}">${escapeHtml(initialsFor(user))}</span>
          <form method="post" action="/logout">
            <button class="sis-signout" type="submit">Sign out</button>
          </form>
        </div>
      </div>
      <div class="sis-subbar">
        <nav class="sis-subnav" aria-label="Current area">${navFor(user)}</nav>
        <span class="sis-session">Current session: 2026-27</span>
      </div>
    </header>
  ` : isStudentPortal ? `
    <header class="student-topbar">
      <a class="student-brand" href="/student">
        <img src="/assets/bmhi-wordmark.jpeg" alt="${institute}">
      </a>
      <button class="student-menu" type="button" aria-label="Menu">Menu</button>
      <strong>${institute}</strong>
      <div class="student-top-actions">
        <span>USD</span>
        <a href="/catalog">Catalog</a>
        <span class="student-alert">1</span>
        <span class="student-avatar">${escapeHtml(initialsFor(user))}</span>
        <form method="post" action="/logout">
          <button class="student-signout" type="submit">Sign out</button>
        </form>
      </div>
    </header>
    <aside class="student-sidebar">
      <div class="student-session">Current Session: 2026-27</div>
      <nav aria-label="Student portal">
        ${studentPortalLink(activeStudentNav, "dashboard", "/student", "Dashboard")}
        ${studentPortalLink(activeStudentNav, "courses", "/student/courses", "Enrolled Courses")}
        ${studentPortalLink(activeStudentNav, "email", "/student/email", "Email")}
        ${studentPortalLink(activeStudentNav, "profile", "/student/profile", "My Profile")}
        ${studentPortalLink(activeStudentNav, "fees", "/student/financial", "Fees")}
        ${studentPortalLink(activeStudentNav, "registration", "/student/registration", "Registration")}
        ${studentPortalLink(activeStudentNav, "transcript", "/student/transcript", "Transcript")}
        ${studentPortalLink(activeStudentNav, "timetable", "/student/profile#attendance", "Class Timetable")}
        ${studentPortalLink(activeStudentNav, "lesson-plan", "/student", "Lesson Plan")}
        ${studentPortalLink(activeStudentNav, "syllabus", "/student", "Syllabus Status")}
        ${studentPortalLink(activeStudentNav, "homework", "/student#homework", "Homework")}
        ${studentPortalLink(activeStudentNav, "exam", "/student/profile#exam", "Online Exam")}
        ${studentPortalLink(activeStudentNav, "leave", "/student/profile#timeline", "Apply Leave")}
        ${studentPortalLink(activeStudentNav, "visitor", "/student/profile#timeline", "Visitor Book")}
        ${studentPortalLink(activeStudentNav, "download", "/catalog", "Download Center")}
        ${studentPortalLink(activeStudentNav, "attendance", "/student/profile#attendance", "Attendance")}
        ${studentPortalLink(activeStudentNav, "exams", "/student/profile#exam", "Examinations")}
      </nav>
    </aside>
  ` : `
    <header class="topbar">
      <a class="brand" href="${user?.role === "student" ? "/student" : "/admin"}">
        <img class="brand-logo" src="/assets/bmhi-wordmark.jpeg" alt="${institute}">
        <span class="brand-text"><strong>${institute}</strong><small>SIS + LMS</small></span>
      </a>
      <nav>${navFor(user)}</nav>
      ${user ? `
        <form method="post" action="/logout">
          <button class="button ghost" type="submit">Sign out</button>
        </form>
      ` : ""}
    </header>
  `;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | ${institute}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="${bodyClass}">
  ${header}
  <main class="${full ? "print-root" : courseCanvas ? "canvas-root" : isStudentPortal ? "student-shell" : "shell"}">
    ${flash ? `<div class="flash">${escapeHtml(flash)}</div>` : ""}
    ${body}
  </main>
  ${courseCanvasScript}
</body>
</html>`;
}

function stat(label, value) {
  return `<div class="stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function progressBar(value) {
  return `<div class="progress" aria-label="${escapeHtml(percent(value))} complete"><span style="width:${escapeHtml(percent(value))}"></span></div>`;
}

module.exports = { escapeHtml, layout, money, date, percent, stat, progressBar, initialsFor };
