function quizContent(title, questions, instructions = "A score of 85% or higher is required. Review the lesson and retake the assessment if needed.") {
  return [
    "Canvas item type: Quiz.",
    "",
    title,
    instructions,
    "",
    `This assessment contains ${questions.length} multiple-choice questions.`,
    "",
    `QUIZ_DATA_BASE64:${Buffer.from(JSON.stringify(questions), "utf8").toString("base64")}`
  ].join("\n");
}

const q = (prompt, options, answer) => ({ prompt, options, answer });

const pretestOne = [
  q("Which vessel characteristic generally makes peripheral veins suitable for venipuncture?", ["They are superficial and return blood at lower pressure", "They have thicker walls than arteries", "They carry blood away from the heart", "They never contain valves"], 0),
  q("Which factor can reduce medication stability?", ["Light", "Temperature", "Container material", "All of these"], 3),
  q("Why can rapid IV drug action be both an advantage and a risk?", ["The effect and any adverse reaction may occur immediately", "The drug cannot enter circulation", "Absorption is always delayed", "Compatibility no longer matters"], 0),
  q("What device should be used when withdrawing medication from a glass ampule?", ["Blunt cannula only", "Filter needle", "Large-bore catheter", "Butterfly tubing"], 1),
  q("When one medication increases the effect of another, the interaction is called:", ["Antagonistic", "Idiosyncratic", "Synergistic", "Therapeutic incompatibility"], 2),
  q("Before an LPN independently performs employer-authorized IV duties, who must verify clinical competence?", ["Any coworker", "A Florida-licensed RN or other authorized evaluator under applicable rules and policy", "The patient", "A pharmacy technician"], 1),
  q("Which action is part of the rights of medication administration?", ["Verify the patient, drug, dose, route, time, reason, and documentation", "Rely on room number", "Skip allergy review", "Mix medications without checking compatibility"], 0),
  q("A visible precipitate forms after two IV drugs are combined. This indicates:", ["Physical incompatibility", "Expected therapeutic action", "Sterility", "Normal dilution"], 0),
  q("Why is air removed from IV tubing before connection?", ["To prevent air embolism", "To increase drop factor", "To lower tonicity", "To sterilize the medication"], 0),
  q("An intermittent medication connected above a primary infusion is commonly called:", ["Primary bolus", "IV piggyback or secondary infusion", "Enteral feeding", "Arterial flush"], 1)
];

const pretestTwo = [
  q("Standard Precautions require the nurse to:", ["Treat blood and specified body fluids as potentially infectious", "Use PPE only with a known diagnosis", "Wear sterile gloves for every contact", "Recap all used needles"], 0),
  q("When splash or spray is reasonably anticipated, appropriate PPE may include:", ["Gown, mask, and eye protection", "Shoe covers only", "No additional protection", "Sterile field only"], 0),
  q("Which site-preparation action increases infection risk and should generally be avoided unless required by policy?", ["Clipping excess hair", "Allowing antiseptic to dry", "Palpating after antisepsis without re-prepping", "Hand hygiene"], 2),
  q("At the first sign of a suspected transfusion reaction, the priority is to:", ["Speed up the blood", "Stop the transfusion and follow emergency/facility protocol", "Discard all documentation", "Give medication without an order"], 1),
  q("Parenteral nutrition is delivered:", ["Through the gastrointestinal tract", "By an intravenous route", "Only by intramuscular injection", "Through inhalation"], 1),
  q("Which laboratory result commonly supports the presence of infection?", ["Elevated white blood cell count", "Normal platelet count", "Stable hematocrit", "Normal sodium"], 0),
  q("The best single routine measure for reducing healthcare-associated transmission is:", ["Hand hygiene", "Double gloving at all times", "Prophylactic antibiotics", "Shaving every insertion site"], 0),
  q("When cleansing a needleless connector, the nurse should:", ["Use the approved antiseptic and friction for the required contact time", "Touch it afterward to test dryness", "Skip cleansing if capped", "Rinse with tap water"], 0),
  q("A central-line dressing that is damp, loose, or visibly soiled should be:", ["Reinforced indefinitely", "Changed using facility policy and aseptic technique", "Covered with cloth", "Ignored until the next week"], 1),
  q("Used sharps belong in:", ["Regular trash", "A puncture-resistant sharps container", "A linen bag", "The medication drawer"], 1)
];

