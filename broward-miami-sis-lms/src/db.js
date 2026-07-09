const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");
const { adminAccessAccounts, adminAccessDefaultPassword } = require("./adminAccess");
const { courses } = require("./catalog");
const { lippincottEnrollmentInstructions } = require("./fundamentalsBuildout");
const { onsiteVisitChecklistItems } = require("./onsiteVisitChecklist");

const rootDir = path.resolve(__dirname, "..");
const databaseFile = path.resolve(rootDir, process.env.DATABASE_FILE || "./data/bmhi.sqlite");
fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

const db = new DatabaseSync(databaseFile);
db.exec("PRAGMA foreign_keys = ON;");

const legacyLocalEmailDomain = "@browardmiamihi.local";
const portalEmailDomain = "@browardmiamihi.com";

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK(role IN ('admin','instructor','student')),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      organization_status TEXT NOT NULL DEFAULT 'organized' CHECK(organization_status IN ('organized','not_organized')),
      class_lock_reason TEXT,
      cohort_name TEXT,
      cohort_start_date TEXT,
      cohort_end_date TEXT,
      uniform_size TEXT,
      photo_storage_name TEXT,
      photo_original_name TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      hours INTEGER NOT NULL DEFAULT 0,
      tuition_cents INTEGER NOT NULL DEFAULT 0,
      books_supplies_cents INTEGER NOT NULL DEFAULT 0,
      registration_fee_cents INTEGER NOT NULL DEFAULT 0,
      credential_type TEXT NOT NULL DEFAULT 'Certificate',
      delivery_mode TEXT NOT NULL DEFAULT 'Campus / blended',
      published INTEGER NOT NULL DEFAULT 1,
      ghl_product_keys TEXT NOT NULL DEFAULT '[]',
      hidden_sections TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      external_url TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      position INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS course_imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      file_original_name TEXT NOT NULL,
      file_storage_name TEXT NOT NULL,
      file_mime_type TEXT,
      file_size INTEGER,
      status TEXT NOT NULL DEFAULT 'uploaded' CHECK(status IN ('uploaded','reviewed','imported','failed')),
      note TEXT,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS course_seed_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      seed_key TEXT NOT NULL,
      seeded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(course_id, seed_key)
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active',
      start_date TEXT NOT NULL DEFAULT (date('now')),
      completion_date TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      final_grade TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      external_order_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id, external_order_id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      meeting_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('present','absent','late','excused')),
      minutes INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS grade_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      points_possible REAL NOT NULL DEFAULT 100,
      due_date TEXT
    );

    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      grade_item_id INTEGER NOT NULL REFERENCES grade_items(id) ON DELETE CASCADE,
      score REAL NOT NULL DEFAULT 0,
      note TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(enrollment_id, grade_item_id)
    );

    CREATE TABLE IF NOT EXISTS hesi_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cohort_name TEXT NOT NULL,
      exam_name TEXT NOT NULL DEFAULT 'HESI',
      subject TEXT NOT NULL,
      acceptable_score INTEGER NOT NULL,
      score INTEGER,
      status TEXT NOT NULL DEFAULT 'missing' CHECK(status IN ('pass','remediation','missing')),
      source_note TEXT,
      recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, exam_name, subject)
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enrollment_id INTEGER NOT NULL UNIQUE REFERENCES enrollments(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      number TEXT NOT NULL UNIQUE,
      issued_at TEXT NOT NULL DEFAULT (date('now')),
      expires_at TEXT,
      issuer_name TEXT NOT NULL DEFAULT 'Registrar',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS financial_aid_awards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      term TEXT NOT NULL,
      aid_type TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'Institutional',
      amount_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'setup' CHECK(status IN ('setup','offered','accepted','declined','canceled')),
      note TEXT,
      offered_at TEXT,
      accepted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS financial_aid_disbursements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      award_id INTEGER NOT NULL REFERENCES financial_aid_awards(id) ON DELETE CASCADE,
      disbursement_date TEXT NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','posted','held','canceled')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS billing_charges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      term TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Tuition',
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'posted' CHECK(status IN ('draft','posted','void')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS billing_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      term TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'Student payment',
      applied_to TEXT NOT NULL DEFAULT 'Account',
      amount_cents INTEGER NOT NULL DEFAULT 0,
      paid_at TEXT NOT NULL DEFAULT (date('now')),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS billing_payment_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      term TEXT NOT NULL,
      name TEXT NOT NULL,
      total_cents INTEGER NOT NULL DEFAULT 0,
      installment_cents INTEGER NOT NULL DEFAULT 0,
      next_due_date TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft','active','completed','canceled')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS billing_refund_policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      external_id TEXT,
      payload TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      read_at TEXT,
      external_delivery_status TEXT NOT NULL DEFAULT 'not_configured',
      external_delivery_error TEXT,
      external_delivered_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      posted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT NOT NULL DEFAULT 'event' CHECK(event_type IN ('event','class','assignment','exam','meeting')),
      start_at TEXT NOT NULL,
      end_at TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_record_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_key TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','received','approved','missing','waived')),
      note TEXT,
      file_original_name TEXT,
      file_storage_name TEXT,
      file_mime_type TEXT,
      file_size INTEGER,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      uploaded_at TEXT,
      completed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, item_key)
    );

    CREATE TABLE IF NOT EXISTS onsite_visit_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_key TEXT NOT NULL UNIQUE,
      section TEXT NOT NULL,
      standard TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'needed' CHECK(status IN ('needed','requested','received','approved','not_applicable')),
      owner TEXT,
      requested_from TEXT,
      due_date TEXT,
      note TEXT,
      presentation_order INTEGER NOT NULL DEFAULT 1,
      requested_at TEXT,
      completed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS onsite_visit_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES onsite_visit_items(id) ON DELETE CASCADE,
      file_original_name TEXT NOT NULL,
      file_storage_name TEXT NOT NULL,
      file_mime_type TEXT,
      file_size INTEGER,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admission_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','accepted','waitlisted','declined','converted')),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      program_slug TEXT,
      program_title TEXT NOT NULL,
      preferred_start TEXT,
      education_level TEXT,
      high_school TEXT,
      emergency_contact TEXT,
      emergency_phone TEXT,
      how_heard TEXT,
      goals TEXT,
      consent TEXT NOT NULL DEFAULT 'yes',
      reviewer_note TEXT,
      created_student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const courseColumns = db.prepare("PRAGMA table_info(courses)").all().map((column) => column.name);
  if (!courseColumns.includes("hidden_sections")) {
    db.exec("ALTER TABLE courses ADD COLUMN hidden_sections TEXT NOT NULL DEFAULT '[]';");
  }
  if (!courseColumns.includes("books_supplies_cents")) {
    db.exec("ALTER TABLE courses ADD COLUMN books_supplies_cents INTEGER NOT NULL DEFAULT 0;");
  }
  if (!courseColumns.includes("registration_fee_cents")) {
    db.exec("ALTER TABLE courses ADD COLUMN registration_fee_cents INTEGER NOT NULL DEFAULT 0;");
  }
  const lessonColumns = db.prepare("PRAGMA table_info(lessons)").all().map((column) => column.name);
  if (!lessonColumns.includes("external_url")) {
    db.exec("ALTER TABLE lessons ADD COLUMN external_url TEXT;");
  }
  const userColumns = db.prepare("PRAGMA table_info(users)").all().map((column) => column.name);
  if (!userColumns.includes("organization_status")) {
    db.exec("ALTER TABLE users ADD COLUMN organization_status TEXT NOT NULL DEFAULT 'organized';");
  }
  if (!userColumns.includes("class_lock_reason")) {
    db.exec("ALTER TABLE users ADD COLUMN class_lock_reason TEXT;");
  }
  if (!userColumns.includes("cohort_name")) {
    db.exec("ALTER TABLE users ADD COLUMN cohort_name TEXT;");
  }
  if (!userColumns.includes("cohort_start_date")) {
    db.exec("ALTER TABLE users ADD COLUMN cohort_start_date TEXT;");
  }
  if (!userColumns.includes("cohort_end_date")) {
    db.exec("ALTER TABLE users ADD COLUMN cohort_end_date TEXT;");
  }
  if (!userColumns.includes("uniform_size")) {
    db.exec("ALTER TABLE users ADD COLUMN uniform_size TEXT;");
  }
  if (!userColumns.includes("photo_storage_name")) {
    db.exec("ALTER TABLE users ADD COLUMN photo_storage_name TEXT;");
  }
  if (!userColumns.includes("photo_original_name")) {
    db.exec("ALTER TABLE users ADD COLUMN photo_original_name TEXT;");
  }
  const messageColumns = db.prepare("PRAGMA table_info(messages)").all().map((column) => column.name);
  if (!messageColumns.includes("thread_id")) {
    db.exec("ALTER TABLE messages ADD COLUMN thread_id INTEGER;");
    db.exec("UPDATE messages SET thread_id = id WHERE thread_id IS NULL;");
  }
  if (!messageColumns.includes("course_id")) {
    db.exec("ALTER TABLE messages ADD COLUMN course_id INTEGER;");
  }
  if (!messageColumns.includes("external_delivery_status")) {
    db.exec("ALTER TABLE messages ADD COLUMN external_delivery_status TEXT NOT NULL DEFAULT 'not_configured';");
  }
  if (!messageColumns.includes("external_delivery_error")) {
    db.exec("ALTER TABLE messages ADD COLUMN external_delivery_error TEXT;");
  }
  if (!messageColumns.includes("external_delivered_at")) {
    db.exec("ALTER TABLE messages ADD COLUMN external_delivered_at TEXT;");
  }
}

