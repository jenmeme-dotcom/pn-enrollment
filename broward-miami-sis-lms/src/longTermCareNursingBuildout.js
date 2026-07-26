const { quizBanks, quizContent } = require("./nursingCourseQuizzes");

const courseDescription =
  "PN 103 Long-Term Care Nursing prepares practical nursing students to provide safe, respectful, resident-centered care in long-term care, skilled nursing, rehabilitation, assisted living, dementia care, and end-of-life settings. The course emphasizes the practical nurse role, resident rights, communication, safety, infection prevention, mobility, personal care, nutrition, elimination, restorative care, common chronic conditions, dementia, emergencies, documentation, and professional accountability.";

const courseObjectives = [
  "Explain the structure, purpose, and interdisciplinary workflow of long-term care settings.",
  "Apply resident rights, ethical principles, legal responsibilities, scope of practice, delegation, documentation, and professional boundaries to long-term care scenarios.",
  "Use therapeutic communication, cultural humility, and person-centered care to support residents, families, and the health care team.",
  "Identify age-related changes, chronic conditions, dementia-related needs, mental health concerns, and functional limitations commonly seen in long-term care.",
  "Plan safe nursing care that supports infection prevention, fall prevention, restraint alternatives, body mechanics, transfers, mobility, skin integrity, oxygen needs, nutrition, hydration, elimination, comfort, rest, and sleep.",
  "Recognize and report changes in condition, safety risks, abnormal vital signs, wounds, pressure injuries, respiratory concerns, emergencies, and end-of-life needs.",
  "Promote rehabilitation, restorative nursing, independence, dignity, quality of life, and continuity of care across admissions, transfers, discharges, and assisted living transitions.",
  "Demonstrate professional accountability through preparation, discussion participation, case-based assignments, remediation, and final synthesis."
];

const sourceText = "Cooper and Gosnell, Foundations of Nursing, 9th Edition";
const materialBase = "/course-materials/long-term-care-nursing-pn103";
const textbookFileName = "Foundations-of-Nursing-9th-Edition-Cooper-Gosnell.pdf";

