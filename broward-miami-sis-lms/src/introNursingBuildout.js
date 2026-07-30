const { quizBanks, quizContent } = require("./nursingCourseQuizzes");

const courseDescription =
  "In this 12-week introduction to nursing course, you will explore the history and purpose of nursing, influential nursing leaders, your role as a practical nurse, your ethical and legal responsibilities, your professional identity, and the positive impact you can make in patient care and your community.";

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

const textbookFileName = "Foundations-of-Nursing-9th-Edition-Cooper-Gosnell.pdf";
const textbookHref = `/course-materials/introduction-to-nursing-practical-nursing/${textbookFileName}`;
const powerPointFileNames = {
  1: "PN102_Ch01_Evolution_of_Nursing.pptx",
  2: "PN102_Ch02_Legal_Ethical_Aspects.pptx",
  3: "PN102_Ch03_Documentation.pptx",
  4: "PN102_Ch04_Communication.pptx",
  5: "PN102_Ch05_Nursing_Process_Critical_Thinking.pptx",
  6: "PN102_Ch06_Cultural_Ethnic_Considerations.pptx",
  7: "PN102_Ch07_Asepsis_Infection_Control.pptx",
  8: "PN102_Ch08_Body_Mechanics_Mobility.pptx",
  9: "PN102_Ch09_Hygiene_Patient_Environment.pptx",
  10: "PN102_Ch10_Safety.pptx",
  11: "PN102_Ch11_Admission_Transfer_Discharge.pptx",
  12: "PN102_Ch12_Vital_Signs.pptx",
  13: "PN102_Ch13_Physical_Assessment.pptx"
};

const extendedWeekChapters = {
  1: [
    { number: 1, title: "The Evolution of Nursing", pages: "1-21", pdfPage: 39, topics: ["history of nursing and nursing education", "development of practical and vocational nursing", "health care delivery systems", "roles and responsibilities of the practical nurse"] }
  ],
  2: [
    { number: 2, title: "Legal and Ethical Aspects of Nursing", pages: "22-39", pdfPage: 60, topics: ["legal system and regulation of practice", "legal issues and avoiding liability", "ethical principles", "advance directives and reporting unethical behavior"] }
  ],
  3: [
    { number: 3, title: "Documentation", pages: "40-59", pdfPage: 78, topics: ["purposes of patient records", "electronic health records and ISBAR", "charting rules and legal standards", "confidentiality and accurate documentation"] }
  ],
  4: [
    { number: 4, title: "Communication", pages: "60-80", pdfPage: 98, topics: ["communication process", "therapeutic communication", "communication barriers", "interprofessional and patient-centered communication"] }
  ],
  5: [
    { number: 5, title: "Nursing Process and Critical Thinking", pages: "81-96", pdfPage: 119, topics: ["assessment and data collection", "patient problems and planning", "implementation and evaluation", "critical thinking and clinical judgment"] }
  ],
  6: [
    { number: 6, title: "Cultural and Ethnic Considerations", pages: "97-116", pdfPage: 135, topics: ["culture, ethnicity, and health beliefs", "cultural humility", "communication and language access", "respectful individualized care"] }
  ],
  7: [
    { number: 7, title: "Asepsis and Infection Control", pages: "117-161", pdfPage: 155, topics: ["microorganisms and the chain of infection", "medical and surgical asepsis", "standard and transmission-based precautions", "infection prevention and reporting"] }
  ],
  8: [
    { number: 8, title: "Body Mechanics and Patient Mobility", pages: "162-188", pdfPage: 200, topics: ["body alignment and ergonomics", "positioning and transfer safety", "range-of-motion exercises", "mobility aids and fall prevention"] }
  ],
  9: [
    { number: 9, title: "Hygiene and Care of the Patient's Environment", pages: "189-236", pdfPage: 227, topics: ["personal hygiene and oral care", "bathing and grooming", "bedmaking and environmental comfort", "skin observation, dignity, and independence"] }
  ],
  10: [
    { number: 10, title: "Safety", pages: "237-261", pdfPage: 275, topics: ["patient identification and environmental safety", "fall, fire, and electrical safety", "restraint alternatives", "incident prevention and reporting"] }
  ],
  11: [
    { number: 11, title: "Admission, Transfer, and Discharge", pages: "262-279", pdfPage: 300, topics: ["admission assessment and orientation", "safe patient transfer", "discharge planning and teaching", "continuity of care and documentation"] }
  ],
  12: [
    { number: 12, title: "Vital Signs", pages: "280-314", pdfPage: 318, topics: ["temperature, pulse, respirations, and blood pressure", "pulse oximetry", "height and weight", "recording and reporting vital signs"] },
    { number: 13, title: "Physical Assessment", pages: "315-341", pdfPage: 353, topics: ["signs and symptoms", "health history", "medical and nursing assessment", "systematic physical assessment"] }
  ]
};

const extendedWeekModuleTitles = {
  1: "The Evolution of Nursing",
  2: "Legal and Ethical Aspects of Nursing",
  3: "Documentation",
  4: "Communication",
  5: "Nursing Process and Critical Thinking",
  6: "Cultural and Ethnic Considerations",
  7: "Asepsis and Infection Control",
  8: "Body Mechanics and Patient Mobility",
  9: "Hygiene and the Patient Environment",
  10: "Safety",
  11: "Admission, Transfer, and Discharge",
  12: "Vital Signs and Physical Assessment"
};

