const materialBase = "/course-materials/certified-medication-aide";

const protectedFiles = {
  chapterExams: "Appendix B Chapter Exams.pdf",
  chapterAnswerKey: "Appendix C Answer Key for Chapter Exams.pdf",
  finalExam: "Appendix G Final Exam.pdf",
  finalAnswerKey: "Appendix H Answer Key for Final Exam.pdf"
};

function materialHref(fileName) {
  return `${materialBase}/${encodeURIComponent(fileName)}`;
}

const chapterTopics = [
  "Medication aide role, scope, and resident safety",
  "Legal responsibilities, delegation, and documentation",
  "Medication orders, labels, and approved abbreviations",
  "Infection control and medication administration safety",
  "Oral, topical, ophthalmic, otic, and nasal medications",
  "Medication effects, side effects, and adverse reactions",
  "Medication storage, disposal, and controlled substances",
  "Cardiovascular medications",
  "Respiratory medications",
  "Gastrointestinal medications",
  "Endocrine and diabetes-related medications",
  "Pain, inflammation, and nervous system medications",
  "Mental health and behavioral medications",
  "Antibiotics, antivirals, and anti-infectives",
  "Vitamins, supplements, and nutritional medications",
  "Older adult considerations and high-risk medications",
  "Medication error prevention and incident reporting",
  "Skills checkoff, simulation, and competency review",
  "Comprehensive chapter exam review"
];

const chapterModules = chapterTopics.map((topic, index) => {
  const chapterNumber = index + 1;
  return {
    title: `CMA Chapter ${chapterNumber}: ${topic}`,
    lessons: [
      {
        title: `Chapter ${chapterNumber} Study Guide: ${topic}`,
        content: [
          `Review Chapter ${chapterNumber}: ${topic}.`,
          "",
          "Students should read the assigned material, review vocabulary, and prepare medication-safety notes before taking the chapter quiz.",
          "",
          "Focus areas:",
          "- Safe medication administration standards",
          "- Resident rights and communication",
          "- Documentation and reporting expectations",
          "- Medication safety, storage, adverse effects, and error prevention"
        ].join("\n"),
        durationMinutes: 45
      },
      {
        title: `[CMA 2026] Chapter ${chapterNumber} Quiz - ${topic}`,
        content: [
          "Quiz instructions",
          "",
          `Complete only the Chapter ${chapterNumber} quiz unless your instructor tells you otherwise.`,
          "Read each question carefully and select the best answer. Do not begin until you have reviewed the chapter study guide and assigned reading.",
          "",
          `Protected chapter exam packet: ${materialHref(protectedFiles.chapterExams)}`,
          "",
          "Students should submit responses according to instructor directions. Faculty will enter quiz scores in the gradebook."
        ].join("\n"),
        externalUrl: materialHref(protectedFiles.chapterExams),
        durationMinutes: 30
      }
    ]
  };
});

const gradeItems = [
  ...chapterTopics.map((topic, index) => ({
    title: `[CMA 2026] Chapter ${index + 1} Quiz - ${topic}`,
    pointsPossible: 10
  })),
  {
    title: "Certified Medication Aide Skills Competency Checkoff",
    pointsPossible: 100
  },
  {
    title: "Certified Medication Aide Final Exam",
    pointsPossible: 100
  }
];

