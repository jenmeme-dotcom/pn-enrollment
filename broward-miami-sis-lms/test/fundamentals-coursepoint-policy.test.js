const assert = require("node:assert/strict");
const { test } = require("node:test");
const { spawn } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { FUNDAMENTALS_SLUG, markCoursePointActivities, summarizeCourseGradePoints } = require("../src/courseGradePolicy");
const { PROJECT_COURSES, markCourseProjects } = require("../src/courseProjects");
const { runProjectSetup } = require("../scripts/setup-course-projects.cjs");

test("only mapped Fundamentals activity scores are excluded from category totals", () => {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(`CREATE TABLE courses(id INTEGER PRIMARY KEY,slug TEXT);
      INSERT INTO courses VALUES(11,'${FUNDAMENTALS_SLUG}'),(12,'other-course');`);
    const items = [
      { id: 1, title: "Class preparation", points_possible: 120, score: 90 },
      { id: 2, title: "CoursePoint external quiz", points_possible: 100, score: 100 },
      { id: 3, title: "Other syllabus work", points_possible: 880, score: null }
    ];
    assert.equal(summarizeCourseGradePoints(markCoursePointActivities(database, { slug: FUNDAMENTALS_SLUG }, items)).possible, 1100,
      "A title alone must not exclude an unmapped item");
    database.exec("CREATE TABLE coursepoint_import_items(course_id INTEGER,grade_item_id INTEGER); INSERT INTO coursepoint_import_items VALUES(11,2)");
    const classified = markCoursePointActivities(database, { slug: FUNDAMENTALS_SLUG }, items);
    assert.equal(classified[1].score, 100);
    const summary = summarizeCourseGradePoints(classified);
    assert.equal(summary.earned, 90);
    assert.equal(summary.possible, 1000);
    assert.equal(summary.percentage, 9);
    assert.equal(summary.requiredCount, 2);
    assert.equal(summary.gradedCount, 1);
    assert.equal(summary.supportingActivityCount, 1);
    assert.match(summary.supportingActivityNote, /instructor allocation/);
    assert.equal(summarizeCourseGradePoints(markCoursePointActivities(database, { slug: "other-course" }, items)).possible, 1100);
    assert.equal(items[1].supporting_activity, undefined, "Classification must not mutate source rows");
  } finally { database.close(); }
});