const readingFocusExplanations = {
  1: [
    "History of nursing and nursing education — You will trace how caregiving developed into a regulated profession and how formal education improved the safety and consistency of nursing care.",
    "Development of practical and vocational nursing — You will learn why the practical nurse role was created and how education, licensure, and supervision shape your practice.",
    "Health care delivery systems — You will examine where care is provided, how patients move through the system, and how different members of the health care team work together.",
    "Roles and responsibilities of the practical nurse — You will connect your scope of practice with direct care, observation, reporting, documentation, teaching reinforcement, and collaboration."
  ],
  2: [
    "Legal system and regulation of practice — You will learn how nurse practice acts, board rules, facility policies, and standards of care define what you may do and when you need supervision.",
    "Legal issues and avoiding liability — You will focus on following policy, communicating changes promptly, documenting accurately, and asking for help before performing an unfamiliar or unauthorized task.",
    "Ethical principles — You will use autonomy, beneficence, nonmaleficence, justice, fidelity, and veracity to make respectful, patient-centered decisions.",
    "Advance directives and reporting unethical behavior — You will learn to respect documented patient wishes and use the proper chain of command when you observe unsafe or unethical care."
  ],
  3: [
    "Purposes of patient records — You will see how the health record supports communication, continuity of care, quality improvement, reimbursement, and legal accountability.",
    "Electronic health records and ISBAR — You will practice protecting electronic information and organizing important communication with Introduction, Situation, Background, Assessment, and Recommendation.",
    "Charting rules and legal standards — You will learn to document promptly, objectively, accurately, and completely without assumptions, blame, or prohibited abbreviations.",
    "Confidentiality and accurate documentation — You will protect private information, access only records needed for your role, and correct documentation errors according to policy."
  ],
  4: [
    "Communication process — You will examine how words, tone, body language, environment, culture, and feedback affect whether your message is understood.",
    "Therapeutic communication — You will practice active listening, open-ended questions, clarification, reflection, empathy, and appropriate silence to support your patient.",
    "Communication barriers — You will recognize how pain, anxiety, language differences, hearing or vision changes, assumptions, and medical jargon can interfere with understanding.",
    "Interprofessional and patient-centered communication — You will learn to share clear, relevant information with the health care team while including your patient in decisions and confirming understanding."
  ],
  5: [
    "Assessment and data collection — You will gather subjective and objective information, recognize important cues, and report abnormal or urgent findings promptly.",
    "Patient problems and planning — You will use collected data to identify patient needs, understand priorities, and contribute to realistic, measurable care goals.",
    "Implementation and evaluation — You will provide assigned care safely, observe the patient's response, and determine whether the plan is helping achieve the expected outcome.",
    "Critical thinking and clinical judgment — You will learn to connect cues, risks, priorities, and scope of practice so you can choose the safest next action and know when to seek help."
  ],
  6: [
    "Culture, ethnicity, and health beliefs — You will explore how a person's background and experiences may influence health practices, decision-making, communication, and trust.",
    "Cultural humility — You will practice self-awareness, curiosity, and respectful questions instead of assuming that every person from a group has the same beliefs.",
    "Communication and language access — You will learn to use qualified interpreters, plain language, and teach-back so your patient can understand and participate in care.",
    "Respectful individualized care — You will adapt care when it is safe to do so, protect dignity, and include each patient's preferences, values, and support persons."
  ],
  7: [
    "Microorganisms and the chain of infection — You will identify how infectious organisms spread and where your actions can interrupt transmission.",
    "Medical and surgical asepsis — You will distinguish clean technique from sterile technique and learn how each protects your patient during care and procedures.",
    "Standard and transmission-based precautions — You will select hand hygiene, personal protective equipment, and isolation practices according to the exposure risk and mode of transmission.",
    "Infection prevention and reporting — You will monitor for signs of infection, perform care that reduces risk, and promptly report concerning findings or exposures."
  ],
  8: [
    "Body alignment and ergonomics — You will use a stable base of support, proper alignment, and available equipment to protect yourself and your patient from injury.",
    "Positioning and transfer safety — You will assess your patient's ability, explain the plan, use assistance correctly, and protect lines, tubes, skin, and joints during movement.",
    "Range-of-motion exercises — You will learn how active and passive movement helps maintain joint mobility, circulation, comfort, and function.",
    "Mobility aids and fall prevention — You will use gait belts and prescribed assistive devices safely while identifying fall risks and keeping the environment clear."
  ],
  9: [
    "Personal hygiene and oral care — You will provide individualized hygiene that promotes comfort, prevents infection, protects the mouth and skin, and respects your patient's preferences.",
    "Bathing and grooming — You will support cleanliness and self-esteem while encouraging your patient to do as much as safely possible and protecting privacy throughout care.",
    "Bedmaking and environmental comfort — You will maintain clean, dry, wrinkle-free linens and a safe, organized environment that supports rest, comfort, and skin protection.",
    "Skin observation, dignity, and independence — You will inspect the skin during care, report redness or breakdown, preserve dignity, and promote safe independence rather than doing everything for your patient."
  ],
  10: [
    "Patient identification and environmental safety — You will use approved identifiers, check the care environment, and correct hazards before they cause harm.",
    "Fall, fire, and electrical safety — You will recognize common risks, follow emergency procedures, and use equipment and prevention measures correctly.",
    "Restraint alternatives — You will try the least restrictive safety measures first and understand that restraints require authorization, monitoring, documentation, and ongoing reassessment.",
    "Incident prevention and reporting — You will respond to immediate patient needs, notify the appropriate nurse, document facts in the health record, and complete required safety reports according to policy."
  ],
  11: [
    "Admission assessment and orientation — You will welcome your patient, verify identity, collect essential information, protect belongings, and explain the room, routines, and safety features.",
    "Safe patient transfer — You will communicate current needs, medications, risks, and pending care so responsibility passes safely from one unit or setting to another.",
    "Discharge planning and teaching — You will reinforce instructions using clear language and teach-back so your patient understands medications, follow-up care, warning signs, and available resources.",
    "Continuity of care and documentation — You will record accurate information and communicate unresolved needs so the next caregiver can continue safe, coordinated care."
  ],
  12: [
    "Temperature, pulse, respirations, and blood pressure — You will measure each vital sign accurately, compare results with the patient's baseline, and recognize values or changes that require prompt reporting.",
    "Pulse oximetry — You will obtain a reliable oxygen-saturation reading, consider factors that can affect accuracy, and respond appropriately to low or worsening results.",
    "Height and weight — You will use safe equipment and consistent measurement techniques because changes can affect medication dosing, nutrition assessment, fluid balance, and care planning.",
    "Recording and reporting vital signs — You will document results promptly and communicate abnormal findings, symptoms, trends, and actions taken rather than recording numbers without follow-up."
  ],
  13: [
    "Signs and symptoms — You will distinguish objective signs from subjective symptoms and combine both types of information to understand your patient's condition.",
    "Health history — You will use respectful, organized questions to collect information about current concerns, past health, medications, allergies, daily habits, and support needs.",
    "Medical and nursing assessment — You will understand how the provider's diagnostic examination and the nurse's ongoing assessment contribute different but connected information to patient care.",
    "Systematic physical assessment — You will follow an organized head-to-toe or focused approach, compare findings with expected results, protect comfort and privacy, and report important changes."
  ]
};

