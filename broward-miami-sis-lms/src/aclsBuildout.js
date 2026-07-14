const fs = require("node:fs");
const path = require("node:path");

const materialBase = "/course-materials/advanced-cardiovascular-life-support";

function materialHref(fileName) {
  return `${materialBase}/${encodeURIComponent(fileName)}`;
}

function lesson(title, content, durationMinutes = 45) {
  return { title, content, durationMinutes };
}

const instructorGuideFile = "ACLS_Live_Course_Instructor_Guide_AHA_Aligned.md";

function embeddedGuideContent() {
  const filePath = path.resolve(__dirname, "..", "course_materials", "advanced-cardiovascular-life-support", instructorGuideFile);
  try {
    return fs.readFileSync(filePath, "utf8")
      .replace(/\r\n?/g, "\n")
      .replace(/^#{1,4}\s+/gm, "")
      .replace(/\*\*/g, "")
      .trim();
  } catch {
    return [
      "ACLS Live Course Instructor Guide",
      "",
      "The embedded guide could not be loaded from the course materials folder.",
      "",
      `Download the course file instead: ${materialHref(instructorGuideFile)}`
    ].join("\n");
  }
}

const courseDescription =
  "Live Advanced Cardiovascular Life Support course shell for AHA-aligned instruction, instructor-led practice, megacode preparation, skills verification, course records, and persistent instructor/student file access. Official AHA certification must be issued only through an authorized AHA Training Center/Training Site using current AHA materials and testing requirements.";

const courseObjectives = [
  "Integrate high-quality adult BLS into ACLS response.",
  "Use a systematic approach to respiratory arrest, cardiac arrest, bradycardia, tachycardia, and post-arrest care.",
  "Recognize shockable and nonshockable adult arrest rhythms.",
  "Demonstrate effective team leadership, closed-loop communication, and role assignment.",
  "Apply AHA-aligned ACLS algorithms while verifying current details against official AHA materials.",
  "Document skills practice, megacode readiness, exam status, and certification completion records."
];

const liveAgenda = [
  "Welcome, AHA certification requirements, safety briefing, and course expectations",
  "High-quality BLS integration and CPR team practice",
  "Systematic approach and respiratory arrest",
  "Cardiac arrest: VF/pVT, PEA, and asystole pathways",
  "Symptomatic bradycardia with a pulse",
  "Stable and unstable tachycardia with a pulse",
  "Acute coronary syndromes, stroke systems, and post-cardiac arrest care",
  "Integrated megacode practice, remediation, official skills testing, and written exam"
];

const modules = [
  {
    title: "ACLS Start Here and Course Files",
    lessons: [
      lesson(
        "Start Here: ACLS Certification-Safe Orientation",
        [
          "This course supports live ACLS instruction, practice, tracking, and file access inside the BMHI portal.",
          "",
          "Certification reminder: this portal course is not a substitute for official AHA Instructor materials, Provider materials, course videos, exams, skills testing sheets, Training Center policies, or eCard issuance.",
          "",
          "Students should arrive proficient in BLS and complete required AHA precourse work when assigned by the Training Center.",
          "",
          "Learning objectives:",
          ...courseObjectives.map((objective) => `- ${objective}`)
        ].join("\n"),
        30
      ),
      lesson(
        "Course File: ACLS Live Instructor Guide and Script",
        [
          "Download and keep this instructor guide available for live teaching, practice setup, scripts, megacode prompts, and debrief questions.",
          "",
          `Course file: ${instructorGuideFile}: ${materialHref(instructorGuideFile)}`,
          "",
          "Use this file with the current official AHA ACLS Provider Manual, Instructor Manual, course videos, exams, skills testing forms, and local Training Center direction."
        ].join("\n"),
        20
      ),
      lesson(
        "Read Online: ACLS Live Instructor Guide and Teaching Script",
        embeddedGuideContent(),
        120
      ),
      lesson(
        "Live Course Agenda",
        [
          "Recommended live flow:",
          ...liveAgenda.map((item, index) => `${index + 1}. ${item}`),
          "",
          "Adjust timing only as permitted by the Training Center and the current AHA course format being taught."
        ].join("\n"),
        30
      )
    ]
  },
  {
    title: "Core ACLS Teaching Modules",
    lessons: [
      lesson(
        "High-Quality CPR and Team Dynamics",
        [
          "Teaching focus: ACLS works only when BLS quality is protected.",
          "",
          "Read-aloud script:",
          "\"Before we talk about medications, airways, or advanced rhythms, we have to get the foundation right. Good ACLS means the team protects compressions. We pause only when we need to check rhythm, shock, or perform a critical action, and then we get right back on the chest.\"",
          "",
          "Practice: assign team leader, compressor, airway, monitor/defibrillator, medication nurse, and recorder. Run a two-minute CPR cycle with compressor rotation and closed-loop communication."
        ].join("\n"),
        60
      ),
      lesson(
        "Systematic Approach and Respiratory Arrest",
        [
          "Teaching focus: distinguish respiratory arrest with a pulse from pulseless cardiac arrest.",
          "",
          "Read-aloud script:",
          "\"The systematic approach keeps us from skipping critical information. In respiratory arrest, the patient may still have a pulse. That means we ventilate, support oxygenation, monitor closely, and prepare because the patient can deteriorate into cardiac arrest.\"",
          "",
          "Practice case: unresponsive adult with inadequate breathing, pulse present, falling oxygen saturation. Students must open the airway, ventilate with oxygen, attach monitoring, reassess pulse, and escalate airway support."
        ].join("\n"),
        60
      ),
      lesson(
        "Adult Cardiac Arrest: Shockable and Nonshockable Pathways",
        [
          "Teaching focus: start CPR, attach monitor/defibrillator, identify shockable versus nonshockable rhythm, and act without delay.",
          "",
          "Read-aloud script:",
          "\"Every adult cardiac arrest begins the same way: start CPR, ventilate with oxygen, and attach the monitor/defibrillator. Then the rhythm determines the path. Shockable rhythms need defibrillation. Nonshockable rhythms need CPR, epinephrine, and aggressive search for reversible causes.\"",
          "",
          "Practice: run one VF/pVT scenario and one PEA/asystole scenario. Debrief compression pauses, rhythm decisions, defibrillation safety, medication timing, airway management, and reversible causes."
        ].join("\n"),
        90
      ),
      lesson(
        "Bradycardia With a Pulse",
        [
          "Teaching focus: treat the unstable patient, not the number alone.",
          "",
          "Read-aloud script:",
          "\"Bradycardia with a pulse is not treated by the heart rate alone. Ask whether there is hypotension, acutely altered mental status, signs of shock, ischemic chest discomfort, or acute heart failure. If the patient is unstable because of the bradycardia, we act.\"",
          "",
          "Practice: symptomatic bradycardia with hypotension and altered mentation. Students should support ABCs, monitor, obtain IV access and 12-lead ECG when feasible, prepare atropine/pacing/infusion options per the current official algorithm and local protocol, and call expert help."
        ].join("\n"),
        60
      ),
      lesson(
        "Tachycardia With a Pulse",
        [
          "Teaching focus: confirm pulse, determine stability, then classify narrow/wide and regular/irregular when stable.",
          "",
          "Read-aloud script:",
          "\"For tachycardia with a pulse, the first fork in the road is stability. If the patient is unstable because of the tachycardia, prepare for synchronized cardioversion. If the patient is stable, classify the rhythm before choosing medication.\"",
          "",
          "Practice: run one unstable tachycardia cardioversion case and one stable regular narrow-complex tachycardia case."
        ].join("\n"),
        60
      ),
      lesson(
        "Post-Cardiac Arrest Care, ACS, and Stroke Systems",
        [
          "Teaching focus: ROSC is a transition into organized stabilization and system activation.",
          "",
          "Read-aloud script:",
          "\"When the pulse comes back, the team changes gears. We stop doing cardiac arrest care and start preventing rearrest and brain injury. Check blood pressure, oxygenation, ventilation, glucose, temperature strategy, 12-lead ECG, and the likely cause.\"",
          "",
          "Practice: post-ROSC handoff with current rhythm, blood pressure, oxygenation, arrest timeline, interventions, and next destination."
        ].join("\n"),
        60
      )
    ]
  },
  {
    title: "Megacode Practice and Completion Records",
    lessons: [
      lesson(
        "Megacode Practice 1: Shockable Arrest",
        [
          "Case: adult patient collapses, unresponsive, pulseless, monitor shows VF.",
          "",
          "Expected leadership behaviors: assign roles, start CPR, identify shockable rhythm, defibrillate safely, resume CPR immediately, track two-minute cycles, manage medications per current official algorithm, search for causes, and transition to post-ROSC care.",
          "",
          "Debrief: What protected CPR quality? What delayed defibrillation? Did the leader summarize the plan clearly?"
        ].join("\n"),
        75
      ),
      lesson(
        "Megacode Practice 2: Nonshockable Arrest",
        [
          "Case: adult patient with respiratory failure becomes pulseless. Monitor shows organized rhythm without a pulse.",
          "",
          "Expected leadership behaviors: identify PEA, continue CPR, avoid inappropriate shock, give epinephrine per current algorithm, manage airway/oxygenation, and treat likely reversible causes.",
          "",
          "Debrief: What cause fit the patient? How did the team avoid staring at the monitor instead of fixing physiology?"
        ].join("\n"),
        75
      ),
      lesson(
        "Skills Testing and Certification Checklist",
        [
          "Use only official current AHA testing and remediation processes for certification.",
          "",
          "Course record checklist:",
          "- Student roster verified",
          "- Required precourse work verified when applicable",
          "- BLS proficiency confirmed",
          "- Skills practice completed",
          "- Megacode testing completed per official AHA process",
          "- Written exam completed per official AHA process",
          "- Remediation documented if needed",
          "- Training Center eCard process completed",
          "",
          "Do not issue an AHA completion card from this portal unless the official AHA/Training Center requirements have been met."
        ].join("\n"),
        45
      )
    ]
  }
];

const gradeItems = [
  { title: "Precourse Preparation Verification", pointsPossible: 0 },
  { title: "High-Quality CPR and Team Roles Practice", pointsPossible: 100 },
  { title: "Rhythm Recognition and Algorithm Discussion", pointsPossible: 100 },
  { title: "Megacode Practice Participation", pointsPossible: 100 },
  { title: "Official AHA Skills Testing Record", pointsPossible: 100 },
  { title: "Official AHA Written Exam Record", pointsPossible: 100 },
  { title: "Training Center eCard / Completion Audit", pointsPossible: 0 }
];

const aclsCourse = {
  title: "Advanced Cardiovascular Life Support",
  slug: "advanced-cardiovascular-life-support",
  category: "Continuing Education",
  hours: 14,
  tuitionCents: 0,
  booksSuppliesCents: 0,
  registrationFeeCents: 0,
  credentialType: "AHA Provider eCard / Course Completion",
  deliveryMode: "Campus live",
  description: courseDescription,
  ghlProductKeys: ["Advanced Cardiovascular Life Support", "ACLS", "AHA ACLS", "advanced-cardiovascular-life-support"],
  seedVersion: "aha-acls-live-course-2026-07-10-embedded-student-portal",
  objectives: courseObjectives,
  modules,
  gradeItems
};

module.exports = { aclsCourse };