const weeklyModules = [
  {
    week: 1,
    date: "2026-06-24",
    title: "Long-Term Care Foundations, Resident Rights, and Professional Accountability",
    chapters: "Selected readings from Chapters 1, 2, and 3",
    focus:
      "Long-term care settings, nursing team roles, delegation, resident rights, ethics, laws, abuse prevention, work ethics, and professional behavior.",
    objectives: [
      "Describe major long-term care settings and the practical nurse's place on the team.",
      "Connect resident rights, dignity, quality of life, and abuse prevention to daily care.",
      "Identify professional behaviors expected in class, lab, clinical, and resident-care settings."
    ],
    discussionTitle: "[PN103 2026] Week 1 Discussion: Dignity, Rights, and the Long-Term Care Nurse",
    discussionPrompt:
      "Describe one resident right that must be protected in long-term care. Explain how a practical nurse can support that right while still maintaining safety and following the care plan.",
    assignmentTitle: "[PN103 2026] Long-Term Care Role and Resident Rights Scenario",
    assignmentDescription:
      "Analyze a short resident-care scenario. Identify the resident right involved, the nurse's responsibility, what should be reported, and how the team can protect dignity.",
    dueDate: "2026-06-28"
  },
  {
    week: 2,
    date: "2026-07-01",
    title: "Communication, Nursing Process, Culture, Aging, and Person-Centered Care",
    chapters: "Selected readings from Chapters 4, 5, 6, 7, 8, 9, and 10",
    focus:
      "Communication with residents and the health team, assisting with the nursing process, understanding the whole resident, cultural and religious considerations, body systems review, aging, and sexuality.",
    objectives: [
      "Use clear reporting and respectful communication with residents, families, and the care team.",
      "Explain how practical nurses contribute to data collection, implementation, evaluation, and care-plan updates.",
      "Describe how culture, religion, aging, and sexuality affect resident-centered care."
    ],
    discussionTitle: "[PN103 2026] Week 2 Discussion: Seeing the Whole Resident",
    discussionPrompt:
      "Long-term care residents have histories, preferences, beliefs, relationships, and goals. Choose one communication strategy that helps you learn what matters to a resident and explain why it supports better care.",
    assignmentTitle: "[PN103 2026] Resident Profile and Communication Plan",
    assignmentDescription:
      "Create a brief resident profile from a case scenario and write two communication approaches that protect dignity, culture, preferences, privacy, and safety.",
    dueDate: "2026-07-05"
  },
  {
    week: 3,
    date: "2026-07-08",
    title: "Safety, Falls, Restraint Alternatives, Infection Prevention, and Safe Mobility",
    chapters: "Selected readings from Chapters 11, 12, 13, 14, and 15",
    focus:
      "Environmental safety, fall prevention, restraint alternatives, standard precautions, infection prevention, body mechanics, transfers, and safe resident handling.",
    objectives: [
      "Identify common safety hazards and fall-risk factors in long-term care.",
      "Explain why restraint alternatives and least-restrictive interventions are required.",
      "Apply infection prevention, body mechanics, transfer safety, and reporting expectations."
    ],
    discussionTitle: "[PN103 2026] Week 3 Discussion: Preventing Harm Before It Happens",
    discussionPrompt:
      "Choose one preventable harm in long-term care, such as a fall, infection, unsafe transfer, or restraint-related injury. Explain what the nurse should observe, do, report, and document.",
    assignmentTitle: "[PN103 2026] Safety and Infection Prevention Room Audit",
    assignmentDescription:
      "Complete a case-based room safety audit. Identify fall risks, infection risks, transfer concerns, restraint-alternative options, and priority reporting needs.",
    dueDate: "2026-07-12"
  },
  {
    week: 4,
    date: "2026-07-15",
    title: "Resident Unit, Bedmaking, Hygiene, Grooming, Nutrition, Fluids, and Supportive Care",
    chapters: "Selected readings from Chapters 16, 17, 18, 19, 20, and 21",
    focus:
      "Resident room safety and comfort, bedmaking, bathing, oral care, grooming, nutrition, hydration, feeding assistance, aspiration precautions, nutritional support, and IV therapy observation limits.",
    objectives: [
      "Describe care that maintains comfort, cleanliness, warmth, privacy, and resident choice.",
      "Identify nutrition, hydration, dysphagia, aspiration, intake/output, and feeding-assistance concerns.",
      "Explain what practical nurses must monitor and report related to nutritional support and IV therapy in long-term care."
    ],
    discussionTitle: "[PN103 2026] Week 4 Discussion: Basic Care Is Skilled Care",
    discussionPrompt:
      "Basic care can prevent serious complications. Choose hygiene, nutrition, hydration, or room comfort and explain how careful nursing care supports safety, dignity, and quality of life.",
    assignmentTitle: "[PN103 2026] ADL, Nutrition, and Hydration Care Plan",
    assignmentDescription:
      "Use a resident scenario to identify ADL needs, nutrition/hydration risks, safety precautions, observations to report, and resident-centered comfort measures.",
    dueDate: "2026-07-19"
  },
  {
    week: 5,
    date: "2026-07-22",
    title: "Elimination, Exercise, Activity, Comfort, Rest, Oxygen Needs, and Vital Signs",
    chapters: "Selected readings from Chapters 22, 23, 24, 25, 26, and 27",
    focus:
      "Urinary and bowel elimination, continence support, exercise, activity, comfort, rest, sleep, oxygen needs, respiratory therapies, and vital-sign measurement.",
    objectives: [
      "Differentiate expected findings from changes in urinary, bowel, comfort, sleep, respiratory, and vital-sign status.",
      "Promote independence and safety during elimination, activity, oxygen use, and rest.",
      "Use timely reporting for abnormal findings and changes in condition."
    ],
    discussionTitle: "[PN103 2026] Week 5 Discussion: Noticing Changes in Condition",
    discussionPrompt:
      "Choose one change in condition related to elimination, breathing, pain, sleep, activity tolerance, or vital signs. Explain what you would notice, what questions you would ask, and what you would report.",
    assignmentTitle: "[PN103 2026] Elimination, Oxygen, and Vital Signs Case Worksheet",
    assignmentDescription:
      "Interpret a resident case with elimination changes, respiratory concerns, and vital-sign data. Identify priority findings, immediate nursing actions, and reporting language.",
    dueDate: "2026-07-26"
  },
  {
    week: 6,
    date: "2026-07-29",
    title: "Physical Examination Support, Specimens, Admissions, Transfers, Discharges, and Midterm Review",
    chapters: "Selected readings from Chapters 28, 29, and 30; review Chapters 1-27",
    focus:
      "Assisting with examinations, collecting and testing specimens within policy, admission routines, room transfers, discharges, continuity of care, documentation, and midterm synthesis.",
    objectives: [
      "Prepare residents and the care environment for examinations and ordered specimen collection.",
      "Explain how admissions, transfers, and discharges affect safety, communication, and resident adjustment.",
      "Synthesize Weeks 1-6 concepts for the midterm assessment."
    ],
    discussionTitle: "[PN103 2026] Week 6 Discussion: Smooth Transitions of Care",
    discussionPrompt:
      "Admissions, room transfers, and discharges can be stressful for residents. Explain one nursing action that can reduce confusion, protect safety, or improve continuity of care.",
    assignmentTitle: "[PN103 2026] Midterm Exam - Long-Term Care Foundations and Daily Care",
    assignmentDescription:
      "Midterm exam covering Weeks 1-6: resident rights, communication, safety, infection prevention, mobility, personal care, nutrition, elimination, comfort, oxygen needs, vital signs, specimens, and transitions.",
    dueDate: "2026-08-02",
    exam: true
  },
  {
    week: 7,
    date: "2026-08-05",
    title: "Wound Care, Pressure Injuries, Sensory Problems, Cancer, Immune, and Skin Disorders",
    chapters: "Selected readings from Chapters 31, 32, 33, and 34",
    focus:
      "Wound observation, nonsterile dressing support within scope, pressure-injury risk, prevention, skin changes, sensory impairment, cancer, immune conditions, and skin disorders.",
    objectives: [
      "Recognize risk factors, warning signs, and prevention strategies for wounds and pressure injuries.",
      "Support residents with hearing, speech, vision, skin, immune, or cancer-related needs.",
      "Report skin changes and wound concerns promptly using objective language."
    ],
    discussionTitle: "[PN103 2026] Week 7 Discussion: Skin Integrity and Quality of Life",
    discussionPrompt:
      "Pressure injury prevention is daily nursing work. Choose one prevention strategy and explain how it protects both physical safety and resident dignity.",
    assignmentTitle: "[PN103 2026] Skin Integrity and Pressure Injury Prevention Map",
    assignmentDescription:
      "Create a prevention map for a high-risk resident. Include repositioning, skin inspection, nutrition/hydration, moisture, mobility, sensory needs, reporting, and documentation.",
    dueDate: "2026-08-09"
  },
  {
    week: 8,
    date: "2026-08-12",
    title: "Common Chronic Disorders Across Body Systems",
    chapters: "Selected readings from Chapters 35, 36, 37, and 38",
    focus:
      "Nervous, musculoskeletal, cardiovascular, respiratory, digestive, endocrine, urinary, and reproductive disorders commonly affecting long-term care residents.",
    objectives: [
      "Identify common long-term care conditions and related nursing observations.",
      "Connect chronic disease changes with safety, mobility, nutrition, elimination, oxygenation, and comfort needs.",
      "Use priority reporting for symptoms suggesting decline or acute change."
    ],
    discussionTitle: "[PN103 2026] Week 8 Discussion: Chronic Conditions and Daily Nursing Priorities",
    discussionPrompt:
      "Choose one chronic condition common in long-term care. Explain what daily nursing observations matter most and how those observations can prevent complications.",
    assignmentTitle: "[PN103 2026] Chronic Disorder Nursing Priorities Case",
    assignmentDescription:
      "Analyze a resident with multiple chronic disorders. Identify three priority nursing concerns, what to monitor, when to report, and how to support independence.",
    dueDate: "2026-08-16"
  },
  {
    week: 9,
    date: "2026-08-19",
    title: "Mental Health, Confusion, Dementia, and Developmental Disabilities",
    chapters: "Selected readings from Chapters 39, 40, and 41",
    focus:
      "Mental health disorders, confusion, delirium, dementia, Alzheimer's disease, behavioral expressions, communication strategies, safety, developmental disabilities, and family support.",
    objectives: [
      "Differentiate confusion, dementia-related changes, and urgent changes that require reporting.",
      "Use supportive communication for residents with dementia, mental health concerns, or developmental disabilities.",
      "Plan care that reduces distress, protects safety, and maintains dignity."
    ],
    discussionTitle: "[PN103 2026] Week 9 Discussion: Dementia Care With Dignity",
    discussionPrompt:
      "Describe one communication or environmental strategy that can reduce distress for a resident with dementia. Explain why the strategy is respectful and safe.",
    assignmentTitle: "[PN103 2026] Dementia and Mental Health Communication Plan",
    assignmentDescription:
      "Build a care communication plan for a resident with confusion, dementia, anxiety, or another mental health concern. Include triggers, calming approaches, safety concerns, and reporting.",
    dueDate: "2026-08-23"
  },
  {
    week: 10,
    date: "2026-08-26",
    title: "Rehabilitation, Restorative Nursing, Assisted Living, and Basic Emergency Care",
    chapters: "Selected readings from Chapters 42, 43, and 44",
    focus:
      "Restorative nursing, rehabilitation goals, functional independence, assisted living service plans, transfers/discharges from assisted living, basic emergency response, stroke, seizure, burns, hemorrhage, shock, and BLS awareness.",
    objectives: [
      "Explain how restorative nursing supports independence and quality of life.",
      "Compare long-term care and assisted living care priorities.",
      "Recognize emergencies and describe immediate reporting and response expectations."
    ],
    discussionTitle: "[PN103 2026] Week 10 Discussion: Restorative Care and Emergency Readiness",
    discussionPrompt:
      "Choose restorative care or emergency readiness. Explain one practical action the nurse can take that helps the resident remain safe, functional, and respected.",
    assignmentTitle: "[PN103 2026] Restorative Nursing and Emergency Response Worksheet",
    assignmentDescription:
      "Complete scenarios involving restorative goals and emergency recognition. Identify safe first actions, who to notify, what to document, and how to support the resident afterward.",
    dueDate: "2026-08-30"
  },
  {
    week: 11,
    date: "2026-09-02",
    title: "End-of-Life Care, Family Support, Caregiver Wellness, and Comprehensive Review",
    chapters: "Selected readings from Chapter 45; review Chapters 1-44",
    focus:
      "Terminal illness, comfort needs, family support, legal issues, signs of death, postmortem care awareness, grief, caregiver wellness, and final review.",
    objectives: [
      "Describe comfort-focused care and supportive communication at the end of life.",
      "Identify legal, cultural, family, privacy, and dignity considerations in end-of-life care.",
      "Review major course priorities before final assessment."
    ],
    discussionTitle: "[PN103 2026] Week 11 Discussion: Comfort, Family, and Dignity at End of Life",
    discussionPrompt:
      "End-of-life care requires skill and compassion. Describe one action that supports comfort or family presence while protecting dignity, privacy, and policy requirements.",
    assignmentTitle: "[PN103 2026] End-of-Life Comfort and Family Support Reflection",
    assignmentDescription:
      "Reflect on a case involving terminal illness. Identify comfort measures, family support, cultural considerations, reporting needs, and professional self-care.",
    dueDate: "2026-09-06"
  },
  {
    week: 12,
    date: "2026-09-09",
    title: "Final Synthesis: Safe, Respectful Long-Term Care Nursing",
    chapters: "Comprehensive review of selected course chapters",
    focus:
      "Comprehensive synthesis of resident-centered long-term care nursing, safety, communication, chronic illness, dementia, restorative care, end-of-life care, and professional accountability.",
    objectives: [
      "Synthesize long-term care priorities into safe practical nursing judgment.",
      "Use case-based reasoning to prioritize resident needs, reporting, documentation, and team communication.",
      "Describe the professional habits needed for safe long-term care practice."
    ],
    discussionTitle: "[PN103 2026] Week 12 Discussion: Professional Commitment to Long-Term Care",
    discussionPrompt:
      "Identify one professional habit you will carry into long-term care clinical practice. Explain how it protects residents and strengthens the health care team.",
    assignmentTitle: "[PN103 2026] Final Comprehensive Exam - Long-Term Care Nursing",
    assignmentDescription:
      "Cumulative final exam covering resident rights, safety, infection prevention, basic care, chronic conditions, dementia, restorative care, emergencies, end-of-life care, and professional accountability.",
    dueDate: "2026-09-09",
    exam: true
  }
];

