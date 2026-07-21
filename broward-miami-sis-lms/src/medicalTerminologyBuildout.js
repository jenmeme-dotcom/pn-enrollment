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
const midtermOneQuestions = [1, 2, 3, 4].flatMap((chapter) => chapterQuestionBanks[chapter].slice(10, 15));
const midtermTwoQuestions = [5, 6, 7, 8, 9, 10].flatMap((chapter) => chapterQuestionBanks[chapter].slice(10, 15));
const finalExamQuestions = Array.from({ length: 22 }, (_, index) => index + 1).flatMap((chapter) =>
  chapterQuestionBanks[chapter].slice(chapter <= 4 ? 15 : chapter <= 10 ? 15 : 10, chapter <= 10 ? 17 : 12)
);

function quizNote(label, questions) {
  return `${label} Multiple-choice questions only.\n\nQUIZ_DATA_BASE64:${Buffer.from(JSON.stringify(questions)).toString("base64")}`;
}

const weeklyModules = [
  { week: 1, title: "Orientation and Word Structure", date: "Jun 24", focus: "Course orientation; Chapter 1 Basic Word Structure", assessment: "Orientation acknowledgment, Discussion 1, Quiz 1, Word Structure Worksheet" },
  { week: 2, title: "Body Organization and Oncology", date: "Jul 1", focus: "Chapter 2 Body Structure, Color, and Oncology", assessment: "Body Organization Exercise, Quiz 2, Discussion 2" },
  { week: 3, title: "Suffixes", date: "Jul 8", focus: "Chapter 3 Suffixes", assessment: "Suffix Flashcard Set and Quiz 3" },
  { week: 4, title: "Prefixes and Midterm 1", date: "Jul 15", focus: "Chapter 4 Prefixes and Midterm 1 review", assessment: "Prefix Drill, Quiz 4, Midterm Exam 1" },
  { week: 5, title: "Digestive and Urinary Systems", date: "Jul 22", focus: "Chapters 5 and 6 Digestive and Urinary Systems", assessment: "Digestive Terminology Case Study and Quiz 5" },
  { week: 6, title: "Reproductive Systems", date: "Jul 29", focus: "Chapters 7, 8, and 9 Reproductive Systems", assessment: "Urinary and Reproductive Terminology Chart, Quiz 6, Quiz 7" },
  { week: 7, title: "Nervous System and Documentation", date: "Aug 5", focus: "Chapter 10 Nervous System and clinical documentation", assessment: "Discussion 3, Nervous System Clinical Note, Quiz 9" },
  { week: 8, title: "Cardiovascular System", date: "Aug 12", focus: "Chapters 11 and 12 Cardiovascular and related terminology", assessment: "Quiz 8 and chapter slide review" },
  { week: 9, title: "Midterm 2", date: "Aug 19", focus: "Midterm 2 covering Chapters 5-10", assessment: "Midterm Exam 2" },
  { week: 10, title: "Blood, Lymphatic, and Review", date: "Aug 26", focus: "Chapters 13-22: blood, lymphatic, immune, respiratory, musculoskeletal, skin, sensory, endocrine, and review", assessment: "Discussion 4 and Cardiopulmonary/Hematology Case" },
  { week: 11, title: "Final Review and Portfolio", date: "Sep 2", focus: "Final review and cumulative flashcard portfolio", assessment: "Medical Term Flashcard Portfolio and Quiz 10" },
  { week: 12, title: "Final Exam", date: "Sep 9", focus: "Comprehensive final exam covering Chapters 1-22", assessment: "Final Comprehensive Exam" }
];

const chapterQuizBank = Array.from({ length: 12 }, (_, index) => {
  const chapterNumber = index + 11;
  return {
    title: `[PN101 2026] Quiz ${chapterNumber} - Chapter ${chapterNumber} Review`,
    dueDate: "2026-09-08",
    questions: chapterQuizQuestions[chapterNumber]
  };
});

