const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");
const { courses } = require("./catalog");

const rootDir = path.resolve(__dirname, "..");
const databaseFile = path.resolve(rootDir, process.env.DATABASE_FILE || "./data/bmhi.sqlite");
fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

const db = new DatabaseSync(databaseFile);
db.exec("PRAGMA foreign_keys = ON;");

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
  const messageColumns = db.prepare("PRAGMA table_info(messages)").all().map((column) => column.name);
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
  const createUser = db.prepare(`
    INSERT OR IGNORE INTO users (role, first_name, last_name, email, phone, password_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  createUser.run("admin", "BMHI", "Administrator", "admin@browardmiamihi.local", "(954) 555-0100", hash("AdminPass123!"));
  createUser.run("instructor", "Program", "Instructor", "instructor@browardmiamihi.local", "(954) 555-0101", hash("InstructorPass123!"));
  createUser.run("student", "Demo", "Student", "student@browardmiamihi.local", "(954) 555-0102", hash("StudentPass123!"));

  db.prepare(`
    UPDATE users
    SET organization_status = 'organized', class_lock_reason = NULL
    WHERE email IN ('admin@browardmiamihi.local', 'instructor@browardmiamihi.local', 'student@browardmiamihi.local')
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
    if (moduleCount.get(saved.id).count === 0) {
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
    }
  }

  const demoStudent = db.prepare("SELECT id FROM users WHERE email = ?").get("student@browardmiamihi.local");
  const hha = db.prepare("SELECT id FROM courses WHERE slug = ?").get("home-health-aide");
  db.prepare(`
    INSERT OR IGNORE INTO enrollments (user_id, course_id, status, progress, source, external_order_id)
    VALUES (?, ?, 'active', 35, 'seed', 'seed-demo')
  `).run(demoStudent.id, hha.id);

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

  const adminUser = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@browardmiamihi.local");
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