const introQuizByWeek = {
  1: { title: "[PN102 2026] Quiz 1 - Chapter 1", questions: quizBanks.introChapter1 },
  2: { title: "[PN102 2026] Quiz 2 - Chapter 2", questions: quizBanks.introChapter2 },
  3: { title: "[PN102 2026] Quiz 3 - Chapter 3", questions: quizBanks.introChapter3 },
  4: { title: "[PN102 2026] Quiz 4 - Chapter 4", questions: quizBanks.introChapter4 },
  5: { title: "[PN102 2026] Quiz 5 - Chapter 5", questions: quizBanks.introChapter5 },
  6: { title: "[PN102 2026] Quiz 6 - Chapter 6", questions: quizBanks.introChapter6 },
  9: { title: "[PN102 2026] Quiz - Chapters 7-9", questions: quizBanks.introChapters7to9 },
  12: { title: "[PN102 2026] Quiz - Chapters 10-13", questions: quizBanks.introChapters10to13 }
};

const powerPointReviewNotes = {
  1: [
    ["What is nursing?", "As a student nurse, you are learning to combine scientific knowledge, clinical skills, observation, communication, compassion, and advocacy so you can help people maintain health, recover from illness, manage chronic conditions, and experience comfort and dignity."],
    ["Your practical nurse role", "As a practical nurse, you will provide direct care, gather and report patient data, administer authorized treatments and medications, reinforce teaching, document care, and collaborate with the registered nurse and health care team."],
    ["Your professional identity in training", "You begin forming your nursing identity now. Arrive prepared, communicate respectfully, accept feedback, protect confidentiality, and take responsibility for your actions and learning."],
    ["Your scope, supervision, and safety", "You must know which tasks you may perform, which require supervision, and when you must report a change in condition. When you are uncertain, stop and ask before proceeding."],
    ["Your readiness for class and clinical", "Read your assigned material, review your skills, bring required supplies, arrive on time, follow dress and identification requirements, and be ready to explain your patient's main risks and priorities."]
  ],
  2: [
    ["The laws that guide your practice", "Your practice is defined by the nurse practice act, board of nursing rules, facility policies, and your assigned student or practical nurse role. Know what care you may provide and what supervision you need."],
    ["Using ethical principles", "Use autonomy, beneficence, nonmaleficence, justice, fidelity, and veracity to respect your patient's choices, promote good, prevent harm, support fairness, keep promises, and communicate truthfully."],
    ["Protecting patient rights and informed consent", "You must protect each patient's right to understandable information, privacy, participation in decisions, and refusal of care. Confirm that consent is informed and voluntary, and report questions through the appropriate nurse or provider."],
    ["Preventing negligence and liability", "Follow your standards of care, identify your patient correctly, communicate changes promptly, question unsafe directions, document accurately, and never perform a task beyond your training or authorization."],
    ["Maintaining confidentiality and boundaries", "Access and share health information only when you have a legitimate care need. Maintain therapeutic boundaries and never post patient stories, images, or identifying details online."]
  ],
  3: [
    ["How you use the health record", "You use the record to communicate your patient's condition, care, response, and plan to the health care team. Your documentation also supports continuity, quality review, reimbursement, and legal accountability."],
    ["Charting objectively and completely", "Document the measurable findings you observe, the actions you take, the patient's exact statements, and the response to care. Avoid labels, assumptions, vague phrases, blame, and unsupported opinions."],
    ["Charting on time and accurately", "Chart as soon as possible after you provide care, use the correct patient record, include required dates and times, and never document a treatment before you complete it."],
    ["Protecting electronic records", "Protect your password, lock the screen when you leave, access only records assigned to you, and discuss information only with authorized team members in private settings."],
    ["Correcting and reporting clearly", "Correct your errors according to policy without hiding the original entry. Use ISBAR to organize urgent communication, and document significant changes and the people you notified."]
  ],
  4: [
    ["How your communication works", "Your communication includes the message you send, how your patient receives it, the feedback you observe, and the surrounding context. Your tone, posture, facial expression, personal space, and silence may communicate as strongly as your words."],
    ["Using therapeutic communication", "Use active listening, open-ended questions, clarification, reflection, empathy, and appropriate silence to help your patient express concerns and participate in care."],
    ["Removing barriers to understanding", "Avoid medical jargon, rushing, false reassurance, arguing, stereotyping, and excessive questioning. Adapt your approach when your patient has hearing, vision, language, literacy, or cognitive needs."],
    ["Showing language and cultural respect", "Use a qualified interpreter for important information, speak directly to your patient, use plain language, and ask about individual preferences instead of making cultural assumptions."],
    ["Communicating with your team using ISBAR", "Clearly report the situation, relevant background, your current assessment, and your recommendation. Confirm critical instructions through read-back or closed-loop communication."]
  ],
  5: [
    ["How you assess", "Collect subjective information from your patient and objective findings through observation, examination, measurements, records, and communication with the care team. Validate data that are unexpected or inconsistent."],
    ["How you identify patient problems", "Organize the cues you collect, recognize actual or potential concerns, and promptly report findings that suggest deterioration or require care beyond your scope."],
    ["How you plan and prioritize", "Help set measurable, patient-centered outcomes and choose safe authorized interventions. Use ABCs, immediate safety needs, urgency, and your patient's preferences to establish priorities."],
    ["How you implement care", "Carry out your authorized interventions, explain care, protect privacy, use infection-control and safety measures, and document what you performed and how your patient responded."],
    ["How you evaluate and use clinical judgment", "Reassess your patient, compare the results with expected outcomes, decide whether care worked, and communicate when the plan should be continued, changed, or escalated."]
  ],
  6: [
    ["How culture may affect your patient's care", "Remember that culture can influence communication, family roles, food, modesty, pain expression, spiritual practices, treatment preferences, and beliefs about health and illness. Ask rather than assume, because every patient is an individual."],
    ["Practicing cultural humility", "Approach each person with curiosity and respect, recognize the limits of your own knowledge, examine your personal biases, and invite your patient to explain what matters in their care."],
    ["Providing language access", "Use qualified interpreters and translated materials when appropriate. Speak to your patient—not the interpreter—and use teach-back to confirm understanding."],
    ["Recognizing bias, equity, and social needs", "Avoid stereotypes. Consider how transportation, housing, finances, food access, education, disability, and discrimination may affect your patient's ability to follow the plan."],
    ["Providing individualized respectful care", "Ask your patient about preferences, explain procedures before touching, protect dignity, include chosen support people when authorized, and work with the health care team to adapt the plan safely."]
  ]
};

