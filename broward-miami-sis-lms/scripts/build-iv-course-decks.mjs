import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const require = createRequire(import.meta.url);
const { ivTherapyCourse } = require("../src/ivTherapyBuildout.js");

const workspaceDir = path.resolve(".");
const SKILL_DIR = "/Users/freedom/.codex/plugins/cache/openai-primary-runtime/presentations/26.1017.31632/skills/presentations";
const RUNTIME_PYTHON = "/Users/freedom/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const buildDir = path.join(workspaceDir, "tmp", "iv-course-decks");
const outputDir = path.join(workspaceDir, "course_materials", "iv-therapy-certification-30-hour");
const sourcePdf = "/Users/freedom/Desktop/JAN INSTRUCTOR COURSE MATERIALS FOR BOOK/20240215125453.pdf";
const ocrDir = path.resolve(workspaceDir, "..", "tmp", "pdfs", "course_source", "ocr300");
const manualPageRanges = [[4, 12], [13, 16], [17, 50], [51, 61], [62, 66], [67, 79], [80, 108], [109, 123]];
const { resolvePresentationFont, finalizePresentation, makeNativeBulletParagraphs } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs")).href);
await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });
const font = resolvePresentationFont();
const colors = { navy: "#15324A", teal: "#237B82", aqua: "#CFEDEF", cream: "#F7F4EE", ink: "#13212D", rust: "#B94F3D", white: "#FFFFFF", gray: "#E3E8EB" };

