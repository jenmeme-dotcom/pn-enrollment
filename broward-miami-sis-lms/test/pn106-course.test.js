const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

test('PN106 seeds the syllabus workflow and preserves submitted records on restart', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pn106-seed-test-'));
  const databaseFile = path.join(directory, 'test.sqlite');
  const seed = () => {
    const result = spawnSync(process.execPath, ['--no-warnings', 'src/seed.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, DATABASE_FILE: databaseFile }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  try {
    seed();
    let db = new DatabaseSync(databaseFile);
    const course = db.prepare('SELECT * FROM courses WHERE slug = ?').get('introductory-clinical-pharmacology-pn106');
    assert.equal(course.hours, 90);
    assert.equal(course.published, 1);
    const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position').all(course.id);
    assert.equal(modules.length, 13);
    assert.match(modules.at(-1).title, /^Week 12:/);
    const lessons = db.prepare('SELECT l.* FROM lessons l JOIN modules m ON m.id=l.module_id WHERE m.course_id = ? ORDER BY l.id').all(course.id);
    assert.equal(lessons.length, 65);
    assert.equal(lessons.filter(l => l.instructor_only).length, 1);
    assert.equal(lessons.filter(l => l.item_type === 'assignment' && l.grade_item_id).length, 24);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM video_assignments WHERE course_id = ?').get(course.id).count, 12);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM grade_items WHERE course_id = ? AND points_possible <> 0').get(course.id).count, 0);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    const student = db.prepare("SELECT id FROM users WHERE role='student' LIMIT 1").get();
    const eid = Number(db.prepare("INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)").run(student.id, course.id).lastInsertRowid);
    const assignment = lessons.find(l => /Case Studies/.test(l.title));
    db.prepare('INSERT INTO grades (enrollment_id, grade_item_id, score, note) VALUES (?, ?, 0, ?)').run(eid, assignment.grade_item_id, 'Instructor reviewed');
    db.prepare('INSERT INTO lesson_completions (enrollment_id, lesson_id) VALUES (?, ?)').run(eid, lessons[0].id);
    const originalIds = lessons.map(l => l.id);
    db.close();
    seed();
    db = new DatabaseSync(databaseFile);
    assert.deepEqual(db.prepare('SELECT l.id FROM lessons l JOIN modules m ON m.id=l.module_id WHERE m.course_id = ? ORDER BY l.id').all(course.id).map(l => l.id), originalIds);
    assert.equal(db.prepare('SELECT note FROM grades WHERE enrollment_id = ?').get(eid).note, 'Instructor reviewed');
    assert.equal(db.prepare('SELECT COUNT(*) count FROM lesson_completions WHERE enrollment_id = ?').get(eid).count, 1);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM video_assignments WHERE course_id = ?').get(course.id).count, 12);
    db.close();
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
