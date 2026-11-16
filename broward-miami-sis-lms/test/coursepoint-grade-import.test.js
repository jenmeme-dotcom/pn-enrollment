const assert = require("node:assert/strict");
const { test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { AUTO_WITHDRAWAL, validateManifest, runImport } = require("../scripts/import-coursepoint-grades.cjs");

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-coursepoint-import-"));
  const databaseFile = path.join(directory, "grades.sqlite");
  const database = new DatabaseSync(databaseFile);
  database.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE users(id INTEGER PRIMARY KEY, role TEXT, email TEXT UNIQUE, first_name TEXT, last_name TEXT,
      status TEXT, cohort_name TEXT, withdrawn_at TEXT);
    CREATE TABLE courses(id INTEGER PRIMARY KEY, title TEXT, slug TEXT, published INTEGER);
    CREATE TABLE modules(id INTEGER PRIMARY KEY, course_id INTEGER REFERENCES courses(id), title TEXT, position INTEGER, published INTEGER);
    CREATE TABLE enrollments(id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), course_id INTEGER REFERENCES courses(id),
      status TEXT, withdrawal_effective_date TEXT, withdrawal_reason TEXT, withdrawn_at TEXT, withdrawn_by INTEGER,
      start_date TEXT, completion_date TEXT, progress INTEGER DEFAULT 0, final_grade TEXT, source TEXT, external_order_id TEXT);
    CREATE TABLE grade_items(id INTEGER PRIMARY KEY,course_id INTEGER REFERENCES courses(id), title TEXT, points_possible REAL,
      due_date TEXT,allowed_student_email TEXT,gradebook_hidden INTEGER DEFAULT 0);
    CREATE TABLE lessons(id INTEGER PRIMARY KEY,module_id INTEGER REFERENCES modules(id),title TEXT,content TEXT,
      position INTEGER,published INTEGER,instructor_only INTEGER,item_type TEXT,grade_item_id INTEGER REFERENCES grade_items(id),allowed_student_email TEXT);
    CREATE TABLE grades(id INTEGER PRIMARY KEY,enrollment_id INTEGER REFERENCES enrollments(id),grade_item_id INTEGER REFERENCES grade_items(id),
      score REAL,note TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(enrollment_id,grade_item_id));
    CREATE TABLE assignment_completion_statuses(enrollment_id INTEGER REFERENCES enrollments(id),grade_item_id INTEGER REFERENCES grade_items(id),
      status TEXT CHECK(status IN ('completed','incomplete')),note TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(enrollment_id,grade_item_id));
    CREATE TABLE assignment_submissions(id INTEGER PRIMARY KEY,enrollment_id INTEGER REFERENCES enrollments(id),grade_item_id INTEGER REFERENCES grade_items(id),student_note TEXT);
    CREATE TABLE messages(id INTEGER PRIMARY KEY, body TEXT);
    INSERT INTO users VALUES(1,'student','alice@example.com','Alice','One','active','Cohort 2',NULL);
    INSERT INTO users VALUES(2,'student','bob@example.com','Bob','Two','active','Cohort 2',NULL);
    INSERT INTO users VALUES(3,'student','carol@example.com','Carol','Three','active','Cohort 1',NULL);
    INSERT INTO users VALUES(4,'student','withdrawn@example.com','Withdrawn','Four','withdrawn','Cohort 2','2026-10-05');
    INSERT INTO courses VALUES(11,'Fundamentals - Cohort 2','fundamentals',1);
    INSERT INTO courses VALUES(12,'Other course','other',1);
    INSERT INTO enrollments(id,user_id,course_id,status,withdrawal_reason,withdrawn_at,progress,final_grade,source)
      VALUES(10,1,11,'withdrawn','${AUTO_WITHDRAWAL}','2026-09-03',40,'B','cohort_seed');
    INSERT INTO enrollments(id,user_id,course_id,status,withdrawal_reason,withdrawn_at,source)
      VALUES(20,1,11,'withdrawn','${AUTO_WITHDRAWAL}','2026-10-03','cohort_seed');
    INSERT INTO enrollments(id,user_id,course_id,status,final_grade,source) VALUES(30,1,12,'active','A','manual');
    INSERT INTO enrollments(id,user_id,course_id,status,source) VALUES(40,3,11,'active','manual');
    INSERT INTO enrollments(id,user_id,course_id,status,withdrawal_reason,withdrawn_at,source)
      VALUES(50,4,11,'withdrawn','Student requested withdrawal','2026-10-05','manual');
    INSERT INTO grade_items VALUES(100,11,'Prior graded work',100,NULL,NULL,0);
    INSERT INTO grade_items VALUES(101,12,'Other course work',100,NULL,NULL,0);
    INSERT INTO grades(enrollment_id,grade_item_id,score,note) VALUES(10,100,88,'Prior grade');
    INSERT INTO grades(enrollment_id,grade_item_id,score,note) VALUES(30,101,99,'Other course grade');
    INSERT INTO grades(enrollment_id,grade_item_id,score,note) VALUES(40,100,75,'Other cohort grade');
    INSERT INTO assignment_submissions VALUES(1,10,100,'Prior student submission');
    INSERT INTO messages VALUES(1,'Unrelated message');
  `);
  database.close();
  const manifest = {
    source: { spreadsheetId: "test-book", url: "https://docs.google.com/spreadsheets/d/test-book/edit", tab: "Grades", date: "2026-11-16" },
    course: { id: 11, slug: "fundamentals", title: "Fundamentals - Cohort 2" },
    moduleTitle: "Cohort 2 - Imported CoursePoint assignments",
    students: [{ email: "alice@example.com", sourceName: "Alice One" }, { email: "bob@example.com", sourceName: "Bob Two" }],
    assignments: [
      { key: "C", title: "PrepU - Chapter 1", sourceHeader: "PrepU Chapter 1", kind: "completion", pointsPossible: 0, instructions: "Submit your completion evidence." },
      { key: "D", title: "Client Case", sourceHeader: "Client Case", kind: "score", pointsPossible: 100, instructions: "Submit your case result." }
    ],
    records: [
      { email: "alice@example.com", assignmentKey: "C", cell: "C2", status: "completed" },
      { email: "bob@example.com", assignmentKey: "C", cell: "C3", status: "incomplete" },
      { email: "alice@example.com", assignmentKey: "D", cell: "D2", score: 0 }
    ],
    expectedCounts: { students: 2, assignments: 2, scores: 1, statuses: 2 }
  };
  return { directory, databaseFile, manifest,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }) };
}

function read(databaseFile, fn) {
  const database = new DatabaseSync(databaseFile, { readOnly: true });
  try { return fn(database); } finally { database.close(); }
}

function change(databaseFile, sql) {
  const database = new DatabaseSync(databaseFile);
  try { database.exec(sql); } finally { database.close(); }
}

function snapshot(databaseFile) {
  return read(databaseFile, (database) => {
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    return tables.map(({ name }) => [name, database.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all()]);
  });
}

test("dry run never mutates; apply preserves old records, distinguishes zero from blank, and is idempotent", async () => {
  const f = fixture();
  try {
    const before = snapshot(f.databaseFile);
    const dry = await runImport(f);
    assert.equal(dry.mode, "dry-run");
    assert.equal(dry.enrollments[0].enrollmentId, 10, "select evidence-bearing original enrollment");
    assert.deepEqual(snapshot(f.databaseFile), before);
    assert.equal(fs.existsSync(path.join(f.directory, "backups")), false);
    const applied = await runImport({ ...f, apply: true });
    assert.equal(applied.newScores, 1);
    assert.equal(applied.newCompletionStatuses, 2);
    assert.ok(fs.existsSync(applied.backupPath));
    assert.deepEqual(snapshot(applied.backupPath), before, "backup represents the untouched database");
    const audit = JSON.parse(fs.readFileSync(path.join(applied.auditDirectory, "before-plan.json"), "utf8"));
    assert.equal(audit.plan.students[0].originalEnrollments.length, 2);
    assert.equal(audit.plan.students[0].originalEnrollments[0].final_grade, "B");
    read(f.databaseFile, (database) => {
      const enrollment = database.prepare("SELECT * FROM enrollments WHERE id=10").get();
      assert.equal(enrollment.status, "active");
      assert.equal(enrollment.withdrawn_at, null);
      assert.equal(enrollment.final_grade, "B");
      assert.equal(enrollment.progress, 40);
      assert.equal(database.prepare("SELECT status FROM enrollments WHERE id=20").get().status, "withdrawn");
      assert.equal(database.prepare("SELECT status FROM enrollments WHERE id=50").get().status, "withdrawn");
      assert.equal(database.prepare("SELECT COUNT(*) n FROM assignment_submissions").get().n, 1);
      assert.equal(database.prepare("SELECT COUNT(*) n FROM messages").get().n, 1);
      assert.equal(database.prepare("SELECT score FROM grades WHERE enrollment_id=30 AND grade_item_id=101").get().score, 99);
      const mapped = database.prepare("SELECT * FROM coursepoint_import_items WHERE source_column='D'").get();
      assert.equal(database.prepare("SELECT score FROM grades WHERE enrollment_id=10 AND grade_item_id=?").get(mapped.grade_item_id).score, 0);
      const bobId = applied.enrollments[1].enrollmentId;
      assert.equal(database.prepare("SELECT * FROM grades WHERE enrollment_id=? AND grade_item_id=?").get(bobId, mapped.grade_item_id), undefined,
        "missing source score must stay ungraded");
      const completion = database.prepare("SELECT * FROM coursepoint_import_items WHERE source_column='C'").get();
      assert.equal(database.prepare("SELECT COUNT(*) n FROM grades WHERE grade_item_id=?").get(completion.grade_item_id).n, 0,
        "completion is not a fabricated zero or hundred");
    });
    const after = snapshot(f.databaseFile);
    const again = await runImport({ ...f, apply: true });
    assert.equal(again.newScores, 0);
    assert.equal(again.newCompletionStatuses, 0);
    assert.deepEqual(snapshot(f.databaseFile), after, "rerun does not overwrite notes or timestamps");
  } finally { f.cleanup(); }
});

test("manifest rejects duplicate, missing, nonnumeric, inconsistent and out-of-range records", () => {
  const f = fixture();
  try {
    for (const score of [null, "", "0", NaN, -1, 101, Infinity]) {
      const manifest = structuredClone(f.manifest);
      manifest.records[2].score = score;
      assert.throws(() => validateManifest(manifest), /Invalid numeric score/);
    }
    const duplicate = structuredClone(f.manifest);
    duplicate.records.push(duplicate.records[0]);
    assert.throws(() => validateManifest(duplicate), /Duplicate student\/assignment/);
    const mismatch = structuredClone(f.manifest);
    mismatch.expectedCounts.scores = 2;
    assert.throws(() => validateManifest(mismatch), /count mismatch/);
    const rows = structuredClone(f.manifest);
    rows.records[2].cell = "D9";
    assert.throws(() => validateManifest(rows), /Conflicting source rows/);
  } finally { f.cleanup(); }
});

test("wrong course, out-of-cohort student, school withdrawal and manual enrollment withdrawal are refused", async () => {
  for (const scenario of ["course", "cohort", "school", "manual"]) {
    const f = fixture();
    try {
      if (scenario === "course") f.manifest.course.slug = "different";
      if (scenario === "cohort") change(f.databaseFile, "UPDATE users SET cohort_name='Cohort 1' WHERE id=1");
      if (scenario === "school") change(f.databaseFile, "UPDATE users SET status='withdrawn' WHERE id=1");
      if (scenario === "manual") change(f.databaseFile, "UPDATE enrollments SET withdrawal_reason='Student requested withdrawal' WHERE id=10");
      const before = snapshot(f.databaseFile);
      await assert.rejects(runImport({ ...f, apply: true }), /does not match|not an active|manual withdrawal|non-active enrollment/);
      assert.deepEqual(snapshot(f.databaseFile), before);
    } finally { f.cleanup(); }
  }
});

test("explicit enrollment selection is validated and competing historical academic records are refused", async () => {
  const f = fixture();
  try {
    f.manifest.students[0].enrollmentId = 30;
    await assert.rejects(runImport(f), /does not belong/);
    f.manifest.students[0].enrollmentId = 20;
    await assert.rejects(runImport(f), /Competing academic records/);
    f.manifest.students[0].enrollmentId = 10;
    assert.equal((await runImport(f)).enrollments[0].enrollmentId, 10);
    change(f.databaseFile, "INSERT INTO grades(enrollment_id,grade_item_id,score,note) VALUES(20,100,93,'Another recorded grade')");
    await assert.rejects(runImport(f), /Competing academic records/);
  } finally { f.cleanup(); }
});

test("existing conflicting grades and statuses are preserved, including when the source is changed", async () => {
  const f = fixture();
  try {
    await runImport({ ...f, apply: true });
    const before = snapshot(f.databaseFile);
    f.manifest.records[2].score = 50;
    await assert.rejects(runImport({ ...f, apply: true }), /conflicts/);
    assert.deepEqual(snapshot(f.databaseFile), before);
    f.manifest.records[2].score = 0;
    f.manifest.records[0].status = "incomplete";
    await assert.rejects(runImport({ ...f, apply: true }), /conflicts/);
    assert.deepEqual(snapshot(f.databaseFile), before);
  } finally { f.cleanup(); }
});

test("a late database failure rolls back enrollments, assignments, completion statuses and grades", async () => {
  const f = fixture();
  try {
    change(f.databaseFile, `CREATE TRIGGER reject_import_grade BEFORE INSERT ON grades
      WHEN NEW.note LIKE 'CoursePoint import:%' BEGIN SELECT RAISE(ABORT,'intentional test failure'); END;`);
    const before = snapshot(f.databaseFile);
    await assert.rejects(runImport({ ...f, apply: true }), /intentional test failure/);
    assert.deepEqual(snapshot(f.databaseFile), before);
    const dirs = fs.readdirSync(path.join(f.directory, "backups"));
    assert.equal(dirs.length, 1);
    assert.match(fs.readFileSync(path.join(f.directory, "backups", dirs[0], "failure.txt"), "utf8"), /rolled back/);
  } finally { f.cleanup(); }
});