const decks = [
  {
    file: "IVT_Module_01_Florida_Scope_and_Safe_Practice.pptx", title: "Florida Scope and Safe IV Practice", subtitle: "Module 1", page: 4,
    objectives: ["Explain how Florida law and Board rules govern practical nursing", "Identify IV activities that require direction or direct supervision", "Describe education, competency verification, and documentation duties"],
    sections: [
      ["Scope begins with current authority", "Florida Statutes define practical nursing as selected nursing acts performed under authorized direction. Education and experience set personal limits. Employer policy may narrow the permitted role."],
      ["The 30-hour qualification", "Florida Administrative Code Rule 64B9-12.005 requires at least 30 hours of post-graduate IV education for an LPN or graduate practical nurse who needs this qualification. Course content must cover the required cognitive and clinical areas."],
      ["Central-line preparation", "Central-line practice requires at least four hours of instruction that may count within the 30 hours. Training includes anatomy, site assessment, dressing and cap changes, flushing, administration, blood collection, and complication response."],
      ["Clinical competence and records", "A Florida-licensed RN witnesses clinical practice and files a proficiency statement. The employing institution verifies competence under its protocol. Documentation identifies the device, site, solution, delivery method, assessment, response, and complications."]
    ],
    practice: ["Classify five IV tasks as permitted, restricted, or requiring direct supervision", "Review an incomplete order and identify the clarification needed", "Write a complete peripheral IV documentation entry"]
  },
  {
    file: "IVT_Module_02_Patient_Education_and_Support.pptx", title: "Patient Education and Support", subtitle: "Module 2", page: 13,
    objectives: ["Assess physical condition, prior experience, and anxiety", "Explain IV therapy in clear patient-centered language", "Document teaching and the patient's response"],
    sections: [
      ["Assessment before teaching", "Ask what the patient understands, what happened during previous IV therapy, and what worries them now. Consider cognition, language, culture, pain, vision, hearing, and readiness to learn."],
      ["Information patients need", "Explain the purpose, expected duration, likely sensations, activity limits, equipment, monitoring, and symptoms that require immediate reporting. Use qualified language assistance when needed."],
      ["Reducing anxiety", "Prepare supplies before approaching the patient. Use a calm explanation, preserve privacy, position the patient comfortably, and invite questions. Do not minimize fear or promise a painless procedure."],
      ["Teach-back and documentation", "Ask the patient to explain how they will protect the site and which symptoms they will report. Record topics taught, learning barriers, teaching method, demonstrated understanding, and follow-up needs."]
    ],
    practice: ["Use teach-back for site protection and reportable symptoms", "Adapt teaching for an older adult with hearing loss", "Respond therapeutically to a patient who refuses insertion"]
  },
  {
    file: "IVT_Module_03_Fluids_Electrolytes_and_Calculations.pptx", title: "Fluids, Electrolytes, and Calculations", subtitle: "Module 3", page: 17,
    objectives: ["Relate fluid compartments to IV solution effects", "Recognize common volume and electrolyte disturbances", "Calculate pump and gravity infusion rates safely"],
    sections: [
      ["Fluid compartments", "Intracellular fluid lies within cells. Extracellular fluid includes intravascular and interstitial spaces. Osmosis moves water across a semipermeable membrane, while diffusion moves solutes down a concentration gradient."],
      ["Tonicity", "Isotonic solutions have an effective concentration similar to plasma. Hypotonic solutions promote movement of water into cells. Hypertonic solutions draw water out of cells and require close monitoring."],
      ["Assessment", "Track intake and output, daily weight, vital signs, lung sounds, edema, mucous membranes, cognition, urine output, and relevant laboratory values. Escalate rapid changes or critical results."],
      ["Calculations", "mL/hour equals volume divided by hours. gtt/min equals volume times tubing drop factor divided by minutes. Label units, round only at the final step, and check whether the result is clinically reasonable."]
    ],
    practice: ["Calculate 1,000 mL over 8 hours on a pump", "Calculate 250 mL over 90 minutes using 15 gtt/mL tubing", "Choose monitoring priorities for fluid deficit and fluid excess"]
  },
  {
    file: "IVT_Module_04_Transfusion_Therapy.pptx", title: "Transfusion Therapy", subtitle: "Module 4", page: 51,
    objectives: ["Identify common blood components and indications", "Apply patient and product verification safeguards", "Recognize transfusion reactions and initiate the correct response"],
    sections: [
      ["Therapeutic goals", "Blood components may restore oxygen-carrying capacity, circulating volume, platelets, or coagulation factors. Verify the current indication and prescriber order for the specific component."],
      ["Verification", "Use the institution's approved two-person or electronic verification process. Match the patient, order, compatibility record, unit identifiers, expiration, and product appearance before connection."],
      ["Administration", "Obtain baseline assessment, use approved blood tubing and compatible solution, begin within the required time, remain available during the early period, and monitor at policy-defined intervals."],
      ["Suspected reaction", "Stop the transfusion immediately. Maintain access as policy directs, assess airway and circulation, obtain vital signs, notify the RN and prescriber, recheck identification, and complete required specimens and documentation."]
    ],
    practice: ["Complete a mock bedside verification", "Differentiate allergic, febrile, hemolytic, overload, and septic findings", "Use SBAR to report a suspected reaction"]
  },
  {
    file: "IVT_Module_05_Parenteral_Nutrition.pptx", title: "Parenteral Nutrition", subtitle: "Module 5", page: 62,
    objectives: ["Explain indications and major components of parenteral nutrition", "Distinguish peripheral from central administration", "Recognize metabolic, infectious, and mechanical complications"],
    sections: [
      ["Why parenteral nutrition is used", "Parenteral nutrition supports patients whose gastrointestinal tract cannot meet nutritional needs. Formulations may contain amino acids, dextrose, electrolytes, vitamins, trace elements, fluid, and lipids."],
      ["Route and concentration", "Peripheral formulations have lower osmolarity and limited duration. Concentrated formulations generally require central access. Verify the prescribed route, formulation, filter, tubing, and dedicated lumen."],
      ["Safe administration", "Use strict asepsis, compare the bag with the order, inspect for separation or precipitate, program the exact rate, and avoid unapproved concurrent medications. Do not accelerate a delayed infusion."],
      ["Monitoring", "Monitor glucose, fluid balance, weight, electrolytes, liver and renal indicators, triglycerides when lipids are used, site and line condition, temperature, and signs of refeeding syndrome or bloodstream infection."]
    ],
    practice: ["Inspect a simulated PN label and identify discrepancies", "Respond to a bag running two hours behind", "Plan monitoring for a patient starting concentrated PN"]
  },
  {
    file: "IVT_Module_06_Chemotherapy_Safety.pptx", title: "Chemotherapy Safety", subtitle: "Module 6", page: 67,
    objectives: ["Explain major treatment concepts and common adverse effects", "Describe safe handling and exposure precautions", "Recognize extravasation and other urgent complications"],
    sections: [
      ["Role and limits", "Cancer therapy may use multiple agents and routes. LPN participation must stay within current Florida rules, direct-supervision requirements, validated competency, and institutional policy."],
      ["Patient assessment", "Review the regimen, laboratory results, allergies, access device, premedications, hydration, current symptoms, and emergency plan. Verify the protocol and independent checks required for high-alert therapy."],
      ["Exposure prevention", "Use chemotherapy-rated PPE and closed or secure connections according to policy. Keep required spill materials available. Dispose of contaminated supplies and bodily waste using hazardous-drug procedures."],
      ["Extravasation", "Pain, burning, swelling, resistance, leakage, or loss of blood return can signal extravasation. Stop the drug, leave access in place when the agent-specific protocol requires aspiration or antidote, notify the qualified clinician, and follow the exact drug protocol."]
    ],
    practice: ["Identify findings that require an immediate stop", "Select PPE for preparation, administration, and spill response", "Rehearse the facility extravasation algorithm"]
  },
  {
    file: "IVT_Module_07_Venipuncture_Standards.pptx", title: "Venipuncture Standards and Practice", subtitle: "Module 7", page: 80,
    objectives: ["Select an appropriate peripheral vein and catheter", "Perform aseptic insertion and securement on a task trainer", "Assess, maintain, and discontinue a peripheral IV safely"],
    sections: [
      ["Site and device selection", "Begin distally when appropriate. Avoid compromised extremities and sites of infection, flexion, poor circulation, or prior complications. Select the smallest gauge and shortest catheter that can support the ordered therapy."],
      ["Aseptic insertion", "Perform hand hygiene, prepare and position the patient, apply the tourniquet, cleanse the site with the approved antiseptic, let it dry, stabilize the vein, observe flashback, thread the catheter, and activate sharps protection."],
      ["Securement and maintenance", "Connect a primed extension aseptically, assess patency without force, secure the catheter, apply and label the dressing, trace tubing, start the ordered therapy, and reassess the site and patient."],
      ["Complication cues", "Cool swelling suggests infiltration. Pain, warmth, redness, or a venous cord suggests phlebitis. Burning or tissue injury with a vesicant suggests extravasation. Stop unsafe therapy and follow the condition-specific protocol."]
    ],
    practice: ["Palpate and select veins on a task trainer", "Perform the complete insertion sequence without contamination", "Discontinue the catheter and verify that it remains intact"]
  },
  {
    file: "IVT_Module_08_In_Person_Skills_Lab.pptx", title: "In-Person IV Skills Lab", subtitle: "Module 8", page: 109,
    objectives: ["Demonstrate required psychomotor skills under direct observation", "Respond to infusion problems and complications", "Complete RN-verified competency records"],
    sections: [
      ["One-day in-person schedule", "The required in-person component is one 8-hour day: 30 minutes of focused review, 2.5 hours of equipment and peripheral-start practice, 1.5 hours of IVPB and access-device work, 1 hour of complication simulation, and 2.5 hours for the examination and RN competency evaluation."],
      ["Station 1: equipment and calculations", "Verify orders, select fluids and tubing, inspect supplies, prime without air, calculate pump and gravity rates, trace lines, and correct common pump alarms."],
      ["Station 2: peripheral insertion", "Prepare the patient and site, select a vein and catheter, insert on a task trainer, connect and assess patency, secure and dress the site, initiate therapy, teach the patient, and document."],
      ["Station 3: secondary infusion and access care", "Verify compatibility, prepare an IV piggyback, program the pump, use the required flushing sequence, evaluate peripheral and central-device dressings, and identify actions outside the learner's authorized role."],
      ["Station 4: complications", "Respond to infiltration, extravasation, phlebitis, fluid overload, allergic reaction, transfusion reaction, air risk, occlusion, and suspected catheter damage. State the immediate action and escalation path."]
    ],
    practice: ["Pass every critical element on the skills checklist", "Repeat any missed critical step after remediation", "Obtain the Florida RN evaluator's dated proficiency statement"]
  }
];

