const materialBase = "/course-materials/medical-terminology";
const { chapterQuestionBanks } = require("./medicalTerminologyQuestionBank");

function materialHref(fileName) {
  return `${materialBase}/${encodeURIComponent(fileName)}`;
}

function itemLesson(type, title, { files = [], note = "", minutes = 35, externalUrl = null } = {}) {
  const fileText = files.length
    ? `\n\nCourse file${files.length === 1 ? "" : "s"}:\n${files.map((file) => `- ${file}: ${materialHref(file)}`).join("\n")}`
    : "";
  return {
    title,
    durationMinutes: minutes,
    externalUrl,
    content: `Canvas item type: ${type}.${note ? `\n\n${note}` : ""}${fileText}`
  };
}

const courseDescription =
  "This PN 101 course introduces the language of healthcare through word roots, prefixes, suffixes, and combining forms. Students apply terminology to body systems, diseases, diagnostic procedures, treatments, pharmacology, clinical documentation, and practical nursing communication.";

const courseObjectives = [
  "Identify and define common medical word parts.",
  "Build and analyze medical terms associated with major body systems.",
  "Spell, pronounce, and use terminology accurately.",
  "Interpret common healthcare abbreviations and symbols.",
  "Apply terminology to patient-care scenarios and clinical documentation.",
  "Connect terminology to anatomy, physiology, pharmacology, and practical nursing practice."
];

const chapterQuizQuestions = Object.fromEntries(
  Array.from({ length: 22 }, (_, index) => [index + 1, chapterQuestionBanks[index + 1].slice(0, 10)])
);
const midtermOneQuestions = Array.from({ length: 12 }, (_, index) => index + 1)
  .flatMap((chapter) => chapterQuestionBanks[chapter].slice(10, 12));
const midtermTwoQuestions = Array.from({ length: 10 }, (_, index) => index + 13)
  .flatMap((chapter) => chapterQuestionBanks[chapter].slice(10, 12));
const finalExamQuestions = Array.from({ length: 22 }, (_, index) => index + 1)
  .flatMap((chapter) => chapterQuestionBanks[chapter].slice(12, 14));

function quizNote(label, questions) {
  return `${label} Multiple-choice questions only.\n\nQUIZ_DATA_BASE64:${Buffer.from(JSON.stringify(questions)).toString("base64")}`;
}

const chapterQuizTitles = {
  1: "[PN101 2026] Quiz 1 - Chapter 1 Word Structure",
  2: "[PN101 2026] Quiz 2 - Chapter 2 Body Organization and Oncology",
  3: "[PN101 2026] Quiz 3 - Chapter 3 Suffixes",
  4: "[PN101 2026] Quiz 4 - Chapter 4 Prefixes",
  5: "[PN101 2026] Quiz 5 - Chapter 5 Digestive System",
  6: "[PN101 2026] Quiz 6 - Chapter 6 Urinary System",
  7: "[PN101 2026] Quiz 7 - Chapter 7 Female Reproductive System",
  8: "[PN101 2026] Quiz 8 - Chapter 8 Male Reproductive System",
  9: "[PN101 2026] Quiz 9 - Chapter 9 Nervous System",
  10: "[PN101 2026] Quiz 10 - Chapter 10 Cardiovascular System"
};

function chapterQuizTitle(chapter) {
  return chapterQuizTitles[chapter] || `[PN101 2026] Quiz ${chapter} - Chapter ${chapter} Review`;
}

function chapterLessons(chapters) {
  return chapters.flatMap((chapter) => {
    const fileName = `Chapter_${String(chapter).padStart(3, "0")}.pptx`;
    return [
      itemLesson("Attachment", fileName, { files: [fileName] }),
      itemLesson("Quiz", chapterQuizTitle(chapter), {
        note: quizNote(`Chapter ${chapter} assessment supplied by BMHI.`, chapterQuizQuestions[chapter]),
        minutes: 30
      })
    ];
  });
}