function buildPowerPointReviewContent(chapter) {
  const notes = powerPointReviewNotes[chapter.number]
    || (readingFocusExplanations[chapter.number] || []).map((explanation) => {
      const [topic, ...details] = explanation.split(" — ");
      return [topic, details.join(" — ")];
    });
  const powerPointFileName = powerPointFileNames[chapter.number];
  if (!notes.length || !powerPointFileName) return "";
  const materialBaseHref = "/course-materials/introduction-to-nursing-practical-nursing";
  return [
    `<h2>Chapter ${chapter.number}: ${chapter.title} PowerPoint</h2>`,
    "<p>View the chapter slides in this lesson or download the editable PowerPoint for class review and note-taking.</p>",
    `<p><a href="${materialBaseHref}/${powerPointFileName}">Chapter ${chapter.number} PowerPoint</a></p>`,
    "<h3>Study outline</h3>",
    `<ul>${notes.map(([topic, explanation]) => `<li><strong>${topic}</strong><br>${explanation}</li>`).join("")}</ul>`,
    `<p><strong>Before moving on:</strong> explain each focus area in your own words, connect it to a practical nursing action, and identify what you would observe, do, document, or report.</p>`
  ].join("\n");
}

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
    assessment: "[PN102 2026] Quiz 6 - Chapter 6 and Midterm Exam: Weeks 1-6"
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

