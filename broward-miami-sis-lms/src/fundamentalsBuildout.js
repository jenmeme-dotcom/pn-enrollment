const courseDescription =
  "A 12-week practical nursing fundamentals course based on Wolters Kluwer CoursePoint for Timby's Fundamental Nursing Skills and Concepts, 13th edition, with vSim for LPN/LVN and Lippincott Client Cases for Clinical Judgment.";

const courseObjectives = [
  "Apply the nursing process and Clinical Judgment Measurement Model throughout nursing practice.",
  "Explain homeostasis and its effect on health and illness.",
  "Provide culturally sensitive care and build therapeutic nurse-client relationships.",
  "Use client teaching, legal/ethical standards, and accurate documentation in nursing care.",
  "Demonstrate physical assessment, vital signs, nutrition, fluid balance, asepsis, safety, pain management, perioperative care, activities of daily living, medication administration, elimination, mobility, wound care, gastrointestinal intubation, oxygenation, airway management, resuscitation, and end-of-life care."
];

const weeklyModules = [
  {
    week: 1,
    classroom: "Nursing Foundations; Health and Illness; Homeostasis, Adaptation, and Stress",
    lab: "Orientation; Nursing Foundations; Health and Illness; Homeostasis, Adaptation, and Stress",
    chapters: "CoursePoint chapters 1, 4, 5",
    preClass: "Student Strategies training certificate, One-Minute Nurse quizzes at 80% average, PrepU adaptive quizzes to ML 4.",
    inClass: "CoursePoint orientation, CJMM prompts, Stop/Think/Respond and critical thinking discussion questions.",
    labActivities: "CoursePoint clinical activity orientation, Practice & Learn, vSim, Lippincott Client Cases, Neil O'Leary case, Client Cases second attempt.",
    clinicalPoints: 0
  },
  {
    week: 2,
    classroom: "Nursing Process and Clinical Judgment; Asepsis; Infection Control",
    lab: "Nursing Process and Clinical Judgment; Asepsis; Infection Control",
    chapters: "CoursePoint chapters 2, 10, 22",
    preClass: "One-Minute Nurse quizzes, PrepU adaptive quizzes to ML 4.",
    inClass: "Pre-lecture quiz, CJMM prompts, care-plan orientation, Opal Warfell C. difficile case, PrepU to ML 6 with remediation.",
    labActivities: "Hand hygiene, sterile field, sterile gloves, PPE, Jared Griffin vSim, Luisa Montessori MRSA case, infection-risk care plan.",
    clinicalPoints: 30
  },
  {
    week: 3,
    classroom: "Comfort, Rest, and Sleep; Safety; Pain Management",
    lab: "Comfort, Rest, and Sleep; Safety; Pain Management",
    chapters: "CoursePoint chapters 18, 19, 20",
    preClass: "One-Minute Nurse quizzes, PrepU adaptive quizzes to ML 4.",
    inClass: "Pre-lecture quiz, CJMM prompts, pain and safety case discussions, PrepU to ML 6 with remediation.",
    labActivities: "Occupied/unoccupied bed, back massage, restraints, TENS unit, pain and fall-risk Client Cases, acute pain care plan.",
    clinicalPoints: 23
  },
  {
    week: 4,
    classroom: "Vital Signs; Physical Assessment; Special Examinations and Tests",
    lab: "Vital Signs; Physical Assessment; Special Examinations and Tests",
    chapters: "CoursePoint chapters 12, 13, 14",
    preClass: "Concepts in Action, One-Minute Nurse quizzes, PrepU adaptive quizzes to ML 4.",
    inClass: "Pre-lecture quiz, CJMM prompts, assessment case discussions, PrepU to ML 6 with remediation.",
    labActivities: "Vital signs, physical assessment, glucometer use, Vernon Russell vSim, blood glucose and orthostatic hypotension cases.",
    clinicalPoints: 40
  },
  {
    week: 5,
    classroom: "Nutrition; Fluid and Chemical Balance; Hygiene",
    lab: "Nutrition; Fluid and Chemical Balance; Hygiene",
    chapters: "CoursePoint chapters 15, 16, 17 plus chapter 9 review in lab",
    preClass: "One-Minute Nurse quizzes, PrepU adaptive quizzes to ML 4.",
    inClass: "Pre-lecture quiz, CJMM prompts, dehydration Client Cases, PrepU to ML 6 with remediation.",
    labActivities: "Meal trays, feeding, intake/output, bathing, perineal care, oral care, hair care, dehydration care plan.",
    clinicalPoints: 23
  },
  {
    week: 6,
    classroom: "Body Mechanics, Positioning, and Moving; Fitness and Therapeutic Exercise; Mechanical Immobilization; Ambulatory Aids",
    lab: "Body Mechanics, Positioning, and Moving; Fitness and Therapeutic Exercise; Mechanical Immobilization; Ambulatory Aids",
    chapters: "CoursePoint chapters 23, 24, 25, 26",
    preClass: "PrepU adaptive quizzes to ML 4.",
    inClass: "Pre-lecture quiz, CJMM prompts, mobility case discussions, PrepU to ML 6 with remediation.",
    labActivities: "Turning, transfers, range-of-motion exercises, cast care, arm sling, crutches, canes, walkers, fall-risk care plan.",
    clinicalPoints: 23
  },
  {
    week: 7,
    classroom: "Midterm Summative Exam; Recording and Reporting; Urinary Elimination; Bowel Elimination",
    lab: "Urinary Elimination; Bowel Elimination; Recording and Reporting",
    chapters: "CoursePoint chapters 9, 30, 31",
    preClass: "One-Minute Nurse SBAR quiz, documentation article, PrepU adaptive quizzes to ML 4.",
    inClass: "Midterm, pre-lecture quiz, CJMM prompts, documentation discussion, elimination Client Cases, PrepU to ML 6.",
    labActivities: "Charting, bedpan/urinal, catheterization, Foley irrigation, Kim Johnson and Marvin Hayes vSim, urinary retention care plan.",
    clinicalPoints: 35
  },
  {
    week: 8,
    classroom: "Perioperative Care; Wound Care; Gastrointestinal Intubation",
    lab: "Perioperative Care; Wound Care; Gastrointestinal Intubation",
    chapters: "CoursePoint chapters 27, 28, 29",
    preClass: "Concepts in Action, One-Minute Nurse pressure injury quiz, PrepU adaptive quizzes to ML 4.",
    inClass: "Pre-lecture quiz, CJMM prompts, perioperative/wound case discussions, PrepU to ML 6 with remediation.",
    labActivities: "Antiembolism stockings, pneumatic compression, sterile dressing, wound irrigation, NG tube, Josephine Morrow vSim.",
    clinicalPoints: 35
  },
  {
    week: 9,
    classroom: "Oxygenation; Airway Management; Resuscitation",
    lab: "Oxygenation; Airway Management",
    chapters: "CoursePoint chapters 21, 36",
    preClass: "Concepts in Action, One-Minute Nurse oxygen delivery quiz, PrepU adaptive quizzes to ML 4.",
    inClass: "Pre-lecture quiz, CJMM prompts, respiratory Client Cases, PrepU to ML 6 with remediation.",
    labActivities: "Oxygen assessment, oxygen administration, suctioning, tracheostomy care, oxygen via nasal cannula case, airway care plans.",
    clinicalPoints: 38
  },
  {
    week: 10,
    classroom: "Oral Medications; Topical and Inhalant Medications; Parenteral Medications",
    lab: "Oral Medications; Topical and Inhalant Medications; Parenteral Medications",
    chapters: "CoursePoint chapters 32, 33, 34",
    preClass: "Concepts in Action, One-Minute Nurse medication quizzes, PrepU adaptive quizzes to ML 4.",
    inClass: "Pre-lecture quiz, CJMM prompts, medication route and dosage case, PrepU to ML 6 with remediation.",
    labActivities: "Oral, enteral, topical, eye, ear, nasal, subcutaneous, intramuscular medication skills; polypharmacy/safety care plan.",
    clinicalPoints: 23
  },
  {
    week: 11,
    classroom: "Culture and Ethnicity; Nurse-Client Relationship; Client Teaching; Admission, Discharge, Transfer, and Referrals",
    lab: "Culture and Ethnicity; Nurse-Client Relationship; Client Teaching; Admission, Discharge, Transfer, and Referrals; End-of-Life Care",
    chapters: "CoursePoint chapters 6, 7, 8, 11",
    preClass: "PrepU adaptive quizzes to ML 4.",
    inClass: "Pre-lecture quiz, CJMM prompts, health education and culture Client Cases, PrepU to ML 6 with remediation.",
    labActivities: "Therapeutic communication, discharge teaching plan, end-of-life and postmortem care, health maintenance care plan.",
    clinicalPoints: 20
  },
  {
    week: 12,
    classroom: "Law and Ethics; End-of-Life Care",
    lab: "Comprehensive Skills Performance Review",
    chapters: "CoursePoint chapters 3, 38 and review of all prior chapters",
    preClass: "One-Minute Nurse delegation and end-of-life quizzes, PrepU adaptive quizzes to ML 4.",
    inClass: "Pre-lecture quiz, CJMM prompts, end-of-life Client Cases, PrepU to ML 6 with remediation.",
    labActivities: "Comprehensive skills stations and skills performance evaluation across previously learned skills.",
    clinicalPoints: 60
  }
];

