function catalogLesson(title, content, durationMinutes = 60) {
  return { title, content, durationMinutes };
}

const courseDescription =
  "The Medical Billing and Coding diploma program prepares students for entry-level employment as medical billing specialists, medical coding specialists, and health information team members using electronic health systems.";

const courseObjectives = [
  "Apply medical law, ethics, confidentiality, HIPAA, compliance, and healthcare documentation standards.",
  "Use computers, keyboarding, Microsoft Office, and electronic health record workflows in a medical office setting.",
  "Use medical terminology, anatomy, physiology, and body-system knowledge to support accurate coding and billing.",
  "Process health insurance, electronic healthcare billing, reimbursement, accounts receivable, and medical office accounting tasks.",
  "Assign and audit diagnosis, procedure, CPT, HCPCS, and evaluation and management codes for major body systems.",
  "Demonstrate professional communication, job-search readiness, and career development skills for healthcare employment."
];

const catalogCourses = [
  {
    number: "MLE 100",
    title: "Medical Law & Ethics",
    hours: 40,
    prerequisites: "None",
    description: "Basic legal relationship of physician and patient, including implied and informed consent, professional liability, invasion of privacy, breach of contract, and the Medical Practice Act.",
    outcomes: [
      "Explain legal and ethical responsibilities in the physician-patient relationship.",
      "Apply consent, confidentiality, privacy, and professional liability concepts to medical office scenarios.",
      "Identify legal risks related to release of information, documentation, and patient communication."
    ],
    practice: "Students review legal scenarios and identify the correct ethical and documentation response for each case."
  },
  {
    number: "CIS 100",
    title: "Introduction to Computers",
    hours: 60,
    prerequisites: "None",
    description: "Common microcomputer hardware and software used in the workplace, including practical assignments in word processing, spreadsheets, databases, and graphic presentations.",
    outcomes: [
      "Identify common workplace computer hardware, software, file-management, and internet safety practices.",
      "Create basic word processing, spreadsheet, database, and presentation files.",
      "Use professional technology habits for accurate healthcare office work."
    ],
    practice: "Students complete a workplace technology portfolio with documents, spreadsheets, data tables, and a short presentation."
  },
  {
    number: "HAP 103",
    title: "Human Anatomy & Physiology",
    hours: 60,
    prerequisites: "None",
    description: "Foundational anatomy and physiology concepts needed for health information, coding, medical terminology, and clinical documentation workflows.",
    outcomes: [
      "Identify major body systems and their core structures and functions.",
      "Connect body-system terminology to common diagnoses and clinical documentation.",
      "Use anatomy and physiology knowledge to support accurate code selection."
    ],
    practice: "Students map body systems to documentation clues, common conditions, and coding reference sections."
  },
  {
    number: "HIV 104",
    title: "HIV/AIDS",
    hours: 4,
    prerequisites: "None",
    description: "HIV/AIDS etiology, epidemiology, transmission, infection control, testing, counseling, clinical manifestations, treatments, and Florida laws and regulations.",
    outcomes: [
      "Describe HIV/AIDS transmission, prevention, testing, counseling, and treatment concepts.",
      "Apply infection control and bloodborne pathogen precautions.",
      "Identify Florida law and regulation considerations related to HIV/AIDS."
    ],
    practice: "Students complete a short HIV/AIDS compliance acknowledgement and infection-control scenario review."
  },
  {
    number: "MEA 105",
    title: "Medical Applications",
    hours: 40,
    prerequisites: "MLE 100",
    description: "A medical office environment course where students apply learned skills in coding, billing, and other medical office functions.",
    outcomes: [
      "Use medical office workflows to connect scheduling, documentation, billing, coding, and records management.",
      "Practice professional communication with patients, providers, payers, and internal team members.",
      "Apply law and ethics concepts to routine medical office tasks."
    ],
    practice: "Students complete a simulated medical office day from patient intake through claim preparation."
  },
  {
    number: "MET 108",
    title: "Medical Terminology",
    hours: 60,
    prerequisites: "None",
    description: "Working knowledge of medical language using prefixes, suffixes, roots, abbreviations, and body-system terms used in a medical environment.",
    outcomes: [
      "Build, define, spell, and use common medical terms and abbreviations.",
      "Relate medical terms to body systems, diagnoses, procedures, and documentation.",
      "Use terminology to improve coding, billing, and health information accuracy."
    ],
    practice: "Students build a terminology chart organized by body system with documentation and coding examples."
  },
  {
    number: "EHB 109",
    title: "Electronic Healthcare Billing",
    hours: 120,
    prerequisites: "None",
    description: "Health insurance and reimbursement programs, billing procedures for physician charges, accounts receivable/payable, appointment setting, collections, confidentiality, workers compensation, Medicare reimbursement, compliance, HIPAA, and the False Claims Act.",
    outcomes: [
      "Process electronic healthcare billing workflows from encounter documentation to claim submission.",
      "Apply payer, reimbursement, Medicare, collections, confidentiality, HIPAA, and compliance requirements.",
      "Identify billing errors, claim issues, and proper follow-up steps."
    ],
    practice: "Students prepare and review simulated claims, patient ledgers, and denial follow-up notes."
  },
  {
    number: "MOA 110",
    title: "Medical Office Accounting",
    hours: 120,
    prerequisites: "None",
    description: "Accounting and financial reporting issues for hospitals, medical group practices, nursing homes, and other healthcare entities, including revenue recognition, payroll accounting, fixed assets, debt liabilities, and practical accounting applications.",
    outcomes: [
      "Explain basic healthcare accounting and financial reporting concepts.",
      "Record and review revenue, payroll, fixed asset, liability, and account activity.",
      "Use accounting information to support medical office billing and revenue cycle tasks."
    ],
    practice: "Students reconcile a simulated medical office ledger and identify billing/accounting discrepancies."
  },
  {
    number: "MHI 111",
    title: "Principles of Health Insurance",
    hours: 40,
    prerequisites: "MLE 100",
    description: "Medical insurance reimbursement, policy types, coverage, plan categories, health insurance acronyms, coding systems, deductibles, coinsurance, and completion of forms.",
    outcomes: [
      "Compare common health insurance plans, coverage rules, deductibles, coinsurance, and reimbursement terms.",
      "Use insurance terminology and acronyms accurately.",
      "Complete basic insurance and reimbursement forms using correct documentation."
    ],
    practice: "Students classify plan types and complete insurance form exercises using simulated patient data."
  },
  {
    number: "MED 112",
    title: "Microsoft Office",
    hours: 36,
    prerequisites: "None",
    description: "Word processing with current Microsoft Word software while continuing keyboarding skills for speed and accuracy.",
    outcomes: [
      "Create, format, save, and revise professional medical office documents.",
      "Use keyboarding habits that support speed, accuracy, and workplace productivity.",
      "Apply document standards for healthcare correspondence and internal office records."
    ],
    practice: "Students create medical office correspondence, a simple table, and a formatted workplace document."
  },
  {
    number: "COD 113",
    title: "Electronic Coding for Systems: Integumentary, Skeletal, Muscular, Auditory and Ophthalmic",
    hours: 120,
    prerequisites: "MET 108, HAP 103",
    description: "System-based coding for integumentary, skeletal, muscular, auditory, and ophthalmic systems, including related diseases, pharmacology, radiology, ICD-10-CM, CPT, HCPCS, and evaluation and management coding.",
    outcomes: [
      "Use anatomy, terminology, and documentation clues for listed body systems.",
      "Assign ICD-10-CM, CPT, HCPCS, and evaluation and management codes for system-specific scenarios.",
      "Check code specificity, medical necessity, and supporting documentation."
    ],
    practice: "Students code body-system case scenarios and complete an audit checklist for each encounter."
  },
  {
    number: "COD 114",
    title: "Electronic Coding for Systems: Reproductive, Urinary, and Nervous",
    hours: 120,
    prerequisites: "MET 108, HAP 103",
    description: "System-based coding for male and female reproductive, urinary, and nervous systems, including diseases, pharmacology, ICD-10-CM, CPT, HCPCS, and evaluation and management coding.",
    outcomes: [
      "Identify reproductive, urinary, and nervous system documentation details needed for coding.",
      "Assign diagnosis and procedure codes for related hospital and ambulatory care scenarios.",
      "Review coding rationale and documentation support for each selected code."
    ],
    practice: "Students code reproductive, urinary, and nervous system encounters and explain coding rationale."
  },
  {
    number: "COD 115",
    title: "Electronic Coding for Systems: Cardiovascular, Blood and Lymphatic",
    hours: 120,
    prerequisites: "MET 108, HAP 103",
    description: "System-based coding for cardiovascular, blood, and lymphatic systems, including diseases, pharmacology, ICD-10-CM, CPT, medicine procedural coding, and HCPCS.",
    outcomes: [
      "Interpret cardiovascular, blood, and lymphatic documentation for code assignment.",
      "Assign ICD-10-CM, CPT, medicine procedure, and HCPCS codes for related scenarios.",
      "Use coding guidelines to support correct sequencing and specificity."
    ],
    practice: "Students complete cardiovascular, blood, and lymphatic coding cases with sequencing notes."
  },
  {
    number: "COD 116",
    title: "Electronic Coding for Systems: Endocrine, Digestive and Respiratory",
    hours: 120,
    prerequisites: "MET 108",
    description: "System-based coding for endocrine, digestive, and respiratory systems, with oncology, nuclear medicine, pharmacology, ICD-10-CM, CPT, anesthesia procedural coding, and HCPCS.",
    outcomes: [
      "Identify documentation elements for endocrine, digestive, respiratory, oncology, nuclear medicine, and anesthesia-related coding.",
      "Assign diagnosis, CPT, anesthesia, and HCPCS codes for related encounters.",
      "Audit coding choices for guideline compliance and documentation support."
    ],
    practice: "Students code endocrine, digestive, respiratory, oncology, nuclear medicine, and anesthesia scenarios."
  },
  {
    number: "CDS 135",
    title: "Career Development Skills",
    hours: 40,
    prerequisites: "None",
    description: "Career readiness course focused on self-esteem, personal values, self-discipline, positive coping skills, job searching, and long-term healthcare career success.",
    outcomes: [
      "Prepare healthcare resumes, job-search materials, interview responses, and professional communication.",
      "Build personal accountability, self-discipline, and positive coping strategies for the workplace.",
      "Create a career plan for entry-level billing, coding, and health information roles."
    ],
    practice: "Students submit a resume, interview practice reflection, and career-readiness action plan."
  }
];