test("student, faculty, current report, and syllabus share the 1000-point Fundamentals model", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-fundamentals-policy-"));
  const databaseFile = path.join(directory, "grades.sqlite");
  const projectRoot = path.resolve(__dirname, "..");
  let server, database;
  try {
    const port = await new Promise((resolve) => {
      const socket = net.createServer();
      socket.listen(0, "127.0.0.1", () => { const port = socket.address().port; socket.close(() => resolve(port)); });
    });
    const baseUrl = `http://127.0.0.1:${port}`;
    await new Promise((resolve, reject) => {
      let output = "";
      const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${output}`)), 120000);
      server = spawn(process.execPath, ["--no-warnings", "src/server.js"], {
        cwd: projectRoot,
        env: { ...process.env, DATABASE_FILE: databaseFile, UPLOAD_DIR: path.join(directory, "uploads"), PORT: String(port), NODE_ENV: "test", EMAIL_DELIVERY_ENABLED: "false", SESSION_SECRET: "fundamentals-policy-test", PUBLIC_APP_URL: baseUrl },
        stdio: ["ignore", "pipe", "pipe"]
      });
      const read = (chunk) => { output += chunk; if (output.includes("SIS/LMS running at")) { clearTimeout(timeout); resolve(); } };
      server.stdout.on("data", read); server.stderr.on("data", read);
      server.once("error", (error) => { clearTimeout(timeout); reject(error); });
      server.once("exit", () => { clearTimeout(timeout); reject(new Error(output)); });
    });
    database = new DatabaseSync(databaseFile);
    const course = database.prepare("SELECT * FROM courses WHERE slug=?").get(FUNDAMENTALS_SLUG);
    const student = database.prepare("SELECT * FROM users WHERE email='student@browardmiamihi.com'").get();
    fs.mkdirSync(path.join(directory, "uploads"), { recursive: true });
    fs.writeFileSync(path.join(directory, "uploads", "photo.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH3cAAAAASUVORK5CYII=", "base64"));
    database.prepare("UPDATE users SET organization_status='organized',photo_storage_name='photo.png',photo_review_status='approved' WHERE id=?").run(student.id);
    const enrollmentId = database.prepare("INSERT INTO enrollments(user_id,course_id,status) VALUES(?,?,'active')").run(student.id,course.id).lastInsertRowid;
    const categoryId = database.prepare("SELECT id FROM grade_items WHERE course_id=? AND title='Class Preparation Activities'").get(course.id).id;
    database.prepare("INSERT INTO grades(enrollment_id,grade_item_id,score) VALUES(?,?,120)").run(enrollmentId,categoryId);
    const moduleId = database.prepare("INSERT INTO modules(course_id,title) VALUES(?,'Supporting CoursePoint activities')").run(course.id).lastInsertRowid;
    database.exec("CREATE TABLE coursepoint_import_items(course_id INTEGER,grade_item_id INTEGER,lesson_id INTEGER)");
    for(let i=0;i<19;i++) {
      const id = database.prepare("INSERT INTO grade_items(course_id,title,points_possible) VALUES(?,?,?)").run(course.id,`Imported CoursePoint activity ${i+1}`,i<9?100:0).lastInsertRowid;
      const lessonId = database.prepare("INSERT INTO lessons(module_id,title,content,item_type,grade_item_id) VALUES(?,?,'Submit source evidence.','assignment',?)").run(moduleId,`Imported CoursePoint activity ${i+1}`,id).lastInsertRowid;
      database.prepare("INSERT INTO coursepoint_import_items VALUES(?,?,?)").run(course.id,id,lessonId);
      if(i<9) database.prepare("INSERT INTO grades(enrollment_id,grade_item_id,score) VALUES(?,?,100)").run(enrollmentId,id);
      else database.prepare("INSERT INTO assignment_completion_statuses(enrollment_id,grade_item_id,status) VALUES(?,?,'completed')").run(enrollmentId,id);
    }
    const before = database.prepare("SELECT * FROM grades WHERE enrollment_id=? ORDER BY id").all(enrollmentId);
    const projectCourses = PROJECT_COURSES.map(({slug}) => ({slug,id:database.prepare("SELECT id FROM courses WHERE slug=?").get(slug).id}));
    const enrollmentBefore = database.prepare("SELECT * FROM enrollments ORDER BY id").all();
    const dry = await runProjectSetup({databaseFile,courses:projectCourses});
    assert.equal(dry.mode,"dry-run");assert.equal(dry.projects.length,9);
    assert.ok(dry.projects.every(project=>project.action==='create'));
    assert.equal(database.prepare("SELECT name FROM sqlite_master WHERE name='course_project_items'").get(),undefined);
    const applied = await runProjectSetup({databaseFile,courses:projectCourses,apply:true});
    assert.equal(applied.projects.length,9);assert.ok(fs.existsSync(applied.backupPath));
    const projectItems = database.prepare("SELECT gi.* FROM grade_items gi JOIN course_project_items p ON p.grade_item_id=gi.id ORDER BY gi.id").all();
    assert.equal(projectItems.length,9);
    assert.ok(projectItems.every(item=>item.points_possible===0&&item.due_date===null));
    assert.ok(markCourseProjects(database,projectItems).every(item=>item.grading_pending&&[7,9,11].includes(item.project_due_week)));
    const repeated = await runProjectSetup({databaseFile,courses:projectCourses,apply:true});
    assert.ok(repeated.projects.every(project=>project.action==='reuse'));
    assert.deepEqual(database.prepare("SELECT gi.* FROM grade_items gi JOIN course_project_items p ON p.grade_item_id=gi.id ORDER BY gi.id").all(),projectItems);
    assert.deepEqual(database.prepare("SELECT * FROM enrollments ORDER BY id").all(),enrollmentBefore);
    const login = async (email,password,role) => {
      const response = await fetch(`${baseUrl}/login`, { method:"POST",redirect:"manual",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({email,password,loginRole:role}) });
      assert.equal(response.status,302); return response.headers.getSetCookie()[0].split(";",1)[0];
    };
    const studentCookie = await login(student.email,"StudentPass123!","student");
    const adminCookie = await login("admin@browardmiamihi.com","AdminPass123!","faculty");
    const page = async (route,cookie=studentCookie) => {const response=await fetch(baseUrl+route,{headers:{cookie}});assert.equal(response.status,200);return response.text();};
    const visible = html => html.replace(/<[^>]*>/g," ").replace(/\s+/g," ");
    const grades = visible(await page(`/student/enrollments/${enrollmentId}?view=grades`));
    assert.match(grades,/PN 105/);
    assert.match(grades,/Total: 120\.00 \/ 1000\.00/);
    assert.match(grades,/Overall Percentage 12\.00%/);
    assert.match(grades,/Imported CoursePoint activity 1 Supporting CoursePoint activities Does not add extra course points 100 \/ 100/);
    assert.match(grades,/Completed/);
    const instructor = visible(await page(`/admin/courses/${course.id}/student-view?view=grades&mode=edit`,adminCookie));
    assert.match(instructor,/Demo Student 12\.00%/);
    assert.match(instructor,/Supporting activity/);
    const current = await page("/student/current-grade-report");
    const courseRow = [...current.matchAll(/<tr>[\s\S]*?<\/tr>/g)].find(([row])=>row.includes(course.title));
    assert.ok(courseRow);assert.match(visible(courseRow[0]),/120\.00 \/ 1000\.00 12\.00%/);
    const syllabus = visible(await page(`/student/enrollments/${enrollmentId}?view=syllabus`));
    assert.match(syllabus,/PN 105/);
    assert.match(syllabus,/Total course points currently listed: 1000 points/);
    assert.match(syllabus,/Category scores require instructor allocation/);
    assert.doesNotMatch(syllabus,/1900 points/);
    assert.match(syllabus,/Required Course Projects/);
    assert.match(syllabus,/Individual Presentation to Class and Instructor Week 7/);
    assert.match(syllabus,/Individual APA Paper Week 9/);
    assert.match(syllabus,/Group Project Week 11/);
    for(const project of applied.projects) {
      let selectedEnrollment = database.prepare("SELECT id FROM enrollments WHERE user_id=? AND course_id=? AND status='active'").get(student.id,project.courseId);
      if(!selectedEnrollment) selectedEnrollment={id:database.prepare("INSERT INTO enrollments(user_id,course_id,status) VALUES(?,?,'active')").run(student.id,project.courseId).lastInsertRowid};
      const detail=await page(`/student/enrollments/${selectedEnrollment.id}?assignment=${project.gradeItemId}`);
      assert.match(detail,/Grading allocation pending/);
      assert.match(detail,new RegExp(`Week ${project.dueWeek}; calendar date pending`));
      assert.match(detail,/name="studentResponse"/);assert.match(detail,/name="assignmentFile"/);
      assert.doesNotMatch(detail,/assignment-rubric-card/);
      const form=new FormData();form.set('studentResponse','Project draft for instructor review.');
      const submitted=await fetch(`${baseUrl}/student/enrollments/${selectedEnrollment.id}/assignments/${project.gradeItemId}/submit`,{method:'POST',redirect:'manual',headers:{cookie:studentCookie},body:form});
      assert.equal(submitted.status,302);
      assert.equal(database.prepare("SELECT COUNT(*) n FROM assignment_submissions WHERE enrollment_id=? AND grade_item_id=?").get(selectedEnrollment.id,project.gradeItemId).n,1);
      assert.equal(database.prepare("SELECT COUNT(*) n FROM grades WHERE enrollment_id=? AND grade_item_id=?").get(selectedEnrollment.id,project.gradeItemId).n,0);
    }
    const syllabusPdf = await fetch(`${baseUrl}/student/enrollments/${enrollmentId}/syllabus.pdf`,{headers:{cookie:studentCookie}});
    assert.equal(syllabusPdf.status,200);assert.match(syllabusPdf.headers.get("content-type"),/application\/pdf/);
    database.prepare("UPDATE enrollments SET status='completed',final_grade='B+' WHERE id=?").run(enrollmentId);
    assert.match(visible(await page(`/student/enrollments/${enrollmentId}?view=grades`)),/Letter Grade B\+/);
    assert.deepEqual(database.prepare("SELECT * FROM grades WHERE enrollment_id=? ORDER BY id").all(enrollmentId),before);
  } finally {
    database?.close();
    if(server&&server.exitCode===null) await new Promise(resolve=>{server.once("exit",resolve);server.kill("SIGTERM");});
    fs.rmSync(directory,{recursive:true,force:true});
  }
});