const chapterAlignedPlans = {
  1: {
    title: "Oxygenation in Long-Term Care",
    readings: [{ number: 14, title: "Oxygenation", pages: "342-362", pdfPage: 380 }],
    focus: "Oxygen therapy, respiratory assessment, airway safety, equipment precautions, and changes in condition in long-term care.",
    objectives: ["Recognize respiratory distress and abnormal oxygenation findings.", "Apply oxygen-safety and reporting expectations within practical nursing scope."],
    discussionTitle: "[PN103 2026] Week 1 Discussion: Oxygen Safety and Changes in Condition",
    discussionPrompt: "Identify one respiratory change that requires prompt reporting and explain the immediate safety priorities.",
    assignmentTitle: "[PN103 2026] Oxygenation Safety Case",
    assignmentDescription: "Analyze oxygen saturation, respiratory findings, equipment safety, priority actions, and documentation in a long-term care scenario."
  },
  2: {
    title: "Elimination and Gastric Intubation",
    readings: [{ number: 15, title: "Elimination and Gastric Intubation", pages: "363-398", pdfPage: 401 }],
    focus: "Urinary and bowel elimination, catheter care, nasogastric tubes, enemas, ostomies, dignity, and infection prevention.",
    objectives: ["Recognize elimination findings that require intervention or reporting.", "Support safe catheter, bowel, ostomy, and gastric-tube care within policy."],
    discussionTitle: "[PN103 2026] Week 2 Discussion: Dignity and Elimination Care",
    discussionPrompt: "Explain how a nurse protects dignity, safety, and infection prevention during elimination care.",
    assignmentTitle: "[PN103 2026] Elimination and Tube-Care Worksheet",
    assignmentDescription: "Complete a resident case involving elimination changes, catheter or ostomy care, intake/output, and reporting priorities."
  },
  3: {
    title: "Urgent Alterations in Health",
    readings: [{ number: 16, title: "Care of Patients Experiencing Urgent Alterations in Health", pages: "399-428", pdfPage: 437 }],
    focus: "Emergency assessment, CPR awareness, airway obstruction, shock, bleeding, wounds, poisoning, temperature emergencies, and trauma.",
    objectives: ["Recognize urgent changes and initiate the correct emergency response.", "Communicate, document, and follow facility emergency procedures."],
    discussionTitle: "[PN103 2026] Week 3 Discussion: Recognizing an Emergency",
    discussionPrompt: "Choose one emergency and explain what the nurse should recognize, do first, and report.",
    assignmentTitle: "[PN103 2026] Emergency Recognition and Response Map",
    assignmentDescription: "Prioritize actions for urgent long-term care scenarios involving airway, breathing, circulation, bleeding, shock, or injury."
  },
  4: {
    title: "Dosage Calculation and Medication Administration",
    readings: [{ number: 17, title: "Dosage Calculation and Medication Administration", pages: "429-488", pdfPage: 467 }],
    focus: "Dosage calculation, medication orders, medication rights, routes of administration, monitoring, and error prevention.",
    objectives: ["Calculate introductory medication doses accurately.", "Apply medication-administration rights, safety checks, monitoring, and reporting."],
    discussionTitle: "[PN103 2026] Week 4 Discussion: Medication Safety",
    discussionPrompt: "Identify one medication-safety check that prevents harm in long-term care and explain why it matters.",
    assignmentTitle: "[PN103 2026] Dosage Calculation and Medication Safety Practice",
    assignmentDescription: "Complete dosage calculations and medication-administration scenarios using required safety checks."
  },
  5: {
    title: "Fluids and Electrolytes",
    readings: [{ number: 18, title: "Fluids and Electrolytes", pages: "489-530", pdfPage: 527 }],
    focus: "Hydration, intake/output, electrolyte and acid-base concepts, IV monitoring, blood therapy awareness, and complications.",
    objectives: ["Identify dehydration, fluid overload, and common electrolyte concerns.", "Monitor intake/output and report IV or transfusion complications promptly."],
    discussionTitle: "[PN103 2026] Week 5 Discussion: Hydration and Fluid Balance",
    discussionPrompt: "Describe one sign of fluid imbalance and the nursing observations that should be reported.",
    assignmentTitle: "[PN103 2026] Fluid Balance and Intake-Output Case",
    assignmentDescription: "Interpret intake/output and assessment findings, identify priority fluid concerns, and document appropriate actions."
  },
  6: {
    title: "Nutrition and Related Therapies",
    readings: [{ number: 19, title: "Nutritional Concepts and Related Therapies", pages: "531-578", pdfPage: 569 }],
    focus: "Essential nutrients, therapeutic diets, feeding assistance, dysphagia and aspiration prevention, tube feeding, and parenteral nutrition.",
    objectives: ["Connect nutrition and hydration needs to resident safety and healing.", "Apply feeding, aspiration, therapeutic-diet, and nutritional-support precautions."],
    discussionTitle: "[PN103 2026] Week 6 Discussion: Nutrition, Choice, and Safety",
    discussionPrompt: "Explain how the nurse balances resident choice with dysphagia, aspiration, or therapeutic-diet safety.",
    assignmentTitle: "[PN103 2026] Midterm - Chapters 14-19",
    assignmentDescription: "Midterm assessment covering oxygenation, elimination, urgent care, medication safety, fluids/electrolytes, and nutrition.",
    exam: true
  },
  7: {
    title: "Complementary, Integrative, and Alternative Therapies",
    readings: [{ number: 20, title: "Complementary, Integrative, and Alternative Therapies", pages: "579-600", pdfPage: 617 }],
    focus: "Common complementary therapies, resident preferences, interactions, evidence, safety, documentation, and nursing education.",
    objectives: ["Describe common complementary and integrative therapies.", "Identify interaction risks and use nonjudgmental safety-focused communication."],
    discussionTitle: "[PN103 2026] Week 7 Discussion: Respectful Integrative Care",
    discussionPrompt: "How should a nurse respond when a resident uses an herbal or complementary therapy?",
    assignmentTitle: "[PN103 2026] Complementary Therapy Safety Review",
    assignmentDescription: "Evaluate a complementary-therapy scenario for preferences, possible risks, teaching, and provider notification."
  },
  8: {
    title: "Pain Management, Comfort, Rest, and Sleep",
    readings: [{ number: 21, title: "Pain Management, Comfort, Rest, and Sleep", pages: "601-623", pdfPage: 639 }],
    focus: "Pain assessment, comfort measures, medication and nonmedication approaches, sleep, rest, and evaluation of response.",
    objectives: ["Use resident-centered pain and comfort assessment.", "Plan and evaluate safe interventions that support comfort, rest, and sleep."],
    discussionTitle: "[PN103 2026] Week 8 Discussion: Pain Is What the Resident Says",
    discussionPrompt: "Explain how a nurse should respond when a resident reports pain that is not outwardly visible.",
    assignmentTitle: "[PN103 2026] Pain, Comfort, and Sleep Care Plan",
    assignmentDescription: "Create a resident-centered plan using assessment, comfort measures, medication monitoring, and outcome evaluation."
  },
  9: {
    title: "Wound Care, Specimens, and Diagnostic Testing",
    readings: [
      { number: 22, title: "Surgical Wound Care", pages: "624-658", pdfPage: 662 },
      { number: 23, title: "Specimen Collection and Diagnostic Testing", pages: "659-707", pdfPage: 697 }
    ],
    focus: "Wound classification and healing, dressing and drain care, complications, specimen collection, diagnostic testing, and documentation.",
    objectives: ["Recognize wound complications and protect healing.", "Collect and label specimens correctly while following infection-prevention policy."],
    discussionTitle: "[PN103 2026] Week 9 Discussion: Wound and Specimen Accuracy",
    discussionPrompt: "Explain how objective wound documentation or correct specimen handling protects a resident.",
    assignmentTitle: "[PN103 2026] Wound Assessment and Specimen Collection Case",
    assignmentDescription: "Document wound findings and sequence safe specimen collection, labeling, transport, and reporting."
  },
  10: {
    title: "Lifespan Development, Loss, Grief, Dying, and Death",
    readings: [
      { number: 24, title: "Lifespan Development", pages: "708-746", pdfPage: 746 },
      { number: 25, title: "Loss, Grief, Dying, and Death", pages: "747-774", pdfPage: 785 }
    ],
    focus: "Older-adult development, family patterns, loss, grief, dying, culturally respectful support, and end-of-life communication.",
    objectives: ["Relate lifespan and family factors to resident-centered care.", "Support residents and families experiencing loss, grief, dying, and death."],
    discussionTitle: "[PN103 2026] Week 10 Discussion: Grief and Family Support",
    discussionPrompt: "Describe one culturally respectful action that supports a resident or family experiencing grief.",
    assignmentTitle: "[PN103 2026] Lifespan and Grief Support Reflection",
    assignmentDescription: "Analyze a resident and family scenario involving development, loss, grief, communication, and dignity."
  },
  11: {
    title: "Home Health and Long-Term Care",
    readings: [
      { number: 37, title: "Home Health Nursing", pages: "1182-1197", pdfPage: 1220 },
      { number: 38, title: "Long-Term Care", pages: "1198-1211", pdfPage: 1236 }
    ],
    focus: "Home health nursing, long-term care services, care coordination, safety, resident rights, independence, and continuity of care.",
    objectives: ["Compare home health and long-term care nursing responsibilities.", "Promote safety, independence, rights, and coordinated care across settings."],
    discussionTitle: "[PN103 2026] Week 11 Discussion: Independence Across Care Settings",
    discussionPrompt: "Compare one nursing priority in home health with the same priority in a long-term care facility.",
    assignmentTitle: "[PN103 2026] Home Health and Long-Term Care Comparison",
    assignmentDescription: "Compare environment, safety, communication, resident rights, family roles, and continuity across both settings."
  },
  12: {
    title: "Rehabilitation and Hospice Care",
    readings: [
      { number: 39, title: "Rehabilitation Nursing", pages: "1212-1227", pdfPage: 1250 },
      { number: 40, title: "Hospice Care", pages: "1228-1244", pdfPage: 1266 }
    ],
    focus: "Rehabilitation, restorative goals, independence, hospice philosophy, symptom comfort, family support, dignity, and final synthesis.",
    objectives: ["Explain rehabilitation and restorative nursing priorities.", "Apply hospice, comfort, dignity, family-support, and professional-accountability principles."],
    discussionTitle: "[PN103 2026] Week 12 Discussion: Function, Comfort, and Dignity",
    discussionPrompt: "Explain how nursing goals change between rehabilitation and hospice while dignity remains central.",
    assignmentTitle: "[PN103 2026] Final Comprehensive Exam - Chapters 14-25 and 37-40",
    assignmentDescription: "Cumulative final assessment covering Chapters 14-25 and 37-40 with long-term care application.",
    exam: true
  }
};