const sapCheckpoints = [
  "SAP evaluation 1 at 277 clock hours",
  "SAP evaluation 2 at 555 clock hours",
  "Final SAP evaluation at 1,110 clock hours",
  "Students must maintain at least a 3.0 CGPA and complete the program within the maximum timeframe of 1,665 clock hours."
];

const programBreakdownText = catalogCourses
  .map((course) => `${course.number} ${course.title} - ${course.hours} clock hours (${course.prerequisites === "None" ? "no prerequisite" : `prerequisite: ${course.prerequisites}`})`)
  .join("\n");

function buildCatalogModule(course, index) {
  return {
    title: `${course.number} - ${course.title} (${course.hours} hours)`,
    lessons: [
      catalogLesson(`${course.number} Course Overview`, [
        `${course.number} ${course.title}`,
        `Clock hours: ${course.hours}`,
        "Delivery: Online",
        `Prerequisites: ${course.prerequisites}`,
        "",
        course.description
      ].join("\n"), Math.min(course.hours * 10, 90)),
      catalogLesson(`${course.number} Learning Outcomes`, course.outcomes.map((outcome) => `- ${outcome}`).join("\n"), 45),
      catalogLesson(`${course.number} Applied Practice`, course.practice, 60),
      catalogLesson(`${course.number} Assessment`, [
        `Assessment ${index + 1}: ${course.number} module quiz and applied assignment.`,
        "Students must demonstrate accurate terminology, documentation, billing, coding, compliance, or career-readiness performance aligned to this module."
      ].join("\n"), 45)
    ]
  };
}

