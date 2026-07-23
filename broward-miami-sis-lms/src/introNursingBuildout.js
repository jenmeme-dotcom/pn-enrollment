const courseDescription =
  "A 12-week introduction to nursing course for practical nursing students that explores the history and purpose of nursing, influential nursing leaders, the practical nurse role today, ethical and legal responsibilities, professional identity, and the impact students can make in patient care and the community.";

const courseObjectives = [
  "Explain how nursing developed from early caregiving and hospital reform into today's evidence-informed, patient-centered profession.",
  "Describe the contributions of selected nursing leaders and connect their work to modern practical nursing practice.",
  "Identify the purpose of nursing, including health promotion, illness prevention, comfort, advocacy, safety, teaching, and support across the lifespan.",
  "Compare nursing practice in earlier eras with nursing today, including changes in education, technology, infection control, documentation, patient rights, teamwork, and cultural expectations.",
  "Apply beginning ethical principles, including autonomy, beneficence, nonmaleficence, justice, fidelity, veracity, confidentiality, professional boundaries, and respect for human dignity.",
  "Describe legal responsibilities of the practical nurse, including scope of practice, delegation, documentation, privacy, informed consent, negligence, malpractice, incident reporting, and mandatory reporting.",
  "Demonstrate beginning professional behaviors through communication, accountability, teamwork, self-reflection, and readiness to learn.",
  "Explain how practical nursing students can make a positive impact through safe care, compassion, advocacy, health teaching, cultural humility, and community service."
];

