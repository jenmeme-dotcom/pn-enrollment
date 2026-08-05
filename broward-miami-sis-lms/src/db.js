const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");
const { adminAccessAccounts, adminAccessDefaultPassword } = require("./adminAccess");
const { courses } = require("./catalog");
const { lippincottEnrollmentInstructions } = require("./fundamentalsBuildout");
const { longTermCareNursingCourse } = require("./longTermCareNursingBuildout");
const { onsiteVisitChecklistItems } = require("./onsiteVisitChecklist");
const { ensureIntroNursingQuizQuestionMinimum } = require("./introNursingQuizQuestions");

const rootDir = path.resolve(__dirname, "..");
const databaseFile = path.resolve(rootDir, process.env.DATABASE_FILE || "./data/bmhi.sqlite");
fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

const db = new DatabaseSync(databaseFile);
db.exec("PRAGMA foreign_keys = ON;");

const legacyLocalEmailDomain = "@browardmiamihi.local";
const portalEmailDomain = "@browardmiamihi.com";

function writtenAssignmentMarker(config) {
  return `WRITTEN_ASSIGNMENT_DATA_BASE64:${Buffer.from(JSON.stringify(config), "utf8").toString("base64")}`;
}

function fallbackWrittenAssignmentContent(title = "", existingContent = "") {
  const cleanTitle = String(title || "Written Assignment").trim();
  const cleanContent = String(existingContent || "")
    .replace(/^Canvas item type:\s*Assignment\.?/i, "")
    .replace(/\n*Course files?:[\s\S]*$/i, "")
    .trim();
  const config = {
    type: "written-autograde",
    minWords: 75,
    prompt: `Complete ${cleanTitle}. Use course terminology, explain your reasoning, apply the content to a realistic healthcare or nursing situation, and protect confidentiality.`,
    checklist: [
      "Answer each part in complete sentences.",
      "Use accurate course terminology.",
      "Apply the content to a realistic healthcare, nursing, resident-care, or patient-care situation.",
      "Do not include real patient-identifying information."
    ],
    conceptGroups: [["course", "chapter", "terminology", "nursing"], ["patient", "resident", "healthcare", "care"], ["safety", "communication", "documentation", "professional"], ["confidentiality", "privacy"]],
    responseSections: [
      {
        title: "Part 1: Key Concepts",
        prompt: "Identify the key terms, concepts, or requirements for this assignment."
      },
      {
        title: "Part 2: Explanation",
        prompt: "Explain the meaning or importance of those concepts in your own words."
      },
      {
        title: "Part 3: Application",
        prompt: "Apply the concepts to a realistic healthcare, nursing, resident-care, or patient-care situation."
      },
      {
        title: "Part 4: Reporting or Professional Action",
        prompt: "State what should be documented, reported, acknowledged, or done professionally."
      }
    ]
  };
  return [
    "Canvas item type: Assignment.",
    "",
    cleanTitle,
    cleanContent || "Complete each part in clear, complete sentences.",
    "",
    "Assignment directions",
    "Complete each part in clear, complete sentences. Use course terminology, explain your reasoning, and protect confidentiality.",
    "",
    "Grading focus",
    "Your work will be evaluated for accuracy, application, professional communication, organization, and confidentiality.",
    "",
    writtenAssignmentMarker(config)
  ].join("\n");
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK(role IN ('admin','instructor','student')),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      personal_email TEXT,
      phone TEXT,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      withdrawal_effective_date TEXT,
      withdrawal_reason TEXT,
      withdrawn_at TEXT,
      withdrawn_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      organization_status TEXT NOT NULL DEFAULT 'organized' CHECK(organization_status IN ('organized','not_organized')),
      class_lock_reason TEXT,
      cohort_name TEXT,
      cohort_start_date TEXT,
      cohort_end_date TEXT,
      uniform_size TEXT,
      photo_storage_name TEXT,
      photo_original_name TEXT,
      photo_review_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK(photo_review_status IN ('not_submitted','approved','pending','denied')),
      photo_review_note TEXT,
      photo_submitted_at TEXT,
      photo_reviewed_at TEXT,
      photo_reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
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
      position INTEGER NOT NULL DEFAULT 1,
      published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      external_url TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      position INTEGER NOT NULL DEFAULT 1,
      published INTEGER NOT NULL DEFAULT 1,
      instructor_only INTEGER NOT NULL DEFAULT 0,
      item_type TEXT NOT NULL DEFAULT 'page',
      grade_item_id INTEGER REFERENCES grade_items(id) ON DELETE SET NULL
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
      withdrawal_effective_date TEXT,
      withdrawal_reason TEXT,
      withdrawn_at TEXT,
      withdrawn_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      start_date TEXT NOT NULL DEFAULT (date('now')),
      completion_date TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      final_grade TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      external_order_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id, external_order_id)
    );

    CREATE TABLE IF NOT EXISTS lesson_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(enrollment_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS video_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id INTEGER NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      instructions TEXT NOT NULL DEFAULT '',
      allow_upload INTEGER NOT NULL DEFAULT 1,
      allow_recording INTEGER NOT NULL DEFAULT 1,
      max_duration_seconds INTEGER NOT NULL DEFAULT 300,
      max_file_size_mb INTEGER NOT NULL DEFAULT 100,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS video_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_assignment_id INTEGER NOT NULL REFERENCES video_assignments(id) ON DELETE CASCADE,
      enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      file_storage_name TEXT NOT NULL,
      file_original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      submission_method TEXT NOT NULL DEFAULT 'upload' CHECK(submission_method IN ('upload','recording')),
      student_note TEXT,
      instructor_feedback TEXT,
      score REAL,
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(video_assignment_id, enrollment_id)
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

    CREATE TABLE IF NOT EXISTS exam_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      submitted_at TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','submitted','expired')),
      UNIQUE(enrollment_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS assignment_rubrics (
      grade_item_id INTEGER PRIMARY KEY REFERENCES grade_items(id) ON DELETE CASCADE,
      rubric_json TEXT NOT NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grade_item_id INTEGER NOT NULL REFERENCES grade_items(id) ON DELETE CASCADE,
      enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      file_storage_name TEXT NOT NULL,
      file_original_name TEXT NOT NULL,
      file_mime_type TEXT,
      file_size INTEGER NOT NULL DEFAULT 0,
      student_note TEXT,
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(grade_item_id, enrollment_id)
    );

    CREATE TABLE IF NOT EXISTS course_survey_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL CHECK(week_number IN (4, 8, 12)),
      overall_rating INTEGER NOT NULL CHECK(overall_rating BETWEEN 1 AND 5),
      instructor_rating INTEGER NOT NULL CHECK(instructor_rating BETWEEN 1 AND 5),
      content_rating INTEGER NOT NULL CHECK(content_rating BETWEEN 1 AND 5),
      support_rating INTEGER NOT NULL CHECK(support_rating BETWEEN 1 AND 5),
      pace TEXT NOT NULL CHECK(pace IN ('too_fast', 'about_right', 'too_slow')),
      would_recommend INTEGER NOT NULL CHECK(would_recommend IN (0, 1)),
      learning_highlight TEXT,
      improvement_suggestion TEXT,
      additional_comments TEXT,
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(enrollment_id, week_number)
    );

    CREATE TABLE IF NOT EXISTS student_course_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL CHECK(week_number IN (4, 8, 12)),
      academic_progress INTEGER NOT NULL CHECK(academic_progress BETWEEN 1 AND 5),
      attendance_punctuality INTEGER NOT NULL CHECK(attendance_punctuality BETWEEN 1 AND 5),
      professionalism INTEGER NOT NULL CHECK(professionalism BETWEEN 1 AND 5),
      communication_teamwork INTEGER NOT NULL CHECK(communication_teamwork BETWEEN 1 AND 5),
      clinical_skills INTEGER NOT NULL CHECK(clinical_skills BETWEEN 1 AND 5),
      overall_status TEXT NOT NULL CHECK(overall_status IN ('satisfactory', 'needs_improvement', 'unsatisfactory')),
      strengths TEXT,
      improvement_areas TEXT,
      action_plan TEXT,
      additional_notes TEXT,
      evaluator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      released_to_student INTEGER NOT NULL DEFAULT 1 CHECK(released_to_student IN (0, 1)),
      evaluated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(enrollment_id, week_number)
    );

    CREATE TABLE IF NOT EXISTS student_self_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL CHECK(week_number IN (4, 8, 12)),
      academic_progress INTEGER NOT NULL CHECK(academic_progress BETWEEN 1 AND 5),
      attendance_punctuality INTEGER NOT NULL CHECK(attendance_punctuality BETWEEN 1 AND 5),
      professionalism INTEGER NOT NULL CHECK(professionalism BETWEEN 1 AND 5),
      communication_teamwork INTEGER NOT NULL CHECK(communication_teamwork BETWEEN 1 AND 5),
      clinical_skills INTEGER NOT NULL CHECK(clinical_skills BETWEEN 1 AND 5),
      accomplishments TEXT,
      challenges TEXT,
      goals TEXT,
      support_needed TEXT,
      additional_notes TEXT,
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(enrollment_id, week_number)
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

    CREATE TABLE IF NOT EXISTS quickbooks_connections (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      realm_id TEXT NOT NULL,
      company_name TEXT,
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT NOT NULL,
      access_token_expires_at TEXT NOT NULL,
      refresh_token_expires_at TEXT,
      connected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_synced_at TEXT,
      last_error TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quickbooks_entity_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_type TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      quickbooks_type TEXT NOT NULL,
      quickbooks_id TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'synced' CHECK(sync_status IN ('pending','synced','error')),
      last_error TEXT,
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(local_type, local_id, quickbooks_type),
      UNIQUE(quickbooks_type, quickbooks_id)
    );

    CREATE TABLE IF NOT EXISTS quickbooks_sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direction TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('started','success','error')),
      records_processed INTEGER NOT NULL DEFAULT 0,
      message TEXT,
      started_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
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

    CREATE TABLE IF NOT EXISTS student_photo_review_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','approved','denied')),
      note TEXT,
      recipient_email TEXT,
      portal_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
      delivery_status TEXT NOT NULL DEFAULT 'not_applicable' CHECK(delivery_status IN ('not_applicable','pending','sent','failed','not_configured')),
      delivery_error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_student_photo_review_events_student
      ON student_photo_review_events(student_id, created_at DESC, id DESC);

    CREATE TABLE IF NOT EXISTS student_withdrawal_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      enrollment_id INTEGER REFERENCES enrollments(id) ON DELETE SET NULL,
      course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
      scope TEXT NOT NULL CHECK(scope IN ('course','school')),
      course_title TEXT,
      previous_student_status TEXT,
      previous_enrollment_status TEXT,
      effective_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      affected_enrollment_count INTEGER NOT NULL DEFAULT 0,
      withdrawn_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_student_withdrawal_events_student
      ON student_withdrawal_events(student_id, created_at DESC, id DESC);

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      posted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weekly_reminder_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      announcement_id INTEGER REFERENCES announcements(id) ON DELETE SET NULL,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(course_id, week_start)
    );

    CREATE TABLE IF NOT EXISTS weekly_reminder_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL REFERENCES weekly_reminder_runs(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed','not_configured')),
      error TEXT,
      sent_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(run_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS discussion_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL DEFAULT '',
      points_possible REAL NOT NULL DEFAULT 0,
      due_at TEXT,
      status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','closed')),
      source_url TEXT,
      source_external_id TEXT,
      posted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      posted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(course_id, title)
    );

    CREATE TABLE IF NOT EXISTS discussion_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL REFERENCES discussion_topics(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      parent_id INTEGER REFERENCES discussion_entries(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      author_email TEXT,
      body TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'portal',
      source_external_id TEXT,
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

    CREATE TABLE IF NOT EXISTS course_live_meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'Zoom',
      title TEXT NOT NULL,
      schedule TEXT NOT NULL,
      dates TEXT NOT NULL,
      audience TEXT NOT NULL DEFAULT 'Cohort 2 night students',
      join_url TEXT,
      meeting_id TEXT,
      passcode TEXT,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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

    CREATE TABLE IF NOT EXISTS student_admissions_document_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_key TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'missing' CHECK(status IN ('missing','complete','waived')),
      note TEXT,
      file_original_name TEXT,
      file_storage_name TEXT,
      file_mime_type TEXT,
      file_size INTEGER,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      uploaded_at TEXT,
      completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
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

    CREATE TABLE IF NOT EXISTS staff_time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      clock_in_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      clock_out_at TEXT,
      clock_in_note TEXT,
      clock_out_note TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','submitted','approved')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff_pay_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      timesheet_due TEXT,
      paycheck_date TEXT NOT NULL,
      regular_hours REAL NOT NULL DEFAULT 0,
      overtime_hours REAL NOT NULL DEFAULT 0,
      gross_pay_cents INTEGER NOT NULL DEFAULT 0,
      net_pay_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','posted','paid')),
      note TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS task_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      urgency TEXT NOT NULL DEFAULT 'not_urgent' CHECK(urgency IN ('urgent','not_urgent')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','done')),
      due_date TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portal_sessions (
      sid TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
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
  if (!lessonColumns.includes("published")) {
    db.exec("ALTER TABLE lessons ADD COLUMN published INTEGER NOT NULL DEFAULT 1;");
  }
  if (!lessonColumns.includes("instructor_only")) {
    db.exec("ALTER TABLE lessons ADD COLUMN instructor_only INTEGER NOT NULL DEFAULT 0;");
  }
  if (!lessonColumns.includes("item_type")) {
    db.exec("ALTER TABLE lessons ADD COLUMN item_type TEXT NOT NULL DEFAULT 'page';");
  }
  if (!lessonColumns.includes("grade_item_id")) {
    db.exec("ALTER TABLE lessons ADD COLUMN grade_item_id INTEGER REFERENCES grade_items(id) ON DELETE SET NULL;");
  }
  const moduleColumns = db.prepare("PRAGMA table_info(modules)").all().map((column) => column.name);
  if (!moduleColumns.includes("published")) {
    db.exec("ALTER TABLE modules ADD COLUMN published INTEGER NOT NULL DEFAULT 1;");
  }
  const courseEvaluationColumns = db.prepare("PRAGMA table_info(student_course_evaluations)").all().map((column) => column.name);
  if (!courseEvaluationColumns.includes("additional_notes")) {
    db.exec("ALTER TABLE student_course_evaluations ADD COLUMN additional_notes TEXT;");
  }
  const selfEvaluationColumns = db.prepare("PRAGMA table_info(student_self_evaluations)").all().map((column) => column.name);
  if (!selfEvaluationColumns.includes("additional_notes")) {
    db.exec("ALTER TABLE student_self_evaluations ADD COLUMN additional_notes TEXT;");
  }
  const userColumns = db.prepare("PRAGMA table_info(users)").all().map((column) => column.name);
  if (!userColumns.includes("personal_email")) {
    db.exec("ALTER TABLE users ADD COLUMN personal_email TEXT;");
  }
  if (!userColumns.includes("withdrawal_effective_date")) {
    db.exec("ALTER TABLE users ADD COLUMN withdrawal_effective_date TEXT;");
  }
  if (!userColumns.includes("withdrawal_reason")) {
    db.exec("ALTER TABLE users ADD COLUMN withdrawal_reason TEXT;");
  }
  if (!userColumns.includes("withdrawn_at")) {
    db.exec("ALTER TABLE users ADD COLUMN withdrawn_at TEXT;");
  }
  if (!userColumns.includes("withdrawn_by")) {
    db.exec("ALTER TABLE users ADD COLUMN withdrawn_by INTEGER REFERENCES users(id) ON DELETE SET NULL;");
  }
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
  if (!userColumns.includes("photo_review_status")) {
    db.exec("ALTER TABLE users ADD COLUMN photo_review_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK(photo_review_status IN ('not_submitted','approved','pending','denied'));");
  }
  if (!userColumns.includes("photo_review_note")) {
    db.exec("ALTER TABLE users ADD COLUMN photo_review_note TEXT;");
  }
  if (!userColumns.includes("photo_submitted_at")) {
    db.exec("ALTER TABLE users ADD COLUMN photo_submitted_at TEXT;");
  }
  if (!userColumns.includes("photo_reviewed_at")) {
    db.exec("ALTER TABLE users ADD COLUMN photo_reviewed_at TEXT;");
  }
  if (!userColumns.includes("photo_reviewed_by")) {
    db.exec("ALTER TABLE users ADD COLUMN photo_reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;");
  }
  const enrollmentColumns = db.prepare("PRAGMA table_info(enrollments)").all().map((column) => column.name);
  if (!enrollmentColumns.includes("withdrawal_effective_date")) {
    db.exec("ALTER TABLE enrollments ADD COLUMN withdrawal_effective_date TEXT;");
  }
  if (!enrollmentColumns.includes("withdrawal_reason")) {
    db.exec("ALTER TABLE enrollments ADD COLUMN withdrawal_reason TEXT;");
  }
  if (!enrollmentColumns.includes("withdrawn_at")) {
    db.exec("ALTER TABLE enrollments ADD COLUMN withdrawn_at TEXT;");
  }
  if (!enrollmentColumns.includes("withdrawn_by")) {
    db.exec("ALTER TABLE enrollments ADD COLUMN withdrawn_by INTEGER REFERENCES users(id) ON DELETE SET NULL;");
  }
  db.exec(`
    UPDATE users
    SET photo_review_status = 'approved'
    WHERE photo_review_status = 'not_submitted'
      AND photo_storage_name IS NOT NULL
      AND photo_submitted_at IS NULL;
  `);
  db.exec(`
    UPDATE users
    SET photo_review_status = CASE WHEN photo_storage_name IS NULL THEN 'not_submitted' ELSE 'approved' END
    WHERE photo_review_status IS NULL
       OR photo_review_status NOT IN ('not_submitted','approved','pending','denied');
  `);
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
  const admissionsDocumentColumns = db.prepare("PRAGMA table_info(student_admissions_document_checklist)").all().map((column) => column.name);
  if (!admissionsDocumentColumns.includes("file_original_name")) {
    db.exec("ALTER TABLE student_admissions_document_checklist ADD COLUMN file_original_name TEXT;");
  }
  if (!admissionsDocumentColumns.includes("file_storage_name")) {
    db.exec("ALTER TABLE student_admissions_document_checklist ADD COLUMN file_storage_name TEXT;");
  }
  if (!admissionsDocumentColumns.includes("file_mime_type")) {
    db.exec("ALTER TABLE student_admissions_document_checklist ADD COLUMN file_mime_type TEXT;");
  }
  if (!admissionsDocumentColumns.includes("file_size")) {
    db.exec("ALTER TABLE student_admissions_document_checklist ADD COLUMN file_size INTEGER;");
  }
  if (!admissionsDocumentColumns.includes("uploaded_by")) {
    db.exec("ALTER TABLE student_admissions_document_checklist ADD COLUMN uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL;");
  }
  if (!admissionsDocumentColumns.includes("uploaded_at")) {
    db.exec("ALTER TABLE student_admissions_document_checklist ADD COLUMN uploaded_at TEXT;");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_task_tickets_status_urgency ON task_tickets(status, urgency, created_at);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_course_live_meetings_course ON course_live_meetings(course_id);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_discussion_topics_course ON discussion_topics(course_id, posted_at);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_discussion_entries_topic ON discussion_entries(topic_id, posted_at);");
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
  createUser.run("instructor", "Roney", "Hernandez", "roney.hernandez@browardmiamihi.com", "", hash("InstructorPass123!"));
  createUser.run("instructor", "Dayana", "Diaz", "dayana.diaz@browardmiamihi.com", "", hash("InstructorPass123!"));
  createUser.run("student", "Demo", "Student", "student@browardmiamihi.com", "(954) 555-0102", hash("StudentPass123!"));

  db.prepare(`
    UPDATE users
    SET email = 'roney.hernandez.admin-removed@browardmiamihi.com',
      status = 'inactive'
    WHERE lower(email) = 'roney.hernandez@browardmiamihi.com'
      AND role = 'admin'
  `).run();

  const legacyRoneyInstructor = db.prepare(`
    SELECT id
    FROM users
    WHERE lower(email) = 'roney.hernandez.instructor@browardmiamihi.com'
      AND role = 'instructor'
  `).get();
  const currentRoneyInstructor = db.prepare(`
    SELECT id
    FROM users
    WHERE lower(email) = 'roney.hernandez@browardmiamihi.com'
      AND role = 'instructor'
  `).get();
  if (legacyRoneyInstructor && !currentRoneyInstructor) {
    db.prepare(`
      UPDATE users
      SET email = 'roney.hernandez@browardmiamihi.com'
      WHERE id = ?
    `).run(legacyRoneyInstructor.id);
  } else if (legacyRoneyInstructor && currentRoneyInstructor) {
    db.prepare(`
      UPDATE users
      SET email = 'roney.hernandez.instructor-retired@browardmiamihi.com',
        status = 'inactive'
      WHERE id = ?
    `).run(legacyRoneyInstructor.id);
  }

  db.prepare(`
    UPDATE users
    SET role = 'instructor',
      first_name = 'Roney',
      last_name = 'Hernandez',
      password_hash = ?,
      status = 'active',
      organization_status = 'organized',
      class_lock_reason = NULL
    WHERE lower(email) = 'roney.hernandez@browardmiamihi.com'
  `).run(hash("InstructorPass123!"));

  db.prepare(`
    UPDATE users
    SET role = 'instructor',
      first_name = 'Dayana',
      last_name = 'Diaz',
      password_hash = ?,
      status = 'active',
      organization_status = 'organized',
      class_lock_reason = NULL
    WHERE lower(email) = 'dayana.diaz@browardmiamihi.com'
  `).run(hash("InstructorPass123!"));

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
  const insertLessonWithVisibility = db.prepare("INSERT INTO lessons (module_id, title, content, external_url, duration_minutes, position, published, instructor_only) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
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
            if (lesson.published === false || lesson.instructorOnly) {
              insertLessonWithVisibility.run(
                moduleId,
                lesson.title,
                lesson.content,
                lesson.externalUrl || null,
                lesson.durationMinutes || 45,
                lessonIndex + 1,
                lesson.published === false ? 0 : 1,
                lesson.instructorOnly ? 1 : 0
              );
            } else {
              insertLesson.run(moduleId, lesson.title, lesson.content, lesson.externalUrl || null, lesson.durationMinutes || 45, lessonIndex + 1);
            }
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

  // Older catalog seeds stored the Canvas item type only in lesson content.
  // Promote those markers without replacing rows so existing progress, grades,
  // and submissions continue to reference the same lesson IDs.
  db.prepare(`
    UPDATE lessons
    SET item_type = CASE
      WHEN content LIKE 'Canvas item type: Assignment.%' THEN 'assignment'
      WHEN content LIKE 'Canvas item type: Discussion.%' THEN 'discussion'
      WHEN content LIKE 'Canvas item type: Quiz.%' OR content LIKE 'Canvas item type: Exam.%' THEN 'quiz'
      WHEN content LIKE 'Canvas item type: Attachment.%' THEN 'file'
      ELSE item_type
    END
    WHERE item_type = 'page'
      AND content LIKE 'Canvas item type: %'
  `).run();
  db.prepare(`
    UPDATE lessons
    SET item_type = 'assignment'
    WHERE content LIKE '%WRITTEN_ASSIGNMENT_DATA_BASE64:%'
  `).run();

  // Keep PN 104's four scheduled discussions synchronized without refreshing
  // the entire course shell. Updating the matching weekly rows preserves the
  // selected lesson and grade-item IDs; only obsolete discussion placeholders
  // from the other eight weeks are removed.
  const pn104CourseDefinition = courses.find((course) => course.slug === "anatomy-and-physiology");
  const pn104CourseRow = db.prepare("SELECT id FROM courses WHERE slug = 'anatomy-and-physiology'").get();
  const pn104Discussions = pn104CourseDefinition?.discussions || [];
  if (pn104CourseRow && pn104Discussions.length) {
    const pn104ModuleByWeek = new Map(
      db.prepare("SELECT id, title FROM modules WHERE course_id = ?").all(pn104CourseRow.id)
        .map((module) => [Number(String(module.title).match(/^Week (\d+):/)?.[1]), module])
        .filter(([week]) => Number.isInteger(week))
    );
    const selectWeeklyDiscussionLesson = db.prepare(`
      SELECT id FROM lessons
      WHERE module_id = ? AND title LIKE ?
      ORDER BY id
      LIMIT 1
    `);
    const updateWeeklyDiscussionLesson = db.prepare(`
      UPDATE lessons
      SET title = ?, content = ?, duration_minutes = ?, published = 1, instructor_only = 0
      WHERE id = ?
    `);
    const selectWeeklyDiscussionGradeItem = db.prepare(`
      SELECT id FROM grade_items
      WHERE course_id = ? AND title LIKE ?
      ORDER BY id
      LIMIT 1
    `);
    const updateWeeklyDiscussionGradeItem = db.prepare(`
      UPDATE grade_items SET title = ?, points_possible = ?, due_date = ? WHERE id = ?
    `);
    const insertScheduledDiscussionLesson = db.prepare(`
      INSERT INTO lessons (module_id, title, content, duration_minutes, position, published, instructor_only)
      VALUES (?, ?, ?, ?, ?, 1, 0)
    `);
    const lessonDefinitions = pn104CourseDefinition.modules
      .flatMap((module) => module.lessons || []);

    pn104Discussions.forEach((discussion) => {
      const module = pn104ModuleByWeek.get(Number(discussion.week));
      const lessonDefinition = lessonDefinitions.find((lesson) => lesson.title === discussion.title);
      if (!module || !lessonDefinition) return;
      const titlePattern = `[PN104 2026] Week ${discussion.week} Discussion:%`;
      const existingLesson = selectWeeklyDiscussionLesson.get(module.id, titlePattern);
      if (existingLesson) {
        updateWeeklyDiscussionLesson.run(
          discussion.title,
          lessonDefinition.content,
          lessonDefinition.durationMinutes || 30,
          existingLesson.id
        );
      } else {
        const assignmentPosition = db.prepare(`
          SELECT position FROM lessons
          WHERE module_id = ? AND title = ?
          ORDER BY id LIMIT 1
        `).get(module.id, `[PN104 2026] Week ${discussion.week} Applied A&P Assignment`)?.position;
        const position = assignmentPosition
          || db.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS next FROM lessons WHERE module_id = ?").get(module.id).next;
        if (assignmentPosition) {
          db.prepare("UPDATE lessons SET position = position + 1 WHERE module_id = ? AND position >= ?").run(module.id, assignmentPosition);
        }
        insertScheduledDiscussionLesson.run(
          module.id,
          discussion.title,
          lessonDefinition.content,
          lessonDefinition.durationMinutes || 30,
          position
        );
      }

      const existingGradeItem = selectWeeklyDiscussionGradeItem.get(pn104CourseRow.id, titlePattern);
      if (existingGradeItem) {
        updateWeeklyDiscussionGradeItem.run(
          discussion.title,
          discussion.pointsPossible,
          discussion.dueDate,
          existingGradeItem.id
        );
      } else {
        insertGradeItem.run(
          pn104CourseRow.id,
          discussion.title,
          discussion.pointsPossible,
          discussion.dueDate
        );
      }
    });

    const scheduledDiscussionTitles = new Set(pn104Discussions.map((discussion) => discussion.title));
    const discussionLessons = db.prepare(`
      SELECT lessons.id, lessons.title
      FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      WHERE modules.course_id = ?
        AND lessons.title LIKE '[PN104 2026] Week % Discussion:%'
    `).all(pn104CourseRow.id);
    const deleteDiscussionLesson = db.prepare("DELETE FROM lessons WHERE id = ?");
    discussionLessons.forEach((lesson) => {
      if (!scheduledDiscussionTitles.has(lesson.title)) deleteDiscussionLesson.run(lesson.id);
    });

    const discussionGradeItems = db.prepare(`
      SELECT id, title FROM grade_items
      WHERE course_id = ? AND title LIKE '[PN104 2026] Week % Discussion:%'
    `).all(pn104CourseRow.id);
    const deleteDiscussionGradeItem = db.prepare("DELETE FROM grade_items WHERE id = ?");
    discussionGradeItems.forEach((item) => {
      if (!scheduledDiscussionTitles.has(item.title)) deleteDiscussionGradeItem.run(item.id);
    });

    const updatePn104ReferenceLesson = db.prepare(`
      UPDATE lessons SET content = ?, duration_minutes = ?
      WHERE title = ? AND module_id IN (SELECT id FROM modules WHERE course_id = ?)
    `);
    ["Course Welcome and Expectations", "PN 104 Syllabus"].forEach((title) => {
      const definition = lessonDefinitions.find((lesson) => lesson.title === title);
      if (definition) {
        updatePn104ReferenceLesson.run(
          definition.content,
          definition.durationMinutes || 30,
          title,
          pn104CourseRow.id
        );
      }
    });

    const updatePn104AssignmentLesson = db.prepare(`
      UPDATE lessons
      SET content = ?, duration_minutes = ?, published = 1, instructor_only = 0, item_type = 'assignment'
      WHERE title = ? AND module_id IN (SELECT id FROM modules WHERE course_id = ?)
    `);
    lessonDefinitions
      .filter((lesson) => /^\[PN104 2026\] Week \d+ Applied A&P Assignment$/.test(lesson.title))
      .forEach((definition) => {
        updatePn104AssignmentLesson.run(
          definition.content || "",
          definition.durationMinutes || 60,
          definition.title,
          pn104CourseRow.id
        );
      });

    const chapter16LessonDefinition = lessonDefinitions.find((lesson) =>
      lesson.title === "Chapter 16: The Neurological Examination — PowerPoint"
    );
    if (chapter16LessonDefinition) {
      db.prepare(`
        UPDATE lessons
        SET title = ?, content = ?, external_url = ?, duration_minutes = ?, published = 1, instructor_only = 0, item_type = 'page'
        WHERE module_id IN (
            SELECT id FROM modules
            WHERE course_id = ?
              AND title LIKE 'Week 6:%'
          )
          AND (
            title IN (?, ?, ?, ?)
            OR title LIKE 'Chapter 16:%Neurological%'
            OR content LIKE '%PN104_Ch16_Neurological_Exam%'
            OR external_url LIKE '%PN104_Ch16_Neurological_Exam%'
          )
      `).run(
        chapter16LessonDefinition.title,
        chapter16LessonDefinition.content,
        chapter16LessonDefinition.externalUrl || null,
        chapter16LessonDefinition.durationMinutes || 75,
        pn104CourseRow.id,
        "Chapter 16: The Neurological Examination — PowerPoint",
        "Chapter 16: The Neurological Exam — PowerPoint",
        "Chapter 16: Neurological Assessment — PowerPoint",
        chapter16LessonDefinition.title
      );
    }

    const chapter16VideoDefinition = lessonDefinitions.find((lesson) =>
      lesson.title === "Chapter 16 Additional Reference: Neurological Exam Video"
    );
    if (chapter16VideoDefinition) {
      const week6Module = db.prepare(`
        SELECT id FROM modules
        WHERE course_id = ? AND title LIKE 'Week 6:%'
        ORDER BY position, id
        LIMIT 1
      `).get(pn104CourseRow.id);
      if (week6Module) {
        const existingVideoLesson = db.prepare(`
          SELECT id FROM lessons
          WHERE module_id = ?
            AND (
              title = ?
              OR external_url LIKE '%Panopto/Pages/Viewer.aspx?id=b49f0174-1ab3-498a-ae4e-ae6a018a5955%'
            )
          ORDER BY id
          LIMIT 1
        `).get(week6Module.id, chapter16VideoDefinition.title);
        if (existingVideoLesson) {
          db.prepare(`
            UPDATE lessons
            SET title = ?, content = ?, external_url = ?, duration_minutes = ?, published = 1, instructor_only = 0, item_type = 'link'
            WHERE id = ?
          `).run(
            chapter16VideoDefinition.title,
            chapter16VideoDefinition.content,
            chapter16VideoDefinition.externalUrl || null,
            chapter16VideoDefinition.durationMinutes || 20,
            existingVideoLesson.id
          );
        } else {
          const chapter16Position = db.prepare(`
            SELECT position FROM lessons
            WHERE module_id = ?
              AND title = 'Chapter 16: The Neurological Examination — PowerPoint'
            ORDER BY id
            LIMIT 1
          `).get(week6Module.id)?.position || 3;
          db.prepare(`
            UPDATE lessons
            SET position = position + 1
            WHERE module_id = ? AND position > ?
          `).run(week6Module.id, chapter16Position);
          db.prepare(`
            INSERT INTO lessons (module_id, title, content, external_url, duration_minutes, position, published, instructor_only, item_type)
            VALUES (?, ?, ?, ?, ?, ?, 1, 0, 'link')
          `).run(
            week6Module.id,
            chapter16VideoDefinition.title,
            chapter16VideoDefinition.content,
            chapter16VideoDefinition.externalUrl || null,
            chapter16VideoDefinition.durationMinutes || 20,
            chapter16Position + 1
          );
        }

        const chapter16PowerPointRows = db.prepare(`
          SELECT id
          FROM lessons
          WHERE module_id = ?
            AND title = 'Chapter 16: The Neurological Examination — PowerPoint'
          ORDER BY position, id
        `).all(week6Module.id);
        const chapter16PowerPointKeeper = chapter16PowerPointRows[0]?.id;
        if (chapter16PowerPointKeeper) {
          const moveCompletion = db.prepare(`
            INSERT OR IGNORE INTO lesson_completions (enrollment_id, lesson_id, completed_at)
            SELECT enrollment_id, ?, completed_at
            FROM lesson_completions
            WHERE lesson_id = ?
          `);
          const deleteLesson = db.prepare("DELETE FROM lessons WHERE id = ?");
          chapter16PowerPointRows.slice(1).forEach((row) => {
            moveCompletion.run(chapter16PowerPointKeeper, row.id);
            deleteLesson.run(row.id);
          });
        }

        const chapter16VideoRows = db.prepare(`
          SELECT id
          FROM lessons
          WHERE module_id = ?
            AND (
              title = 'Chapter 16 Additional Reference: Neurological Exam Video'
              OR external_url LIKE '%Panopto/Pages/Viewer.aspx?id=b49f0174-1ab3-498a-ae4e-ae6a018a5955%'
            )
          ORDER BY position, id
        `).all(week6Module.id);
        const chapter16VideoKeeper = chapter16VideoRows[0]?.id;
        if (chapter16VideoKeeper) {
          const moveCompletion = db.prepare(`
            INSERT OR IGNORE INTO lesson_completions (enrollment_id, lesson_id, completed_at)
            SELECT enrollment_id, ?, completed_at
            FROM lesson_completions
            WHERE lesson_id = ?
          `);
          const deleteLesson = db.prepare("DELETE FROM lessons WHERE id = ?");
          chapter16VideoRows.slice(1).forEach((row) => {
            moveCompletion.run(chapter16VideoKeeper, row.id);
            deleteLesson.run(row.id);
          });
        }

        db.prepare(`
          UPDATE lessons
          SET position = (
            SELECT ordered.new_position
            FROM (
              SELECT id, ROW_NUMBER() OVER (ORDER BY position, id) AS new_position
              FROM lessons
              WHERE module_id = ?
            ) AS ordered
            WHERE ordered.id = lessons.id
          )
          WHERE module_id = ?
        `).run(week6Module.id, week6Module.id);
      }
    }
  }

  // Update every live PN101 assessment in place. This preserves lesson IDs,
  // enrollments, completion links, submissions, and existing gradebook history.
  const pn101CourseDefinition = courses.find((course) => course.slug === "medical-terminology");
  const pn101CourseRow = db.prepare("SELECT id FROM courses WHERE slug = 'medical-terminology'").get();
  if (pn101CourseRow) {
    const renamePn101Lesson = db.prepare(`
      UPDATE lessons SET title = ?
      WHERE title = ? AND module_id IN (SELECT id FROM modules WHERE course_id = ?)
    `);
    const renamePn101GradeItem = db.prepare("UPDATE grade_items SET title = ? WHERE title = ? AND course_id = ?");
    [
      ["[PN101 2026] Midterm Exam 1 - Chapters 1-12", "[PN101 2026] Midterm Exam 1 - Chapters 1-4"],
      ["[PN101 2026] Midterm Exam 2 - Chapters 13-22", "[PN101 2026] Midterm Exam 2 - Chapters 5-10"]
    ].forEach(([nextTitle, priorTitle]) => {
      renamePn101Lesson.run(nextTitle, priorTitle, pn101CourseRow.id);
      renamePn101GradeItem.run(nextTitle, priorTitle, pn101CourseRow.id);
    });
  }
  const pn101AssessmentDefinitions = pn101CourseDefinition?.modules
    ?.flatMap((module) => module.lessons || [])
    .filter((lesson) => String(lesson.content || "").includes("QUIZ_DATA_BASE64:")) || [];
  const updatePn101Assessment = db.prepare(`
      UPDATE lessons
      SET content = ?, duration_minutes = ?
      WHERE title = ?
        AND module_id IN (
          SELECT m.id FROM modules m
          JOIN courses c ON c.id = m.course_id
          WHERE c.slug = 'medical-terminology'
        )
    `);
  pn101AssessmentDefinitions.forEach((assessment) => {
    updatePn101Assessment.run(assessment.content, assessment.durationMinutes || 30, assessment.title);
  });
  const updatePn101GradeItem = db.prepare(`
    UPDATE grade_items
    SET points_possible = ?, due_date = ?
    WHERE course_id = (SELECT id FROM courses WHERE slug = 'medical-terminology')
      AND title = ?
  `);
  (pn101CourseDefinition?.gradeItems || []).forEach((item) => {
    const result = updatePn101GradeItem.run(item.pointsPossible, item.dueDate || null, item.title);
    if (!result.changes && pn101CourseRow) {
      insertGradeItem.run(pn101CourseRow.id, item.title, item.pointsPossible, item.dueDate || null);
    }
  });

  // Keep the active 12-week PN101 shell synchronized without deleting lesson,
  // completion, submission, or grade IDs that enrolled students already use.
  if (pn101CourseRow && pn101CourseDefinition?.modules?.length === 12) {
    const existingPn101Modules = db.prepare("SELECT id, title FROM modules WHERE course_id = ? ORDER BY position, id").all(pn101CourseRow.id);
    const moduleForWeek = new Map();
    existingPn101Modules.forEach((module) => {
      const week = Number(String(module.title).match(/Week\s+(\d+)/i)?.[1] || 0);
      if (week >= 1 && week <= 12 && !moduleForWeek.has(week)) moduleForWeek.set(week, module);
    });
    const updatePn101Module = db.prepare("UPDATE modules SET title = ?, position = ? WHERE id = ?");
    const updatePn101LessonPlacement = db.prepare(`
      UPDATE lessons
      SET module_id = ?, content = ?, external_url = ?, duration_minutes = ?, position = ?
      WHERE id = ?
    `);
    pn101CourseDefinition.modules.forEach((moduleDefinition, index) => {
      const week = index + 1;
      let module = moduleForWeek.get(week);
      if (!module) {
        const id = insertModule.run(pn101CourseRow.id, moduleDefinition.title, week).lastInsertRowid;
        module = { id, title: moduleDefinition.title };
        moduleForWeek.set(week, module);
      }
      updatePn101Module.run(moduleDefinition.title, week, module.id);
      moduleDefinition.lessons.forEach((lessonDefinition, lessonIndex) => {
        let lesson = db.prepare(`
          SELECT l.id FROM lessons l
          JOIN modules m ON m.id = l.module_id
          WHERE m.course_id = ? AND l.title = ?
          ORDER BY l.id LIMIT 1
        `).get(pn101CourseRow.id, lessonDefinition.title);
        if (!lesson) {
          const id = insertLesson.run(
            module.id,
            lessonDefinition.title,
            lessonDefinition.content,
            lessonDefinition.externalUrl || null,
            lessonDefinition.durationMinutes || 45,
            lessonIndex + 1
          ).lastInsertRowid;
          lesson = { id };
        }
        updatePn101LessonPlacement.run(
          module.id,
          lessonDefinition.content,
          lessonDefinition.externalUrl || null,
          lessonDefinition.durationMinutes || 45,
          lessonIndex + 1,
          lesson.id
        );
      });
    });
    db.prepare(`
      DELETE FROM modules
      WHERE course_id = ?
        AND title LIKE '%Chapter Quiz Bank%'
        AND NOT EXISTS (SELECT 1 FROM lessons WHERE lessons.module_id = modules.id)
    `).run(pn101CourseRow.id);

    const updateSeedAnnouncement = db.prepare(`
      UPDATE announcements SET title = ?, body = ?
      WHERE course_id = ? AND title = ?
    `);
    updateSeedAnnouncement.run(
      "PN 101 Weekly Reminder: Due This Week (June 28–July 4, 2026)",
      "Complete Chapters 1–2, Quiz 1, Quiz 2, the Word Structure Worksheet, the Body Organization and Oncology Exercise, Discussion 1, and the syllabus acknowledgment by the dates listed in the syllabus.",
      pn101CourseRow.id,
      "PN 101 Week 2 Reminder: Due This Week (June 29-July 5, 2026)"
    );
    updateSeedAnnouncement.run(
      "PN 101 Weekly Reminder: Due This Week (July 5–11, 2026)",
      "Complete Chapters 3–4, Quiz 3, Quiz 4, the Suffix Flashcard Set, the Prefix Drill, and Discussion 2 by the dates listed in the syllabus.",
      pn101CourseRow.id,
      "PN 101 Week 3 Reminder: Due This Week (July 6-12, 2026)"
    );
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
  const anatomyPhysiology = db.prepare("SELECT id FROM courses WHERE slug = ?").get("anatomy-and-physiology");
  const acls = db.prepare("SELECT id FROM courses WHERE slug = ?").get("advanced-cardiovascular-life-support");
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
  if (anatomyPhysiology) {
    db.prepare(`
      INSERT OR IGNORE INTO enrollments (user_id, course_id, status, start_date, progress, source, external_order_id)
      VALUES (?, ?, 'active', '2026-07-13', 0, 'seed', 'seed-demo-pn104')
    `).run(demoStudent.id, anatomyPhysiology.id);
  }
  if (acls) {
    db.prepare(`
      INSERT OR IGNORE INTO enrollments (user_id, course_id, status, progress, source, external_order_id)
      VALUES (?, ?, 'active', 0, 'seed', 'seed-demo-acls')
    `).run(demoStudent.id, acls.id);
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
      cohort_name = excluded.cohort_name,
      cohort_start_date = excluded.cohort_start_date,
      cohort_end_date = excluded.cohort_end_date,
      uniform_size = excluded.uniform_size
  `);
  const insertCohortEnrollment = db.prepare(`
    INSERT OR IGNORE INTO enrollments (user_id, course_id, status, start_date, progress, source, external_order_id)
    VALUES (?, ?, 'active', ?, 0, 'cohort_seed', ?)
  `);
  const cohortTwoCourses = [
    { code: "pn101", course: medicalTerminology, startDate: "2026-06-17" },
    { code: "pn102", course: introNursing, startDate: "2026-06-22" },
    { code: "pn103", course: fundamentals, startDate: "2026-07-02" },
    { code: "pn104", course: anatomyPhysiology, startDate: "2026-07-13" }
  ];
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
    if (student) {
      cohortTwoCourses.forEach(({ code, course, startDate }) => {
        if (course) insertCohortEnrollment.run(student.id, course.id, startDate, `cohort-2-${code}-${student.id}`);
      });
    }
  });
  // Seeded cohort data is additive only. Operational enrollment status and
  // academic records must never be overwritten or deleted during startup.

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
    },
    {
      slug: "long-term-care-nursing-pn103",
      rows: [
        ["PN103 Long-Term Care Nursing: Course Open", "PN 103 is organized from Week 1 with selected high-priority long-term care chapters, weekly discussions, dated assignments, and calendar deadlines.", "2026-07-15 08:30:00"],
        ["PN103 Reminder: Catch Up Through Week 4", "Weeks 1-4 are available now. Complete the orientation acknowledgment, weekly discussions, and case assignments according to the course calendar.", "2026-07-15 09:00:00"]
      ]
    }
  ];
  seedAnnouncementGroups.forEach((group) => {
    const course = db.prepare("SELECT id FROM courses WHERE slug = ?").get(group.slug);
    if (course && announcementCount.get(course.id).count === 0) {
      group.rows.forEach(([title, body, postedAt]) => insertAnnouncement.run(course.id, instructorUser?.id || adminUser.id, title, body, postedAt));
    }
  });

  const upsertDiscussionTopic = db.prepare(`
    INSERT INTO discussion_topics (course_id, title, prompt, points_possible, due_at, posted_by, posted_at, source_external_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(course_id, title) DO UPDATE SET
      prompt = CASE WHEN discussion_topics.prompt = '' THEN excluded.prompt ELSE discussion_topics.prompt END,
      points_possible = CASE WHEN discussion_topics.points_possible = 0 THEN excluded.points_possible ELSE discussion_topics.points_possible END,
      due_at = COALESCE(discussion_topics.due_at, excluded.due_at),
      posted_by = COALESCE(discussion_topics.posted_by, excluded.posted_by),
      source_external_id = COALESCE(discussion_topics.source_external_id, excluded.source_external_id)
  `);
  const discussionSeedGroups = [
    {
      slug: "medical-terminology",
      rows: [
        [
          "[PN101 2026] Discussion 1: Introductions and Professional Goals",
          "Introduce yourself to the class. Share one professional goal and explain how learning medical terminology can help you communicate safely in healthcare.",
          "2026-06-28 23:59:00"
        ],
        [
          "[PN101 2026] Discussion 2: Decoding Medical Words",
          "Choose two unfamiliar medical terms from this week's reading. Break each term into word parts, define the meaning, and explain how the term may appear in a patient-care setting.",
          "2026-07-29 23:59:00"
        ],
        [
          "[PN101 2026] Discussion 3: Clinical Documentation",
          "Review a sample clinical note or healthcare scenario. Identify medical terms that must be documented clearly and explain why accurate terminology protects patients and staff.",
          "2026-08-18 23:59:00"
        ],
        [
          "[PN101 2026] Discussion 4: Patient Education",
          "Rewrite a complex medical term or instruction in plain language for a patient. Explain what you changed and why patient-friendly communication matters.",
          "2026-09-01 23:59:00"
        ]
      ]
    },
    {
      slug: "introduction-to-nursing-practical-nursing",
      rows: [
        ["Week 1 Discussion: Nursing Identity, Purpose, and the Practical Nurse Role", "Describe why nursing matters to you and identify one practical nurse responsibility that supports safe, compassionate care.", "2026-06-28 23:59:00"],
        ["Week 2 Discussion: Nursing Then and Now, Reform, Education, and Public Trust", "Compare one historical nursing challenge with one current expectation in nursing practice. Explain how public trust is earned.", "2026-07-05 23:59:00"],
        ["Week 3 Discussion: Caring, Comfort, Safety, Advocacy, and Healing", "Share an example of a caring behavior that protects comfort, safety, dignity, or healing for a patient.", "2026-07-12 23:59:00"],
        ["Week 4 Discussion: Health Care Teamwork, Scope, Delegation, and Communication", "Use a simple patient-care scenario to explain who should be notified, what should be reported, and why scope of practice matters.", "2026-07-19 23:59:00"],
        ["Week 5 Discussion: Ethics, Boundaries, Confidentiality, and Patient Rights", "Choose one ethical principle and apply it to a realistic classroom, lab, clinical, or patient privacy situation.", "2026-07-26 23:59:00"],
        ["Week 6 Discussion: Legal Foundations, Privacy, Documentation, and Accountability", "Explain why factual documentation, privacy, and accountability protect patients and nurses.", "2026-08-02 23:59:00"],
        ["Week 7 Discussion: Culture, Health Equity, and Respectful Care", "Describe one respectful communication strategy that supports cultural humility and health equity.", "2026-08-09 23:59:00"],
        ["Week 8 Discussion: Safety, Quality, Infection Prevention, and the Nurse's Watchful Eye", "Identify one common safety risk and explain what a beginning practical nursing student should observe, report, or do.", "2026-08-16 23:59:00"],
        ["Week 9 Discussion: Nursing Process and Clinical Judgment", "Use noticing, interpreting, responding, and reflecting to walk through a simple patient scenario.", "2026-08-23 23:59:00"],
        ["Week 10 Discussion: Patient Teaching, Health Promotion, and Community Impact", "Write a short teaching message using plain language and explain how you would check understanding.", "2026-08-30 23:59:00"],
        ["Week 11 Discussion: Professionalism, Resilience, Leadership, and Lifelong Learning", "Identify one professional habit you will practice this term and explain how it supports patient safety and student success.", "2026-09-06 23:59:00"],
        ["Week 12 Discussion: Nursing Today and Your Future Impact", "Connect one nursing leader, one ethical or legal responsibility, and one personal commitment you will carry into future practical nursing courses.", "2026-09-13 23:59:00"]
      ]
    },
    {
      slug: longTermCareNursingCourse.slug,
      rows: longTermCareNursingCourse.weeks.map((week) => [
        week.discussionTitle,
        week.discussionPrompt,
        `${week.dueDate} 23:59:00`
      ])
    }
  ];
  discussionSeedGroups.forEach((group) => {
    const course = db.prepare("SELECT id FROM courses WHERE slug = ?").get(group.slug);
    if (!course) return;
    group.rows.forEach(([title, prompt, dueAt]) => {
      upsertDiscussionTopic.run(
        course.id,
        title,
        prompt,
        10,
        dueAt,
        instructorUser?.id || adminUser.id,
        "2026-06-22 08:00:00",
        `${group.slug}:${title}`
      );
    });
  });

  if (pn104CourseRow && pn104Discussions.length) {
    const upsertPn104DiscussionTopic = db.prepare(`
      INSERT INTO discussion_topics (
        course_id, title, prompt, points_possible, due_at, status,
        posted_by, posted_at, source_external_id
      )
      VALUES (?, ?, ?, ?, ?, 'published', ?, ?, ?)
      ON CONFLICT(course_id, title) DO UPDATE SET
        prompt = excluded.prompt,
        points_possible = excluded.points_possible,
        due_at = excluded.due_at,
        status = 'published',
        posted_by = COALESCE(discussion_topics.posted_by, excluded.posted_by),
        source_external_id = excluded.source_external_id
    `);
    pn104Discussions.forEach((discussion) => {
      upsertPn104DiscussionTopic.run(
        pn104CourseRow.id,
        discussion.title,
        discussion.prompt,
        discussion.pointsPossible,
        `${discussion.dueDate} 23:59:00`,
        instructorUser?.id || adminUser.id,
        "2026-07-29 08:00:00",
        `anatomy-and-physiology:discussion:${discussion.week}`
      );
    });

    const scheduledDiscussionTitles = new Set(pn104Discussions.map((discussion) => discussion.title));
    const seededPn104Topics = db.prepare(`
      SELECT id, title FROM discussion_topics
      WHERE course_id = ?
        AND source_external_id LIKE 'anatomy-and-physiology:discussion:%'
    `).all(pn104CourseRow.id);
    const deleteSeededPn104Topic = db.prepare("DELETE FROM discussion_topics WHERE id = ?");
    seededPn104Topics.forEach((topic) => {
      if (!scheduledDiscussionTitles.has(topic.title)) deleteSeededPn104Topic.run(topic.id);
    });
  }

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

  // Keep live instructor-authored quiz records intact while ensuring every
  // Introduction to Nursing quiz has a full 15-question student assessment.
  const introductionCourse = db.prepare("SELECT id FROM courses WHERE slug = ?").get("introduction-to-nursing-practical-nursing");
  if (introductionCourse) {
    const introductionCatalogCourse = courses.find((course) => course.slug === "introduction-to-nursing-practical-nursing");
    if (introductionCatalogCourse?.description) {
      db.prepare(`
        UPDATE lessons
        SET content = ?
        WHERE id IN (
          SELECT lessons.id
          FROM lessons
          JOIN modules ON modules.id = lessons.module_id
          WHERE modules.course_id = ?
            AND lessons.title = 'How This Course Builds a Practical Nurse'
        )
      `).run(introductionCatalogCourse.description, introductionCourse.id);
    }

    const quizLessons = db.prepare(`
      SELECT lessons.id, lessons.title, lessons.content
      FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      WHERE modules.course_id = ?
        AND lower(lessons.title) LIKE '%quiz%'
        AND lessons.content LIKE '%QUIZ_DATA_BASE64:%'
    `).all(introductionCourse.id);
    const updateQuiz = db.prepare("UPDATE lessons SET content = ? WHERE id = ?");
    quizLessons.forEach((lesson) => {
      const upgradedContent = ensureIntroNursingQuizQuestionMinimum(lesson.content, lesson.title);
      if (upgradedContent !== lesson.content) updateQuiz.run(upgradedContent, lesson.id);
    });

    // PN 102 is a 12-week, 100-clock-hour course. Preserve instructor-authored
    // Weeks 1-6 while appending the catalog buildout for Weeks 7-12.
    const welcomeDefinition = introductionCatalogCourse?.modules
      ?.flatMap((module) => module.lessons || [])
      .find((lesson) => lesson.title === "Course Welcome and Expectations");
    if (welcomeDefinition) {
      db.prepare(`
        UPDATE lessons
        SET content = ?
        WHERE id IN (
          SELECT lessons.id
          FROM lessons
          JOIN modules ON modules.id = lessons.module_id
          WHERE modules.course_id = ?
            AND lessons.title = 'Course Welcome and Expectations'
        )
      `).run(welcomeDefinition.content, introductionCourse.id);
    }

    const existingModuleByWeek = db.prepare("SELECT id, title FROM modules WHERE course_id = ? AND title LIKE ? ORDER BY position, id LIMIT 1");
    const existingModuleByTitle = db.prepare("SELECT id, title FROM modules WHERE course_id = ? AND title = ? ORDER BY position, id LIMIT 1");
    const updateModuleTitle = db.prepare("UPDATE modules SET title = ? WHERE id = ?");
    const nextModulePosition = db.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS position FROM modules WHERE course_id = ?");
    const appendModule = db.prepare("INSERT INTO modules (course_id, title, position) VALUES (?, ?, ?)");
    const appendLesson = db.prepare(`
      INSERT INTO lessons (module_id, title, content, external_url, duration_minutes, position, published, instructor_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const existingLessonByTitle = db.prepare("SELECT id FROM lessons WHERE module_id = ? AND title = ? ORDER BY position, id LIMIT 1");
    const existingPowerPointByChapter = db.prepare(`
      SELECT lessons.id, lessons.module_id, lessons.position
      FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      WHERE modules.course_id = ?
        AND (lessons.title = ? OR lessons.title LIKE ?)
      ORDER BY CASE WHEN lessons.title = ? THEN 0 ELSE 1 END, modules.position, lessons.position, lessons.id
      LIMIT 1
    `);
    const moduleContainingChapter = db.prepare(`
      SELECT modules.id, modules.title
      FROM modules
      JOIN lessons ON lessons.module_id = modules.id
      WHERE modules.course_id = ?
        AND (lessons.title = ? OR lessons.title LIKE ?)
      ORDER BY modules.position, modules.id
      LIMIT 1
    `);
    const nextLessonPosition = db.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS position FROM lessons WHERE module_id = ?");
    const updateLessonDefinition = db.prepare(`
      UPDATE lessons
      SET content = ?, external_url = ?, duration_minutes = ?, published = ?, instructor_only = ?
      WHERE id = ?
    `);
    const updateLessonMaterialContent = db.prepare(`
      UPDATE lessons
      SET content = ?, external_url = ?, duration_minutes = ?
      WHERE id = ?
    `);
    const updatePowerPointDefinition = db.prepare(`
      UPDATE lessons
      SET module_id = ?, title = ?, content = ?, external_url = ?, duration_minutes = ?, position = ?, item_type = 'page'
      WHERE id = ?
    `);

    const orientationDefinition = (introductionCatalogCourse?.modules || []).find((module) => module.title === "Orientation and Course Resources");
    const textbookDefinition = orientationDefinition?.lessons?.find((lesson) => lesson.title.startsWith("Required Textbook:"));
    const orientationModule = existingModuleByTitle.get(introductionCourse.id, "Orientation and Course Resources");
    if (orientationModule && textbookDefinition) {
      const storedTextbookLesson = existingLessonByTitle.get(orientationModule.id, textbookDefinition.title);
      if (storedTextbookLesson) {
        updateLessonDefinition.run(
          textbookDefinition.content,
          textbookDefinition.externalUrl || null,
          textbookDefinition.durationMinutes || 10,
          1,
          0,
          storedTextbookLesson.id
        );
      } else {
        appendLesson.run(
          orientationModule.id,
          textbookDefinition.title,
          textbookDefinition.content,
          textbookDefinition.externalUrl || null,
          textbookDefinition.durationMinutes || 10,
          nextLessonPosition.get(orientationModule.id).position,
          1,
          0
        );
      }
    }

    // Chapters 14 and above belong to PN 103 after the corrected course split.
    db.prepare(`
      DELETE FROM lessons
      WHERE module_id IN (SELECT id FROM modules WHERE course_id = ?)
        AND (
          title GLOB 'Chapter 1[4-9]:*'
          OR title GLOB 'Chapter 2[0-9]:*'
          OR title GLOB 'Chapter 3[0-9]:*'
          OR title GLOB 'Chapter 4[0-9]:*'
        )
    `).run(introductionCourse.id);

    // Correct the legacy Week 1-6 labels to the actual textbook Chapters 1-6
    // while retaining the existing lesson records, PowerPoints, and quizzes.
    const findLegacyChapterLesson = db.prepare(`
      SELECT id FROM lessons
      WHERE module_id = ?
        AND (title = ? OR title LIKE ?)
      ORDER BY position, id LIMIT 1
    `);
    (introductionCatalogCourse?.modules || [])
      .filter((module) => /^Week [1-6]:/.test(module.title))
      .forEach((module) => {
        const weekNumber = module.title.match(/^Week (\d+):/)?.[1];
        const storedModule = existingModuleByWeek.get(introductionCourse.id, `Week ${weekNumber}:%`);
        const chapterLesson = module.lessons.find((lesson) => lesson.title.startsWith(`Chapter ${weekNumber}:`));
        if (!storedModule || !chapterLesson) return;
        if (storedModule.title !== module.title) updateModuleTitle.run(module.title, storedModule.id);
        const storedChapterLesson = findLegacyChapterLesson.get(
          storedModule.id,
          chapterLesson.title,
          `[PN102 2026] Chapter ${weekNumber}:%`
        );
        if (storedChapterLesson) {
          db.prepare("UPDATE lessons SET title = ?, content = ?, duration_minutes = ? WHERE id = ?").run(
            chapterLesson.title,
            chapterLesson.content,
            chapterLesson.durationMinutes || 90,
            storedChapterLesson.id
          );
        } else {
          appendLesson.run(storedModule.id, chapterLesson.title, chapterLesson.content, null, chapterLesson.durationMinutes || 90, nextLessonPosition.get(storedModule.id).position, 1, 0);
        }

        const powerPointLesson = module.lessons.find((lesson) => lesson.title === `[PN102 2026] Chapter ${weekNumber} PowerPoint Review`);
        if (powerPointLesson) {
          const storedPowerPoint = existingLessonByTitle.get(storedModule.id, powerPointLesson.title);
          if (storedPowerPoint) {
            updateLessonMaterialContent.run(powerPointLesson.content || "", null, powerPointLesson.durationMinutes || 30, storedPowerPoint.id);
          } else {
            appendLesson.run(storedModule.id, powerPointLesson.title, powerPointLesson.content || "", null, powerPointLesson.durationMinutes || 30, nextLessonPosition.get(storedModule.id).position, 1, 0);
          }
        }

        const assignmentLesson = module.lessons.find((lesson) =>
          /^\[PN102 2026\] Chapter [1-6] Applied Nursing Assignment$/.test(lesson.title)
        );
        if (assignmentLesson) {
          const assignmentItemType = String(assignmentLesson.content || "").includes("QUIZ_DATA_BASE64:")
            ? "quiz"
            : "assignment";
          const storedAssignment = existingLessonByTitle.get(storedModule.id, assignmentLesson.title)
            || existingLessonByTitle.get(storedModule.id, `Week ${weekNumber} Applied Assignment`);
          if (storedAssignment) {
            db.prepare(`
              UPDATE lessons
              SET title = ?, content = ?, duration_minutes = ?, published = 1,
                instructor_only = 0, item_type = ?
              WHERE id = ?
            `).run(
              assignmentLesson.title,
              assignmentLesson.content || "",
              assignmentLesson.durationMinutes || 60,
              assignmentItemType,
              storedAssignment.id
            );
          } else {
            const assignmentId = appendLesson.run(
              storedModule.id,
              assignmentLesson.title,
              assignmentLesson.content || "",
              null,
              assignmentLesson.durationMinutes || 60,
              nextLessonPosition.get(storedModule.id).position,
              1,
              0
            ).lastInsertRowid;
            db.prepare("UPDATE lessons SET item_type = ? WHERE id = ?").run(assignmentItemType, assignmentId);
          }
        }

        // Replace the legacy preview-style five-question quiz with the
        // interactive 15-question assessment while preserving its lesson ID.
        const quizLesson = module.lessons.find((lesson) => lesson.title === `[PN102 2026] Quiz ${weekNumber} - Chapter ${weekNumber}`);
        if (quizLesson) {
          const storedQuiz = existingLessonByTitle.get(storedModule.id, quizLesson.title);
          if (storedQuiz) {
            updateLessonDefinition.run(
              quizLesson.content || "",
              quizLesson.externalUrl || null,
              quizLesson.durationMinutes || 30,
              1,
              0,
              storedQuiz.id
            );
          } else {
            appendLesson.run(storedModule.id, quizLesson.title, quizLesson.content || "", null, quizLesson.durationMinutes || 30, nextLessonPosition.get(storedModule.id).position, 1, 0);
          }
        }

        const examLesson = module.lessons.find((lesson) => lesson.title === "Midterm Exam: Weeks 1-6");
        if (examLesson) {
          const storedExam = existingLessonByTitle.get(storedModule.id, examLesson.title);
          if (storedExam) {
            updateLessonDefinition.run(examLesson.content || "", null, examLesson.durationMinutes || 60, 1, 0, storedExam.id);
          } else {
            appendLesson.run(storedModule.id, examLesson.title, examLesson.content || "", null, examLesson.durationMinutes || 60, nextLessonPosition.get(storedModule.id).position, 1, 0);
          }
        }
      });

    const extensionModules = (introductionCatalogCourse?.modules || []).filter((module) =>
      /^Week (?:[7-9]|1[0-2]):/.test(module.title)
    );
    extensionModules.forEach((module) => {
      const weekNumber = module.title.match(/^Week (\d+):/)?.[1];
      const firstChapterLesson = (module.lessons || []).find((lesson) => /^Chapter \d+:/.test(lesson.title));
      const storedWeekModule = weekNumber
        ? existingModuleByWeek.get(introductionCourse.id, `Week ${weekNumber}:%`)
        : null;
      const storedModule = weekNumber
        ? storedWeekModule || (firstChapterLesson ? moduleContainingChapter.get(
            introductionCourse.id,
            firstChapterLesson.title,
            `[PN102 2026] Chapter ${firstChapterLesson.title.match(/^Chapter (\d+):/)?.[1]}:%`
          ) : null)
          || existingModuleByTitle.get(introductionCourse.id, module.title)
        : null;
      const moduleId = storedModule?.id || appendModule.run(
        introductionCourse.id,
        module.title,
        nextModulePosition.get(introductionCourse.id).position
      ).lastInsertRowid;
      if (storedWeekModule && storedWeekModule.title !== module.title) updateModuleTitle.run(module.title, moduleId);
      (module.lessons || []).forEach((lesson, index) => {
        const storedLesson = existingLessonByTitle.get(moduleId, lesson.title);
        if (storedLesson) {
          if (/^\[PN102 2026\] Chapter \d+ PowerPoint Review$/.test(lesson.title)) {
            updateLessonMaterialContent.run(
              lesson.content || "",
              lesson.externalUrl || null,
              lesson.durationMinutes || 30,
              storedLesson.id
            );
          } else {
            updateLessonDefinition.run(
              lesson.content || "",
              lesson.externalUrl || null,
              lesson.durationMinutes || 45,
              lesson.published === false ? 0 : 1,
              lesson.instructorOnly ? 1 : 0,
              storedLesson.id
            );
          }
        } else {
          appendLesson.run(
            moduleId,
            lesson.title,
            lesson.content || "",
            lesson.externalUrl || null,
            lesson.durationMinutes || 45,
            nextLessonPosition.get(moduleId).position,
            lesson.published === false ? 0 : 1,
            lesson.instructorOnly ? 1 : 0
          );
        }
      });
    });

    // Keep all PN 102 chapter PowerPoints available without rebuilding the
    // course or changing existing lesson IDs, completion history, or an
    // instructor's publish/unpublish choice. This also finds instructor-
    // renamed week modules by their chapter lesson.
    (introductionCatalogCourse?.modules || [])
      .filter((module) => /^Week (?:[1-9]|1[0-2]):/.test(module.title))
      .forEach((module) => {
        const weekNumber = module.title.match(/^Week (\d+):/)?.[1];
        const powerPointLessons = (module.lessons || []).filter((lesson) => /^\[PN102 2026\] Chapter \d+ PowerPoint Review$/.test(lesson.title));
        if (!weekNumber || !powerPointLessons.length) return;

        powerPointLessons.forEach((powerPointLesson) => {
          const chapterNumber = powerPointLesson.title.match(/Chapter (\d+) PowerPoint/)?.[1];
          const chapterLesson = (module.lessons || []).find((lesson) => lesson.title.startsWith(`Chapter ${chapterNumber}:`));
          if (!chapterNumber || !chapterLesson) return;

          let storedModule = existingModuleByWeek.get(introductionCourse.id, `Week ${weekNumber}:%`)
            || moduleContainingChapter.get(
              introductionCourse.id,
              chapterLesson.title,
              `[PN102 2026] Chapter ${chapterNumber}:%`
            )
            || existingModuleByTitle.get(introductionCourse.id, module.title);

          if (!storedModule) {
            const moduleId = appendModule.run(
              introductionCourse.id,
              module.title,
              nextModulePosition.get(introductionCourse.id).position
            ).lastInsertRowid;
            storedModule = { id: moduleId, title: module.title };
            (module.lessons || []).forEach((lesson, index) => {
              appendLesson.run(
                moduleId,
                lesson.title,
                lesson.content || "",
                lesson.externalUrl || null,
                lesson.durationMinutes || 45,
                index + 1,
                lesson.published === false ? 0 : 1,
                lesson.instructorOnly ? 1 : 0
              );
            });
          }

          const storedPowerPoint = existingPowerPointByChapter.get(
            introductionCourse.id,
            powerPointLesson.title,
            `[PN102 2026] Chapter ${chapterNumber} PowerPoint%`,
            powerPointLesson.title
          );
          if (storedPowerPoint) {
            const position = Number(storedPowerPoint.module_id) === Number(storedModule.id)
              ? storedPowerPoint.position
              : nextLessonPosition.get(storedModule.id).position;
            updatePowerPointDefinition.run(
              storedModule.id,
              powerPointLesson.title,
              powerPointLesson.content || "",
              powerPointLesson.externalUrl || null,
              powerPointLesson.durationMinutes || 30,
              position,
              storedPowerPoint.id
            );
          } else {
            appendLesson.run(
              storedModule.id,
              powerPointLesson.title,
              powerPointLesson.content || "",
              powerPointLesson.externalUrl || null,
              powerPointLesson.durationMinutes || 30,
              nextLessonPosition.get(storedModule.id).position,
              1,
              0
            );
          }
        });
      });

    // Remove chapter-reading links left in a prior week by earlier course
    // allocations. Each textbook chapter must appear in exactly one week.
    const removeMisallocatedChapter = db.prepare(`
      DELETE FROM lessons
      WHERE title GLOB ?
        AND module_id IN (
          SELECT id FROM modules
          WHERE course_id = ?
            AND title LIKE 'Week %'
            AND title NOT LIKE ?
        )
    `);
    for (let chapter = 7; chapter <= 13; chapter += 1) {
      const assignedWeek = chapter >= 12 ? 12 : chapter;
      removeMisallocatedChapter.run(`Chapter ${chapter}:*`, introductionCourse.id, `Week ${assignedWeek}:%`);
    }

    // The legacy six-week build placed its final module immediately after
    // Week 6. Keep the final assessment last after extending the course.
    const finalModules = db.prepare(`
      SELECT id
      FROM modules AS final_module
      WHERE final_module.course_id = ?
        AND lower(final_module.title) LIKE '%wrap-up%'
        AND EXISTS (
          SELECT 1
          FROM modules AS weekly_module
          WHERE weekly_module.course_id = final_module.course_id
            AND weekly_module.position > final_module.position
            AND weekly_module.title LIKE 'Week %'
        )
      ORDER BY position, id
    `).all(introductionCourse.id);
    const moveModule = db.prepare("UPDATE modules SET position = ? WHERE id = ?");
    finalModules.forEach((module) => {
      const position = nextModulePosition.get(introductionCourse.id).position;
      moveModule.run(position, module.id);
    });

    const finalDefinition = (introductionCatalogCourse?.modules || []).find((module) => module.title === "Course Wrap-Up and Final Assessment");
    const storedFinalModule = existingModuleByTitle.get(introductionCourse.id, "Course Wrap-Up and Final Assessment")
      || db.prepare("SELECT id, title FROM modules WHERE course_id = ? AND lower(title) LIKE '%wrap-up%' ORDER BY position, id LIMIT 1").get(introductionCourse.id)
      || finalModules[0];
    if (storedFinalModule && finalDefinition) {
      finalDefinition.lessons.forEach((lesson) => {
        let storedLesson = existingLessonByTitle.get(storedFinalModule.id, lesson.title);
        if (!storedLesson && lesson.title === "Cumulative Final Exam") {
          storedLesson = db.prepare("SELECT id FROM lessons WHERE module_id = ? AND lower(title) LIKE '%final exam%' ORDER BY position, id LIMIT 1").get(storedFinalModule.id);
        }
        if (storedLesson) {
          db.prepare("UPDATE lessons SET title = ?, content = ?, duration_minutes = ?, published = 1, instructor_only = 0 WHERE id = ?").run(
            lesson.title,
            lesson.content || "",
            lesson.durationMinutes || 45,
            storedLesson.id
          );
        } else {
          appendLesson.run(storedFinalModule.id, lesson.title, lesson.content || "", lesson.externalUrl || null, lesson.durationMinutes || 45, nextLessonPosition.get(storedFinalModule.id).position, 1, 0);
        }
      });
    }

    const existingGradeItem = db.prepare("SELECT id FROM grade_items WHERE course_id = ? AND title = ?");
    const appendGradeItem = db.prepare("INSERT INTO grade_items (course_id, title, points_possible, due_date) VALUES (?, ?, ?, ?)");
    db.prepare("DELETE FROM grade_items WHERE course_id = ? AND title = '[PN102 2026] Final Exam - Introduction to Nursing Chapters 1-6'").run(introductionCourse.id);
    const midtermGradeItem = (introductionCatalogCourse?.gradeItems || []).find((item) => item.title === "Midterm Exam: Weeks 1-6");
    if (midtermGradeItem && !existingGradeItem.get(introductionCourse.id, midtermGradeItem.title)) {
      appendGradeItem.run(introductionCourse.id, midtermGradeItem.title, midtermGradeItem.pointsPossible, midtermGradeItem.dueDate || null);
    }
    db.prepare("UPDATE grade_items SET title = ?, due_date = ? WHERE course_id = ? AND title = ?").run(
      "[PN102 2026] Quiz - Chapters 7-9",
      "2026-08-23 23:59:00",
      introductionCourse.id,
      "Quiz 3: Weeks 7-8"
    );
    db.prepare("UPDATE grade_items SET title = ?, due_date = ? WHERE course_id = ? AND title = ?").run(
      "[PN102 2026] Quiz - Chapters 10-13",
      "2026-09-13 23:59:00",
      introductionCourse.id,
      "Quiz 4: Weeks 9-10"
    );
    (introductionCatalogCourse?.gradeItems || []).slice(7).forEach((item) => {
      if (!existingGradeItem.get(introductionCourse.id, item.title)) {
        appendGradeItem.run(introductionCourse.id, item.title, item.pointsPossible, item.dueDate || null);
      }
    });

    // Remove legacy credit references and repair any old six-week/48-hour
    // wording that remains in instructor-created PN 102 pages.
    const storedLessons = db.prepare(`
      SELECT lessons.id, lessons.content
      FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      WHERE modules.course_id = ?
        AND (
          lower(lessons.content) LIKE '%credit%'
          OR lower(lessons.content) LIKE '%clock hours: 48%'
          OR lower(lessons.content) LIKE '%length: 6 weeks%'
          OR lower(lessons.content) LIKE '%six-week introduction%'
        )
    `).all(introductionCourse.id);
    const updateLessonContent = db.prepare("UPDATE lessons SET content = ? WHERE id = ?");
    storedLessons.forEach((lesson) => {
      const catalogAlignedContent = String(lesson.content || "")
        .replace(/<li>\s*(?:academic\s+)?credits?\s*:\s*[^<]*<\/li>/gi, "")
        .replace(/^\s*(?:[-*•]\s*)?(?:academic\s+)?credits?\s*:\s*[^\r\n]*(?:\r?\n|$)/gim, "")
        .replace(/(?:contact|clock) hours\s*:\s*48/gi, "Clock hours: 100")
        .replace(/length\s*:\s*6 weeks/gi, "Length: 12 weeks")
        .replace(/a six-week introduction/gi, "A 12-week introduction");
      if (catalogAlignedContent !== lesson.content) updateLessonContent.run(catalogAlignedContent, lesson.id);
    });
  }

  // Align the existing PN 103 shell to Foundations of Nursing Chapters 14-25
  // and 37-40 without replacing enrollments, lesson IDs, or grade history.
  const longTermCareCourseRow = db.prepare("SELECT id FROM courses WHERE slug = ?").get(longTermCareNursingCourse.slug);
  if (longTermCareCourseRow) {
    const findModuleByTitle = db.prepare("SELECT id, title FROM modules WHERE course_id = ? AND title = ? ORDER BY position, id LIMIT 1");
    const findModuleByWeek = db.prepare("SELECT id, title FROM modules WHERE course_id = ? AND title LIKE ? ORDER BY position, id LIMIT 1");
    const renameModule = db.prepare("UPDATE modules SET title = ? WHERE id = ?");
    const findLessonByTitle = db.prepare("SELECT id FROM lessons WHERE module_id = ? AND title = ? ORDER BY position, id LIMIT 1");
    const findDiscussionLesson = db.prepare("SELECT id FROM lessons WHERE module_id = ? AND title LIKE '%Discussion:%' ORDER BY position, id LIMIT 1");
    const findAssignmentLesson = db.prepare(`
      SELECT id FROM lessons
      WHERE module_id = ?
        AND title LIKE '[PN103 2026]%'
        AND title NOT LIKE '%Discussion:%'
      ORDER BY position DESC, id DESC LIMIT 1
    `);
    const nextLessonPosition = db.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS position FROM lessons WHERE module_id = ?");
    const insertLesson = db.prepare(`
      INSERT INTO lessons (module_id, title, content, external_url, duration_minutes, position, published, instructor_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const syncLesson = db.prepare(`
      UPDATE lessons
      SET title = ?, content = ?, external_url = ?, duration_minutes = ?, published = ?, instructor_only = ?
      WHERE id = ?
    `);

    const orientationDefinition = longTermCareNursingCourse.modules.find((module) => module.title === "PN103 2026 - Orientation and Course Resources");
    const orientationModule = findModuleByTitle.get(longTermCareCourseRow.id, "PN103 2026 - Orientation and Course Resources");
    const textbookLesson = orientationDefinition?.lessons?.find((lesson) => lesson.title.startsWith("Required Textbook:"));
    if (orientationModule && textbookLesson) {
      const storedTextbookLesson = db.prepare("SELECT id FROM lessons WHERE module_id = ? AND lower(title) LIKE '%textbook%' ORDER BY position, id LIMIT 1").get(orientationModule.id);
      if (storedTextbookLesson) {
        syncLesson.run(textbookLesson.title, textbookLesson.content, null, textbookLesson.durationMinutes || 20, 1, 0, storedTextbookLesson.id);
      } else {
        insertLesson.run(orientationModule.id, textbookLesson.title, textbookLesson.content, null, textbookLesson.durationMinutes || 20, nextLessonPosition.get(orientationModule.id).position, 1, 0);
      }
    }

    longTermCareNursingCourse.modules.filter((module) => /^Week \d+:/.test(module.title)).forEach((module) => {
      const weekNumber = module.title.match(/^Week (\d+):/)?.[1];
      const storedModule = findModuleByWeek.get(longTermCareCourseRow.id, `Week ${weekNumber}:%`);
      if (!storedModule) return;
      if (storedModule.title !== module.title) renameModule.run(module.title, storedModule.id);
      module.lessons.forEach((lesson) => {
        let storedLesson = findLessonByTitle.get(storedModule.id, lesson.title);
        if (!storedLesson && lesson.title.includes("Discussion:")) storedLesson = findDiscussionLesson.get(storedModule.id);
        if (!storedLesson && lesson.title.startsWith("[PN103 2026]") && !lesson.title.includes("Discussion:") && !lesson.title.includes("Quiz -")) storedLesson = findAssignmentLesson.get(storedModule.id);
        if (storedLesson) {
          syncLesson.run(lesson.title, lesson.content || "", lesson.externalUrl || null, lesson.durationMinutes || 45, 1, 0, storedLesson.id);
        } else {
          insertLesson.run(storedModule.id, lesson.title, lesson.content || "", lesson.externalUrl || null, lesson.durationMinutes || 45, nextLessonPosition.get(storedModule.id).position, 1, 0);
        }
      });
    });

    const findGradeItemByTitle = db.prepare("SELECT id FROM grade_items WHERE course_id = ? AND title = ?");
    const findDiscussionGradeItem = db.prepare("SELECT id FROM grade_items WHERE course_id = ? AND due_date = ? AND title LIKE '%Discussion:%' ORDER BY id LIMIT 1");
    const findAssignmentGradeItem = db.prepare(`
      SELECT id FROM grade_items
      WHERE course_id = ? AND due_date = ?
        AND title LIKE '[PN103 2026]%'
        AND title NOT LIKE '%Discussion:%'
        AND lower(title) NOT LIKE '%acknowledgment%'
        AND lower(title) NOT LIKE '%professionalism%'
      ORDER BY id LIMIT 1
    `);
    const updateGradeItem = db.prepare("UPDATE grade_items SET title = ?, points_possible = ?, due_date = ? WHERE id = ?");
    const insertGradeItem = db.prepare("INSERT INTO grade_items (course_id, title, points_possible, due_date) VALUES (?, ?, ?, ?)");
    longTermCareNursingCourse.gradeItems.forEach((item) => {
      let storedItem = findGradeItemByTitle.get(longTermCareCourseRow.id, item.title);
      if (!storedItem && item.title.includes("Discussion:")) storedItem = findDiscussionGradeItem.get(longTermCareCourseRow.id, item.dueDate);
      if (!storedItem && item.title.startsWith("[PN103 2026]") && !item.title.includes("Discussion:") && !item.title.includes("Quiz -")) storedItem = findAssignmentGradeItem.get(longTermCareCourseRow.id, item.dueDate);
      if (storedItem) updateGradeItem.run(item.title, item.pointsPossible, item.dueDate || null, storedItem.id);
      else insertGradeItem.run(longTermCareCourseRow.id, item.title, item.pointsPossible, item.dueDate || null);
    });
  }

  db.prepare(`
    UPDATE lessons
    SET item_type = 'assignment'
    WHERE content LIKE '%WRITTEN_ASSIGNMENT_DATA_BASE64:%'
  `).run();

  const unmarkedWrittenAssignments = db.prepare(`
    SELECT lessons.id, lessons.title, lessons.content
    FROM lessons
    JOIN modules ON modules.id = lessons.module_id
    JOIN courses ON courses.id = modules.course_id
    WHERE lessons.item_type = 'assignment'
      AND lessons.content NOT LIKE '%WRITTEN_ASSIGNMENT_DATA_BASE64:%'
      AND lessons.content NOT LIKE '%QUIZ_DATA_BASE64:%'
      AND courses.slug IN (
        'medical-terminology',
        'introduction-to-nursing-practical-nursing',
        'anatomy-and-physiology',
        'long-term-care-nursing-pn103'
      )
  `).all();
  const standardizeWrittenAssignment = db.prepare(`
    UPDATE lessons
    SET content = ?, published = 1, instructor_only = 0, item_type = 'assignment'
    WHERE id = ?
  `);
  unmarkedWrittenAssignments.forEach((lesson) => {
    standardizeWrittenAssignment.run(fallbackWrittenAssignmentContent(lesson.title, lesson.content), lesson.id);
  });
}

function initialize() {
  migrate();
  seed();
  return db;
}

module.exports = { db, initialize, databaseFile };