const alignedWeeklyModules = weeklyModules.map((week) => {
  const plan = chapterAlignedPlans[week.week];
  return {
    ...week,
    ...plan,
    chapters: `Chapters ${plan.readings.map((reading) => reading.number).join(" and ")}`
  };
});

const longTermQuizByWeek = {
  4: { title: "[PN103 2026] Quiz - Chapters 14-17", questions: quizBanks.longTermChapters14to17 },
  8: { title: "[PN103 2026] Quiz - Chapters 18-21", questions: quizBanks.longTermChapters18to21 },
  10: { title: "[PN103 2026] Quiz - Chapters 22-25", questions: quizBanks.longTermChapters22to25 },
  12: { title: "[PN103 2026] Quiz - Chapters 37-40", questions: quizBanks.longTermChapters37to40 }
};

const gradeItems = [
  { title: "[PN103 2026] Syllabus and Course Orientation Acknowledgment", pointsPossible: 0, dueDate: "2026-06-28" },
  ...alignedWeeklyModules.flatMap((week) => [
    { title: week.discussionTitle, pointsPossible: 10, dueDate: week.dueDate },
    { title: week.assignmentTitle, pointsPossible: week.exam ? (week.week === 6 ? 150 : 200) : 25, dueDate: week.dueDate },
    ...(longTermQuizByWeek[week.week] ? [{ title: longTermQuizByWeek[week.week].title, pointsPossible: 50, dueDate: week.dueDate }] : [])
  ]),
  { title: "[PN103 2026] Long-Term Care Participation and Professionalism", pointsPossible: 100, dueDate: "2026-09-09" }
];