const weeklyCoreTopicExplanations = {
  1: [
    "Course orientation and expectations — You will learn how attendance, preparation, communication, assignments, and professional conduct support your success and patient safety.",
    "What nursing meant historically and what nursing means today — You will compare early caregiving with today's educated, licensed, evidence-informed profession.",
    "The practical nurse as caregiver, communicator, advocate, team member, and lifelong learner — You will connect each role with actions you will perform in class, clinical practice, and patient care.",
    "Florence Nightingale's work in sanitation, observation, data, and reform — You will examine how careful observation and a clean environment helped establish modern nursing standards.",
    "Clara Barton's service, disaster response, and humanitarian leadership — You will connect Barton's example with preparedness, courage, organized relief, and service during emergencies."
  ],
  2: [
    "Nursing before formal schools and licensing — You will explore how caregivers learned through experience before standardized education and regulation protected the public.",
    "Hospital training schools, community health, and the growth of professional standards — You will see how education, public health work, and licensure strengthened nursing practice and public trust.",
    "Mary Seacole's battlefield care and resilience — You will examine how clinical skill, resourcefulness, and persistence allowed Seacole to care for soldiers despite discrimination.",
    "Mary Eliza Mahoney as the first professionally trained Black nurse in the United States — You will connect Mahoney's achievement with diversity, opportunity, professionalism, and equity in nursing.",
    "Lillian Wald, public health nursing, settlement work, and care for vulnerable communities — You will learn how nurses can improve health by bringing education and services into the community."
  ],
  3: [
    "Nursing as care of the whole person — You will consider physical, emotional, social, cultural, developmental, and spiritual needs instead of focusing only on a diagnosis.",
    "Basic needs, independence, comfort, and dignity — You will learn to assist safely while encouraging your patient to do as much as possible and make choices about care.",
    "Therapeutic presence, active listening, and respectful communication — You will use your attention, words, silence, and body language to reduce anxiety and build trust.",
    "Virginia Henderson's definition of nursing and patient independence — You will connect Henderson's work with helping patients regain strength, knowledge, and independence.",
    "Jean Watson's caring theory and the human side of care — You will examine how compassion, respect, presence, and meaningful relationships remain essential during technical care."
  ],
  4: [
    "Practical nurse role and limits of student practice — You will identify what you may do, what requires supervision, and when you must stop and ask for guidance.",
    "Teamwork, delegation, assignment, and supervision — You will learn how clear roles and follow-up help the health care team complete care safely.",
    "SBAR communication and closed-loop communication — You will organize important reports and confirm that critical information or instructions were heard correctly.",
    "Isabel Hampton Robb and nursing education standards — You will examine how stronger education and professional standards improved preparation for nursing practice.",
    "Mildred Montag and the development of associate degree nursing education — You will learn how Montag expanded educational pathways designed to prepare nurses for practice."
  ],
  5: [
    "Autonomy, beneficence, nonmaleficence, justice, fidelity, veracity, and accountability — You will use these principles to respect choices, promote good, avoid harm, act fairly, keep promises, tell the truth, and accept responsibility.",
    "Confidentiality and privacy as ethical duties — You will protect patient information and discuss it only with authorized people who need it for care.",
    "Professional boundaries and social media caution — You will maintain a therapeutic relationship and keep all patient information, images, and stories off personal social media.",
    "Patient rights, dignity, and respect for cultural or religious values — You will include your patient in care, protect privacy, and respond respectfully to individual beliefs and preferences.",
    "Lavinia Dock's advocacy and Mabel Keaton Staupers' civil rights leadership in nursing — You will connect their work with professional advocacy, equality, and removing barriers in health care and nursing."
  ],
  6: [
    "Scope of practice and student nurse limitations — You will use laws, policies, your preparation, and required supervision to determine whether an action is within your role.",
    "HIPAA, confidentiality, and protected health information — You will safeguard identifiable health information in conversations, records, electronic systems, and school assignments.",
    "Informed consent, refusal of care, incident reporting, and mandatory reporting — You will respect patient choices and follow the correct notification and reporting process when required.",
    "Documentation basics: timely, factual, objective, complete, and corrected appropriately — You will create a clear legal record of findings, care, responses, and notifications.",
    "Dorothea Dix's mental health advocacy and Susie Walking Bear Yellowtail's advocacy for Native American health — You will examine how nurses can identify inequity and advocate for respectful, accessible care."
  ],
  7: [
    "Culture, religion, language, family roles, and health beliefs — You will ask respectful questions to understand what matters to your patient instead of making assumptions.",
    "Social determinants of health and barriers to care — You will consider how housing, food, transportation, income, education, disability, and discrimination can affect health and follow-through.",
    "Bias, assumptions, and respectful curiosity — You will examine your own thinking and use open-ended questions to provide individualized care.",
    "Interpreter use and plain-language communication — You will use qualified interpreters, speak directly to your patient, avoid jargon, and confirm understanding.",
    "Madeleine Leininger's transcultural nursing and Hazel W. Johnson-Brown's leadership as an Army nurse and educator — You will connect cultural respect and leadership with equitable nursing practice."
  ],
  8: [
    "Patient identification, fall prevention, hand hygiene, standard precautions, and infection prevention — You will use consistent safety checks to prevent common and serious patient harm.",
    "Quality improvement, near misses, incident reports, and a just culture mindset — You will learn how reporting problems helps improve systems without replacing individual accountability.",
    "Observation and reporting as core nursing work — You will watch for changes, collect accurate information, and promptly communicate concerns to the appropriate nurse.",
    "Linda Richards and the development of nursing documentation — You will connect organized records with communication, continuity, and safer care.",
    "Ildaura Murillo-Rohde and advocacy for Hispanic nurses — You will examine how representation, education, and professional advocacy strengthen nursing and patient care."
  ],
  9: [
    "Assessment or data collection, nursing diagnosis concepts, planning, implementation, and evaluation — You will follow the nursing process to organize information and contribute safely to patient care.",
    "Clinical judgment: noticing, interpreting, responding, and reflecting — You will recognize cues, consider their meaning, choose a safe response, and learn from the outcome.",
    "Prioritization basics and when to ask for help — You will address immediate threats first and promptly seek assistance when findings are urgent, unfamiliar, or outside your role.",
    "Ida Jean Orlando's nursing process theory — You will examine how checking your observations with the patient supports purposeful, individualized nursing actions.",
    "Patricia Benner's novice-to-expert model — You will understand that judgment grows through education, supervised experience, reflection, and continued learning."
  ],
  10: [
    "Health promotion and illness prevention across the lifespan — You will help patients strengthen healthy behaviors, reduce risks, and use age-appropriate screening and preventive care.",
    "Teach-back, health literacy, and plain-language education — You will explain information clearly and ask your patient to describe it in their own words so you can correct misunderstandings.",
    "Community nursing, maternal-child care, chronic disease support, and prevention — You will examine how nurses provide education, monitoring, referrals, and support beyond the hospital.",
    "Mary Breckinridge and frontier nursing — You will connect Breckinridge's work with expanding maternal-child nursing services to rural and underserved communities.",
    "Margaret Sanger's influence on reproductive health education and controversial history — You will study her historical influence while discussing ethical concerns and affected communities accurately and professionally."
  ],
  11: [
    "Professional appearance, punctuality, communication, accountability, and integrity — You will practice behaviors that help patients and team members trust your readiness and judgment.",
    "Managing stress, asking for help, and building safe learning habits — You will use healthy coping strategies and seek support before stress interferes with learning or patient safety.",
    "Feedback, remediation, and reflective practice — You will use correction as information, complete needed review, and adjust your approach to improve performance.",
    "Leadership at the bedside and advocacy through everyday actions — You will lead by noticing needs, communicating clearly, protecting safety, and following through on responsibilities.",
    "Mary Adelaide Nutting's educational leadership and Luther Christman's advocacy — You will examine how leaders strengthen education, expand opportunity, and advance professional nursing roles."
  ],
  12: [
    "Nursing today: technology, teamwork, evidence, patient rights, community needs, and lifelong learning — You will integrate these influences when planning your continued growth in nursing.",
    "How practical nurses make an impact through small, consistent, safe actions — You will connect preparation, observation, respect, reporting, and follow-through with better patient outcomes.",
    "Review of ethical and legal foundations and professional identity — You will bring together your responsibilities for scope, privacy, documentation, boundaries, advocacy, and accountability.",
    "Your selected nursing leader presentation — You will explain how one leader's work connects with your values and the nurse you are becoming.",
    "Course synthesis and final exam preparation — You will identify strong areas, close knowledge gaps, practice NCLEX-style reasoning, and prepare a focused study plan."
  ]
};