const gradeItems = [
  { title: "Class Preparation Activities", pointsPossible: 120 },
  { title: "Class Follow-up Activities", pointsPossible: 180 },
  { title: "Clinical Preparation and Performance", pointsPossible: 350 },
  { title: "Midterm Summative Exam", pointsPossible: 150 },
  { title: "Cumulative Final Exam", pointsPossible: 200 },
  { title: "Clinical Performance Evaluation", pointsPossible: 0 }
];

const fundamentalsCourse = {
  title: "Fundamental Nursing Skills and Concepts - New Cohort",
  slug: "fundamental-nursing-skills-and-concepts-new-cohort",
  category: "Practical Nursing Course",
  hours: 153,
  credentialType: "Course Completion",
  deliveryMode: "Campus / blended",
  description: courseDescription,
  ghlProductKeys: [
    "Fundamentals",
    "Fundamental Nursing Skills and Concepts",
    "Timby's Fundamental Nursing Skills and Concepts",
    "CoursePoint",
    "Wolters Kluwer",
    "Lippincott",
    "vSim"
  ],
  courseNumber: "PN-FUND",
  credits: 6,
  requiredTitles: [
    "CoursePoint for Donnelly-Moreno, L. (2025). Timby's Fundamental Nursing Skills and Concepts (13th ed.). Wolters Kluwer Health.",
    "vSim for LPN/LVN. Wolters Kluwer Health.",
    "Lippincott Client Cases for Clinical Judgment. Wolters Kluwer Health."
  ],
  policies: {
    preparation: "All assigned pre-class activities must be completed by the due date and meet the required threshold score. PrepU pre-class target is ML 4.",
    followUp: "Post-class PrepU target is ML 6 with remediation for missed questions. PrepU quiz wrappers are used as exam entry tickets.",
    threshold: "The expected threshold score for formative activities is 80% unless a WK activity specifies a higher requirement.",
    clinical: "Clinical performance evaluation is pass/fail and requires expected competency level in all evaluated criteria."
  },
  objectives: courseObjectives,
  weeks: weeklyModules,
  modules: [
    {
      title: "Orientation and Syllabus",
      lessons: [
        {
          title: "Course Overview and WK Product Setup",
          content: `${courseDescription}\n\nRequired products: CoursePoint, vSim for LPN/LVN, and Lippincott Client Cases for Clinical Judgment. Students should complete WK Student Strategies training and confirm access to CoursePoint resources before Week 1.`
        },
        {
          title: "Grading, Mastery, and Remediation Expectations",
          content: "Class preparation is 120 points, class follow-up is 180 points, clinical preparation/performance is 350 points, summative exams are 350 points, and clinical performance is pass/fail. PrepU pre-class work targets ML 4; post-class work targets ML 6 with remediation."
        }
      ]
    },
    ...weeklyModules.map((week) => ({
      title: `Week ${week.week}: ${week.classroom}`,
      lessons: [
        {
          title: "Classroom Focus",
          content: `${week.chapters}\n\n${week.classroom}\n\nPre-class: ${week.preClass}\n\nDuring/post-class: ${week.inClass}`
        },
        {
          title: "Clinical Skills Lab",
          content: `${week.lab}\n\n${week.labActivities}\n\nClinical points for this week: ${week.clinicalPoints}.`
        }
      ]
    })),
    {
      title: "Final Exam and Skills Performance Assessment",
      lessons: [
        {
          title: "Cumulative Final Exam",
          content: "Cumulative final exam aligned to all course objectives and weekly CoursePoint chapter outcomes."
        },
        {
          title: "Skills Performance Assessment",
          content: "Students demonstrate competency in all previously learned skills, including infection control, safety, vital signs, assessment, ADLs, mobility, elimination, oxygenation, airway management, medication administration, wound care, and documentation."
        }
      ]
    }
  ],
  gradeItems
};

module.exports = { fundamentalsCourse };
