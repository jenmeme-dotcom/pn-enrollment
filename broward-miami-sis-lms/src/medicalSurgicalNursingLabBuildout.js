const LIPPINCOTT_GATEWAY = "https://thepoint.lww.com/gateway";
const SYLLABUS_PDF = "/course-materials/medical-surgical-nursing-i-pn107-lab/PN107-Lab-Syllabus-12-Weeks.pdf";

// The source Skills Lab outline spans fourteen instructional blocks. The BMHI
// course keeps every block while presenting a twelve-week calendar by merging
// source Weeks 1-2 and source Weeks 12-13. The baseline array below preserves
// the previously entered skill details; the final `weeklySkills` array performs
// the requested calendar reflow without changing assignment IDs at runtime.
const baselineWeeklySkills = [
  {
    week: 1,
    topic: "Asepsis and Infection Control",
    skills: [
      {
        title: "Alcohol-Based Hand Hygiene",
        searchTitle: "Performing Hand Hygiene Using an Alcohol-Based Hand Sanitizer",
        criteria: [
          "Identify when alcohol-based hand sanitizer is appropriate and when soap and water is required.",
          "Apply enough product to cover all hand surfaces and rub using a complete, orderly technique.",
          "Continue friction until the hands are dry without wiping the product away.",
          "Prevent recontamination before touching the client or clean supplies."
        ]
      },
      {
        title: "Soap-and-Water Handwashing",
        searchTitle: "Performing Hand Hygiene Using Soap and Water (Handwashing)",
        criteria: [
          "Prepare the sink area and keep clothing and hands from contacting contaminated surfaces.",
          "Wet, lather, and clean all hand and finger surfaces with sustained friction.",
          "Rinse with fingertips directed downward and dry from clean to less-clean areas.",
          "Use a clean barrier to turn off the faucet and leave the area without recontamination."
        ]
      },
      {
        title: "Personal Protective Equipment",
        searchTitle: "Using Personal Protective Equipment",
        criteria: [
          "Select gloves, gown, mask or respirator, and eye protection for the stated precautions.",
          "Put on protective equipment in an order that preserves clean surfaces and full coverage.",
          "Remove contaminated equipment without touching clothing, skin, or clean surfaces.",
          "Perform hand hygiene at the required points and dispose of equipment correctly."
        ]
      },
      {
        title: "Sterile Field Preparation",
        searchTitle: "Preparing a Sterile Field Using a Packaged Sterile Drape",
        criteria: [
          "Confirm package integrity, expiration, dryness, and the location of the sterile field.",
          "Open the package without reaching over or contaminating the field.",
          "Keep sterile items above waist level, in view, and within the field boundaries.",
          "Recognize a break in sterility and restart or replace contaminated supplies promptly."
        ]
      }
    ]
  },
  {
    week: 2,
    topic: "Vital Signs and Pain Assessment",
    skills: [
      {
        title: "Body Temperature",
        searchTitle: "Measuring Body Temperature",
        criteria: [
          "Choose an appropriate route after reviewing age, condition, restrictions, and recent intake.",
          "Prepare and position the device correctly while maintaining privacy and infection control.",
          "Obtain and document the temperature with route, units, time, and relevant observations.",
          "Recognize an unexpected result and repeat, compare, or escalate it appropriately."
        ]
      },
      {
        title: "Pulse and Respirations",
        searchTitle: "Measuring a Radial Pulse and Respirations",
        criteria: [
          "Locate the radial pulse and assess rate, rhythm, and strength without using the thumb.",
          "Count for an appropriate interval and extend the count when the rhythm is irregular.",
          "Observe respirations without cueing the client and assess rate, depth, rhythm, and effort.",
          "Document findings and report clinically significant abnormalities."
        ]
      },
      {
        title: "Blood Pressure",
        searchTitle: "Measuring Blood Pressure",
        criteria: [
          "Select the correct cuff size and position the rested client and supported arm appropriately.",
          "Locate the artery, place the cuff, and use palpation or auscultation without excessive pressure.",
          "Deflate at a controlled rate and identify systolic and diastolic readings accurately.",
          "Document arm, position, cuff considerations, and actions taken for an abnormal result."
        ]
      },
      {
        title: "Pain Assessment",
        searchTitle: "Assessing Pain",
        criteria: [
          "Use an age- and condition-appropriate pain scale and accept the client's report.",
          "Assess location, onset, quality, intensity, pattern, aggravating factors, and associated symptoms.",
          "Evaluate function, safety risks, previous relief measures, and response to intervention.",
          "Document the assessment and promptly escalate new, severe, or changing pain."
        ]
      }
    ]
  },
  {
    week: 3,
    topic: "Health Assessment Safety and Communication",
    skills: [
      {
        title: "Head-to-Toe Assessment",
        searchTitle: "Performing a Head-to-Toe Physical Assessment",
        criteria: [
          "Confirm identity, explain the assessment, protect privacy, and complete an immediate safety survey.",
          "Use a consistent sequence to inspect and assess major body systems bilaterally when appropriate.",
          "Differentiate expected from unexpected findings and prioritize concerns using the nursing process.",
          "Document objective findings clearly and report urgent changes without delay."
        ]
      },
      {
        title: "Patient Identification and Allergy Safety",
        searchTitle: "Identifying a Client and Verifying Allergies",
        criteria: [
          "Use two approved identifiers and match them to the order or record before care.",
          "Ask the client to state identifiers and allergies rather than confirming suggested answers.",
          "Verify allergy type and reaction and resolve missing or conflicting information before proceeding.",
          "Apply identification and allergy safeguards consistently during medications, specimens, and procedures."
        ]
      },
      {
        title: "Fall Prevention and Safe Transfer",
        searchTitle: "Transferring a Client Using a Gait Belt",
        criteria: [
          "Assess strength, balance, cognition, lines, footwear, and the need for additional assistance.",
          "Prepare and lock equipment, clear the path, and place the gait belt securely.",
          "Use safe body mechanics and clear instructions during standing, pivoting, and sitting.",
          "Reassess alignment, comfort, call-light access, and fall precautions after the transfer."
        ]
      },
      {
        title: "SBAR Handoff and Documentation",
        searchTitle: "Communicating Client Information Using SBAR",
        criteria: [
          "State the immediate situation and client identifiers concisely.",
          "Include relevant background, current assessment findings, trends, and recent interventions.",
          "Make a clear recommendation or request and verify that instructions are understood.",
          "Document objective information, notification, response, and follow-up without prohibited abbreviations."
        ]
      }
    ]
  },
  {
    week: 4,
    topic: "Oxygenation and Respiratory Care",
    skills: [
      {
        title: "Respiratory Assessment and Pulse Oximetry",
        searchTitle: "Assessing Respirations and Measuring Oxygen Saturation",
        criteria: [
          "Assess respiratory rate, depth, rhythm, effort, breath sounds, cough, color, and mental status.",
          "Choose and prepare a suitable pulse-oximetry site and reduce motion, polish, and perfusion error.",
          "Compare the reading with the client's presentation and prescribed target rather than relying on one number.",
          "Document findings and escalate acute distress or unexpected deterioration immediately."
        ]
      },
      {
        title: "Oxygen Delivery Devices",
        searchTitle: "Administering Oxygen by Nasal Cannula or Face Mask",
        criteria: [
          "Verify the order, target saturation, device, flow, humidification need, and oxygen safety precautions.",
          "Apply the selected device comfortably and protect pressure-prone skin.",
          "Reassess respiratory status, saturation, device fit, and client tolerance after initiation or adjustment.",
          "Keep oxygen away from ignition sources and report worsening status promptly."
        ]
      },
      {
        title: "Incentive Spirometry and Pulmonary Hygiene",
        searchTitle: "Using an Incentive Spirometer",
        criteria: [
          "Position the client and explain slow sustained inhalation, breath hold, and controlled exhalation.",
          "Set or verify the prescribed goal and coach correct mouthpiece seal and technique.",
          "Combine the exercise with coughing, deep breathing, splinting, mobility, and rest as appropriate.",
          "Record performance, tolerance, secretions, and the need for additional respiratory support."
        ]
      },
      {
        title: "Airway Suctioning Simulation",
        searchTitle: "Suctioning the Oropharyngeal Airway",
        criteria: [
          "Confirm the indication, baseline respiratory status, equipment, suction setting, and need for assistance.",
          "Use clean or sterile technique appropriate to the simulated route and protect oxygenation.",
          "Limit suction duration, monitor tolerance, and stop for distress, bleeding, or deterioration.",
          "Reassess breath sounds, secretions, saturation, comfort, and response after the procedure."
        ]
      }
    ]
  },
  {
    week: 5,
    topic: "Perfusion and Cardiovascular Care",
    skills: [
      {
        title: "Cardiovascular and Peripheral Vascular Assessment",
        searchTitle: "Performing a Cardiovascular and Peripheral Vascular Assessment",
        criteria: [
          "Assess heart rate and rhythm, relevant heart sounds, skin, edema, capillary refill, and peripheral pulses.",
          "Compare extremities bilaterally and note temperature, color, sensation, movement, and swelling.",
          "Relate findings to symptoms such as chest discomfort, dyspnea, dizziness, or activity intolerance.",
          "Document trends and escalate acute chest symptoms, absent pulses, or sudden neurovascular change."
        ]
      },
      {
        title: "Orthostatic Vital Signs",
        searchTitle: "Measuring Orthostatic Blood Pressure and Pulse",
        criteria: [
          "Review fall risk, symptoms, medications, and the need for assistance before position changes.",
          "Allow the prescribed rest interval and obtain pulse and pressure in the required positions.",
          "Observe dizziness, weakness, pallor, or instability and stop the sequence when unsafe.",
          "Document positions, times, readings, symptoms, and safety actions."
        ]
      },
      {
        title: "Electrocardiogram Lead Placement",
        searchTitle: "Obtaining a 12-Lead Electrocardiogram",
        criteria: [
          "Explain the procedure, prepare skin, and preserve privacy while exposing only required areas.",
          "Place limb and precordial electrodes at correct anatomic landmarks.",
          "Reduce artifact and verify client identity, tracing quality, date, time, and symptoms.",
          "Recognize that interpretation is outside the checkoff and promptly route urgent tracings or symptoms."
        ]
      },
      {
        title: "Venous Thromboembolism Prevention",
        searchTitle: "Applying Sequential Compression Devices",
        criteria: [
          "Assess skin, circulation, sensation, order, size, and contraindications before application.",
          "Apply sleeves smoothly and connect the device without tubing obstruction.",
          "Verify cycling and fit and combine use with mobility and leg exercises as ordered.",
          "Remove for scheduled skin checks and report pain, swelling, discoloration, or device problems."
        ]
      }
    ]
  },
  {
    week: 6,
    topic: "Medication and Intravenous Safety",
    skills: [
      {
        title: "Oral Medication Administration",
        searchTitle: "Administering Oral Medications",
        criteria: [
          "Verify the order, allergies, indications, parameters, interactions, and medication rights before preparation.",
          "Compare the label with the medication record at required checkpoints and avoid unsafe crushing or alteration.",
          "Identify the client, explain each medication, and observe safe swallowing and administration.",
          "Document only after administration and evaluate therapeutic and adverse responses."
        ]
      },
      {
        title: "Subcutaneous Injection",
        searchTitle: "Administering a Subcutaneous Injection",
        criteria: [
          "Verify medication, dose, syringe, needle, site, timing, and client-specific precautions.",
          "Select and rotate an appropriate site and prepare it using aseptic technique.",
          "Insert at an angle suited to tissue depth and administer without contaminating equipment.",
          "Activate the safety device, dispose of sharps, document, and monitor the response."
        ]
      },
      {
        title: "Intramuscular Injection",
        searchTitle: "Administering an Intramuscular Injection",
        criteria: [
          "Select an appropriate muscle, needle, volume, and landmark based on the client and medication.",
          "Position the client and identify the site using reliable anatomic landmarks.",
          "Use aseptic technique and the ordered injection method while preventing needlestick injury.",
          "Dispose of sharps, document site and medication, and evaluate for adverse response."
        ]
      },
      {
        title: "IV Infusion Pump and Site Assessment",
        searchTitle: "Managing a Peripheral Intravenous Infusion",
        criteria: [
          "Verify solution, order, rate calculation, tubing, compatibility, pump settings, and client identity.",
          "Trace the line from solution to client and assess the insertion site and extremity before use.",
          "Program and independently verify high-risk settings according to school and agency policy.",
          "Recognize infiltration, extravasation, phlebitis, occlusion, overload, or infection and initiate the approved response."
        ]
      }
    ]
  },
  {
    week: 7,
    topic: "Neurologic and Sensory Care",
    skills: [
      {
        title: "Neurologic Assessment",
        searchTitle: "Performing a Neurologic Assessment",
        criteria: [
          "Assess level of consciousness, orientation, speech, movement, sensation, and symmetry.",
          "Evaluate pupils, strength, drift, and selected cranial-nerve or coordination findings as assigned.",
          "Use a consistent scale when ordered and compare current findings with the client's baseline.",
          "Recognize and urgently report sudden weakness, speech change, unequal pupils, seizure, or declining consciousness."
        ]
      },
      {
        title: "Glasgow Coma Scale",
        searchTitle: "Using the Glasgow Coma Scale",
        criteria: [
          "Assess eye opening, verbal response, and motor response using the stated stimuli.",
          "Assign each component accurately and record components rather than only a total score.",
          "Account for communication, sedation, airway, or injury limitations without inventing a score.",
          "Trend findings and escalate a new decline immediately."
        ]
      },
      {
        title: "Seizure and Aspiration Precautions",
        searchTitle: "Implementing Seizure Precautions",
        criteria: [
          "Prepare the environment, suction and oxygen equipment, bed position, and observation plan as ordered.",
          "Protect the client during a simulated seizure without restraining or placing objects in the mouth.",
          "Time and describe activity, protect the airway, and maintain privacy and safety after the event.",
          "Assess post-event status and report prolonged, repeated, first-time, or injury-associated seizure activity."
        ]
      },
      {
        title: "Eye and Ear Medication Safety",
        searchTitle: "Administering Eye and Ear Medications",
        criteria: [
          "Verify the correct medication, route, side, order, allergies, and integrity of the eye or ear.",
          "Position the client and avoid contaminating the applicator tip.",
          "Administer to the correct anatomic location without applying unsafe pressure.",
          "Provide teaching, document the route and side, and evaluate the response."
        ]
      }
    ]
  },
  {
    week: 8,
    topic: "Nutrition and Gastrointestinal Care",
    skills: [
      {
        title: "Abdominal Assessment",
        searchTitle: "Performing an Abdominal Assessment",
        criteria: [
          "Prepare and position the client and inspect before touching the abdomen.",
          "Auscultate before percussion or palpation and assess all quadrants systematically.",
          "Use light palpation within scope and avoid aggravating known pain or unsafe findings.",
          "Document contour, sounds, tenderness, symptoms, and urgent findings."
        ]
      },
      {
        title: "Enteral Feeding Safety",
        searchTitle: "Administering an Enteral Feeding",
        criteria: [
          "Verify the order, formula, route, tube placement method, expiration, allergies, and aspiration risk.",
          "Position the client safely and assess tube, abdomen, and tolerance before feeding.",
          "Administer feeding and flushes using the ordered method without mixing incompatible medications.",
          "Maintain aspiration precautions and document intake, tolerance, and adverse findings."
        ]
      },
      {
        title: "Nasogastric Tube Care Simulation",
        searchTitle: "Caring for a Client With a Nasogastric Tube",
        criteria: [
          "Confirm the purpose, order, external length, securement, drainage or feeding setup, and placement policy.",
          "Provide oral and nasal care and protect skin while maintaining tube security.",
          "Measure and describe output or intake and keep tubing free from dependent loops and obstruction.",
          "Recognize displacement, aspiration risk, bleeding, distention, or respiratory distress and stop or escalate care."
        ]
      },
      {
        title: "Ostomy Care",
        searchTitle: "Changing an Ostomy Pouching System",
        criteria: [
          "Assess the stoma, peristomal skin, output, pouch seal, and client learning needs.",
          "Remove the system gently, clean and dry the skin, and measure the stoma.",
          "Cut and apply the barrier and pouch for a secure fit without constricting the stoma.",
          "Document appearance and output and report ischemia, severe irritation, retraction, or abnormal bleeding."
        ]
      }
    ]
  },
  {
    week: 9,
    topic: "Endocrine and Fluid Balance",
    skills: [
      {
        title: "Capillary Blood Glucose",
        searchTitle: "Measuring Capillary Blood Glucose",
        criteria: [
          "Verify the order, timing, meter quality controls, strip integrity, client identity, and hand preparation.",
          "Choose an appropriate puncture site and obtain a sample without excessive squeezing.",
          "Apply the sample correctly, dispose of the lancet safely, and clean equipment per policy.",
          "Document the result and act promptly on critical, unexpected, or symptom-inconsistent values."
        ]
      },
      {
        title: "Insulin Preparation",
        searchTitle: "Preparing Insulin From a Vial",
        criteria: [
          "Verify insulin type, concentration, dose, timing, glucose, meal plan, expiration, and storage.",
          "Use the correct syringe and maintain asepsis while drawing the prescribed dose.",
          "Apply the required independent verification and mixing sequence when two compatible insulins are ordered.",
          "Label and protect the prepared dose and resolve discrepancies before administration."
        ]
      },
      {
        title: "Subcutaneous Insulin Administration",
        searchTitle: "Administering a Subcutaneous Insulin Injection",
        criteria: [
          "Identify the client, recheck the order, glucose, food availability, dose, and injection timing.",
          "Select and rotate a suitable site and inspect for lipodystrophy or other concerns.",
          "Administer using the correct device and technique and dispose of sharps safely.",
          "Document administration and monitor for hypoglycemia, hyperglycemia, and therapeutic response."
        ]
      },
      {
        title: "Intake Output and Daily Weight",
        searchTitle: "Measuring Intake and Output",
        criteria: [
          "Identify all measurable intake and output sources and use consistent units and collection intervals.",
          "Measure rather than estimate whenever possible and separate emesis, drains, urine, and stool output.",
          "Obtain daily weight with the same scale, time, clothing, and equipment conditions.",
          "Calculate balance, trend findings, and report oliguria, rapid weight change, or fluid-status deterioration."
        ]
      }
    ]
  },
  {
    week: 10,
    topic: "Urinary Renal and Musculoskeletal Care",
    skills: [
      {
        title: "Urinary Catheter Insertion Simulation",
        searchTitle: "Inserting an Indwelling Urinary Catheter",
        criteria: [
          "Verify the indication, order, allergies, catheter selection, consent or explanation, and need for assistance.",
          "Position and drape the client and establish a sterile field without contamination.",
          "Identify anatomy and insert using sterile technique in simulation under instructor supervision.",
          "Secure the catheter, maintain dependent drainage, document, and identify indications for prompt removal."
        ]
      },
      {
        title: "Catheter Care and Urine Specimen",
        searchTitle: "Obtaining a Sterile Urine Specimen From an Indwelling Catheter",
        criteria: [
          "Maintain a closed drainage system, unobstructed flow, securement, hygiene, and bag position.",
          "Identify the sampling port and disinfect it using the approved method.",
          "Obtain the specimen aseptically without collecting from the drainage bag.",
          "Label at the bedside, transport promptly, and document characteristics and collection details."
        ]
      },
      {
        title: "Musculoskeletal Neurovascular Assessment",
        searchTitle: "Performing a Neurovascular Assessment",
        criteria: [
          "Assess pain, pallor, pulse, paresthesia, paralysis or movement, temperature, and capillary refill.",
          "Compare the affected and unaffected extremities and assess around casts, dressings, or devices.",
          "Relate findings to swelling, injury, positioning, traction, and compartment-syndrome risk.",
          "Report a new deficit, escalating pain, tense swelling, or reduced perfusion immediately."
        ]
      },
      {
        title: "Assistive Device Ambulation",
        searchTitle: "Assisting a Client to Ambulate With a Walker",
        criteria: [
          "Assess weight-bearing status, strength, cognition, footwear, device fit, and fall risk.",
          "Adjust and position the walker and explain the prescribed gait sequence.",
          "Guard safely without pulling on the client or device and navigate turns and sitting.",
          "Reassess tolerance, pain, dizziness, alignment, and the environment after ambulation."
        ]
      }
    ]
  },
  {
    week: 11,
    topic: "Skin Integrity and Wound Care",
    skills: [
      {
        title: "Skin and Pressure Injury Assessment",
        searchTitle: "Assessing Skin and Pressure Injuries",
        criteria: [
          "Inspect skin systematically with attention to pressure, moisture, devices, folds, circulation, and sensation.",
          "Describe location, size, tissue, edges, drainage, odor, surrounding skin, pain, and undermining when present.",
          "Use the approved pressure-injury staging terms and avoid staging wounds that do not meet the criteria.",
          "Document objectively and initiate prevention or escalation for new or worsening damage."
        ]
      },
      {
        title: "Sterile Dressing Change",
        searchTitle: "Changing a Sterile Wound Dressing",
        criteria: [
          "Verify the order, wound plan, allergies, pain needs, supplies, and previous assessment.",
          "Remove the old dressing with clean technique and assess drainage and wound appearance.",
          "Establish and maintain a sterile field and cleanse from least contaminated to more contaminated areas.",
          "Apply and secure the ordered dressing, label it, document findings, and report complications."
        ]
      },
      {
        title: "Closed-Suction Drain Care",
        searchTitle: "Emptying and Managing a Closed-Suction Drain",
        criteria: [
          "Assess the insertion site, securement, tubing, suction, output, and client comfort.",
          "Empty the reservoir without contaminating the outlet and restore suction correctly.",
          "Measure and describe output using appropriate infection-control precautions.",
          "Document findings and report sudden output changes, loss of suction, dislodgement, or infection signs."
        ]
      },
      {
        title: "Wound Culture Collection",
        searchTitle: "Obtaining a Wound Culture",
        criteria: [
          "Verify the order and collection method and assess the wound before cleansing.",
          "Cleanse away surface debris using the ordered solution and technique.",
          "Collect the specimen from viable tissue or drainage using aseptic technique without contaminating the swab.",
          "Label at the bedside, transport promptly, and document the site and collection method."
        ]
      }
    ]
  },
  {
    week: 12,
    topic: "Integrated Medical-Surgical Competency",
    skills: [
      {
        title: "Integrated Head-to-Toe Checkoff",
        searchTitle: "Performing a Head-to-Toe Physical Assessment",
        criteria: [
          "Organize equipment, identity, safety, privacy, infection control, and client explanation before beginning.",
          "Complete a logical head-to-toe assessment while adapting to the simulated client's condition.",
          "Identify and prioritize abnormal findings and connect them to appropriate nursing actions.",
          "Give an accurate final report and document the assessment within the assigned time."
        ]
      },
      {
        title: "Integrated Medication and IV Safety Checkoff",
        searchTitle: "Managing a Peripheral Intravenous Infusion",
        criteria: [
          "Reconcile orders, allergies, calculations, medication rights, compatibility, and required parameters.",
          "Prepare and administer the simulated medication or infusion using aseptic and sharps safety.",
          "Assess the IV site, program and verify the pump, and identify a planted safety error.",
          "Document administration and evaluate the simulated client's response."
        ]
      },
      {
        title: "Recognizing Deterioration and Escalation",
        searchTitle: "Responding to a Change in Client Condition",
        criteria: [
          "Recognize concerning changes in airway, breathing, circulation, neurologic status, or vital-sign trends.",
          "Provide immediate within-scope safety actions and call for appropriate assistance.",
          "Prepare a concise SBAR report with relevant assessment, history, interventions, and recommendation.",
          "Reassess continuously and document the event, notifications, orders, and response."
        ]
      },
      {
        title: "Final SBAR and Documentation Checkoff",
        searchTitle: "Communicating Client Information Using SBAR",
        criteria: [
          "Organize complete but concise information from the final integrated scenario.",
          "Separate objective findings from interpretation and include significant trends and risks.",
          "State a specific recommendation, read back critical instructions, and close the communication loop.",
          "Enter a timely, accurate, confidential note without copying proprietary or real patient information."
        ]
      }
    ]
  }
];

