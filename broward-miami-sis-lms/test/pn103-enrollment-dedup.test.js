const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const { once } = require("node:events");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");

function initializeDatabase(databaseFile) {
  execFileSync(process.execPath, ["--no-warnings", "-e", "require('./src/db').initialize()"], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_FILE: databaseFile, NODE_ENV: "test" }
  });
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const { port } = socket.address();
      socket.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function waitForServer(serverProcess) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for test server")), 15000);
    const onData = (chunk) => {
      if (!String(chunk).includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      serverProcess.stdout.off("data", onData);
      resolve();
    };
    serverProcess.stdout.on("data", onData);
    serverProcess.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Test server exited before startup with code ${code}`));
    });
  });
}

test("Cohort 2 PN103 duplicate enrollments merge without losing academic records", async () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-pn103-enrollment-dedup-"));
  const databaseFile = path.join(temporaryDirectory, "pn103.sqlite");
  let serverProcess;

  try {
    initializeDatabase(databaseFile);
    let database = new DatabaseSync(databaseFile);
    database.exec("PRAGMA foreign_keys = ON;");

    const student = database.prepare(`
      SELECT id, email FROM users
      WHERE role = 'student' AND cohort_name = 'Cohort 2'
      ORDER BY id LIMIT 1
    `).get();
    const admin = database.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();
    const course = database.prepare("SELECT id FROM courses WHERE slug = 'long-term-care-nursing-pn103'").get();
    const seededEnrollment = database.prepare(`
      SELECT * FROM enrollments
      WHERE user_id = ? AND course_id = ? AND status = 'active' AND withdrawn_at IS NULL
    `).get(student.id, course.id);
    assert.ok(seededEnrollment);

    database.prepare(`
      UPDATE enrollments
      SET progress = 60, final_grade = 'C', completion_date = '2026-10-03'
      WHERE id = ?
    `).run(seededEnrollment.id);
    const manualEnrollmentId = Number(database.prepare(`
      INSERT INTO enrollments (
        user_id, course_id, status, start_date, completion_date, progress,
        final_grade, source, external_order_id
      ) VALUES (?, ?, 'active', '2026-06-30', '2026-10-01', 100,
        'A', 'manual', 'pn103-established-live-row')
    `).run(student.id, course.id).lastInsertRowid);
    const replayEnrollmentId = Number(database.prepare(`
      INSERT INTO enrollments (
        user_id, course_id, status, start_date, progress, source, external_order_id
      ) VALUES (?, ?, 'active', '2026-07-02', 0, 'ghl', 'pn103-ghl-replay-order')
    `).run(student.id, course.id).lastInsertRowid);

    const lessons = database.prepare(`
      SELECT l.id
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE m.course_id = ?
      ORDER BY l.id
      LIMIT 3
    `).all(course.id);
    const gradeItems = database.prepare(`
      SELECT id FROM grade_items WHERE course_id = ? ORDER BY id LIMIT 2
    `).all(course.id);
    assert.equal(lessons.length, 3);
    assert.equal(gradeItems.length, 2);

    database.prepare(`
      INSERT INTO grades (enrollment_id, grade_item_id, score, note, updated_at)
      VALUES (?, ?, 92, 'authoritative manual grade', '2026-10-04 12:00:00')
    `).run(manualEnrollmentId, gradeItems[0].id);
    database.prepare(`
      INSERT INTO grades (enrollment_id, grade_item_id, score, note, updated_at)
      VALUES (?, ?, 65, 'older seeded grade', '2026-10-01 12:00:00')
    `).run(seededEnrollment.id, gradeItems[0].id);
    database.prepare(`
      INSERT INTO grades (enrollment_id, grade_item_id, score, note, updated_at)
      VALUES (?, ?, 77, 'seed-only grade', '2026-10-02 12:00:00')
    `).run(seededEnrollment.id, gradeItems[1].id);

    database.prepare(`
      INSERT INTO lesson_completions (enrollment_id, lesson_id, completed_at)
      VALUES (?, ?, '2026-10-03 09:00:00')
    `).run(manualEnrollmentId, lessons[0].id);
    database.prepare(`
      INSERT INTO lesson_completions (enrollment_id, lesson_id, completed_at)
      VALUES (?, ?, '2026-09-29 09:00:00')
    `).run(seededEnrollment.id, lessons[0].id);
    database.prepare(`
      INSERT INTO lesson_completions (enrollment_id, lesson_id, completed_at)
      VALUES (?, ?, '2026-10-01 09:00:00')
    `).run(seededEnrollment.id, lessons[1].id);

    const manualOverrideId = Number(database.prepare(`
      INSERT INTO exam_access_overrides (
        enrollment_id, lesson_id, opens_at, closes_at, minutes, reason, created_at
      ) VALUES (?, ?, '2026-10-03T08:00:00-04:00', '2026-10-31T23:59:59-04:00',
        60, 'current manual extension', '2026-10-03 08:00:00')
    `).run(manualEnrollmentId, lessons[0].id).lastInsertRowid);
    const seededOverrideId = Number(database.prepare(`
      INSERT INTO exam_access_overrides (
        enrollment_id, lesson_id, opens_at, closes_at, minutes, reason, created_at
      ) VALUES (?, ?, '2026-10-01T08:00:00-04:00', '2026-10-10T23:59:59-04:00',
        45, 'older seeded extension', '2026-10-01 08:00:00')
    `).run(seededEnrollment.id, lessons[0].id).lastInsertRowid);
    database.prepare(`
      INSERT INTO exam_attempts (
        enrollment_id, lesson_id, access_override_id, questions_json, question_set_hash,
        started_at, expires_at, submitted_at, status
      ) VALUES (?, ?, ?, '[{"id":"manual"}]', 'manual-hash',
        '2026-10-03 09:00:00', '2026-10-03 10:00:00', '2026-10-03 09:45:00', 'submitted')
    `).run(manualEnrollmentId, lessons[0].id, manualOverrideId);
    database.prepare(`
      INSERT INTO exam_attempts (
        enrollment_id, lesson_id, access_override_id, questions_json, question_set_hash,
        started_at, expires_at, submitted_at, status
      ) VALUES (?, ?, ?, '[{"id":"seeded"}]', 'seeded-hash',
        '2026-10-01 09:00:00', '2026-10-01 10:00:00', '2026-10-01 10:00:00', 'expired')
    `).run(seededEnrollment.id, lessons[0].id, seededOverrideId);
    database.prepare(`
      INSERT INTO exam_attempts (
        enrollment_id, lesson_id, started_at, expires_at, submitted_at, status
      ) VALUES (?, ?, '2026-10-02 09:00:00', '2026-10-02 10:00:00',
        '2026-10-02 09:50:00', 'submitted')
    `).run(seededEnrollment.id, lessons[1].id);

    database.prepare(`
      INSERT INTO quiz_attempt_history (
        enrollment_id, lesson_id, grade_item_id, attempt_number,
        score, correct_answers, total_questions, submitted_at
      ) VALUES (?, ?, ?, 5, 9, 9, 10, '2026-10-03 09:45:00')
    `).run(manualEnrollmentId, lessons[0].id, gradeItems[0].id);
    database.prepare(`
      INSERT INTO quiz_attempt_history (
        enrollment_id, lesson_id, grade_item_id, attempt_number,
        score, correct_answers, total_questions, submitted_at
      ) VALUES (?, ?, ?, 5, 6, 6, 10, '2026-10-01 10:00:00')
    `).run(seededEnrollment.id, lessons[0].id, gradeItems[0].id);
    database.prepare(`
      INSERT INTO quiz_attempt_history (
        enrollment_id, lesson_id, grade_item_id, attempt_number,
        score, correct_answers, total_questions, submitted_at
      ) VALUES (?, ?, ?, 9, 7, 7, 10, '2026-10-02 10:00:00')
    `).run(seededEnrollment.id, lessons[0].id, gradeItems[0].id);

    database.prepare(`
      INSERT INTO assignment_submissions (
        grade_item_id, enrollment_id, file_storage_name, file_original_name,
        file_mime_type, file_size, student_note, submitted_at, updated_at
      ) VALUES (?, ?, 'manual-current.txt', 'manual-current.txt', 'text/plain', 10,
        'current manual submission', '2026-10-04 08:00:00', '2026-10-04 08:00:00')
    `).run(gradeItems[0].id, manualEnrollmentId);
    database.prepare(`
      INSERT INTO assignment_submissions (
        grade_item_id, enrollment_id, file_storage_name, file_original_name,
        file_mime_type, file_size, student_note, submitted_at, updated_at
      ) VALUES (?, ?, 'seeded-old.txt', 'seeded-old.txt', 'text/plain', 10,
        'older seeded submission', '2026-10-01 08:00:00', '2026-10-01 08:00:00')
    `).run(gradeItems[0].id, seededEnrollment.id);
    database.prepare(`
      INSERT INTO assignment_submissions (
        grade_item_id, enrollment_id, file_storage_name, file_original_name,
        file_mime_type, file_size, student_note, submitted_at, updated_at
      ) VALUES (?, ?, 'seed-only.txt', 'seed-only.txt', 'text/plain', 10,
        'seed-only submission', '2026-10-02 08:00:00', '2026-10-02 08:00:00')
    `).run(gradeItems[1].id, seededEnrollment.id);

    const videoAssignmentId = Number(database.prepare(`
      INSERT INTO video_assignments (lesson_id, course_id, instructions)
      VALUES (?, ?, 'PN103 dedup regression video')
    `).run(lessons[2].id, course.id).lastInsertRowid);
    database.prepare(`
      INSERT INTO video_submissions (
        video_assignment_id, enrollment_id, file_storage_name, file_original_name,
        mime_type, file_size, student_note, submitted_at, updated_at
      ) VALUES (?, ?, 'manual-video.mp4', 'manual-video.mp4', 'video/mp4', 100,
        'current manual video', '2026-10-04 08:00:00', '2026-10-04 08:00:00')
    `).run(videoAssignmentId, manualEnrollmentId);
    database.prepare(`
      INSERT INTO video_submissions (
        video_assignment_id, enrollment_id, file_storage_name, file_original_name,
        mime_type, file_size, student_note, submitted_at, updated_at
      ) VALUES (?, ?, 'seeded-video.mp4', 'seeded-video.mp4', 'video/mp4', 90,
        'older seeded video', '2026-10-01 08:00:00', '2026-10-01 08:00:00')
    `).run(videoAssignmentId, seededEnrollment.id);

    const batchId = Number(database.prepare(`
      INSERT INTO assessment_reopen_batches (
        request_token, course_id, lesson_id, scope, requested_enrollment_id,
        closes_at, reason, affected_count
      ) VALUES ('pn103-enrollment-dedup-batch', ?, ?, 'one', ?,
        '2026-10-31T23:59:59-04:00', 'Preserve PN103 audit', 1)
    `).run(course.id, lessons[0].id, seededEnrollment.id).lastInsertRowid);
    database.prepare(`
      INSERT INTO assessment_reopen_audit (
        enrollment_id, lesson_id, grade_item_id, batch_id,
        previous_score, closes_at, reason
      ) VALUES (?, ?, ?, ?, 65, '2026-10-31T23:59:59-04:00', 'Preserve PN103 audit')
    `).run(seededEnrollment.id, lessons[0].id, gradeItems[0].id, batchId);

    database.prepare(`
      INSERT INTO attendance (enrollment_id, meeting_date, status, minutes, note)
      VALUES (?, '2026-09-01', 'present', 60, 'established manual attendance')
    `).run(manualEnrollmentId);
    database.prepare(`
      INSERT INTO attendance (enrollment_id, meeting_date, status, minutes, note)
      VALUES (?, '2026-09-20', 'present', 60, 'seed-row attendance')
    `).run(seededEnrollment.id);

    database.prepare(`
      INSERT INTO course_survey_responses (
        enrollment_id, week_number, overall_rating, instructor_rating,
        content_rating, support_rating, pace, would_recommend, learning_highlight
      ) VALUES (?, 4, 5, 5, 4, 5, 'about_right', 1, 'Preserve this survey')
    `).run(seededEnrollment.id);
    database.prepare(`
      INSERT INTO student_course_evaluations (
        enrollment_id, week_number, academic_progress, attendance_punctuality,
        professionalism, communication_teamwork, clinical_skills, overall_status,
        strengths, evaluator_id
      ) VALUES (?, 4, 4, 4, 5, 4, 4, 'satisfactory', 'Preserve this evaluation', ?)
    `).run(seededEnrollment.id, admin.id);
    database.prepare(`
      INSERT INTO student_self_evaluations (
        enrollment_id, week_number, academic_progress, attendance_punctuality,
        professionalism, communication_teamwork, clinical_skills, accomplishments
      ) VALUES (?, 4, 4, 4, 5, 4, 4, 'Preserve this self evaluation')
    `).run(seededEnrollment.id);

    database.prepare(`
      INSERT INTO credentials (enrollment_id, type, number, issued_at, issuer_name)
      VALUES (?, 'Course Completion', 'PN103-MANUAL-CREDENTIAL', '2026-10-04', 'Registrar')
    `).run(manualEnrollmentId);
    database.prepare(`
      INSERT INTO credentials (enrollment_id, type, number, issued_at, issuer_name)
      VALUES (?, 'Course Completion', 'PN103-SEED-CREDENTIAL', '2026-10-01', 'Registrar')
    `).run(seededEnrollment.id);
    database.prepare(`
      INSERT INTO messages (sender_id, recipient_id, course_id, subject, body)
      VALUES (?, ?, ?, 'PN103 progress', 'Preserve this course message')
    `).run(admin.id, student.id, course.id);

    assert.equal(database.prepare(`
      SELECT COUNT(*) AS count FROM enrollments
      WHERE user_id = ? AND course_id = ? AND status = 'active' AND withdrawn_at IS NULL
    `).get(student.id, course.id).count, 3);
    database.close();

    initializeDatabase(databaseFile);
    database = new DatabaseSync(databaseFile);
    database.exec("PRAGMA foreign_keys = ON;");

    const enrollmentRows = database.prepare(`
      SELECT id, status, start_date, completion_date, progress, final_grade
      FROM enrollments WHERE user_id = ? AND course_id = ?
    `).all(student.id, course.id).map((row) => ({ ...row }));
    const canonicalEnrollmentId = seededEnrollment.id;
    assert.deepEqual(enrollmentRows, [{
      id: canonicalEnrollmentId,
      status: "active",
      start_date: "2026-06-30",
      completion_date: "2026-10-01",
      progress: 100,
      final_grade: "A"
    }]);

    assert.deepEqual(database.prepare(`
      SELECT grade_item_id, score, note FROM grades
      WHERE enrollment_id = ? ORDER BY grade_item_id
    `).all(canonicalEnrollmentId).map((row) => ({ ...row })), [
      { grade_item_id: gradeItems[0].id, score: 92, note: "authoritative manual grade" },
      { grade_item_id: gradeItems[1].id, score: 77, note: "seed-only grade" }
    ]);
    assert.deepEqual(database.prepare(`
      SELECT lesson_id, completed_at FROM lesson_completions
      WHERE enrollment_id = ? ORDER BY lesson_id
    `).all(canonicalEnrollmentId).map((row) => ({ ...row })), [
      { lesson_id: lessons[0].id, completed_at: "2026-09-29 09:00:00" },
      { lesson_id: lessons[1].id, completed_at: "2026-10-01 09:00:00" }
    ]);

    assert.deepEqual({ ...database.prepare(`
      SELECT status, questions_json, question_set_hash, access_override_id
      FROM exam_attempts WHERE enrollment_id = ? AND lesson_id = ?
    `).get(canonicalEnrollmentId, lessons[0].id) }, {
      status: "submitted",
      questions_json: '[{"id":"manual"}]',
      question_set_hash: "manual-hash",
      access_override_id: seededOverrideId
    });
    assert.equal(database.prepare(`
      SELECT COUNT(*) AS count FROM exam_attempts
      WHERE enrollment_id = ? AND lesson_id = ?
    `).get(canonicalEnrollmentId, lessons[1].id).count, 1);
    assert.deepEqual({ ...database.prepare(`
      SELECT reason, closes_at FROM exam_access_overrides
      WHERE enrollment_id = ? AND lesson_id = ?
    `).get(canonicalEnrollmentId, lessons[0].id) }, {
      reason: "current manual extension",
      closes_at: "2026-10-31T23:59:59-04:00"
    });
    assert.deepEqual(database.prepare(`
      SELECT attempt_number, score FROM quiz_attempt_history
      WHERE enrollment_id = ? AND lesson_id = ? ORDER BY attempt_number
    `).all(canonicalEnrollmentId, lessons[0].id).map((row) => ({ ...row })), [
      { attempt_number: 1, score: 6 },
      { attempt_number: 2, score: 7 },
      { attempt_number: 3, score: 9 }
    ]);

    assert.deepEqual(database.prepare(`
      SELECT grade_item_id, student_note FROM assignment_submissions
      WHERE enrollment_id = ? ORDER BY grade_item_id
    `).all(canonicalEnrollmentId).map((row) => ({ ...row })), [
      { grade_item_id: gradeItems[0].id, student_note: "current manual submission" },
      { grade_item_id: gradeItems[1].id, student_note: "seed-only submission" }
    ]);
    assert.equal(database.prepare(`
      SELECT student_note FROM video_submissions
      WHERE enrollment_id = ? AND video_assignment_id = ?
    `).get(canonicalEnrollmentId, videoAssignmentId).student_note, "current manual video");
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM attendance WHERE enrollment_id = ?")
      .get(canonicalEnrollmentId).count, 2);
    assert.equal(database.prepare("SELECT enrollment_id FROM assessment_reopen_audit WHERE batch_id = ?")
      .get(batchId).enrollment_id, canonicalEnrollmentId);
    assert.equal(database.prepare("SELECT requested_enrollment_id FROM assessment_reopen_batches WHERE id = ?")
      .get(batchId).requested_enrollment_id, canonicalEnrollmentId);
    ["course_survey_responses", "student_course_evaluations", "student_self_evaluations"].forEach((table) => {
      assert.equal(database.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE enrollment_id = ?`)
        .get(canonicalEnrollmentId).count, 1);
    });
    assert.deepEqual(database.prepare(`
      SELECT enrollment_id, number FROM credentials
      WHERE number LIKE 'PN103-%-CREDENTIAL'
    `).all().map((row) => ({ ...row })), [
      { enrollment_id: canonicalEnrollmentId, number: "PN103-MANUAL-CREDENTIAL" }
    ]);
    assert.equal(database.prepare(`
      SELECT COUNT(*) AS count FROM messages
      WHERE recipient_id = ? AND course_id = ?
        AND subject = 'PN103 progress' AND body = 'Preserve this course message'
    `).get(student.id, course.id).count, 1);

    const archiveRows = database.prepare(`
      SELECT entity_type, payload_json FROM dedup_record_archives
      WHERE reason LIKE 'Cohort 2 PN103 duplicate%'
      ORDER BY id
    `).all().map((row) => ({ entity_type: row.entity_type, payload: JSON.parse(row.payload_json) }));
    assert.deepEqual(new Set(archiveRows.map((row) => row.entity_type)), new Set([
      "enrollments",
      "grades",
      "lesson_completions",
      "exam_access_overrides",
      "exam_attempts",
      "assignment_submissions",
      "video_submissions",
      "credentials"
    ]));
    const archivedEnrollments = archiveRows
      .filter((row) => row.entity_type === "enrollments")
      .map((row) => row.payload);
    assert.deepEqual(
      (({ status, progress, final_grade: finalGrade }) => ({ status, progress, finalGrade }))(
        archivedEnrollments.find((enrollment) => enrollment.id === manualEnrollmentId)
      ),
      { status: "active", progress: 100, finalGrade: "A" }
    );
    assert.equal(
      archivedEnrollments.find((enrollment) => enrollment.id === replayEnrollmentId).external_order_id,
      "pn103-ghl-replay-order"
    );
    assert.equal(
      archiveRows.find((row) => row.entity_type === "credentials").payload.number,
      "PN103-SEED-CREDENTIAL"
    );
    assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
    const archiveCount = archiveRows.length;
    database.close();

    initializeDatabase(databaseFile);
    database = new DatabaseSync(databaseFile);
    assert.equal(database.prepare(`
      SELECT COUNT(*) AS count FROM enrollments WHERE user_id = ? AND course_id = ?
    `).get(student.id, course.id).count, 1);
    assert.equal(database.prepare(`
      SELECT COUNT(*) AS count FROM dedup_record_archives
      WHERE reason LIKE 'Cohort 2 PN103 duplicate%'
    `).get().count, archiveCount);
    assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
    database.close();

    const port = await reservePort();
    serverProcess = spawn(process.execPath, ["--no-warnings", "src/server.js"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_FILE: databaseFile,
        NODE_ENV: "test",
        PORT: String(port),
        PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
        GHL_WEBHOOK_SECRET: "pn103-replay-secret"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    await waitForServer(serverProcess);
    const postPurchase = async (transactionId) => fetch(`http://127.0.0.1:${port}/webhooks/ghl/purchase`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-bmhi-webhook-secret": "pn103-replay-secret"
      },
      body: JSON.stringify({
        email: student.email,
        courseSlug: "long-term-care-nursing-pn103",
        transactionId
      })
    });
    const activeDistinctOrder = await postPurchase("pn103-active-distinct-order");
    assert.equal(activeDistinctOrder.status, 200);
    const activeDistinctBody = await activeDistinctOrder.json();
    assert.equal(activeDistinctBody.course.slug, "long-term-care-nursing-pn103");
    assert.equal(activeDistinctBody.enrollmentCreated, false);

    database = new DatabaseSync(databaseFile);
    database.prepare(`
      UPDATE enrollments SET status = 'completed', completion_date = '2026-10-05'
      WHERE id = ?
    `).run(canonicalEnrollmentId);
    database.close();

    let replayResponse = await postPurchase("pn103-ghl-replay-order");
    assert.equal(replayResponse.status, 200);
    const replayBody = await replayResponse.json();
    assert.equal(replayBody.course.slug, "long-term-care-nursing-pn103");
    assert.equal(replayBody.enrollmentCreated, false);
    const legitimateRepurchase = await postPurchase("pn103-legitimate-repurchase");
    assert.equal(legitimateRepurchase.status, 200);
    assert.equal((await legitimateRepurchase.json()).enrollmentCreated, true);

    const exitPromise = once(serverProcess, "exit");
    serverProcess.kill("SIGTERM");
    await exitPromise;
    serverProcess = null;

    database = new DatabaseSync(databaseFile);
    assert.equal(database.prepare(`
      SELECT COUNT(*) AS count FROM enrollments WHERE user_id = ? AND course_id = ?
    `).get(student.id, course.id).count, 2);
    assert.deepEqual(database.prepare(`
      SELECT status, external_order_id FROM enrollments
      WHERE user_id = ? AND course_id = ? ORDER BY id
    `).all(student.id, course.id).map((row) => ({ ...row })), [
      { status: "completed", external_order_id: `cohort-2-pn103-${student.id}` },
      { status: "active", external_order_id: "pn103-legitimate-repurchase" }
    ]);
    assert.equal(database.prepare(`
      SELECT status FROM webhook_events
      WHERE source = 'ghl' AND external_id = 'pn103-ghl-replay-order'
      ORDER BY id DESC LIMIT 1
    `).get().status, "processed");
    assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
    database.close();
  } finally {
    if (serverProcess && serverProcess.exitCode === null) {
      const exitPromise = once(serverProcess, "exit");
      serverProcess.kill("SIGTERM");
      await exitPromise;
    }
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});