const modules = [
  {
    title: "Program Orientation and Catalog Requirements",
    lessons: [
      catalogLesson("Welcome to Medical Billing and Coding", [
        courseDescription,
        "",
        "Credential awarded: Diploma",
        "Total program length: 1,110 clock hours",
        "Delivery method: Online",
        "Catalog tuition and fees: $8,500 tuition, $850 books/supplies, $150 registration fee.",
        "",
        "Program objective: prepare graduates to function effectively as entry-level billing, coding, and health information team members in physician offices, hospitals, medical centers, and other healthcare settings."
      ].join("\n"), 45),
      catalogLesson("Program Objectives", courseObjectives.map((objective) => `- ${objective}`).join("\n"), 45),
      catalogLesson("Catalog Course Breakdown", programBreakdownText, 60),
      catalogLesson("Attendance, SAP, and Graduation Requirements", [
        "Students must maintain at least 80% attendance.",
        "Students must complete each required course, meet each course minimum standard, earn an overall CGPA of 3.0 or higher, and satisfy all financial obligations before diploma issuance.",
        "",
        ...sapCheckpoints.map((checkpoint) => `- ${checkpoint}`)
      ].join("\n"), 45)
    ]
  },
  ...catalogCourses.map(buildCatalogModule),
  {
    title: "Program Capstone and Completion Review",
    lessons: [
      catalogLesson("Billing and Coding Capstone", "Students complete a cumulative capstone that combines patient documentation review, insurance verification, claim preparation, coding, billing follow-up, compliance review, and professional communication.", 90),
      catalogLesson("Graduate Readiness Checklist", "Students verify completion of required courses, SAP requirements, attendance, financial clearance, resume/career documents, and final instructor review before diploma processing.", 45)
    ]
  }
];

