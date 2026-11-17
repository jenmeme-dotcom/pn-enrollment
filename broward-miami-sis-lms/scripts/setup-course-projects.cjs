#!/usr/bin/env node
"use strict";

// Read-only by default. Does not import application initialization or change grades/enrollments.
// DATABASE_FILE=/data/bmhi.sqlite node scripts/setup-course-projects.cjs --manifest projects.json [--apply]
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync, backup } = require("node:sqlite");
const { PROJECT_COURSES, projectsForCourse } = require("../src/courseProjects");
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };

function validateCourses(courses) {
  requireThat(Array.isArray(courses) && courses.length === PROJECT_COURSES.length, "Review exactly PN105, PN106 and PN107 course IDs and slugs");
  requireThat(new Set(courses.map((course) => course.id)).size === courses.length, "Course IDs must be unique");
  requireThat(new Set(courses.map((course) => course.slug)).size === courses.length, "Course slugs must be unique");
  for (const course of courses) requireThat(Number.isSafeInteger(course.id) && course.id > 0 && PROJECT_COURSES.some((entry) => entry.slug === course.slug), "Unexpected course ID or slug");
}

function inspect(database, courses) {
  const hasMapping = database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='course_project_items'").get();
  return courses.flatMap((expected) => {
    const course = database.prepare("SELECT * FROM courses WHERE id=?").get(expected.id);
    requireThat(course && course.slug === expected.slug, `Course ${expected.id} does not match reviewed slug`);
    requireThat(course.published === 1, `Course ${course.id} is not published`);
    return projectsForCourse(course.slug).map((project) => {
      const mapping = hasMapping ? database.prepare("SELECT * FROM course_project_items WHERE course_id=? AND project_key=?").get(course.id, project.key) : null;
      if (mapping) {
        const linked = database.prepare(`SELECT gi.id, l.id AS lesson_id FROM grade_items gi
          JOIN lessons l ON l.grade_item_id=gi.id JOIN modules m ON m.id=l.module_id
          WHERE gi.id=? AND l.id=? AND gi.course_id=? AND m.course_id=? AND l.item_type='assignment'`)
          .get(mapping.grade_item_id,mapping.lesson_id,course.id,course.id);
        requireThat(linked && mapping.due_week === project.dueWeek, `Mapped project ${course.id}/${project.key} requires review`);
        return { ...project, courseId: course.id, gradeItemId: linked.id, lessonId: linked.lesson_id, action: "reuse" };
      }
      const candidates = database.prepare("SELECT * FROM grade_items WHERE course_id=?").all(course.id)
        .filter((item) => item.title === project.title || (project.key === "individual_presentation" ? /individual.*presentation/i.test(item.title)
          : project.key === "individual_apa_paper" ? /\bAPA\b.*paper|paper.*\bAPA\b/i.test(item.title) : /group.*project/i.test(item.title)));
      requireThat(candidates.length <= 1 && candidates.every((item) => item.title === project.title),
        `Existing possible ${project.label} in course ${course.id}; review before creating a duplicate`);
      if (candidates.length) {
        const item = candidates[0];
        const lessons = database.prepare(`SELECT l.* FROM lessons l JOIN modules m ON m.id=l.module_id
          WHERE l.grade_item_id=? AND m.course_id=?`).all(item.id,course.id);
        requireThat(lessons.length === 1 && lessons[0].item_type === "assignment" && lessons[0].title === project.title,
          `Existing project ${item.id} is not one unambiguous submission section`);
        return { ...project, courseId: course.id, gradeItemId: item.id, lessonId: lessons[0].id,
          gradingPending: Number(item.points_possible) === 0, action: "adopt" };
      }
      const orphan = database.prepare(`SELECT l.id FROM lessons l JOIN modules m ON m.id=l.module_id WHERE m.course_id=? AND l.title=?`).get(course.id,project.title);
      requireThat(!orphan, `Existing project lesson ${project.title} lacks a matching grade item; review it first`);
      return { ...project, courseId: course.id, gradeItemId: null, lessonId: null, gradingPending: true, action: "create" };
    });
  });
}