const policies = {
  attendance:
    "Students are expected to attend all class, lab, and clinical learning activities. Long-term care content builds week by week; missed time must be remediated according to instructor and program policy.",
  preparation:
    "Students should complete assigned selected readings before class and bring notes on resident safety, observations to report, and questions for discussion.",
  discussions:
    "Weekly discussions are graded for relevance, professionalism, application to resident-centered care, and respectful replies to classmates when required by the instructor.",
  textbook:
    "The course uses Chapters 14-25 and 37-40 from Cooper and Gosnell, Foundations of Nursing, 9th Edition. The instructor may narrow or expand readings based on clinical schedule and cohort needs.",
  legal:
    "All skills and role expectations must follow the current student handbook, Florida practical nursing scope guidance, facility policy, clinical instructor direction, and applicable federal/state long-term care requirements."
};

function weeklyLesson(week) {
  const quiz = longTermQuizByWeek[week.week];
  return {
    title: `Week ${week.week}: ${week.title}`,
    lessons: [
      {
        title: "Weekly Overview and Selected Reading",
        durationMinutes: 45,
        content: `${week.focus}\n\nReading: ${week.chapters} from ${sourceText}.\n\nObjectives:\n${week.objectives.map((objective) => `- ${objective}`).join("\n")}`
      },
      ...week.readings.map((reading) => ({
        title: `Chapter ${reading.number}: ${reading.title}`,
        durationMinutes: 90,
        content: [
          `Chapter ${reading.number}: ${reading.title}`,
          `Required reading: ${sourceText}, pages ${reading.pages}.`,
          "",
          "Open the Required Textbook",
          `- Foundations of Nursing, 9th Edition: ${materialBase}/${textbookFileName}?inline=1#page=${reading.pdfPage}`,
          "",
          "Long-Term Care Application",
          week.focus,
          "",
          "Study Expectations",
          "- Review safety alerts, nursing-process sections, skill steps, and findings that require reporting.",
          "- Connect the chapter to resident rights, dignity, independence, chronic-care needs, and facility policy.",
          "- Complete the weekly discussion and assignment after finishing the assigned reading."
        ].join("\n")
      })),
      {
        title: week.discussionTitle,
        durationMinutes: 30,
        content: `Canvas item type: Discussion.\n\nPrompt: ${week.discussionPrompt}\n\nDue: ${week.dueDate} at 11:59 PM.`
      },
      {
        title: week.assignmentTitle,
        durationMinutes: week.exam ? 90 : 45,
        content: `Canvas item type: ${week.exam ? "Exam" : "Assignment"}.\n\n${week.assignmentDescription}\n\nDue: ${week.dueDate} at 11:59 PM.`
      },
      ...(quiz ? [{
        title: quiz.title,
        durationMinutes: 45,
        content: quizContent(`${quiz.title} assessment instructions.`, quiz.questions)
      }] : [])
    ]
  };
}

