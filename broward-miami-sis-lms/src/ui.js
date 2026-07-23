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
    <a href="/admin/admissions">Admissions</a>
    <a href="/admin/features">Features</a>
    <a href="/admin/admin-roles">Admin Roles</a>
    <a href="/admin/instructor-roles">Instructor Roles</a>
    <a href="/admin/students">Students</a>
    <a href="/admin/schedule">Schedule</a>
    <a href="/admin/hesi">HESI Scores</a>
    <a href="/admin/courses">Courses</a>
    <a href="/admin/courses">LMS</a>
    <a href="/admin/onsite-visit">OSV Visit</a>
    <a href="/admin/financial-aid">Financial Aid</a>
    <a href="/admin/billing">Billing</a>
    <a href="/admin/staff-portal">Staff Portal</a>
    <a href="/admin/tickets">Task Tickets</a>
    <a href="/admin/messages">Inbox</a>
    <a href="/catalog">Catalog</a>
    <a href="/admin/ghl">GHL</a>
  `;
  const instructorLinks = `
    <a href="/admin">Dashboard</a>
    <a href="/admin/students">Students</a>
    <a href="/admin/schedule">Schedule</a>
    <a href="/admin/hesi">HESI Scores</a>
    <a href="/admin/courses">Courses</a>
    <a href="/admin/courses">LMS</a>
    <a href="/admin/staff-portal">Staff Portal</a>
    <a href="/admin/tickets">Task Tickets</a>
    <a href="/admin/messages">Inbox</a>
    <a href="/catalog">Catalog</a>
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
  { key: "fees", href: "/student/financial", label: "Fees" },
  { key: "registration", href: "/student/registration", label: "Registration" },
  { key: "transcript", href: "/student/transcript", label: "Transcript" },
  { key: "timetable", href: "/student/profile#attendance", label: "Class Timetable" },
  { key: "help", href: "/help/browser-cache", label: "Help" },
  { key: "lesson-plan", href: "/student/lesson-plan", label: "Lesson Plan" },
  { key: "syllabus", href: "/student/syllabus-status", label: "Syllabus Status" },
  { key: "homework", href: "/student/homework", label: "Homework" },
  { key: "exam", href: "/student/profile#exam", label: "Online Exam" },
  { key: "leave", href: "/student/profile#timeline", label: "Apply Leave" },
  { key: "visitor", href: "/student/profile#timeline", label: "Visitor Book" },
  { key: "download", href: "/catalog", label: "Download Center" },
  { key: "attendance", href: "/student/profile#attendance", label: "Attendance" },
  { key: "exams", href: "/student/profile#exam", label: "Examinations" }
];