const lessonMap = new Map(ivTherapyCourse.modules.flatMap((module) => module.lessons.map((lesson) => [lesson.title, lesson.content])));

const lessonTitlesByDeck = [
  ["Welcome, Hybrid Schedule, and Completion Rules", "Florida Scope, Accountability, and Facility Policy", "IV Pharmacology, Compatibility, and Medication Rights"],
  ["Circulation, Veins, and Peripheral Site Selection", "Documentation, Patient Teaching, and Lab Readiness"],
  ["Fluid Compartments, Tonicity, and Electrolyte Balance", "Flow Rates, Dosage Calculations, Pumps, and IV Piggyback"],
  ["Blood Components, Parenteral Nutrition, and High-Risk Therapy", "Live Review: Infection Control, Access Devices, Blood, and Nutrition"],
  ["Blood Components, Parenteral Nutrition, and High-Risk Therapy", "Peripheral, Midline, PICC, Central Line, and Port Overview"],
  ["Blood Components, Parenteral Nutrition, and High-Risk Therapy", "Complications: Recognition, Immediate Actions, and Prevention"],
  ["Equipment, Tubing, Catheters, and Infusion Devices", "Peripheral IV Insertion, Securement, and Discontinuation", "Complications: Recognition, Immediate Actions, and Prevention"],
  ["Skills Stations: Fluid, Tubing, Pump, and Vein Selection", "Deliberate Practice: Peripheral IV Insertion and Dressing", "IV Piggyback, Saline Lock, and Infusion Pump Practice", "Access-Device Assessment and Dressing Simulation", "Complication Simulation and Clinical Documentation", "RN Competency Checkoff - Peripheral IV Start", "RN Competency Checkoff - IVPB, Pump, and Complication Response"]
];

