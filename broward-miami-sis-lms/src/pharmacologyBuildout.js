const course = require('./pharmacologyCourseData.json');
function ensurePharmacologyCourse(db) {
  const saved = db.prepare('SELECT id FROM courses WHERE slug = ?').get(course.slug);
  if (!saved) throw new Error('PN106 catalog entry missing');
  const id = Number(saved.id);
  if (db.prepare('SELECT COUNT(*) count FROM modules WHERE course_id = ?').get(id).count > 0) return;
  db.exec('BEGIN IMMEDIATE');
  try {
  const moduleStmt = db.prepare('INSERT INTO modules (course_id, title, position, published) VALUES (?, ?, ?, 1)');
  const lessonStmt = db.prepare(`INSERT INTO lessons (module_id, title, content, duration_minutes, position, published, instructor_only, item_type, grade_item_id) VALUES (?, ?, ?, 0, ?, 1, ?, ?, ?)`);
  const gradeStmt = db.prepare('INSERT INTO grade_items (course_id, title, points_possible, due_date) VALUES (?, ?, 0, NULL)');
  const add = (moduleId, title, content, position, type = 'page', faculty = 0) => {
    const gradeId = type === 'assignment' ? Number(gradeStmt.run(id, title).lastInsertRowid) : null;
    return Number(lessonStmt.run(moduleId, title, content, position, faculty, type, gradeId).lastInsertRowid);
  };
  const orientation = Number(moduleStmt.run(id, 'Start Here: PN 106 Syllabus and Course Orientation', 1).lastInsertRowid);
  add(orientation, 'PN 106 Course Overview and Required Textbook', `${course.title}\n\n12 weeks | 90 clock hours | 60 lecture hours | 30 clinical practicum hours\nPrerequisite: ${course.prerequisite}\nFaculty: ${course.faculty}\nContact: ${course.facultyEmail} | ${course.facultyPhone}\nRequired text: ${course.textbook}\nLippincott course code listed in syllabus: ${course.lippincottCourseCode}\n\n${course.description}\n\nUse instructor-provided Lippincott access for chapter prequizzes and PrepU. Dates and assignment points will be announced by the instructor.`, 1);
  add(orientation, 'Official Syllabus: Course Outcomes and School Policies', course.syllabusText + '\n\nDownload official syllabus: /course-materials/' + course.slug + '/PN106-Syllabus-12-Weeks.pdf', 2);
  add(orientation, 'How to Complete Each Weekly Module', '1. Take the prequiz for each assigned chapter before reading.\n2. Use your results to focus your reading and complete the module learning outcomes.\n3. Complete each assigned chapter PrepU ML quiz in Lippincott.\n4. Achieve 80% or higher on EACH chapter quiz before progressing.\n5. If below 80%, reread the missed topics and submit the video remediation assignment.\n6. Complete the case studies after each chapter and reflect on your learning.\n7. Complete each module before progressing to the next.\n\nPrepU scores are recorded in the publisher platform. This portal does not automatically synchronize those scores or enforce publisher mastery. Follow the instructor’s verification process.', 3);
  add(orientation, 'Clinical Practicum: 30 Hours', 'The syllabus requires 30 clinical practicum hours in addition to 60 lecture hours. Attend the instructor-assigned clinical experiences and follow site supervision, medication administration, documentation, and confidentiality requirements. The instructor will provide dates, locations, approved activities, and competency evaluation requirements. Reading or clicking through portal lessons does not document completed clinical hours.', 4);
  add(orientation, 'Faculty Setup: Scheduling, Points, and PrepU Verification', 'Faculty setup items: enter the course start date and deadlines; confirm current Lippincott access using syllabus code 267PXIRYUC2; configure assignment points and grading weights; verify each chapter PrepU score is at least 80%; record remediation review; schedule and verify the 30 clinical hours. The syllabus refers to a grading scale but does not supply numerical course weights or exam dates. Zero-point assignment entries are temporary unweighted submission records. Do not infer course grades from them. Student enrollments are not created by this import.', 5, 'page', 1);
  for (const w of course.weeklyModules) {
    const mid = Number(moduleStmt.run(id, `Week ${w.week}: ${w.title}`, w.week + 1).lastInsertRowid);
    const label = `Chapters ${w.chapters[0]}–${w.chapters.at(-1)}`;
    add(mid, `Week ${w.week} Learning Outcomes and Readings`, `${label}\nRequired textbook: ${course.textbook}\n\nLearning outcomes from the syllabus\n${w.outcomes}`, 1);
    add(mid, `Week ${w.week} Chapter Prequizzes`, `Before reading ${label}, take the prequiz for each assigned chapter in the instructor-provided Lippincott course. Identify topics needing review and use the results to focus your learning. These diagnostic prequizzes are completed in the publisher platform.`, 2);
    add(mid, `Week ${w.week} PrepU Mastery Quizzes`, `After reading ${label}, complete the respective PrepU ML quizzes in Lippincott. You must score at least 80% on EACH chapter quiz before progressing. Review missed topics and complete video remediation if any chapter score is below 80%. Follow the instructor's process for verifying publisher quiz results.`, 3);
    add(mid, `Week ${w.week} Case Studies and Learning Reflection`, `Complete the case studies after each chapter in ${label}. Submit your responses organized by chapter number and case title. Address the case prompts using the nursing process, drug actions, relevant precautions, adverse reactions, nursing monitoring, and patient education. Conclude with a reflection on your learning before progressing to the next module. Use fictional case information and protect patient confidentiality.\n\nPoints, rubric, and deadlines will be provided by the instructor.`, 4, 'assignment');
    const instructions = `Required if any chapter PrepU quiz in ${label} is below 80%: review the assigned readings and submit a video demonstrating your understanding of the topics missed. Identify the chapter and missed concept, explain the corrected understanding, and describe its nursing implications. Do not include real patient information. The instructor reviews remediation and verifies readiness to progress. Follow instructor guidance for video length and submission deadline.`;
    const lid = add(mid, `Week ${w.week} Video Remediation`, instructions, 5, 'assignment');
    db.prepare(`INSERT INTO video_assignments (lesson_id, course_id, instructions, allow_upload, allow_recording, max_duration_seconds, max_file_size_mb) VALUES (?, ?, ?, 1, 1, 1800, 100)`).run(lid, id, instructions);
  }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
module.exports = { pharmacologyCourse: course, ensurePharmacologyCourse };
