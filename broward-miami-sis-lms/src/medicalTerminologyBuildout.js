const courseDescription =
  "A 12-week introductory Medical Terminology course for practical nursing students focused on word parts, pronunciation, abbreviations, body systems, chart terminology, medication language, documentation, and safe communication in health care.";

const courseObjectives = [
  "Break medical terms into prefixes, roots, combining forms, and suffixes.",
  "Define, pronounce, spell, and use common medical terms accurately.",
  "Apply medical terminology to anatomy, physiology, pathology, diagnostics, treatment, medications, and documentation.",
  "Use approved abbreviations and avoid unsafe abbreviations in patient care communication.",
  "Interpret common terms found in medical records, orders, reports, and patient education materials.",
  "Connect medical terminology to practical nursing safety, professionalism, and patient understanding."
];

const weeklyModules = [
  {
    week: 1,
    title: "Course Orientation and Building Medical Words",
    focus: "Students learn how medical words are formed and why precise terminology matters in practical nursing.",
    topics: ["Course expectations", "Word roots", "Combining forms", "Suffixes", "Prefixes", "Singular and plural endings"],
    applied: "Break down 20 common nursing terms and identify each word part.",
    assessment: "Terminology Practice: Word Parts"
  },
  {
    week: 2,
    title: "Pronunciation, Spelling, Abbreviations, and Documentation Safety",
    focus: "Students practice clear pronunciation, spelling accuracy, approved abbreviations, and unsafe abbreviation awareness.",
    topics: ["Pronunciation rules", "Common spelling errors", "Chart abbreviations", "Do-not-use abbreviations", "Legal documentation concerns"],
    applied: "Correct unsafe abbreviations in sample chart entries.",
    assessment: "Quiz 1: Weeks 1-2"
  },
  {
    week: 3,
    title: "Anatomy Directional Terms, Body Planes, Cavities, and Regions",
    focus: "Students use anatomical language to describe body location, position, movement, and clinical findings.",
    topics: ["Anatomical position", "Directional terms", "Body planes", "Body cavities", "Abdominal quadrants", "Regions"],
    applied: "Describe patient findings using anatomical directions and regions.",
    assessment: "Body Location Worksheet"
  },
  {
    week: 4,
    title: "Integumentary, Musculoskeletal, and Nervous System Terms",
    focus: "Students define common terms related to skin, wounds, bones, muscles, joints, and the nervous system.",
    topics: ["Skin lesions", "Wound terms", "Fractures", "Joint movement", "Neurologic signs", "Pain descriptors"],
    applied: "Read a short progress note and identify integumentary, musculoskeletal, and neurologic terms.",
    assessment: "Quiz 2: Weeks 3-4"
  },
  {
    week: 5,
    title: "Cardiovascular, Blood, and Lymphatic System Terms",
    focus: "Students connect heart, blood vessel, blood, and lymphatic terminology to vital signs, diagnostics, and common disorders.",
    topics: ["Cardiac anatomy terms", "Blood pressure vocabulary", "ECG terminology", "Blood components", "Anemia", "Edema", "Lymph nodes"],
    applied: "Interpret terminology from sample vital sign, lab, and cardiac assessment documentation.",
    assessment: "Cardiovascular Terminology Practice"
  },
  {
    week: 6,
    title: "Respiratory System Terms and Midterm Review",
    focus: "Students define respiratory terminology and prepare for the midterm covering foundational language and body systems.",
    topics: ["Upper and lower respiratory terms", "Oxygenation", "Breath sounds", "Dyspnea", "Cough and sputum terms", "Diagnostic tests"],
    applied: "Translate a respiratory assessment note into plain language for patient teaching.",
    assessment: "Midterm Exam: Weeks 1-6"
  },
  {
    week: 7,
    title: "Digestive System, Nutrition, and Metabolism Terms",
    focus: "Students use terminology related to digestion, elimination, nutrition, metabolism, and common procedures.",
    topics: ["Digestive organs", "GI symptoms", "Diet orders", "Enteral feeding", "Diagnostic procedures", "Metabolic terms"],
    applied: "Identify digestive and nutrition terms in an admission history.",
    assessment: "GI Terminology Case"
  },
  {
    week: 8,
    title: "Urinary, Reproductive, Obstetric, and Newborn Terms",
    focus: "Students learn common urinary, reproductive, maternal-newborn, and neonatal terms used in nursing documentation.",
    topics: ["Urinary symptoms", "Renal diagnostics", "Male and female reproductive terms", "Pregnancy terms", "Labor and delivery", "Newborn terminology"],
    applied: "Match maternal-newborn terms with definitions and nursing examples.",
    assessment: "Quiz 3: Weeks 7-8"
  },
  {
    week: 9,
    title: "Endocrine, Immune, Oncology, and Infection Terms",
    focus: "Students define terms related to hormones, immunity, infection, inflammation, cancer, and common chronic conditions.",
    topics: ["Diabetes terminology", "Thyroid terms", "Allergy and immunity", "Inflammation", "Benign and malignant", "Infection control vocabulary"],
    applied: "Summarize a patient education handout using correct endocrine and infection terms.",
    assessment: "Endocrine and Infection Vocabulary Drill"
  },
  {
    week: 10,
    title: "Pharmacology, Orders, Routes, Dosage Forms, and Medication Safety",
    focus: "Students apply medication terminology to practical nursing safety and provider orders.",
    topics: ["Medication classifications", "Routes", "Dosage forms", "Frequency terms", "Prescription abbreviations", "Medication reconciliation"],
    applied: "Interpret sample medication orders and flag unclear or unsafe wording.",
    assessment: "Quiz 4: Weeks 9-10"
  },
  {
    week: 11,
    title: "Diagnostics, Procedures, Surgery, and Health Records",
    focus: "Students interpret common terms found in lab reports, imaging, procedure notes, operative reports, and discharge instructions.",
    topics: ["Laboratory terminology", "Imaging terms", "Surgical suffixes", "Procedure terminology", "Electronic health record vocabulary", "Discharge language"],
    applied: "Read a sample diagnostic report and identify major terminology categories.",
    assessment: "Health Record Terminology Assignment"
  },
  {
    week: 12,
    title: "Comprehensive Review and Practical Nursing Communication",
    focus: "Students review course vocabulary and demonstrate accurate terminology use in nursing communication.",
    topics: ["Comprehensive body system review", "Patient-friendly explanations", "SBAR vocabulary", "Documentation accuracy", "Final exam preparation"],
    applied: "Create a glossary of high-priority terms for first clinical rotations.",
    assessment: "Final Exam"
  }
];

