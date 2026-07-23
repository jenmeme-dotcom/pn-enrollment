const courseDescription =
  "A six-week introduction to nursing course for practical nursing students. The course uses the exported chapter sequence from the LMS build and organizes Chapters 1-6 into one chapter per week. Students review weekly chapter lessons, PowerPoint summaries, multiple-choice quizzes, practical nursing activities, and a comprehensive final exam.";

const courseObjectives = [
  "Describe the identity, purpose, responsibilities, and limits of the practical nurse role.",
  "Explain major historical influences on nursing education, reform, and public trust.",
  "Apply caring, comfort, safety, advocacy, and healing principles to beginning nursing scenarios.",
  "Use basic communication, delegation, teamwork, and scope-of-practice concepts in patient care.",
  "Recognize ethical responsibilities related to confidentiality, boundaries, patient rights, and professional conduct.",
  "Identify legal foundations for documentation, privacy, accountability, and safe practical nursing practice."
];

function bulletList(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function makeQuizQuestion(prompt, choices, correctIndex) {
  return {
    type: "multiple_choice",
    prompt,
    choices: choices.map((choice, index) => ({
      text: choice,
      correct: index === correctIndex
    }))
  };
}

const weeklyModules = [
  {
    number: 1,
    chapter: "Chapter 1",
    title: "Nursing Identity, Purpose, and the Practical Nurse Role",
    dueDate: "Jul 7, 2026",
    powerpointFile: "PN102_Ch01_Nursing_Identity_and_Practical_Nurse_Role.pptx",
    focus:
      "Students begin by defining what practical nursing is, how the practical nurse contributes to safe care, and why professional habits must begin on the first day of training.",
    reading:
      "Read Chapter 1 before class. Pay close attention to definitions of nursing, professional identity, the practical nurse role, student responsibilities, and examples of safe beginning practice.",
    objectives: [
      "Define nursing as a profession focused on safe, compassionate, evidence-informed care.",
      "Describe how the practical nurse role supports patients, families, registered nurses, and the health care team.",
      "Identify student behaviors that demonstrate readiness, accountability, punctuality, and respect.",
      "Explain why scope of practice and supervision protect both the patient and the student nurse."
    ],
    topics: [
      "Purpose of nursing",
      "Practical nurse responsibilities",
      "Professional appearance and communication",
      "Student conduct and readiness",
      "Asking for help before performing unfamiliar care"
    ],
    activities: [
      "Write a short professional identity statement.",
      "Discuss how attendance, preparation, and organization affect patient safety.",
      "Review three scenarios and identify whether the student should proceed, ask for help, or stop."
    ],
    slideOutline: [
      "What is nursing?",
      "The practical nurse role",
      "Professional identity in training",
      "Scope, supervision, and safety",
      "Readiness checklist for class and clinical"
    ],
    quizQuestions: [
      makeQuizQuestion(
        "Which statement best describes the practical nurse role?",
        [
          "Provide safe basic nursing care under the direction required by law and policy.",
          "Practice independently without supervision.",
          "Diagnose patient conditions and prescribe treatment.",
          "Complete only clerical tasks and avoid patient care."
        ],
        0
      ),
      makeQuizQuestion(
        "Why are attendance, preparation, and organization important in nursing school?",
        [
          "They are only school preferences.",
          "They protect patient safety and professional readiness.",
          "They replace the need to study.",
          "They only matter during graduation week."
        ],
        1
      ),
      makeQuizQuestion(
        "What is one lesson associated with Florence Nightingale's influence on nursing?",
        [
          "Using observation, sanitation, and data to improve care.",
          "Avoiding patient assessment.",
          "Keeping health care work informal.",
          "Replacing teamwork with individual decision making."
        ],
        0
      ),
      makeQuizQuestion(
        "When should a practical nursing student ask for help?",
        [
          "Only after an error occurs.",
          "When a task is outside student preparation or permission.",
          "Only if another student asks first.",
          "Never, because asking questions is unprofessional."
        ],
        1
      ),
      makeQuizQuestion(
        "Professional identity begins with which behavior?",
        [
          "Accountability, respectful communication, and readiness to learn.",
          "Ignoring feedback.",
          "Arriving late if the assignment is online.",
          "Avoiding patient interaction."
        ],
        0
      )
    ]
  },
  {
    number: 2,
    chapter: "Chapter 2",
    title: "Nursing History, Reform, Education, and Public Trust",
    dueDate: "Jul 14, 2026",
    powerpointFile: "PN102_Ch02_Nursing_History_Reform_and_Public_Trust.pptx",
    focus:
      "Students connect nursing history to present-day expectations for education, ethics, public trust, and safe entry-level practice.",
    reading:
      "Read Chapter 2 and identify nursing leaders, reform movements, changes in nursing education, and the reasons the public expects nurses to act with honesty and competence.",
    objectives: [
      "Identify selected nursing leaders and explain how their work influenced modern nursing.",
      "Describe how nursing education changed from informal training to structured programs.",
      "Explain how public trust is built through competence, ethics, and patient-centered care.",
      "Connect past health care reform to current expectations for safe practical nursing."
    ],
    topics: [
      "Nursing leaders and reformers",
      "Growth of nursing education",
      "Public trust in nursing",
      "Health care reform",
      "Professional standards over time"
    ],
    activities: [
      "Create a short timeline of nursing history.",
      "Choose one nursing leader and explain one contribution to patient care.",
      "Discuss how public trust can be damaged and restored in health care."
    ],
    slideOutline: [
      "Early nursing and reform",
      "Nursing leaders",
      "Education and standards",
      "Public trust",
      "Lessons for practical nursing students"
    ],
    quizQuestions: [
      makeQuizQuestion(
        "Public trust in nursing is most strongly supported by which behavior?",
        [
          "Competence, honesty, confidentiality, and respectful care.",
          "Sharing patient stories online.",
          "Avoiding documentation.",
          "Completing tasks without asking questions."
        ],
        0
      ),
      makeQuizQuestion(
        "Mary Eliza Mahoney is recognized for which contribution?",
        [
          "First professionally trained Black nurse in the United States.",
          "Inventing the stethoscope.",
          "Creating the first ambulance service.",
          "Writing the first medication order system."
        ],
        0
      ),
      makeQuizQuestion(
        "Why did nursing education become more structured over time?",
        [
          "To create formal standards for safe practice.",
          "To remove science from nursing.",
          "To make patient care less consistent.",
          "To reduce the need for supervision."
        ],
        0
      ),
      makeQuizQuestion(
        "A reform-minded nurse should do what when unsafe conditions are identified?",
        [
          "Ignore the issue if the shift is busy.",
          "Identify unsafe conditions and advocate through the proper chain of command.",
          "Tell only classmates.",
          "Post the concern publicly before reporting it."
        ],
        1
      ),
      makeQuizQuestion(
        "Which action best protects the public's trust in the nursing profession?",
        [
          "Follow policy and report concerns appropriately.",
          "Guess when unsure.",
          "Skip assigned learning activities.",
          "Discuss patient information with friends."
        ],
        0
      )
    ]
  },
  {
    number: 3,
    chapter: "Chapter 3",
    title: "Caring, Comfort, Safety, Advocacy, and Healing",
    dueDate: "Jul 21, 2026",
    powerpointFile: "PN102_Ch03_Caring_Comfort_Safety_Advocacy_and_Healing.pptx",
    focus:
      "Students practice seeing the patient as a whole person and learn how caring behaviors support comfort, safety, healing, and trust.",
    reading:
      "Read Chapter 3 and note examples of caring communication, comfort measures, safety awareness, advocacy, and patient-centered healing.",
    objectives: [
      "Describe caring behaviors that support dignity and trust.",
      "Identify basic comfort measures appropriate for beginning practical nursing students.",
      "Explain how safety and advocacy are connected in patient care.",
      "Apply patient-centered thinking to common classroom and clinical scenarios."
    ],
    topics: [
      "Caring and therapeutic presence",
      "Comfort and dignity",
      "Safety basics",
      "Advocacy for patient concerns",
      "Healing and whole-person care"
    ],
    activities: [
      "Role-play a patient who is anxious before a procedure.",
      "Identify safety risks in a patient room scenario.",
      "Write one advocacy statement a student nurse could use when reporting a concern."
    ],
    slideOutline: [
      "Caring as professional action",
      "Comfort measures",
      "Safety and risk awareness",
      "Patient advocacy",
      "Healing and dignity"
    ],
    quizQuestions: [
      makeQuizQuestion(
        "Which action best demonstrates caring in nursing?",
        [
          "Respect, comfort, listening, and protecting dignity.",
          "Completing tasks without speaking to the patient.",
          "Ignoring emotional needs.",
          "Using medical words the patient does not understand."
        ],
        0
      ),
      makeQuizQuestion(
        "A patient is anxious and asks what will happen next. What is the best student response?",
        [
          "Tell the patient not to worry and leave.",
          "Use calm communication and explain what you are allowed to explain.",
          "Tell the patient to ask another student.",
          "Ignore the question because it is not physical care."
        ],
        1
      ),
      makeQuizQuestion(
        "Which example shows patient advocacy?",
        [
          "Reporting a patient concern promptly to the instructor or nurse.",
          "Keeping concerns private to avoid bothering staff.",
          "Changing a care plan alone.",
          "Promising a result the student cannot control."
        ],
        0
      ),
      makeQuizQuestion(
        "Which is an appropriate basic comfort measure?",
        [
          "Repositioning, privacy, and reporting pain concerns.",
          "Ignoring pain because medication is not due.",
          "Discussing another patient's condition.",
          "Removing safety equipment without permission."
        ],
        0
      ),
      makeQuizQuestion(
        "Whole-person care means the nurse considers which needs?",
        [
          "Only the diagnosis.",
          "Physical, emotional, cultural, safety, and learning needs.",
          "Only the vital signs.",
          "Only the tasks assigned on the checklist."
        ],
        1
      )
    ]
  },
  {
    number: 4,
    chapter: "Chapter 4",
    title: "Health Care Team, Scope, Delegation, Collaboration, and Communication",
    dueDate: "Jul 28, 2026",
    powerpointFile: "PN102_Ch04_Health_Care_Team_Scope_Delegation_and_Communication.pptx",
    focus:
      "Students learn how practical nurses communicate within the health care team, recognize scope limits, and participate in safe delegation and collaboration.",
    reading:
      "Read Chapter 4 and focus on the health care team, SBAR, delegation principles, scope of practice, supervision, and conflict prevention.",
    objectives: [
      "Identify members of the health care team and describe the practical nurse's contribution.",
      "Use SBAR to organize basic patient information.",
      "Explain the difference between assignment, delegation, and supervision.",
      "Recognize when a task or decision is outside practical nursing student scope."
    ],
    topics: [
      "Health care team roles",
      "SBAR communication",
      "Scope of practice",
      "Delegation and supervision",
      "Closed-loop communication"
    ],
    activities: [
      "Write an SBAR report from a short patient scenario.",
      "Sort example tasks into appropriate, ask first, or not appropriate for a student.",
      "Practice closed-loop communication for a patient safety concern."
    ],
    slideOutline: [
      "The health care team",
      "Practical nurse collaboration",
      "SBAR report structure",
      "Delegation safety",
      "Scope and supervision"
    ],
    quizQuestions: [
      makeQuizQuestion(
        "What is the purpose of SBAR?",
        [
          "To organize important patient information clearly.",
          "To replace documentation.",
          "To avoid speaking with the nurse.",
          "To decide medication orders."
        ],
        0
      ),
      makeQuizQuestion(
        "Safe delegation includes which principle?",
        [
          "Appropriate task, competent person, clear direction, and supervision.",
          "Giving any task to anyone available.",
          "Avoiding follow-up.",
          "Delegating tasks outside legal scope."
        ],
        0
      ),
      makeQuizQuestion(
        "Why is scope of practice important?",
        [
          "It protects the patient, nurse, student, and facility.",
          "It allows students to do any task.",
          "It only applies after graduation.",
          "It removes the need for supervision."
        ],
        0
      ),
      makeQuizQuestion(
        "Closed-loop communication means the receiver should:",
        [
          "Repeat back and confirm the message.",
          "Ignore unclear instructions.",
          "Assume the sender knows the task is done.",
          "Avoid asking questions."
        ],
        0
      ),
      makeQuizQuestion(
        "How does a practical nurse collaborate with an RN?",
        [
          "By reporting patient changes and completing assigned care within scope.",
          "By independently changing the medical plan.",
          "By diagnosing the patient.",
          "By avoiding communication during busy shifts."
        ],
        0
      )
    ]
  },
  {
    number: 5,
    chapter: "Chapter 5",
    title: "Ethics in Nursing, Boundaries, Confidentiality, and Patient Rights",
    dueDate: "Aug 4, 2026",
    powerpointFile: "PN102_Ch05_Ethics_Boundaries_Confidentiality_and_Patient_Rights.pptx",
    focus:
      "Students apply ethical decision-making to confidentiality, professional boundaries, patient rights, privacy, and respectful care.",
    reading:
      "Read Chapter 5 and highlight examples of ethical conduct, confidentiality, informed consent, patient rights, boundaries, and social media risks.",
    objectives: [
      "Define confidentiality and explain why it is required in all care settings.",
      "Identify professional boundary concerns and appropriate responses.",
      "Describe basic patient rights related to dignity, privacy, information, and choice.",
      "Apply ethical thinking to common beginning nursing scenarios."
    ],
    topics: [
      "Ethical principles",
      "Confidentiality and privacy",
      "Patient rights",
      "Professional boundaries",
      "Social media and patient information"
    ],
    activities: [
      "Review confidentiality scenarios and choose the safest response.",
      "Identify boundary crossings in short examples.",
      "Write an ethical response to a patient rights concern."
    ],
    slideOutline: [
      "Ethics in practical nursing",
      "Patient rights",
      "Confidentiality",
      "Professional boundaries",
      "Social media safety"
    ],
    quizQuestions: [
      makeQuizQuestion(
        "What does confidentiality require?",
        [
          "Sharing only with authorized people for patient care.",
          "Discussing patient stories without names.",
          "Posting patient situations online if no photo is used.",
          "Telling family members anything they request."
        ],
        0
      ),
      makeQuizQuestion(
        "Which social media action is safest?",
        [
          "Never post patient information, images, or care details.",
          "Post only if the patient's name is removed.",
          "Post if the patient is interesting.",
          "Post if the account is private."
        ],
        0
      ),
      makeQuizQuestion(
        "Patient autonomy means the patient has the right to:",
        [
          "Make informed choices about care when able.",
          "Control every staff assignment.",
          "Ignore all safety rules.",
          "Receive only the care family members choose."
        ],
        0
      ),
      makeQuizQuestion(
        "Which situation may be a professional boundary concern?",
        [
          "Accepting expensive personal gifts from a patient.",
          "Introducing yourself before care.",
          "Explaining what you are doing.",
          "Reporting patient pain."
        ],
        0
      ),
      makeQuizQuestion(
        "If a student sees unsafe or unethical care, the best action is to:",
        [
          "Stop, protect the patient if needed, report to the instructor or nurse, and follow policy.",
          "Ignore it to avoid conflict.",
          "Post online for advice.",
          "Confront the patient."
        ],
        0
      )
    ]
  },
  {
    number: 6,
    chapter: "Chapter 6",
    title: "Legal Foundations, Scope of Practice, Documentation, Privacy, and Accountability",
    dueDate: "Aug 11, 2026",
    powerpointFile: "PN102_Ch06_Legal_Foundations_Scope_Documentation_and_Accountability.pptx",
    focus:
      "Students connect legal foundations to daily practical nursing responsibilities, including privacy, documentation, incident reporting, and accountability.",
    reading:
      "Read Chapter 6 and review scope of practice, nurse practice acts, documentation standards, HIPAA, negligence, incident reporting, and accountability.",
    objectives: [
      "Identify legal sources that guide practical nursing practice.",
      "Describe accurate, timely, objective, and complete documentation.",
      "Explain privacy requirements and basic HIPAA responsibilities.",
      "Recognize accountability in reporting, documentation, and safe care."
    ],
    topics: [
      "Nurse practice act and rules",
      "Documentation principles",
      "HIPAA and privacy",
      "Negligence and accountability",
      "Incident reporting"
    ],
    activities: [
      "Convert subjective statements into objective documentation.",
      "Identify protected health information in examples.",
      "Practice reporting a change in patient condition using SBAR."
    ],
    slideOutline: [
      "Legal foundations of practical nursing",
      "Documentation standards",
      "Privacy and HIPAA",
      "Negligence prevention",
      "Accountability and incident reporting"
    ],
    quizQuestions: [
      makeQuizQuestion(
        "Good nursing documentation should be:",
        [
          "Timely, factual, objective, and complete.",
          "Based on opinions and memory only.",
          "Entered at the end of the month.",
          "Written only when something goes wrong."
        ],
        0
      ),
      makeQuizQuestion(
        "HIPAA protects:",
        [
          "Protected health information.",
          "Only staff schedules.",
          "Only supply lists.",
          "Only public health flyers."
        ],
        0
      ),
      makeQuizQuestion(
        "Which action could be considered negligent?",
        [
          "Failing to report a serious change in patient condition.",
          "Asking the instructor before an unfamiliar task.",
          "Documenting objective facts.",
          "Following facility policy."
        ],
        0
      ),
      makeQuizQuestion(
        "Scope of practice is guided by:",
        [
          "The nurse practice act, board rules, school policy, and facility policy.",
          "Classmate opinion.",
          "Social media examples.",
          "Only personal preference."
        ],
        0
      ),
      makeQuizQuestion(
        "The purpose of an incident report is to:",
        [
          "Document facts for safety review and follow-up.",
          "Blame one person publicly.",
          "Replace the medical record.",
          "Avoid telling the instructor."
        ],
        0
      )
    ]
  }
];

const finalExamQuestions = [
  makeQuizQuestion(
    "Which behavior best represents professional identity for a beginning practical nursing student?",
    ["Accountability and readiness", "Ignoring feedback", "Arriving unprepared", "Avoiding communication"],
    0
  ),
  makeQuizQuestion(
    "Which nursing leader is associated with sanitation, observation, and data-informed care?",
    ["Florence Nightingale", "Clara Barton", "Lillian Wald", "Mary Breckinridge"],
    0
  ),
  makeQuizQuestion(
    "What is the best response when a patient states a concern that may affect safety?",
    ["Report the concern promptly", "Wait until the next week", "Keep it private", "Tell another student only"],
    0
  ),
  makeQuizQuestion(
    "SBAR is used to:",
    ["Organize communication", "Replace charting", "Order medication", "Hide missing information"],
    0
  ),
  makeQuizQuestion(
    "Which action protects confidentiality?",
    ["Discussing patient information only with authorized care team members", "Posting de-identified stories online", "Sharing details with friends", "Leaving records open in public"],
    0
  ),
  makeQuizQuestion(
    "Documentation should be:",
    ["Objective and timely", "Based on guesses", "Delayed until memory is unclear", "Written only by classmates"],
    0
  ),
  makeQuizQuestion(
    "Which patient right is connected to autonomy?",
    ["The right to make informed choices", "The right to ignore all safety policies", "The right to assign staff", "The right to see other patients' records"],
    0
  ),
  makeQuizQuestion(
    "A student is asked to perform a task they have not been checked off to perform. What should the student do?",
    ["Stop and ask the instructor or nurse before proceeding", "Perform it quickly", "Ask another student to do it", "Guess from memory"],
    0
  ),
  makeQuizQuestion(
    "Which phrase best describes whole-person care?",
    ["Care that considers physical, emotional, cultural, safety, and learning needs", "Care focused only on the diagnosis", "Care without communication", "Care focused only on paperwork"],
    0
  ),
  makeQuizQuestion(
    "Which source helps define legal nursing practice?",
    ["Nurse practice act and board rules", "Social media", "Classmate preference", "A patient blog"],
    0
  ),
  makeQuizQuestion(
    "Professional boundaries help protect:",
    ["The patient, student, nurse, and therapeutic relationship", "Only the school budget", "Only the instructor schedule", "Only the gradebook"],
    0
  ),
  makeQuizQuestion(
    "Which action supports public trust in nursing?",
    ["Competent, honest, respectful care", "Sharing patient stories", "Avoiding documentation", "Ignoring safety concerns"],
    0
  )
];

function buildChapterLessonContent(week) {
  return [
    `<h2>${week.chapter}: ${week.title}</h2>`,
    `<p>${week.focus}</p>`,
    `<h3>Required reading</h3>`,
    `<p>${week.reading}</p>`,
    `<h3>Learning objectives</h3>`,
    bulletList(week.objectives),
    `<h3>Key topics</h3>`,
    bulletList(week.topics),
    `<h3>Learning activities</h3>`,
    bulletList(week.activities),
    `<h3>Before moving on</h3>`,
    `<p>Review your chapter notes, complete the PowerPoint review, and take the weekly quiz. Bring questions to the instructor before the next course meeting.</p>`
  ].join("\n");
}

function buildPowerPointContent(week) {
  return [
    `<h2>${week.chapter} PowerPoint Review</h2>`,
    `<p>This item represents the weekly PowerPoint that should be uploaded or attached for instructor/student use.</p>`,
    `<p><strong>File name:</strong> ${week.powerpointFile}</p>`,
    `<h3>Slide outline</h3>`,
    bulletList(week.slideOutline),
    `<p>Instructor note: keep the PowerPoint aligned with ${week.chapter}, then attach the actual slide file when available.</p>`
  ].join("\n");
}

function buildQuizContent(week) {
  return [
    `<h2>${week.chapter} Quiz</h2>`,
    `<p><strong>Due:</strong> ${week.dueDate} by 11:59 PM. <strong>Points:</strong> 10.</p>`,
    `<div class="quiz-instructions">`,
    `<h3>Instructions before you begin</h3>`,
    bulletList([
      "Review the chapter lesson and PowerPoint before opening the quiz.",
      "This quiz contains multiple-choice questions only.",
      "Choose the best answer for each question.",
      "Submit the quiz before the due date listed above.",
      "Contact your instructor before the deadline if you have a technical issue."
    ]),
    `<button type="button" class="quiz-start-button">Start Quiz</button>`,
    `</div>`,
    `<h3>Questions</h3>`,
    week.quizQuestions
      .map(
        (question, questionIndex) => `
          <section class="quiz-question">
            <h4>${questionIndex + 1}. ${question.prompt}</h4>
            <ol type="A">
              ${question.choices.map((choice) => `<li>${choice.text}</li>`).join("")}
            </ol>
          </section>`
      )
      .join("\n")
  ].join("\n");
}

function buildFinalExamContent() {
  return [
    `<h2>Introduction to Nursing Final Exam</h2>`,
    `<p>This final exam covers Chapters 1-6 and measures beginning understanding of practical nursing identity, history, caring, teamwork, ethics, legal responsibilities, documentation, and privacy.</p>`,
    `<div class="quiz-instructions">`,
    `<h3>Instructions before you begin</h3>`,
    bulletList([
      "Review all six weekly lessons and PowerPoints before starting.",
      "The final exam is multiple choice only.",
      "Answer every question before submitting.",
      "The exam is designed as a comprehensive review of the six-week course.",
      "Contact your instructor before starting if you need testing accommodations."
    ]),
    `<button type="button" class="quiz-start-button">Start Final Exam</button>`,
    `</div>`,
    `<h3>Questions</h3>`,
    finalExamQuestions
      .map(
        (question, questionIndex) => `
          <section class="quiz-question">
            <h4>${questionIndex + 1}. ${question.prompt}</h4>
            <ol type="A">
              ${question.choices.map((choice) => `<li>${choice.text}</li>`).join("")}
            </ol>
          </section>`
      )
      .join("\n")
  ].join("\n");
}

function buildWeeklyLessons(week) {
  return [
    {
      title: `[PN102 2026] ${week.chapter}: ${week.title}`,
      type: "Page",
      itemType: "Page",
      dueDate: week.dueDate,
      status: "published",
      content: buildChapterLessonContent(week)
    },
    {
      title: `[PN102 2026] ${week.chapter} PowerPoint Review`,
      type: "File",
      itemType: "File",
      dueDate: week.dueDate,
      status: "published",
      fileName: week.powerpointFile,
      content: buildPowerPointContent(week)
    },
    {
      title: `[PN102 2026] Quiz ${week.number} - ${week.chapter}`,
      type: "Quiz",
      itemType: "Quiz",
      dueDate: week.dueDate,
      pointsPossible: 10,
      status: "published",
      instructions:
        "Read each question and select the best answer. This weekly quiz contains multiple-choice questions only.",
      questions: week.quizQuestions,
      quizQuestions: week.quizQuestions,
      content: buildQuizContent(week)
    }
  ];
}

const gradeItems = [
  ...weeklyModules.map((week) => ({
    title: `[PN102 2026] Quiz ${week.number} - ${week.chapter}`,
    type: "Quiz",
    points: 10,
    dueDate: week.dueDate
  })),
  {
    title: "[PN102 2026] Final Exam - Introduction to Nursing Chapters 1-6",
    type: "Exam",
    points: 100,
    dueDate: "Aug 13, 2026"
  }
];

const policies = {
  grading:
    "Weekly multiple-choice quizzes are due at the end of each week. The final exam covers Chapters 1-6. Late work requires instructor approval.",
  communication:
    "Students should use LMS inbox, announcements, and scheduled class communication for course questions. Urgent issues should be reported to the instructor as soon as possible.",
  professionalism:
    "Students are expected to be prepared, organized, respectful, and accountable. Professional behavior is required in all course activities.",
  academicIntegrity:
    "All quiz and exam submissions must reflect the student's own work. Unauthorized sharing of answers or exam content is prohibited."
};

const modules = [
  {
    title: "Orientation and Course Resources",
    description:
      "Course overview, expectations, schedule, communication standards, and the six-week chapter plan.",
    lessons: [
      {
        title: "Course Welcome and Expectations",
        type: "Page",
        itemType: "Page",
        status: "published",
        content: [
          `<h2>Welcome to Introduction to Nursing</h2>`,
          `<p>${courseDescription}</p>`,
          `<h3>Course details</h3>`,
          bulletList([
            "Course code: PN 102",
            "Length: 6 weeks",
            "Credits: 3",
            "Contact hours: 100",
            "Delivery: Online / Zoom",
            "Weekly structure: chapter lesson, PowerPoint review, quiz, and learning activity"
          ]),
          `<h3>Course objectives</h3>`,
          bulletList(courseObjectives)
        ].join("\n")
      },
      {
        title: "How This Course Builds a Practical Nurse",
        type: "Page",
        itemType: "Page",
        status: "published",
        content: [
          `<h2>How This Course Builds a Practical Nurse</h2>`,
          `<p>This course introduces the professional habits students will use throughout the practical nursing program: preparation, communication, safety, accountability, ethics, and respect for patient rights.</p>`,
          `<p>Students should complete each weekly chapter in order. Each quiz checks readiness before moving to the next week.</p>`
        ].join("\n")
      }
    ]
  },
  ...weeklyModules.map((week) => ({
    title: `Week ${week.number}: ${week.title}`,
    description: `${week.chapter} lesson, PowerPoint review, and weekly multiple-choice quiz.`,
    lessons: buildWeeklyLessons(week)
  })),
  {
    title: "Final Exam and Course Wrap-Up",
    description:
      "Comprehensive final exam covering Introduction to Nursing Chapters 1-6.",
    lessons: [
      {
        title: "[PN102 2026] Final Exam - Introduction to Nursing Chapters 1-6",
        type: "Quiz",
        itemType: "Quiz",
        dueDate: "Aug 13, 2026",
        pointsPossible: 100,
        status: "published",
        instructions:
          "Complete the comprehensive final exam after reviewing Chapters 1-6. This final exam contains multiple-choice questions only.",
        questions: finalExamQuestions,
        quizQuestions: finalExamQuestions,
        content: buildFinalExamContent()
      },
      {
        title: "Course Completion Reflection",
        type: "Assignment",
        itemType: "Assignment",
        dueDate: "Aug 13, 2026",
        pointsPossible: 20,
        status: "published",
        content: [
          `<h2>Course Completion Reflection</h2>`,
          `<p>Write a short reflection describing three professional nursing habits you developed during this course and how you will carry them into the next nursing course.</p>`
        ].join("\n")
      }
    ]
  }
];

const introNursingCourse = {
  title: "Introduction to Nursing for Practical Nursing Students",
  slug: "introduction-to-nursing-practical-nursing",
  seedVersion: "2026-07-21-six-week-chapters-1-6-quizzes-powerpoints-final",
  category: "Practical Nursing Course",
  hours: 100,
  credentialType: "Course Completion",
  deliveryMode: "Online / Zoom",
  duration: "6 weeks",
  description: courseDescription,
  ghlProductKeys: [
    "introduction-to-nursing",
    "intro-to-nursing",
    "pn-102",
    "pn102",
    "practical-nursing-intro"
  ],
  courseNumber: "PN 102",
  credits: 3,
  requiredTitles: [
    "Instructor-assigned Introduction to Nursing chapter materials",
    "Current student handbook and program policies",
    "Clinical site policies as assigned by instructor"
  ],
  policies,
  objectives: courseObjectives,
  weeks: weeklyModules,
  modules,
  gradeItems
};

module.exports = { introNursingCourse };
