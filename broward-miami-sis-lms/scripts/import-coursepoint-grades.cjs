#!/usr/bin/env node
"use strict";

// Run with Node 24+. Never loads the application seed/initialize code.
// DATABASE_FILE=/data/bmhi.sqlite node scripts/import-coursepoint-grades.cjs manifest.json
// Add --apply only after reviewing the dry-run output. --backup-dir overrides <db-dir>/backups.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync, backup } = require("node:sqlite");

const AUTO_WITHDRAWAL = "Corrected course placement: Cohort 2 belongs in PN 103 Long-Term Care Nursing.";
const COHORT = "Cohort 2";
const MAPPING_TABLE = "coursepoint_import_items";

function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}

function nonempty(value, label) {
  requireThat(typeof value === "string" && value.trim().length > 0, `${label} must be nonempty text`);
  return value;
}

function emailKey(value) {
  nonempty(value, "Email");
  requireThat(value === value.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), `Invalid email: ${value}`);
  return value.toLowerCase();
}

function validateManifest(input) {
  requireThat(input && typeof input === "object", "A manifest object is required");
  const manifest = structuredClone(input);
  const { source, course, students, assignments, records, expectedCounts } = manifest;
  requireThat(source && course && expectedCounts, "source, course and expectedCounts are required");
  requireThat(Number.isSafeInteger(course.id) && course.id > 0, "course.id must be a positive integer");
  nonempty(course.slug, "course.slug");
  nonempty(course.title, "course.title");
  nonempty(manifest.moduleTitle, "moduleTitle");
  requireThat(/^[A-Za-z0-9_-]+$/.test(nonempty(source.spreadsheetId, "source.spreadsheetId")), "Invalid spreadsheet ID");
  const sourceUrl = new URL(nonempty(source.url, "source.url"));
  requireThat(sourceUrl.protocol === "https:" && sourceUrl.hostname === "docs.google.com"
    && sourceUrl.pathname.startsWith(`/spreadsheets/d/${source.spreadsheetId}/`), "Source URL must match the Google spreadsheet ID");
  nonempty(source.tab, "source.tab");
  requireThat(/^\d{4}-\d{2}-\d{2}$/.test(source.date) && Number.isFinite(Date.parse(source.date)), "source.date must be an ISO date");
  requireThat(Array.isArray(students) && students.length && Array.isArray(assignments) && assignments.length
    && Array.isArray(records), "students, assignments and records arrays are required");
  for (const count of ["students", "assignments", "scores", "statuses"]) {
    requireThat(Number.isSafeInteger(expectedCounts[count]) && expectedCounts[count] >= 0, `Invalid expectedCounts.${count}`);
  }
  const studentByEmail = new Map();
  for (const student of students) {
    student.email = emailKey(student.email);
    nonempty(student.sourceName, "student.sourceName");
    requireThat(!studentByEmail.has(student.email), `Duplicate student ${student.email}`);
    if (student.enrollmentId !== undefined) {
      requireThat(Number.isSafeInteger(student.enrollmentId) && student.enrollmentId > 0, "Invalid explicit enrollmentId");
    }
    studentByEmail.set(student.email, student);
  }
  const assignmentByKey = new Map();
  const titles = new Set();
  for (const assignment of assignments) {
    requireThat(/^[A-Z]{1,3}$/.test(assignment.key), "Assignment key must be its spreadsheet column");
    requireThat(!assignmentByKey.has(assignment.key), `Duplicate assignment ${assignment.key}`);
    nonempty(assignment.title, "assignment.title");
    requireThat(!titles.has(assignment.title), `Duplicate assignment title ${assignment.title}`);
    titles.add(assignment.title);
    nonempty(assignment.sourceHeader, "assignment.sourceHeader");
    nonempty(assignment.instructions, "assignment.instructions");
    requireThat(["completion", "score"].includes(assignment.kind), "Invalid assignment kind");
    requireThat(assignment.pointsPossible === (assignment.kind === "completion" ? 0 : 100),
      `Unexpected point scale for ${assignment.key}; completion is unscored and percentage scores are out of 100`);
    assignmentByKey.set(assignment.key, assignment);
  }
  const seen = new Set();
  const cells = new Set();
  const studentRows = new Map();
  let scores = 0;
  let statuses = 0;
  for (const record of records) {
    record.email = emailKey(record.email);
    requireThat(studentByEmail.has(record.email), `Record refers to an unlisted student ${record.email}`);
    const assignment = assignmentByKey.get(record.assignmentKey);
    requireThat(assignment, `Unknown assignment ${record.assignmentKey}`);
    const key = `${record.email}:${record.assignmentKey}`;
    requireThat(!seen.has(key), `Duplicate student/assignment record ${key}`);
    seen.add(key);
    const cell = /^([A-Z]{1,3})([1-9]\d*)$/.exec(record.cell);
    requireThat(cell && cell[1] === record.assignmentKey && Number(cell[2]) > 1, `Invalid source cell ${record.cell}`);
    requireThat(!cells.has(record.cell), `Source cell ${record.cell} is assigned to multiple records`);
    cells.add(record.cell);
    requireThat(!studentRows.has(record.email) || studentRows.get(record.email) === cell[2],
      `Conflicting source rows for ${record.email}`);
    studentRows.set(record.email, cell[2]);
    if (assignment.kind === "score") {
      requireThat(typeof record.score === "number" && Number.isFinite(record.score)
        && record.score >= 0 && record.score <= assignment.pointsPossible && !Object.hasOwn(record, "status"),
      `Invalid numeric score at ${record.cell}; blank and missing values must be omitted, not converted to zero`);
      scores += 1;
    } else {
      requireThat(["completed", "incomplete"].includes(record.status) && !Object.hasOwn(record, "score"),
        `Completion record at ${record.cell} must not contain a numeric score`);
      statuses += 1;
    }
  }
  const counts = { students: students.length, assignments: assignments.length, scores, statuses };
  for (const key of Object.keys(counts)) requireThat(counts[key] === expectedCounts[key], `Manifest ${key} count mismatch`);
  return manifest;
}

