const programDescription =
  "The Patient Care Technician diploma program provides 600 clock hours of training in medical terminology, anatomy and physiology, nurse assisting, HIV/AIDS, blood borne pathogens, OSHA, CPR and First Aid, phlebotomy, electrocardiography, patient care theory and skills labs, clinical practice, and career preparation.";

const programObjectives = [
  "Perform entry-level technical and personal care skills for patients in nursing homes, hospitals, healthcare facilities, and medical facilities.",
  "Apply anatomy, physiology, medical terminology, nurse assisting, safety, infection control, and documentation concepts to patient care.",
  "Demonstrate competency in nursing assistant, phlebotomy, electrocardiography, and patient care technician skills through lab and clinical practice.",
  "Prepare for the Certified Nursing Assistant (CNA) state examination and the Certified Patient Care Technician/Assistant (CPCT/A) examination pathway."
];

const catalogCourses = [
  {
    code: "PCT 100",
    title: "Anatomy, Physiology and Medical Terminology",
    hours: 60,
    lectureHours: 60,
    labHours: 0,
    clinicalHours: 0,
    prerequisites: "None",
    description:
      "Introduction to anatomy, physiology, and medical terminology with emphasis on body systems, related pathologies and diseases, medical word structure, diagnostic procedures, laboratory tests, abbreviations, drugs, and treatment modalities."
  },
  {
    code: "PCT 110",
    title: "Nursing Assistant I",
    hours: 85,
    lectureHours: 85,
    labHours: 0,
    clinicalHours: 0,
    prerequisites: "None",
    description:
      "Theory instruction for nurse assisting, including healthcare systems and occupations, legal and ethical responsibilities, resident rights, vital signs, anatomy and physiology, safety, patient plans of care, charts and forms, personal care, nutrition, family interactions, cultural diversity, geriatric care, death and dying, assistive devices, impaired patients, restorative care, psychological care, and hospital functions."
  },
  {
    code: "HIV 120",
    title: "HIV/AIDS, Blood Borne Pathogens and OSHA",
    hours: 6,
    lectureHours: 6,
    labHours: 0,
    clinicalHours: 0,
    prerequisites: "None",
    description:
      "Theory of HIV/AIDS, prevention, treatment, blood borne pathogens, and OSHA compliance in the healthcare setting. Completion of hours certificate is awarded at the end of the course."
  },
  {
    code: "PCT 130",
    title: "Nursing Assistant II",
    hours: 40,
    lectureHours: 0,
    labHours: 40,
    clinicalHours: 0,
    prerequisites: "PCT 110",
    description:
      "Hands-on practice for nurse assistant concepts including bathing, dressing, hygiene, catheter care, peri-care, bed making, TED hose, admission and discharge, patient transfer, wheelchairs, ambulation, prosthetics, and personal care skills practice."
  },
  {
    code: "CPR 140",
    title: "CPR and First Aid",
    hours: 6,
    lectureHours: 0,
    labHours: 6,
    clinicalHours: 0,
    prerequisites: "None",
    description:
      "CPR and First Aid course. Completers receive CPR and First Aid cards. This course is graded on a pass/fail basis."
  },
  {
    code: "PCT 150",
    title: "Clinical Practicum",
    hours: 40,
    lectureHours: 0,
    labHours: 0,
    clinicalHours: 40,
    prerequisites: "PCT 100, PCT 110, PCT 130, HIV 120, CPR 140",
    description:
      "Supervised clinical experience including required long-term care clinical instruction at a nursing home or long-term care facility. Under direct supervision by a registered nurse, students perform competencies learned during the program. This course is graded on a pass/fail basis."
  },
  {
    code: "PCT 160",
    title: "Introduction to Phlebotomy Theory, Skills, and Lab",
    hours: 85,
    lectureHours: 40,
    labHours: 20,
    clinicalHours: 25,
    prerequisites: "HIV 120, CPR 140",
    description:
      "Theory and practice needed for phlebotomy, including venipuncture and skin puncture techniques, circulatory anatomy and physiology, tubes, blood tests, interfering substances, risk factors, efficient work practices, specimens, donor room techniques, labeling, transport, logging-in specimens, CDC guidelines, and infection control techniques."
  },
  {
    code: "PCT 170",
    title: "Introduction to Electrocardiography Theory, Skills, and Lab",
    hours: 80,
    lectureHours: 35,
    labHours: 20,
    clinicalHours: 25,
    prerequisites: "HIV 120, CPR 140",
    description:
      "Electrocardiography theory and skills, including the nature and purpose of the electrocardiograph, equipment maintenance, required materials, patient preparation, EKG taking and mounting procedures, EKG records, and monitoring records for abnormal or erratic tracings."
  },
  {
    code: "PCT 180",
    title: "Patient Care Technician Theory and Skills Lab I",
    hours: 85,
    lectureHours: 40,
    labHours: 15,
    clinicalHours: 30,
    prerequisites: "PCT 100, PCT 110, PCT 130, PCT 150, PCT 160, PCT 170, HIV 120, CPR 140",
    description:
      "Foundation theory and clinical skills practice for the Patient Care Technician role, including pharmacology, compliance guidelines, equipment and supplies, stretcher transfer, hot and cold applications, binders, skin and skeletal traction, reinforcing dressings, physical examination assistance, oxygen therapy, unsterile dressing changes, apical pulse, apical-radial pulse deficit, pedal pulse, cast and pin care, artificial eye/contact lens care, and pulse oximetry."
  },
  {
    code: "PCT 190",
    title: "Patient Care Technician Theory and Skills Lab II",
    hours: 85,
    lectureHours: 40,
    labHours: 15,
    clinicalHours: 30,
    prerequisites: "PCT 100, PCT 110, PCT 130, PCT 150, PCT 160, PCT 170, PCT 180",
    description:
      "Continued Patient Care Technician instruction covering pre-operative and post-operative care, patients with common health problems, organizational and time management skills, chain of command, conflict coping techniques, employability skills, and competency skills practice."
  },
  {
    code: "PCT 200",
    title: "Preparation for the Patient Care Technician Career",
    hours: 28,
    lectureHours: 28,
    labHours: 0,
    clinicalHours: 0,
    prerequisites: "PCT 100, PCT 110, PCT 130, PCT 150, PCT 160, PCT 170, PCT 180, PCT 190",
    description:
      "Career development course for resume preparation, professional image, job search skills, interview techniques, and an individual plan for seeking a first Patient Care Technician position."
  }
];