const weeklyPlan = [
  { week: 1, title: "Orientation and Foundations", date: "Jun 24", chapters: [1, 2], focus: "Chapters 1–2: Basic Word Structure; Body Organization and Oncology", dueDate: "2026-07-01" },
  { week: 2, title: "Suffixes and Prefixes", date: "Jul 1", chapters: [3, 4], focus: "Chapters 3–4: Suffixes and Prefixes", dueDate: "2026-07-08" },
  { week: 3, title: "Digestive and Urinary Systems", date: "Jul 8", chapters: [5, 6], focus: "Chapters 5–6: Digestive and Urinary Systems", dueDate: "2026-07-15" },
  { week: 4, title: "Reproductive Systems", date: "Jul 15", chapters: [7, 8], focus: "Chapters 7–8: Female and Male Reproductive Systems", dueDate: "2026-07-22" },
  { week: 5, title: "Nervous and Cardiovascular Systems", date: "Jul 22", chapters: [9, 10], focus: "Chapters 9–10: Nervous and Cardiovascular Systems", dueDate: "2026-07-29" },
  { week: 6, title: "Blood, Lymphatic, and Midterm 1", date: "Jul 29", chapters: [11, 12], focus: "Chapters 11–12 and Midterm 1 review for Chapters 1–12", dueDate: "2026-08-05" },
  { week: 7, title: "Body Systems I", date: "Aug 5", chapters: [13, 14], focus: "Chapters 13–14 body-system terminology", dueDate: "2026-08-12" },
  { week: 8, title: "Body Systems II", date: "Aug 12", chapters: [15, 16], focus: "Chapters 15–16 body-system terminology", dueDate: "2026-08-19" },
  { week: 9, title: "Body Systems III", date: "Aug 19", chapters: [17, 18], focus: "Chapters 17–18 body-system terminology", dueDate: "2026-08-26" },
  { week: 10, title: "Advanced Medical Terminology I", date: "Aug 26", chapters: [19, 20], focus: "Chapters 19–20 advanced medical terminology", dueDate: "2026-09-02" },
  { week: 11, title: "Advanced Medical Terminology II and Midterm 2", date: "Sep 2", chapters: [21, 22], focus: "Chapters 21–22 and Midterm 2 review for Chapters 13–22", dueDate: "2026-09-08" },
  { week: 12, title: "Comprehensive Final Exam", date: "Sep 9", chapters: [], focus: "Comprehensive review and final exam covering Chapters 1–22", dueDate: "2026-09-09" }
];

const weeklyExtras = {
  1: [
    itemLesson("Assignment", "[PN101 2026] Syllabus and Course Orientation Acknowledgment", { files: ["PN101_syllabus_orientation_acknowledgment.pdf", "PN101_syllabus_orientation_acknowledgment.docx"], note: "Review the course expectations, 12-week schedule, required materials, and acknowledgment." }),
    itemLesson("Attachment", "The Language of Medicine E-Book.pdf", { files: ["The Language of Medicine E-Book.pdf"], note: "Required textbook access from the Canvas export." }),
    itemLesson("Discussion", "[PN101 2026] Discussion 1: Introductions and Professional Goals"),
    itemLesson("Assignment", "[PN101 2026] Word Structure Worksheet", { files: ["PN101_Word_Structure_Worksheet.pdf", "PN101_Word_Structure_Worksheet.docx"] }),
    itemLesson("Assignment", "[PN101 2026] Body Organization and Oncology Exercise", { files: ["PN101_body_organization_oncology_exercise.pdf", "PN101_body_organization_oncology_exercise.docx"] })
  ],
  2: [
    itemLesson("Discussion", "[PN101 2026] Discussion 2: Decoding Medical Words"),
    itemLesson("Assignment", "[PN101 2026] Suffix Flashcard Set", { files: ["PN101_suffix_flashcard_set.pdf", "PN101_suffix_flashcard_set.docx"] }),
    itemLesson("Assignment", "[PN101 2026] Prefix Drill", { files: ["PN101_prefix_drill.pdf", "PN101_prefix_drill.docx"] })
  ],
  3: [
    itemLesson("Assignment", "[PN101 2026] Digestive Terminology Case Study", { files: ["PN101_digestive_terminology_case_study.pdf", "PN101_digestive_terminology_case_study.docx"] }),
    itemLesson("Assignment", "[PN101 2026] Urinary and Reproductive Terminology Chart", { files: ["PN101_urinary_reproductive_terminology_chart.pdf", "PN101_urinary_reproductive_terminology_chart.docx"] })
  ],
  5: [
    itemLesson("Discussion", "[PN101 2026] Discussion 3: Clinical Documentation"),
    itemLesson("Assignment", "[PN101 2026] Nervous System Clinical Note", { files: ["PN101_nervous_system_clinical_note.pdf", "PN101_nervous_system_clinical_note.docx"] })
  ],
  6: [itemLesson("Exam", "[PN101 2026] Midterm Exam 1 - Chapters 1-12", { note: quizNote("Midterm 1 assessment supplied by BMHI.", midtermOneQuestions), minutes: 30 })],
  7: [itemLesson("Assignment", "[PN101 2026] Cardiopulmonary and Hematology Case", { files: ["PN101_cardiopulmonary_hematology_case.pdf", "PN101_cardiopulmonary_hematology_case.docx"] })],
  8: [itemLesson("Discussion", "[PN101 2026] Discussion 4: Patient Education")],
  11: [
    itemLesson("Assignment", "[PN101 2026] Medical Term Flashcard Portfolio", { files: ["PN101_medical_term_flashcard_portfolio.pdf", "PN101_medical_term_flashcard_portfolio.docx"] }),
    itemLesson("Exam", "[PN101 2026] Midterm Exam 2 - Chapters 13-22", { note: quizNote("Midterm 2 assessment supplied by BMHI.", midtermTwoQuestions), minutes: 30 })
  ],
  12: [itemLesson("Exam", "[PN101 2026] Final Comprehensive Exam - Chapters 1-22", { note: quizNote("Comprehensive final assessment supplied by BMHI.", finalExamQuestions), minutes: 50 })]
};