function tableNames(database) {
  return new Set(database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name));
}

function activityFor(database, tables, enrollmentId) {
  const counts = {};
  for (const name of ["grades", "assignment_submissions", "assignment_completion_statuses", "lesson_completions", "exam_attempts", "video_submissions"]) {
    if (tables.has(name)) counts[name] = database.prepare(`SELECT COUNT(*) AS n FROM ${name} WHERE enrollment_id = ?`).get(enrollmentId).n;
  }
  return counts;
}

function chooseEnrollment(rows, explicitId, email) {
  const active = rows.filter((row) => row.status === "active" && !row.withdrawn_at);
  const automatic = (row) => row.status === "withdrawn" && row.withdrawal_reason === AUTO_WITHDRAWAL;
  const evidenceCount = (row) => Object.values(row.record_counts).reduce((sum, n) => sum + n, 0);
  if (explicitId !== undefined) {
    const selected = rows.find((row) => row.id === explicitId);
    requireThat(selected, `Explicit enrollment ${explicitId} does not belong to ${email} and this course`);
    requireThat(active.includes(selected) || automatic(selected), `Refusing to restore a manual withdrawal or non-active enrollment for ${email}`);
    requireThat(active.every((row) => row.id === selected.id), `Another active enrollment exists for ${email}; review duplicates`);
    if (automatic(selected)) {
      requireThat(rows.every((row) => automatic(row)), `Manual or completed enrollment competes with the selected enrollment for ${email}`);
      requireThat(rows.every((row) => row.id === selected.id || evidenceCount(row) === 0), `Competing academic records exist for ${email}`);
    }
    return selected;
  }
  if (active.length === 1) return active[0];
  const candidates = active.length ? active : rows;
  if (!candidates.length) return null;
  if (!active.length) requireThat(candidates.every(automatic), `Refusing to restore a manual withdrawal or non-active enrollment for ${email}`);
  const evidenceRows = candidates.filter((row) => evidenceCount(row) > 0);
  requireThat(evidenceRows.length <= 1, `Competing academic records exist for ${email}`);
  if (evidenceRows.length === 1) return evidenceRows[0];
  requireThat(!active.length || active.length === 1, `Multiple active enrollments exist for ${email}`);
  return [...candidates].sort((left, right) => left.id - right.id)[0];
}

function recordNote(manifest, record) {
  return `CoursePoint import: ${manifest.source.spreadsheetId} | ${manifest.source.tab}!${record.cell} | ${manifest.source.date}. ${Object.hasOwn(record, "score") ? "Explicit source percentage; no derived total." : "Source completion status only; no percentage assigned."}`;
}