const modules = [
  {
    title: "PN103 2026 - Orientation and Course Resources",
    lessons: [
      {
        title: "[PN103 2026] Course Welcome and Syllabus",
        durationMinutes: 45,
        content: `${courseDescription}\n\nRequired text: ${sourceText}.\n\nStudents review the syllabus, weekly schedule, grade items, discussion expectations, calendar due dates, attendance expectations, and long-term care professional standards.`
      },
      {
        title: "[PN103 2026] Syllabus and Course Orientation Acknowledgment",
        durationMinutes: 20,
        content:
          "Canvas item type: Assignment. Students acknowledge the syllabus, course calendar, required readings, professionalism expectations, discussion requirements, and instructor communication policy."
      },
      {
        title: "Required Textbook: Foundations of Nursing, 9th Edition",
        durationMinutes: 20,
        content: `Canvas item type: Attachment.\n\nCourse file:\n- Foundations of Nursing, 9th Edition: ${materialBase}/${textbookFileName}?inline=1\n\nUse Chapters 14-25 and 37-40 as assigned in the weekly modules unless the instructor assigns additional review.`
      }
    ]
  },
  ...alignedWeeklyModules.map(weeklyLesson),
  {
    title: "PN103 2026 - Final Review and Course Completion",
    lessons: [
      {
        title: "Comprehensive Final Review",
        durationMinutes: 90,
        content:
          "Review resident rights, communication, nursing process, culture, aging, safety, falls, restraints, infection prevention, mobility, ADLs, nutrition, elimination, oxygen needs, vital signs, wounds, pressure injuries, chronic disorders, mental health, dementia, developmental disabilities, restorative care, assisted living, emergencies, and end-of-life care."
      },
      {
        title: "[PN103 2026] Long-Term Care Participation and Professionalism",
        durationMinutes: 20,
        content:
          "Canvas item type: Assignment. Instructor evaluates preparation, participation, professional conduct, respectful communication, punctuality, and engagement with weekly long-term care discussions and case work."
      }
    ]
  }
];