test("Cohort 2 PN103 seed preserves an operational withdrawal", () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-pn103-withdrawal-"));
  const databaseFile = path.join(temporaryDirectory, "pn103-withdrawal.sqlite");

  try {
    initializeDatabase(databaseFile);
    let database = new DatabaseSync(databaseFile);
    const enrollment = database.prepare(`
      SELECT e.id, e.user_id, e.course_id
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      JOIN courses c ON c.id = e.course_id
      WHERE u.role = 'student' AND u.cohort_name = 'Cohort 2'
        AND c.slug = 'long-term-care-nursing-pn103'
        AND e.status = 'active' AND e.withdrawn_at IS NULL
      ORDER BY e.id LIMIT 1
    `).get();
    database.prepare(`
      UPDATE enrollments
      SET status = 'withdrawn',
        withdrawal_effective_date = '2026-10-04',
        withdrawal_reason = 'Operational withdrawal must survive startup',
        withdrawn_at = '2026-10-04 15:30:00'
      WHERE id = ?
    `).run(enrollment.id);
    database.close();

    initializeDatabase(databaseFile);
    database = new DatabaseSync(databaseFile);
    assert.deepEqual(database.prepare(`
      SELECT id, status, withdrawal_effective_date, withdrawal_reason, withdrawn_at
      FROM enrollments WHERE user_id = ? AND course_id = ?
    `).all(enrollment.user_id, enrollment.course_id).map((row) => ({ ...row })), [{
      id: enrollment.id,
      status: "withdrawn",
      withdrawal_effective_date: "2026-10-04",
      withdrawal_reason: "Operational withdrawal must survive startup",
      withdrawn_at: "2026-10-04 15:30:00"
    }]);
    assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
    database.close();
  } finally {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});