function studentPortalLink(activeStudentNav, { key, href, label }) {
  return `<a class="${activeStudentNav === key ? "active" : ""}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function studentPortalLinks(activeStudentNav) {
  return studentNavItems.map((item) => studentPortalLink(activeStudentNav, item)).join("");
}

const supportedLanguages = [
  { code: "en", label: "English" },
  { code: "ht", label: "Creole" },
  { code: "es", label: "Spanish" }
];

const interfaceTranslations = {
  ht: {
    "Dashboard": "Tablo bo",
    "Home": "Akey",
    "Admissions": "Admisyon",
    "Features": "Fonksyon",
    "Admin Roles": "Wol admin",
    "Instructor Roles": "Wol pwofese",
    "Students": "Etidyan",
    "Schedule": "Orè",
    "HESI Scores": "Not HESI",
    "Courses": "Kou",
    "LMS": "LMS",
    "OSV Visit": "Vizit OSV",
    "Financial Aid": "Ed finansye",
    "Billing": "Fakti",
    "Staff Portal": "Portal staff",
    "Task Tickets": "Tikè travay",
    "Inbox": "Bwat mesaj",
    "Catalog": "Katalog",
    "GHL": "GHL",
    "Settings": "Paramet",
    "Help": "Ed",
    "Sign out": "Dekonekte",
    "Menu": "Meni",
    "USD": "USD",
    "Current Session": "Sesyon aktyel",
    "Current session": "Sesyon aktyel",
    "My Courses": "Kou mwen yo",
    "Enrolled Courses": "Kou enskri",
    "Calendar": "Kalandriye",
    "My Profile": "Pwofil mwen",
    "Fees": "Frè",
    "Registration": "Enskripsyon",
    "Transcript": "Relve not",
    "Class Timetable": "Orè klas",
    "Lesson Plan": "Plan leson",
    "Syllabus Status": "Eta syllabus",
    "Homework": "Devwa",
    "Online Exam": "Egzamen sou entènèt",
    "Apply Leave": "Mande konje",
    "Visitor Book": "Liv vizitè",
    "Download Center": "Sant telechajman",
    "Attendance": "Prezans",
    "Examinations": "Egzamen",
    "Choose login": "Chwazi login",
    "Faculty Login": "Login staff",
    "Staff and instructors": "Staff ak pwofese",
    "Student Login": "Login etidyan",
    "Current students": "Etidyan aktyel",
    "Apply as a new student": "Aplike kom nouvo etidyan",
    "Email": "Imel",
    "Password": "Modpas",
    "Sign in": "Konekte",
    "Use an admin, instructor, or student account.": "Itilize yon kont admin, pwofese, oswa etidyan.",
    "Select a login option to continue.": "Chwazi yon opsyon login pou kontinye.",
    "Faculty, staff, and instructors sign in here.": "Staff ak pwofese konekte isit la.",
    "Students sign in here.": "Etidyan konekte isit la.",
    "Course Syllabus": "Syllabus kou",
    "Modules": "Modil",
    "Assignments": "Devwa",
    "Grades": "Not",
    "Discussions": "Diskisyon",
    "People": "Moun",
    "Pages": "Paj",
    "Files": "Dosye",
    "Quizzes": "Quiz",
    "Outcomes": "Rezilta",
    "Rubrics": "Ribrik",
    "Collaborations": "Kolaborasyon",
    "Conferences": "Konferans",
    "Groups": "Gwoup",
    "Chat": "Chat",
    "Language": "Lang"
  },
  es: {
    "Dashboard": "Panel",
    "Home": "Inicio",
    "Admissions": "Admisiones",
    "Features": "Funciones",
    "Admin Roles": "Roles admin",
    "Instructor Roles": "Roles de instructores",
    "Students": "Estudiantes",
    "Schedule": "Horario",
    "HESI Scores": "Puntajes HESI",
    "Courses": "Cursos",
    "LMS": "LMS",
    "OSV Visit": "Visita OSV",
    "Financial Aid": "Ayuda financiera",
    "Billing": "Facturacion",
    "Staff Portal": "Portal del personal",
    "Task Tickets": "Tareas",
    "Inbox": "Bandeja",
    "Catalog": "Catalogo",
    "GHL": "GHL",
    "Settings": "Configuracion",
    "Help": "Ayuda",
    "Sign out": "Cerrar sesion",
    "Menu": "Menu",
    "USD": "USD",
    "Current Session": "Sesion actual",
    "Current session": "Sesion actual",
    "My Courses": "Mis cursos",
    "Enrolled Courses": "Cursos inscritos",
    "Calendar": "Calendario",
    "My Profile": "Mi perfil",
    "Fees": "Cuotas",
    "Registration": "Registro",
    "Transcript": "Transcripcion",
    "Class Timetable": "Horario de clase",
    "Lesson Plan": "Plan de leccion",
    "Syllabus Status": "Estado del silabo",
    "Homework": "Tarea",
    "Online Exam": "Examen en linea",
    "Apply Leave": "Solicitar permiso",
    "Visitor Book": "Libro de visitas",
    "Download Center": "Centro de descargas",
    "Attendance": "Asistencia",
    "Examinations": "Examenes",
    "Choose login": "Elija inicio de sesion",
    "Faculty Login": "Login del personal",
    "Staff and instructors": "Personal e instructores",
    "Student Login": "Login de estudiante",
    "Current students": "Estudiantes actuales",
    "Apply as a new student": "Aplicar como estudiante nuevo",
    "Email": "Correo electronico",
    "Password": "Contrasena",
    "Sign in": "Iniciar sesion",
    "Use an admin, instructor, or student account.": "Use una cuenta de admin, instructor o estudiante.",
    "Select a login option to continue.": "Seleccione una opcion para continuar.",
    "Faculty, staff, and instructors sign in here.": "Personal e instructores inician sesion aqui.",
    "Students sign in here.": "Los estudiantes inician sesion aqui.",
    "Course Syllabus": "Silabo del curso",
    "Modules": "Modulos",
    "Assignments": "Tareas",
    "Grades": "Calificaciones",
    "Discussions": "Discusiones",
    "People": "Personas",
    "Pages": "Paginas",
    "Files": "Archivos",
    "Quizzes": "Pruebas",
    "Outcomes": "Resultados",
    "Rubrics": "Rubricas",
    "Collaborations": "Colaboraciones",
    "Conferences": "Conferencias",
    "Groups": "Grupos",
    "Chat": "Chat",
    "Language": "Idioma"
  }
};

function normalizeLanguage(language = "en") {
  return supportedLanguages.some((item) => item.code === language) ? language : "en";
}

function languageSwitcher(language = "en") {
  const selected = normalizeLanguage(language);
  const prompt = selected === "ht" ? "Lang" : selected === "es" ? "Idioma" : "Language";
  return `
    <form class="language-switcher" method="post" action="/language" aria-label="Change language">
      <span>${escapeHtml(prompt)}</span>
      ${supportedLanguages.map((item) => `
        <button class="${selected === item.code ? "active" : ""}" type="submit" name="language" value="${escapeHtml(item.code)}" aria-pressed="${selected === item.code ? "true" : "false"}">
          ${escapeHtml(item.label)}
        </button>
      `).join("")}
    </form>
  `;
}

function languageScript(language = "en") {
  const selected = normalizeLanguage(language);
  if (selected === "en") return "";
  return `
  <script>
    (() => {
      const translations = ${JSON.stringify(interfaceTranslations[selected] || {})};
      const ignored = "script, style, textarea, input, option, .language-switcher";
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        if (node.parentElement && node.parentElement.closest(ignored)) return;
        const original = node.nodeValue;
        const text = original.trim();
        if (!text || !translations[text]) return;
        const leading = original.match(/^\\s*/)[0];
        const trailing = original.match(/\\s*$/)[0];
        node.nodeValue = leading + translations[text] + trailing;
      });
    })();
  </script>`;
}

function layout({ title, user, flash, body, full = false, studentPortal = false, activeStudentNav = "dashboard", courseCanvas = false, language = "en" }) {
  const institute = escapeHtml(process.env.INSTITUTE_NAME || "Broward-Miami Health Institute");
  const selectedLanguage = normalizeLanguage(language);
  const isSis = Boolean(user && user.role !== "student" && !full);
  const isStudentPortal = Boolean(user && user.role === "student" && studentPortal && !full && !courseCanvas);
  const bodyClass = full ? "credential-page" : courseCanvas ? "course-canvas-mode" : isSis ? "sis-mode" : isStudentPortal ? "student-portal-mode" : "";
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
          const isMenuButton = button.classList.contains("canvas-menu-button");
          const openLabel = isMenuButton ? "Open course navigation" : "Expand course navigation";
          const closeLabel = isMenuButton ? "Hide course navigation" : "Collapse course navigation";
          button.setAttribute("aria-expanded", collapsed ? "false" : "true");
          button.setAttribute("aria-label", collapsed ? openLabel : closeLabel);
          button.setAttribute("title", collapsed ? openLabel : closeLabel);
          button.textContent = isCaret ? (collapsed ? ">" : "<") : isMenuButton ? "☰" : (collapsed ? "Show menu" : "Hide menu");
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
      const buttons = [...document.querySelectorAll("[data-dashboard-course-menu-toggle]")];
      if (!buttons.length) return;

      const allMenus = () => [...document.querySelectorAll(".dashboard-course-menu")];
      const closeAll = (except) => {
        allMenus().forEach((menu) => {
          if (menu === except) return;
          menu.hidden = true;
        });
        buttons.forEach((button) => {
          const menu = document.getElementById(button.getAttribute("aria-controls") || "");
          if (menu !== except) button.setAttribute("aria-expanded", "false");
        });
      };

      buttons.forEach((button) => {
        const menu = document.getElementById(button.getAttribute("aria-controls") || "");
        if (!menu) return;

        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const shouldOpen = menu.hidden;
          closeAll(menu);
          menu.hidden = !shouldOpen;
          button.setAttribute("aria-expanded", String(shouldOpen));
        });

        menu.addEventListener("click", (event) => {
          if (!event.target.closest("a")) return;
          menu.hidden = true;
          button.setAttribute("aria-expanded", "false");
        });
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeAll();
      });
      document.addEventListener("click", (event) => {
        if (event.target.closest("[data-dashboard-course-menu-toggle]") || event.target.closest(".dashboard-course-menu")) return;
        closeAll();
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
    (() => {
      const delay = 3000;
      const tooltip = document.createElement("div");
      tooltip.id = "student-link-summary";
      tooltip.className = "student-link-summary";
      tooltip.setAttribute("role", "tooltip");
      tooltip.hidden = true;
      document.body.appendChild(tooltip);

      const summaries = [
        [/^\\/student\\/dashboard/, "Dashboard overview of your active courses, recent activity, deadlines, and progress. Open it to get a quick snapshot of your learning."],
        [/^\\/student\\/?(?:[?#].*)?$/, "Student home with notices, subject progress, upcoming classes, homework, and enrolled courses. Open it to return to your main portal page."],
        [/^\\/student\\/courses/, "Your enrolled course list. Open it to enter a course, continue lessons, and review course progress."],
        [/^\\/student\\/calendar/, "Your academic calendar. Open it to review classes, assignments, exams, and other scheduled dates."],
        [/^\\/student\\/email/, "Your portal inbox. Open it to read and manage messages related to your classes and school account."],
        [/^\\/student\\/profile#attendance/, "Your attendance and class timetable. Open it to review scheduled class times and recorded attendance."],
        [/^\\/student\\/profile#exam/, "Your examinations section. Open it to review exam information, results, and related academic details."],
        [/^\\/student\\/profile#timeline/, "Your student activity timeline. Open it to review account activity and requests such as leave or visitor records."],
        [/^\\/student\\/profile/, "Your student profile and academic details. Open it to review personal information, attendance, exams, and account activity."],
        [/^\\/student\\/financial/, "Your fees and payment information. Open it to review charges, payments, balances, and financial status."],
        [/^\\/student\\/registration/, "Course registration. Open it to review available classes and manage upcoming course selections."],
        [/^\\/student\\/transcript/, "Your academic transcript. Open it to review completed coursework, grades, credits, and academic standing."],
        [/^\\/student\\/lesson-plan/, "Your lesson plan. Open it to see modules and lesson items organized by enrolled course."],
        [/^\\/student\\/syllabus-status/, "Syllabus status for your courses. Open it to review course expectations and track required acknowledgements."],
        [/^\\/student\\/homework/, "Your homework workspace. Open it to review assignments, due dates, submission status, and available work."],
        [/^\\/student\\/enrollments\\//, "This opens the selected course. Use it to view modules, lessons, assignments, grades, and course resources."],
        [/^\\/credentials\\//, "This opens a printable copy of your earned credential for the selected course."],
        [/^\\/catalog/, "The school course catalog. Open it to explore available programs, course details, and enrollment options."],
        [/^\\/help\\//, "Student portal help. Open it for guidance on common access and browser issues."],
        [/^#/, "This jumps to the related section on the current page without leaving the page."]
      ];

      let timer = null;
      let activeLink = null;
      let pointerX = 0;
      let pointerY = 0;

      const describe = (link) => {
        const rawHref = link.getAttribute("href") || "";
        const match = summaries.find(([pattern]) => pattern.test(rawHref));
        if (match) return match[1];
        const label = (link.textContent || link.getAttribute("aria-label") || "this link").trim().replace(/\\s+/g, " ");
        if (link.hasAttribute("download")) return "Downloads " + label + ". Select it to save the file to your device.";
        if (/^https?:\\/\\//i.test(rawHref)) return "Opens " + label + " on an external website" + (link.target === "_blank" ? " in a new tab" : "") + ".";
        return "Opens " + label + " within the student portal so you can view the related information and available actions.";
      };

      const position = () => {
        if (tooltip.hidden || !activeLink) return;
        const margin = 12;
        const gap = 16;
        const rect = tooltip.getBoundingClientRect();
        const anchor = activeLink.getBoundingClientRect();
        const hasPointer = pointerX > 0 || pointerY > 0;
        const originX = hasPointer ? pointerX : anchor.left + anchor.width / 2;
        const originY = hasPointer ? pointerY : anchor.bottom;
        let left = originX + gap;
        let top = originY + gap;
        if (left + rect.width > window.innerWidth - margin) left = Math.max(margin, originX - rect.width - gap);
        if (top + rect.height > window.innerHeight - margin) top = Math.max(margin, originY - rect.height - gap);
        tooltip.style.left = left + "px";
        tooltip.style.top = top + "px";
      };

      const hide = () => {
        window.clearTimeout(timer);
        timer = null;
        if (activeLink) activeLink.removeAttribute("aria-describedby");
        activeLink = null;
        pointerX = 0;
        pointerY = 0;
        tooltip.hidden = true;
      };

      const schedule = (link, event) => {
        hide();
        activeLink = link;
        if (event && "clientX" in event) {
          pointerX = event.clientX;
          pointerY = event.clientY;
        }
        timer = window.setTimeout(() => {
          if (!activeLink) return;
          tooltip.textContent = describe(activeLink);
          tooltip.hidden = false;
          activeLink.setAttribute("aria-describedby", tooltip.id);
          position();
        }, delay);
      };

      document.addEventListener("mouseover", (event) => {
        const link = event.target.closest("a[href]");
        if (!link || link.contains(event.relatedTarget)) return;
        schedule(link, event);
      });
      document.addEventListener("mousemove", (event) => {
        if (!activeLink || tooltip.hidden) return;
        pointerX = event.clientX;
        pointerY = event.clientY;
        position();
      });
      document.addEventListener("mouseout", (event) => {
        const link = event.target.closest("a[href]");
        if (link && link === activeLink && !link.contains(event.relatedTarget)) hide();
      });
      document.addEventListener("focusin", (event) => {
        const link = event.target.closest("a[href]");
        if (link) schedule(link);
      });
      document.addEventListener("focusout", (event) => {
        if (event.target === activeLink) hide();
      });
      document.addEventListener("click", hide);
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") hide();
      });
      window.addEventListener("scroll", hide, true);
      window.addEventListener("resize", hide);
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
        <span class="sis-topbar-spacer" aria-hidden="true"></span>
        <div class="sis-tools">
          ${languageSwitcher(selectedLanguage)}
          <a class="sis-tool" href="/admin/features/system-settings" title="Settings">Settings</a>
          <a class="sis-tool" href="/admin/courses" title="LMS course list">LMS</a>
          <a class="sis-tool" href="/catalog" title="Catalog">Catalog</a>
          <a class="sis-tool" href="/admin/help" title="Help">Help</a>
          <span class="sis-avatar" title="${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}">${escapeHtml(initialsFor(user))}</span>
          <form method="post" action="/logout">
            <button class="sis-signout" type="submit">Sign out</button>
          </form>
        </div>
      </div>
      <div class="sis-subbar">
        <nav class="sis-subnav" aria-label="Admin portal menu">
          ${navFor(user)}
        </nav>
        <span class="sis-session">Current session: 2026-27</span>
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
        ${languageSwitcher(selectedLanguage)}
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
      <nav>${navFor(user)}</nav>
      ${languageSwitcher(selectedLanguage)}
      ${user ? `
        <form method="post" action="/logout">
          <button class="button ghost" type="submit">Sign out</button>
        </form>
      ` : ""}
    </header>
  `;
  return `<!doctype html>
<html lang="${escapeHtml(selectedLanguage)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | ${institute}</title>
  <link rel="icon" type="image/png" href="/assets/bmhi-favicon.png">
  <link rel="apple-touch-icon" href="/assets/bmhi-favicon.png">
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="${bodyClass}">
  ${header}
  <main class="${full ? "print-root" : courseCanvas ? "canvas-root" : isStudentPortal ? "student-shell" : "shell"}">
    ${flash ? `<div class="flash">${escapeHtml(flash)}</div>` : ""}
    ${body}
  </main>
  ${courseCanvasScript}
  ${studentPortalScript}
  ${languageScript(selectedLanguage)}
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