const longTermCareNursingCourse = {
  title: "Long-Term Care Nursing",
  slug: "long-term-care-nursing-pn103",
  category: "Practical Nursing Course",
  hours: 90,
  tuitionCents: 0,
  booksSuppliesCents: 0,
  registrationFeeCents: 0,
  credentialType: "Course Completion",
  deliveryMode: "Campus / blended",
  description: courseDescription,
  ghlProductKeys: ["Long-Term Care Nursing", "Long Term Care Nursing", "PN 103", "PN103", "long-term-care-nursing-pn103"],
  courseNumber: "PN 103",
  seedVersion: "pn103-long-term-care-nursing-2026-07-15",
  requiredTitles: [
    "Cooper, K., & Gosnell, K. (2023). Foundations of Nursing (9th ed.). Elsevier.",
    "Current student handbook and practical nursing program policies",
    "Clinical facility policies, care plans, and instructor-assigned long-term care resources"
  ],
  policies,
  objectives: courseObjectives,
  weeks: alignedWeeklyModules.map((week) => ({
    ...week,
    chapters: (week.readings || []).map((chapter) => `Chapter ${chapter.number}: ${chapter.title} (pp. ${chapter.pages})`).join("; "),
    assessment: longTermQuizByWeek[week.week]?.title || week.assignmentTitle || "Module activities"
  })),
  modules,
  gradeItems
};

module.exports = { longTermCareNursingCourse };