const pretestThree = [
  q("Most body water in an adult is located in the:", ["Intracellular compartment", "Intravascular compartment", "Pleural space", "Gastrointestinal tract"], 0),
  q("Osmosis is the movement of:", ["Water across a semipermeable membrane", "Proteins through arteries", "Blood cells into tissue", "Medication against pressure"], 0),
  q("A solution with a lower effective solute concentration than plasma is:", ["Isotonic", "Hypotonic", "Hypertonic", "Colloid only"], 1),
  q("Which finding is consistent with fluid volume excess?", ["Crackles and rapid weight gain", "Dry mucous membranes only", "Flat neck veins", "Concentrated urine without edema"], 0),
  q("Which condition can cause fluid volume deficit?", ["Vomiting and diarrhea", "Excess sodium intake only", "Heart failure only", "Renal retention only"], 0),
  q("A potassium level below the reference range can increase the risk of:", ["Dysrhythmias and muscle weakness", "Polycythemia", "Hyperreflexia only", "Increased clotting only"], 0),
  q("Homeostasis means:", ["Maintenance of a stable internal environment", "Permanent fluid overload", "Absence of electrolytes", "Venous constriction"], 0),
  q("Third spacing can produce signs of hypovolemia because fluid:", ["Moves out of the functional intravascular space", "Becomes red blood cells", "Is converted to medication", "Moves only into the bladder"], 0),
  q("Which vessel returns blood toward the heart?", ["Vein", "Artery", "Aorta only", "Arteriole only"], 0),
  q("The usual adult red blood cell lifespan is approximately:", ["30 days", "60 days", "120 days", "365 days"], 2)
];

const pretestFour = [
  q("For a routine peripheral IV, site selection generally begins:", ["Distally, preserving more proximal sites", "At the antecubital fossa every time", "In a lower extremity", "In an arm with a dialysis access"], 0),
  q("Which extremity should generally be avoided for peripheral access?", ["An arm with a dialysis fistula or graft", "The nondominant arm", "A visible forearm vein", "A warm hand"], 0),
  q("After flashback is observed during catheter insertion, the nurse should:", ["Advance according to device technique, thread the catheter, and never reinsert the needle into the catheter", "Remove and reinsert the needle into the catheter", "Apply a proximal tourniquet indefinitely", "Probe laterally"], 0),
  q("A microdrip set commonly delivers:", ["10 gtt/mL", "15 gtt/mL", "20 gtt/mL", "60 gtt/mL"], 3),
  q("Which assessment supports peripheral IV patency?", ["No swelling or pain and infusion/flush behaves as expected", "The dressing is opaque", "The pump is powered on", "The patient has a pulse"], 0),
  q("Which catheter principle is safest?", ["Use the smallest gauge and shortest length appropriate for therapy", "Use the largest catheter available", "Choose without considering therapy", "Reuse a catheter after a failed attempt"], 0),
  q("The dressing label should follow facility policy and commonly include:", ["Date, time, initials, and catheter information", "Diagnosis only", "Room number only", "Medication price"], 0),
  q("The tourniquet for vein assessment should be:", ["Tight enough to impede venous return while preserving arterial flow", "Tight enough to stop all circulation", "Placed below the site", "Left on after connection"], 0),
  q("Which action is required before insertion?", ["Verify the order, patient identity, allergies, and indication", "Open all sterile supplies hours earlier", "Skip patient teaching", "Choose the site after puncture"], 0),
  q("A patient reports sharp electric pain during insertion. The nurse should:", ["Stop and remove the device because nerve contact is possible", "Advance farther", "Increase the infusion rate", "Apply a heating pad over the needle"], 0)
];

const pretestFive = [
  q("The formula for gravity flow in drops per minute is:", ["Volume (mL) x drop factor (gtt/mL) / time (minutes)", "Time x volume / drop factor", "Dose / weight only", "Volume x hours"], 0),
  q("300 mL over 1 hour with tubing calibrated at 10 gtt/mL equals:", ["25 gtt/min", "50 gtt/min", "100 gtt/min", "300 gtt/min"], 1),
  q("An order is for 5 mg; stock is 25 mg in 5 mL. How many mL are given?", ["0.1 mL", "1 mL", "5 mL", "10 mL"], 1),
  q("Before administering an IV medication through an existing line, the nurse must first:", ["Confirm compatibility, assess patency/site, and verify the medication order", "Assume compatibility", "Turn off all alarms", "Remove the dressing"], 0),
  q("The SASH sequence refers to:", ["Saline, administer, saline, heparin when ordered and appropriate", "Sterile, aseptic, secure, hold", "Stop, assess, stabilize, hydrate", "Saline, alcohol, soap, heat"], 0),
  q("A pump alarm should be managed by:", ["Assessing the patient and entire system, identifying the cause, and correcting it safely", "Silencing it permanently", "Increasing pressure limits", "Ignoring it if fluid remains"], 0),
  q("The nurse finds a cloudy mixture or precipitate in IV tubing. The correct action is to:", ["Stop and do not administer; investigate compatibility and replace as required", "Shake it", "Warm it", "Increase the rate"], 0),
  q("Medication calculation results should be:", ["Checked for reasonableness and independently verified when policy or risk requires", "Rounded without regard to device", "Estimated visually", "Recorded only after administration"], 0),
  q("An IV piggyback should be connected and programmed according to:", ["The medication order, compatibility information, device instructions, and facility policy", "Patient preference alone", "Bag color", "The fastest available rate"], 0),
  q("Complete IV medication documentation includes the medication, dose, route, time, site assessment, and:", ["Patient response and any required follow-up", "The nurse's opinion of the prescriber", "Supply cost", "Only the room number"], 0)
];