const weeklyModules = [
  {
    week: 1,
    title: "Welcome to Nursing: Identity, Purpose, and the Practical Nurse Role",
    nursingLeaders: "Florence Nightingale and Clara Barton",
    focus:
      "Students begin forming a professional nursing identity by examining what nursing is, why it matters, and how practical nurses contribute to safe, compassionate care.",
    objectives: [
      "Define nursing in student-friendly language and compare it with common public assumptions.",
      "Describe the purpose of nursing in hospitals, long-term care, home care, clinics, and community settings.",
      "Identify basic expectations of a practical nursing student, including attendance, preparation, conduct, and accountability."
    ],
    topics: [
      "Course orientation and expectations",
      "What nursing meant historically and what nursing means today",
      "The practical nurse as caregiver, communicator, advocate, team member, and lifelong learner",
      "Florence Nightingale's work in sanitation, observation, data, and reform",
      "Clara Barton's service, disaster response, and humanitarian leadership"
    ],
    activities:
      "Class discussion: 'Why nursing?' Students write a one-page professional beginning reflection on the kind of nurse they hope to become.",
    assessment: "Professional Beginning Reflection"
  },
  {
    week: 2,
    title: "Nursing Then and Now: Caregiving, Reform, Education, and Public Trust",
    nursingLeaders: "Mary Seacole, Mary Eliza Mahoney, and Lillian Wald",
    focus:
      "Students compare nursing in earlier eras with today's profession and discuss how access, race, gender, public health, and education shaped the field.",
    objectives: [
      "Summarize major changes in nursing education, infection control, technology, documentation, and patient rights.",
      "Explain why diversity and public health leadership matter in nursing history.",
      "Connect historic nursing barriers to current expectations for equity and respect."
    ],
    topics: [
      "Nursing before formal schools and licensing",
      "Hospital training schools, community health, and the growth of professional standards",
      "Mary Seacole's battlefield care and resilience",
      "Mary Eliza Mahoney as the first professionally trained Black nurse in the United States",
      "Lillian Wald, public health nursing, settlement work, and care for vulnerable communities"
    ],
    activities:
      "Small-group timeline activity comparing 'nursing back then' with 'nursing today' across education, safety, documentation, and patient voice.",
    assessment: "Quiz 1: Weeks 1-2"
  },
  {
    week: 3,
    title: "The Purpose of Nursing: Caring, Comfort, Safety, Advocacy, and Healing",
    nursingLeaders: "Virginia Henderson and Jean Watson",
    focus:
      "Students examine nursing as both skilled work and human service, with attention to caring, basic needs, comfort, dignity, safety, and advocacy.",
    objectives: [
      "Describe the nurse's role in helping patients meet basic human needs.",
      "Explain how caring behaviors support trust and patient cooperation.",
      "Identify simple advocacy actions practical nursing students can practice during clinical learning."
    ],
    topics: [
      "Nursing as care of the whole person",
      "Basic needs, independence, comfort, and dignity",
      "Therapeutic presence, active listening, and respectful communication",
      "Virginia Henderson's definition of nursing and patient independence",
      "Jean Watson's caring theory and the human side of care"
    ],
    activities:
      "Role-play therapeutic responses to anxious, embarrassed, angry, and grieving patients. Students identify responses that protect dignity.",
    assessment: "Therapeutic Communication Practice"
  },
  {
    week: 4,
    title: "The Health Care Team: Scope, Collaboration, Delegation, and Communication",
    nursingLeaders: "Isabel Hampton Robb and Mildred Montag",
    focus:
      "Students learn how practical nurses fit within the health care team, including collaboration with RNs, providers, nursing assistants, and other disciplines.",
    objectives: [
      "Differentiate beginning practical nurse responsibilities from RN, provider, and assistive personnel roles.",
      "Describe why scope of practice and supervision protect patients and nurses.",
      "Use SBAR-style communication for a basic patient-care concern."
    ],
    topics: [
      "Practical nurse role and limits of student practice",
      "Teamwork, delegation, assignment, and supervision",
      "SBAR communication and closed-loop communication",
      "Isabel Hampton Robb and nursing education standards",
      "Mildred Montag and the development of associate degree nursing education"
    ],
    activities:
      "SBAR practice lab using short patient scenarios. Students identify what to report, who to report to, and what information must be documented.",
    assessment: "Quiz 2: Weeks 3-4"
  },
  {
    week: 5,
    title: "Ethics in Nursing: Values, Boundaries, Confidentiality, and Patient Rights",
    nursingLeaders: "Lavinia Dock and Mabel Keaton Staupers",
    focus:
      "Students apply beginning ethical principles to everyday nursing situations involving dignity, truthfulness, privacy, fairness, and professional boundaries.",
    objectives: [
      "Define common ethical principles used in nursing decisions.",
      "Recognize ethical issues related to privacy, social media, honesty, bias, and boundary crossings.",
      "Use a simple ethical decision-making process for an introductory case."
    ],
    topics: [
      "Autonomy, beneficence, nonmaleficence, justice, fidelity, veracity, and accountability",
      "Confidentiality and privacy as ethical duties",
      "Professional boundaries and social media caution",
      "Patient rights, dignity, and respect for cultural/religious values",
      "Lavinia Dock's advocacy and Mabel Keaton Staupers' civil rights leadership in nursing"
    ],
    activities:
      "Ethics case discussion: A student sees a classmate post about a patient on social media. Students identify the ethical issues and appropriate actions.",
    assessment: "Ethics Case Response"
  },
  {
    week: 6,
    title: "Legal Foundations: Scope of Practice, Documentation, Privacy, and Accountability",
    nursingLeaders: "Dorothea Dix and Susie Walking Bear Yellowtail",
    focus:
      "Students learn the legal foundations that guide safe beginning practice and prepare for the midterm exam.",
    objectives: [
      "Explain why the nurse practice act, board of nursing rules, school policy, and facility policy matter.",
      "Identify legal risks related to unsafe practice, poor documentation, confidentiality breaches, abandonment, and failure to report.",
      "Describe the difference between negligence and malpractice at an introductory level."
    ],
    topics: [
      "Scope of practice and student nurse limitations",
      "HIPAA, confidentiality, and protected health information",
      "Informed consent, refusal of care, incident reporting, and mandatory reporting",
      "Documentation basics: timely, factual, objective, complete, and corrected appropriately",
      "Dorothea Dix's mental health advocacy and Susie Walking Bear Yellowtail's advocacy for Native American health"
    ],
    activities:
      "Documentation correction exercise using sample notes. Students identify objective wording, missing facts, and unsafe language.",
    assessment: "Midterm Exam: Weeks 1-6"
  },
  {
    week: 7,
    title: "Culture, Health Equity, and Respectful Care",
    nursingLeaders: "Madeleine Leininger and Hazel W. Johnson-Brown",
    focus:
      "Students explore cultural humility, social determinants of health, bias, and the nurse's role in respectful, equitable care.",
    objectives: [
      "Define cultural humility and distinguish it from stereotyping.",
      "Identify social factors that can influence health, access, communication, and trust.",
      "Describe practical actions students can take to provide respectful care to every patient."
    ],
    topics: [
      "Culture, religion, language, family roles, and health beliefs",
      "Social determinants of health and barriers to care",
      "Bias, assumptions, and respectful curiosity",
      "Interpreter use and plain-language communication",
      "Madeleine Leininger's transcultural nursing and Hazel W. Johnson-Brown's leadership as an Army nurse and educator"
    ],
    activities:
      "Cultural humility scenario workshop. Students practice asking respectful questions without making assumptions.",
    assessment: "Health Equity Reflection"
  },
  {
    week: 8,
    title: "Safety, Quality, Infection Prevention, and the Nurse's Watchful Eye",
    nursingLeaders: "Linda Richards and Ildaura Murillo-Rohde",
    focus:
      "Students connect nursing observation, safety habits, quality improvement, and infection prevention to patient outcomes.",
    objectives: [
      "Describe the practical nurse's role in preventing harm.",
      "Identify common safety risks, including falls, infection, medication errors, communication breakdowns, and patient identification errors.",
      "Explain how reporting hazards and near misses improves care."
    ],
    topics: [
      "Patient identification, fall prevention, hand hygiene, standard precautions, and infection prevention",
      "Quality improvement, near misses, incident reports, and a just culture mindset",
      "Observation and reporting as core nursing work",
      "Linda Richards and the development of nursing documentation",
      "Ildaura Murillo-Rohde and advocacy for Hispanic nurses"
    ],
    activities:
      "Safety walk-through: students identify hazards in a simulated room and explain what action a beginning practical nursing student should take.",
    assessment: "Quiz 3: Weeks 7-8"
  },
  {
    week: 9,
    title: "Introduction to the Nursing Process and Clinical Judgment",
    nursingLeaders: "Ida Jean Orlando and Patricia Benner",
    focus:
      "Students learn the beginning language of nursing thinking: noticing, collecting data, reporting changes, planning basic care, and evaluating outcomes.",
    objectives: [
      "Name the steps of the nursing process and describe them in practical terms.",
      "Explain the practical nursing student's role in data collection, reporting, implementation, and evaluation under supervision.",
      "Use a simple patient scenario to identify priority concerns and safe next actions."
    ],
    topics: [
      "Assessment/data collection, nursing diagnosis concepts, planning, implementation, and evaluation",
      "Clinical judgment: noticing, interpreting, responding, and reflecting",
      "Prioritization basics and when to ask for help",
      "Ida Jean Orlando's nursing process theory",
      "Patricia Benner's novice-to-expert model"
    ],
    activities:
      "Case mapping exercise: students identify what they noticed, what it might mean, what they would report, and what safe care actions may follow.",
    assessment: "Clinical Judgment Worksheet"
  },
  {
    week: 10,
    title: "Patient Teaching, Health Promotion, and Community Impact",
    nursingLeaders: "Mary Breckinridge and Margaret Sanger",
    focus:
      "Students discuss how practical nurses make an impact through teaching, prevention, maternal-child health, chronic disease support, and community service.",
    objectives: [
      "Describe how patient teaching supports safety, independence, and health outcomes.",
      "Use plain language and teach-back for a basic health topic.",
      "Identify ways practical nursing students can contribute to community wellness."
    ],
    topics: [
      "Health promotion and illness prevention across the lifespan",
      "Teach-back, health literacy, and plain-language education",
      "Community nursing, maternal-child care, chronic disease support, and prevention",
      "Mary Breckinridge and frontier nursing",
      "Margaret Sanger's influence on reproductive health education and the need to discuss controversial history with professionalism"
    ],
    activities:
      "Teaching micro-lab: students create and deliver a three-minute plain-language teaching script using teach-back.",
    assessment: "Quiz 4: Weeks 9-10"
  },
  {
    week: 11,
    title: "Professionalism, Resilience, Leadership, and Lifelong Learning",
    nursingLeaders: "Mary Adelaide Nutting and Luther Christman",
    focus:
      "Students prepare for the responsibilities of nursing school and practice by focusing on professionalism, feedback, resilience, leadership, and growth.",
    objectives: [
      "Identify professional behaviors expected in class, lab, clinical, and the workplace.",
      "Describe healthy responses to feedback, stress, mistakes, and learning challenges.",
      "Explain how practical nurses demonstrate leadership from the bedside."
    ],
    topics: [
      "Professional appearance, punctuality, communication, accountability, and integrity",
      "Managing stress, asking for help, and building safe learning habits",
      "Feedback, remediation, and reflective practice",
      "Leadership at the bedside and advocacy through everyday actions",
      "Mary Adelaide Nutting's educational leadership and Luther Christman's advocacy for nursing roles and men in nursing"
    ],
    activities:
      "Professional development plan: students identify strengths, growth areas, support resources, and habits that will help them succeed.",
    assessment: "Professional Development Plan"
  },
  {
    week: 12,
    title: "Nursing Today and Your Future Impact",
    nursingLeaders: "Student-selected nursing leader review",
    focus:
      "Students synthesize what they learned about nursing's past, present, and future while articulating the impact they hope to make as practical nurses.",
    objectives: [
      "Compare nursing back then, nursing today, and the future direction of nursing.",
      "Explain the student's expected impact on patients, families, teams, and communities.",
      "Prepare for continued practical nursing coursework with a clear sense of purpose and responsibility."
    ],
    topics: [
      "Nursing today: technology, teamwork, evidence, patient rights, community needs, and lifelong learning",
      "How practical nurses make an impact through small, consistent, safe actions",
      "Review of ethical/legal foundations and professional identity",
      "Student-selected leader presentations",
      "Course synthesis and final exam preparation"
    ],
    activities:
      "Final impact presentation: students connect one nursing leader, one ethical/legal responsibility, and one personal commitment to patient care.",
    assessment: "Final Exam and Final Impact Presentation"
  }
];