function addText(slide, text, position, style = {}) {
  const box = slide.shapes.add({ geometry: "textbox", position, fill: "none", line: { fill: "none", width: 0 } });
  box.text = text;
  box.text.style = { typeface: font, color: colors.ink, fontSize: 26, autoFit: "shrinkText", verticalAlignment: "top", ...style };
  return box;
}

function addBullets(slide, items, position, style = {}) {
  const box = slide.shapes.add({ geometry: "textbox", position, fill: "none", line: { fill: "none", width: 0 } });
  box.text = makeNativeBulletParagraphs(items, { marginLeftPoints: 22, hangingPoints: 10, spaceAfterPoints: 13 });
  box.text.style = { typeface: font, color: colors.ink, fontSize: 27, autoFit: "shrinkText", verticalAlignment: "top", ...style };
  return box;
}

function baseSlide(pres, title, number, sectionLabel = "") {
  const slide = pres.slides.add();
  slide.background.fill = colors.cream;
  slide.shapes.add({ geometry: "rect", position: { left: 0, top: 0, width: 22, height: 720 }, fill: colors.teal, line: { fill: colors.teal, width: 0 } });
  addText(slide, title, { left: 72, top: 42, width: 1050, height: 86 }, { fontSize: 36, bold: true, color: colors.navy });
  if (sectionLabel) addText(slide, sectionLabel.toUpperCase(), { left: 74, top: 132, width: 930, height: 26 }, { fontSize: 15, bold: true, color: colors.teal });
  addText(slide, String(number).padStart(2, "0"), { left: 1170, top: 48, width: 56, height: 30 }, { fontSize: 16, bold: true, color: colors.teal, textAlign: "right" });
  return slide;
}

function heyGenScript(title, items = []) {
  const spokenPoints = items.filter(Boolean).map((item) => item.replace(/^[-•]\s*/, "").trim());
  const explanation = spokenPoints.length
    ? spokenPoints.map((point, index) => `${index ? "Next" : "First"}, ${point}`).join(" ")
    : `Introduce ${title} and explain how it supports safe intravenous therapy.`;
  return `Welcome to this lesson segment on ${title}. ${explanation} Pause here and ask learners to identify the safety check they would complete before proceeding. Reinforce that students must follow current orders, facility policy, their authorized scope, and the supervising registered nurse's direction. Invite learners to replay this segment and record questions for the instructor.`;
}

function addSourceNotes(slide, pages, extra = "", narration = "") {
  slide.speakerNotes.textFrame.setText(`HEYGEN INSTRUCTOR SCRIPT\n${narration || heyGenScript("this topic")}\n\nPRODUCTION DIRECTION\nUse a professional nursing instructor avatar, calm pace, neutral clinical background, and captions. Pronounce IV as I-V and IVPB as I-V piggyback.\n\nSOURCES\nSupplied Basic Intravenous Therapy Certification manual, pages ${pages}; BMHI IVT 030 course content. ${extra}\nCurrent legal reference: Florida Administrative Code Rule 64B9-12.005, effective July 20, 2023; Florida Statutes section 464.003 (2026). Instructor must verify current institutional policy and current drug/device guidance before use.`);
}