const modules = [
  {
    title: "Orientation and Syllabus",
    lessons: [
      {
        title: "Welcome to Medical Terminology",
        durationMinutes: 30,
        content:
          "Review the course purpose, grading, weekly expectations, study habits, and the importance of accurate medical language in practical nursing."
      },
      {
        title: "How to Study Medical Terms",
        durationMinutes: 35,
        content:
          "Practice breaking words into prefixes, roots, combining forms, and suffixes. Build flashcard routines and pronunciation habits."
      }
    ]
  },
  ...weeklyModules.map((week) => ({
    title: `Week ${week.week}: ${week.title}`,
    lessons: [
      {
        title: "Lecture and Guided Notes",
        durationMinutes: 45,
        content: `${week.focus} Topics: ${week.topics.join(", ")}.`
      },
      {
        title: "Applied Practice",
        durationMinutes: 45,
        content: `${week.applied} Assessment: ${week.assessment}.`
      }
    ]
  })),
  {
    title: "Final Review and Completion",
    lessons: [
      {
        title: "Comprehensive Vocabulary Review",
        durationMinutes: 60,
        content:
          "Review major prefixes, roots, suffixes, body system terminology, documentation language, abbreviations, medication terms, diagnostics, and common clinical words."
      },
      {
        title: "Course Completion Checklist",
        durationMinutes: 30,
        content:
          "Confirm completion of quizzes, assignments, midterm, final exam, attendance expectations, and course reflection."
      }
    ]
  }
];

const gradeItems = [
  { title: "Quiz 1: Weeks 1-2", pointsPossible: 50 },
  { title: "Quiz 2: Weeks 3-4", pointsPossible: 50 },
  { title: "Quiz 3: Weeks 7-8", pointsPossible: 50 },
  { title: "Quiz 4: Weeks 9-10", pointsPossible: 50 },
  { title: "Word Parts Practice Assignments", pointsPossible: 100 },
  { title: "Medical Record Terminology Assignments", pointsPossible: 100 },
  { title: "Midterm Exam: Weeks 1-6", pointsPossible: 150 },
  { title: "Final Exam", pointsPossible: 200 },
  { title: "Professional Participation and Vocabulary Notebook", pointsPossible: 100 }
];

const medicalTerminologyCourse = {
  title: "Medical Terminology",
  slug: "medical-terminology",
  category: "Practical Nursing Course",
  hours: 48,
  credentialType: "Course Completion",
  deliveryMode: "Campus / blended",
  description: courseDescription,
  ghlProductKeys: ["Medical Terminology", "PN Medical Terminology", "medical-terminology", "Med Term"],
  courseNumber: "PN-MEDTERM",
  credits: 3,
  objectives: courseObjectives,
  weeks: weeklyModules,
  modules,
  gradeItems
};

module.exports = { medicalTerminologyCourse };