function inspectDatabase(database, manifest) {
  const tables = tableNames(database);
  for (const name of ["users", "courses", "modules", "lessons", "enrollments", "grade_items", "grades", "assignment_submissions", "assignment_completion_statuses"]) {
    requireThat(tables.has(name), `Missing ${name} table; deploy the assignment-completion schema before importing`);
  }
  const course = database.prepare("SELECT * FROM courses WHERE id = ?").get(manifest.course.id);
  requireThat(course && course.slug === manifest.course.slug && course.title === manifest.course.title,
    "Course ID, slug or title does not match the reviewed manifest");
  requireThat(course.published === 1, "The target course is not published");
  const students = manifest.students.map((student) => {
    const matches = database.prepare("SELECT * FROM users WHERE lower(email) = ?").all(student.email);
    requireThat(matches.length === 1, `Email does not identify exactly one student: ${student.email}`);
    const user = matches[0];
    requireThat(user.role === "student" && user.status === "active" && !user.withdrawn_at && user.cohort_name === COHORT,
      `Student ${student.email} is not an active ${COHORT} student`);
    const rows = database.prepare("SELECT * FROM enrollments WHERE user_id = ? AND course_id = ? ORDER BY id")
      .all(user.id, course.id).map((row) => ({ ...row, record_counts: activityFor(database, tables, row.id) }));
    const selected = chooseEnrollment(rows, student.enrollmentId, student.email);
    return {
      email: student.email, sourceName: student.sourceName, userId: user.id,
      enrollmentId: selected?.id ?? null,
      action: !selected ? "create" : selected.status === "active" ? "reuse" : "restore_automatic_withdrawal",
      originalEnrollments: rows
    };
  });
  const studentByEmail = new Map(students.map((student) => [student.email, student]));
  const moduleMatches = database.prepare("SELECT * FROM modules WHERE course_id = ? AND title = ?")
    .all(course.id, manifest.moduleTitle);
  requireThat(moduleMatches.length <= 1, "Multiple matching assignment modules exist; resolve them before importing");
  const module = moduleMatches[0] || null;
  if (module) requireThat(module.published === 1, "Existing import module is unpublished; refusing to override its visibility");
  const mappings = tables.has(MAPPING_TABLE)
    ? database.prepare(`SELECT * FROM ${MAPPING_TABLE} WHERE source_spreadsheet_id = ? AND source_tab = ? AND course_id = ?`)
      .all(manifest.source.spreadsheetId, manifest.source.tab, course.id) : [];
  requireThat(mappings.every((mapping) => manifest.assignments.some((assignment) => assignment.key === mapping.source_column)),
    "Manifest omits previously mapped assignments");
  const mappingsByKey = new Map(mappings.map((mapping) => [mapping.source_column, mapping]));
  const assignments = manifest.assignments.map((assignment) => {
    const mapping = mappingsByKey.get(assignment.key);
    if (!mapping) {
      requireThat(!database.prepare("SELECT 1 FROM grade_items WHERE course_id = ? AND title = ?").get(course.id, assignment.title),
        `Unmapped assignment title already exists: ${assignment.title}`);
      return { key: assignment.key, gradeItemId: null, lessonId: null, action: "create" };
    }
    const item = database.prepare("SELECT * FROM grade_items WHERE id = ?").get(mapping.grade_item_id);
    const lesson = database.prepare("SELECT * FROM lessons WHERE id = ?").get(mapping.lesson_id);
    requireThat(module && item && lesson && item.course_id === course.id && lesson.module_id === module.id
      && lesson.grade_item_id === item.id && mapping.source_header === assignment.sourceHeader
      && mapping.assignment_kind === assignment.kind && item.title === assignment.title
      && item.points_possible === assignment.pointsPossible && !item.allowed_student_email && !item.gradebook_hidden
      && lesson.title === assignment.title && lesson.content === assignment.instructions
      && lesson.item_type === "assignment" && lesson.published === 1 && lesson.instructor_only === 0
      && !lesson.allowed_student_email,
    `Existing mapped assignment differs from the reviewed manifest: ${assignment.key}`);
    return { key: assignment.key, gradeItemId: item.id, lessonId: lesson.id, action: "reuse" };
  });
  if (module) {
    const lessonIds = database.prepare("SELECT id FROM lessons WHERE module_id = ?").all(module.id).map((row) => row.id);
    requireThat(lessonIds.every((id) => mappings.some((mapping) => mapping.lesson_id === id)),
      "The matching module contains unmapped lessons; refusing to adopt unrelated content");
  }
  const assignmentByKey = new Map(assignments.map((assignment) => [assignment.key, assignment]));
  const records = manifest.records.map((record) => {
    const student = studentByEmail.get(record.email);
    const assignment = assignmentByKey.get(record.assignmentKey);
    const kind = Object.hasOwn(record, "score") ? "score" : "completion";
    let existing = null;
    if (student.enrollmentId && assignment.gradeItemId) {
      const table = kind === "score" ? "grades" : "assignment_completion_statuses";
      existing = database.prepare(`SELECT * FROM ${table} WHERE enrollment_id = ? AND grade_item_id = ?`)
        .get(student.enrollmentId, assignment.gradeItemId);
      if (existing) requireThat(existing[kind === "score" ? "score" : "status"] === record[kind === "score" ? "score" : "status"]
        && existing.note === recordNote(manifest, record), `Existing grade/status conflicts at ${record.cell} for ${record.email}`);
    }
    return { ...record, kind, action: existing ? "reuse" : "insert", originalRecord: existing };
  });
  return { courseId: course.id, moduleId: module?.id ?? null, students, assignments, records };
}

