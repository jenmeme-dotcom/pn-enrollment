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
const studyGuidePdf = "/Users/freedom/Downloads/283240876-IV-Study-Guide-2013.pdf";
const ocrDir = path.resolve(workspaceDir, "..", "tmp", "pdfs", "course_source", "ocr300");
const manualPageRanges = [[4, 12], [13, 16], [17, 50], [51, 61], [62, 66], [67, 79], [80, 108], [109, 123]];
const { resolvePresentationFont, finalizePresentation, makeNativeBulletParagraphs } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs")).href);
await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });
const font = resolvePresentationFont();
const colors = { navy: "#15324A", teal: "#237B82", aqua: "#CFEDEF", cream: "#F7F4EE", ink: "#13212D", rust: "#B94F3D", white: "#FFFFFF", gray: "#E3E8EB" };

const mediaByDeck = [
  { file: "pexels-6129154.jpg", alt: "Nurse and physicians reviewing a clinical chart", creator: "RDNE Stock project", url: "https://www.pexels.com/photo/doctor-reading-a-medical-chart-held-by-a-nurse-6129154/" },
  { file: "pexels-4269202.jpg", alt: "Nurse speaking with a patient in a clinical setting", creator: "Cedric Fauntleroy", url: "https://www.pexels.com/photo/nurses-having-a-conversation-4269202/" },
  { file: "pexels-6129679.jpg", alt: "Healthcare professional operating an infusion pump", creator: "RDNE Stock project", url: "https://www.pexels.com/photo/close-up-photo-of-an-infusion-pump-6129679/" },
  { file: "pexels-3845115.jpg", alt: "Patient receiving intravenous therapy in a hospital", creator: "Anna Shvets", url: "https://www.pexels.com/photo/patient-with-iv-line-3845115/" },
  { file: "pexels-11081177.jpg", alt: "Intravenous fluid and monitoring equipment in a hospital", creator: "Stéf -b.", url: "https://www.pexels.com/photo/iv-drip-in-hospital-11081177/" },
  { file: "pexels-14513020.jpg", alt: "Healthcare professionals wearing protective equipment", creator: "Roman Muntean", url: "https://www.pexels.com/photo/medical-professionals-wearing-personal-protective-equipment-14513020/" },
  { file: "pexels-35645529.jpg", alt: "Nursing students practicing on a medical mannequin", creator: "Sahil Singh", url: "https://www.pexels.com/photo/nurses-training-with-medical-mannequin-in-simulation-lab-35645529/" },
  { file: "pexels-32213307.jpg", alt: "Nursing students learning in a laboratory setting", creator: "Yusuf Çelik", url: "https://www.pexels.com/photo/aspiring-nurse-students-in-laboratory-setting-32213307/" }
];

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

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

