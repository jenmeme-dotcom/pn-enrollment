const { fundamentalsCourse } = require("./fundamentalsBuildout");
const { homeHealthAideEnglishCourse, homeHealthAideCreoleCourse } = require("./homeHealthAideBuildout");
const { introNursingCourse } = require("./introNursingBuildout");
const { medicalTerminologyCourse } = require("./medicalTerminologyBuildout");

const courses = [
  {
    title: "Practical Nursing",
    slug: "practical-nursing",
    category: "Diploma Program",
    hours: 1350,
    tuitionCents: 1400000,
    booksSuppliesCents: 100000,
    registrationFeeCents: 15000,
    credentialType: "Diploma",
    deliveryMode: "Campus / blended",
    description: "Practical Nursing diploma program with theory, skills lab, and clinical experience in medical, surgical, obstetric, pediatric, geriatric, long-term care, community, pharmacology, mental health, and transition-to-practice nursing.",
    ghlProductKeys: ["Practical Nursing", "PN", "practical-nursing"]
  },
  homeHealthAideEnglishCourse,
  homeHealthAideCreoleCourse,
  {
    title: "Medical Assistant",
    slug: "medical-assistant",
    category: "Diploma Program",
    hours: 1300,
    tuitionCents: 700000,
    booksSuppliesCents: 42000,
    registrationFeeCents: 15000,
    credentialType: "Diploma",
    deliveryMode: "Campus / blended",
    description: "Medical Assistant diploma program covering health science fundamentals, medical terminology, administrative and clinical duties, medical office procedures, insurance billing, phlebotomy, EKG, lab practice, and clinical practicum.",
    ghlProductKeys: ["Medical Assistant", "MA", "medical-assistant"]
  },
  {
    title: "Patient Care Technician",
    slug: "patient-care-technician",
    category: "Diploma Program",
    hours: 600,
    tuitionCents: 550000,
    booksSuppliesCents: 20000,
    registrationFeeCents: 15000,
    credentialType: "Diploma",
    deliveryMode: "Campus / blended",
    description: "Patient Care Technician diploma program with nursing assistant, CPR/First Aid, phlebotomy, EKG, skills lab, and clinical practice preparation for CNA and CPCT/A credential pathways.",
    ghlProductKeys: ["Patient Care Technician", "PCT", "patient-care-technician"]
  },
  {
    title: "Medical Billing and Coding",
    slug: "medical-billing-and-coding",
    category: "Diploma Program",
    hours: 1110,
    tuitionCents: 850000,
    booksSuppliesCents: 85000,
    registrationFeeCents: 15000,
    credentialType: "Diploma",
    deliveryMode: "Online / blended",
    description: "Medical Billing and Coding diploma program for electronic healthcare records, coding, billing, health information management, compliance, insurance, revenue cycle, and medical office procedures.",
    ghlProductKeys: ["Medical Billing and Coding", "MBC", "medical-billing-and-coding"]
  },
  {
    title: "CNA Exam Prep",
    slug: "cna-exam-prep",
    category: "Exam Prep",
    hours: 40,
    credentialType: "Certificate",
    deliveryMode: "Campus / blended",
    description: "Certified Nursing Assistant exam preparation with skills checklist, practice lessons, and completion certificate.",
    ghlProductKeys: ["CNA Exam Prep", "CNA", "cna-exam-prep"]
  },
  {
    title: "Basic Life Support",
    slug: "basic-life-support",
    category: "Continuing Education",
    hours: 4,
    credentialType: "Certificate",
    deliveryMode: "Campus",
    description: "BLS course shell for roster management, skills verification, completion status, and certificate printing.",
    ghlProductKeys: ["Basic Life Support", "BLS", "basic-life-support"]
  },
  {
    title: "Advanced Cardiovascular Life Support",
    slug: "advanced-cardiovascular-life-support",
    category: "Continuing Education",
    hours: 8,
    credentialType: "Certificate",
    deliveryMode: "Campus",
    description: "ACLS course shell with enrollment, lesson content, competency recordkeeping, and credential issuing.",
    ghlProductKeys: ["Advanced Cardiovascular Life Support", "ACLS", "advanced-cardiovascular-life-support"]
  },
  {
    title: "Pediatric Advanced Life Support",
    slug: "pediatric-advanced-life-support",
    category: "Continuing Education",
    hours: 8,
    credentialType: "Certificate",
    deliveryMode: "Campus",
    description: "PALS course shell with student access, completion tracking, and printable certificate workflow.",
    ghlProductKeys: ["Pediatric Advanced Life Support", "PALS", "pediatric-advanced-life-support"]
  },
  medicalTerminologyCourse,
  fundamentalsCourse,
  introNursingCourse
];

const feeSchedule = [
  { label: "Registration Fee", note: "non-refundable as per the refund policy", amountCents: 15000 },
  { label: "Returned Checks", amountCents: 3500 },
  { label: "Background Check", amountCents: 7500 },
  { label: "Books, Supplies & Uniforms", amountCents: 7500 }
];

const tuitionNotes = [
  "Students must allow two weeks for processing receipts which are requested to be sent by mail or fax.",
  "Types of Payment: Visa, MasterCard, Bank Wire, Check or PayPal.",
  "Tuition is subject to change."
];