const keyTermDefinitions = {
  "professional identity": "the values, behaviors, responsibilities, and standards you develop as a member of the nursing profession",
  "scope of practice": "the care and responsibilities the law, your education, your role, and organizational policy authorize you to perform",
  accountability: "your responsibility to explain and accept the results of your decisions and actions",
  compassion: "recognizing another person's suffering and responding with concern and helpful action",
  "patient advocacy": "speaking up for your patient's rights, safety, choices, and access to appropriate care",
  "lifelong learning": "continuing to build your knowledge and skills throughout your nursing career",
  "public trust": "the confidence people place in nurses to act competently, ethically, and safely",
  "nursing reform": "organized efforts to improve nursing education, working conditions, standards, and patient care",
  "professional standards": "authoritative expectations used to guide and evaluate safe nursing practice",
  "public health": "the protection and improvement of health for populations and communities",
  equity: "providing fair opportunities and resources according to each person's needs and barriers",
  licensure: "legal authorization from a regulatory board to practice nursing after requirements are met",
  caring: "purposeful attention and action that support your patient's health, comfort, and dignity",
  comfort: "relief from physical or emotional distress and support for ease and well-being",
  dignity: "the inherent worth of every person that you protect through respectful care",
  "therapeutic communication": "intentional communication that supports your patient's needs and the goals of care",
  advocacy: "action you take to protect rights, safety, access, or informed choices",
  "holistic care": "care that considers the whole person rather than only a disease or symptom",
  collaboration: "working with your patient and the health care team toward shared goals",
  delegation: "transferring responsibility for an appropriate task while retaining required accountability and supervision",
  assignment: "the distribution of care responsibilities within a person's authorized role",
  supervision: "guidance, direction, observation, and follow-up provided by an authorized nurse or instructor",
  SBAR: "a structured report using Situation, Background, Assessment, and Recommendation",
  "closed-loop communication": "confirming that a message was received, understood, and acted upon correctly",
  autonomy: "your patient's right to make informed decisions about personal care",
  beneficence: "the ethical duty to promote good and support your patient's well-being",
  nonmaleficence: "the ethical duty to avoid or prevent harm",
  justice: "fair and equitable treatment of patients",
  fidelity: "keeping professional promises and commitments",
  veracity: "communicating truthfully",
  confidentiality: "protecting private information from unauthorized access or disclosure",
  boundaries: "limits that keep your relationship with a patient therapeutic and professional",
  HIPAA: "the federal law that establishes protections for certain health information",
  "protected health information": "identifiable health information protected from unauthorized use or disclosure",
  "informed consent": "a voluntary decision made after the patient receives and understands necessary information",
  negligence: "failure to act with the care a reasonably prudent person would use in similar circumstances",
  malpractice: "professional negligence that causes harm",
  "incident report": "an internal safety record used to document and review an unusual event according to policy",
  "cultural humility": "an ongoing practice of self-reflection, respectful curiosity, and learning from each patient",
  bias: "a preference or belief that can influence your judgment, sometimes without your awareness",
  stereotyping: "assuming a person has certain traits because of membership in a group",
  "health equity": "a fair opportunity for every person to achieve their best possible health",
  interpreter: "a qualified person who accurately communicates spoken or signed information between languages",
  "social determinants of health": "the social and environmental conditions that influence health and access to care",
  "patient safety": "the prevention of avoidable harm during health care",
  "standard precautions": "infection-prevention practices you use for every patient based on possible exposure",
  "fall risk": "the likelihood that a patient may fall because of personal, medication, mobility, or environmental factors",
  "near miss": "a safety event that could have caused harm but did not reach or injure the patient",
  "quality improvement": "systematic work to measure care and make processes safer and more effective",
  "just culture": "an approach that improves systems while maintaining fair accountability for choices and behavior",
  "nursing process": "the organized cycle of assessment, diagnosis or problem identification, planning, implementation, and evaluation",
  assessment: "systematic collection and validation of information about your patient's condition",
  planning: "setting priorities and outcomes and selecting appropriate nursing actions",
  implementation: "carrying out the planned nursing actions within your role",
  evaluation: "comparing your patient's response with the expected outcome and deciding what should happen next",
  "clinical judgment": "using patient information, nursing knowledge, priorities, and scope to choose a safe response",
  priority: "the need or action that requires attention before others because of urgency, safety, or importance",
  "health promotion": "helping people strengthen behaviors and conditions that support health and well-being",
  "health literacy": "a person's ability to find, understand, and use health information and services",
  "teach-back": "asking your patient to explain information in their own words so you can check how clearly you taught it",
  "plain language": "clear, familiar wording that makes important information easier to understand and use",
  prevention: "actions that reduce the chance, severity, or complications of illness and injury",
  "community health": "nursing and health efforts focused on the needs of people within a community or population",
  professionalism: "consistent conduct that demonstrates competence, respect, integrity, accountability, and reliability",
  resilience: "your ability to adapt, recover, and continue learning during stress or difficulty",
  feedback: "specific information about performance that you can use to improve",
  remediation: "targeted review and practice used to correct a knowledge or performance gap",
  leadership: "influencing safe, coordinated, ethical care through your actions and communication",
  "reflective practice": "examining an experience to understand what happened and improve your future actions",
  "professional impact": "the effect your nursing choices and actions have on patients, teams, and communities",
  "patient-centered care": "care organized around your patient's needs, values, preferences, and participation",
  "professional commitment": "your promise to uphold nursing responsibilities, standards, and continued growth"
};