function createMappingSchema(database) {
  database.exec(`CREATE TABLE IF NOT EXISTS ${MAPPING_TABLE} (
    source_spreadsheet_id TEXT NOT NULL,
    source_tab TEXT NOT NULL,
    source_column TEXT NOT NULL,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    source_header TEXT NOT NULL,
    assignment_kind TEXT NOT NULL CHECK(assignment_kind IN ('score','completion')),
    grade_item_id INTEGER NOT NULL UNIQUE REFERENCES grade_items(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(source_spreadsheet_id,source_tab,source_column,course_id)
  )`);
}

function writePlan(database, manifest, plan) {
  createMappingSchema(database);
  for (const student of plan.students) {
    if (student.action === "create") {
      student.enrollmentId = Number(database.prepare(`INSERT INTO enrollments
        (user_id,course_id,status,start_date,source,external_order_id)
        VALUES (?,?,'active',?,'coursepoint_import',?)`).run(student.userId, manifest.course.id,
        manifest.source.date, `coursepoint:${manifest.source.spreadsheetId}:${student.userId}`).lastInsertRowid);
    } else if (student.action === "restore_automatic_withdrawal") {
      const result = database.prepare(`UPDATE enrollments SET status='active', withdrawal_effective_date=NULL,
        withdrawal_reason=NULL, withdrawn_at=NULL, withdrawn_by=NULL
        WHERE id=? AND status='withdrawn' AND withdrawal_reason=?`).run(student.enrollmentId, AUTO_WITHDRAWAL);
      requireThat(result.changes === 1, `Enrollment changed before restoration for ${student.email}`);
    }
  }
  if (!plan.moduleId) {
    const position = database.prepare("SELECT COALESCE(MAX(position),0)+1 AS next FROM modules WHERE course_id=?").get(manifest.course.id).next;
    plan.moduleId = Number(database.prepare("INSERT INTO modules(course_id,title,position,published) VALUES (?,?,?,1)")
      .run(manifest.course.id, manifest.moduleTitle, position).lastInsertRowid);
  }
  const assignmentByKey = new Map(manifest.assignments.map((assignment) => [assignment.key, assignment]));
  for (const planned of plan.assignments) {
    if (planned.action !== "create") continue;
    const assignment = assignmentByKey.get(planned.key);
    planned.gradeItemId = Number(database.prepare("INSERT INTO grade_items(course_id,title,points_possible,due_date) VALUES (?,?,?,NULL)")
      .run(manifest.course.id, assignment.title, assignment.pointsPossible).lastInsertRowid);
    const position = database.prepare("SELECT COALESCE(MAX(position),0)+1 AS next FROM lessons WHERE module_id=?").get(plan.moduleId).next;
    planned.lessonId = Number(database.prepare(`INSERT INTO lessons(module_id,title,content,position,published,instructor_only,item_type,grade_item_id)
      VALUES (?,?,?,?,1,0,'assignment',?)`).run(plan.moduleId, assignment.title, assignment.instructions, position, planned.gradeItemId).lastInsertRowid);
    database.prepare(`INSERT INTO ${MAPPING_TABLE}
      (source_spreadsheet_id,source_tab,source_column,course_id,source_header,assignment_kind,grade_item_id,lesson_id)
      VALUES (?,?,?,?,?,?,?,?)`).run(manifest.source.spreadsheetId, manifest.source.tab, assignment.key,
      manifest.course.id, assignment.sourceHeader, assignment.kind, planned.gradeItemId, planned.lessonId);
  }
  const studentByEmail = new Map(plan.students.map((student) => [student.email, student]));
  const mappedAssignments = new Map(plan.assignments.map((assignment) => [assignment.key, assignment]));
  const insertGrade = database.prepare("INSERT INTO grades(enrollment_id,grade_item_id,score,note) VALUES (?,?,?,?)");
  const insertStatus = database.prepare("INSERT INTO assignment_completion_statuses(enrollment_id,grade_item_id,status,note) VALUES (?,?,?,?)");
  for (const record of plan.records) {
    if (record.action !== "insert") continue;
    const enrollmentId = studentByEmail.get(record.email).enrollmentId;
    const itemId = mappedAssignments.get(record.assignmentKey).gradeItemId;
    const note = recordNote(manifest, record);
    if (record.kind === "score") insertGrade.run(enrollmentId, itemId, record.score, note);
    else insertStatus.run(enrollmentId, itemId, record.status, note);
  }
}