const totals = catalogCourses.reduce(
  (sum, course) => ({
    hours: sum.hours + course.hours,
    lectureHours: sum.lectureHours + course.lectureHours,
    labHours: sum.labHours + course.labHours,
    clinicalHours: sum.clinicalHours + course.clinicalHours
  }),
  { hours: 0, lectureHours: 0, labHours: 0, clinicalHours: 0 }
);

function courseSummary(course) {
  return [
    `${course.code}: ${course.title}`,
    `Clock hours: ${course.hours}`,
    `Lecture hours: ${course.lectureHours}`,
    `Lab hours: ${course.labHours}`,
    `Clinical hours: ${course.clinicalHours}`,
    `Prerequisites: ${course.prerequisites}`,
    "",
    course.description
  ].join("\n");
}

const modules = [
  {
    title: "Orientation and Program Requirements",
    lessons: [
      {
        title: "Program Overview and Credential Pathways",
        durationMinutes: 45,
        content: `${programDescription}\n\nTotal program hours: ${totals.hours}\nLecture hours: ${totals.lectureHours}\nLab hours: ${totals.labHours}\nClinical hours: ${totals.clinicalHours}\n\nGraduates are prepared for Patient Care Technician roles and credential pathways including CNA and CPCT/A.`
      },
      {
        title: "Catalog Course Sequence and Hour Breakdown",
        durationMinutes: 45,
        content: catalogCourses
          .map((course) => `${course.code} - ${course.title}: ${course.hours} clock hours (${course.lectureHours} lecture, ${course.labHours} lab, ${course.clinicalHours} clinical)`)
          .concat([`TOTAL: ${totals.hours} clock hours (${totals.lectureHours} lecture, ${totals.labHours} lab, ${totals.clinicalHours} clinical)`])
          .join("\n")
      },
      {
        title: "Attendance, Lab, Clinical, and Completion Expectations",
        durationMinutes: 45,
        content:
          "Students must satisfy classroom, laboratory, clinical, skills competency, attendance, conduct, documentation, and financial requirements before program completion. Lab and clinical practice require professional behavior, infection control, safety procedures, proper documentation, and instructor or clinical supervisor verification."
      }
    ]
  },
  ...catalogCourses.map((course) => ({
    title: `${course.code} - ${course.title} (${course.hours} hours)`,
    lessons: [
      {
        title: "Catalog Description and Outcomes",
        durationMinutes: Math.max(30, Math.round((course.lectureHours || course.hours) * 60)),
        content: courseSummary(course)
      },
      {
        title: "Learning Activities and Competency Checks",
        durationMinutes: Math.max(30, Math.round((course.labHours + course.clinicalHours || 1) * 60)),
        content: [
          `Students complete activities aligned to ${course.code} and demonstrate required knowledge, skills, documentation, and professionalism.`,
          course.labHours ? `Lab practice hours: ${course.labHours}.` : "No separate lab hours are listed for this course.",
          course.clinicalHours ? `Clinical practice hours: ${course.clinicalHours}.` : "No separate clinical hours are listed for this course.",
          "Instructor verification is required for all applicable skills, pass/fail competencies, and remediation items."
        ].join("\n\n")
      }
    ]
  })),
  {
    title: "Final Completion and Credential Readiness",
    lessons: [
      {
        title: "CNA and CPCT/A Readiness Review",
        durationMinutes: 60,
        content:
          "Students review nursing assistant, phlebotomy, EKG, patient care technician, infection control, safety, documentation, and professional readiness expectations before credential examination preparation."
      },
      {
        title: "Program Completion Checklist",
        durationMinutes: 45,
        content:
          "Completion checklist: required clock hours, lab competencies, clinical documentation, CPR/First Aid, HIV/AIDS and OSHA content, gradebook completion, attendance review, financial clearance, and registrar approval for diploma issuance."
      }
    ]
  }
];