// Curated teaching content replaces the former page-by-page OCR dump.  Each
// item has one teachable point, a clinical application, or a true comparison
// table.  The supplied manual remains the source reference, not the slide
// layout.
const teachingBlocksByDeck = [
  [
    { title: "Why IV therapy is used", table: [["Clinical purpose", "Example"], ["Restore or maintain volume", "Hydration, resuscitation, or replacement of ongoing losses"], ["Correct electrolyte or acid-base disturbance", "Ordered sodium, potassium, magnesium, calcium, or buffer therapy"], ["Deliver medication", "Continuous, intermittent, secondary, or time-critical infusion"], ["Provide blood components", "Red cells, platelets, plasma, or cryoprecipitate for a defined indication"], ["Provide nutrition or diagnostic therapy", "Parenteral nutrition, contrast, or other prescribed agents"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF page 10." },
    { title: "IV therapy benefits and risks", table: [["Benefit", "Corresponding risk"], ["Rapid and predictable effect", "An error reaches the circulation immediately"], ["Accurate titration", "Wrong concentration or pump setting can cause serious harm"], ["Access when oral therapy is unavailable", "Catheter creates an infection and vessel-injury risk"], ["Multiple therapy options", "Incompatibility, fluid overload, infiltration, or allergic reaction may occur"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF page 10." },
    { title: "Legal accountability in every phase", table: [["Phase", "Accountability"], ["Before", "Verify authority, competency, policy, patient, order, allergies, access, calculations, and compatibility"], ["During", "Maintain asepsis, use the correct device and pump, monitor the site and patient, and respond to changes"], ["After", "Evaluate the outcome, document completely, report complications, and preserve required records"]], extra: "Source topics: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 3-6 and 13. Current Florida law controls." },
    { title: "Seven rights of IV medication and fluid administration", table: [["Right", "Safety question"], ["Patient", "Do two approved identifiers match the order and medication record?"], ["Medication or solution", "Is this the exact product and formulation ordered?"], ["Dose", "Does the concentration and calculation produce the ordered dose?"], ["Route", "Is IV administration appropriate for this device, lumen, and site?"], ["Time", "Are the start time, interval, duration, and rate correct?"], ["Reason", "Does the indication match the patient's condition and current assessment?"], ["Documentation", "Can another clinician see exactly what was given and how the patient responded?"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF page 24. BMHI teaches response monitoring as an additional safety obligation." },
    { title: "The rights continue after the pump starts", items: ["Trace the line from the patient to the correct container and pump channel.", "Confirm the site remains patent and free of pain, swelling, leaking, redness, or temperature change.", "Evaluate the intended response and watch for adverse effects.", "Reconcile the actual volume infused with the order and intake record.", "Document assessment, administration, patient education, response, and any corrective action."], extra: "Teaching expansion from 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 24-27." },
    { title: "Essential IV terminology", table: [["Term", "Meaning"], ["Patency", "The access device permits appropriate flow without evidence of complication"], ["Infiltration", "Nonvesicant solution enters surrounding tissue"], ["Extravasation", "Vesicant solution enters surrounding tissue and may cause injury"], ["Phlebitis", "Inflammation of a vein"], ["Occlusion", "Partial or complete blockage of flow"], ["Compatibility", "Two or more products can contact each other without unacceptable physical, chemical, or therapeutic interaction"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, glossary PDF pages 61-62." },
    { title: "Authority, competency, and policy are three separate checks", items: ["Authority asks whether the law and license permit the activity.", "Competency asks whether the nurse has current education, supervised practice, and validated skill.", "Policy asks whether the employer permits the activity in this setting.", "Safe practice requires all three—not just a course certificate."] },
    { title: "Before starting any infusion", items: ["Confirm the patient with two approved identifiers.", "Read the complete order: solution or medication, concentration, route, dose, rate, duration, and indication.", "Check allergies, compatibility, access-device suitability, and required laboratory results.", "Stop and clarify any missing, conflicting, or unsafe information before preparing the therapy."] },
    { title: "The medication-rights safety pause", table: [["Check", "Question to ask"], ["Patient", "Do both identifiers match the order and medication record?"], ["Medication and dose", "Is this the exact product, concentration, and calculated dose?"], ["Route and access", "Is the ordered route appropriate for this device and site?"], ["Time and rate", "Are timing, pump settings, and duration correct?"], ["Response", "What assessment and monitoring are required before, during, and after?"]] },
    { title: "When the correct action is to stop", items: ["Stop for a questionable order, unexpected patient change, loss of device patency, incompatibility, contamination, or pump setting that cannot be verified.", "Protect the patient first, maintain access only as directed, notify the supervising RN or prescriber, and document objective findings and actions.", "Never continue simply because a medication has already been prepared or a schedule is running late."] }
  ],
  [
    { title: "Patient factors that change the plan", table: [["Factor", "How it affects IV care"], ["Age and skin condition", "Changes vein visibility, fragility, securement, and teaching needs"], ["Mobility and dominant side", "Affects site protection, comfort, and dislodgement risk"], ["Past surgery, vascular access, or lymphatic compromise", "May restrict extremity selection"], ["Cognition, language, hearing, or vision", "Changes the teaching method and need for assistance"], ["Prior difficult access or anxiety", "Calls for early planning, support, and timely escalation"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 22-24." },
    { title: "Informed participation and refusal", items: ["Explain the purpose, expected benefit, common risks, alternatives, and what the patient will experience within the nurse's role.", "Allow questions and verify understanding using teach-back.", "Respect a capable patient's refusal. Do not coerce or conceal information.", "Protect the patient, notify the appropriate clinician, document the discussion and refusal, and follow policy for alternatives."], extra: "Source themes: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 24-27." },
    { title: "Patient protection during daily activity", table: [["Activity", "Teaching point"], ["Walking or transferring", "Keep the pump, pole, tubing, and catheter supported and visible"], ["Bathing or hygiene", "Keep the dressing and connections dry according to policy"], ["Sleeping or repositioning", "Avoid pulling, kinking, compression, or lying on the catheter"], ["New symptom", "Report pain, burning, wetness, swelling, redness, coolness, itching, chills, or shortness of breath immediately"]], extra: "Source themes: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 24-28." },
    { title: "Start with the patient's question", items: ["Ask what the patient believes the IV is for and what concerns them most.", "Correct misunderstandings before giving more information.", "Use short explanations, one idea at a time, and avoid unexplained abbreviations."] },
    { title: "A plain-language IV explanation", items: ["Purpose: explain what the infusion is expected to do.", "Process: describe site preparation, catheter placement, connection, and monitoring.", "Sensation: describe expected pressure or brief discomfort without promising a painless procedure.", "Safety: tell the patient which symptoms must be reported immediately."] },
    { title: "Comfort and positioning before insertion", items: ["Assess pain and provide ordered comfort measures before beginning when possible.", "Position the patient and limb so the selected site remains supported and visible.", "Invite the patient to participate in site selection when clinically appropriate.", "Explain that a soft plastic catheter remains after the introducer needle is removed."], extra: "Additional source: Peripheral Intravenous Initiation Self Learning Module, pages 17-18. The language has been adapted for current Florida practice and facility policy." },
    { title: "Symptoms the patient should report now", table: [["Patient report", "Why it matters"], ["Burning, stinging, pain, or tightness", "May signal infiltration, phlebitis, or extravasation"], ["Wetness, leaking, or loose dressing", "May indicate disconnection, leakage, or loss of securement"], ["Swelling, redness, warmth, or coolness", "May signal a local complication"], ["Shortness of breath, itching, chills, or dizziness", "May signal a systemic reaction requiring immediate assessment"]] },
    { title: "Teach-back checks understanding", items: ["Do not ask only, “Do you understand?”", "Ask: “Show me how you will protect this tubing when you move.”", "Ask: “Which changes at the IV site will you report right away?”", "If the answer is incomplete, reteach in a different way and check again."] }
  ],
  [
    { title: "Fluid compartments and tonicity", image: "fluid-compartments-tonicity-v2.png", imageWide: true, imageAlt: "Three-panel medical illustration of intravascular, interstitial, and intracellular water movement under different tonicities", items: ["Isotonic: no major net cellular water shift.", "Hypotonic: water moves toward cells.", "Hypertonic: water moves away from cells."], extra: "Original BMHI educational visual generated October 23, 2026. Source topics: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 14-19." },
    { title: "IV fluids and delivery equipment", image: "iv-bags-pump-clinical-v1.png", imageAlt: "Generic IV fluid bags, primary tubing, drip chambers, and infusion pump in a clinical skills laboratory", items: ["Match the solution and additives to the complete order.", "Inspect the container, ports, tubing, drip chamber, clamps, and pump before use.", "Prime the complete fluid path without contaminating key parts or leaving air.", "Trace the line from the patient to the correct container and pump channel before starting."], extra: "Original BMHI educational image generated October 23, 2026. Source topics: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 25 and 28-30." },
    { title: "Water balance depends on intake, output, and regulation", table: [["Regulator", "Role in fluid balance", "Assessment connection"], ["Kidneys", "Adjust water and electrolyte excretion", "Urine output, concentration, creatinine, daily weight"], ["Heart and circulation", "Maintain perfusion and hydrostatic pressure", "Blood pressure, pulse, edema, lung sounds"], ["Antidiuretic hormone", "Promotes renal water retention", "Serum sodium, osmolality, urine concentration"], ["Aldosterone and natriuretic peptides", "Influence sodium and water retention or excretion", "Volume status, sodium, edema, cardiovascular condition"], ["Thirst mechanism", "Promotes oral water intake", "Cognition, access to water, swallowing and fluid restrictions"]], extra: "Source themes: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 14-15." },
    { title: "Fluid movement across compartments", table: [["Process", "What moves", "Clinical meaning"], ["Osmosis", "Water across a semipermeable membrane toward higher effective solute concentration", "Explains cellular swelling or shrinking with tonicity changes"], ["Diffusion", "Solute from higher to lower concentration", "Helps explain gas and electrolyte distribution"], ["Filtration", "Water and solutes driven by pressure", "Contributes to capillary fluid movement and edema"], ["Active transport", "Solutes against a gradient using energy", "Maintains sodium-potassium and other cellular gradients"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 14-15." },
    { title: "Fluid deficit and fluid excess", table: [["Assessment", "Possible deficit", "Possible excess"], ["Vital signs", "Tachycardia, orthostasis, hypotension", "Hypertension, tachycardia, reduced oxygenation"], ["Lungs", "Usually clear unless another condition exists", "Crackles, dyspnea, increased work of breathing"], ["Skin and mucosa", "Dry mucosa, poor turgor", "Edema, rapid weight gain"], ["Urine and weight", "Low output, concentrated urine, weight loss", "Variable output, dilution, daily weight gain"], ["Neurologic", "Weakness, dizziness, confusion", "Headache, restlessness, confusion"]], extra: "Source topics: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 14-19." },
    { title: "Third spacing hides volume outside the circulation", items: ["Fluid can leave the intravascular space and collect where it does not support perfusion.", "Edema, ascites, burns, inflammation, or low oncotic pressure may coexist with intravascular depletion.", "Assess blood pressure, heart rate, urine output, daily weight, edema, abdominal findings, laboratory trends, and respiratory status together.", "Do not assume visible edema means the patient has adequate circulating volume."], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF page 14." },
    { title: "Solution categories and monitoring", table: [["Category", "General effect", "Common safety focus"], ["Isotonic crystalloid", "Expands extracellular volume with limited initial cellular shift", "Fluid overload, chloride load, cardiac and renal tolerance"], ["Hypotonic solution", "Provides proportionally more free water and may move water into cells", "Neurologic status, sodium, intravascular depletion"], ["Hypertonic solution", "Draws water toward the intravascular space", "Rapid sodium or glucose changes, vein irritation, overload"], ["Colloid or blood component", "Raises oncotic pressure or replaces a specific component", "Reaction, overload, indication, product-specific monitoring"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 18-19. Product selection requires the current order and pharmacy or facility reference." },
    { title: "Common crystalloid examples", table: [["Category", "Examples", "Teaching point"], ["Isotonic", "0.9% sodium chloride; lactated Ringer's; balanced crystalloids", "Primarily expands extracellular volume; monitor cardiac and renal tolerance"], ["Hypotonic", "0.45% sodium chloride and other lower-tonicity solutions", "May provide free water; monitor sodium, neurologic status, and circulating volume"], ["Hypertonic", "3% sodium chloride; dextrose-saline combinations with higher effective tonicity", "Requires an exact indication, controlled rate, appropriate access, and close monitoring"], ["Dextrose in water", "D5W is isotonic in the bag but becomes physiologically hypotonic after glucose metabolism", "Consider glucose and free-water effects"]], note: "Solution classification can change after metabolism and depends on the complete formulation. Use the current pharmacy reference and order.", extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 18-19. Examples were updated and simplified for current teaching." },
    { title: "IV fluid selection begins with the clinical problem", table: [["Clinical question", "Why it matters"], ["What deficit or goal is being treated?", "Volume loss, maintenance need, electrolyte problem, glucose need, medication carrier, or resuscitation require different plans"], ["Which compartment needs support?", "A solution may expand circulation, supply free water, or shift water between compartments"], ["Can the patient tolerate the sodium, chloride, glucose, potassium, and volume?", "Cardiac, kidney, liver, endocrine, and neurologic conditions change risk"], ["Is the access device appropriate?", "Osmolarity, pH, vesicant properties, duration, and rate affect device choice"], ["How will response be measured?", "Vital signs, weight, urine output, lungs, edema, mentation, glucose, and laboratory trends"]], extra: "Teaching synthesis from 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 14-19." },
    { title: "Fluid therapy reassessment", table: [["Before infusion", "During infusion", "After or at transition"], ["Baseline vital signs, weight, lungs, edema, mucosa, cognition, urine output, current labs", "Site and line, pump settings, intake, urine output, respiratory status, hemodynamics, symptoms", "Total volume delivered, response to goal, repeat assessment and labs, ongoing plan"], ["Identify heart, kidney, liver, endocrine, pregnancy, age, and medication risks", "Compare findings with baseline and prescribed endpoints", "Document whether therapy achieved the intended outcome and any complications"]], extra: "Source themes: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 14-19." },
    { title: "Where body fluid is located", table: [["Compartment", "Location", "Clinical connection"], ["Intracellular", "Inside cells", "Tonicity changes can move water into or out of cells"], ["Intravascular", "Inside blood vessels", "Directly affects perfusion and circulatory volume"], ["Interstitial", "Between cells", "Excess fluid may appear as edema"]] },
    { title: "Tonicity predicts water movement", table: [["Solution type", "Expected water shift", "Key monitoring"], ["Isotonic", "Primarily expands extracellular volume", "Lung sounds, edema, blood pressure"], ["Hypotonic", "Water moves toward cells", "Neurologic status and cellular swelling risk"], ["Hypertonic", "Water moves out of cells", "Vein irritation, sodium, glucose, and fluid overload"]] },
    { title: "Major electrolytes and common adult reference ranges", table: [["Electrolyte", "Common reference range", "Primary role"], ["Sodium", "135–145 mEq/L", "Extracellular osmolality, water balance, nerve and muscle function"], ["Potassium", "3.5–5.0 mEq/L", "Cardiac conduction, muscle contraction, intracellular balance"], ["Chloride", "96–106 mEq/L", "Extracellular osmotic and acid-base balance"], ["Calcium", "8.9–10.1 mg/dL", "Bone, clotting, nerve signaling, muscle contraction"], ["Magnesium", "1.5–2.5 mg/dL", "Neuromuscular function and enzyme activity"], ["Phosphorus", "2.5–4.5 mg/dL", "Energy metabolism, cells, bone, and acid-base buffering"]], note: "Reference ranges vary by laboratory, age, specimen type, albumin level, and clinical context. Use the reporting laboratory's range and evaluate trends rather than treating a single value in isolation.", extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 16-17. Ranges are presented as the packet's common adult examples and must be compared with the current reporting laboratory." },
    { title: "Sodium imbalance affects the brain and fluid balance", table: [["Pattern", "Common assessment findings", "IV therapy connection"], ["Hypernatremia", "Thirst, irritability, weakness, altered mental status; severe cases may progress to seizures", "Assess water loss, sodium gain, fluid balance, neurologic status, and ordered correction rate"], ["Hyponatremia", "Headache, nausea, confusion, fatigue, muscle weakness; severe or rapid decline may cause seizures", "Review hypotonic fluids, excess free water, diuretics, GI losses, glucose, and the ordered correction plan"]], note: "Rapid sodium correction can cause severe neurologic injury. Verify the solution, concentration, pump settings, monitoring schedule, and prescribed rate. Escalate acute neurologic changes immediately.", extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 16-17. Findings were condensed for nursing recognition; treatment requires current orders and protocol." },
    { title: "Potassium imbalance can become a cardiac emergency", table: [["Pattern", "Common assessment findings", "IV therapy connection"], ["Hyperkalemia", "Muscle weakness, paresthesia, nausea, bradycardia or other dysrhythmias; ECG changes may occur", "Stop and clarify potassium-containing therapy when results or symptoms conflict with the order; obtain urgent assessment"], ["Hypokalemia", "Weakness, cramps, constipation, weak or irregular pulse; ECG changes and dysrhythmias may occur", "Review GI loss, diuretics, insulin effect, and magnesium; verify replacement concentration and rate"]], note: "Never give potassium by IV push. Use the ordered dilution, route, pump, monitoring, and maximum rate for the care setting. Confirm adequate renal function and urine output as required by policy.", extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 16-17. Medication and infusion directions were updated to a safety-focused framework rather than reproducing the packet's treatment list." },
    { title: "Calcium imbalance changes neuromuscular and cardiac function", table: [["Pattern", "Common assessment findings", "IV therapy connection"], ["Hypercalcemia", "Fatigue, weakness, nausea, constipation, dehydration, confusion, shortened QT or dysrhythmia", "Assess hydration, renal function, medications, ECG when indicated, and the ordered treatment response"], ["Hypocalcemia", "Perioral or fingertip tingling, cramps, tetany, hyperreflexia, possible laryngospasm, prolonged QT or dysrhythmia", "Escalate airway symptoms, seizures, tetany, or ECG changes; verify calcium product and compatibility"]], note: "Total calcium may be influenced by albumin. Ionized calcium may better reflect physiologically active calcium in selected patients. IV calcium products are not interchangeable and require order-specific administration.", extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF page 16. Findings were reorganized for recognition and safe escalation." },
    { title: "Magnesium and phosphorus support muscle, nerve, and cellular energy", table: [["Imbalance", "Common assessment findings", "Priority"], ["High magnesium", "Lethargy, weakness, hypotension, bradycardia, reduced reflexes, respiratory depression", "Stop magnesium therapy when authorized, assess airway and circulation, notify immediately, and follow the emergency protocol"], ["Low magnesium", "Tremor, cramps, hyperreflexia, confusion, seizures, prolonged QT or dysrhythmias", "Check related potassium and calcium abnormalities; verify replacement rate and monitoring"], ["High phosphorus", "Often reflects renal dysfunction; symptoms may relate to low calcium, including tingling, cramps, or tetany", "Review renal function, calcium, medications, and the prescribed plan"], ["Low phosphorus", "Weakness, confusion, impaired respiratory muscle function, rhabdomyolysis in severe cases", "Assess nutrition and refeeding risk; verify replacement product, route, and monitoring"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 16-18. Content was condensed and framed around assessment and escalation rather than fixed treatment recipes." },
    { title: "Chloride findings must be interpreted with sodium and acid-base status", table: [["Pattern", "Common clinical association", "Assessment focus"], ["Hyperchloremia", "May occur with dehydration, bicarbonate loss, renal dysfunction, or large chloride loads", "Review fluid type and volume, sodium, bicarbonate or total CO₂, renal function, and breathing pattern"], ["Hypochloremia", "May occur with vomiting, gastric suction, diuretics, or dilution", "Review fluid losses, sodium, potassium, bicarbonate or total CO₂, and neuromuscular symptoms"]], note: "Chloride abnormalities rarely stand alone. Evaluate the complete metabolic panel, fluid balance, clinical condition, and ordered IV solution before acting.", extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 16-17. The original list was reorganized to show the relationship between chloride, fluid therapy, and acid-base assessment." },
    { title: "Electrolyte result safety check", table: [["Step", "Nursing question"], ["Verify", "Does the result belong to this patient, and could hemolysis or collection error affect it?"], ["Assess", "Does the patient have neurologic, cardiac, respiratory, or neuromuscular changes?"], ["Connect", "Which fluids, medications, losses, renal changes, or nutrition therapies may contribute?"], ["Protect", "Should an infusion be stopped or held under policy while the result is clarified?"], ["Escalate", "Which finding requires immediate RN, prescriber, rapid-response, or emergency notification?"]], note: "Treat the patient and verified clinical data together. Do not independently select a replacement product, concentration, or rate outside the nurse's authorized role.", extra: "Teaching synthesis based on 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 16-18, adapted to current orders and facility policy." },
    { title: "Metric conversion chart", table: [["Relationship", "Conversion", "Use"], ["Volume", "1 L = 1,000 mL", "Convert the ordered bag volume"], ["Mass", "1 g = 1,000 mg", "Medication-dose conversion"], ["Small mass", "1 mg = 1,000 mcg", "High-alert and weight-based doses"], ["Weight", "1 kg = 2.2 lb", "Convert pounds to kilograms before dosing"], ["Household volume", "1 tsp = 5 mL; 1 Tbsp = 15 mL", "Use only when an approved clinical reference permits"]], note: "Apothecary units are legacy units and are error-prone. Do not guess or rely on OCR-transcribed values; clarify the order and use an approved conversion reference." },
    { title: "Pump-rate formula", items: ["Formula: mL/hr = total volume in mL ÷ time in hours.", "Example: 1,000 mL ÷ 8 hr = 125 mL/hr.", "Safety check: 125 mL/hr × 8 hr returns the original 1,000 mL.", "Program the pump only after matching the result to the order and confirming the correct channel and line."] },
    { title: "Gravity-rate formula", items: ["Formula: gtt/min = volume in mL × drop factor in gtt/mL ÷ time in minutes.", "Example: 250 mL × 15 gtt/mL ÷ 90 min = 41.7 gtt/min.", "Round to a whole drop: 42 gtt/min.", "Reassess the drip because patient position, tubing height, and resistance can change a gravity rate."] },
    { title: "A four-step calculation safety method", table: [["Step", "Action"], ["1. Organize", "Write the ordered volume, time, and tubing factor with units"], ["2. Convert", "Make units consistent before calculating"], ["3. Calculate", "Use one formula and keep units visible"], ["4. Verify", "Work backward and ask whether the answer is clinically reasonable"]] }
    ,{ title: "Dose-volume calculation", items: ["Formula: volume to administer = desired dose ÷ dose on hand × volume on hand.", "Example: order 50 mg; vial contains 250 mg in 10 mL. 50 ÷ 250 × 10 = 2 mL.", "Label every number with its unit and make sure unwanted units cancel.", "Verify the product concentration, maximum concentration, route, and administration rate before preparing the dose."], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 30 and 64-68." },
    { title: "Continuous medication infusion", items: ["First determine concentration: total drug amount ÷ total solution volume.", "Then determine pump rate: ordered dose per hour ÷ concentration per mL.", "Example: 20,000 units in 500 mL equals 40 units/mL. An order for 1,000 units/hr requires 25 mL/hr.", "Use the pharmacy label and standardized concentration. Independently verify high-alert infusions as policy requires."], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 30 and 66-68. This example is for calculation practice, not a prescribing recommendation." },
    { title: "Intake and output calculation", table: [["Include as intake", "Include as output"], ["Oral liquids, enteral fluids, IV solutions, blood products, liquid medications when policy requires", "Urine, emesis, liquid stool, drains, suction, and other measurable losses"], ["Convert all measures to mL and total for the defined period", "Record time, source, and measurement method"], ["Balance = total intake minus total output", "Interpret the balance with daily weight, assessment, and clinical condition"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, calculation practice PDF pages 66-68." }
  ],
  [
    { title: "Blood and blood components", table: [["Component", "What it primarily replaces", "Key monitoring"], ["Red blood cells", "Oxygen-carrying capacity", "Reaction, volume tolerance, response in hemoglobin and symptoms"], ["Platelets", "Platelet number or function", "Bleeding, reaction, post-transfusion count when ordered"], ["Plasma", "Multiple coagulation factors", "Reaction, volume load, coagulation response"], ["Cryoprecipitate", "Fibrinogen and selected factors", "Reaction and fibrinogen response when ordered"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 48-49." },
    { title: "ABO and Rh compatibility requires formal verification", items: ["Use the blood bank compatibility record and the facility's bedside verification process.", "Do not rely on memory, a handwritten chart, or the patient's statement of blood type.", "Match patient identifiers, component, ABO and Rh information, unit number, compatibility, expiration, and product appearance.", "Stop for any discrepancy and contact the blood bank before proceeding."], extra: "Source topic: 30 Hour IV Certification Study Guide, revised March 2013, PDF page 50. Current blood-bank policy controls." },
    { title: "Transfusion monitoring timeline", table: [["Phase", "Nursing focus"], ["Before", "Order, consent process, access, baseline assessment and vital signs, compatibility verification, emergency readiness"], ["Initial period", "Begin according to policy, remain able to observe closely, and watch for early reaction"], ["During", "Assess the patient, site, rate, volume tolerance, and required vital signs"], ["Completion", "Record product and volume, reassess, document response, and dispose or return materials as policy directs"]], extra: "Source topics: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 50-53. Timing and vital-sign intervals follow current facility policy." },
    { title: "Acute reaction patterns", table: [["Pattern", "Typical clues"], ["Hemolytic", "Fever, chills, pain, hypotension, dyspnea, hemoglobinuria, rapid deterioration"], ["Febrile nonhemolytic", "Fever and chills without another established cause"], ["Allergic or anaphylactic", "Hives or itching; severe cases include airway symptoms and hypotension"], ["Circulatory overload", "Dyspnea, crackles, hypertension, edema, jugular venous distention"], ["Bacterial contamination", "High fever, rigors, hypotension, shock"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 50-53." },
    { title: "Match the component to the therapeutic goal", table: [["Component", "Primary therapeutic goal"], ["Red blood cells", "Improve oxygen-carrying capacity"], ["Platelets", "Support platelet-related hemostasis"], ["Plasma", "Replace multiple coagulation factors when indicated"], ["Cryoprecipitate", "Replace fibrinogen and selected factors when indicated"]] },
    { title: "The bedside verification pause", items: ["Perform the facility-approved independent or electronic verification at the bedside.", "Match patient identifiers, order, component, blood type and compatibility, unit number, expiration, and product appearance.", "Do not bypass a mismatch, unreadable label, damaged unit, or abnormal appearance."] },
    { title: "Recognize patterns of transfusion reaction", table: [["Pattern", "Possible findings"], ["Allergic", "Itching, hives, flushing; severe cases may involve airway symptoms"], ["Febrile", "Temperature rise, chills, discomfort"], ["Hemolytic", "Fever, chills, pain, hypotension, hemoglobinuria"], ["Circulatory overload", "Dyspnea, crackles, hypertension, edema"], ["Septic", "High fever, rigors, hypotension, rapid deterioration"]] },
    { title: "Suspected reaction: first actions", items: ["Stop the transfusion immediately.", "Keep the IV access available with compatible fluid and new tubing as policy directs.", "Assess airway, breathing, circulation, vital signs, and the patient’s symptoms.", "Notify the supervising RN and prescriber; recheck identification; complete ordered specimens, product return, and documentation."] }
  ],
  [
    { title: "When parenteral nutrition may be needed", items: ["The gastrointestinal tract cannot safely or adequately meet nutrition needs.", "The patient has severe malabsorption, obstruction, prolonged ileus, fistula, or another condition that prevents enteral feeding.", "Metabolic demand is high because of major illness, trauma, burns, surgery, or sepsis.", "The interdisciplinary team weighs expected benefit, duration, access, infection risk, metabolic risk, and alternatives."], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF page 54." },
    { title: "What may be in a PN formulation", table: [["Component", "Purpose"], ["Dextrose", "Primary carbohydrate calories"], ["Amino acids", "Protein and nitrogen source"], ["Lipids", "Concentrated calories and essential fatty acids"], ["Electrolytes and minerals", "Individual replacement and maintenance needs"], ["Vitamins and trace elements", "Micronutrient support"], ["Water and ordered additives", "Fluid requirement and selected medication or insulin needs"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF page 54. Verify every formulation against the pharmacy label and order." },
    { title: "Mechanical, infectious, and metabolic PN complications", table: [["Category", "Examples", "Nursing focus"], ["Mechanical", "Occlusion, malposition, thrombosis, catheter damage, air risk", "Protect the line, stop unsafe use, assess, and escalate"], ["Infectious", "Exit-site infection or catheter-related bloodstream infection", "Asepsis, temperature, site assessment, cultures and device plan as ordered"], ["Metabolic", "Glucose abnormality, electrolyte shifts, refeeding syndrome, liver or triglyceride changes", "Laboratory trends, glucose, fluid balance, neurologic and cardiac findings"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 54-55." },
    { title: "Peripheral versus central parenteral nutrition", table: [["Feature", "Peripheral PN", "Central PN"], ["Concentration", "Lower osmolarity", "More concentrated"], ["Typical use", "Shorter-term or supplemental", "Longer-term or full nutritional support"], ["Access", "Appropriate peripheral vein", "Central venous access"], ["Major concern", "Phlebitis and limited tolerance", "Central-line infection and metabolic complications"]] },
    { title: "Verify the PN bag before connection", items: ["Match the patient, formula, components, additives, route, total volume, rate, and expiration to the order.", "Inspect for separation, precipitate, particles, leaks, or damage.", "Confirm the correct filter, tubing, pump channel, and dedicated lumen.", "Resolve any discrepancy with pharmacy and the supervising clinician before starting."] },
    { title: "Monitoring connects the formula to the patient", table: [["Monitor", "What it can reveal"], ["Glucose", "Hyperglycemia or hypoglycemia"], ["Daily weight and fluid balance", "Fluid gain, deficit, or overload"], ["Electrolytes", "Shifts and possible refeeding syndrome"], ["Temperature and line site", "Possible infection"], ["Liver, renal, and triglyceride results", "Tolerance and need for regimen adjustment"]] },
    { title: "If PN is delayed or interrupted", items: ["Do not speed up the infusion to catch up.", "Assess the reason for interruption and check the current glucose when indicated.", "Notify the supervising clinician and follow the ordered contingency plan.", "Document the actual amount infused, interruption, assessment, notifications, and new instructions."] }
  ],
  [
    { title: "Chemotherapy goals and treatment cycles", items: ["Chemotherapy may cure disease, control progression, reduce tumor burden, or relieve symptoms depending on the treatment plan.", "Regimens use specific drugs, routes, doses, schedules, and rest periods.", "The current cycle, day, body-size calculation, laboratory criteria, organ function, and dose modifications must match the protocol.", "Prior tolerance does not replace verification for the current treatment."], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF page 56." },
    { title: "Common adverse-effect patterns", table: [["System", "Possible effects", "Nursing focus"], ["Bone marrow", "Neutropenia, anemia, thrombocytopenia", "Infection, fatigue, bleeding, laboratory thresholds"], ["Gastrointestinal", "Nausea, vomiting, diarrhea, mucositis", "Hydration, nutrition, oral care, medication response"], ["Skin and hair", "Alopecia, rash, photosensitivity, tissue injury", "Protection, education, assessment"], ["Organ-specific", "Renal, hepatic, cardiac, pulmonary, neurologic, reproductive", "Protocol-specific laboratory and symptom monitoring"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 56-57." },
    { title: "Hazardous-drug spill and exposure response", items: ["Stop the activity and restrict the area when a spill or leak occurs.", "Use the designated chemotherapy spill kit and required PPE.", "Follow the facility sequence for containment, cleanup, waste disposal, exposure washing or irrigation, and reporting.", "Obtain medical evaluation after an occupational exposure and document the event according to policy."], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 56-57. Current hazardous-drug policy controls." },
    { title: "Chemotherapy is a high-alert workflow", items: ["Confirm the protocol, current cycle and day, dose basis, laboratory criteria, premedications, route, and access device.", "Use every required independent check and never assume a prior cycle makes the current order correct.", "Participate only within legal scope, validated competency, and direct-supervision requirements."] },
    { title: "Hazardous-drug exposure routes", table: [["Route", "Prevention"], ["Skin or eye contact", "Chemotherapy-rated gloves, gown, face and eye protection as indicated"], ["Inhalation", "Avoid aerosol generation and use required engineering controls"], ["Sharps injury", "Use safety devices and never recap"], ["Contaminated waste or body fluids", "Follow hazardous-waste and excreta precautions"]] },
    { title: "Extravasation warning signs", items: ["Pain, burning, stinging, swelling, blanching, redness, leakage, resistance, or absent blood return may signal extravasation.", "Stop the infusion immediately; do not flush.", "Leave the catheter in place when the agent-specific protocol calls for aspiration or antidote.", "Notify the qualified clinician and follow the exact drug-specific protocol for aspiration, antidote, compress, elevation, documentation, and follow-up."] },
    { title: "Systemic findings that require escalation", items: ["Airway symptoms, hypotension, severe dyspnea, or rapidly worsening reaction.", "Fever or infection symptoms in an immunocompromised patient.", "Unexpected bleeding, severe vomiting or diarrhea, altered mental status, or critical laboratory results.", "Assess, stop or hold therapy as authorized, and activate the emergency pathway."] }
  ],
  [
    { title: "Skin anatomy for peripheral IV insertion", image: "skin-layers-iv-anatomy-v2.png", imageAlt: "Medical cross-section showing epidermis, dermis, subcutaneous tissue, superficial vein, artery, nerve, hair follicle, sweat gland, and adipose tissue", items: ["Epidermis: the outer protective barrier.", "Dermis: connective tissue with sensory structures, glands, vessels, and nerves.", "Subcutaneous tissue: variable adipose and connective tissue above deeper structures.", "Superficial vein: the intended peripheral catheter target; nearby arteries and nerves must be avoided."], extra: "Original BMHI educational visual generated October 23, 2026. Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 19-21." },
    { title: "Why the skin layers matter", table: [["Layer or structure", "Function", "IV implication"], ["Epidermis", "Mechanical barrier against microorganisms", "Antisepsis and no-touch technique protect the breached barrier"], ["Dermis", "Contains sensory receptors, vessels, follicles, and glands", "Penetration causes sensation and requires controlled technique"], ["Subcutaneous tissue", "Provides padding and contains variable fat and connective tissue", "Changes vein depth, palpation, stabilization, and insertion angle"], ["Peripheral nerve", "Carries sensation and motor signals", "Electric pain, paresthesia, or radiating symptoms require an immediate stop"], ["Artery", "High-pressure pulsatile vessel", "Pulsation or unexpected blood return requires stopping and escalation"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 19-21." },
    { title: "Superficial veins of the hand and forearm", image: "upper-extremity-superficial-veins-v2.png", imageAlt: "Medical illustration of anterior and posterior upper extremity superficial veins", items: ["Begin with a complete inspection and palpation of both appropriate extremities.", "Follow the vein's direction, depth, resilience, length, and branching.", "Start distally when the therapy and patient condition permit.", "Preserve stronger proximal options for future access."], extra: "Original BMHI educational visual generated October 23, 2026. Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 21-23." },
    { title: "Forearm vascular anatomy", image: "forearm-vein-artery-anatomy-v1.png", imageAlt: "Medical illustration of forearm veins and arteries with vessel cross sections", items: ["Superficial veins are common peripheral access targets.", "Veins have thinner walls, lower pressure, and valves; arteries have thicker muscular walls and pulsatile flow.", "The skin, subcutaneous tissue, nerves, and nearby arteries influence site selection and insertion angle.", "Confirm anatomy by inspection and palpation before preparing the site."], extra: "Original BMHI educational anatomy image generated October 23, 2026. Source topics: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 20-23." },
    { title: "Skin layers and insertion discomfort", table: [["Layer", "Clinical connection"], ["Epidermis", "Provides the outer barrier and must be cleansed without recontamination"], ["Dermis", "Contains sensory structures; rapid controlled penetration may reduce prolonged discomfort"], ["Subcutaneous tissue", "Depth varies by patient and changes vein palpation and insertion angle"], ["Vessel wall", "Trauma to the intima can promote inflammation and thrombosis"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 20-21." },
    { title: "Common upper-extremity veins", table: [["Vein or region", "Potential advantage", "Important caution"], ["Dorsal metacarpal network", "Visible, distal starting point", "Movement and fragile skin may affect comfort and securement"], ["Cephalic vein", "Often accessible along the radial forearm", "Near the wrist, protect against motion and nerve or artery injury"], ["Basilic vein", "May be large and straight", "Can roll and lies near important structures proximally"], ["Median antebrachial region", "May provide a forearm option", "Anatomy varies; assess depth, direction, and therapy needs"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 22-23." },
    { title: "Hand and wrist veins: advantages and disadvantages", table: [["Site", "Advantages", "Disadvantages"], ["Dorsal metacarpal veins", "Visible, distal, often easy to stabilize in adults", "Painful movement, vulnerable to dislodgement, fragile skin in older adults"], ["Dorsal venous network", "Several branches and easy visual assessment", "Branch points, valves, short segments, and hand use can limit dwell"], ["Cephalic near the thumb or wrist", "May be prominent and accommodate a suitable catheter", "Wrist motion, radial nerve or artery proximity, and discomfort"], ["Digital veins", "Possible last-resort option for very small therapy", "Small, painful, requires immobilization, limited flow and device size"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 22-23. Device choice follows therapy needs and current policy." },
    { title: "Forearm and antecubital veins: advantages and disadvantages", table: [["Site", "Advantages", "Disadvantages"], ["Cephalic forearm", "Often straight, accessible, and away from major flexion", "May roll and become deeper proximally"], ["Basilic forearm", "Often large with good flow", "Can be mobile and lies near arteries and nerves proximally"], ["Median antebrachial vein", "May provide a stable forearm segment", "Size and course vary and may join deeper structures"], ["Median cubital region", "Large and easy to locate; useful in urgent access", "Elbow flexion, dislodgement, occlusion, nerve and artery proximity; poor routine long-term choice"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 22-23." },
    { title: "Peripheral IV insertion supplies", image: "peripheral-iv-supplies-v2.png", imageAlt: "Organized peripheral IV insertion supplies on a clinical tray", items: ["Select the catheter and equipment after assessing the patient, therapy, vein, and expected duration.", "Open supplies only when ready to maintain asepsis.", "Place the sharps container within immediate reach before insertion.", "Prepare backup supplies without contaminating the primary setup."], extra: "Original BMHI educational visual generated October 23, 2026. Source topics: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 24-26." },
    { title: "Peripheral IV supply checklist", table: [["Category", "Supplies and purpose"], ["Patient and clinician protection", "Clean gloves and additional PPE based on exposure risk"], ["Access", "Appropriate safety catheter, tourniquet, optional vein-visualization or warming aid per policy"], ["Skin preparation", "Facility-approved antiseptic, sterile gauze, and enough drying time"], ["Connection", "Primed extension tubing, needleless connector, ordered solution or flush, compatible administration set"], ["Securement", "Stabilization device, transparent dressing or indicated alternative, tape and label"], ["Safety and cleanup", "Sharps container, waste receptacle, absorbent material, and spill supplies when indicated"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 24-26. Use the device instructions and facility supply list." },
    { title: "Extremities and sites that need special caution", table: [["Finding or history", "Action"], ["Infection, burn, wound, hematoma, or impaired circulation", "Avoid the affected site and select a safer location"], ["Dialysis fistula or graft", "Do not use the extremity unless a specialist-specific emergency protocol authorizes it"], ["Lymph-node surgery, mastectomy, or lymphedema risk", "Follow the current patient-specific restriction and facility policy"], ["Paralysis or reduced sensation", "Avoid when possible because injury or complication may go unrecognized"], ["Lower extremity in an adult", "Use only when clinically authorized and replace with safer access as directed"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 22-24. Current patient-specific and facility restrictions control." },
    { title: "Primary and secondary administration sets", table: [["Equipment", "Purpose", "Safety check"], ["Macrodrip set", "Gravity delivery with a manufacturer-specified drop factor", "Read the actual package; never assume 10, 15, or 20 gtt/mL"], ["Microdrip set", "Fine gravity control, commonly 60 gtt/mL", "Confirm package and patient-specific use"], ["Primary set", "Continuous fluid path from main container", "Prime, label, trace, and change according to current policy"], ["Secondary set", "Intermittent medication through compatible primary line", "Verify compatibility, bag height, connection port, pump channel, volume, and rate"], ["Extension or needleless connector", "Adds access and supports securement", "Prime, disinfect, protect key parts, and assess patency"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 28-29. Manufacturer information and current policy control." },
    { title: "Medication delivery methods", table: [["Method", "Description", "Primary safety issue"], ["Continuous infusion", "Medication or fluid delivered at a prescribed ongoing rate", "Concentration, pump programming, line tracing, cumulative dose"], ["Intermittent or IVPB", "Medication delivered at scheduled intervals", "Compatibility, secondary setup, residual volume, timing"], ["Direct IV administration", "Small volume delivered over a specified time", "Scope, dilution, rate, patency, immediate adverse effect"], ["Saline lock", "Intermittent access without continuous fluid", "Patency assessment, flushing sequence, connector disinfection"], ["Bolus fluid", "Rapid prescribed fluid volume", "Hemodynamic tolerance and exact volume"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF page 28." },
    { title: "Medication compatibility has several dimensions", table: [["Type", "Meaning", "What the nurse does"], ["Physical", "Visible precipitate, haze, color change, gas, or separation", "Do not administer; stop and clarify"], ["Chemical", "Drug degrades or reacts even without visible change", "Use an approved compatibility reference"], ["Therapeutic", "Combined drug effects create an unintended clinical result", "Review interactions, patient condition, and monitoring"], ["Container or tubing", "Drug binds to, leaches from, or is altered by the delivery system", "Follow pharmacy and manufacturer instructions"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 31-32." },
    { title: "Medication action and patient response", table: [["Concept", "Question"], ["Absorption and bioavailability", "How does direct IV delivery change onset and risk?"], ["Distribution", "Do fluid status, protein binding, perfusion, or body composition change effect?"], ["Metabolism", "Does liver function alter clearance or active metabolites?"], ["Excretion", "Does kidney function require dose or interval adjustment?"], ["Interaction", "Could another drug, food, herb, disease, or test change the response?"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 30-32." },
    { title: "Choose the site before the catheter", items: ["Start with the prescribed therapy: pH, osmolarity, duration, flow requirement, and vesicant risk affect device choice.", "Select a vein that is palpable, resilient, and appropriate for the therapy.", "Prefer the smallest suitable gauge and shortest catheter.", "Avoid infected, injured, poorly perfused, or policy-restricted extremities and areas of flexion when possible."] },
    { title: "Vein-wall anatomy and complication risk", table: [["Vein layer", "Function", "Clinical connection"], ["Tunica intima", "Smooth inner lining and venous valves", "Trauma, chemical irritation, or contamination can promote phlebitis and thrombosis"], ["Tunica media", "Muscle and elastic tissue", "Irritation can trigger venospasm, pain, and reduced flow"], ["Tunica adventitia", "Outer connective-tissue support", "Deep advancement or vessel injury can affect surrounding tissue"]], extra: "Additional source: Peripheral Intravenous Initiation Self Learning Module, pages 7-8." },
    { title: "Vein or artery? Stop when the findings do not fit", table: [["Assessment cue", "Typical vein", "Possible artery / safety response"], ["Palpation", "Soft, compressible, nonpulsatile", "Pulsation or firm recoil: do not cannulate"], ["Location", "Often superficial and visible or palpable", "Often deeper and protected; confirm anatomy before proceeding"], ["Blood return", "Usually darker and lower pressure", "Bright or pulsatile return is an emergency cue—stop and escalate"], ["When uncertain", "Reassess the site and therapy", "Do not rely on color alone; obtain qualified assistance"]], extra: "Additional source: Phlebotomy Skills and Practicum Review, pages 7-8. Blood color can be altered by oxygenation and clinical conditions; palpation, anatomy, patient assessment, and facility escalation policy take priority." },
    { title: "Vein assessment uses sight and touch", items: ["Inspect both appropriate extremities before choosing a site.", "Use one or two fingertips rather than the thumb to palpate the vessel.", "Press lightly, release, and assess elasticity, rebound filling, direction, depth, and length.", "Palpate even when a vein looks easy to access; appearance alone does not confirm suitability."], extra: "Additional source: Peripheral Intravenous Initiation Self Learning Module, page 18." },
    { title: "Strategies for a poorly filled vein", items: ["Lower the arm below heart level before applying the tourniquet when the patient's condition permits.", "Ask the patient to gently open and close the hand, then relax it for insertion.", "Use light tapping rather than forceful striking, which may cause vasoconstriction.", "Apply an approved warm compress according to facility policy and reassess the vein before proceeding."], extra: "Additional source: Peripheral Intravenous Initiation Self Learning Module, pages 19-20. Follow current facility policy for warming devices and exposure time." },
    { title: "Peripheral catheter selection", table: [["Clinical need", "Selection principle"], ["Routine fluids or intermittent medication", "Use the smallest gauge that reliably supports therapy"], ["Rapid volume or blood", "A larger bore may be required when clinically appropriate"], ["Fragile or small veins", "Choose a smaller gauge and appropriate short catheter"], ["Long duration or irritating therapy", "Reassess whether a different vascular-access device is indicated"]] },
    { title: "Insertion sequence: prepare and access", items: ["Verify the order, identify and teach the patient, perform hand hygiene, and gather supplies.", "Position the limb, assess veins, apply the tourniquet, and select the site.", "Cleanse with the approved antiseptic using the required friction and allow it to dry completely.", "Stabilize the vein, insert bevel up, observe flashback, lower the angle, and advance the catheter—not the needle."] },
    { title: "Insertion sequence: connect and secure", items: ["Release the tourniquet, apply appropriate pressure, activate the sharps safety device, and discard immediately.", "Connect the primed extension without contaminating key parts.", "Confirm patency using the approved assessment; never force a flush.", "Secure and dress the catheter, label it, start the ordered therapy, teach the patient, and document."] },
    { title: "Sharps safety is part of every IV start", items: ["Place an approved, closable, puncture-resistant sharps container within easy reach before beginning.", "Never bend, break, remove, or recap the introducer needle.", "Activate the engineered safety feature immediately after withdrawal and visually confirm activation when the device permits.", "Dispose of the sharp at once; never carry it, hand it to another person, or force it into an overfilled container.", "If an injury occurs, stop safely and follow the facility exposure-control plan without delay."], extra: "Additional sources: Phlebotomy Skills and Practicum Review, pages 5-6 and 12; 30 Hour IV Certification Study Guide, revised March 2013, pages 9-11. Content is adapted to current OSHA requirements, the device instructions for use, and facility policy." },
    { title: "Occupational exposure: immediate response", table: [["Exposure", "Immediate action"], ["Needlestick or cut", "Wash with soap and water; do not scrub aggressively or squeeze the wound"], ["Eye or mucous-membrane splash", "Flush promptly with water or the designated eyewash"], ["Nonintact-skin contact", "Wash the area promptly and remove contaminated clothing as directed"], ["Every exposure", "Report immediately, identify the source process when permitted, and obtain confidential medical evaluation and follow-up"]], note: "Do not delay reporting while deciding whether the exposure seems serious. Follow the employer's written exposure-control plan and current post-exposure protocol.", extra: "Additional sources: Phlebotomy Skills and Practicum Review, pages 5-6; 30 Hour IV Certification Study Guide, revised March 2013, pages 9-11. No historical transmission statistics or obsolete cleanup directions were imported." },
    { title: "Unsuccessful insertion: safe next steps", table: [["Problem", "Likely cause", "Safe response"], ["Vein rolls away", "Inadequate stabilization", "Stop probing; stabilize correctly and use a new catheter/site as required"], ["Hematoma develops", "Posterior-wall trauma or excessive angle", "Stop, remove, apply pressure, and reassess"], ["Flashback appears but catheter will not advance", "Only the needle tip may be in the lumen", "Do not reinsert the needle into the catheter; remove and restart according to policy"], ["Repeated unsuccessful attempts", "Site, device, or operator factors", "Stop at the facility attempt limit and escalate to a more experienced clinician"]], extra: "Additional source: Peripheral Intravenous Initiation Self Learning Module, page 27. Attempt limits must follow current BMHI clinical-site policy." },
    { title: "Infusion flow troubleshooting", table: [["Observation", "Check first", "Safety response"], ["Pump occlusion or slowed flow", "Trace the line from patient to container for clamps, kinks, or compression", "Correct an external cause only after assessing the patient and site"], ["Flow changes with limb position", "Catheter tip may contact the vein wall or lie near flexion", "Reposition and reassess; do not manipulate a contaminated catheter"], ["Blood backs into tubing", "Bag height, empty container, clamp position, or interruption", "Protect against air and clot risk; restore flow only under order and policy"], ["Resistance during flushing", "Mechanical obstruction, malposition, or complication", "Never force the flush; stop use and escalate"]], extra: "Additional source: Peripheral Intravenous Initiation Self Learning Module, pages 28-29. Device-specific actions require current manufacturer instructions and facility policy." },
    { title: "Visual comparison of local IV complications", image: "local-iv-complications-comparison-v1.png", imageAlt: "Four-panel educational comparison of infiltration, phlebitis, extravasation, and local catheter-site infection", items: ["Infiltration: cool, pale swelling and slowed or stopped flow.", "Phlebitis: pain, warmth, redness, swelling, or a palpable venous cord.", "Extravasation: burning, tense swelling, blistering, discoloration, or worsening tissue injury after a vesicant or irritant.", "Local infection: increasing redness, warmth, tenderness, drainage, or associated fever."], extra: "Original BMHI educational visual generated October 23, 2026. Illustrations are examples only; assess the patient and follow the current facility protocol." },
    { title: "First response to a suspected IV complication", image: "iv-complication-first-response-v1.png", imageAlt: "Nurses stopping an infusion, assessing a peripheral IV site, elevating the limb, and reviewing the medication protocol", items: ["Stop the infusion when the site or patient response becomes unsafe.", "Assess the site, limb, vital signs, symptoms, medication or solution, and estimated volume infused.", "Do not flush a suspected extravasation. Leave the catheter in place when the agent-specific protocol requires aspiration or antidote delivery.", "Notify the appropriate clinician, follow the specific protocol, document the event, and arrange reassessment."], extra: "Original BMHI educational visual generated October 23, 2026. The exact sequence depends on the medication or solution, complication, scope, and facility policy." },
    { title: "Local complication interventions", table: [["Complication", "Immediate intervention", "Follow-up"], ["Infiltration", "Stop infusion; disconnect tubing; remove catheter unless the protocol requires temporary retention", "Elevate and use a solution-specific compress when directed; restart at another site; reassess tissue and circulation"], ["Phlebitis", "Stop infusion and remove the peripheral catheter", "Apply the ordered or policy-directed compress; notify as indicated; restart elsewhere; trend the vein and symptoms"], ["Extravasation", "Stop infusion; do not flush; disconnect tubing; leave catheter in place for aspiration or antidote when the protocol directs", "Notify immediately; identify agent and dose; apply agent-specific antidote and compress; elevate when directed; photograph or measure and arrange follow-up"], ["Local infection", "Stop using the site and notify the supervising clinician", "Remove or culture as ordered; assess for systemic infection; initiate the prescribed infection or sepsis pathway"]], extra: "Use the current medication-specific extravasation reference and facility policy. Compress type and catheter removal timing vary by agent." },
    { title: "Local complication comparison", table: [["Finding", "Likely concern", "Immediate priority"], ["Cool, pale swelling; slowed infusion", "Infiltration", "Stop infusion and follow infiltration protocol"], ["Pain, warmth, redness, venous cord", "Phlebitis", "Stop infusion, remove as indicated, assess and report"], ["Burning, blistering, tissue injury with vesicant", "Extravasation", "Stop; do not flush; follow agent-specific protocol"], ["Drainage, tenderness, fever", "Local or bloodstream infection", "Stop unsafe use, assess, notify, and follow culture/removal policy"]] },
    { title: "Systemic IV complications", table: [["Complication", "Possible findings", "Immediate priority"], ["Fluid overload", "Dyspnea, crackles, edema, hypertension, oxygen decline", "Slow or stop as authorized, position and support breathing, notify promptly"], ["Speed shock or medication reaction", "Flushing, headache, chest tightness, hypotension, rapid change after administration", "Stop medication, assess ABCs, activate emergency response"], ["Air embolism", "Sudden dyspnea, chest pain, confusion, hypotension", "Clamp or protect the system, call emergency response, support ABCs"], ["Catheter-related bloodstream infection", "Fever, chills, hypotension, altered status", "Stop unsafe use, assess, notify, and follow culture and sepsis pathway"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 32-35." },
    { title: "Infiltration severity and response", items: ["Assess pain, temperature, color, capillary refill, swelling, skin integrity, sensation, and the estimated area involved.", "Stop the infusion and disconnect tubing. Follow the solution-specific policy before removing the catheter because aspiration or an antidote may be required for extravasation.", "Elevate or apply a compress only when the specific protocol directs it.", "Document findings, estimated severity, solution and volume, actions, notifications, patient response, and follow-up plan."], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 32-35. Use the facility's current infiltration and extravasation scale." },
    { title: "Phlebitis causes and prevention", table: [["Cause", "Example", "Prevention"], ["Mechanical", "Large catheter, flexion, movement, poor securement", "Smallest suitable catheter, stable site, effective securement"], ["Chemical", "Extreme pH or osmolarity, irritating medication", "Correct dilution, rate, access device, and compatibility"], ["Bacterial", "Contamination of site, hub, or connection", "Hand hygiene, antisepsis, connector disinfection, closed system"], ["Patient-related", "Fragile veins, inflammation, hypercoagulability", "Individualized site and device plan with frequent assessment"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 32-35." },
    { title: "Complete documentation tells the clinical story", items: ["Record date and time, site, vein or anatomic location, catheter gauge and length when required, number of attempts, and inserter.", "Record skin preparation, dressing, securement, patency assessment, solution, rate, pump, and patient tolerance.", "Document teaching, complications, actions, notifications, and response."] }
  ],
  [
    { title: "Vascular access device overview", image: "vascular-access-devices-v1.png", imageAlt: "Generic peripheral catheter, midline, PICC, central venous catheter, and implanted port", items: ["Short peripheral catheter: tip remains in a peripheral vein.", "Midline: longer peripheral device with the tip below the axilla.", "PICC and other central catheters: tip terminates in central circulation after placement verification.", "Implanted port: subcutaneous reservoir accessed with an appropriate noncoring needle."], extra: "Original BMHI educational image generated October 23, 2026. Source topics: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 39-44." },
    { title: "Midline therapy boundaries", items: ["A midline remains a peripheral device even though it is longer than a short peripheral catheter.", "The prescribed solution must be appropriate for peripheral administration under current standards and policy.", "Assess the entire extremity, insertion site, dressing, external length when applicable, patency, and patient symptoms.", "Do not use a midline for therapy that requires central administration or when complication findings are present."], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 35-36. Current infusion standards and facility policy control therapy selection." },
    { title: "Central venous anatomy and device indications", table: [["Reason for central access", "Clinical connection"], ["Long duration or poor peripheral access", "Supports repeated therapy while reducing repeated peripheral starts"], ["Concentrated or irritating therapy", "Central blood flow provides rapid dilution when the prescribed device is appropriate"], ["Multiple incompatible therapies", "Multiple lumens may separate infusions when each lumen is verified and labeled"], ["Hemodynamic monitoring or frequent blood sampling", "Requires the correct catheter, confirmed position, competency, and protocol"], ["Parenteral nutrition or selected oncology therapy", "Often requires a dedicated lumen and strict infection prevention"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 37-43." },
    { title: "Central-line assessment before every use", table: [["Check", "What to verify"], ["Patient", "New pain, dyspnea, fever, chills, swelling, or neurologic change"], ["Site and dressing", "Redness, tenderness, drainage, bleeding, swelling, moisture, looseness, or disrupted securement"], ["Device", "Type, lumen, external length or position marker when applicable, clamps, caps, cracks, leaks"], ["Patency", "Blood return and flushing response when required; never force resistance"], ["Order and compatibility", "Correct route, lumen, solution, rate, monitoring, and concurrent infusions"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 37-45." },
    { title: "Central-line dressing and cap-change principles", items: ["Prepare the patient and environment, gather supplies, and explain the need to minimize talking, coughing, and movement near the field.", "Use hand hygiene, required mask and PPE, and sterile technique according to the device and policy.", "Assess the site and catheter position before cleansing.", "Use the approved antiseptic with the required friction and drying time, then apply the prescribed securement and dressing.", "Disinfect and replace connectors only with the authorized technique. Label and document the procedure and findings."], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 44-45 and checkoff page 58. Fixed historical intervals were excluded." },
    { title: "Central-line flushing and blood-draw safety", items: ["Confirm the device type, lumen purpose, order, current manufacturer instructions, and facility procedure.", "Use the specified syringe size, solution, volume, sequence, and clamp technique. Never copy a generic flush recipe across devices.", "Stop for resistance, pain, swelling, leaking, or suspected damage. Never force a flush.", "For blood sampling, pause or manage infusions only as the approved procedure directs, maintain asepsis, label specimens at the bedside, and restore prescribed therapy safely."], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 43-45. Historical flush tables were intentionally not reproduced." },
    { title: "Hypodermoclysis overview", table: [["Feature", "Teaching point"], ["Purpose", "Subcutaneous fluid administration for selected patients with mild to moderate hydration needs"], ["Possible settings", "Older adult, palliative, long-term, or limited-access care when ordered and supported by policy"], ["Not appropriate", "Shock, severe dehydration, need for rapid large-volume resuscitation, or unsuitable solution"], ["Monitoring", "Site comfort, swelling, leaking, redness, prescribed rate, intake and output, hydration response"], ["Competency", "Use only with specific education, an order, appropriate equipment, and facility authorization"]], extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, PDF pages 45-47. Historical rate and volume limits were excluded." },
    { title: "Arterial lines are monitoring devices", table: [["Purpose", "Safety principle"], ["Continuous invasive blood-pressure monitoring", "Level and zero the transducer using the approved procedure"], ["Arterial blood sampling", "Use aseptic technique and the authorized waste or return system"], ["Site assessment", "Check distal color, temperature, sensation, movement, capillary refill, waveform, bleeding, and securement"], ["Urgent concerns", "Report bleeding, loss of waveform, limb ischemia, disconnection, air, or suspected infection immediately"]], note: "Never administer routine IV fluids or medications through an arterial line. Only the prescribed pressure system and procedure-specific solutions belong in the circuit.", extra: "Source: 30 Hour IV Certification Study Guide, revised March 2013, arterial-line content and glossary PDF pages 46-47 and 61-62. Current critical-care policy controls." },
    { title: "Eight-hour in-person skills day", table: [["Time", "Activity"], ["8:00–8:30", "Safety briefing, objectives, and calculation check"], ["8:30–11:00", "Equipment, priming, pump, vein selection, and peripheral starts"], ["11:00–12:00", "IVPB and saline-lock practice"], ["12:00–12:30", "Meal break"], ["12:30–1:30", "Access-device assessment and dressing simulation"], ["1:30–2:30", "Complication scenarios and documentation"], ["2:30–4:30", "RN competency checkoffs, remediation, and final evaluation"]] },
    { title: "Calculation reference chart", table: [["Task", "Formula or relationship"], ["Pump rate", "mL/hr = volume (mL) ÷ time (hr)"], ["Gravity rate", "gtt/min = volume × drop factor ÷ time (min)"], ["Volume", "1 L = 1,000 mL"], ["Mass", "1 g = 1,000 mg; 1 mg = 1,000 mcg"], ["Weight", "kg = lb ÷ 2.2"]], note: "Legacy apothecary values are not used from the OCR source. Clarify any order written with an unfamiliar or ambiguous unit." },
    { title: "Checkoff: peripheral IV start", items: ["Verify the order and patient; assess therapy and site; explain the procedure.", "Maintain asepsis and allow antiseptic to dry.", "Insert safely, activate sharps protection, connect without contamination, and assess patency.", "Secure, dress, label, start therapy, reassess, teach, and document.", "Any missed critical safety step requires remediation and repeat demonstration."] },
    { title: "Competency begins with clinical decisions", table: [["Decision", "Learner must explain"], ["Purpose", "The intended outcome of the prescribed therapy"], ["Patient assessment", "Physical condition, allergies, previous infusion experience, education, and consent"], ["Site", "How age, condition, therapy, vein quality, activity, and expected dwell affect selection"], ["Equipment", "Why the catheter, extension, tubing, dressing, and pump fit this patient and therapy"]], extra: "Additional source: Peripheral Intravenous Initiation Self Learning Module, Appendix B, pages 53-54. BMHI checkoff criteria remain subject to current Florida scope and site policy." },
    { title: "Know the central-access device before using it", table: [["Device", "Where the tip terminates", "Key learning point"], ["Midline", "Peripheral vasculature below the axilla", "Not a central line; confirm that the prescribed therapy is peripherally appropriate"], ["PICC", "Central circulation after peripheral insertion", "Verify tip-use clearance, lumen purpose, patency, and dressing condition"], ["Nontunneled or tunneled CVC", "Central circulation", "Use strict asepsis and inspect the exit site, connections, and lumens"], ["Implanted port", "Central circulation through a subcutaneous reservoir", "Access only with the correct noncoring needle and validated competency"]], extra: "Additional source: 30 Hour IV Certification Study Guide, revised March 2013, pages 35-42. Device definitions were retained; historical dwell-time, flush-volume, and dressing-frequency claims were excluded in favor of current orders, manufacturer instructions, and facility policy." },
    { title: "Central-line findings that require immediate escalation", table: [["Finding", "Possible concern", "Priority response"], ["Sudden dyspnea, chest pain, cyanosis, or altered consciousness", "Air embolism or thoracic complication", "Stop unsafe use, clamp or protect the system as trained, call emergency response, and support ABCs"], ["Neck, chest, shoulder, or arm swelling", "Malposition, infiltration, or thrombosis", "Stop use and obtain urgent qualified assessment"], ["Redness, tenderness, drainage, fever, or chills", "Local or bloodstream infection", "Assess, notify, and follow culture and device-management orders"], ["Resistance, absent blood return, leaking, or damaged catheter", "Occlusion, malposition, or device failure", "Never force a flush; stop use and escalate"]], note: "Do not remove, reposition, repair, instill a declotting agent, or access a central device unless the action is authorized and competency-validated.", extra: "Additional source: 30 Hour IV Certification Study Guide, revised March 2013, pages 37-43. Emergency actions must follow the current device-specific protocol and facility policy." },
    { title: "Removal checkoff includes catheter integrity", items: ["Stop all infusates and remove the dressing while supporting the skin and catheter.", "Assess the site before removal, withdraw the catheter slowly and steadily, and achieve hemostasis.", "Inspect the removed catheter and compare its condition and length with the expected intact device.", "If the catheter is not intact, do not discard it; immobilize the extremity as directed and notify the supervising clinician immediately.", "Document the site, catheter condition, hemostasis, dressing, patient teaching, and response."], extra: "Additional source: Peripheral Intravenous Initiation Self Learning Module, page 30." },
    { title: "Checkoff: IVPB and pump", items: ["Verify the primary and secondary orders and compatibility.", "Prepare and label the secondary medication using aseptic technique.", "Trace the line from patient to source, connect to the correct port, and position bags correctly.", "Program the correct channel, volume, and rate; independently verify high-alert settings when required.", "Confirm flow, monitor the patient and site, and document the response."] },
    { title: "Scenario response pattern", table: [["Step", "Learner behavior"], ["Recognize", "Name the abnormal cue and likely complication"], ["Stop or protect", "Stop unsafe therapy and protect the patient"], ["Assess", "Check site, airway, breathing, circulation, vital signs, and symptoms"], ["Escalate", "Notify the RN/prescriber or activate emergency response"], ["Document", "Record findings, actions, notifications, orders, and response"]] }
  ]
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
  slide.shapes.add({ geometry: "rect", position: { left: 0, top: 0, width: 1280, height: 8 }, fill: colors.navy, line: { fill: colors.navy, width: 0 } });
  slide.shapes.add({ geometry: "rect", position: { left: 0, top: 0, width: 22, height: 720 }, fill: colors.teal, line: { fill: colors.teal, width: 0 } });
  slide.shapes.add({ geometry: "rect", position: { left: 22, top: 704, width: 1258, height: 16 }, fill: colors.aqua, line: { fill: colors.aqua, width: 0 } });
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
  blocks.push(...teachingBlocksByDeck[deckIndex]);
  const seen = new Set();
  return blocks.filter((block) => {
    const contentKey = block.items ? block.items.join(" ") : block.table.flat().join(" ");
    const key = `${block.title.toLowerCase()}|${contentKey.toLowerCase().slice(0, 120)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return block.items?.length || block.table?.length;
  });
}

function addTableSlide(pres, block, number, moduleLabel, pages) {
  const slide = baseSlide(pres, block.title, number, moduleLabel);
  const rows = block.table;
  const cols = rows[0].length;
  const left = 82;
  const top = 178;
  const width = 1110;
  const height = block.note ? 390 : 450;
  const rowHeight = height / rows.length;
  const colWidth = width / cols;
  rows.forEach((row, r) => row.forEach((cell, c) => {
    const header = r === 0;
    slide.shapes.add({ geometry: "rect", position: { left: left + c * colWidth, top: top + r * rowHeight, width: colWidth, height: rowHeight }, fill: header ? colors.navy : r % 2 ? colors.white : colors.aqua, line: { fill: colors.gray, width: 1 } });
    addText(slide, cell, { left: left + c * colWidth + 10, top: top + r * rowHeight + 7, width: colWidth - 20, height: rowHeight - 14 }, { fontSize: header ? 17 : 16, bold: header, color: header ? colors.white : colors.ink, verticalAlignment: "middle" });
  }));
  if (block.note) addText(slide, block.note, { left: 88, top: 590, width: 1090, height: 58 }, { fontSize: 17, bold: true, color: colors.rust, verticalAlignment: "middle" });
  const narrationItems = rows.slice(1).map((row) => `${row[0]}: ${row.slice(1).join("; ")}`);
  addSourceNotes(slide, block.pages || pages, [block.note, block.extra].filter(Boolean).join(" "), heyGenScript(block.title, narrationItems.concat(block.note || [])));
}

function addContentSlide(pres, block, number, moduleLabel, pages) {
  const slide = baseSlide(pres, block.title, number, moduleLabel);
  addBullets(slide, block.items, { left: 92, top: 185, width: 1080, height: 430 }, { fontSize: block.items.length > 4 ? 23 : block.items.length > 3 ? 25 : 28 });
  addText(slide, "Use current orders, facility policy, and authorized scope when applying this information.", { left: 94, top: 642, width: 1070, height: 32 }, { fontSize: 15, color: colors.rust, bold: true });
  if (block.sourceLabel) addText(slide, block.sourceLabel, { left: 94, top: 606, width: 1070, height: 26 }, { fontSize: 14, color: colors.teal, bold: true });
  addSourceNotes(slide, block.pages || pages, block.extra || "", heyGenScript(block.title, block.items));
}

async function addVisualSlide(pres, block, number, moduleLabel, pages) {
  const slide = baseSlide(pres, block.title, number, moduleLabel);
  const visualPath = path.join(outputDir, "media", "generated", block.image);
  if (block.imageWide) {
    slide.images.add({
      blob: await readImageBlob(visualPath), contentType: "image/png", alt: block.imageAlt, fit: "cover",
      position: { left: 72, top: 170, width: 1138, height: 390 }
    });
    slide.shapes.add({ geometry: "rect", position: { left: 72, top: 170, width: 1138, height: 390 }, fill: { color: "#FFFFFF", transparency: 100 }, line: { fill: colors.teal, width: 2 } });
    const labels = block.items;
    labels.forEach((label, index) => addText(slide, label, { left: 82 + index * 379, top: 574, width: 350, height: 54 }, { fontSize: 18, color: colors.navy, bold: true, textAlign: "center", verticalAlignment: "middle" }));
    addSourceNotes(slide, block.pages || pages, block.extra || "", heyGenScript(block.title, block.items));
    return;
  }
  addBullets(slide, block.items, { left: 74, top: 184, width: 500, height: 430 }, { fontSize: 23 });
  slide.images.add({
    blob: await readImageBlob(visualPath),
    contentType: "image/png",
    alt: block.imageAlt,
    fit: "cover",
    position: { left: 610, top: 166, width: 600, height: 450 }
  });
  slide.shapes.add({ geometry: "rect", position: { left: 610, top: 166, width: 600, height: 450 }, fill: { color: "#FFFFFF", transparency: 100 }, line: { fill: colors.teal, width: 2 } });
  addText(slide, "Educational visual. Verify device-specific technique during supervised practice.", { left: 620, top: 626, width: 580, height: 30 }, { fontSize: 14, color: colors.rust, bold: true, textAlign: "center" });
  addSourceNotes(slide, block.pages || pages, block.extra || "", heyGenScript(block.title, block.items));
}

async function makeDeck(def, deckIndex) {
  const pres = Presentation.create({ slideSize: { width: 1280, height: 720 } });
  let slide = pres.slides.add();
  slide.background.fill = colors.navy;
  const media = mediaByDeck[deckIndex];
  const mediaPath = path.join(outputDir, "media", "pexels", media.file);
  slide.images.add({
    blob: await readImageBlob(mediaPath),
    contentType: "image/jpeg",
    alt: media.alt,
    fit: "cover",
    position: { left: 825, top: 0, width: 455, height: 720 }
  });
  slide.shapes.add({ geometry: "rect", position: { left: 0, top: 0, width: 28, height: 720 }, fill: colors.teal, line: { fill: colors.teal, width: 0 } });
  slide.shapes.add({ geometry: "rect", position: { left: 790, top: 0, width: 35, height: 720 }, fill: colors.teal, line: { fill: colors.teal, width: 0 } });
  addText(slide, "BROWARD-MIAMI HEALTH INSTITUTE", { left: 76, top: 66, width: 680, height: 32 }, { fontSize: 17, bold: true, color: colors.aqua });
  addText(slide, def.title, { left: 76, top: 170, width: 660, height: 190 }, { fontSize: 48, bold: true, color: colors.white, verticalAlignment: "middle" });
  addText(slide, `${def.subtitle}  |  30-Hour Basic Intravenous Therapy`, { left: 80, top: 414, width: 660, height: 60 }, { fontSize: 23, color: colors.white });
  addText(slide, "Student presentation • clinical examples • guided practice", { left: 80, top: 500, width: 660, height: 42 }, { fontSize: 19, color: colors.aqua, bold: true });
  addSourceNotes(slide, def.page, `Cover media: Pexels photo by ${media.creator}, ${media.url}, downloaded October 23, 2026 under the Pexels License.`, `Welcome to ${def.title}, ${def.subtitle} of the BMHI thirty-hour intravenous therapy course. Explain that this module prepares learners for safe practice and the supervised in-person competency day. Preview the learning objectives and remind learners to complete the matching portal lesson and assessment.`);

  slide = baseSlide(pres, "Learning objectives", 2, def.subtitle);
  addBullets(slide, def.objectives, { left: 94, top: 190, width: 1070, height: 390 }, { fontSize: 29 });
  addSourceNotes(slide, def.page, "", heyGenScript("the learning objectives", def.objectives));

  const blocks = await relevantBlocks(def, deckIndex);
  let slideNumber = 3;
  for (const block of blocks) {
    if (block.image) await addVisualSlide(pres, block, slideNumber++, def.subtitle, `${manualPageRanges[deckIndex][0]}-${manualPageRanges[deckIndex][1]}`);
    else if (block.table) addTableSlide(pres, block, slideNumber++, def.subtitle, `${manualPageRanges[deckIndex][0]}-${manualPageRanges[deckIndex][1]}`);
    else addContentSlide(pres, block, slideNumber++, def.subtitle, `${manualPageRanges[deckIndex][0]}-${manualPageRanges[deckIndex][1]}`);
  }

  slide = baseSlide(pres, "Practice and competency check", slideNumber++, def.subtitle);
  addBullets(slide, def.practice, { left: 94, top: 190, width: 1070, height: 330 }, { fontSize: 29 });
  addText(slide, deckIndex === 7 ? "Every critical element requires direct observation and a passing evaluation." : "Complete the matching online lesson and assessment before the in-person laboratory.", { left: 94, top: 560, width: 1070, height: 62 }, { fontSize: 22, bold: true, color: colors.rust });
  addSourceNotes(slide, def.page, deckIndex === 7 ? "Skills evaluation requires direct observation and written RN verification." : "Online preparation precedes live practice.", heyGenScript("practice and competency expectations", def.practice));

  slide = baseSlide(pres, "Key points", slideNumber, def.subtitle);
  addBullets(slide, [def.objectives[0], def.sections[1][1], def.sections[3][1]], { left: 94, top: 190, width: 1070, height: 380 }, { fontSize: 27 });
  addText(slide, "Review the course lesson, complete the assessment, and bring questions to the live session.", { left: 94, top: 574, width: 1070, height: 54 }, { fontSize: 22, bold: true, color: colors.teal });
  addSourceNotes(slide, def.page, "", heyGenScript("the module key points", [def.objectives[0], def.sections[1][1], def.sections[3][1]]));

  const expandedFile = def.file.replace(/\.pptx$/, "_22hr_Online_8hr_InPerson_v17_Complications_Visual_Scripted.pptx");
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