const combinedOpeningWeek = {
  week: 1,
  topic: "Asepsis, Infection Control, Safety, Vital Signs, and Pain Assessment",
  skills: [
    ...baselineWeeklySkills[0].skills,
    ...baselineWeeklySkills[1].skills
  ]
};

const urinaryRenalWeek = {
  week: 9,
  topic: "Urinary and Renal Care",
  skills: baselineWeeklySkills[9].skills.slice(0, 2)
};

const musculoskeletalWeek = {
  week: 10,
  topic: "Musculoskeletal Care",
  skills: baselineWeeklySkills[9].skills.slice(2)
};

const perioperativeSafetySkill = {
  title: "Preoperative and Postoperative Safety Checks",
  searchTitle: "Completing Preoperative and Postoperative Safety Checks",
  criteria: [
    "Verify identity, procedure, consent status, allergies, required preparation, and the current orders before transfer or care.",
    "Complete the assigned preoperative checklist and report missing, conflicting, or unsafe information before proceeding.",
    "Perform postoperative airway, breathing, circulation, pain, wound, drain, elimination, mobility, and safety checks in priority order.",
    "Document findings, interventions, notifications, and the client's response, and escalate deterioration immediately."
  ]
};

const skinWoundPerioperativeWeek = {
  ...baselineWeeklySkills[10],
  week: 11,
  topic: "Skin Integrity, Wound, and Perioperative Care",
  skills: [
    ...baselineWeeklySkills[10].skills,
    perioperativeSafetySkill
  ]
};