const weeklyStudyDetails = {
  1: {
    reading:
      "Review the syllabus, attendance expectations, professional behavior policy, grading categories, and the student handbook sections on classroom conduct and communication.",
    keyTerms: ["professional identity", "scope of practice", "accountability", "compassion", "patient advocacy", "lifelong learning"],
    clinicalConnection:
      "A practical nurse begins building trust before performing a skill. Showing up prepared, listening carefully, using respectful language, and reporting concerns early are part of safe care.",
    discussionPrompt:
      "Describe one moment when a nurse or healthcare worker made a difference for a patient or family. What behavior made that person trustworthy?",
    practice:
      "Write a professional beginning statement that includes why you chose nursing, what patients should be able to expect from you, and one habit you will practice this week."
  },
  2: {
    reading:
      "Review the assigned nursing history notes and compare early caregiving, hospital-based training schools, public health nursing, and current practical nursing education.",
    keyTerms: ["public trust", "nursing reform", "professional standards", "public health", "equity", "licensure"],
    clinicalConnection:
      "Patients trust nurses because the profession developed standards for cleanliness, education, documentation, confidentiality, and accountability. Those standards still guide daily practice.",
    discussionPrompt:
      "Choose one nursing leader from this week and explain how that leader's work connects to the way nurses care for patients today.",
    practice:
      "Complete a then-and-now chart comparing nursing education, infection control, patient rights, documentation, and technology."
  },
  3: {
    reading:
      "Review the assigned content on human needs, comfort, dignity, patient-centered care, therapeutic communication, and the nurse's role in supporting independence.",
    keyTerms: ["caring", "comfort", "dignity", "therapeutic communication", "advocacy", "holistic care"],
    clinicalConnection:
      "Patients may remember how a nurse made them feel as much as the task performed. Privacy, warmth, clear explanations, and comfort measures reduce fear and support healing.",
    discussionPrompt:
      "Give an example of a small nursing action that protects patient dignity. Explain why it matters.",
    practice:
      "Role-play a patient who is anxious, embarrassed, angry, or grieving. Practice one helpful response and one response that should be avoided."
  },
  4: {
    reading:
      "Review the practical nurse role, team roles, delegation basics, SBAR communication, reporting expectations, and examples of when a student must notify the instructor.",
    keyTerms: ["collaboration", "delegation", "assignment", "supervision", "SBAR", "closed-loop communication"],
    clinicalConnection:
      "Safe care depends on knowing who is responsible for what. A student protects the patient by staying within role limits, asking questions, and reporting changes promptly.",
    discussionPrompt:
      "Explain why it is unsafe for a student to perform a task without proper instruction, supervision, or permission.",
    practice:
      "Use SBAR to report a change in condition from a short patient scenario. Include what you noticed, what you are concerned about, and what help you need."
  },
  5: {
    reading:
      "Review ethical principles, patient rights, confidentiality, professional boundaries, social media expectations, and the school's conduct standards.",
    keyTerms: ["autonomy", "beneficence", "nonmaleficence", "justice", "fidelity", "veracity", "confidentiality", "boundaries"],
    clinicalConnection:
      "Ethics shows up in ordinary moments: closing a curtain, telling the truth, protecting privacy, not judging, and speaking up when something seems unsafe.",
    discussionPrompt:
      "A classmate posts a patient-related comment online without using the patient's name. Explain the risks and the correct professional response.",
    practice:
      "Work through an ethics case using this pattern: identify the issue, name the ethical principles, decide who should be notified, and choose the safest next action."
  },
  6: {
    reading:
      "Review legal responsibilities, the nurse practice act concept, HIPAA, documentation rules, informed consent, incident reporting, mandatory reporting, negligence, and malpractice.",
    keyTerms: ["scope of practice", "HIPAA", "protected health information", "informed consent", "negligence", "malpractice", "incident report"],
    clinicalConnection:
      "Documentation is a legal record. If care, teaching, refusal, notification, or a change in condition is not documented correctly, the record may not support what happened.",
    discussionPrompt:
      "Why should documentation be factual, timely, objective, and complete? Give one example of wording that should be avoided.",
    practice:
      "Correct a sample nursing note by removing opinions, adding missing facts, and identifying what should be reported to the instructor or nurse."
  },
  7: {
    reading:
      "Review cultural humility, bias, respectful communication, language access, family roles, health beliefs, social determinants of health, and equitable care.",
    keyTerms: ["cultural humility", "bias", "stereotyping", "health equity", "interpreter", "social determinants of health"],
    clinicalConnection:
      "Respectful care means asking rather than assuming. Nurses protect safety when they verify understanding, use interpreter services, and consider barriers that affect follow-through.",
    discussionPrompt:
      "Describe a respectful question a nurse can ask when a patient's health belief, language, or family role is different from the nurse's own experience.",
    practice:
      "Practice a short patient interview that uses plain language, avoids assumptions, and confirms understanding with teach-back."
  },
  8: {
    reading:
      "Review patient identification, fall prevention, hand hygiene, standard precautions, infection prevention, incident reporting, near misses, and quality improvement.",
    keyTerms: ["patient safety", "standard precautions", "fall risk", "near miss", "quality improvement", "just culture"],
    clinicalConnection:
      "The nurse's watchful eye prevents harm. Noticing a wet floor, an unlabeled specimen, a missing armband, or a patient trying to get up alone can prevent injury.",
    discussionPrompt:
      "Explain the difference between blaming a person and improving a process after a safety concern.",
    practice:
      "Complete a safety room scan. List hazards, explain the risk, and identify the correct action for a practical nursing student."
  },
  9: {
    reading:
      "Review the nursing process, data collection, recognizing cues, reporting changes, priorities, implementation, evaluation, and reflection after care.",
    keyTerms: ["nursing process", "assessment", "planning", "implementation", "evaluation", "clinical judgment", "priority"],
    clinicalConnection:
      "Clinical judgment begins with noticing. A student should report abnormal vital signs, new confusion, pain, shortness of breath, bleeding, unsafe behavior, or any unexpected change.",
    discussionPrompt:
      "What does it mean to notice, interpret, respond, and reflect? Apply those steps to one basic patient scenario.",
    practice:
      "Complete a simple case map: cues noticed, possible meaning, priority concern, who to notify, and safe student-level action."
  },
  10: {
    reading:
      "Review health promotion, illness prevention, patient teaching, health literacy, plain language, teach-back, chronic disease support, and community nursing impact.",
    keyTerms: ["health promotion", "health literacy", "teach-back", "plain language", "prevention", "community health"],
    clinicalConnection:
      "Patient teaching is only complete when the patient understands. Teach-back helps the nurse check understanding without embarrassing the patient.",
    discussionPrompt:
      "Choose one health topic and explain how you would teach it in plain language to a patient or family member.",
    practice:
      "Create a three-minute teaching script and include one teach-back question that checks understanding."
  },
  11: {
    reading:
      "Review professionalism, punctuality, appearance, respectful communication, feedback, stress management, remediation, leadership, and reflective practice.",
    keyTerms: ["professionalism", "resilience", "feedback", "remediation", "leadership", "reflective practice"],
    clinicalConnection:
      "Professional behavior builds patient safety. Being late, unprepared, defensive, or disrespectful can affect teamwork and patient confidence.",
    discussionPrompt:
      "Describe one professional habit that will help you succeed in nursing school and one habit you need to strengthen.",
    practice:
      "Build a professional development plan with strengths, growth areas, support resources, and weekly study habits."
  },
  12: {
    reading:
      "Review all weekly notes, nursing leaders, ethical and legal principles, safety themes, communication tools, professional expectations, and final exam study guide.",
    keyTerms: ["professional impact", "lifelong learning", "advocacy", "accountability", "patient-centered care", "professional commitment"],
    clinicalConnection:
      "Nursing impact is built through consistent safe actions: preparing before class, treating patients with dignity, following policy, reporting concerns, and continuing to learn.",
    discussionPrompt:
      "Connect one nursing leader, one ethical or legal responsibility, and one personal commitment you will carry into future courses.",
    practice:
      "Prepare a final impact presentation and complete a final review plan that identifies topics needing more study."
  }
};

