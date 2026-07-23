const courseDescription =
  "The Medical Assistant diploma program provides 1300 clock hours of training in health science fundamentals, medical terminology, legal and ethical responsibilities, medical office procedures, administrative and clinical duties, safety, emergency preparedness, records management, informatics, insurance billing, patient examination preparation, HIV/AIDS, blood borne pathogens, OSHA, phlebotomy, EKG, laboratory practice, and clinical externship. The catalog identifies 319 lab hours and a 230-hour clinical externship, and graduates are eligible to sit for the Certified Clinical Medical Assistant (CCMA) examination with the National Healthcareer Association.";

const courseObjectives = [
  "Prepare for entry-level work as a Medical Assistant in professional clinics, medical offices, hospitals, and outpatient facilities.",
  "Apply administrative, clinical, communication, legal, ethical, and safety procedures in a healthcare office setting.",
  "Demonstrate medical assisting skills through supervised laboratory practice and clinical externship.",
  "Use medical terminology, records management, informatics, insurance, billing, phlebotomy, EKG, pharmacology, and patient-care procedures within the Medical Assistant scope.",
  "Meet catalog progress requirements at 325, 650, and 1300 clock hours and prepare for CCMA certification eligibility."
];

const catalogCourses = [
  {
    number: "HIV 110",
    title: "HIV/AIDS, Blood Borne Pathogens and OSHA",
    hours: 5,
    description:
      "Students review HIV/AIDS theory, prevention, treatment, blood borne pathogens, and OSHA compliance in a healthcare setting. A completion certificate is awarded at the end of the course.",
    prerequisites: "None"
  },
  {
    number: "CPR 120",
    title: "CPR and First Aid",
    hours: 6,
    labHours: 6,
    passFail: true,
    description:
      "Students complete CPR and First Aid training. Completers receive CPR and First Aid cards. This course is graded on a Pass/Fail basis.",
    prerequisites: "None"
  },
  {
    number: "MED 100",
    title: "The Medical Assistant",
    hours: 100,
    description:
      "Students learn about the history of medicine, law and ethics, patient care, administration of medication, and administrative duties.",
    prerequisites: "None"
  },
  {
    number: "MED 110",
    title: "Vital Signs",
    hours: 20,
    labHours: 15,
    description:
      "Students learn how to take and record vital signs, including blood pressure, respiratory rate, and heart rate.",
    prerequisites: "MED 100"
  },
  {
    number: "MED 120",
    title: "Nervous System",
    hours: 10,
    description:
      "Students learn the anatomy of the nervous system, sense organs, and common medical conditions related to the nervous system.",
    prerequisites: "MED 100 and MED 110"
  },
  {
    number: "MED 130",
    title: "Respiratory System",
    hours: 10,
    description:
      "Students learn respiratory anatomy, respiratory organs, and common medical conditions related to the respiratory system.",
    prerequisites: "MED 100, MED 110, and MED 120"
  },
  {
    number: "MED 140",
    title: "Circulatory System",
    hours: 10,
    description:
      "Students learn circulatory anatomy, blood-oxygen transport, circulatory development, and common medical conditions related to the circulatory system.",
    prerequisites: "HIV 110, MED 100, MED 110, MED 120, and MED 130"
  },
  {
    number: "MED 150",
    title: "Muscular System",
    hours: 10,
    description:
      "Students learn the anatomy and functions of the muscular system and common medical conditions related to the muscular system.",
    prerequisites: "MED 100, MED 110, MED 120, MED 130, and MED 140"
  },
  {
    number: "MED 160",
    title: "Skeletal System",
    hours: 15,
    description:
      "Students learn skeletal anatomy, divisions and functions, bones and joints, radiography, and common medical conditions related to the skeletal system.",
    prerequisites: "MED 100, MED 110, MED 120, MED 130, MED 140, and MED 150"
  },
  {
    number: "MED 170",
    title: "Reproductive System",
    hours: 10,
    description:
      "Students learn anatomy of the female and male reproductive systems, sexually transmitted diseases, and common medical conditions related to the reproductive system.",
    prerequisites: "MED 100, MED 110, MED 120, MED 130, MED 140, MED 150, and MED 160"
  },
  {
    number: "MED 180",
    title: "Digestive System",
    hours: 10,
    description:
      "Students learn digestive anatomy, the digestive process, vitamins and minerals, and common medical conditions related to the digestive system.",
    prerequisites: "MED 100, MED 110, MED 120, MED 130, MED 140, MED 150, MED 160, and MED 170"
  },
  {
    number: "MED 190",
    title: "Urinary System",
    hours: 15,
    labHours: 8,
    description:
      "Students learn urinary anatomy and functions, urine formation, water-salt balance, and common medical conditions related to the urinary system.",
    prerequisites: "MED 100 through MED 180"
  },
  {
    number: "MED 200",
    title: "Medical Fields",
    hours: 30,
    description:
      "Students learn about medical fields as they relate to the duties of the medical assistant.",
    prerequisites: "MED 100 through MED 190"
  },
  {
    number: "MED 210",
    title: "Medical Law and Ethics",
    hours: 30,
    description:
      "Students study the basic legal relationship of physician and patient, including implied and informed consent, professional liability, invasion of privacy, breach of contract, and the Medical Practice Act.",
    prerequisites: "MED 200"
  },
  {
    number: "MED 220",
    title: "Administrative Skills",
    hours: 40,
    labHours: 15,
    description:
      "Students learn administrative work in physician offices, medical clinics, and healthcare facilities, including telephone technique, reception duties, appointments, manual and electronic medical records, communication, charting, and patient education.",
    prerequisites: "MED 100, MED 200, and MED 210"
  },
  {
    number: "MED 230",
    title: "Medical Skills",
    hours: 120,
    labHours: 100,
    description:
      "Students receive hands-on experience for medical assistant skills and procedures. Laboratory practice builds the required proficiency for the profession.",
    prerequisites: "MED 100 through MED 190"
  },
  {
    number: "MED 240",
    title: "Patient Skills",
    hours: 120,
    labHours: 50,
    description:
      "Students receive hands-on experience for patient skills and procedures that are part of the medical assistant role. Laboratory practice builds required patient-skill proficiency.",
    prerequisites: "MED 100 through MED 190"
  },
  {
    number: "MED 250",
    title: "Payment and Insurance Procedures",
    hours: 80,
    labHours: 20,
    description:
      "Students learn medical insurance reimbursement, types of policies and coverage, plan categories, healthcare acronyms, coding systems, deductibles, coinsurance, and form completion.",
    prerequisites: "MED 210 and MED 220"
  },
  {
    number: "MED 260",
    title: "Computerized Medical Office Procedures",
    hours: 29,
    labHours: 10,
    description:
      "Students study medical assistant career qualifications, receptionist responsibilities, appointment systems, telephone procedure, record management, patient records, billing, banking, payroll records, office management, reports, insurance, and coding.",
    prerequisites: "MED 100, MED 200, MED 210, and MED 250"
  },
  {
    number: "MED 270",
    title: "Clinical Office Procedures",
    hours: 30,
    labHours: 10,
    description:
      "Students learn patient preparation, draping, taking and recording information, assisting the physician with examinations, and caring for the examination room.",
    prerequisites: "MED 100 through MED 190"
  },
  {
    number: "MED 280",
    title: "Pharmacology for Medical Assisting",
    hours: 90,
    labHours: 10,
    description:
      "Students identify basic drugs, uses, effects on the body, modes of administration, injection areas and techniques, and drug administration math.",
    prerequisites: "MED 100"
  },
  {
    number: "MED 290",
    title: "Hazardous Materials Safety",
    hours: 15,
    labHours: 5,
    description:
      "Students learn hazardous material types, personal protective equipment, and blood borne pathogen identification.",
    prerequisites: "HIV 110, CPR 120, and MED 280"
  },
  {
    number: "MED 300",
    title: "Medical Terminology",
    hours: 35,
    description:
      "Students practice spelling, building words with prefixes, suffixes, roots, and combining forms, and defining and recognizing words used in healthcare.",
    prerequisites: "None"
  },
  {
    number: "PHL 300",
    title: "Phlebotomy",
    hours: 150,
    labHours: 50,
    description:
      "Students learn phlebotomy theory and practice, venipuncture and skin puncture techniques, circulatory anatomy and physiology, tube types, blood tests, interfering substances, risk factors, efficient work practices, blood specimens, donor room techniques, labeling, specimen transport and logging, CDC guidelines, and infection control.",
    prerequisites: "HIV 110 and CPR 120"
  },
  {
    number: "EKG 310",
    title: "Electrocardiography",
    hours: 80,
    labHours: 20,
    description:
      "Students learn the purpose of EKG, equipment maintenance, materials, patient preparation, EKG taking and mounting procedures, EKG records, and monitoring records for abnormal or erratic tracings.",
    prerequisites: "HIV 110 and CPR 120"
  },
  {
    number: "MED 310",
    title: "Medical and Clinical Assistant Practicum",
    hours: 230,
    clinicalHours: 230,
    description:
      "Students complete a clinical externship experience. Under direct supervision of a registered nurse, students perform competencies learned during the program.",
    prerequisites: "All courses above"
  }
];