const certifiedMedicationAideCourse = {
  title: "Certified Medication Aide",
  slug: "certified-medication-aide",
  category: "Certificate Program",
  hours: 0,
  tuitionCents: 0,
  booksSuppliesCents: 0,
  registrationFeeCents: 0,
  credentialType: "Certificate",
  deliveryMode: "Campus / blended",
  seedVersion: "certified-medication-aide-exams-2026-07-19",
  description:
    "Certified Medication Aide course shell with medication safety, administration standards, chapter quizzes, skills competency review, and a final exam.",
  ghlProductKeys: [
    "Certified Medication Aide",
    "Medication Aide",
    "CMA",
    "certified-medication-aide"
  ],
  courseNumber: "CMA",
  credits: 0,
  requiredTitles: [
    "Appendix B Chapter Exams",
    "Appendix G Final Exam"
  ],
  policies: {
    examSecurity:
      "Chapter exams, final exams, and answer keys are protected course materials. Answer keys are faculty-only and must not be published to students.",
    grading:
      "Chapter quizzes are listed as 10 points each. The skills competency checkoff and final exam are listed as 100 points each until official grading weights are finalized.",
    remediation:
      "Students who do not meet the minimum standard should receive instructor review and documented remediation before retesting."
  },
  objectives: [
    "Describe the medication aide role, scope, and responsibility for resident safety.",
    "Apply medication administration rights, documentation expectations, and reporting procedures.",
    "Recognize common medication classifications, effects, side effects, and adverse reactions.",
    "Demonstrate safe medication storage, preparation, administration, and disposal practices.",
    "Complete chapter quizzes, skills competency verification, and a comprehensive final exam."
  ],
  weeks: chapterTopics.map((topic, index) => ({
    week: index + 1,
    title: `Chapter ${index + 1}: ${topic}`,
    focus: topic
  })),
  modules: [
    {
      title: "CMA Orientation and Course Resources",
      lessons: [
        {
          title: "Certified Medication Aide Course Orientation",
          content: [
            "Welcome to Certified Medication Aide.",
            "",
            "This course prepares students to follow medication administration standards, protect resident safety, document accurately, and recognize when to report concerns to the nurse.",
            "",
            "Course requirements include chapter study guides, chapter quizzes, skills competency verification, and the final exam."
          ].join("\n"),
          durationMinutes: 30
        },
        {
          title: "Medication Safety and Exam Expectations",
          content: [
            "Students must follow instructor directions for all exams and skills checkoffs.",
            "",
            "Before each quiz:",
            "- Review the chapter study guide.",
            "- Complete assigned reading.",
            "- Bring questions to the instructor before opening the quiz.",
            "- Do not share exam content or answer keys."
          ].join("\n"),
          durationMinutes: 20
        }
      ]
    },
    ...chapterModules,
    {
      title: "CMA Final Exam and Course Completion",
      lessons: [
        {
          title: "Certified Medication Aide Final Exam Instructions",
          content: [
            "Final exam instructions",
            "",
            "Complete the final exam only when released by your instructor. Review all chapter study guides, medication safety notes, and skills competency feedback before beginning.",
            "",
            `Protected final exam packet: ${materialHref(protectedFiles.finalExam)}`,
            "",
            "Faculty will review final exam completion, skills competency, attendance, and required records before marking the course complete."
          ].join("\n"),
          externalUrl: materialHref(protectedFiles.finalExam),
          durationMinutes: 90
        },
        {
          title: "Certified Medication Aide Skills Competency Checkoff",
          content: [
            "Complete the medication aide skills competency checkoff with your instructor.",
            "",
            "Competency areas include medication administration rights, infection control, resident identification, documentation, reporting, and safe handling of medications."
          ].join("\n"),
          durationMinutes: 60
        }
      ]
    },
    {
      title: "CMA Faculty Exam Resources",
      lessons: [
        {
          title: "Appendix C Answer Key for Chapter Exams - Faculty Only",
          content: [
            "Faculty-only answer key for chapter exams.",
            "",
            `Protected faculty file: ${materialHref(protectedFiles.chapterAnswerKey)}`,
            "",
            "Do not publish this item for students."
          ].join("\n"),
          externalUrl: materialHref(protectedFiles.chapterAnswerKey),
          durationMinutes: 0,
          published: false,
          instructorOnly: true
        },
        {
          title: "Appendix H Answer Key for Final Exam - Faculty Only",
          content: [
            "Faculty-only answer key for the final exam.",
            "",
            `Protected faculty file: ${materialHref(protectedFiles.finalAnswerKey)}`,
            "",
            "Do not publish this item for students."
          ].join("\n"),
          externalUrl: materialHref(protectedFiles.finalAnswerKey),
          durationMinutes: 0,
          published: false,
          instructorOnly: true
        },
        {
          title: "Instructor Grading Workflow",
          content: [
            "Faculty workflow",
            "",
            "1. Release the appropriate chapter quiz or final exam when students are ready.",
            "2. Confirm the student completed the required study guide and assigned reading.",
            "3. Grade using the protected faculty answer key.",
            "4. Enter scores in the gradebook.",
            "5. Document remediation before any retest."
          ].join("\n"),
          durationMinutes: 15,
          published: false,
          instructorOnly: true
        }
      ]
    }
  ],
  gradeItems
};

module.exports = { certifiedMedicationAideCourse };