function expandedKeyTerms(terms = []) {
  return terms.map((term) => `${term} — ${keyTermDefinitions[term] || "a nursing concept you should be able to define, apply, and connect with safe patient care"}.`);
}

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
    bulletList(weeklyCoreTopicExplanations[week.week] || week.topics),
    "",
    "Key Vocabulary",
    bulletList(expandedKeyTerms(details.keyTerms || [])),
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

function buildWeeklyAssignmentContent(week) {
  const details = weeklyStudyDetails[week.week] || {};
  return [
    `Week ${week.week} Applied Assignment`,
    details.practice || week.activities,
    "",
    "Submission Requirements",
    bulletList([
      "Use complete sentences and practical-nursing terminology from this week's lesson.",
      "Connect each response to patient safety, dignity, communication, or professional accountability.",
      "Support decisions with the assigned course material and identify when the instructor or supervising nurse must be notified.",
      "Review spelling, clarity, and confidentiality before submitting; never include real patient-identifying information."
    ]),
    "",
    "Graded Evidence",
    `${week.assessment}. Follow the instructor's submission directions and rubric.`
  ].join("\n");
}

function buildTextbookChapterContent(chapter) {
  return [
    `Chapter ${chapter.number}: ${chapter.title}`,
    `Required reading: Cooper and Gosnell, Foundations of Nursing, 9th Edition, pages ${chapter.pages}.`,
    "",
    "Open the Required Textbook",
    `- Foundations of Nursing, 9th Edition: ${textbookHref}?inline=1#page=${chapter.pdfPage}`,
    "",
    "Reading Focus",
    bulletList(readingFocusExplanations[chapter.number] || chapter.topics),
    "",
    "Study Expectations",
    bulletList([
      "Read the assigned chapter before completing the weekly applied assignment.",
      "Review chapter vocabulary, safety alerts, nursing-process sections, and skill steps.",
      "Be prepared to identify abnormal findings, patient-safety priorities, and findings that require immediate reporting.",
      "Use the textbook to support assignment answers without including identifiable patient information."
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
  { title: "Midterm Exam: Weeks 1-6", pointsPossible: 150, dueDate: "2026-08-02 23:59:00" },
  { title: "Health Equity Reflection", pointsPossible: 50, dueDate: "2026-08-09 23:59:00" },
  { title: "[PN102 2026] Quiz - Chapters 7-9", pointsPossible: 50, dueDate: "2026-08-23 23:59:00" },
  { title: "Clinical Judgment Worksheet", pointsPossible: 75, dueDate: "2026-08-23 23:59:00" },
  { title: "[PN102 2026] Quiz - Chapters 10-13", pointsPossible: 50, dueDate: "2026-09-13 23:59:00" },
  { title: "Professional Development Plan", pointsPossible: 50, dueDate: "2026-09-06 23:59:00" },
  { title: "Final Impact Presentation", pointsPossible: 50, dueDate: "2026-09-13 23:59:00" },
  { title: "Cumulative Final Exam", pointsPossible: 200, dueDate: "2026-09-13 23:59:00" }
];

const policies = {
  attendance:
    "Students are expected to attend and participate in all scheduled class sessions. Because this course establishes professional habits, punctuality, preparation, respectful communication, and active participation are evaluated as part of professionalism.",
  quizzes:
    "Chapter quizzes are scheduled throughout the course. Week 6 includes the midterm examination covering Chapters 1-6, and Week 12 includes the cumulative final examination covering Chapters 1-13.",
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
          "Course Details",
          bulletList([
            "Course code: PN 102",
            "Length: 12 weeks",
            "Clock hours: 100",
            "Delivery: Online / Zoom",
            "Weekly structure: lesson, discussion, applied assignment, and scheduled assessment"
          ]),
          "",
          "Upcoming Exams",
          bulletList([
            "Week 6 Midterm Exam — Due August 2, 2026 by 11:59 PM. This 150-point exam covers Chapters 1-6 and the major concepts from Weeks 1-6.",
            "Week 12 Cumulative Final Exam — Due September 13, 2026 by 11:59 PM. This 200-point exam covers Chapters 1-13 and integrates safety, communication, ethics, legal responsibilities, infection prevention, mobility, hygiene, vital signs, and physical assessment."
          ]),
          "Begin preparing now by reviewing each chapter's learning objectives, vocabulary, NCLEX-PN practice question, quiz rationale, and any topic your instructor identifies for remediation. The Calendar and To Do areas will remind you as each exam approaches.",
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
        content: courseDescription
      },
      {
        title: "Required Textbook: Foundations of Nursing, 9th Edition",
        content: [
          "Required Textbook",
          "Kim Cooper and Kelly Gosnell, Foundations of Nursing, 9th Edition, Elsevier.",
          "",
          "The textbook is available only to signed-in students enrolled in this course and authorized instructors.",
          `- Foundations of Nursing, 9th Edition: ${textbookHref}?inline=1`
        ].join("\n"),
        durationMinutes: 10
      }
    ]
  },
  ...weeklyModules.map((week) => {
    const chapters = extendedWeekChapters[week.week] || [];
    const quiz = introQuizByWeek[week.week];
    const moduleTitle = chapters.length
      ? `Week ${week.week}: ${chapters.length === 1 ? `Chapter ${chapters[0].number}` : `Chapters ${chapters[0].number}-${chapters[chapters.length - 1].number}`} - ${extendedWeekModuleTitles[week.week]}`
      : `Week ${week.week}: ${week.title}`;
    return {
    title: moduleTitle,
    lessons: [
      {
        title: "Weekly Overview",
        content: buildWeeklyOverviewContent(week)
      },
      ...chapters.map((chapter) => ({
        title: `Chapter ${chapter.number}: ${chapter.title}`,
        content: buildTextbookChapterContent(chapter),
        durationMinutes: 90
      })),
      ...chapters.filter((chapter) => powerPointFileNames[chapter.number]).map((chapter) => ({
        title: `[PN102 2026] Chapter ${chapter.number} PowerPoint Review`,
        content: buildPowerPointReviewContent(chapter),
        durationMinutes: 30
      })),
      {
        title: "Objectives and Learning Activity",
        content: buildWeeklyActivityContent(week)
      },
      {
        title: `Week ${week.week} Applied Assignment`,
        content: buildWeeklyAssignmentContent(week),
        durationMinutes: 60
      },
      ...(quiz ? [{
        title: quiz.title,
        content: quizContent(`${quiz.title} assessment instructions.`, quiz.questions),
        durationMinutes: 45
      }] : []),
      ...(week.week === 6 ? [{
        title: "Midterm Exam: Weeks 1-6",
        content: quizContent("PN 102 midterm examination covering Chapters 1-6.", quizBanks.introMidterm),
        durationMinutes: 60
      }] : [])
    ]
  }}),
  {
    title: "Course Wrap-Up and Final Assessment",
    lessons: [
      {
        title: "Final Review",
        content:
          "Students review nursing history, nursing leaders, practical nurse role expectations, ethical principles, legal responsibilities, safety, professional identity, and the impact of nursing practice."
      },
      {
        title: "Cumulative Final Exam",
        content: quizContent("PN 102 cumulative final examination covering Chapters 1-13.", quizBanks.introFinal),
        durationMinutes: 90
      },
      {
        title: "Final Impact Presentation",
        content: "Students complete a short final impact presentation connecting nursing history, ethical/legal responsibility, and their personal commitment to patient care."
      }
    ]
  }
];

