const fs = require("node:fs");
const path = require("node:path");
const { fundamentalsCourse } = require("../src/fundamentalsBuildout");

const rootDir = path.resolve(__dirname, "..");
const outDir = path.resolve(rootDir, "dist", "canvas", fundamentalsCourse.slug);
fs.mkdirSync(outDir, { recursive: true });

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function csvCell(value = "") {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function writeFile(name, content) {
  fs.writeFileSync(path.join(outDir, name), content);
}

function shell(content) {
  return `<div style="max-width:1200px; margin:0 auto; padding:0 0 34px; background:#ffffff; color:#263746; font-family:Arial,Helvetica,sans-serif;">${content}</div>`;
}

const homeHtml = shell(`
  <div style="padding:28px 16px 8px; border-top:10px solid #173f52;">
    <h1 style="margin:0 0 12px; color:#173f52; font-size:30px; line-height:1.2;">${escapeHtml(fundamentalsCourse.title)}</h1>
    <p style="margin:0 0 10px; color:#334554; font-size:15px; line-height:1.7;">${escapeHtml(fundamentalsCourse.description)}</p>
    <p style="margin:0; color:#526571; font-size:13px; line-height:1.7;"><strong>Required products:</strong> ${fundamentalsCourse.requiredTitles.map(escapeHtml).join(" | ")}</p>
  </div>
  <div style="padding:20px 16px 4px;">
    <h2 style="margin:0 0 14px; padding-bottom:8px; border-bottom:3px solid #173f52; color:#173f52; font-size:23px;">Start Here</h2>
    <table role="presentation" style="width:720px; max-width:100%; margin:20px auto 0; border-collapse:separate; border-spacing:14px; table-layout:fixed;">
      <tr>
        <td style="width:25%; padding:0; vertical-align:top;"><a href="/courses/COURSE_ID/pages/course-syllabus" style="display:block; overflow:hidden; border:2px solid #173f52; border-radius:7px; text-align:center; text-decoration:none;"><span style="display:block; min-height:86px; padding:18px 8px 12px; color:#f6bd00; font-size:42px;">&#128214;</span><span style="display:block; min-height:62px; padding:13px 8px; background:#173f52; color:#ffffff; font-size:15px; font-weight:700; line-height:1.35;">Course<br/>Syllabus</span></a></td>
        <td style="width:25%; padding:0; vertical-align:top;"><a href="/courses/COURSE_ID/modules" style="display:block; overflow:hidden; border:2px solid #173f52; border-radius:7px; text-align:center; text-decoration:none;"><span style="display:block; min-height:86px; padding:18px 8px 12px; color:#f6bd00; font-size:42px;">&#129504;</span><span style="display:block; min-height:62px; padding:13px 8px; background:#173f52; color:#ffffff; font-size:15px; font-weight:700; line-height:1.35;">Learning<br/>Modules</span></a></td>
        <td style="width:25%; padding:0; vertical-align:top;"><a href="/courses/COURSE_ID/assignments" style="display:block; overflow:hidden; border:2px solid #173f52; border-radius:7px; text-align:center; text-decoration:none;"><span style="display:block; min-height:86px; padding:18px 8px 12px; color:#f6bd00; font-size:42px;">&#10003;</span><span style="display:block; min-height:62px; padding:13px 8px; background:#173f52; color:#ffffff; font-size:15px; font-weight:700; line-height:1.35;">Assignments<br/>&amp; Grades</span></a></td>
        <td style="width:25%; padding:0; vertical-align:top;"><a href="/courses/COURSE_ID/discussion_topics" style="display:block; overflow:hidden; border:2px solid #173f52; border-radius:7px; text-align:center; text-decoration:none;"><span style="display:block; min-height:86px; padding:18px 8px 12px; color:#f6bd00; font-size:42px;">&#10067;</span><span style="display:block; min-height:62px; padding:13px 8px; background:#173f52; color:#ffffff; font-size:15px; font-weight:700; line-height:1.35;">Course<br/>Q &amp; A</span></a></td>
      </tr>
    </table>
  </div>
  <div style="margin:30px 16px 0; padding:15px 20px; border-top:2px solid #173f52; color:#526571; text-align:center; font-size:12px; line-height:1.6;">
    <strong style="color:#173f52;">${escapeHtml(fundamentalsCourse.courseNumber)}</strong> | 12 Weeks | 6 Credits | 153 Contact Hours | Wolters Kluwer CoursePoint, vSim, and Lippincott Client Cases
  </div>
`);

const syllabusHtml = shell(`
  <div style="padding:28px 16px 8px;">
    <h1 style="margin:0 0 12px; color:#173f52; font-size:28px;">Course Syllabus</h1>
    <p style="margin:0 0 16px; color:#334554; font-size:14px; line-height:1.7;">${escapeHtml(fundamentalsCourse.description)}</p>
    <h2 style="color:#173f52; font-size:22px;">Course Objectives</h2>
    <ul style="line-height:1.7; color:#334554;">${fundamentalsCourse.objectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <h2 style="color:#173f52; font-size:22px;">Required Titles</h2>
    <ul style="line-height:1.7; color:#334554;">${fundamentalsCourse.requiredTitles.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <h2 style="color:#173f52; font-size:22px;">Grading</h2>
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <tr><th style="border-bottom:2px solid #173f52; padding:8px; text-align:left;">Grade Item</th><th style="border-bottom:2px solid #173f52; padding:8px; text-align:left;">Points</th></tr>
      ${fundamentalsCourse.gradeItems.map((item) => `<tr><td style="border-bottom:1px solid #d9e1e8; padding:8px;">${escapeHtml(item.title)}</td><td style="border-bottom:1px solid #d9e1e8; padding:8px;">${item.pointsPossible}</td></tr>`).join("")}
    </table>
    <h2 style="color:#173f52; font-size:22px;">Mastery and Remediation</h2>
    <p style="color:#334554; line-height:1.7;">${escapeHtml(fundamentalsCourse.policies.preparation)} ${escapeHtml(fundamentalsCourse.policies.followUp)} ${escapeHtml(fundamentalsCourse.policies.threshold)}</p>
  </div>
`);

const weeklyHtml = shell(`
  <div style="padding:28px 16px 8px;">
    <h1 style="margin:0 0 12px; color:#173f52; font-size:28px;">Weekly Course Schedule</h1>
    ${fundamentalsCourse.weeks.map((week) => `
      <section style="margin:0 0 22px; padding:16px; border:1px solid #d9e1e8; border-radius:7px;">
        <h2 style="margin:0 0 8px; color:#173f52; font-size:21px;">Week ${week.week}: ${escapeHtml(week.classroom)}</h2>
        <p style="margin:0 0 8px; color:#334554; line-height:1.6;"><strong>Chapters:</strong> ${escapeHtml(week.chapters)}</p>
        <p style="margin:0 0 8px; color:#334554; line-height:1.6;"><strong>Pre-class:</strong> ${escapeHtml(week.preClass)}</p>
        <p style="margin:0 0 8px; color:#334554; line-height:1.6;"><strong>During/Post-class:</strong> ${escapeHtml(week.inClass)}</p>
        <p style="margin:0; color:#334554; line-height:1.6;"><strong>Clinical Lab:</strong> ${escapeHtml(week.labActivities)}</p>
      </section>`).join("")}
  </div>
`);

const moduleRows = [["Module", "Lesson", "Content"]].concat(
  fundamentalsCourse.modules.flatMap((module) =>
    module.lessons.map((lesson) => [module.title, lesson.title, lesson.content])
  )
);

const assignmentRows = [["Assignment", "Points", "Type", "Notes"]].concat([
  ...fundamentalsCourse.weeks.map((week) => [
    `Week ${week.week} Class Preparation`,
    10,
    "Assignment",
    week.preClass
  ]),
  ...fundamentalsCourse.weeks.map((week) => [
    `Week ${week.week} Class Follow-up`,
    15,
    "Assignment",
    week.inClass
  ]),
  ...fundamentalsCourse.weeks
    .filter((week) => week.clinicalPoints > 0)
    .map((week) => [
      `Week ${week.week} Clinical Preparation and Performance`,
      week.clinicalPoints,
      "Assignment",
      week.labActivities
    ]),
  ["Midterm Summative Exam", 150, "Quiz", "Week 7 summative exam."],
  ["Cumulative Final Exam", 200, "Quiz", "Week 12 cumulative final exam."],
  ["Clinical Performance Evaluation", 0, "No Submission", fundamentalsCourse.policies.clinical]
]);

writeFile("course-home.html", homeHtml);
writeFile("course-syllabus.html", syllabusHtml);
writeFile("weekly-schedule.html", weeklyHtml);
writeFile("modules.csv", moduleRows.map((row) => row.map(csvCell).join(",")).join("\n"));
writeFile("assignments.csv", assignmentRows.map((row) => row.map(csvCell).join(",")).join("\n"));
writeFile("canvas-api-buildout.json", JSON.stringify({
  course: {
    name: fundamentalsCourse.title,
    course_code: fundamentalsCourse.courseNumber,
    license: "private",
    is_public: false
  },
  pages: [
    { title: "Course Home", published: true, front_page: true, file: "course-home.html" },
    { title: "Course Syllabus", published: true, file: "course-syllabus.html" },
    { title: "Weekly Course Schedule", published: true, file: "weekly-schedule.html" }
  ],
  modules: fundamentalsCourse.modules,
  assignmentGroups: fundamentalsCourse.gradeItems,
  notes: [
    "Replace COURSE_ID in HTML after the Canvas course is created.",
    "Add Wolters Kluwer LTI/external tool launch links from the institution's WK integration.",
    "Apply calendar dates after the new cohort start date is confirmed."
  ]
}, null, 2));
writeFile("README.md", `# ${fundamentalsCourse.title}

Canvas buildout generated from the Wolters Kluwer model syllabus:

- CoursePoint for Donnelly-Moreno, Timby's Fundamental Nursing Skills and Concepts, 13th ed.
- vSim for LPN/LVN
- Lippincott Client Cases for Clinical Judgment

## Canvas setup

1. Create a new Canvas course under the Broward-Miami account/subaccount.
2. Use \`course-home.html\`, \`course-syllabus.html\`, and \`weekly-schedule.html\` as Canvas pages.
3. Replace every \`COURSE_ID\` placeholder with the Canvas course ID.
4. Create modules from \`modules.csv\`.
5. Create assignments/quizzes from \`assignments.csv\`.
6. Add Wolters Kluwer LTI/external tool links after the institution-specific WK links are available.
7. Set cohort-specific due dates after the cohort start date is confirmed.
`);

console.log(`Canvas buildout written to ${outDir}`);