const modules = [
  {
    title: "PN101 2026 - Week 1: Orientation and Word Structure",
    lessons: [
      itemLesson("Assignment", "[PN101 2026] Syllabus and Course Orientation Acknowledgment", {
        files: ["PN101_syllabus_orientation_acknowledgment.pdf", "PN101_syllabus_orientation_acknowledgment.docx"],
        note: "Students review course expectations, schedule, required materials, and acknowledge orientation completion."
      }),
      itemLesson("Attachment", "The Language of Medicine E-Book.pdf", {
        files: ["The Language of Medicine E-Book.pdf"],
        note: "Required textbook access from the Canvas export."
      }),
      itemLesson("Discussion", "[PN101 2026] Discussion 1: Introductions and Professional Goals", {
        note: "Students introduce themselves and connect medical terminology study to professional nursing goals."
      }),
      itemLesson("Quiz", "[PN101 2026] Quiz 1 - Chapter 1 Word Structure", {
        note: quizNote("Chapter 1 assessment supplied by BMHI.", chapterQuizQuestions[1])
      }),
      itemLesson("Assignment", "[PN101 2026] Word Structure Worksheet", {
        files: ["PN101_Word_Structure_Worksheet.pdf", "PN101_Word_Structure_Worksheet.docx"]
      }),
      itemLesson("Attachment", "Chapter_001.pptx", { files: ["Chapter_001.pptx"] })
    ]
  },
  {
    title: "PN101 2026 - Week 2: Body Organization and Oncology",
    lessons: [
      itemLesson("Assignment", "[PN101 2026] Body Organization and Oncology Exercise", {
        files: ["PN101_body_organization_oncology_exercise.pdf", "PN101_body_organization_oncology_exercise.docx"]
      }),
      itemLesson("Quiz", "[PN101 2026] Quiz 2 - Chapter 2 Body Organization and Oncology", { note: quizNote("Chapter 2 assessment supplied by BMHI.", chapterQuizQuestions[2]) }),
      itemLesson("Discussion", "[PN101 2026] Discussion 2: Decoding Medical Words"),
      itemLesson("Attachment", "Chapter_002.pptx", { files: ["Chapter_002.pptx"] })
    ]
  },
  {
    title: "PN101 2026 - Week 3: Suffixes",
    lessons: [
      itemLesson("Assignment", "[PN101 2026] Suffix Flashcard Set", {
        files: ["PN101_suffix_flashcard_set.pdf", "PN101_suffix_flashcard_set.docx"]
      }),
      itemLesson("Quiz", "[PN101 2026] Quiz 3 - Chapter 3 Suffixes", { note: quizNote("Chapter 3 assessment supplied by BMHI.", chapterQuizQuestions[3]) }),
      itemLesson("Attachment", "Chapter_003.pptx", { files: ["Chapter_003.pptx"] })
    ]
  },
  {
    title: "PN101 2026 - Week 4: Prefixes and Midterm 1",
    lessons: [
      itemLesson("Assignment", "[PN101 2026] Prefix Drill", {
        files: ["PN101_prefix_drill.pdf", "PN101_prefix_drill.docx"]
      }),
      itemLesson("Quiz", "[PN101 2026] Quiz 4 - Chapter 4 Prefixes", { note: quizNote("Chapter 4 assessment supplied by BMHI.", chapterQuizQuestions[4]) }),
      itemLesson("Exam", "[PN101 2026] Midterm Exam 1 - Chapters 1-4", { note: quizNote("Midterm 1 assessment supplied by BMHI.", midtermOneQuestions), minutes: 60 }),
      itemLesson("Attachment", "Chapter_004.pptx", { files: ["Chapter_004.pptx"] }),
      itemLesson("External URL", "MT Chapter 4", {
        externalUrl: "https://www.youtube.com/results?search_query=medical+terminology+chapter+4+prefixes",
        note: "Canvas external link placeholder for Chapter 4 support material."
      })
    ]
  },
  {
    title: "PN101 2026 - Week 5: Digestive and Urinary Systems",
    lessons: [
      itemLesson("Assignment", "[PN101 2026] Digestive Terminology Case Study", {
        files: ["PN101_digestive_terminology_case_study.pdf", "PN101_digestive_terminology_case_study.docx"]
      }),
      itemLesson("Quiz", "[PN101 2026] Quiz 5 - Chapter 5 Digestive System", { note: quizNote("Chapter 5 assessment supplied by BMHI.", chapterQuizQuestions[5]) }),
      itemLesson("Attachment", "Chapter_005.pptx", { files: ["Chapter_005.pptx"] }),
      itemLesson("Attachment", "Chapter_006.pptx", { files: ["Chapter_006.pptx"] })
    ]
  },
  {
    title: "PN101 2026 - Week 6: Reproductive Systems",
    lessons: [
      itemLesson("Assignment", "[PN101 2026] Urinary and Reproductive Terminology Chart", {
        files: ["PN101_urinary_reproductive_terminology_chart.pdf", "PN101_urinary_reproductive_terminology_chart.docx"]
      }),
      itemLesson("Quiz", "[PN101 2026] Quiz 6 - Chapter 6 Urinary System", { note: quizNote("Chapter 6 assessment supplied by BMHI.", chapterQuizQuestions[6]) }),
      itemLesson("Attachment", "Chapter_007.pptx", { files: ["Chapter_007.pptx"] }),
      itemLesson("Quiz", "[PN101 2026] Quiz 7 - Chapter 7 Female Reproductive System", { note: quizNote("Chapter 7 assessment supplied by BMHI.", chapterQuizQuestions[7]) }),
      itemLesson("Attachment", "Chapter_008.pptx", { files: ["Chapter_008.pptx"] }),
      itemLesson("Attachment", "Chapter_009.pptx", { files: ["Chapter_009.pptx"] })
    ]
  },
  {
    title: "PN101 2026 - Week 7: Nervous System and Documentation",
    lessons: [
      itemLesson("Discussion", "[PN101 2026] Discussion 3: Clinical Documentation"),
      itemLesson("Assignment", "[PN101 2026] Nervous System Clinical Note", {
        files: ["PN101_nervous_system_clinical_note.pdf", "PN101_nervous_system_clinical_note.docx"]
      }),
      itemLesson("Quiz", "[PN101 2026] Quiz 9 - Chapter 9 Nervous System", { note: quizNote("Chapter 9 assessment supplied by BMHI.", chapterQuizQuestions[9]) }),
      itemLesson("Attachment", "Chapter_010.pptx", { files: ["Chapter_010.pptx"] })
    ]
  },
  {
    title: "PN101 2026 - Week 8: Cardiovascular System",
    lessons: [
      itemLesson("Quiz", "[PN101 2026] Quiz 8 - Chapter 8 Male Reproductive System", { note: quizNote("Chapter 8 assessment supplied by BMHI.", chapterQuizQuestions[8]) }),
      itemLesson("Attachment", "Chapter_011.pptx", { files: ["Chapter_011.pptx"] }),
      itemLesson("Attachment", "Chapter_012.pptx", { files: ["Chapter_012.pptx"] })
    ]
  },
  {
    title: "PN101 2026 - Week 9: Midterm 2",
    lessons: [
      itemLesson("Exam", "[PN101 2026] Midterm Exam 2 - Chapters 5-10", { note: quizNote("Midterm 2 assessment supplied by BMHI.", midtermTwoQuestions), minutes: 75 })
    ]
  },
  {
    title: "PN101 2026 - Week 10: Blood, Lymphatic, and Review",
    lessons: [
      itemLesson("Discussion", "[PN101 2026] Discussion 4: Patient Education"),
      itemLesson("Assignment", "[PN101 2026] Cardiopulmonary and Hematology Case", {
        files: ["PN101_cardiopulmonary_hematology_case.pdf", "PN101_cardiopulmonary_hematology_case.docx"]
      }),
      ...Array.from({ length: 10 }, (_, index) => itemLesson("Attachment", `Chapter_${String(index + 13).padStart(3, "0")}.pptx`, {
        files: [`Chapter_${String(index + 13).padStart(3, "0")}.pptx`]
      }))
    ]
  },
  {
    title: "PN101 2026 - Week 11: Final Review and Portfolio",
    lessons: [
      itemLesson("Assignment", "[PN101 2026] Medical Term Flashcard Portfolio", {
        files: ["PN101_medical_term_flashcard_portfolio.pdf", "PN101_medical_term_flashcard_portfolio.docx"]
      }),
      itemLesson("Quiz", "[PN101 2026] Quiz 10 - Chapter 10 Cardiovascular System", { note: quizNote("Chapter 10 assessment supplied by BMHI.", chapterQuizQuestions[10]) })
    ]
  },
  {
    title: "PN101 2026 - Chapter Quiz Bank: Chapters 11-22",
    lessons: chapterQuizBank.map((quiz) => itemLesson("Quiz", quiz.title, {
      note: quizNote("Chapter review quiz for Medical Terminology. Students should complete the related chapter slides before attempting the quiz.", quiz.questions),
      minutes: 30
    }))
  },
  {
    title: "PN101 2026 - Week 12: Final Exam",
    lessons: [
      itemLesson("Exam", "[PN101 2026] Final Comprehensive Exam - Chapters 1-22", { note: quizNote("Comprehensive final assessment supplied by BMHI.", finalExamQuestions), minutes: 120 })
    ]
  }
];

