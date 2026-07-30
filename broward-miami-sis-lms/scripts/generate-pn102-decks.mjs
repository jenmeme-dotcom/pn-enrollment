#!/usr/bin/env node

/**
 * Generate PN 102 chapter PowerPoints and companion PDFs.
 *
 * This module intentionally uses @oai/artifact-tool and adapts the hierarchy,
 * geometry, and typography of Codex Grid layouts 01, 10, and 16. Run it from an
 * artifact-tool workspace initialized by setup_artifact_tool_workspace.mjs.
 *
 * Example (from the repository root):
 *   SKILL_DIR=/absolute/path/to/presentations-skill
 *   BUILD_DIR="$PWD/.presentation-build/pn102"
 *   NODE_BIN=/absolute/path/to/node
 *   "$NODE_BIN" "$SKILL_DIR/container_tools/setup_artifact_tool_workspace.mjs" \
 *     --workspace "$BUILD_DIR"
 *   cp scripts/generate-pn102-decks.mjs "$BUILD_DIR/generate-pn102-decks.mjs"
 *   "$NODE_BIN" "$BUILD_DIR/generate-pn102-decks.mjs" \
 *     --output-dir "$PWD/course_materials/introduction-to-nursing-practical-nursing" \
 *     --qa-dir "$BUILD_DIR/qa"
 */

import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  layers,
  Presentation,
  PresentationFile,
  text,
} from "@oai/artifact-tool";

const BRAND = {
  canvas: "#FFFFFF",
  ink: "#18232F",
  muted: "#596B7B",
  accent: "#2B6976",
  accentSoft: "#DDEEF1",
};