function summary(manifest, plan, applied) {
  return {
    mode: applied ? "applied" : "dry-run", source: manifest.source, course: manifest.course,
    counts: manifest.expectedCounts, moduleId: plan.moduleId,
    enrollments: plan.students.map(({ email, enrollmentId, action }) => ({ email, enrollmentId, action })),
    assignments: plan.assignments,
    newScores: plan.records.filter((record) => record.kind === "score" && record.action === "insert").length,
    newCompletionStatuses: plan.records.filter((record) => record.kind === "completion" && record.action === "insert").length
  };
}

async function runImport({ databaseFile, manifest: input, apply = false, backupDir }) {
  const manifest = validateManifest(input);
  requireThat(typeof databaseFile === "string" && fs.existsSync(databaseFile), "DATABASE_FILE must name an existing database");
  const database = new DatabaseSync(path.resolve(databaseFile), { readOnly: !apply });
  database.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000");
  let auditDirectory;
  let transaction = false;
  try {
    const initialPlan = inspectDatabase(database, manifest);
    if (!apply) return summary(manifest, initialPlan, false);
    const backupRoot = path.resolve(backupDir || path.join(path.dirname(path.resolve(databaseFile)), "backups"));
    fs.mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
    auditDirectory = fs.mkdtempSync(path.join(backupRoot, "coursepoint-grades-"));
    fs.chmodSync(auditDirectory, 0o700);
    const backupPath = path.join(auditDirectory, "before.sqlite");
    await backup(database, backupPath);
    fs.chmodSync(backupPath, 0o600);
    const manifestJson = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(path.join(auditDirectory, "manifest.json"), manifestJson, { mode: 0o600 });
    database.exec("BEGIN IMMEDIATE");
    transaction = true;
    // Revalidate under the write lock; concurrent changes cannot be overwritten.
    const plan = inspectDatabase(database, manifest);
    fs.writeFileSync(path.join(auditDirectory, "before-plan.json"), JSON.stringify({
      manifestSha256: crypto.createHash("sha256").update(manifestJson).digest("hex"), plan
    }, null, 2), { mode: 0o600 });
    writePlan(database, manifest, plan);
    const verified = inspectDatabase(database, manifest);
    requireThat(verified.students.every((student) => student.action === "reuse")
      && verified.assignments.every((assignment) => assignment.action === "reuse")
      && verified.records.every((record) => record.action === "reuse"), "Post-import readback is incomplete");
    const foreignKeyErrors = database.prepare("PRAGMA foreign_key_check").all();
    requireThat(foreignKeyErrors.length === 0, "Foreign-key verification failed; import rolled back");
    const result = { ...summary(manifest, plan, true), auditDirectory, backupPath };
    // Write audit before committing: a disk failure must not leave an unaudited mutation.
    fs.writeFileSync(path.join(auditDirectory, "result.json"), JSON.stringify(result, null, 2), { mode: 0o600 });
    database.exec("COMMIT");
    transaction = false;
    return result;
  } catch (error) {
    if (transaction) database.exec("ROLLBACK");
    if (auditDirectory) {
      try { fs.writeFileSync(path.join(auditDirectory, "failure.txt"), `${error.message}\nChanges were rolled back.\n`, { mode: 0o600 }); } catch (_) { /* Keep original failure. */ }
    }
    throw error;
  } finally {
    database.close();
  }
}

async function main(args) {
  let manifestPath;
  let apply = false;
  let backupDir;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--apply") apply = true;
    else if (argument === "--backup-dir") backupDir = args[++index];
    else if (argument === "--manifest") manifestPath = args[++index];
    else if (!argument.startsWith("-") && !manifestPath) manifestPath = argument;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  requireThat(manifestPath, "Usage: DATABASE_FILE=<path> node import-coursepoint-grades.cjs <manifest.json> [--apply] [--backup-dir <directory>]");
  const result = await runImport({ databaseFile: process.env.DATABASE_FILE,
    manifest: JSON.parse(fs.readFileSync(manifestPath, "utf8")), apply, backupDir });
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { AUTO_WITHDRAWAL, validateManifest, inspectDatabase, runImport };
if (require.main === module) main(process.argv.slice(2)).catch((error) => {
  console.error(`CoursePoint import stopped: ${error.message}`);
  process.exitCode = 1;
});
