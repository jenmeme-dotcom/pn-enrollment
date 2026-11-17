"use strict";

const PROJECT_COURSES = [
  { code: "PN 105", slug: "fundamental-nursing-skills-and-concepts-new-cohort" },
  { code: "PN 106", slug: "introductory-clinical-pharmacology-pn106" },
  { code: "PN 107", slug: "medical-surgical-nursing-i-pn107" }
];
const PROJECT_GRADING_NOTE = "Grading points and category allocation are pending instructor confirmation. This submission section does not add points to the course total.";
const definitions = [
  { key: "individual_presentation", label: "Individual Presentation to Class and Instructor", dueWeek: 7,
    task: "Prepare an individual presentation and present it to the class and instructor. Submit your presentation file and any instructor-requested supporting material here. Follow the instructor's topic and presentation guidance." },
  { key: "individual_apa_paper", label: "Individual APA Paper", dueWeek: 9,
    task: "Prepare your individual paper using APA format. Submit your paper here and follow the instructor's topic, length, source, and formatting guidance. Cite the sources used in your work." },
  { key: "group_project", label: "Group Project", dueWeek: 11,
    task: "Complete the group project assigned by the instructor. Identify the group members in your submission and submit the project materials according to the instructor's group submission guidance." }
];

function projectsForCourse(slug) {
  const course = PROJECT_COURSES.find((entry) => entry.slug === slug);
  if (!course) return [];
  return definitions.map((project) => ({
    ...project,
    courseCode: course.code,
    title: `${course.code} - ${project.label} - Due Week ${project.dueWeek}`,
    instructions: `${project.label}\n\n${project.task}\n\nDue: Week ${project.dueWeek} of this course. The calendar date will be posted after the instructor confirms the course schedule.\n\n${PROJECT_GRADING_NOTE}\n\nUse the written-response field or attach a file. Do not include real patient-identifying information.`,
    gradingNote: PROJECT_GRADING_NOTE
  }));
}

function markCourseProjects(database, items = []) {
  if (!items.length || !database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='course_project_items'").get()) return items;
  const mapped = new Map(database.prepare("SELECT grade_item_id,due_week,grading_pending FROM course_project_items").all()
    .map((row) => [Number(row.grade_item_id), row]));
  return items.map((item) => {
    const project = mapped.get(Number(item.id));
    return project ? { ...item, course_project: true, project_due_week: project.due_week,
      grading_pending: Boolean(project.grading_pending) && Number(item.points_possible) === 0 } : item;
  });
}

module.exports = { PROJECT_COURSES, PROJECT_GRADING_NOTE, projectsForCourse, markCourseProjects };