function bulletList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function buildWeeklyOverviewContent(week) {
  const details = weeklyStudyDetails[week.week] || {};
  return [
    "Purpose of This Week",
    week.focus,
    "",
    "Nursing Leaders",
    week.nursingLeaders,
    "",
    "Assigned Preparation",
    details.reading || "Review instructor-provided readings, module notes, and related handbook sections before class.",
    "",
    "Core Topics",
    bulletList(week.topics),
    "",
    "Key Vocabulary",
    bulletList(details.keyTerms || []),
    "",
    "Clinical Connection",
    details.clinicalConnection || "Connect this week's concepts to safe beginning practical nursing practice.",
    "",
    "Before You Move On",
    "Students should be able to explain the weekly topic in their own words, connect it to practical nursing responsibilities, and identify when to ask the instructor or supervising nurse for help."
  ].join("\n");
}

function buildWeeklyActivityContent(week) {
  const details = weeklyStudyDetails[week.week] || {};
  return [
    "Learning Objectives",
    bulletList(week.objectives),
    "",
    "Class or Online Learning Activity",
    week.activities,
    "",
    "Student Practice Task",
    details.practice || "Complete the assigned learning activity and submit the required reflection or worksheet.",
    "",
    "Discussion or Reflection Prompt",
    details.discussionPrompt || "Explain how this week's content connects to safe, respectful practical nursing care.",
    "",
    "Evidence of Completion",
    `Assessment: ${week.assessment}.`,
    "",
    "Study Questions",
    bulletList([
      "What are the most important safety points from this week?",
      "What words or ideas do I need to review before the next class?",
      "How does this topic affect patient trust, communication, dignity, or outcomes?",
      "What would I report to the instructor or nurse if I noticed a concern related to this topic?"
    ])
  ].join("\n");
}