function sentences(text) {
  return text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(Boolean);
}

const ocrCorrections = new Map([
  ["Bluid", "Fluid"], ["clectrolyte", "electrolyte"], ["clectrolytes", "electrolytes"],
  ["Intrscellular", "Intracellular"], ["Transpost", "Transport"], ["Metubolism", "Metabolism"],
  ["Cinculators", "Circulatory"], ["Kespirators", "Respiratory"], ["Pediatries", "Pediatrics"],
  ["chancteristics", "characteristics"], ["Sclection", "Selection"], ["Consaderations", "Considerations"],
  ["solation", "solution"], ["needic", "needle"], ["Tochniques", "Techniques"],
  ["intravcoous", "intravenous"], ["effoctive", "effective"], ["extricellular", "extracellular"],
  ["kidncy", "kidney"], ["compurtment", "compartment"], ["bomeostatic", "homeostatic"],
  ["oocur", "occur"], ["cocur", "occur"], ["murse", "nurse"], ["patien", "patient"],
  ["Nuid", "fluid"], ["Guid", "fluid"], ["Phamacology", "Pharmacology"], ["Handlouk", "Handbook"]
]);

function normalizeOcr(text) {
  let value = text.normalize("NFKC")
    .replace(/\r/g, "")
    .replace(/(\w)-\n(\w)/g, "$1$2")
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/\bPh\b/g, "pH");
  for (const [bad, good] of ocrCorrections) value = value.replace(new RegExp(`\\b${bad}\\b`, "gi"), good);
  return value;
}