const introNursingCourse = {
  title: "Introduction to Nursing for Practical Nursing Students",
  slug: "introduction-to-nursing-practical-nursing",
  seedVersion: "2026-07-15-detailed-lessons",
  category: "Practical Nursing Course",
  hours: 100,
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
  courseNumber: "PN 102",
  requiredTitles: [
    "Cooper, K., & Gosnell, K. (2023). Foundations of Nursing (9th ed.). Elsevier.",
    "Current student handbook and program policies",
    "Current state nurse practice act and board of nursing guidance as assigned by instructor",
    "Clinical site policies as assigned by instructor"
  ],
  policies,
  objectives: courseObjectives,
  weeks: weeklyModules.map((week) => {
    const chapters = extendedWeekChapters[week.week] || [];
    return {
      ...week,
      title: extendedWeekModuleTitles[week.week] || week.title,
      chapters: chapters.map((chapter) => `Chapter ${chapter.number}: ${chapter.title} (pp. ${chapter.pages})`).join("; "),
      assessment: week.week === 6
        ? "[PN102 2026] Quiz 6 - Chapter 6; Midterm Exam: Weeks 1-6"
        : introQuizByWeek[week.week]?.title || `Week ${week.week} Applied Assignment`
    };
  }),
  modules,
  gradeItems
};

module.exports = { introNursingCourse };
