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
  const rawValue = String(value).trim();
  const parsedDate = new Date(/^\d{4}-\d{2}-\d{2}$/.test(rawValue) ? `${rawValue}T12:00:00` : rawValue);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(parsedDate);
}

function percent(value = 0) {
  return `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
}

function navFor(user, pendingAssignmentReviewCount = 0, staffWorkspace = "operations") {
  if (!user) return "";
  const reviewCount = user.role === "instructor" && String(user.email || "").toLowerCase() === "dayana.diaz@browardmiamihi.com"
    ? Math.max(0, Number(pendingAssignmentReviewCount) || 0) : 0;
  const assignmentInboxLink = `<a class="${reviewCount ? "assignment-review-alert" : ""}" href="/admin/assignment-submissions">Assignment Inbox${reviewCount ? ` <b class="assignment-review-count" aria-label="${escapeHtml(reviewCount)} assignments need review">${escapeHtml(reviewCount)}</b>` : ""}</a>`;
  const teachingLinks = `
    <a href="/admin/courses">Courses</a>
    ${assignmentInboxLink}
    <a href="/admin/student-contacts">Student contacts</a>
    <a href="/admin/schedule">Schedule</a>
    <a href="/admin/messages">Inbox</a>
  `;
  const operationsLinks = `
    <a href="/admin/students">Students</a>
    <a href="/admin/student-contacts">Student contacts</a>
    <a href="/admin/admissions">Admissions</a>
    <a href="/admin/billing">Billing</a>
    <a href="/admin/messages">Inbox</a>
  `;
  const sharedMore = `
    <a href="/admin/student-evaluations">Student Evals</a>
    <a href="/admin/hesi">HESI Scores</a>
    <a href="/admin/staff-portal">Staff Portal</a>
    <a href="/admin/help">SOPs</a>
    <a href="/catalog">Catalog</a>
  `;
  const adminLinks = `
    <a href="${staffWorkspace === "teaching" ? "/admin/courses" : "/admin"}">Dashboard</a>
    ${staffWorkspace === "teaching" ? teachingLinks : operationsLinks}
    <details class="sis-more-menu">
      <summary>More</summary>
      <div class="sis-more-links">
        <span class="sis-menu-label">Switch workspace</span>
        <a href="${staffWorkspace === "teaching" ? "/admin" : "/admin/courses"}">${staffWorkspace === "teaching" ? "Operations" : "Online Courses"}</a>
        <span class="sis-menu-label">${staffWorkspace === "teaching" ? "Student administration" : "Teaching"}</span>
        ${staffWorkspace === "teaching" ? '<a href="/admin/students">Students</a><a href="/admin/admissions">Admissions</a><a href="/admin/billing">Billing</a>' : '<a href="/admin/courses">Courses</a>' + assignmentInboxLink + '<a href="/admin/schedule">Schedule</a>'}
        ${sharedMore}
        <span class="sis-menu-label">Administration</span>
        <a href="/admin/features">Features</a>
        <a href="/admin/admin-roles">Admin roles</a>
        <a href="/admin/instructor-roles">Instructor roles</a>
        <a href="/admin/onsite-visit">OSV Visit</a>
        <a href="/admin/financial-aid">Financial Aid</a>
        <a href="/admin/ghl">GHL</a>
      </div>
    </details>
  `;
  const instructorLinks = `
    <a href="/admin/courses">Dashboard</a>
    ${teachingLinks}
    <details class="sis-more-menu"><summary>More</summary><div class="sis-more-links"><a href="/admin/students">Students</a>${sharedMore}</div></details>
  `;
  const studentLinks = `
    <a href="/student/dashboard">Dashboard</a>
    <a href="/student">Home</a>
    <a href="/student/courses">My Courses</a>
    <a href="/student/calendar">Calendar</a>
    <a href="/student/email">Inbox</a>
    <a href="/help/browser-cache">Help</a>
    <a href="/catalog">Catalog</a>
  `;
  return user.role === "student" ? studentLinks : user.role === "instructor" ? instructorLinks : adminLinks;
}

function initialsFor(user) {
  if (!user) return "";
  return `${String(user.first_name || "").charAt(0)}${String(user.last_name || "").charAt(0)}`.toUpperCase() || "U";
}

const studentNavItems = [
  { key: "dashboard", href: "/student/dashboard", label: "Dashboard" },
  { key: "sis-home", href: "/student", label: "Home" },
  { key: "courses", href: "/student/courses", label: "Enrolled Courses" },
  { key: "calendar", href: "/student/calendar", label: "Calendar" },
  { key: "email", href: "/student/email", label: "Inbox" },
  { key: "profile", href: "/student/profile", label: "My Profile" },
  { key: "evaluations", href: "/student/evaluations", label: "Student Evaluations" },
  { key: "fees", href: "/student/financial", label: "Fees" },
  { key: "registration", href: "/student/registration", label: "Registration" },
  { key: "current-grades", href: "/student/current-grade-report", label: "Current Grade Report" },
  { key: "transcript", href: "/student/transcript", label: "Unofficial Transcript" },
  { key: "help", href: "/help/browser-cache", label: "Help" },
  { key: "download", href: "/catalog", label: "Download Center" },
  { key: "attendance", href: "/student/profile#attendance", label: "Attendance" }
];

function studentPortalLink(activeStudentNav, { key, href, label }) {
  return `<a class="${activeStudentNav === key ? "active" : ""}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function studentPortalLinks(activeStudentNav) {
  return studentNavItems.map((item) => studentPortalLink(activeStudentNav, item)).join("");
}

