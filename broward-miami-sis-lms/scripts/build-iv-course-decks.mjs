import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = path.resolve(".");
const SKILL_DIR = "/Users/freedom/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations";
const RUNTIME_PYTHON = "/Users/freedom/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const buildDir = path.join(workspaceDir, "tmp", "iv-course-decks");
const outputDir = path.join(workspaceDir, "course_materials", "iv-therapy-certification-30-hour");
const sourceImageDir = path.resolve(workspaceDir, "..", "tmp", "pdfs", "course_source", "render");
const sourcePdf = "/Users/freedom/Desktop/JAN INSTRUCTOR COURSE MATERIALS FOR BOOK/20240215125453.pdf";
const { resolvePresentationFont, finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs")).href);
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
      ["Station 1: equipment and calculations", "Verify orders, select fluids and tubing, inspect supplies, prime without air, calculate pump and gravity rates, trace lines, and correct common pump alarms."],
      ["Station 2: peripheral insertion", "Prepare the patient and site, select a vein and catheter, insert on a task trainer, connect and assess patency, secure and dress the site, initiate therapy, teach the patient, and document."],
      ["Station 3: secondary infusion and access care", "Verify compatibility, prepare an IV piggyback, program the pump, use the required flushing sequence, evaluate peripheral and central-device dressings, and identify actions outside the learner's authorized role."],
      ["Station 4: complications", "Respond to infiltration, extravasation, phlebitis, fluid overload, allergic reaction, transfusion reaction, air risk, occlusion, and suspected catheter damage. State the immediate action and escalation path."]
    ],
    practice: ["Pass every critical element on the skills checklist", "Repeat any missed critical step after remediation", "Obtain the Florida RN evaluator's dated proficiency statement"]
  }
];

function addText(slide, text, position, style = {}) {
  const box = slide.shapes.add({ geometry: "textbox", position, fill: "none", line: { fill: "none", width: 0 } });
  box.text = text;
  box.text.style = { typeface: font, color: colors.ink, fontSize: 24, autoFit: "shrinkText", verticalAlignment: "middle", ...style };
  return box;
}

function baseSlide(pres, title, number) {
  const slide = pres.slides.add();
  slide.background.fill = colors.cream;
  addText(slide, title, { left: 64, top: 34, width: 1110, height: 58 }, { fontSize: 34, bold: true, color: colors.navy, verticalAlignment: "top" });
  addText(slide, String(number).padStart(2, "0"), { left: 1180, top: 42, width: 48, height: 36 }, { fontSize: 17, bold: true, color: colors.teal, textAlign: "right" });
  return slide;
}

function addSourceNotes(slide, pages, extra = "") {
  slide.speakerNotes.textFrame.setText(`Sources: Supplied Basic Intravenous Therapy Certification manual, pages ${pages}. ${extra}\nCurrent legal reference: Florida Administrative Code Rule 64B9-12.005, effective July 20, 2023; Florida Statutes section 464.003 (2026). Instructor must verify current institutional policy and drug/device guidance before use.`);
}

async function makeDeck(def, deckIndex) {
  const pres = Presentation.create({ slideSize: { width: 1280, height: 720 } });
  let slide = pres.slides.add();
  slide.background.fill = colors.navy;
  addText(slide, "BROWARD-MIAMI HEALTH INSTITUTE", { left: 74, top: 58, width: 800, height: 34 }, { fontSize: 18, bold: true, color: colors.aqua, verticalAlignment: "top" });
  addText(slide, def.title, { left: 74, top: 178, width: 750, height: 180 }, { fontSize: 48, bold: true, color: colors.white, verticalAlignment: "middle" });
  addText(slide, `${def.subtitle}\n30-Hour Basic Intravenous Therapy`, { left: 78, top: 400, width: 650, height: 90 }, { fontSize: 24, color: colors.white, verticalAlignment: "top" });
  const coverImage = await fs.readFile(path.join(sourceImageDir, `page-${String(def.page).padStart(3, "0")}.jpg`));
  slide.images.add({ blob: coverImage, contentType: "image/jpeg", alt: `Source manual page for ${def.title}`, fit: "contain", position: { left: 870, top: 92, width: 315, height: 530 } });
  addSourceNotes(slide, def.page);

  slide = baseSlide(pres, "Learning objectives", 2);
  addText(slide, def.objectives.map((x, i) => `${i + 1}. ${x}`).join("\n\n"), { left: 100, top: 150, width: 1080, height: 440 }, { fontSize: 28, color: colors.ink, verticalAlignment: "top" });
  addSourceNotes(slide, def.page);

  for (let i = 0; i < def.sections.length; i++) {
    const [heading, body] = def.sections[i];
    slide = baseSlide(pres, heading, i + 3);
    addText(slide, body, { left: 90, top: 155, width: 720, height: 350 }, { fontSize: 28, color: colors.ink, verticalAlignment: "middle" });
    const imagePage = Math.min(148, def.page + i + 1);
    const bytes = await fs.readFile(path.join(sourceImageDir, `page-${String(imagePage).padStart(3, "0")}.jpg`));
    slide.images.add({ blob: bytes, contentType: "image/jpeg", alt: `Supplied manual page ${imagePage}`, fit: "contain", position: { left: 870, top: 125, width: 300, height: 500 } });
    addSourceNotes(slide, `${def.page}-${imagePage}`);
  }

  slide = baseSlide(pres, "Practice and competency check", 7);
  addText(slide, def.practice.map((x, i) => `${i + 1}. ${x}`).join("\n\n"), { left: 100, top: 145, width: 1080, height: 350 }, { fontSize: 29, color: colors.ink, verticalAlignment: "top" });
  addText(slide, deckIndex === 7 ? "In-person evaluation: every critical element must pass under direct observation." : "Complete the matching online lesson and quiz before attending the skills lab.", { left: 100, top: 560, width: 1080, height: 72 }, { fontSize: 21, bold: true, color: colors.rust, verticalAlignment: "middle" });
  addSourceNotes(slide, def.page, deckIndex === 7 ? "Skills evaluation requires direct observation and written RN verification." : "Online preparation precedes live practice.");

  const candidate = path.join(buildDir, def.file.replace(/\.pptx$/, ".candidate.pptx"));
  await (await PresentationFile.exportPptx(pres)).save(candidate);
  const finalPath = path.join(outputDir, def.file);
  await finalizePresentation({
    workspaceDir,
    candidatePath: candidate,
    finalPath,
    pythonExecutable: RUNTIME_PYTHON,
    integrityValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_package_integrity.py"),
    layoutValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_layout_geometry.py"),
    layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-heading-fit"],
    requiredNativeTableOwnerSlides: [],
    requiredNativeChartOwnerSlides: [],
    fontPolicy: { basis: "design", families: [font] },
    verifyArtifactToolImport: true,
    receiptPath: path.join(buildDir, `${def.file}.validation.json`)
  });
  console.log(finalPath);
}

for (let i = 0; i < decks.length; i++) await makeDeck(decks[i], i);