const weeklyModules = weeklyPlan.map((week) => ({
  week: week.week,
  title: week.title,
  date: week.date,
  focus: week.focus,
  assessment: week.week === 12
    ? "Final Comprehensive Exam"
    : `Chapter ${week.chapters[0]} and Chapter ${week.chapters[1]} quizzes${week.week === 6 || week.week === 11 ? `; Midterm Exam ${week.week === 6 ? 1 : 2}` : ""}`
}));

const modules = weeklyPlan.map((week) => ({
  title: `PN101 2026 - Week ${week.week}: ${week.title}`,
  lessons: [...(weeklyExtras[week.week] || []), ...chapterLessons(week.chapters)]
}));

const gradeItem = (title, pointsPossible, week) => ({ title, pointsPossible, dueDate: weeklyPlan[week - 1].dueDate });
const gradeItems = [
  gradeItem("[PN101 2026] Syllabus and Course Orientation Acknowledgment", 0, 1),
  gradeItem("[PN101 2026] Discussion 1: Introductions and Professional Goals", 10, 1),
  gradeItem("[PN101 2026] Word Structure Worksheet", 15, 1),
  gradeItem("[PN101 2026] Body Organization and Oncology Exercise", 15, 1),
  gradeItem("[PN101 2026] Discussion 2: Decoding Medical Words", 10, 2),
  gradeItem("[PN101 2026] Suffix Flashcard Set", 15, 2),
  gradeItem("[PN101 2026] Prefix Drill", 15, 2),
  gradeItem("[PN101 2026] Digestive Terminology Case Study", 15, 3),
  gradeItem("[PN101 2026] Urinary and Reproductive Terminology Chart", 15, 3),
  gradeItem("[PN101 2026] Discussion 3: Clinical Documentation", 10, 5),
  gradeItem("[PN101 2026] Nervous System Clinical Note", 15, 5),
  gradeItem("[PN101 2026] Midterm Exam 1 - Chapters 1-12", 24, 6),
  gradeItem("[PN101 2026] Cardiopulmonary and Hematology Case", 15, 7),
  gradeItem("[PN101 2026] Discussion 4: Patient Education", 10, 8),
  gradeItem("[PN101 2026] Medical Term Flashcard Portfolio", 50, 11),
  gradeItem("[PN101 2026] Midterm Exam 2 - Chapters 13-22", 20, 11),
  ...weeklyPlan.slice(0, 11).flatMap((week) => week.chapters.map((chapter) => gradeItem(chapterQuizTitle(chapter), 10, week.week))),
  gradeItem("[PN101 2026] Final Comprehensive Exam - Chapters 1-22", 44, 12)
];

const medicalTerminologyCourse = {
  title: "Medical Terminology",
  slug: "medical-terminology",
  category: "Practical Nursing Course",
  hours: 45,
  tuitionCents: 0,
  booksSuppliesCents: 0,
  registrationFeeCents: 0,
  credentialType: "Course Completion",
  deliveryMode: "Campus / blended",
  description: courseDescription,
  ghlProductKeys: ["Medical Terminology", "PN 101", "PN101", "PN Medical Terminology", "medical-terminology", "Med Term"],
  courseNumber: "PN 101",
  seedVersion: "canvas-pn101-medical-terminology-quizzes-2026-07-14",
  objectives: courseObjectives,
  weeks: weeklyModules,
  modules,
  gradeItems
};

module.exports = { medicalTerminologyCourse };