const chapters = [
  {
    number: 1,
    title: "The Evolution of Nursing",
    pages: "1–21",
    filename: "PN102_Ch01_Evolution_of_Nursing.pptx",
    topics: [
      ["History and education", "Trace how caregiving became a regulated profession and how formal education strengthened safe, consistent care."],
      ["Practical nursing", "Connect licensure, education, and supervision with the practical nurse’s role on the care team."],
      ["Care delivery systems", "Recognize where care is provided and how patients move across settings and team members."],
      ["Roles and responsibilities", "Link scope of practice with direct care, observation, reporting, documentation, and teaching reinforcement."],
    ],
    practiceLead: "Professional identity begins with safe habits.",
    practiceBody: "Arrive prepared, protect confidentiality, communicate respectfully, and accept feedback. Know which tasks you may perform, which require supervision, and when a change in condition must be reported.",
    checklist: ["Verify your assigned role", "Prepare before care", "Observe the patient closely", "Document what you did", "Ask before acting when unsure"],
    closing: "Know your role.\nNotice the change.\nAsk before proceeding.",
  },
  {
    number: 2,
    title: "Legal and Ethical Aspects of Nursing",
    pages: "22–39",
    filename: "PN102_Ch02_Legal_Ethical_Aspects.pptx",
    topics: [
      ["Regulation of practice", "Use the nurse practice act, board rules, facility policy, and standards of care to define safe practice."],
      ["Liability prevention", "Follow policy, report changes promptly, document accurately, and seek help before an unfamiliar task."],
      ["Ethical principles", "Use autonomy, beneficence, nonmaleficence, justice, fidelity, and veracity in patient-centered decisions."],
      ["Rights and reporting", "Respect advance directives and use the chain of command when care appears unsafe or unethical."],
    ],
    practiceLead: "Safe care stays inside scope and protects patient rights.",
    practiceBody: "Confirm that the task is authorized, that the patient understands and agrees, and that privacy is protected. Question unclear or unsafe directions and report concerns through the correct chain of command.",
    checklist: ["Confirm scope and supervision", "Protect privacy", "Respect informed choices", "Question unsafe directions", "Document facts promptly"],
    closing: "Protect the right.\nPrevent the harm.\nReport the concern.",
  },
  {
    number: 3,
    title: "Documentation",
    pages: "40–59",
    filename: "PN102_Ch03_Documentation.pptx",
    topics: [
      ["Purpose of the record", "Use the record to support communication, continuity, quality review, reimbursement, and accountability."],
      ["EHR and ISBAR", "Protect electronic information and organize important communication with a consistent ISBAR structure."],
      ["Legal charting standards", "Document promptly, objectively, accurately, and completely without assumptions or blame."],
      ["Confidentiality", "Access only the records needed for your role and correct errors according to policy."],
    ],
    practiceLead: "The record should show what happened and how the patient responded.",
    practiceBody: "Chart measurable findings, care provided, the patient’s exact statements when relevant, and the response. Never document before care is completed, share passwords, or hide a correction.",
    checklist: ["Use the correct patient record", "Chart as soon as possible", "Describe facts—not labels", "Record the patient response", "Protect access and passwords"],
    closing: "Observe the facts.\nChart the care.\nReport the change.",
  },
  {
    number: 4,
    title: "Communication",
    pages: "60–80",
    filename: "PN102_Ch04_Communication.pptx",
    topics: [
      ["Communication process", "Account for words, tone, body language, environment, culture, and feedback."],
      ["Therapeutic communication", "Use active listening, open questions, clarification, reflection, empathy, and appropriate silence."],
      ["Barriers", "Adapt when pain, anxiety, language, sensory changes, assumptions, or medical jargon interfere."],
      ["Team and patient focus", "Share clear, relevant information while including the patient and confirming understanding."],
    ],
    practiceLead: "Good communication is measured by understanding—not by speaking.",
    practiceBody: "Listen before responding, use plain language, and ask the patient to explain key information back. Use a qualified interpreter for important communication and ISBAR for focused team reporting.",
    checklist: ["Introduce yourself and listen", "Use plain language", "Ask open questions", "Confirm with teach-back", "Report with ISBAR"],
    closing: "Listen for meaning.\nConfirm understanding.\nShare what matters.",
  },
  {
    number: 5,
    title: "Nursing Process and Critical Thinking",
    pages: "81–96",
    filename: "PN102_Ch05_Nursing_Process_Critical_Thinking.pptx",
    topics: [
      ["Assessment", "Gather subjective and objective data, recognize cues, and promptly report urgent findings."],
      ["Problems and planning", "Use collected data to identify needs, understand priorities, and support measurable goals."],
      ["Implementation and evaluation", "Provide assigned care safely, observe the response, and determine whether the plan is working."],
      ["Clinical judgment", "Connect cues, risks, priorities, and scope to choose the safest next action."],
    ],
    practiceLead: "Every action begins with a cue and ends with reassessment.",
    practiceBody: "Collect reliable information, decide what is most urgent, carry out authorized care, and compare the result with the expected outcome. Escalate when the patient worsens or the plan is not working.",
    checklist: ["Collect and validate cues", "Identify the priority", "Plan within scope", "Provide and document care", "Reassess the response"],
    closing: "Gather the cue.\nChoose the priority.\nReassess the result.",
  },
  {
    number: 6,
    title: "Cultural and Ethnic Considerations",
    pages: "97–116",
    filename: "PN102_Ch06_Cultural_Ethnic_Considerations.pptx",
    topics: [
      ["Health beliefs", "Explore how background and experience may shape practices, decisions, communication, and trust."],
      ["Cultural humility", "Use self-awareness and respectful questions instead of assumptions about a group."],
      ["Language access", "Use qualified interpreters, plain language, and teach-back to support participation."],
      ["Individualized care", "Adapt care safely, protect dignity, and include patient preferences and support persons."],
    ],
    practiceLead: "Respectful care starts with curiosity—not assumptions.",
    practiceBody: "Ask what matters to the individual patient, explain before touching, and protect privacy and dignity. Use qualified language assistance and work with the team to adapt care safely.",
    checklist: ["Ask about preferences", "Examine your assumptions", "Use a qualified interpreter", "Protect dignity and privacy", "Confirm understanding"],
    closing: "Ask with respect.\nAdapt the care.\nConfirm the plan.",
  },
  {
    number: 7,
    title: "Asepsis and Infection Control",
    pages: "117–161",
    filename: "PN102_Ch07_Asepsis_Infection_Control.pptx",
    topics: [
      ["Chain of infection", "Identify how organisms spread and where nursing actions can interrupt transmission."],
      ["Clean and sterile technique", "Distinguish medical asepsis from surgical asepsis and apply the correct technique."],
      ["Precautions", "Select hand hygiene, PPE, and isolation practices for the exposure risk and transmission route."],
      ["Prevention and reporting", "Monitor for infection, reduce risk, and report concerning findings or exposures promptly."],
    ],
    practiceLead: "Break the chain before an exposure becomes an infection.",
    practiceBody: "Perform hand hygiene at the right moments, choose PPE before contact, and protect clean or sterile fields. If contamination occurs, stop, correct it, and report exposure or signs of infection promptly.",
    checklist: ["Assess the exposure risk", "Clean hands correctly", "Choose and remove PPE safely", "Protect the field", "Report exposure or infection signs"],
    closing: "Recognize the route.\nBreak the chain.\nReport the exposure.",
  },
  {
    number: 8,
    title: "Body Mechanics and Patient Mobility",
    pages: "162–188",
    filename: "PN102_Ch08_Body_Mechanics_Mobility.pptx",
    topics: [
      ["Alignment and ergonomics", "Use a stable base, proper alignment, and available equipment to reduce injury."],
      ["Positioning and transfers", "Assess ability, explain the plan, obtain help, and protect tubes, skin, and joints."],
      ["Range of motion", "Use active or passive movement to support mobility, circulation, comfort, and function."],
      ["Aids and fall prevention", "Use prescribed devices correctly while identifying fall risks and clearing hazards."],
    ],
    practiceLead: "A safe move begins before anyone lifts or stands.",
    practiceBody: "Assess the patient’s strength and instructions, prepare equipment and the environment, and ask for enough help. Stop if the patient becomes weak, dizzy, painful, or unable to follow the plan.",
    checklist: ["Assess mobility and fall risk", "Prepare equipment", "Explain the move", "Use enough assistance", "Reassess after positioning"],
    closing: "Assess before moving.\nUse the equipment.\nStop when risk changes.",
  },
  {
    number: 9,
    title: "Hygiene and Care of the Patient’s Environment",
    pages: "189–236",
    filename: "PN102_Ch09_Hygiene_Patient_Environment.pptx",
    topics: [
      ["Personal and oral hygiene", "Individualize care to promote comfort, prevent infection, and protect the mouth and skin."],
      ["Bathing and grooming", "Support cleanliness and self-esteem while preserving privacy and safe independence."],
      ["Bed and environment", "Maintain clean, dry linens and an organized setting that supports rest and skin protection."],
      ["Skin and dignity", "Inspect skin during care, report changes, and encourage the patient to do what is safely possible."],
    ],
    practiceLead: "Hygiene is care, assessment, comfort, and dignity at the same time.",
    practiceBody: "Offer choices, protect privacy, and encourage safe participation. Observe the mouth, skin, mobility, pain, and tolerance during care, then report redness, breakdown, or other concerning changes.",
    checklist: ["Explain and offer choices", "Protect privacy and warmth", "Encourage independence", "Observe mouth and skin", "Leave the environment safe"],
    closing: "Protect dignity.\nObserve the skin.\nLeave a safe space.",
  },
  {
    number: 10,
    title: "Safety",
    pages: "237–261",
    filename: "PN102_Ch10_Safety.pptx",
    topics: [
      ["Identification and environment", "Use approved identifiers and correct hazards before they cause harm."],
      ["Fall, fire, and electrical safety", "Recognize common risks, follow emergency procedures, and use equipment correctly."],
      ["Restraint alternatives", "Try the least restrictive measures first and follow authorization and monitoring rules."],
      ["Incident response", "Meet immediate patient needs, notify the nurse, document facts, and follow reporting policy."],
    ],
    practiceLead: "Prevent harm by noticing risk before the patient is injured.",
    practiceBody: "Identify the patient correctly, scan the environment, and use prevention measures consistently. After an incident, care for the patient first, notify the appropriate nurse, and document facts without blame.",
    checklist: ["Use two approved identifiers", "Correct environmental hazards", "Apply fall prevention", "Use least restrictive measures", "Respond and report after incidents"],
    closing: "Spot the hazard.\nProtect the patient.\nReport the facts.",
  },
  {
    number: 11,
    title: "Admission, Transfer, and Discharge",
    pages: "262–279",
    filename: "PN102_Ch11_Admission_Transfer_Discharge.pptx",
    topics: [
      ["Admission", "Verify identity, collect key information, protect belongings, and orient the patient to safety."],
      ["Transfer", "Communicate needs, medications, risks, and pending care as responsibility changes."],
      ["Discharge teaching", "Use clear language and teach-back for medications, follow-up, warnings, and resources."],
      ["Continuity", "Document accurately and communicate unresolved needs so the next caregiver can continue safely."],
    ],
    practiceLead: "Transitions are safe only when essential information travels with the patient.",
    practiceBody: "Confirm identity and destination, protect belongings and equipment, and give a focused handoff. Before discharge, reinforce the plan and use teach-back to identify misunderstandings.",
    checklist: ["Verify patient and destination", "Protect belongings and equipment", "Give a focused handoff", "Reinforce the care plan", "Confirm with teach-back"],
    closing: "Verify the move.\nTransfer the facts.\nConfirm the plan.",
  },
  {
    number: 12,
    title: "Vital Signs",
    pages: "280–314",
    filename: "PN102_Ch12_Vital_Signs.pptx",
    topics: [
      ["Core vital signs", "Measure temperature, pulse, respirations, and blood pressure accurately and compare with baseline."],
      ["Pulse oximetry", "Obtain a reliable reading, consider accuracy limits, and respond to low or worsening results."],
      ["Height and weight", "Use safe, consistent methods because measurements affect dosing and care planning."],
      ["Recording and reporting", "Document promptly and communicate abnormal findings, symptoms, trends, and actions."],
    ],
    practiceLead: "A number becomes meaningful when you connect it with the patient and the trend.",
    practiceBody: "Use the correct equipment and technique, repeat unexpected results when appropriate, and assess symptoms. Report urgent or worsening changes with the actual value, baseline, related findings, and actions taken.",
    checklist: ["Use correct equipment and position", "Compare with baseline", "Repeat unexpected readings", "Assess related symptoms", "Document and report the trend"],
    closing: "Measure accurately.\nCompare the trend.\nReport the change.",
  },
  {
    number: 13,
    title: "Physical Assessment",
    pages: "315–341",
    filename: "PN102_Ch13_Physical_Assessment.pptx",
    topics: [
      ["Signs and symptoms", "Combine objective signs and subjective symptoms to understand the patient’s condition."],
      ["Health history", "Use respectful, organized questions about current concerns, health, medications, allergies, and support."],
      ["Connected assessments", "Understand how provider diagnosis and ongoing nursing assessment contribute different information."],
      ["Systematic examination", "Use an organized approach, protect comfort and privacy, and report important changes."],
    ],
    practiceLead: "A consistent assessment helps you notice what has changed.",
    practiceBody: "Begin with the patient’s concern, collect a focused history, and examine in a systematic order. Compare findings with baseline and expected results, then promptly report significant changes.",
    checklist: ["Explain and protect privacy", "Collect subjective symptoms", "Observe objective signs", "Follow a consistent sequence", "Compare, document, and report"],
    closing: "Ask the concern.\nExamine in order.\nReport the difference.",
  },
];

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const argument = argv[i];
    if (!argument.startsWith("--")) continue;
    const key = argument.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    result[key] = value;
    i += 1;
  }
  return result;
}

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