const gradeItems = [
  { title: "Class Participation and Professionalism", pointsPossible: 100 },
  { title: "Professional Beginning Reflection", pointsPossible: 50 },
  { title: "Quiz 1: Weeks 1-2", pointsPossible: 50 },
  { title: "Therapeutic Communication Practice", pointsPossible: 50 },
  { title: "Quiz 2: Weeks 3-4", pointsPossible: 50 },
  { title: "Ethics Case Response", pointsPossible: 75 },
  { title: "Midterm Exam: Weeks 1-6", pointsPossible: 150 },
  { title: "Health Equity Reflection", pointsPossible: 50 },
  { title: "Quiz 3: Weeks 7-8", pointsPossible: 50 },
  { title: "Clinical Judgment Worksheet", pointsPossible: 75 },
  { title: "Quiz 4: Weeks 9-10", pointsPossible: 50 },
  { title: "Professional Development Plan", pointsPossible: 50 },
  { title: "Final Impact Presentation", pointsPossible: 50 },
  { title: "Cumulative Final Exam", pointsPossible: 200 }
];

const policies = {
  attendance:
    "Students are expected to attend and participate in all scheduled class sessions. Because this course establishes professional habits, punctuality, preparation, respectful communication, and active participation are evaluated as part of professionalism.",
  quizzes:
    "Short quizzes are scheduled every two weeks in Weeks 2, 4, 8, and 10. Week 6 is reserved for the midterm exam and Week 12 is reserved for the cumulative final exam.",
  ethicsLegal:
    "Ethical and legal instruction is introductory and must be reinforced by the current student handbook, clinical site policy, state nurse practice act, board of nursing rules, and instructor guidance.",
  remediation:
    "Students scoring below the program benchmark on a quiz or exam should complete instructor-assigned remediation before the next major assessment."
};

