const PN_COURSE_SLUGS = Object.freeze([
  "medical-terminology",
  "introduction-to-nursing-practical-nursing",
  "long-term-care-nursing-pn103",
  "anatomy-and-physiology"
]);

const PN_COURSEWORK_REOPEN_SEED_KEY = "reopen-regular-coursework-2026-09-22-v1";

const PN102_DISCUSSION_TITLES = Object.freeze([
  "Week 1 Discussion: Nursing Identity, Purpose, and the Practical Nurse Role",
  "Week 2 Discussion: Nursing Then and Now, Reform, Education, and Public Trust",
  "Week 3 Discussion: Caring, Comfort, Safety, Advocacy, and Healing",
  "Week 4 Discussion: Health Care Teamwork, Scope, Delegation, and Communication",
  "Week 5 Discussion: Ethics, Boundaries, Confidentiality, and Patient Rights",
  "Week 6 Discussion: Legal Foundations, Privacy, Documentation, and Accountability",
  "Week 7 Discussion: Culture, Health Equity, and Respectful Care",
  "Week 8 Discussion: Safety, Quality, Infection Prevention, and the Nurse's Watchful Eye",
  "Week 9 Discussion: Nursing Process and Clinical Judgment",
  "Week 10 Discussion: Patient Teaching, Health Promotion, and Community Impact",
  "Week 11 Discussion: Professionalism, Resilience, Leadership, and Lifelong Learning",
  "Week 12 Discussion: Nursing Today and Your Future Impact"
]);

function normalizedAssessmentTitle(title = "") {
  return String(title)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function isMidtermTitle(title = "") {
  return /\bmid[\s-]*term\b/.test(normalizedAssessmentTitle(title));
}

function isFinalExamTitle(title = "") {
  const normalized = normalizedAssessmentTitle(title);
  return /\bfinal\b/.test(normalized)
    && /\b(exam|examination|assessment|test|summative)\b/.test(normalized);
}

function isProtectedMajorAssessmentTitle(title = "") {
  const normalized = normalizedAssessmentTitle(title);
  if (/\b(review|study guide)\b/.test(normalized)) return false;
  return isMidtermTitle(title) || isFinalExamTitle(title);
}

function isCourseworkTaskDefinition(lesson = {}, gradeTitles = new Set()) {
  const title = String(lesson.title || "").trim();
  const normalizedTitle = normalizedAssessmentTitle(title);
  const itemType = String(lesson.itemType || lesson.item_type || "").toLowerCase();
  const content = String(lesson.content || "");
  return gradeTitles.has(normalizedTitle)
    || ["assignment", "discussion", "quiz", "exam"].includes(itemType)
    || /(?:QUIZ|WRITTEN_ASSIGNMENT)_DATA_BASE64:/.test(content)
    || /^Canvas item type:\s*(?:Assignment|Discussion|Quiz|Exam)\b/im.test(content);
}

function canonicalReopenableTasks(course = {}) {
  const gradeTitles = new Set((course.gradeItems || []).map((item) => normalizedAssessmentTitle(item.title)));
  const tasks = [];
  for (const module of course.modules || []) {
    for (const lesson of module.lessons || []) {
      if (!isCourseworkTaskDefinition(lesson, gradeTitles)) continue;
      if (isProtectedMajorAssessmentTitle(lesson.title)) continue;
      const moduleTitle = String(module.title || "").trim();
      const lessonTitle = String(lesson.title || "").trim();
      if (moduleTitle && lessonTitle) tasks.push({ moduleTitle, lessonTitle });
    }
  }
  return tasks.filter((task, index) => tasks.findIndex((candidate) => (
    normalizedAssessmentTitle(candidate.moduleTitle) === normalizedAssessmentTitle(task.moduleTitle)
      && normalizedAssessmentTitle(candidate.lessonTitle) === normalizedAssessmentTitle(task.lessonTitle)
  )) === index);
}

function canonicalReopenableTaskTitles(course = {}) {
  return [...new Set(canonicalReopenableTasks(course).map((task) => task.lessonTitle))];
}

module.exports = {
  PN_COURSE_SLUGS,
  PN_COURSEWORK_REOPEN_SEED_KEY,
  PN102_DISCUSSION_TITLES,
  canonicalReopenableTasks,
  canonicalReopenableTaskTitles,
  isCourseworkTaskDefinition,
  isFinalExamTitle,
  isMidtermTitle,
  isProtectedMajorAssessmentTitle,
  normalizedAssessmentTitle
};