const gradeItems = [
  ...catalogCourses.map((course) => ({
    title: `[MBC] ${course.number} ${course.title} Assessment`,
    pointsPossible: course.hours >= 100 ? 100 : 50
  })),
  { title: "[MBC] Midpoint Revenue Cycle Practical", pointsPossible: 100 },
  { title: "[MBC] Coding Systems Practical", pointsPossible: 150 },
  { title: "[MBC] Final Billing and Coding Capstone", pointsPossible: 200 },
  { title: "[MBC] Career Readiness Portfolio", pointsPossible: 100 }
];

const medicalBillingCodingCourse = {
  title: "Medical Billing and Coding",
  slug: "medical-billing-and-coding",
  category: "Diploma Program",
  hours: 1110,
  tuitionCents: 850000,
  booksSuppliesCents: 85000,
  registrationFeeCents: 15000,
  credentialType: "Diploma",
  deliveryMode: "Online",
  description: courseDescription,
  ghlProductKeys: [
    "Medical Billing and Coding",
    "Medical Coding and Billing",
    "MBC",
    "medical-billing-and-coding",
    "medical-coding-and-billing"
  ],
  courseNumber: "MBC",
  credits: 0,
  seedVersion: "catalog-medical-billing-coding-2026-07-10",
  objectives: courseObjectives,
  catalogCourses,
  sapCheckpoints,
  modules,
  gradeItems
};

module.exports = { medicalBillingCodingCourse };