function hourSummary(course) {
  const pieces = [`${course.hours} clock hours`];
  if (course.labHours) pieces.push(`${course.labHours} lab hours`);
  if (course.clinicalHours) pieces.push(`${course.clinicalHours} clinical hours`);
  return pieces.join(", ");
}

function courseModule(course) {
  return {
    title: `${course.number} - ${course.title} (${hourSummary(course)})`,
    lessons: [
      {
        title: `${course.number} Catalog Overview`,
        durationMinutes: Math.max(30, Math.min(90, course.hours)),
        content: [
          `${course.number} ${course.title}`,
          "",
          `Catalog hours: ${hourSummary(course)}.`,
          `Prerequisites: ${course.prerequisites}.`,
          "",
          course.description
        ].join("\n")
      },
      {
        title: `${course.number} Learning Activities and Competency Check`,
        durationMinutes: course.labHours || course.clinicalHours ? 75 : 45,
        content: [
          "Instructor-led learning, assigned reading, guided practice, and assessment are aligned to the catalog description for this course block.",
          course.labHours ? `Lab practice requirement: ${course.labHours} hours with instructor verification of skills and documentation.` : "Lab practice requirement: not listed separately in the catalog for this course block.",
          course.clinicalHours ? `Clinical externship requirement: ${course.clinicalHours} hours with supervised performance of program competencies.` : "",
          course.passFail ? "Grading note: this course is graded Pass/Fail." : "Students must meet course minimum standards and maintain satisfactory academic progress."
        ].filter(Boolean).join("\n\n")
      }
    ]
  };
}

