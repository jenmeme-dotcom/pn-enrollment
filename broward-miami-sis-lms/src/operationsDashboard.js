"use strict";

const { escapeHtml } = require("./ui");

const iconPaths = {
  people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  book: '<path d="M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>',
  check: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 12 3 3 7-7"/>',
  inbox: '<path d="M4 4h16l2 12v4H2v-4ZM2 16h6l2 3h4l2-3h6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3Z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  shield: '<path d="m12 3 9 4v6c0 5-9 9-9 9S3 18 3 13V7Z"/><path d="m8 12 3 3 5-6"/>',
  chart: '<path d="M4 3v18h17M8 16v-5M13 16V6M18 16v-8"/>'
};

function icon(name) {
  return `<svg class="ops-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconPaths[name] || iconPaths.folder}</svg>`;
}

function navLink(href, label, iconName, active = false) {
  return `<a class="ops-nav-link${active ? " is-current" : ""}" href="${escapeHtml(href)}"${active ? ' aria-current="page"' : ""}>${icon(iconName)}<span>${escapeHtml(label)}</span></a>`;
}

// Markup arguments are rendered by the server's existing trusted view helpers.
function renderOperationsDashboard({
  cohortLabel = "All cohorts",
  statsMarkup = "",
  filterMarkup = "",
  tuitionMarkup = "",
  contactsMarkup = "",
  rosterMarkup = "",
  urgentMarkup = ""
} = {}) {
  return `
    <div class="operations-dashboard">
      <a class="ops-skip-link" href="#student-contacts">Skip to student contacts</a>
      <aside class="ops-rail" aria-label="School operations navigation">
        <div class="ops-rail-brand">${icon("shield")}<div><strong>BMHI</strong><span>School workspace</span></div></div>
        <details class="ops-navigation" id="operations-navigation" open>
          <summary class="ops-nav-toggle">Workspace navigation <span aria-hidden="true">⌄</span></summary>
          <nav class="ops-nav-content" aria-label="Operations">
            <details class="ops-nav-group ops-secondary-nav ops-primary-nav" open>
              <summary class="ops-nav-label">Operations <span aria-hidden="true">⌄</span></summary>
              ${navLink("/admin#student-contacts", "Student contacts", "people", true)}
              ${navLink("/admin/students", "Student records", "folder")}
              ${navLink("/admin/admissions", "Admissions", "check")}
              ${navLink("/admin/billing", "Tuition & Billing", "folder")}
              ${navLink("/admin/billing#school-vault", "School Vault", "shield")}
              ${navLink("/admin/messages", "School inbox", "inbox")}
              ${navLink("/admin/tickets", "Task tickets", "check")}
              <a class="button ops-enrollment-link" href="/admin/lpn-enrollment">LPN Enrollment</a>
            </details>
            <details class="ops-nav-group ops-secondary-nav">
              <summary class="ops-nav-label">Teaching <span aria-hidden="true">⌄</span></summary>
              ${navLink("/admin/courses", "Course library", "book")}
              ${navLink("/admin/assignment-submissions", "Assignment inbox", "inbox")}
              ${navLink("/admin/schedule", "Schedule", "calendar")}
              ${navLink("/admin/hesi", "HESI scores", "chart")}
              ${navLink("/admin/student-evaluations", "Student evaluations", "check")}
            </details>
            <details class="ops-nav-group ops-secondary-nav ops-admin-nav">
              <summary class="ops-nav-label">Administration <span aria-hidden="true">⌄</span></summary>
              ${navLink("/admin/financial-aid", "Financial aid", "folder")}
              ${navLink("/admin/staff-portal", "Staff time", "calendar")}
              ${navLink("/admin/admin-roles", "Admin roles", "people")}
              ${navLink("/admin/instructor-roles", "Instructor roles", "people")}
              ${navLink("/admin/instructor-roles#create-instructor", "Add instructor", "plus")}
              ${navLink("/admin/onsite-visit", "OSV visit", "check")}
              ${navLink("/admin/features", "Admin features", "folder")}
              ${navLink("/admin/features/system-settings", "Settings", "settings")}
              ${navLink("/admin/ghl", "GHL", "folder")}
            </details>
            <div class="ops-rail-resources">
              <a href="/admin/help">SOPs &amp; help</a><a href="/catalog">School catalog</a>
            </div>
          </nav>
        </details>
      </aside>

      <div class="ops-workspace">
        <header class="ops-context-band">
          <div class="ops-context-title">
            <p class="ops-eyebrow">Broward-Miami Health Institute</p>
            <h1>Operations Dashboard</h1>
            <p>Student contacts, enrollment, and registrar follow-up.</p>
          </div>
          <div class="ops-context-actions">
            <span class="ops-cohort-context">${icon("people")} ${escapeHtml(cohortLabel)}</span>
            <a class="button ops-add-student" href="/admin/students">${icon("plus")} Add student</a>
          </div>
        </header>

        <div class="ops-workspace-tabs">
          <nav class="admin-dashboard-toggle" aria-label="Dashboard view">
            <a class="admin-dashboard-toggle-option is-active" href="/admin" aria-current="page">Operations</a>
            <a class="admin-dashboard-toggle-option" href="/admin/courses">Online Courses</a>
          </nav>
          <a class="ops-roster-jump" href="#operations-roster" onclick="document.getElementById('operations-roster').open = true">Enrollment roster ${icon("arrow")}</a>
        </div>

        <div class="ops-workspace-body">
          ${urgentMarkup.trim() ? `<div class="ops-alerts">${urgentMarkup}</div>` : ""}
          <section class="ops-overview" aria-labelledby="operations-overview-title">
            <div class="ops-section-heading"><h2 id="operations-overview-title">School overview</h2><span>${escapeHtml(cohortLabel)}</span></div>
            <div class="ops-stats">${statsMarkup}</div>
          </section>
          ${filterMarkup ? `<div class="ops-cohort-filter">${filterMarkup}</div>` : ""}
          ${tuitionMarkup}
          <section class="ops-contact-panel" aria-label="Student contact workspace">${contactsMarkup}</section>
          <details class="ops-roster-panel" id="operations-roster">
            <summary class="ops-roster-heading">
              <span class="ops-roster-heading-icon">${icon("folder")}</span>
              <span><strong>Enrollment roster &amp; access</strong><small>Courses, progress, photo review, and registrar actions</small></span>
              <span class="ops-disclosure-chevron" aria-hidden="true">⌄</span>
            </summary>
            <div class="ops-roster-content">${rosterMarkup}</div>
          </details>
          <footer class="ops-workspace-footer"><span>BMHI · Student information system</span><a href="/admin/help">Workspace help ${icon("arrow")}</a></footer>
        </div>
      </div>
    </div>
    <script>
      (() => {
        const navigation = document.getElementById('operations-navigation');
        const smallScreen = window.matchMedia('(max-width: 900px)');
        const sizeNavigation = () => { navigation.open = !smallScreen.matches; };
        sizeNavigation();
        smallScreen.addEventListener('change', sizeNavigation);
      })();
    </script>
  `;
}

module.exports = { renderOperationsDashboard };