const weeklySkills = [
  combinedOpeningWeek,
  ...baselineWeeklySkills.slice(2, 9).map((week, index) => ({
    ...week,
    week: index + 2
  })),
  urinaryRenalWeek,
  musculoskeletalWeek,
  skinWoundPerioperativeWeek,
  {
    ...baselineWeeklySkills[11],
    week: 12
  }
];

function skillAssignmentTitle(week, index, skill) {
  return `Week ${week} Skill Check ${index + 1}: ${skill.title}`;
}

function skillAssignmentContent(week, topic, skill) {
  return `PN 107 Lab Student Preparation and Competency Evidence

Week ${week}: ${topic}
Skill: ${skill.title}

Licensed Lippincott preparation
1. Select Open Lippincott Skills below and sign in with your authorized account.
2. Open the BMHI Skills Lab course and Lippincott Skills for Nursing Education 2.0.
3. Search for: ${skill.searchTitle}
4. Review the skill overview, watch the assigned video, and use the licensed checklist and quiz if assigned by the instructor.

BMHI preparation checklist
Before requesting the supervised checkoff, the student should be able to:
${skill.criteria.map((criterion, index) => `${index + 1}. ${criterion}`).join("\n")}
${skill.criteria.length + 1}. Maintain client identity, privacy, infection control, body mechanics, and communication throughout the skill.
${skill.criteria.length + 2}. State when to stop, obtain help, or notify the instructor or supervising nurse.

Student submission
Type a short preparation reflection or attach instructor-approved evidence such as a Lippincott completion screenshot or signed BMHI practice sheet. Do not include a real patient's name, date of birth, record number, image, or other identifying information.

Competency rule
Submitting this item or marking the lesson complete confirms preparation only. It does not establish clinical competency, attendance, authorization to perform the skill independently, or permission to act outside the practical-nursing student scope. Only an instructor may observe the hands-on performance and record Completed or Incomplete in the portal.`;
}