const gradeItems = [
  { title: "Medical Assistant Orientation and Catalog Acknowledgment", pointsPossible: 0 },
  ...catalogCourses.map((course) => ({
    title: `${course.number} ${course.title} ${course.passFail ? "Pass/Fail Verification" : "Competency Assessment"}`,
    pointsPossible: course.passFail ? 0 : 100
  })),
  { title: "SAP Evaluation 1 - 325 Clock Hours", pointsPossible: 0 },
  { title: "SAP Evaluation 2 - 650 Clock Hours", pointsPossible: 0 },
  { title: "SAP Evaluation 3 - 1300 Clock Hours", pointsPossible: 0 },
  { title: "CCMA Certification Readiness Review", pointsPossible: 100 }
];

const modules = [
  {
    title: "Orientation, Program Requirements, and CCMA Pathway",
    lessons: [
      {
        title: "Medical Assistant Program Overview",
        durationMinutes: 45,
        content: [
          courseDescription,
          "",
          "Credential awarded: Diploma.",
          "Total program length: 1300 clock hours.",
          "Catalog lab practice: 319 hours.",
          "Catalog clinical externship: 230 hours.",
          "Certification pathway: graduates are eligible to sit for the National Healthcareer Association Certified Clinical Medical Assistant (CCMA) examination."
        ].join("\n")
      },
      {
        title: "Program Objectives and Satisfactory Academic Progress",
        durationMinutes: 45,
        content: [
          "Program objectives:",
          ...courseObjectives.map((objective) => `- ${objective}`),
          "",
          "Catalog SAP evaluation points:",
          "- 325 clock hours",
          "- 650 clock hours",
          "- 1300 clock hours",
          "",
          "Students must maintain a cumulative grade point average of 3.0 or higher, complete required coursework, and satisfy financial obligations before diploma issuance."
        ].join("\n")
      }
    ]
  },
  ...catalogCourses.map(courseModule),
  {
    title: "Program Completion and Credential Readiness",
    lessons: [
      {
        title: "Final Program Audit",
        durationMinutes: 45,
        content:
          "Students complete a final audit of clock hours, lab records, clinical externship documentation, course grades, SAP status, financial clearance, and diploma requirements."
      },
      {
        title: "CCMA Examination Readiness",
        durationMinutes: 60,
        content:
          "Students review medical assisting administrative and clinical competencies, phlebotomy, EKG, patient care, safety, infection control, pharmacology, and exam-day readiness for the NHA CCMA certification pathway."
      }
    ]
  }
];

const medicalAssistantCourse = {
  title: "Medical Assistant",
  slug: "medical-assistant",
  category: "Diploma Program",
  hours: 1300,
  tuitionCents: 700000,
  booksSuppliesCents: 42000,
  registrationFeeCents: 15000,
  credentialType: "Diploma",
  deliveryMode: "Campus / blended",
  description: courseDescription,
  ghlProductKeys: ["Medical Assistant", "MA", "CCMA", "medical-assistant"],
  courseNumber: "MA 1300",
  seedVersion: "catalog-medical-assistant-2025-2026-v1",
  objectives: courseObjectives,
  catalogCourses,
  modules,
  gradeItems
};

module.exports = { medicalAssistantCourse, medicalAssistantCatalogCourses: catalogCourses };