function usefulOcrLines(text, pageNumber) {
  return normalizeOcr(text).split("\n").map((line) => line.replace(/\s+/g, " ").trim()).filter((line) => {
    if (!line || line === String(pageNumber) || /^page\s+\d+$/i.test(line)) return false;
    if (/^[|_~`]+$/.test(line)) return false;
    return /[A-Za-z0-9]/.test(line);
  });
}

function splitLongPoint(value, limit = 220) {
  const clean = value.replace(/^[-•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
  if (clean.length <= limit) return [clean];
  const parts = clean.split(/(?<=[.!?;:])\s+|,\s+(?=[A-Z])/).map((item) => item.trim()).filter(Boolean);
  if (parts.length > 1) return parts.flatMap((part) => splitLongPoint(part, limit));
  const words = clean.split(/\s+/);
  const output = [];
  let current = "";
  for (const word of words) {
    if (current && `${current} ${word}`.length > limit) { output.push(current); current = word; }
    else current = current ? `${current} ${word}` : word;
  }
  if (current) output.push(current);
  return output;
}

function balancedPointChunks(points, { maxItems = 5, maxCharacters = 900 } = {}) {
  const chunks = [];
  let current = [];
  let characterCount = 0;
  for (const point of points) {
    const nextCount = characterCount + point.length;
    if (current.length && (current.length >= maxItems || nextCount > maxCharacters)) {
      chunks.push(current);
      current = [];
      characterCount = 0;
    }
    current.push(point);
    characterCount += point.length;
  }
  if (current.length) chunks.push(current);

  // Avoid sparse continuation slides containing only one short point.
  if (chunks.length > 1 && chunks.at(-1).length === 1 && chunks.at(-2).length >= 3) {
    chunks.at(-1).unshift(chunks.at(-2).pop());
  }
  return chunks;
}

function pageTitle(lines, def, pageNumber) {
  const candidates = lines.slice(0, 8).filter((line) => line.length >= 5 && line.length <= 82 && !/^\d+[.)]/.test(line));
  const chosen = candidates.find((line) => /objective|outline|fluid|electrolyte|blood|transfusion|nutrition|chemotherapy|venipuncture|complication|calculation|conversion|therapy|patient|legal|scope|vein|catheter/i.test(line)) || candidates[0];
  return chosen ? chosen.replace(/^(module|unit)\s+(one|two|three|four|five|six|seven|eight|\d+)\s*/i, "").trim() : `${def.title}: source detail`;
}

async function manualBlocks(def, deckIndex) {
  const [start, end] = manualPageRanges[deckIndex];
  const blocks = [];
  for (let page = start; page <= end; page++) {
    const pagePath = path.join(ocrDir, `page-${String(page).padStart(3, "0")}.txt`);
    const lines = usefulOcrLines(await fs.readFile(pagePath, "utf8"), page);
    if (!lines.length) continue;
    const title = pageTitle(lines, def, page);
    const bodyLines = lines.filter((line, index) => !(index < 4 && line === title));
    const joined = bodyLines.join(" ").replace(/\s+/g, " ");
    const points = sentences(joined).flatMap((sentence) => splitLongPoint(sentence)).filter((point) => point.length > 3);
    const pageChunks = balancedPointChunks(points);
    for (let i = 0; i < pageChunks.length; i++) {
      blocks.push({
        title: i ? `${title} — continued` : title,
        items: pageChunks[i],
        pages: String(page),
        sourceLabel: `Manual page ${page}`
      });
    }
  }
  return blocks;
}

function cleanLessonContent(value = "") {
  return value
    .replace(/QUIZ_DATA_BASE64:[A-Za-z0-9+/=]+/g, "")
    .replace(/\n*Course file:[\s\S]*$/i, "")
    .replace(/Canvas item type:[^\n]*\n?/gi, "")
    .trim();
}

function contentBlocks(value = "", fallbackTitle = "Course content") {
  const rawBlocks = cleanLessonContent(value).split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const output = [];
  let continuation = 1;
  for (const block of rawBlocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    let title = fallbackTitle;
    let bodyLines = lines;
    if (lines.length > 1 && lines[0].length <= 72 && !/^[-\d[\]]/.test(lines[0])) {
      title = lines[0];
      bodyLines = lines.slice(1);
    } else if (rawBlocks.length > 1) {
      title = `${fallbackTitle} ${continuation++}`;
    }
    let items = bodyLines.flatMap((line) => {
      const cleaned = line.replace(/^[-•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
      return cleaned.length > 185 ? sentences(cleaned) : [cleaned];
    }).filter((item) => item.length > 2 && !/^\[.\]/.test(item));
    if (!items.length) items = sentences(lines.join(" "));
    const contentChunks = balancedPointChunks(items);
    for (let i = 0; i < contentChunks.length; i++) {
      const chunk = contentChunks[i];
      output.push({ title: i ? `${title} continued` : title, items: chunk });
    }
  }
  return output;
}

async function relevantBlocks(def, deckIndex) {
  const blocks = [];
  for (const [heading, body] of def.sections) {
    const details = sentences(body);
    blocks.push({ title: heading, items: details });
  }
  for (const lessonTitle of lessonTitlesByDeck[deckIndex]) {
    const content = lessonMap.get(lessonTitle);
    if (content) blocks.push(...contentBlocks(content, lessonTitle));
  }
  blocks.push(...await manualBlocks(def, deckIndex));
  const seen = new Set();
  return blocks.filter((block) => {
    const key = `${block.title.toLowerCase()}|${block.items.join(" ").toLowerCase().slice(0, 120)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return block.items.length;
  });
}

function addContentSlide(pres, block, number, moduleLabel, pages) {
  const slide = baseSlide(pres, block.title, number, moduleLabel);
  addBullets(slide, block.items, { left: 92, top: 185, width: 1080, height: 430 }, { fontSize: block.items.length > 4 ? 23 : block.items.length > 3 ? 25 : 28 });
  addText(slide, "Use current orders, facility policy, and authorized scope when applying this information.", { left: 94, top: 642, width: 1070, height: 32 }, { fontSize: 15, color: colors.rust, bold: true });
  if (block.sourceLabel) addText(slide, block.sourceLabel, { left: 94, top: 606, width: 1070, height: 26 }, { fontSize: 14, color: colors.teal, bold: true });
  addSourceNotes(slide, block.pages || pages, "", heyGenScript(block.title, block.items));
}

async function makeDeck(def, deckIndex) {
  const pres = Presentation.create({ slideSize: { width: 1280, height: 720 } });
  let slide = pres.slides.add();
  slide.background.fill = colors.navy;
  slide.shapes.add({ geometry: "rect", position: { left: 0, top: 0, width: 28, height: 720 }, fill: colors.teal, line: { fill: colors.teal, width: 0 } });
  addText(slide, "BROWARD-MIAMI HEALTH INSTITUTE", { left: 76, top: 66, width: 800, height: 32 }, { fontSize: 17, bold: true, color: colors.aqua });
  addText(slide, def.title, { left: 76, top: 190, width: 1040, height: 170 }, { fontSize: 52, bold: true, color: colors.white, verticalAlignment: "middle" });
  addText(slide, `${def.subtitle}  |  30-Hour Basic Intravenous Therapy`, { left: 80, top: 414, width: 920, height: 50 }, { fontSize: 25, color: colors.white });
  addText(slide, "Comprehensive instructor presentation • full manual coverage", { left: 80, top: 500, width: 940, height: 42 }, { fontSize: 20, color: colors.aqua, bold: true });
  addSourceNotes(slide, def.page, "", `Welcome to ${def.title}, ${def.subtitle} of the BMHI thirty-hour intravenous therapy course. Explain that this module prepares learners for safe practice and the supervised in-person competency day. Preview the learning objectives and remind learners to complete the matching portal lesson and assessment.`);

  slide = baseSlide(pres, "Learning objectives", 2, def.subtitle);
  addBullets(slide, def.objectives, { left: 94, top: 190, width: 1070, height: 390 }, { fontSize: 29 });
  addSourceNotes(slide, def.page, "", heyGenScript("the learning objectives", def.objectives));

  const blocks = await relevantBlocks(def, deckIndex);
  let slideNumber = 3;
  for (const block of blocks) addContentSlide(pres, block, slideNumber++, def.subtitle, `${def.page}-${Math.min(148, def.page + 12)}`);

  slide = baseSlide(pres, "Practice and competency check", slideNumber++, def.subtitle);
  addBullets(slide, def.practice, { left: 94, top: 190, width: 1070, height: 330 }, { fontSize: 29 });
  addText(slide, deckIndex === 7 ? "Every critical element requires direct observation and a passing evaluation." : "Complete the matching online lesson and assessment before the in-person laboratory.", { left: 94, top: 560, width: 1070, height: 62 }, { fontSize: 22, bold: true, color: colors.rust });
  addSourceNotes(slide, def.page, deckIndex === 7 ? "Skills evaluation requires direct observation and written RN verification." : "Online preparation precedes live practice.", heyGenScript("practice and competency expectations", def.practice));

  slide = baseSlide(pres, "Key points", slideNumber, def.subtitle);
  addBullets(slide, [def.objectives[0], def.sections[1][1], def.sections[3][1]], { left: 94, top: 190, width: 1070, height: 380 }, { fontSize: 27 });
  addText(slide, "Review the course lesson, complete the assessment, and bring questions to the live session.", { left: 94, top: 574, width: 1070, height: 54 }, { fontSize: 22, bold: true, color: colors.teal });
  addSourceNotes(slide, def.page, "", heyGenScript("the module key points", [def.objectives[0], def.sections[1][1], def.sections[3][1]]));

  const expandedFile = def.file.replace(/\.pptx$/, "_22hr_Online_8hr_InPerson_v9_Consolidated_Scripted.pptx");
  const candidate = path.join(buildDir, expandedFile.replace(/\.pptx$/, ".candidate.pptx"));
  await (await PresentationFile.exportPptx(pres)).save(candidate);
  const finalPath = path.join(outputDir, expandedFile);
  await finalizePresentation({
    workspaceDir,
    candidatePath: candidate,
    finalPath,
    pythonExecutable: RUNTIME_PYTHON,
    integrityValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_package_integrity.py"),
    layoutValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_layout_geometry.py"),
    layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
    requiredNativeTableOwnerSlides: [],
    requiredNativeChartOwnerSlides: [],
    fontPolicy: { basis: "design", families: [font] },
    verifyArtifactToolImport: true,
    receiptPath: path.join(buildDir, `${expandedFile}.validation.json`)
  });
  console.log(`${finalPath} (${pres.slides.items.length} slides)`);
}

for (let i = 0; i < decks.length; i++) await makeDeck(decks[i], i);
