const fs = require("node:fs");
const path = require("node:path");
const { introNursingCourse } = require("../src/introNursingBuildout");

const rootDir = path.resolve(__dirname, "..");
const outDir = path.resolve(rootDir, "dist", "canvas", introNursingCourse.slug);
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
    <h1 style="margin:0 0 12px; color:#173f52; font-size:30px; line-height:1.2;">${escapeHtml(introNursingCourse.title)}</h1>
    <p style="margin:0 0 10px; color:#334554; font-size:15px; line-height:1.7;">${escapeHtml(introNursingCourse.description)}</p>
    <p style="margin:0; color:#526571; font-size:13px; line-height:1.7;"><strong>Course focus:</strong> Nursing history, nursing leaders, purpose of nursing, practical nurse role, ethics, legal responsibilities, professionalism, and student impact.</p>
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
    <strong style="color:#173f52;">${escapeHtml(introNursingCourse.courseNumber)}</strong> | 12 Weeks | 3 Credits | 48 Contact Hours | Practical Nursing Program
  </div>
`);

const syllabusHtml = shell(`
  <div style="padding:28px 16px 8px;">
    <h1 style="margin:0 0 12px; color:#173f52; font-size:28px;">Course Syllabus</h1>
    <p style="margin:0 0 16px; color:#334554; font-size:14px; line-height:1.7;">${escapeHtml(introNursingCourse.description)}</p>
    <h2 style="color:#173f52; font-size:22px;">Course Objectives</h2>
    <ul style="line-height:1.7; color:#334554;">${introNursingCourse.objectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <h2 style="color:#173f52; font-size:22px;">Required / Assigned Resources</h2>
    <ul style="line-height:1.7; color:#334554;">${introNursingCourse.requiredTitles.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <h2 style="color:#173f52; font-size:22px;">Assessment Plan</h2>
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <tr><th style="border-bottom:2px solid #173f52; padding:8px; text-align:left;">Grade Item</th><th style="border-bottom:2px solid #173f52; padding:8px; text-align:left;">Points</th></tr>
      ${introNursingCourse.gradeItems.map((item) => `<tr><td style="border-bottom:1px solid #d9e1e8; padding:8px;">${escapeHtml(item.title)}</td><td style="border-bottom:1px solid #d9e1e8; padding:8px;">${item.pointsPossible}</td></tr>`).join("")}
    </table>
    <h2 style="color:#173f52; font-size:22px;">Quiz, Midterm, and Final Schedule</h2>
    <p style="color:#334554; line-height:1.7;">${escapeHtml(introNursingCourse.policies.quizzes)}</p>
    <h2 style="color:#173f52; font-size:22px;">Ethical and Legal Foundation</h2>
    <p style="color:#334554; line-height:1.7;">${escapeHtml(introNursingCourse.policies.ethicsLegal)}</p>
  </div>
`);

const weeklyHtml = shell(`
  <div style="padding:28px 16px 8px;">
    <h1 style="margin:0 0 12px; color:#173f52; font-size:28px;">Weekly Course Schedule</h1>
    ${introNursingCourse.weeks.map((week) => `
      <section style="margin:0 0 22px; padding:16px; border:1px solid #d9e1e8; border-radius:7px;">
        <h2 style="margin:0 0 8px; color:#173f52; font-size:21px;">Week ${week.week}: ${escapeHtml(week.title)}</h2>
        <p style="margin:0 0 8px; color:#334554; line-height:1.6;"><strong>Focus:</strong> ${escapeHtml(week.focus)}</p>
        <p style="margin:0 0 8px; color:#334554; line-height:1.6;"><strong>Nursing leaders:</strong> ${escapeHtml(week.nursingLeaders)}</p>
        <p style="margin:0 0 8px; color:#334554; line-height:1.6;"><strong>Topics:</strong> ${week.topics.map(escapeHtml).join("; ")}.</p>
        <p style="margin:0 0 8px; color:#334554; line-height:1.6;"><strong>Activity:</strong> ${escapeHtml(week.activities)}</p>
        <p style="margin:0; color:#334554; line-height:1.6;"><strong>Assessment:</strong> ${escapeHtml(week.assessment)}</p>
      </section>`).join("")}
  </div>
`);

const moduleRows = [["Module", "Lesson", "Content"]].concat(
  introNursingCourse.modules.flatMap((module) =>
    module.lessons.map((lesson) => [module.title, lesson.title, lesson.content])
  )
);

const assignmentRows = [["Assignment", "Points", "Type", "Notes"]].concat(
  introNursingCourse.gradeItems.map((item) => [
    item.title,
    item.pointsPossible,
    item.title.includes("Quiz") || item.title.includes("Exam") ? "Quiz" : "Assignment",
    item.title.includes("Midterm")
      ? "Midterm exam covering Weeks 1-6."
      : item.title.includes("Cumulative Final")
        ? "Cumulative final exam completed in Week 12."
        : item.title.includes("Quiz 1")
          ? "Biweekly quiz covering Weeks 1-2."
          : item.title.includes("Quiz 2")
            ? "Biweekly quiz covering Weeks 3-4."
            : item.title.includes("Quiz 3")
              ? "Biweekly quiz covering Weeks 7-8."
              : item.title.includes("Quiz 4")
                ? "Biweekly quiz covering Weeks 9-10."
                : "Course assignment aligned to weekly objectives."
  ])
);

writeFile("course-home.html", homeHtml);
writeFile("course-syllabus.html", syllabusHtml);
writeFile("weekly-schedule.html", weeklyHtml);
writeFile("modules.csv", moduleRows.map((row) => row.map(csvCell).join(",")).join("\n"));
writeFile("assignments.csv", assignmentRows.map((row) => row.map(csvCell).join(",")).join("\n"));
writeFile("canvas-api-buildout.json", JSON.stringify({
  course: {
    name: introNursingCourse.title,
    course_code: introNursingCourse.courseNumber,
    license: "private",
    is_public: false
  },
  pages: [
    { title: "Course Home", published: true, front_page: true, file: "course-home.html" },
    { title: "Course Syllabus", published: true, file: "course-syllabus.html" },
    { title: "Weekly Course Schedule", published: true, file: "weekly-schedule.html" }
  ],
  modules: introNursingCourse.modules,
  assignmentGroups: introNursingCourse.gradeItems,
  notes: [
    "Replace COURSE_ID in HTML after the Canvas course is created.",
    "Apply calendar dates after the cohort start date is confirmed.",
    "Verify all legal references against current state board of nursing rules, student handbook, and clinical site policy before instruction."
  ]
}, null, 2));
writeFile("README.md", `# ${introNursingCourse.title}

Canvas buildout for a 12-week introduction to nursing course for practical nursing students.

## Course focus

- What nursing was historically and what nursing is today
- Influential nursing leaders and their impact
- The purpose and importance of nursing
- Practical nurse role, professional identity, communication, safety, and teamwork
- Ethical and legal foundations for beginning nursing students
- Student impact on patients, families, teams, and communities

## Canvas setup

1. Create a new Canvas course under the Broward-Miami account/subaccount.
2. Use \`course-home.html\`, \`course-syllabus.html\`, and \`weekly-schedule.html\` as Canvas pages.
3. Replace every \`COURSE_ID\` placeholder with the Canvas course ID.
4. Create modules from \`modules.csv\`.
5. Create assignments/quizzes from \`assignments.csv\`.
6. Set cohort-specific due dates after the cohort start date is confirmed.
7. Verify legal references against the current student handbook, state nurse practice act, board of nursing rules, and clinical site policies.

## Publish with Canvas API

Set the Canvas values in \`.env\`, then run:

\`\`\`bash
npm run publish:canvas:intro-nursing
\`\`\`

Required values:

- \`CANVAS_BASE_URL\`
- \`CANVAS_ACCESS_TOKEN\`
- \`CANVAS_ACCOUNT_ID\` for a new course, or \`CANVAS_COURSE_ID\` to update an existing course

Optional values:

- \`CANVAS_PUBLISH=true\` to publish pages, modules, assignments, and quiz shells
- \`CANVAS_SIS_COURSE_ID\` to control the Canvas SIS ID
`);

console.log(`Canvas buildout written to ${outDir}`);