const pretestSix = [
  q("Pain, erythema, warmth, and a palpable venous cord suggest:", ["Phlebitis", "Air embolism", "Fluid volume deficit", "Patency"], 0),
  q("Coolness, swelling, pallor, and slowed infusion at a peripheral site suggest:", ["Infiltration", "Local infection only", "Expected findings", "Hyperkalemia"], 0),
  q("A vesicant leaking into tissue is called:", ["Extravasation", "Hemolysis", "Osmosis", "Occlusion"], 0),
  q("The first response to suspected infiltration or extravasation is to:", ["Stop the infusion and follow drug-specific/facility protocol", "Increase the pressure", "Massage every site", "Flush forcefully"], 0),
  q("Bright red pulsatile blood during an attempted peripheral IV suggests:", ["Arterial puncture", "Normal venous access", "Infiltration", "Catheter occlusion"], 0),
  q("If arterial puncture is suspected, the nurse should remove the catheter and:", ["Apply firm direct pressure and follow escalation policy", "Apply warmth and restart at the same site", "Flush the artery", "Place a loose dressing only"], 0),
  q("Hives, wheezing, hypotension, or rapidly worsening symptoms during an infusion may indicate:", ["Anaphylaxis or severe hypersensitivity", "Expected therapeutic action", "Simple occlusion", "Hypokalemia only"], 0),
  q("A damaged catheter fragment is suspected. The nurse should:", ["Prevent migration as directed, notify appropriate clinicians immediately, and follow emergency policy", "Probe the vein", "Ignore it if pain stops", "Flush it centrally"], 0),
  q("When discontinuing a peripheral IV, the nurse should inspect the removed catheter to ensure it is:", ["Intact", "Sterile", "Reusable", "Still primed"], 0),
  q("Which complication requires immediate emergency response due to possible cardiopulmonary compromise?", ["Air embolism", "Minor bruising", "Loose tape", "Dry skin"], 0)
];

const finalExam = [...pretestOne, ...pretestTwo, ...pretestThree, ...pretestFour, ...pretestFive, ...pretestSix];

const page = (title, durationMinutes, content) => ({ title, durationMinutes, content });
const quiz = (title, durationMinutes, questions, note) => ({ title, durationMinutes, content: quizContent(title, questions, note) });

const coursePolicies = `Completion requirements\n- Complete all 30 clock hours: 14 hours of assigned online/home study and 16 hours of scheduled classroom, skills lab, and evaluation.\n- Earn 85% or higher on each pre-course test and on the comprehensive online exam.\n- Attend the in-person classroom and laboratory sections. Online completion does not replace hands-on attendance.\n- Successfully demonstrate every critical skill on the competency checklist under direct evaluation by a Florida-licensed RN.\n- Clinical competence must be documented in writing. Employer policies may further limit practice and never expand legal scope.\n\nSafety notice\nThis course supports supervised education. Students must follow current Florida law, Board of Nursing rules, prescriber orders, manufacturer instructions, evidence-based standards, and facility policies. Drug references and older source manuals must be checked against current authoritative information before clinical use.`;