async function runProjectSetup({ databaseFile, courses, apply = false, backupDir }) {
  validateCourses(courses);
  requireThat(databaseFile && fs.existsSync(databaseFile), "An existing database file is required");
  const database = new DatabaseSync(databaseFile,{readOnly:!apply});
  database.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000");
  let transaction=false,auditDirectory;
  try {
    const plan = inspect(database,courses);
    if(!apply) return {mode:"dry-run",projects:plan};
    const root = backupDir || path.join(path.dirname(path.resolve(databaseFile)),"backups");
    fs.mkdirSync(root,{recursive:true,mode:0o700});
    auditDirectory=fs.mkdtempSync(path.join(root,"course-projects-"));fs.chmodSync(auditDirectory,0o700);
    const backupPath=path.join(auditDirectory,"before.sqlite");
    await backup(database,backupPath);fs.chmodSync(backupPath,0o600);
    const saved=new DatabaseSync(backupPath,{readOnly:true});
    try {requireThat(saved.prepare("PRAGMA quick_check").get().quick_check === "ok","Backup integrity check failed");}finally{saved.close();}
    database.exec("BEGIN IMMEDIATE");transaction=true;
    const checked=inspect(database,courses);
    fs.writeFileSync(path.join(auditDirectory,"plan.json"),JSON.stringify({courses,projects:checked},null,2),{mode:0o600});
    database.exec(`CREATE TABLE IF NOT EXISTS course_project_items (
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      project_key TEXT NOT NULL,
      grade_item_id INTEGER NOT NULL UNIQUE REFERENCES grade_items(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
      due_week INTEGER NOT NULL CHECK(due_week IN (7,9,11)),
      grading_pending INTEGER NOT NULL DEFAULT 1 CHECK(grading_pending IN (0,1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(course_id,project_key)
    )`);
    for(const project of checked) {
      if(project.action === "reuse") continue;
      if(project.action === "create") {
        const modules=database.prepare("SELECT * FROM modules WHERE course_id=? AND title='Course Projects - Weeks 7, 9 and 11'").all(project.courseId);
        requireThat(modules.length<=1,"Ambiguous project modules");
        let moduleId=modules[0]?.id;
        if(moduleId) requireThat(modules[0].published===1,"Existing project module is unpublished; preserving instructor choice");
        else {const position=database.prepare("SELECT COALESCE(MAX(position),0)+1 n FROM modules WHERE course_id=?").get(project.courseId).n;
          moduleId=database.prepare("INSERT INTO modules(course_id,title,position,published) VALUES(?,'Course Projects - Weeks 7, 9 and 11',?,1)").run(project.courseId,position).lastInsertRowid;}
        project.gradeItemId=Number(database.prepare("INSERT INTO grade_items(course_id,title,points_possible,due_date) VALUES(?,?,0,NULL)").run(project.courseId,project.title).lastInsertRowid);
        const position=database.prepare("SELECT COALESCE(MAX(position),0)+1 n FROM lessons WHERE module_id=?").get(moduleId).n;
        project.lessonId=Number(database.prepare(`INSERT INTO lessons(module_id,title,content,position,published,instructor_only,item_type,grade_item_id)
          VALUES(?,?,?,?,1,0,'assignment',?)`).run(moduleId,project.title,project.instructions,position,project.gradeItemId).lastInsertRowid);
      }
      database.prepare("INSERT INTO course_project_items(course_id,project_key,grade_item_id,lesson_id,due_week,grading_pending) VALUES(?,?,?,?,?,?)")
        .run(project.courseId,project.key,project.gradeItemId,project.lessonId,project.dueWeek,project.gradingPending?1:0);
    }
    requireThat(inspect(database,courses).every((project)=>project.action==='reuse'),"Project readback failed");
    requireThat(database.prepare("PRAGMA foreign_key_check").all().length===0,"Foreign-key check failed");
    const result={mode:"applied",auditDirectory,backupPath,projects:checked};
    fs.writeFileSync(path.join(auditDirectory,"result.json"),JSON.stringify(result,null,2),{mode:0o600});
    database.exec("COMMIT");transaction=false;return result;
  } catch(error) {
    if(transaction) database.exec("ROLLBACK");
    if(auditDirectory) fs.writeFileSync(path.join(auditDirectory,"failure.txt"),error.message,{mode:0o600});
    throw error;
  } finally {database.close();}
}

module.exports={inspect,runProjectSetup};
if(require.main===module) {
  const args=process.argv.slice(2);let manifestFile,apply=false;
  for(let i=0;i<args.length;i++) {if(args[i]==='--apply')apply=true;else if(args[i]==='--manifest')manifestFile=args[++i];else throw new Error(`Unknown argument ${args[i]}`);}
  requireThat(manifestFile,"--manifest is required (JSON with reviewed courses array)");
  runProjectSetup({databaseFile:process.env.DATABASE_FILE,courses:JSON.parse(fs.readFileSync(manifestFile,'utf8')).courses,apply})
    .then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
