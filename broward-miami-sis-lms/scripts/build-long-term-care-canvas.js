const fs = require("node:fs");
const path = require("node:path");
const { longTermCareNursingCourse } = require("../src/longTermCareNursingBuildout");

const rootDir = path.resolve(__dirname, "..");
const outDir = path.resolve(rootDir, "dist", "canvas", longTermCareNursingCourse.slug);
fs.mkdirSync(outDir, { recursive: true });

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function csvCell(value = "") {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function writeFile(name, content) {
  fs.writeFileSync(path.join(outDir, name), content.replace(/[ \t]+$/gm, ""));
}

function shell(content) {
  return `<div style="max-width:1200px; margin:0 auto; padding:0 0 34px; background:#ffffff; color:#263746; font-family:Arial,Helvetica,sans-serif;">${content}</div>`;
}

function dateLabel(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

const homeHtml = shell(`
  <div style="padding:28px 16px 8px; border-top:10px solid #173f52;">
    <h1 style="margin:0 0 12px; color:#173f52; font-size:30px; line-height:1.2;">${escapeHtml(longTermCareNursingCourse.title)}</h1>
    <p style="margin:0 0 10px; color:#334554; font-size:15px; line-height:1.7;">${escapeHtml(longTermCareNursingCourse.description)}</p>
    <p style="margin:0; color:#526571; font-size:13px; line-height:1.7;"><strong>Course focus:</strong> Resident rights, communication, safety, infection prevention, daily care, chronic disorders, dementia, restorative care, emergencies, and end-of-life care.</p>
  </div>
  <div style="padding:20px 16px 4px;">
    <h2 style="margin:0 0 14px; padding-bottom:8px; border-bottom:3px solid #173f52; color:#173f52; font-size:23px;">Start Here</h2>
    <table role="presentation" style="width:720px; max-width:100%; margin:20px auto 0; border-collapse:separate; border-spacing:14px; table-layout:fixed;">
      <tr>
        <td style="width:25%; padding:0; vertical-align:top;"><a href="/courses/COURSE_ID/pages/course-syllabus" style="display:block; overflow:hidden; border:2px solid #173f52; border-radius:7px; text-align:center; text-decoration:none;"><span style="display:block; min-height:86px; padding:18px 8px 12px; color:#f6bd00; font-size:42px;">&#128214;</span><span style="display:block; min-height:62px; padding:13px 8px; background:#173f52; color:#ffffff; font-size:15px; font-weight:700; line-height:1.35;">Course<br/>Syllabus</span></a></td>
        <td style="width:25%; padding:0; vertical-align:top;"><a href="/courses/COURSE_ID/modules" style="display:block; overflow:hidden; border:2px solid #173f52; border-radius:7px; text-align:center; text-decoration:none;"><span style="display:block; min-height:86px; padding:18px 8px 12px; color:#f6bd00; font-size:42px;">&#129504;</span><span style="display:block; min-height:62px; padding:13px 8px; background:#173f52; color:#ffffff; font-size:15px; font-weight:700; line-height:1.35;">Learning<br/>Modules</span></a></td>
        <td style="width:25%; padding:0; vertical-align:top;"><a href="/courses/COURSE_ID/assignments" style="display:block; overflow:hidden; border:2px solid #173f52; border-radius:7px; text-align:center; text-decoration:none;"><span style="display:block; min-height:86px; padding:18px 8px 12px; color:#f6bd00; font-size:42px;">&#10003;</span><span style="display:block; min-height:62px; padding:13px 8px; background:#173f52; color:#ffffff; font-size:15px; font-weight:700; line-height:1.35;">Assignments<br/>&amp; Grades</span></a></td>
        <td style="width:25%; padding:0; vertical-align:top;"><a href="/courses/COURSE_ID/discussion_topics" style="display:block; overflow:hidden; border:2px solid #173f52; border-radius:7px; text-align:center; text-decoration:none;"><span style="display:block; min-height:86px; padding:18px 8px 12px; color:#f6bd00; font-size:42px;">&#10067;</span><span style="display:block; min-height:62px; padding:13px 8px; background:#173f52; color:#ffffff; font-size:15px; font-weight:700; line-height:1.35;">Weekly<br/>Discussions</span></a></td>
      </tr>
    </table>
  </div>
  <div style="margin:30px 16px 0; padding:15px 20px; border-top:2px solid #173f52; color:#526571; text-align:center; font-size:12px; line-height:1.6;">
    <strong style="color:#173f52;">${escapeHtml(longTermCareNursingCourse.courseNumber)}</strong> | 12 Weeks | 4 Credits | 90 Contact Hours | Practical Nursing Program
  </div>
`);

const syllabusHtml = shell(`
  <div style="padding:28px 16px 8px;">
    <h1 style="margin:0 0 12px; color:#173f52; font-size:28px;">Course Syllabus</h1>
    <p style="margin:0 0 16px; color:#334554; font-size:14px; line-height:1.7;">${escapeHtml(longTermCareNursingCourse.description)}</p>
    <h2 style="color:#173f52; font-size:22px;">Course Objectives</h2>
    <ul style="line-height:1.7; color:#334554;">${longTermCareNursingCourse.objectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <h2 style="color:#173f52; font-size:22px;">Required / Assigned Resources</h2>
    <ul style="line-height:1.7; color:#334554;">${longTermCareNursingCourse.requiredTitles.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <h2 style="color:#173f52; font-size:22px;">Assessment Plan</h2>
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <tr><th style="border-bottom:2px solid #173f52; padding:8px; text-align:left;">Grade Item</th><th style="border-bottom:2px solid #173f52; padding:8px; text-align:left;">Points</th><th style="border-bottom:2px solid #173f52; padding:8px; text-align:left;">Due</th></tr>
      ${longTermCareNursingCourse.gradeItems.map((item) => `<tr><td style="border-bottom:1px solid #d9e1e8; padding:8px;">${escapeHtml(item.title)}</td><td style="border-bottom:1px solid #d9e1e8; padding:8px;">${item.pointsPossible}</td><td style="border-bottom:1px solid #d9e1e8; padding:8px;">${item.dueDate ? escapeHtml(dateLabel(item.dueDate)) : "TBA"}</td></tr>`).join("")}
    </table>
    <h2 style="color:#173f52; font-size:22px;">Course Policies</h2>
    <p style="color:#334554; line-height:1.7;">${escapeHtml(longTermCareNursingCourse.policies.textbook)} ${escapeHtml(longTermCareNursingCourse.policies.discussions)} ${escapeHtml(longTermCareNursingCourse.policies.legal)}</p>
  </div>
`);

const weeklyHtml = shell(`
  <div style="padding:28px 16px 8px;">
    <h1 style="margin:0 0 12px; color:#173f52; font-size:28px;">Weekly Course Schedule</h1>
    ${longTermCareNursingCourse.weeks.map((week) => `
      <section style="margin:0 0 22px; padding:16px; border:1px solid #d9e1e8; border-radius:7px;">
        <h2 style="margin:0 0 8px; color:#173f52; font-size:21px;">Week ${week.week}: ${escapeHtml(week.title)}</h2>
        <p style="margin:0 0 8px; color:#334554; line-height:1.6;"><strong>Class week:</strong> ${escapeHtml(dateLabel(week.date))}</p>
        <p style="margin:0 0 8px; color:#334554; line-height:1.6;"><strong>Reading:</strong> ${escapeHtml(week.chapters)}</p>
        <p style="margin:0 0 8px; color:#334554; line-height:1.6;"><strong>Focus:</strong> ${escapeHtml(week.focus)}</p>
        <p style="margin:0 0 8px; color:#334554; line-height:1.6;"><strong>Discussion:</strong> ${escapeHtml(week.discussionTitle)}</p>
        <p style="margin:0; color:#334554; line-height:1.6;"><strong>Assignment:</strong> ${escapeHtml(week.assignmentTitle)} - due ${escapeHtml(dateLabel(week.dueDate))}</p>
      </section>`).join("")}
  </div>
`);

const moduleRows = [["Module", "Lesson", "Content"]].concat(
  longTermCareNursingCourse.modules.flatMap((module) =>
    module.lessons.map((lesson) => [module.title, lesson.title, lesson.content])
  )
);

const assignmentRows = [["Assignment", "Points", "Type", "Due Date", "Notes"]].concat(
  longTermCareNursingCourse.gradeItems.map((item) => {
    const week = longTermCareNursingCourse.weeks.find((candidate) =>
      candidate.assignmentTitle === item.title || candidate.discussionTitle === item.title
    );
    return [
      item.title,
      item.pointsPossible,
      /discussion/i.test(item.title) ? "Discussion" : /exam/i.test(item.title) ? "Quiz" : "Assignment",
      item.dueDate || "",
      week
        ? item.title === week.discussionTitle
          ? week.discussionPrompt
          : week.assignmentDescription
        : "Course assignment aligned to PN 103 objectives."
    ];
  })
);

const discussionRows = [["Title", "Points", "Due Date", "Prompt"]].concat(
  longTermCareNursingCourse.weeks.map((week) => [
    week.discussionTitle,
    10,
    week.dueDate,
    week.discussionPrompt
  ])
);

writeFile("course-home.html", homeHtml);
writeFile("course-syllabus.html", syllabusHtml);
writeFile("weekly-schedule.html", weeklyHtml);
writeFile("modules.csv", moduleRows.map((row) => row.map(csvCell).join(",")).join("\n"));
writeFile("assignments.csv", assignmentRows.map((row) => row.map(csvCell).join(",")).join("\n"));
writeFile("discussions.csv", discussionRows.map((row) => row.map(csvCell).join(",")).join("\n"));
writeFile("canvas-api-buildout.json", JSON.stringify({
  course: {
    name: longTermCareNursingCourse.title,
    course_code: longTermCareNursingCourse.courseNumber,
    license: "private",
    is_public: false
  },
  pages: [
    { title: "Course Home", published: true, front_page: true, file: "course-home.html" },
    { title: "Course Syllabus", published: true, file: "course-syllabus.html" },
    { title: "Weekly Course Schedule", published: true, file: "weekly-schedule.html" }
  ],
  modules: longTermCareNursingCourse.modules,
  assignments: longTermCareNursingCourse.gradeItems,
  discussions: longTermCareNursingCourse.weeks.map((week) => ({
    title: week.discussionTitle,
    prompt: week.discussionPrompt,
    points_possible: 10,
    due_at: `${week.dueDate}T23:59:00`
  })),
  notes: [
    "Replace COURSE_ID in HTML after the Canvas course is created.",
    "Assignments include due dates so Canvas and the local LMS calendar can display deadlines.",
    "The course intentionally uses selected important chapters from Mosby's Textbook for Long-Term Care Nursing Assistants, 8th edition instead of assigning every chapter in full.",
    "Verify all role/scope/legal references against the current student handbook, Florida practical nursing guidance, clinical site policy, and instructor expectations before instruction."
  ]
}, null, 2));
writeFile("README.md", `# ${longTermCareNursingCourse.title}

Canvas buildout for PN 103 Long-Term Care Nursing.

## Course plan

- 12 weekly modules beginning with Week 1
- Weekly discussions for Weeks 1-12
- Selected important chapters from Mosby's Textbook for Long-Term Care Nursing Assistants, 8th edition
- Assignments and exams dated from June 24, 2026 through September 9, 2026
- Due dates are included in \`assignments.csv\` and \`canvas-api-buildout.json\`

## Canvas setup

1. Create a new Canvas course under the Broward-Miami account/subaccount.
2. Use \`course-home.html\`, \`course-syllabus.html\`, and \`weekly-schedule.html\` as Canvas pages.
3. Replace every \`COURSE_ID\` placeholder with the Canvas course ID.
4. Create modules from \`modules.csv\`.
5. Create assignments/quizzes/discussions from \`assignments.csv\` and \`discussions.csv\`.
6. Review due dates if the cohort calendar changes.
7. Confirm scope, skill, and legal language against program policy and clinical-site policy before publishing.
`);

console.log(`Canvas buildout written to ${outDir}`);