function layout({ title, user, flash, body, full = false, studentPortal = false, activeStudentNav = "dashboard", courseCanvas = false, pendingAssignmentReviewCount = 0, operationsDashboard = false, studentContacts = false, staffWorkspace = "operations" }) {
  const institute = escapeHtml(process.env.INSTITUTE_NAME || "Broward-Miami Health Institute");
  const isSis = Boolean(user && user.role !== "student" && !full);
  const isStudentPortal = Boolean(user && user.role === "student" && studentPortal && !full && !courseCanvas);
  const bodyClass = (full ? "credential-page" : courseCanvas ? "course-canvas-mode" : isSis ? "sis-mode" : isStudentPortal ? "student-portal-mode" : "") + (isSis && operationsDashboard ? " dashboard-mode" : isSis && studentContacts ? " contact-directory-mode" : "");
  const studentNav = studentPortalLinks(activeStudentNav);
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
    (() => {
      const button = document.querySelector("[data-course-menu-toggle]");
      const menu = document.getElementById("canvas-course-submenu");
      if (!button || !menu) return;

      const setOpen = (open) => {
        menu.hidden = !open;
        button.setAttribute("aria-expanded", String(open));
        button.setAttribute("aria-label", open ? "Close course menu" : "Open course menu");
        button.setAttribute("title", open ? "Close course menu" : "Open course menu");
      };

      button.addEventListener("click", () => setOpen(menu.hidden));
      menu.addEventListener("click", (event) => {
        if (event.target.closest("a")) setOpen(false);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") setOpen(false);
      });
      document.addEventListener("click", (event) => {
        if (menu.hidden || button.contains(event.target) || menu.contains(event.target)) return;
        setOpen(false);
      });
    })();
    (() => {
      document.querySelectorAll("[data-activity-group]").forEach((group) => {
        const button = group.querySelector(".activity-toggle");
        const body = group.querySelector(".activity-body");
        if (!button || !body) return;

        const setExpanded = (expanded) => {
          body.hidden = !expanded;
          group.classList.toggle("expanded", expanded);
          group.classList.toggle("compact", !expanded);
          button.setAttribute("aria-expanded", String(expanded));
          button.textContent = expanded ? "SHOW LESS" : "SHOW MORE";
        };

        setExpanded(button.getAttribute("aria-expanded") === "true");
        button.addEventListener("click", () => {
          setExpanded(button.getAttribute("aria-expanded") !== "true");
        });
      });
    })();
  </script>` : "";
  const studentPortalScript = isStudentPortal ? `
  <script>
    (() => {
      const button = document.querySelector("[data-student-menu-toggle]");
      const menu = document.getElementById("student-submenu");
      if (!button || !menu) return;

      const setOpen = (open) => {
        menu.hidden = !open;
        document.body.classList.toggle("student-submenu-open", open);
        button.setAttribute("aria-expanded", String(open));
      };

      button.addEventListener("click", () => setOpen(menu.hidden));
      menu.addEventListener("click", (event) => {
        if (event.target.closest("a")) setOpen(false);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") setOpen(false);
      });
      document.addEventListener("click", (event) => {
        if (menu.hidden || button.contains(event.target) || menu.contains(event.target)) return;
        setOpen(false);
      });
    })();
  </script>` : "";
  const header = full || courseCanvas ? "" : isSis ? `
    <header class="sis-header">
      <div class="sis-topbar">
        <a class="sis-logo" href="${user.role === "instructor" ? "/admin/courses" : "/admin"}">
          <img src="/assets/bmhi-wordmark.jpeg" alt="${institute}">
        </a>
        <form class="sis-search" action="/admin/student-contacts" method="get">
          <label class="sr-only" for="sis-search">Search</label>
          <input id="sis-search" name="contactQuery" type="search" placeholder="Find student by name, email or phone">
        </form>
        <span class="sis-topbar-spacer" aria-hidden="true"></span>
        <div class="sis-tools-block"><div class="sis-tools">
          <a class="sis-tool task-tickets-link" href="/admin/tickets" title="Task Tickets">Task Tickets</a>
          ${user.role === "admin" ? `<a class="sis-tool" href="/admin/features/system-settings" title="Settings">Settings</a>` : ""}
          <span class="sis-avatar" title="${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}">${escapeHtml(initialsFor(user))}</span>
          <form method="post" action="/logout">
            <button class="sis-signout" type="submit">Sign out</button>
          </form>
        </div><span class="sis-session">Current session: 2026-27</span></div>
      </div>
      <div class="sis-subbar">
        <nav class="sis-subnav" aria-label="Admin portal menu">
          ${navFor(user, pendingAssignmentReviewCount, staffWorkspace)}
        </nav>
      </div>
    </header>
  ` : isStudentPortal ? `
    <header class="student-topbar">
      <a class="student-brand" href="/student">
        <img src="/assets/bmhi-wordmark.jpeg" alt="${institute}">
      </a>
      <button class="student-menu" type="button" aria-label="Open student menu" aria-expanded="false" aria-controls="student-submenu" data-student-menu-toggle>
        <span aria-hidden="true">☰</span>
        <span>Menu</span>
      </button>
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
    <nav id="student-submenu" class="student-submenu" aria-label="Student submenu" hidden>
      ${studentNav}
    </nav>
    <aside class="student-sidebar">
      <div class="student-session">Current Session: 2026-27</div>
      <nav aria-label="Student portal">
        ${studentNav}
      </nav>
    </aside>
  ` : `
    <header class="topbar">
      <a class="brand" href="${user?.role === "student" ? "/student" : "/admin"}">
        <img class="brand-logo" src="/assets/bmhi-wordmark.jpeg" alt="${institute}">
        <span class="brand-text"><strong>${institute}</strong><small>SIS + LMS</small></span>
      </a>
      <nav>${navFor(user, pendingAssignmentReviewCount, staffWorkspace)}</nav>
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
  <link rel="icon" type="image/png" href="/assets/bmhi-favicon.png">
  <link rel="apple-touch-icon" href="/assets/bmhi-favicon.png">
  <link rel="stylesheet" href="/styles.css">
  ${isSis && (operationsDashboard || studentContacts) ? '<link rel="stylesheet" href="/operations-dashboard.css">' : ""}
</head>
<body class="${bodyClass}">
  ${header}
  <main class="${full ? "print-root" : courseCanvas ? "canvas-root" : isStudentPortal ? "student-shell" : "shell"}">
    ${flash ? `<div class="flash">${escapeHtml(flash)}</div>` : ""}
    ${body}
  </main>
  ${courseCanvasScript}
  ${studentPortalScript}
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