function seed() {
  const hash = (plain) => bcrypt.hashSync(plain, 12);

  db.prepare(`
    UPDATE users
    SET email = replace(email, ?, ?)
    WHERE email LIKE ?
      AND NOT EXISTS (
        SELECT 1
        FROM users duplicate
        WHERE duplicate.id != users.id
          AND lower(duplicate.email) = lower(replace(users.email, ?, ?))
      )
  `).run(
    legacyLocalEmailDomain,
    portalEmailDomain,
    `%${legacyLocalEmailDomain}`,
    legacyLocalEmailDomain,
    portalEmailDomain
  );

  const createUser = db.prepare(`
    INSERT OR IGNORE INTO users (role, first_name, last_name, email, phone, password_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  createUser.run("admin", "BMHI", "Administrator", "admin@browardmiamihi.com", "(954) 555-0100", hash("AdminPass123!"));
  createUser.run("instructor", "Program", "Instructor", "instructor@browardmiamihi.com", "(954) 555-0101", hash("InstructorPass123!"));
  createUser.run("instructor", "Jeferson", "Fianitog", "jeferson.fianitog@browardmiamihi.com", "", hash("InstructorPass123!"));
  createUser.run("student", "Demo", "Student", "student@browardmiamihi.com", "(954) 555-0102", hash("StudentPass123!"));

  const upsertAdminAccessUser = db.prepare(`
    INSERT INTO users (role, first_name, last_name, email, phone, password_hash, status, organization_status, class_lock_reason)
    VALUES ('admin', ?, ?, ?, '', ?, 'active', 'organized', NULL)
    ON CONFLICT(email) DO UPDATE SET
      role = 'admin',
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      status = 'active',
      organization_status = 'organized',
      class_lock_reason = NULL
  `);
  adminAccessAccounts.forEach((account) => {
    upsertAdminAccessUser.run(account.firstName, account.lastName, account.email, hash(adminAccessDefaultPassword));
  });

  db.prepare(`
    UPDATE users
    SET organization_status = 'organized', class_lock_reason = NULL
    WHERE email IN ('admin@browardmiamihi.com', 'instructor@browardmiamihi.com', 'student@browardmiamihi.com')
  `).run();

  const upsertCourse = db.prepare(`
    INSERT INTO courses (title, slug, category, description, hours, tuition_cents, books_supplies_cents, registration_fee_cents, credential_type, delivery_mode, ghl_product_keys)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      category = excluded.category,
      description = excluded.description,
      hours = excluded.hours,
      tuition_cents = excluded.tuition_cents,
      books_supplies_cents = excluded.books_supplies_cents,
      registration_fee_cents = excluded.registration_fee_cents,
      credential_type = excluded.credential_type,
      delivery_mode = excluded.delivery_mode,
      ghl_product_keys = excluded.ghl_product_keys
  `);

  const moduleCount = db.prepare("SELECT COUNT(*) AS count FROM modules WHERE course_id = ?");
  const seedVersionExists = db.prepare("SELECT id FROM course_seed_versions WHERE course_id = ? AND seed_key = ?");
  const insertSeedVersion = db.prepare("INSERT OR IGNORE INTO course_seed_versions (course_id, seed_key) VALUES (?, ?)");
  const insertModule = db.prepare("INSERT INTO modules (course_id, title, position) VALUES (?, ?, ?)");
  const insertLesson = db.prepare("INSERT INTO lessons (module_id, title, content, external_url, duration_minutes, position) VALUES (?, ?, ?, ?, ?, ?)");
  const insertGradeItem = db.prepare("INSERT INTO grade_items (course_id, title, points_possible, due_date) VALUES (?, ?, ?, ?)");

  for (const course of courses) {
    upsertCourse.run(
      course.title,
      course.slug,
      course.category,
      course.description,
      course.hours,
      course.tuitionCents || 0,
      course.booksSuppliesCents || 0,
      course.registrationFeeCents || 0,
      course.credentialType,
      course.deliveryMode,
      JSON.stringify(course.ghlProductKeys)
    );

    const saved = db.prepare("SELECT id FROM courses WHERE slug = ?").get(course.slug);
    const seedKey = course.seedVersion ? `${course.slug}:${course.seedVersion}` : null;
    const hasCurrentSeedVersion = seedKey ? seedVersionExists.get(saved.id, seedKey) : null;
    const existingModuleCount = moduleCount.get(saved.id).count;
    const shouldRefreshSeedContent = Boolean(seedKey && !hasCurrentSeedVersion && existingModuleCount > 0);
    if (shouldRefreshSeedContent) {
      db.prepare("DELETE FROM modules WHERE course_id = ?").run(saved.id);
      db.prepare("DELETE FROM grade_items WHERE course_id = ?").run(saved.id);
    }

    if (existingModuleCount === 0 || shouldRefreshSeedContent) {
      if (course.modules) {
        course.modules.forEach((module, moduleIndex) => {
          const moduleId = insertModule.run(saved.id, module.title, moduleIndex + 1).lastInsertRowid;
          module.lessons.forEach((lesson, lessonIndex) => {
            insertLesson.run(moduleId, lesson.title, lesson.content, lesson.externalUrl || null, lesson.durationMinutes || 45, lessonIndex + 1);
          });
        });
      } else {
        const intro = insertModule.run(saved.id, "Orientation and Syllabus", 1).lastInsertRowid;
        insertLesson.run(intro, "Welcome and Program Expectations", "Review program outcomes, attendance expectations, grading policy, and completion requirements.", null, 30, 1);
        insertLesson.run(intro, "Student Handbook Acknowledgement", "Students confirm handbook review and understand school policies before beginning coursework.", null, 20, 2);

        const core = insertModule.run(saved.id, `${course.title} Core Lessons`, 2).lastInsertRowid;
        insertLesson.run(core, "Foundations", `Core concepts and professional standards for ${course.title}.`, null, 45, 1);
        insertLesson.run(core, "Skills Lab / Applied Practice", "Hands-on competencies, practice activities, and instructor verification.", null, 60, 2);
        insertLesson.run(core, "Final Review and Completion Checklist", "Final assessment preparation, document audit, and credential readiness review.", null, 45, 3);
      }

      const gradeItems = course.gradeItems || [
        { title: "Module Quiz", pointsPossible: 100 },
        { title: "Skills Competency", pointsPossible: 100 },
        { title: "Final Assessment", pointsPossible: 100 }
      ];
      gradeItems.forEach((item) => {
        insertGradeItem.run(saved.id, item.title, item.pointsPossible, item.dueDate || null);
      });
      if (seedKey) insertSeedVersion.run(saved.id, seedKey);
    }
  }

  const fundamentals = db.prepare("SELECT id FROM courses WHERE slug = ?").get("fundamental-nursing-skills-and-concepts-new-cohort");
  if (fundamentals) {
    const lippincottLessonTitle = "Lippincott CoursePoint Class Code - Fundamentals";
    const existingLippincottLesson = db.prepare(`
      SELECT l.id
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE m.course_id = ? AND l.title = ?
    `).get(fundamentals.id, lippincottLessonTitle);
    if (!existingLippincottLesson) {
      const orientationModule = db.prepare(`
        SELECT id
        FROM modules
        WHERE course_id = ?
        ORDER BY CASE WHEN title = 'Orientation and Syllabus' THEN 0 ELSE 1 END, position
        LIMIT 1
      `).get(fundamentals.id);
      if (orientationModule) {
        const nextPosition = db.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS next FROM lessons WHERE module_id = ?").get(orientationModule.id).next;
        insertLesson.run(orientationModule.id, lippincottLessonTitle, lippincottEnrollmentInstructions, null, 20, nextPosition);
      }
    }
  }

  const demoStudent = db.prepare("SELECT id FROM users WHERE email = ?").get("student@browardmiamihi.com");
  const hha = db.prepare("SELECT id FROM courses WHERE slug = ?").get("home-health-aide");
  const hhaCreole = db.prepare("SELECT id FROM courses WHERE slug = ?").get("home-health-aide-creole");
  const medicalTerminology = db.prepare("SELECT id FROM courses WHERE slug = ?").get("medical-terminology");
  const practicalNursing = db.prepare("SELECT id FROM courses WHERE slug = ?").get("practical-nursing");
  const introNursing = db.prepare("SELECT id FROM courses WHERE slug = ?").get("introduction-to-nursing-practical-nursing");
  db.prepare(`
    INSERT OR IGNORE INTO enrollments (user_id, course_id, status, progress, source, external_order_id)
    VALUES (?, ?, 'active', 35, 'seed', 'seed-demo')
  `).run(demoStudent.id, hha.id);
  if (hhaCreole) {
    db.prepare(`
      INSERT OR IGNORE INTO enrollments (user_id, course_id, status, progress, source, external_order_id)
      VALUES (?, ?, 'active', 12, 'seed', 'seed-demo-hha-creole')
    `).run(demoStudent.id, hhaCreole.id);
  }
  if (medicalTerminology) {
    db.prepare(`
      INSERT OR IGNORE INTO enrollments (user_id, course_id, status, progress, source, external_order_id)
      VALUES (?, ?, 'active', 10, 'seed', 'seed-demo-pn101')
    `).run(demoStudent.id, medicalTerminology.id);
  }
  if (introNursing) {
    db.prepare(`
      INSERT OR IGNORE INTO enrollments (user_id, course_id, status, progress, source, external_order_id)
      VALUES (?, ?, 'active', 83, 'seed', 'seed-demo-pn102')
    `).run(demoStudent.id, introNursing.id);
  }

  const cohortTwoStudents = [
    ["Guerda", "Bien", "guerdabien80@gmail.com", "Large"],
    ["Chauna", "Brown", "shaunie8210@gmail.com", "Large"],
    ["Samantha", "Brunvil", "samanthabrunvil2106@gmail.com", "Medium"],
    ["Porledens", "Cajoux", "porledens@gmail.com", "Small"],
    ["Cheryl", "Echols", "cherylechols89@gmail.com", "Small"],
    ["Ericka", "Morrison", "ericka.morrison001@outlook.com", "Large"],
    ["J Laurie", "Robert", "robertjlaurie303@gmail.com", "Small"],
    ["Rekena", "Williams", "kena_wims@yahoo.com", "2XL"]
  ];
  const cohortName = "Cohort 2";
  const cohortStartDate = "2026-07-01";
  const cohortEndDate = "2027-07-31";
  const cohortStudentPasswordHash = hash("StudentPass123!");
  const upsertCohortStudent = db.prepare(`
    INSERT INTO users (
      role, first_name, last_name, email, phone, password_hash, status,
      organization_status, class_lock_reason, cohort_name, cohort_start_date, cohort_end_date, uniform_size
    )
    VALUES ('student', ?, ?, ?, '', ?, 'active', 'organized', NULL, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      role = 'student',
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      status = 'active',
      organization_status = 'organized',
      class_lock_reason = NULL,
      cohort_name = excluded.cohort_name,
      cohort_start_date = excluded.cohort_start_date,
      cohort_end_date = excluded.cohort_end_date,
      uniform_size = excluded.uniform_size
  `);
  const insertCohortEnrollment = db.prepare(`
    INSERT OR IGNORE INTO enrollments (user_id, course_id, status, start_date, progress, source, external_order_id)
    VALUES (?, ?, 'active', ?, 0, 'cohort_seed', ?)
  `);
  cohortTwoStudents.forEach(([firstName, lastName, email, uniformSize]) => {
    upsertCohortStudent.run(
      firstName,
      lastName,
      email,
      cohortStudentPasswordHash,
      cohortName,
      cohortStartDate,
      cohortEndDate,
      uniformSize
    );
    const student = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (student && medicalTerminology) {
      insertCohortEnrollment.run(student.id, medicalTerminology.id, cohortStartDate, `cohort-2-pn101-${student.id}`);
    }
    if (student && practicalNursing) {
      insertCohortEnrollment.run(student.id, practicalNursing.id, cohortStartDate, `cohort-2-practical-nursing-${student.id}`);
    }
  });

  const hesiSubjects = [
    ["Critical Thinking", 700],
    ["Fundamentals", 850],
    ["Pharmacology", 850],
    ["Nutrition", 850],
    ["Medical-Surgical", 850],
    ["Geriatrics", 850],
    ["Maternity", 850],
    ["Pediatrics", 850],
    ["Mental Health", 850]
  ];
  const cohortOneHesiStudents = [
    {
      firstName: "Bernadine",
      lastName: "Jean Louis",
      email: "bernadine.jeanlouis@browardmiamihi.com",
      scores: [900, 671, 1280, 1353, 1181, 1318, 1328, 1425, 1059]
    },
    {
      firstName: "Kassandra",
      lastName: "Laguardia",
      email: "kassandra.laguardia@browardmiamihi.com",
      scores: [860, 853, 911, 906, null, 1151, 680, null, null]
    },
    {
      firstName: "Stephanie",
      lastName: "Gelin",
      email: "stephanie.gelin@browardmiamihi.com",
      scores: [900, 1221, 1303, 1435, 1244, 1390, 1154, 1426, 1293]
    },
    {
      firstName: "Marie Mode",
      lastName: "Docteur",
      email: "mariemode.docteur@browardmiamihi.com",
      scores: [null, null, null, 782, null, 1423, null, 639, null]
    },
    {
      firstName: "Marceline",
      lastName: "Goudet",
      email: "marceline.goudet@browardmiamihi.com",
      scores: [790, 874, 643, null, 506, 449, 686, 788, 761]
    },
    {
      firstName: "Anabel",
      lastName: "Ortega",
      email: "anabel.ortega@browardmiamihi.com",
      scores: [900, 702, 761, null, 828, null, null, null, 509]
    },
    {
      firstName: "Katia",
      lastName: "Santiesteban",
      email: "katia.santiesteban@browardmiamihi.com",
      scores: [880, 468, null, null, null, null, null, null, null]
    },
    {
      firstName: "Emile",
      lastName: "Etinor",
      email: "emile.etinor@browardmiamihi.com",
      scores: [null, null, null, null, null, null, null, null, null]
    },
    {
      firstName: "Kayla Christine",
      lastName: "Jean",
      email: "kaylachristine.jean@browardmiamihi.com",
      scores: [950, 874, 1209, 1317, 1288, 1087, 1041, 1123, 1284]
    }
  ];
  const cohortOnePasswordHash = hash("StudentPass123!");
  const upsertCohortOneStudent = db.prepare(`
    INSERT INTO users (
      role, first_name, last_name, email, phone, password_hash, status,
      organization_status, class_lock_reason, cohort_name
    )
    VALUES ('student', ?, ?, ?, '', ?, 'active', 'organized', NULL, 'Cohort 1')
    ON CONFLICT(email) DO UPDATE SET
      role = 'student',
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      status = 'active',
      organization_status = 'organized',
      class_lock_reason = NULL,
      cohort_name = 'Cohort 1'
  `);
  const upsertHesiScore = db.prepare(`
    INSERT OR IGNORE INTO hesi_scores (user_id, cohort_name, exam_name, subject, acceptable_score, score, status, source_note)
    VALUES (?, 'Cohort 1', 'HESI', ?, ?, ?, ?, ?)
  `);
  const insertCohortOneEnrollment = db.prepare(`
    INSERT OR IGNORE INTO enrollments (user_id, course_id, status, progress, source, external_order_id)
    VALUES (?, ?, 'active', 0, 'cohort_seed', ?)
  `);
  cohortOneHesiStudents.forEach((studentRecord) => {
    upsertCohortOneStudent.run(
      studentRecord.firstName,
      studentRecord.lastName,
      studentRecord.email,
      cohortOnePasswordHash
    );
    const student = db.prepare("SELECT id FROM users WHERE email = ?").get(studentRecord.email);
    if (student && practicalNursing) {
      insertCohortOneEnrollment.run(student.id, practicalNursing.id, `cohort-1-practical-nursing-${student.id}`);
    }
    if (!student) return;
    hesiSubjects.forEach(([subject, acceptableScore], index) => {
      const score = studentRecord.scores[index];
      const status = score === null || score === undefined ? "missing" : Number(score) >= acceptableScore ? "pass" : "remediation";
      upsertHesiScore.run(
        student.id,
        subject,
        acceptableScore,
        score,
        status,
        "Imported from Cohort 1 HESI score screenshot provided July 2026."
      );
    });
  });

  const existingAward = db.prepare(`
    SELECT id FROM financial_aid_awards
    WHERE user_id = ? AND term = '2026-27 Practical Nursing Term' AND aid_type = 'BMHI Institutional Grant'
  `).get(demoStudent.id);
  const awardId = existingAward?.id || db.prepare(`
    INSERT INTO financial_aid_awards (user_id, term, aid_type, source, amount_cents, status, note, offered_at)
    VALUES (?, '2026-27 Practical Nursing Term', 'BMHI Institutional Grant', 'Institutional', 50000, 'offered', 'Demo aid package based on financial need review.', date('now'))
  `).run(demoStudent.id).lastInsertRowid;
  const disbursementCount = db.prepare("SELECT COUNT(*) AS count FROM financial_aid_disbursements WHERE award_id = ?").get(awardId).count;
  if (disbursementCount === 0) {
    db.prepare(`
      INSERT INTO financial_aid_disbursements (award_id, disbursement_date, amount_cents, status)
      VALUES (?, ?, ?, ?)
    `).run(awardId, "2026-07-15", 25000, "scheduled");
    db.prepare(`
      INSERT INTO financial_aid_disbursements (award_id, disbursement_date, amount_cents, status)
      VALUES (?, ?, ?, ?)
    `).run(awardId, "2026-08-15", 25000, "scheduled");
  }

  const billingCount = db.prepare("SELECT COUNT(*) AS count FROM billing_charges WHERE user_id = ?").get(demoStudent.id).count;
  if (billingCount === 0) {
    const insertCharge = db.prepare(`
      INSERT INTO billing_charges (user_id, term, category, description, amount_cents, due_date, status)
      VALUES (?, '2026-27 Practical Nursing Term', ?, ?, ?, ?, 'posted')
    `);
    insertCharge.run(demoStudent.id, "Fee", "Registration fee", 15000, "2026-07-01");
    insertCharge.run(demoStudent.id, "Fee", "Technology and LMS fee", 8500, "2026-07-01");
    insertCharge.run(demoStudent.id, "Tuition", "Home Health Aide tuition", 120000, "2026-07-15");

    const insertPayment = db.prepare(`
      INSERT INTO billing_payments (user_id, term, source, applied_to, amount_cents, paid_at, note)
      VALUES (?, '2026-27 Practical Nursing Term', ?, ?, ?, ?, ?)
    `);
    insertPayment.run(demoStudent.id, "Student payment", "Registration fee", 15000, "2026-07-01", "Paid at enrollment.");
    insertPayment.run(demoStudent.id, "Student payment plan", "Home Health Aide tuition", 42000, "2026-07-15", "First installment.");

    db.prepare(`
      INSERT INTO billing_payment_plans (user_id, term, name, total_cents, installment_cents, next_due_date, status)
      VALUES (?, '2026-27 Practical Nursing Term', 'Monthly tuition plan', 78000, 26000, '2026-08-15', 'active')
    `).run(demoStudent.id);
  }

  db.prepare(`
    INSERT OR IGNORE INTO billing_refund_policies (name, description, active)
    VALUES ('BMHI Standard Refund Policy', 'Refund eligibility is calculated from the signed enrollment agreement, catalog policy, attendance, charges posted, aid disbursed, payments applied, and official withdrawal date.', 1)
  `).run();

  const upsertOnsiteVisitItem = db.prepare(`
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
    upsertOnsiteVisitItem.run(item.key, item.section, item.standard, item.title, item.description, index + 1);
  });

  const adminUser = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@browardmiamihi.com");
  const instructorUser = db.prepare("SELECT id FROM users WHERE email = ?").get("instructor@browardmiamihi.com");
  const announcementCount = db.prepare("SELECT COUNT(*) AS count FROM announcements WHERE course_id = ?");
  const insertAnnouncement = db.prepare(`
    INSERT INTO announcements (course_id, author_id, title, body, posted_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const seedAnnouncementGroups = [
    {
      slug: "medical-terminology",
      rows: [
        ["PN 101 Week 3 Reminder: Due This Week (July 6-12, 2026)", "This week focuses on body organization and oncology terminology. Complete Discussion 2, Quiz 2, and the assigned chapter resources before Sunday night.", "2026-07-05 00:00:00"],
        ["PN 101 Week 2 Reminder: Due This Week (June 29-July 5, 2026)", "Review word structure, roots, prefixes, and suffixes. Submit the worksheet and quiz by the posted deadline.", "2026-06-28 00:00:00"],
        ["PN 101 Welcome, Students!", "Welcome to Medical Terminology. Start with the syllabus, course orientation acknowledgement, and the first e-book chapter.", "2026-06-17 17:27:00"]
      ]
    },
    {
      slug: "introduction-to-nursing-practical-nursing",
      rows: [
        ["PN 102 Week 3 Reminder: Caring, Comfort, Safety, Advocacy, and Healing", "Use this week to connect nursing identity with safe, respectful patient care. Discussion 3 and the weekly learning activity are due Sunday night.", "2026-07-06 08:00:00"],
        ["PN 102 Week 2 Reminder: Nursing Then and Now", "Read the module materials before class and prepare your discussion post on reform, education, and public trust.", "2026-06-29 08:00:00"],
        ["PN 102 Welcome to Introduction to Nursing", "Begin with the course syllabus, professionalism acknowledgement, and Week 1 discussion.", "2026-06-22 08:00:00"]
      ]
    },
    {
      slug: "home-health-aide",
      rows: [
        ["Home Health Aide Week 1: Welcome and Start Strong", "Start with orientation, patient rights, infection control expectations, and required skills lab preparation.", "2026-06-22 08:40:00"],
        ["Home Health Aide Clinical Readiness Reminder", "Upload required documents and review your checklist before attending skills practice.", "2026-07-01 09:00:00"]
      ]
    },
    {
      slug: "fundamental-nursing-skills-and-concepts-new-cohort",
      rows: [
        ["Fundamentals: Lippincott CoursePoint Class Code", "Students should enroll in the Fundamentals CoursePoint class using code CE931F7E and keep the confirmation for class records.", "2026-07-02 09:00:00"],
        ["Fundamentals Week 1: Welcome and Start Strong", "Begin with the CoursePoint setup, syllabus, and first skills module.", "2026-06-22 08:30:00"]
      ]
    }
  ];
  seedAnnouncementGroups.forEach((group) => {
    const course = db.prepare("SELECT id FROM courses WHERE slug = ?").get(group.slug);
    if (course && announcementCount.get(course.id).count === 0) {
      group.rows.forEach(([title, body, postedAt]) => insertAnnouncement.run(course.id, instructorUser?.id || adminUser.id, title, body, postedAt));
    }
  });

  const calendarCount = db.prepare("SELECT COUNT(*) AS count FROM calendar_events");
  if (calendarCount.get().count === 0) {
    const insertCalendarEvent = db.prepare(`
      INSERT INTO calendar_events (course_id, title, description, event_type, start_at, end_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const eventRows = [
      ["medical-terminology", "[PN101 2026] Weekly Medical Terminology Class", "Google Meet class session.", "meeting", "2026-07-01 18:00:00", "2026-07-01 20:00:00"],
      ["medical-terminology", "[PN101 2026] Weekly Medical Terminology Class", "Google Meet class session.", "meeting", "2026-07-08 18:00:00", "2026-07-08 20:00:00"],
      ["medical-terminology", "Exam 1", "Medical terminology exam covering early word structure modules.", "exam", "2026-07-13 09:00:00", "2026-07-13 11:00:00"],
      ["medical-terminology", "[PN101 2026] Discussion 2: Decoding Medical Words", "Weekly discussion deadline.", "assignment", "2026-07-12 23:59:00", null],
      ["introduction-to-nursing-practical-nursing", "Week 3 Discussion: Caring, Comfort, Safety, Advocacy, and Healing", "Introduction to Nursing discussion deadline.", "assignment", "2026-07-12 23:59:00", null],
      ["introduction-to-nursing-practical-nursing", "Week 4 Discussion: Health Care Teamwork, Scope, Delegation, and Communication", "Introduction to Nursing discussion deadline.", "assignment", "2026-07-19 23:59:00", null],
      ["home-health-aide", "HHA Skills Lab Checkoff", "Instructor-led skills practice and documentation review.", "class", "2026-07-15 09:00:00", "2026-07-15 13:00:00"],
      ["fundamental-nursing-skills-and-concepts-new-cohort", "Fundamentals CoursePoint Setup Due", "Submit enrollment confirmation for CoursePoint.", "assignment", "2026-07-08 23:59:00", null]
    ];
    eventRows.forEach(([slug, title, description, eventType, startAt, endAt]) => {
      const course = db.prepare("SELECT id FROM courses WHERE slug = ?").get(slug);
      if (course) insertCalendarEvent.run(course.id, title, description, eventType, startAt, endAt, instructorUser?.id || adminUser.id);
    });
  }

  const welcomeMessage = db.prepare(`
    SELECT id
    FROM messages
    WHERE sender_id = ? AND recipient_id = ? AND subject = 'Welcome to your BMHI student email'
  `).get(adminUser.id, demoStudent.id);
  if (!welcomeMessage) {
    db.prepare(`
      INSERT INTO messages (sender_id, recipient_id, subject, body)
      VALUES (?, ?, ?, ?)
    `).run(
      adminUser.id,
      demoStudent.id,
      "Welcome to your BMHI student email",
      "This inbox is for school messages, course questions, financial reminders, and registrar updates. You can reply to staff from the Student Email page."
    );
  }
}

function initialize() {
  migrate();
  seed();
  return db;
}

module.exports = { db, initialize, databaseFile };