const gradeItems = [
  { title: "[PN101 2026] Syllabus and Course Orientation Acknowledgment", pointsPossible: 0, dueDate: "2026-06-28" },
  { title: "[PN101 2026] Discussion 1: Introductions and Professional Goals", pointsPossible: 10, dueDate: "2026-06-28" },
  { title: "[PN101 2026] Quiz 1 - Chapter 1 Word Structure", pointsPossible: 10, dueDate: "2026-07-01" },
  { title: "[PN101 2026] Word Structure Worksheet", pointsPossible: 15, dueDate: "2026-07-01" },
  { title: "[PN101 2026] Body Organization and Oncology Exercise", pointsPossible: 15, dueDate: "2026-07-08" },
  { title: "[PN101 2026] Quiz 2 - Chapter 2 Body Organization and Oncology", pointsPossible: 10, dueDate: "2026-07-08" },
  { title: "[PN101 2026] Suffix Flashcard Set", pointsPossible: 15, dueDate: "2026-07-15" },
  { title: "[PN101 2026] Quiz 3 - Chapter 3 Suffixes", pointsPossible: 10, dueDate: "2026-07-15" },
  { title: "[PN101 2026] Prefix Drill", pointsPossible: 15, dueDate: "2026-07-21" },
  { title: "[PN101 2026] Quiz 4 - Chapter 4 Prefixes", pointsPossible: 10, dueDate: "2026-07-21" },
  { title: "[PN101 2026] Midterm Exam 1 - Chapters 1-4", pointsPossible: 20, dueDate: "2026-07-22" },
  { title: "[PN101 2026] Discussion 2: Decoding Medical Words", pointsPossible: 10, dueDate: "2026-07-29" },
  { title: "[PN101 2026] Digestive Terminology Case Study", pointsPossible: 15, dueDate: "2026-08-04" },
  { title: "[PN101 2026] Quiz 5 - Chapter 5 Digestive System", pointsPossible: 10, dueDate: "2026-08-04" },
  { title: "[PN101 2026] Urinary and Reproductive Terminology Chart", pointsPossible: 15, dueDate: "2026-08-11" },
  { title: "[PN101 2026] Quiz 6 - Chapter 6 Urinary System", pointsPossible: 10, dueDate: "2026-08-11" },
  { title: "[PN101 2026] Discussion 3: Clinical Documentation", pointsPossible: 10, dueDate: "2026-08-18" },
  { title: "[PN101 2026] Nervous System Clinical Note", pointsPossible: 15, dueDate: "2026-08-18" },
  { title: "[PN101 2026] Quiz 7 - Chapter 7 Female Reproductive System", pointsPossible: 10, dueDate: "2026-08-18" },
  { title: "[PN101 2026] Midterm Exam 2 - Chapters 5-10", pointsPossible: 30, dueDate: "2026-08-19" },
  { title: "[PN101 2026] Quiz 8 - Chapter 8 Male Reproductive System", pointsPossible: 10, dueDate: "2026-08-25" },
  { title: "[PN101 2026] Discussion 4: Patient Education", pointsPossible: 10, dueDate: "2026-09-01" },
  { title: "[PN101 2026] Cardiopulmonary and Hematology Case", pointsPossible: 15, dueDate: "2026-09-01" },
  { title: "[PN101 2026] Quiz 9 - Chapter 9 Nervous System", pointsPossible: 10, dueDate: "2026-09-01" },
  { title: "[PN101 2026] Medical Term Flashcard Portfolio", pointsPossible: 50, dueDate: "2026-09-06" },
  { title: "[PN101 2026] Quiz 10 - Chapter 10 Cardiovascular System", pointsPossible: 10, dueDate: "2026-09-08" },
  ...chapterQuizBank.map((quiz) => ({ title: quiz.title, pointsPossible: 10, dueDate: quiz.dueDate })),
  { title: "[PN101 2026] Final Comprehensive Exam - Chapters 1-22", pointsPossible: 44, dueDate: "2026-09-09" }
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
  credits: 3,
  seedVersion: "canvas-pn101-medical-terminology-quizzes-2026-07-14",
  objectives: courseObjectives,
  weeks: weeklyModules,
  modules,
  gradeItems
};

module.exports = { medicalTerminologyCourse };