function addNotes(slide, chapter, slidePurpose) {
  slide.speakerNotes.textFrame.setText([
    slidePurpose,
    "",
    "[Sources]",
    `- src/introNursingBuildout.js — Chapter ${chapter.number} extendedWeekChapters and readingFocusExplanations (local course source; accessed 2026-07-30).`,
    `- Cooper, K., & Gosnell, K. (2023). Foundations of Nursing (9th ed.), Chapter ${chapter.number}, pp. ${chapter.pages} (course-assigned textbook).`,
    "[/Sources]",
  ]);
}

function buildCover(presentation, chapter) {
  const slide = presentation.slides.add();
  slide.background.fill = BRAND.canvas;
  const titleSize = chapter.title.length > 43 ? 58 : chapter.title.length > 32 ? 68 : 80;
  slide.compose(
    layers({ name: "codex-grid-layout-library#slide-01-cover", width: "fill", height: "fill" }, [
      text(["BROWARD–MIAMI HEALTH INSTITUTE"], {
        name: "course-eyebrow",
        position: { left: 41.33, top: 41.18 },
        width: 720,
        height: 68.15,
        style: {
          fontSize: "24px",
          typeface: "Helvetica Neue",
          bold: true,
          color: BRAND.accent,
          alignment: "left",
          autoFit: "none",
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
      text([chapter.title], {
        name: "chapter-title",
        position: { left: 41.33, top: 182.55 },
        width: 1050,
        height: 261.57,
        style: {
          fontSize: `${titleSize}px`,
          typeface: "Helvetica Neue",
          bold: true,
          color: BRAND.ink,
          alignment: "left",
          verticalAlignment: "bottom",
          autoFit: "none",
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
      text([`PN 102  •  Chapter ${chapter.number}  •  Foundations of Nursing, 9th ed.  •  pp. ${chapter.pages}`], {
        name: "chapter-subtitle",
        position: { left: 41.33, top: 497.87 },
        width: 1000,
        height: 80,
        style: {
          fontSize: "28px",
          typeface: "Helvetica Neue",
          color: BRAND.muted,
          alignment: "left",
          autoFit: "none",
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
    ]),
    { frame: { left: 0, top: 0, width: 1280, height: 720 }, baseUnit: 1 },
  );
  addNotes(slide, chapter, "Introduce the chapter and connect it to the assigned textbook reading.");
  return slide;
}

function buildConcepts(presentation, chapter) {
  const slide = presentation.slides.add();
  slide.background.fill = BRAND.canvas;
  const columns = [41.33, 350.13, 657.68, 966.48];
  const nodes = [
    text([`Chapter ${chapter.number}: four ideas to connect`], {
      name: "concepts-title",
      position: { left: 41.33, top: 36.12 },
      width: 1197.33,
      height: 109.97,
      style: {
        fontSize: "42px",
        typeface: "Helvetica Neue",
        bold: true,
        color: BRAND.ink,
        alignment: "left",
        verticalAlignment: "top",
        autoFit: "none",
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    }),
    text(["2"], {
      name: "slide-number",
      position: { left: 1184.18, top: 659.24 },
      width: 54.48,
      height: 25.33,
      style: {
        fontSize: "16px",
        typeface: "Helvetica Neue",
        color: BRAND.muted,
        alignment: "right",
        verticalAlignment: "bottom",
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    }),
  ];

  chapter.topics.forEach(([topic, explanation], index) => {
    nodes.push(
      text([topic], {
        name: `concept-${index + 1}-title`,
        position: { left: columns[index], top: 231.82 },
        width: 272.54,
        height: 148.62,
        style: {
          fontSize: "25px",
          typeface: "Helvetica Neue",
          bold: true,
          color: index === 0 ? BRAND.accent : BRAND.ink,
          alignment: "left",
          verticalAlignment: "top",
          autoFit: "shrinkText",
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
      text([explanation], {
        name: `concept-${index + 1}-explanation`,
        position: { left: columns[index], top: 436.86 },
        width: 272.54,
        height: 148.62,
        style: {
          fontSize: "18px",
          typeface: "Helvetica Neue",
          color: BRAND.ink,
          alignment: "left",
          verticalAlignment: "top",
          autoFit: "none",
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
    );
  });

  slide.compose(
    layers({ name: "codex-grid-layout-library#slide-16-concepts", width: "fill", height: "fill" }, nodes),
    { frame: { left: 0, top: 0, width: 1280, height: 720 }, baseUnit: 1 },
  );
  addNotes(slide, chapter, "Explain how the four reading-focus concepts fit together before applying them to care.");
  return slide;
}

function buildPractice(presentation, chapter) {
  const slide = presentation.slides.add();
  slide.background.fill = BRAND.canvas;
  const checklistTop = [313.94, 377.94, 442.5, 506.49, 571.83];
  const nodes = [
    text(["Put the chapter into safe practical nursing care"], {
      name: "practice-title",
      position: { left: 41.33, top: 36.12 },
      width: 1197.33,
      height: 109.97,
      style: {
        fontSize: "40px",
        typeface: "Helvetica Neue",
        bold: true,
        color: BRAND.ink,
        alignment: "left",
        verticalAlignment: "top",
        autoFit: "none",
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    }),
    text([chapter.practiceLead], {
      name: "practice-lead",
      position: { left: 41.33, top: 180.83 },
      width: 581.33,
      height: 100,
      style: {
        fontSize: "30px",
        typeface: "Helvetica Neue",
        bold: true,
        color: BRAND.accent,
        alignment: "left",
        verticalAlignment: "top",
        autoFit: "shrinkText",
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    }),
    text([chapter.practiceBody], {
      name: "practice-body",
      position: { left: 41.33, top: 313.94 },
      width: 581.33,
      height: 302.85,
      style: {
        fontSize: "23px",
        typeface: "Helvetica Neue",
        color: BRAND.ink,
        alignment: "left",
        verticalAlignment: "top",
        autoFit: "none",
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    }),
    text(["3"], {
      name: "slide-number",
      position: { left: 1184.18, top: 659.24 },
      width: 54.48,
      height: 25.33,
      style: {
        fontSize: "16px",
        typeface: "Helvetica Neue",
        color: BRAND.muted,
        alignment: "right",
        verticalAlignment: "bottom",
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    }),
  ];

  chapter.checklist.forEach((item, index) => {
    nodes.push(
      text(["✓"], {
        name: `check-${index + 1}`,
        position: { left: 788.21, top: checklistTop[index] + 1 },
        width: 28,
        height: 32,
        style: {
          fontSize: "24px",
          typeface: "Helvetica Neue",
          bold: true,
          color: BRAND.accent,
          alignment: "left",
          verticalAlignment: "top",
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
      text([item], {
        name: `check-label-${index + 1}`,
        position: { left: 828, top: checklistTop[index] },
        width: 410.67,
        height: 57.61,
        style: {
          fontSize: "24px",
          typeface: "Helvetica Neue",
          color: BRAND.ink,
          alignment: "left",
          verticalAlignment: "top",
          autoFit: "shrinkText",
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
    );
  });

  slide.compose(
    layers({ name: "codex-grid-layout-library#slide-10-practice", width: "fill", height: "fill" }, nodes),
    { frame: { left: 0, top: 0, width: 1280, height: 720 }, baseUnit: 1 },
  );
  addNotes(slide, chapter, "Apply the chapter concepts to the practical nurse’s observation, action, documentation, and reporting responsibilities.");
  return slide;
}

function buildClosing(presentation, chapter) {
  const slide = presentation.slides.add();
  slide.background.fill = BRAND.canvas;
  slide.compose(
    layers({ name: "codex-grid-layout-library#slide-01-close", width: "fill", height: "fill" }, [
      text(["RECOGNIZE  →  ACT  →  REPORT"], {
        name: "closing-eyebrow",
        position: { left: 41.33, top: 41.18 },
        width: 760,
        height: 68.15,
        style: {
          fontSize: "24px",
          typeface: "Helvetica Neue",
          bold: true,
          color: BRAND.accent,
          alignment: "left",
          autoFit: "none",
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
      text([chapter.closing], {
        name: "closing-message",
        position: { left: 41.33, top: 182.55 },
        width: 1050,
        height: 261.57,
        style: {
          fontSize: "64px",
          typeface: "Helvetica Neue",
          bold: true,
          color: BRAND.ink,
          alignment: "left",
          verticalAlignment: "bottom",
          autoFit: "none",
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
      text(["Before moving on, explain the cue, your immediate action within scope, and the facts you would report."], {
        name: "closing-prompt",
        position: { left: 41.33, top: 497.87 },
        width: 900,
        height: 113.41,
        style: {
          fontSize: "27px",
          typeface: "Helvetica Neue",
          color: BRAND.muted,
          alignment: "left",
          autoFit: "none",
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
      text(["4"], {
        name: "slide-number",
        position: { left: 1184.18, top: 659.24 },
        width: 54.48,
        height: 25.33,
        style: {
          fontSize: "16px",
          typeface: "Helvetica Neue",
          color: BRAND.muted,
          alignment: "right",
          verticalAlignment: "bottom",
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
    ]),
    { frame: { left: 0, top: 0, width: 1280, height: 720 }, baseUnit: 1 },
  );
  addNotes(slide, chapter, "Close with a recall-and-application prompt: recognize the cue, act safely within scope, and report exact findings.");
  return slide;
}

function makePresentation(chapter) {
  const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
  buildCover(presentation, chapter);
  buildConcepts(presentation, chapter);
  buildPractice(presentation, chapter);
  buildClosing(presentation, chapter);
  return presentation;
}

function makePdfFromPngs(pdfPath, pngPaths) {
  const python = process.env.PYTHON_BIN || "python3";
  const source = [
    "import sys",
    "from PIL import Image",
    "pdf_path = sys.argv[1]",
    "paths = sys.argv[2:]",
    "images = [Image.open(p).convert('RGB') for p in paths]",
    "first, *rest = images",
    "first.save(pdf_path, 'PDF', save_all=True, append_images=rest, resolution=96.0)",
    "[im.close() for im in images]",
  ].join("\n");
  const result = spawnSync(python, ["-c", source, pdfPath, ...pngPaths], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`PDF export failed for ${pdfPath}: ${result.stderr || result.stdout}`);
  }
}

function makeMontageFromPngs(montagePath, pngPaths) {
  const python = process.env.PYTHON_BIN || "python3";
  const source = [
    "import sys",
    "from PIL import Image, ImageDraw",
    "output = sys.argv[1]",
    "paths = sys.argv[2:]",
    "cell_w, cell_h, gap = 800, 450, 16",
    "canvas = Image.new('RGB', (2 * cell_w + 3 * gap, 2 * cell_h + 3 * gap), (242, 242, 242))",
    "draw = ImageDraw.Draw(canvas)",
    "for index, source_path in enumerate(paths):",
    "    image = Image.open(source_path).convert('RGB')",
    "    image.thumbnail((cell_w, cell_h), Image.Resampling.LANCZOS)",
    "    column, row = index % 2, index // 2",
    "    x = gap + column * (cell_w + gap) + (cell_w - image.width) // 2",
    "    y = gap + row * (cell_h + gap) + (cell_h - image.height) // 2",
    "    canvas.paste(image, (x, y))",
    "    draw.rectangle((x - 1, y - 1, x + image.width, y + image.height), outline=(160, 160, 160), width=1)",
    "    image.close()",
    "canvas.save(output)",
  ].join("\n");
  const result = spawnSync(python, ["-c", source, montagePath, ...pngPaths], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Montage export failed for ${montagePath}: ${result.stderr || result.stdout}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args["output-dir"] || !args["qa-dir"]) {
    throw new Error("Usage: generate-pn102-decks.mjs --output-dir <dir> --qa-dir <dir>");
  }

  const outputDir = path.resolve(args["output-dir"]);
  const qaDir = path.resolve(args["qa-dir"]);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(qaDir, { recursive: true });
  await fs.writeFile(
    path.join(path.dirname(qaDir), "source-notes.txt"),
    [
      "PN 102 deck source provenance",
      "Course structure and visible copy are based on src/introNursingBuildout.js:",
      "- extendedWeekChapters",
      "- readingFocusExplanations",
      "- assigned text: Cooper & Gosnell, Foundations of Nursing, 9th ed.",
      "No external web research or external visual assets were used.",
    ].join("\n"),
  );

  const summary = [];
  for (const chapter of chapters) {
    const presentation = makePresentation(chapter);
    const stem = path.basename(chapter.filename, ".pptx");
    const deckQaDir = path.join(qaDir, stem);
    await fs.mkdir(deckQaDir, { recursive: true });

    const pngPaths = [];
    for (const [index, slide] of presentation.slides.items.entries()) {
      const pngPath = path.join(deckQaDir, `slide-${index + 1}.png`);
      const preview = await presentation.export({ slide, format: "png", scale: 1 });
      await writeBlob(pngPath, preview);
      const layout = await slide.export({ format: "layout" });
      await fs.writeFile(path.join(deckQaDir, `slide-${index + 1}.layout.json`), await layout.text());
      pngPaths.push(pngPath);
    }

    makeMontageFromPngs(path.join(deckQaDir, "montage.png"), pngPaths);

    const pptxPath = path.join(outputDir, chapter.filename);
    const pptx = await PresentationFile.exportPptx(presentation);
    await pptx.save(pptxPath);
    const inspectPath = `${pptxPath}.inspect.ndjson`;
    try {
      await fs.rename(inspectPath, path.join(deckQaDir, "export-inspect.ndjson"));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    const pdfPath = path.join(outputDir, `${stem}.pdf`);
    makePdfFromPngs(pdfPath, pngPaths);
    summary.push({ chapter: chapter.number, pptxPath, pdfPath, slideCount: pngPaths.length });
    console.log(`Generated Chapter ${chapter.number}: ${chapter.filename}`);
  }

  await fs.writeFile(path.join(qaDir, "generation-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Generated ${summary.length} PN 102 decks and ${summary.length} companion PDFs.`);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