const gradeItems = [
  { title: "Program Orientation Acknowledgment", pointsPossible: 0 },
  ...catalogCourses.map((course) => ({
    title: `${course.code} Competency Check`,
    pointsPossible: ["CPR 140", "PCT 150"].includes(course.code) ? 0 : 100
  })),
  { title: "Final Skills Competency Review", pointsPossible: 100 },
  { title: "Credential Readiness Checklist", pointsPossible: 0 }
];

const patientCareTechnicianCourse = {
  title: "Patient Care Technician",
  slug: "patient-care-technician",
  category: "Diploma Program",
  hours: totals.hours,
  tuitionCents: 550000,
  booksSuppliesCents: 20000,
  registrationFeeCents: 15000,
  credentialType: "Diploma",
  deliveryMode: "Campus / blended",
  description:
    "Patient Care Technician diploma program with anatomy and physiology, medical terminology, nursing assistant, HIV/AIDS, OSHA, CPR/First Aid, phlebotomy, EKG, patient care skills lab, clinical practice, and career preparation aligned to the 600-hour catalog outline.",
  ghlProductKeys: ["Patient Care Technician", "PCT", "patient-care-technician"],
  courseNumber: "PCT",
  credits: 0,
  seedVersion: "catalog-pct-600-hour-buildout-2026-07-10",
  objectives: programObjectives,
  catalogCourses,
  totals,
  modules,
  gradeItems
};

module.exports = { patientCareTechnicianCourse };