const modules = [
  {
    title: "Orientation and Course Resources",
    lessons: [
      {
        title: "Course Welcome and Expectations",
        content: [
          "Course Welcome",
          courseDescription,
          "",
          "What Students Should Do First",
          bulletList([
            "Review the syllabus, course schedule, grading categories, and attendance expectations.",
            "Confirm how to access modules, discussions, assignments, quizzes, grades, inbox messages, and calendar reminders.",
            "Read the professionalism expectations for classroom, online, lab, and clinical learning.",
            "Write down instructor contact expectations and how to ask for help before a due date passes."
          ]),
          "",
          "How This Course Fits the Practical Nursing Program",
          "This course introduces the purpose of nursing, the history of the profession, ethical and legal responsibilities, communication, safety, cultural respect, clinical judgment, and professional identity. These ideas support later nursing skills, clinical rotations, and NCLEX-PN preparation.",
          "",
          "Student Success Expectations",
          bulletList([
            "Attend and participate in each scheduled session.",
            "Complete readings and module activities before discussion or class review.",
            "Use respectful communication with classmates, instructors, patients, and staff.",
            "Ask questions early when instructions, grades, attendance, or assignments are unclear.",
            "Protect confidentiality in every classroom, online, and clinical conversation."
          ])
        ].join("\n")
      },
      {
        title: "How This Course Builds a Practical Nurse",
        content: [
          "Professional Foundation",
          "This course helps students connect nursing history, nursing leaders, ethical and legal responsibilities, communication, patient safety, cultural humility, and personal purpose before moving deeper into skills and clinical courses.",
          "",
          "What a Beginning Practical Nursing Student Practices",
          bulletList([
            "Preparing before class and arriving ready to learn.",
            "Using nursing vocabulary accurately and respectfully.",
            "Recognizing the limits of the student role and asking for supervision.",
            "Reporting patient concerns promptly using organized communication.",
            "Documenting and discussing patient information only in approved ways.",
            "Accepting feedback and turning it into safer practice."
          ]),
          "",
          "Course Habits That Carry Into Clinical",
          "The habits built here become clinical habits: punctuality, preparation, hand hygiene, privacy, accurate reporting, respectful care, teamwork, and accountability.",
          "",
          "Checkpoint",
          "By the end of orientation, students should be able to explain how nursing history, ethics, legal duties, communication, and safety connect to the daily work of a practical nurse."
        ].join("\n")
      }
    ]
  },
  ...weeklyModules.map((week) => ({
    title: `Week ${week.week}: ${week.title}`,
    lessons: [
      {
        title: "Weekly Overview",
        content: buildWeeklyOverviewContent(week)
      },
      {
        title: "Objectives and Learning Activity",
        content: buildWeeklyActivityContent(week)
      }
    ]
  })),
  {
    title: "Course Wrap-Up and Final Assessment",
    lessons: [
      {
        title: "Final Review",
        content:
          "Students review nursing history, nursing leaders, practical nurse role expectations, ethical principles, legal responsibilities, safety, professional identity, and the impact of nursing practice."
      },
      {
        title: "Final Exam and Impact Presentation",
        content:
          "Students complete a cumulative final exam and a short final impact presentation connecting nursing history, ethical/legal responsibility, and their personal commitment to patient care."
      }
    ]
  }
];

const introNursingCourse = {
  title: "Introduction to Nursing for Practical Nursing Students",
  slug: "introduction-to-nursing-practical-nursing",
  seedVersion: "2026-07-15-detailed-lessons",
  category: "Practical Nursing Course",
  hours: 48,
  credentialType: "Course Completion",
  deliveryMode: "Campus / blended",
  description: courseDescription,
  ghlProductKeys: [
    "Introduction to Nursing",
    "Intro to Nursing",
    "Practical Nursing Introduction",
    "PN Intro",
    "introduction-to-nursing-practical-nursing"
  ],
  courseNumber: "PN-INTRO",
  credits: 3,
  requiredTitles: [
    "Adopted practical nursing fundamentals textbook or instructor-provided readings",
    "Current student handbook and program policies",
    "Current state nurse practice act and board of nursing guidance as assigned by instructor",
    "Clinical site policies as assigned by instructor"
  ],
  policies,
  objectives: courseObjectives,
  weeks: weeklyModules,
  modules,
  gradeItems
};

module.exports = { introNursingCourse };