const ivTherapyCourse = {
  title: "IV Therapy Certification - 30 Hour Hybrid",
  slug: "iv-therapy-certification-30-hour",
  category: "Continuing Education",
  hours: 30,
  tuitionCents: 0,
  booksSuppliesCents: 0,
  registrationFeeCents: 0,
  credentialType: "Certificate",
  deliveryMode: "Hybrid: 14 hours online + 16 hours campus/lab",
  description: "This 30-hour IV Certification course meets the Florida Board of Nursing requirements for RNs and LPNs to administer IV therapy in Florida. The course is offered at multiple locations throughout the state.\n\nThe course includes both didactic and hands-on clinical practice. Students will learn venipuncture technique, IV insertion, fluid administration, medication compatibility, and complications management.\n\nFlorida Dept. of Health Provider #50-XXXX\nCE Broker Course Tracking #20-XXXXXXX - contact hours awarded upon completion\nMeets Florida Board of Nursing IV therapy requirements\nTwo-day course format (Saturday-Sunday or weekday sessions)",
  ghlProductKeys: ["IV Therapy", "IV Certification", "30 Hour IV Therapy", "IV Therapy Certification", "iv-therapy-certification-30-hour"],
  courseNumber: "IVT 030",
  seedVersion: "iv-therapy-hybrid-30h-v1-2026-08-11",
  objectives: [
    "Relate Florida nursing scope, employer policy, accountability, and documentation to IV therapy practice.",
    "Apply venous anatomy, fluid and electrolyte concepts, infection prevention, and medication safety to IV care.",
    "Calculate, prepare, initiate, monitor, and discontinue ordered peripheral infusions using appropriate equipment.",
    "Recognize and respond to local, systemic, mechanical, medication, blood-product, and central-access complications.",
    "Demonstrate peripheral IV insertion, dressing, IV piggyback, pump, access-device assessment, and documentation competencies under RN supervision."
  ],
  modules: [
    {
      title: "Online 1 of 7 - Orientation, Scope, and Baseline Assessment (1 hour)",
      lessons: [
        page("Welcome, Hybrid Schedule, and Completion Rules", 30, `Welcome to IVT 030\n\nThis course combines 14 hours of required online preparation with 16 hours of live classroom review, guided skills practice, and competency evaluation. The online sequence must be completed before the classroom segment.\n\n${coursePolicies}\n\nBring to lab: government-issued identification, required uniform/PPE, calculator, and any supplies directed by BMHI. Never practice invasive skills on a person outside an authorized lab or clinical setting.`),
        quiz("Baseline Knowledge Check", 30, pretestOne, "This diagnostic attempt introduces core topics. Your score identifies areas for review and does not replace the required section tests.")
      ]
    },
    {
      title: "Online 2 of 7 - Florida Scope, Orders, Pharmacology, and Safety (2 hours)",
      lessons: [
        page("Florida Scope, Accountability, and Facility Policy", 45, `Learning outcomes\n- Distinguish statutory/regulatory scope from employer authorization.\n- Explain why training and RN-verified competence are both required.\n- Identify when to stop, clarify, report, or escalate.\n\nPractice framework\nThe nurse verifies that the task is permitted by current Florida requirements, is included in employer policy, is supported by a complete order, and is within personal validated competence. An employer may be more restrictive. A certificate alone does not authorize a task that law or policy prohibits.\n\nBefore therapy\nConfirm patient identity with approved identifiers; review the order, indication, allergies, diagnosis, relevant laboratory results, vascular access, medication/solution, dose, route, rate, duration, compatibility, monitoring parameters, and emergency resources. Clarify incomplete, conflicting, illegible, or unsafe orders before proceeding.\n\nAccountability\nUse current drug information, follow the rights of medication administration, provide patient education, reassess the site and patient, document accurately, and report changes promptly.`),
        page("IV Pharmacology, Compatibility, and Medication Rights", 45, `Medication effects\nTherapeutic effects are intended. Side effects are predictable but unintended. Toxic effects arise from harmful exposure. Idiosyncratic reactions are unusual and unpredictable. Allergic responses range from rash to anaphylaxis.\n\nCompatibility and stability\nPhysical incompatibility may cause color change, haze, gas, or precipitate. Chemical incompatibility may not be visible. Therapeutic incompatibility changes the desired clinical effect. Stability can be affected by concentration, diluent, order of mixing, contact time, light, temperature, pH, and container material. Never assume compatibility; use a current approved reference or pharmacist.\n\nSafe administration\nCompare the order, medication label, and electronic record at required checkpoints. Trace tubing from container to patient. Scrub access points using approved technique. Assess patency and the site. Program the pump independently and use an independent double check for high-alert therapy when required.`),
        quiz("Pre-Course Test 1 - Foundations and Medication Safety", 30, pretestOne)
      ]
    },
    {
      title: "Online 3 of 7 - Venous Anatomy, Fluids, and Electrolytes (2.5 hours)",
      lessons: [
        page("Circulation, Veins, and Peripheral Site Selection", 60, `Veins return blood to the heart at lower pressure, have thinner walls than arteries, and often contain valves. Superficial veins of the hand and forearm are commonly considered for peripheral access. Begin distally when clinically appropriate so proximal sites remain available.\n\nAssess both extremities for vein visibility, palpability, direction, depth, resilience, and nearby joints. Match the smallest suitable catheter and shortest suitable length to the prescribed therapy, anticipated duration, vein, patient age, and condition.\n\nAvoid or seek explicit direction for sites affected by infection, burns, impaired circulation or sensation, prior infiltration/phlebitis, dialysis access, lymph-node dissection, paralysis, or other contraindications. Lower-extremity and special-population access must follow current policy and orders.\n\nPatient-centered preparation\nExplain the purpose and steps, obtain cooperation, address anxiety, preserve privacy, position comfortably, and honor the patient's right to ask questions or refuse.`),
        page("Fluid Compartments, Tonicity, and Electrolyte Balance", 60, `Body fluid is distributed between intracellular and extracellular compartments; extracellular fluid includes interstitial and intravascular spaces. Osmosis moves water across a semipermeable membrane, diffusion moves particles down a concentration gradient, filtration responds to pressure, and active transport uses energy.\n\nTonicity\nIsotonic solutions have an effective concentration similar to plasma. Hypotonic solutions promote water movement into cells. Hypertonic solutions draw water from cells and require close monitoring. Solution selection depends on the order, indication, comorbidities, laboratory findings, and current evidence.\n\nAssessment\nFluid deficit may produce thirst, dry mucosa, tachycardia, orthostatic changes, low urine output, weight loss, or poor skin turgor. Excess may produce rapid weight gain, edema, jugular venous distention, hypertension, crackles, or dyspnea. Monitor intake/output, daily weight, cardiopulmonary status, cognition, and relevant labs.\n\nElectrolytes\nSodium, potassium, calcium, magnesium, chloride, phosphate, and bicarbonate support neurologic, cardiac, muscular, and acid-base function. Abnormalities may become life-threatening; report critical results and symptoms immediately.`),
        quiz("Pre-Course Test 2 - Anatomy, Fluids, and Electrolytes", 30, pretestThree)
      ]
    },
    {
      title: "Online 4 of 7 - Infection Prevention and Access-Device Care (2 hours)",
      lessons: [
        page("Standard Precautions and Aseptic Non-Touch Technique", 45, `Use Standard Precautions for every patient. Perform hand hygiene at the required moments. Select gloves and additional PPE based on anticipated exposure. Dispose of sharps immediately in an approved container; never bend, break, or recap unless a specific safety procedure requires it.\n\nAseptic non-touch technique protects key parts and key sites. Do not touch disinfected connectors, catheter hubs, sterile catheter components, or prepared insertion sites. Use the approved skin antiseptic with friction and allow it to dry completely. If the prepared site must be repalpated, restore asepsis according to policy.\n\nDuring maintenance, assess necessity daily, inspect and palpate as permitted, scrub connectors, keep the dressing clean/dry/intact, use new sterile caps and devices as required, and remove unnecessary access promptly.`),
        page("Peripheral, Midline, PICC, Central Line, and Port Overview", 45, `Peripheral IV catheters terminate in a peripheral vein and are used for therapies suitable for peripheral administration. Midlines terminate in an upper-arm peripheral vein. PICCs and other central venous access devices terminate centrally; implanted ports are accessed with a noncoring needle.\n\nDevice selection depends on therapy characteristics, duration, vein health, complication risk, and current policy. Students must know which tasks are restricted to the RN or specially authorized personnel.\n\nAssess for dressing integrity, securement, external length when applicable, tenderness, erythema, swelling, drainage, patency, and systemic signs of infection. Never force a flush against resistance. Clamp and cap in the correct sequence for the device. Follow current facility/manufacturer guidance for flushing, locking, dressing change, and blood sampling.`),
        quiz("Pre-Course Test 3 - Infection Prevention and Access Devices", 30, pretestTwo)
      ]
    },
    {
      title: "Online 5 of 7 - Equipment, Peripheral Insertion, and Maintenance (2 hours)",
      lessons: [
        page("Equipment, Tubing, Catheters, and Infusion Devices", 45, `Common supplies include the ordered solution, administration set, catheter, extension set, needleless connector, antiseptic, tourniquet, flush, transparent or gauze dressing, securement device, labels, gloves/PPE, sharps container, and infusion device. Inspect packaging, expiration dates, solution clarity, leaks, and medication labels.\n\nMacrodrip tubing has a manufacturer-specific drop factor such as 10, 15, or 20 gtt/mL. Microdrip tubing is typically 60 gtt/mL. Pumps control volume over time but do not replace patient and site assessment. Trace and label tubing, keep connections secure, and respond to alarms by assessing the patient first and then the complete system.`),
        page("Peripheral IV Insertion, Securement, and Discontinuation", 45, `Insertion sequence\n1. Verify order, identity, allergies, indication, therapy, and site restrictions.\n2. Explain the procedure, position the patient, perform hand hygiene, gather supplies, and apply PPE.\n3. Select and assess a distal suitable vein; choose an appropriate catheter.\n4. Apply the tourniquet, prepare the site with approved antiseptic, and allow it to dry.\n5. Stabilize the vein, insert bevel up, observe flashback, lower/advance as taught, thread the catheter, release the tourniquet, occlude safely, activate needle safety, and discard the needle. Never reinsert the needle into the catheter.\n6. Connect the primed extension, verify patency according to policy, secure without obscuring assessment, apply/label the dressing, initiate ordered therapy, reassess, and document.\n\nDiscontinuation\nStop therapy, perform hand hygiene/PPE, remove dressing and catheter gently, apply pressure and dressing, inspect the catheter for intactness, reassess the site, and document. Escalate any missing fragment immediately.`),
        quiz("Pre-Course Test 4 - Equipment and Peripheral IV Skills", 30, pretestFour)
      ]
    },
    {
      title: "Online 6 of 7 - Infusions, Calculations, Blood, and Nutrition (2.5 hours)",
      lessons: [
        page("Flow Rates, Dosage Calculations, Pumps, and IV Piggyback", 60, `Core formulas\n- mL/hour = total volume (mL) / time (hours).\n- gtt/min = volume (mL) x drop factor (gtt/mL) / time (minutes).\n- Volume to administer = desired dose / dose on hand x volume on hand.\n- Dose rate problems require units to cancel correctly before programming.\n\nAlways convert units, label each step, retain clinically appropriate precision, round only at the final step according to device/policy, and check whether the answer is reasonable. Obtain an independent double check when required.\n\nSecondary infusion\nVerify the order and compatibility, inspect the medication, assess the patient/site, prime and connect aseptically to the correct port, position bags for the device/setup, program primary and secondary settings, open clamps, observe startup, reassess during infusion, restore/verify the primary infusion, flush as ordered, and document.`),
        page("Blood Components, Parenteral Nutrition, and High-Risk Therapy", 60, `Blood administration requires specific authorization, patient identification, consent verification, baseline assessment, product verification by qualified staff, dedicated compatible tubing/solution, close early monitoring, and prompt response to reactions. If a reaction is suspected, stop the transfusion, maintain access as policy directs with compatible solution/new tubing, assess and support the patient, notify required personnel, recheck identification, and complete ordered specimens/documentation.\n\nParenteral nutrition contains concentrated nutrients and carries metabolic, infection, and line risks. Verify the formulation and rate, use the required central or peripheral route, dedicated lumen and filter when ordered, strict asepsis, glucose/electrolyte monitoring, and never abruptly change therapy without direction.\n\nHigh-alert and vesicant medications require current drug-specific guidance, appropriate access, blood return/patency checks when indicated, close monitoring, and immediate use of the facility extravasation or emergency protocol.`),
        quiz("Pre-Course Test 5 - Calculations and Infusion Management", 30, pretestFive)
      ]
    },
    {
      title: "Online 7 of 7 - Complications, Documentation, and Pre-Lab Readiness (2 hours)",
      lessons: [
        page("Complications: Recognition, Immediate Actions, and Prevention", 45, `Local complications\n- Infiltration: cool, pale, swollen, uncomfortable site; slowed infusion.\n- Extravasation: vesicant leakage with pain, blistering, tissue injury, or altered sensation.\n- Phlebitis: pain, erythema, warmth, swelling, or palpable venous cord.\n- Hematoma/bleeding, occlusion, dislodgement, leakage, nerve injury, and arterial puncture.\n\nSystemic complications\nAllergic reaction/anaphylaxis, bloodstream infection/sepsis, fluid overload, speed shock, air embolism, catheter embolism, and transfusion reaction require rapid recognition.\n\nGeneral response\nStop the infusion when indicated, assess airway/breathing/circulation and vital signs, activate emergency response, notify the RN/prescriber, preserve access or equipment as drug-specific protocol requires, position/support the patient, administer ordered treatment, document objective findings/actions/response, and complete an event report when required. Never force-flush an occluded or compromised device.`),
        page("Documentation, Patient Teaching, and Lab Readiness", 45, `Document the order verification, date/time, indication, site/side, vein when required, device type/gauge/length, number of attempts and inserter, antiseptic, dressing/securement, patency, solution/medication/rate, pump settings, patient tolerance/teaching, assessments, complications, actions, notifications, and response. Record discontinuation and catheter integrity.\n\nTeach the patient to protect the device and report pain, burning, wetness, leaking, swelling, redness, warmth, coolness, tightness, bleeding, pump alarms, fever/chills, shortness of breath, rash, or other new symptoms.\n\nPre-lab mental rehearsal\nUse a deliberate pause before every procedure: correct patient, order, therapy, access, equipment, infection-control plan, calculation, emergency plan, and documentation. In lab, verbalize each safety check and stop immediately if a critical element is missed.`),
        quiz("Pre-Course Test 6 - Complications and Documentation", 30, pretestSix)
      ]
    },
    {
      title: "Campus 1 of 5 - Mandatory Didactic Review and Case Conference (3 hours)",
      lessons: [
        page("Live Review: Scope, Orders, Patient Assessment, and Therapy Selection", 90, `Instructor-led classroom session\nReview current Florida requirements, LPN/RN responsibilities, employer authorization, complete orders, medication rights, vascular-access assessment, fluid selection, tonicity, electrolyte imbalance, compatibility, and escalation.\n\nCase conference\nStudents work through four cases: dehydration with electrolyte risk; older adult with heart failure; patient with limited access and a dialysis fistula; and an incomplete/high-risk medication order. For each case, identify missing information, safest access/solution considerations, monitoring, patient teaching, and when the LPN must stop and consult the RN/prescriber/pharmacist.`),
        page("Live Review: Infection Control, Access Devices, Blood, and Nutrition", 90, `Instructor demonstrations and guided discussion cover hand hygiene, PPE, aseptic non-touch technique, skin preparation, connector disinfection, dressing assessment, peripheral versus central access, device restrictions, blood components and reactions, parenteral nutrition, high-alert therapy, and emergency readiness.\n\nStudents complete verbal teach-back for suspected infection, transfusion reaction, and central-line complication scenarios. The instructor documents attendance and provides remediation before lab participation when a learner cannot state the immediate safety action.`)
      ]
    },
    {
      title: "Campus 2 of 5 - Skills Lab: Fluids, Equipment, Veins, and Peripheral Starts (4 hours)",
      lessons: [
        page("Skills Stations: Fluid, Tubing, Pump, and Vein Selection", 120, `Supervised rotation\n1. Verify an order and choose the correct labeled fluid and administration set.\n2. Inspect supplies and prime primary/secondary tubing without air.\n3. Identify macrodrip/microdrip drop factors; calculate and set gravity and pump rates.\n4. Trace tubing, label lines, connect needleless systems aseptically, and respond to pump alarms.\n5. Locate and palpate veins on task trainers; select distal sites and appropriate catheter gauge/length.\n\nStudents receive immediate coaching and repeat any missed critical safety step.`),
        page("Deliberate Practice: Peripheral IV Insertion and Dressing", 120, `Using approved task trainers only, each student practices the full peripheral insertion sequence: verify, explain, gather, hand hygiene/PPE, position, select site/device, tourniquet, antisepsis/drying, insertion/flashback/threading, needle safety, connection, patency check, securement, transparent dressing, labeling, initiation, reassessment, documentation, and safe discontinuation.\n\nCritical fail examples include wrong patient/order, failure to maintain asepsis, needle reinsertion into catheter, unrecognized arterial/nerve warning, failure to release tourniquet, unsafe sharps handling, forceful flush, or failure to stop for infiltration/extravasation.`)
      ]
    },
    {
      title: "Campus 3 of 5 - Skills Lab: IVPB, Pumps, Access Devices, and Dressings (3 hours)",
      lessons: [
        page("IV Piggyback, Saline Lock, and Infusion Pump Practice", 90, `Students verify the order and label, explain indication/side effects/contraindications, check compatibility, choose and prime the set, assess the site, scrub/connect aseptically, calculate/program the correct rate, initiate secondary therapy with a primary line or saline lock as assigned, apply the appropriate flushing sequence, monitor, respond to alarms/adverse effects, and document.`),
        page("Access-Device Assessment and Dressing Simulation", 90, `Students rotate through peripheral, midline, PICC, non-tunneled/tunneled central catheter, and implanted-port models. They identify device type and permitted role, evaluate dressings/sites, recognize migration/occlusion/infection findings, prepare a sterile field, simulate dressing change and connector replacement where within course scope, and state when the RN or specialty team must take over. No student performs an unauthorized central-access procedure on a person.`)
      ]
    },
    {
      title: "Campus 4 of 5 - Complications, Emergency Response, and Documentation (2 hours)",
      lessons: [
        page("Complication Simulation and Clinical Documentation", 120, `Scenario circuit\n- Infiltration versus vesicant extravasation\n- Phlebitis, occlusion, leakage, and dislodgement\n- Arterial puncture, nerve warning, hematoma, and catheter damage\n- Allergic reaction/anaphylaxis and speed shock\n- Fluid overload, air embolism, infection/sepsis, and transfusion reaction\n\nFor each scenario the student must recognize cues, stop unsafe therapy, assess and stabilize, activate the correct chain of command, apply drug/device-specific precautions, communicate with SBAR, document objective findings and response, and identify prevention measures.`)
      ]
    },
    {
      title: "Campus 5 of 5 - Comprehensive Exam and RN Competency Evaluation (4 hours)",
      lessons: [
        quiz("Comprehensive IV Therapy Final Examination", 60, finalExam, "A score of 85% or higher is required before course completion. The instructor will arrange remediation and retesting according to BMHI policy."),
        page("RN Competency Checkoff - Peripheral IV Start", 75, `Instructor evaluation - pass/fail\nAll critical elements must be demonstrated under direct observation by a Florida-licensed RN evaluator.\n\nChecklist\n[ ] Verifies order, identity, allergies, indication, and patient readiness.\n[ ] Performs hand hygiene, selects PPE, and maintains aseptic non-touch technique.\n[ ] Assesses veins and selects appropriate site, catheter size, and supplies.\n[ ] Explains procedure and positions patient safely.\n[ ] Primes extension/connector and removes air.\n[ ] Applies tourniquet and prepares site; allows antiseptic to dry.\n[ ] Performs venipuncture, observes flashback, threads catheter safely, and never reinserts needle.\n[ ] Releases tourniquet, activates sharps safety, and disposes immediately.\n[ ] Connects aseptically and verifies patency without force.\n[ ] Secures catheter, applies/labels dressing, initiates ordered therapy, and reassesses.\n[ ] Documents all required elements and teaches reportable symptoms.\n[ ] Discontinues safely and verifies catheter integrity when assigned.\n\nEvaluator records pass/remediation, date, printed name, Florida RN license number, signature, and attempt number in the official skills record.`),
        page("RN Competency Checkoff - IVPB, Pump, and Complication Response", 75, `Instructor evaluation - pass/fail\n[ ] Confirms complete order and medication label.\n[ ] States indication, key adverse effects, contraindications, and monitoring.\n[ ] Verifies compatibility and selects correct administration set.\n[ ] Assesses site/access device and dressing.\n[ ] Calculates gravity/pump rate correctly and independently verifies settings when required.\n[ ] Scrubs and connects aseptically; primes tubing without air.\n[ ] Initiates IVPB with primary hydration or saline lock as assigned.\n[ ] Uses the ordered flushing/locking sequence and prevents occlusion.\n[ ] Responds correctly to pump alarms.\n[ ] Recognizes infiltration, extravasation, phlebitis, overload, air embolism, infection, and allergic/transfusion reaction cues.\n[ ] Stops unsafe therapy, assesses, escalates, and performs emergency actions correctly.\n[ ] Documents medication, site, rate, assessments, teaching, response, notifications, and follow-up.\n\nA missed critical safety element requires remediation and repeat evaluation. Written RN verification is required before completion is released.`),
        page("Course Completion, Employer Validation, and Continuing Competence", 30, `Final completion audit\n[ ] 14 online/home-study hours complete.\n[ ] Six pre-course tests complete at 85% or higher.\n[ ] 16 classroom/lab/evaluation hours attended.\n[ ] Comprehensive final exam passed at 85% or higher.\n[ ] Peripheral IV and IVPB/pump/complication competencies passed.\n[ ] Florida RN evaluator documentation complete.\n[ ] Student evaluation and BMHI records complete.\n\nThe completion certificate documents successful education and BMHI evaluation. The employing institution remains responsible for authorizing duties, validating competence in its setting, maintaining required written verification, and enforcing current law and facility policy. Seek continuing education, annual competency review, and immediate supervision whenever a task, device, drug, or patient condition exceeds validated competence.`)
      ]
    }
  ],
  gradeItems: [
    { title: "Baseline Knowledge Check", pointsPossible: 10 },
    { title: "Pre-Course Test 1 - Foundations and Medication Safety", pointsPossible: 10 },
    { title: "Pre-Course Test 2 - Anatomy, Fluids, and Electrolytes", pointsPossible: 10 },
    { title: "Pre-Course Test 3 - Infection Prevention and Access Devices", pointsPossible: 10 },
    { title: "Pre-Course Test 4 - Equipment and Peripheral IV Skills", pointsPossible: 10 },
    { title: "Pre-Course Test 5 - Calculations and Infusion Management", pointsPossible: 10 },
    { title: "Pre-Course Test 6 - Complications and Documentation", pointsPossible: 10 },
    { title: "Comprehensive IV Therapy Final Examination", pointsPossible: 60 },
    { title: "RN Competency Checkoff - Peripheral IV Start", pointsPossible: 100 },
    { title: "RN Competency Checkoff - IVPB, Pump, and Complication Response", pointsPossible: 100 }
  ]
};

module.exports = { ivTherapyCourse };