const syllabusSchedule = weeklySkills.map((week) => (
  `Week ${week.week}: ${week.topic}\n${week.skills.map((skill) => `- ${skill.title}`).join("\n")}`
)).join("\n\n");

const checklistLessons = weeklySkills.flatMap((week) => week.skills.map((skill, index) => ({
  title: skillAssignmentTitle(week.week, index, skill),
  content: skillAssignmentContent(week.week, week.topic, skill),
  durationMinutes: 25,
  externalUrl: LIPPINCOTT_GATEWAY,
  itemType: "assignment",
  gradeItemTitle: skillAssignmentTitle(week.week, index, skill),
  published: true
})));

const medicalSurgicalNursingLabCourse = {
  title: "PN 107 Lab: Medical-Surgical Nursing Skills Lab",
  slug: "medical-surgical-nursing-i-pn107-lab",
  category: "Practical Nursing Course",
  hours: 20,
  credentialType: "Course Completion",
  deliveryMode: "20 on-campus skills lab hours with online preparation",
  description: "A 12-week companion shell for the 20 campus lab hours already included in PN 107 Medical-Surgical Nursing I. Students prepare with licensed Lippincott Skills resources, submit preparation evidence, and complete supervised BMHI competency checkoffs. These are not additional Practical Nursing program hours.",
  ghlProductKeys: [],
  seedVersion: "pn107-lab-12-weeks-merge-1-2-and-12-13-2026-11-20",
  syllabusPdf: SYLLABUS_PDF,
  gradeItems: checklistLessons.map((lesson) => ({
    title: lesson.gradeItemTitle,
    pointsPossible: 0
  })),
  modules: [
    {
      title: "Start Here: PN 107 Lab Orientation",
      lessons: [
        {
          title: "PN 107 Lab Course Overview",
          durationMinutes: 20,
          content: "PN 107 Lab: Medical-Surgical Nursing Skills Lab\n\n12 weeks | 20 on-campus lab hours with online preparation\nCompanion course: PN 107 Medical-Surgical Nursing I\nRequired licensed product: Lippincott Skills for Nursing Education 2.0\n\nThis companion shell organizes the supervised laboratory skills already included in PN 107. Students prepare online, practice in the lab, submit approved evidence, and receive instructor checkoffs. Portal completion never replaces hands-on observation or authorizes independent practice."
        },
        {
          title: "Official PN 107 Lab 12-Week Syllabus",
          durationMinutes: 20,
          externalUrl: SYLLABUS_PDF,
          content: `PN 107 Lab 12-Week Syllabus

Course length: 12 weeks
Lab hours: 20 on-campus hours already included in PN 107 Medical-Surgical Nursing I
Required product: Lippincott Skills for Nursing Education 2.0

Course purpose
Students use licensed Lippincott skill overviews, videos, quizzes, and checklists to prepare for supervised BMHI laboratory practice. The instructor observes performance and records competency status. Students must not treat online completion as authorization to perform a skill independently.

Weekly schedule
${syllabusSchedule}

Download the complete syllabus using the resource button on this page.`
        },
        {
          title: "Open Lippincott Skills and Find Assigned Videos",
          durationMinutes: 15,
          externalUrl: LIPPINCOTT_GATEWAY,
          content: "Use the official Lippincott gateway to sign in with your authorized account. From My Content, open the BMHI Skills Lab course and select Lippincott Skills for Nursing Education 2.0. Each portal assignment gives the exact skill title to search. Open the Videos tab and the licensed Checklist for that skill. Course-specific Lippincott URLs are not copied into this portal because they depend on the student's licensed account and the publisher's course configuration."
        },
        {
          title: "Lab Safety and Competency Rules",
          durationMinutes: 20,
          content: "1. Attend the scheduled lab with required uniform, identification, and supplies.\n2. Use two client identifiers, verify allergies, protect privacy, and perform hand hygiene for every simulation.\n3. Practice only under instructor direction and within the practical-nursing student role.\n4. Stop immediately when a safety concern, contamination, unexpected finding, or scope question arises.\n5. Never upload real patient information or images.\n6. Student submission shows preparation only. The instructor must directly observe the skill and record Completed or Incomplete.\n7. Skills may require remediation and repeat demonstration before completion is recorded."
        },
        {
          title: "Faculty Setup and Lippincott Assignment Map",
          durationMinutes: 15,
          instructorOnly: true,
          content: "Confirm the BMHI Skills Lab course and licensed Lippincott Skills for Nursing Education 2.0 assignment set before publishing dates. Verify each search title against the current publisher library, assign the required video/checklist/quiz, schedule 20 campus lab hours, and record competency only after direct observation. Edit a portal resource if the publisher renames or retires a skill. Do not copy licensed checklist text or host publisher video files in the BMHI portal."
        }
      ]
    },
    ...weeklySkills.map((week) => ({
      title: `Week ${week.week}: ${week.topic}`,
      lessons: week.skills.map((skill, index) => ({
        title: skillAssignmentTitle(week.week, index, skill),
        content: skillAssignmentContent(week.week, week.topic, skill),
        durationMinutes: 25,
        externalUrl: LIPPINCOTT_GATEWAY,
        itemType: "assignment",
        gradeItemTitle: skillAssignmentTitle(week.week, index, skill),
        published: true
      }))
    }))
  ]
};

module.exports = {
  LIPPINCOTT_GATEWAY,
  SYLLABUS_PDF,
  medicalSurgicalNursingLabCourse,
  skillAssignmentContent,
  skillAssignmentTitle,
  weeklySkills
};