const catalogOperatingHours = [
  { label: "Day classes", value: "Monday - Thursday, 9:00 am - 4:30 pm" },
  { label: "Evening classes", value: "Monday - Thursday, 5:00 pm - 9:00 pm" },
  { label: "Administrative offices", value: "Monday - Friday, 8:00 am - 2:00 pm" }
];

const catalogAcademicCalendar = [
  {
    program: "Home Health Aide",
    sessions: [
      "Session 1: 12/13/2024 - 01/10/2025",
      "Session 2: 01/13/2025 - 02/14/2025",
      "Session 3: 02/24/2025 - 03/21/2025",
      "Session 4: 03/31/2025 - 04/25/2025",
      "Session 5: 05/05/2025 - 06/06/2025",
      "Session 6: 06/16/2025 - 07/11/2025",
      "Session 7: 07/21/2025 - 08/22/2025",
      "Session 8: 09/01/2025 - 09/26/2025",
      "Session 9: 10/06/2025 - 11/07/2025",
      "Session 10: 11/17/2025 - 12/19/2025"
    ]
  },
  {
    program: "Practical Nursing",
    sessions: [
      "Session 1: 01/06/2025 - 01/09/2026",
      "Session 2: 06/02/2025 - 06/05/2026"
    ]
  },
  {
    program: "Patient Care Technician",
    sessions: [
      "Session 1: 01/06/2025 - 07/11/2025",
      "Session 2: 07/21/2025 - 01/23/2026",
      "Session 3: 01/26/2026 - 07/31/2026",
      "Session 4: 08/10/2026 - 02/12/2027"
    ]
  },
  {
    program: "Medical Assistant / Medical Billing and Coding",
    sessions: [
      "Session 1: 01/06/2025 - 12/12/2025",
      "Session 2: 06/09/2025 - 05/08/2026",
      "Session 3: 01/05/2026 - 12/04/2026",
      "Session 4: 06/08/2026 - 05/08/2027"
    ]
  }
];

const catalogCredentialRequirements = [
  { program: "Practical Nursing", hours: 1350, credential: "Diploma" },
  { program: "Medical Assistant", hours: 1300, credential: "Diploma" },
  { program: "Medical Billing and Coding", hours: 1110, credential: "Diploma" },
  { program: "Patient Care Technician", hours: 600, credential: "Diploma" },
  { program: "Home Health Aide", hours: 75, credential: "Diploma" }
];

const catalogAdmissions = [
  "Applicants must be 18 years of age and submit valid picture identification; applicants under 18 require a parent or guardian signature.",
  "All programs except Home Health Aide require evidence of a high school diploma, GED, or equivalent, or a Wonderlic score of 20.",
  "Practical Nursing applicants must take the HESI entrance exam with a passing score of 50% or higher.",
  "Before clinical rotations, students must provide current AHA or American Red Cross BLS/CPR certification for healthcare providers and physician certification of good health.",
  "Students must register two weeks before the session start date."
];

const catalogGraduationRequirements = [
  "Complete every required course and meet each course's minimum standards.",
  "Earn an overall CGPA of 3.0 or higher.",
  "Satisfy all financial obligations before diploma issuance.",
  "A clock hour is 60 minutes with at least 50 minutes of instruction in the presence of an instructor."
];

const catalogStudentRecords = [
  "Permanent student educational records are maintained in the administrative office under lock and key.",
  "Students have access to their records indefinitely and may request review during normal business hours.",
  "Written student consent is required before release of records to third parties unless otherwise required by law.",
  "FERPA rights include inspection/review, requests for amendment, restriction of directory information, and complaint rights."
];

const catalogAttendancePolicy = [
  "Students must maintain at least 80% attendance.",
  "Students absent more than five consecutive school days without approved leave may be dismissed.",
  "Students should call the school at least two hours before a scheduled class if they cannot attend.",
  "Three or more unexcused late arrivals may be marked as an absence.",
  "Online attendance requires regular participation and logging in at least three times per week."
];

const catalogProgramSummaries = [
  {
    title: "Home Health Aide",
    hours: 75,
    summary: "Prepares students for home attendant or Home Health Aide work with personal care, infection control, safety, nutrition, charting, and home health service skills."
  },
  {
    title: "Patient Care Technician",
    hours: 600,
    summary: "Includes medical terminology, anatomy and physiology, nurse assisting, phlebotomy, EKG, HIV/AIDS, OSHA, CPR/First Aid, lab practice, and clinical experience."
  },
  {
    title: "Practical Nursing",
    hours: 1350,
    summary: "Includes nursing theory, clinical practice, pharmacology, medical-surgical nursing, maternal newborn, pediatric, mental health, community health, and transition to practice."
  },
  {
    title: "Medical Assistant",
    hours: 1300,
    summary: "Includes administrative and clinical medical office duties, medical terminology, insurance procedures, phlebotomy, EKG, lab practice, and a clinical practicum."
  },
  {
    title: "Medical Billing and Coding",
    hours: 1110,
    summary: "Online program for medical billing, coding, health information, insurance, compliance, medical office accounting, and electronic healthcare billing."
  }
];

module.exports = {
  courses,
  feeSchedule,
  tuitionNotes,
  catalogOperatingHours,
  catalogAcademicCalendar,
  catalogCredentialRequirements,
  catalogAdmissions,
  catalogGraduationRequirements,
  catalogStudentRecords,
  catalogAttendancePolicy,
  catalogProgramSummaries
};
