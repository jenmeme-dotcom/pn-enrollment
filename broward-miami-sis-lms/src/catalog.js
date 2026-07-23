const { aclsCourse } = require("./aclsBuildout");
const { certifiedMedicationAideCourse } = require("./certifiedMedicationAideBuildout");
const { fundamentalsCourse } = require("./fundamentalsBuildout");
const { homeHealthAideEnglishCourse, homeHealthAideCreoleCourse } = require("./homeHealthAideBuildout");
const { introNursingCourse } = require("./introNursingBuildout");
const { longTermCareNursingCourse } = require("./longTermCareNursingBuildout");
const { medicalAssistantCourse } = require("./medicalAssistantBuildout");
const { medicalBillingCodingCourse } = require("./medicalBillingCodingBuildout");
const { medicalTerminologyCourse } = require("./medicalTerminologyBuildout");
const { patientCareTechnicianCourse } = require("./patientCareTechnicianBuildout");

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
    deliveryMode: "Online / Zoom",
    description: "Practical Nursing diploma program with theory, skills lab, and clinical experience in medical, surgical, obstetric, pediatric, geriatric, long-term care, community, pharmacology, mental health, and transition-to-practice nursing.",
    ghlProductKeys: ["Practical Nursing", "PN", "practical-nursing"]
  },
  homeHealthAideEnglishCourse,
  homeHealthAideCreoleCourse,
  certifiedMedicationAideCourse,
  medicalAssistantCourse,
  patientCareTechnicianCourse,
  medicalBillingCodingCourse,
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
  aclsCourse,
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
  {
    title: "Anatomy and Physiology",
    slug: "anatomy-and-physiology",
    category: "Practical Nursing Course",
    hours: 90,
    credentialType: "Course",
    deliveryMode: "Campus / blended",
    seedVersion: "2026-07-12-student-quiz-set",
    description: "PN 104 Anatomy and Physiology course shell for Practical Nursing students with modules, faculty materials, assignments, discussions, and gradebook support.",
    ghlProductKeys: ["Anatomy and Physiology", "PN 104", "PN104", "anatomy-and-physiology"],
    modules: [
      {
        title: "PN104 Student Quizzes and Assessments",
        lessons: [
          {
            title: "Quiz 1: Anatomy and Physiology Foundations",
            content: "Complete Quiz 1 in Canvas. This quiz checks foundational anatomy and physiology vocabulary, levels of organization, cells, tissues, and homeostasis. Review your module notes before starting.",
            durationMinutes: 30
          },
          {
            title: "Quiz 2: Integumentary and Skeletal Systems",
            content: "Complete Quiz 2 in Canvas. This quiz covers the integumentary system, bone tissue, skeletal system structures, and related clinical vocabulary. Students should complete the assigned Chapter 5 and Chapter 6 review before opening the quiz.",
            durationMinutes: 30
          },
          {
            title: "Quiz 3: Muscular and Nervous Systems",
            content: "Complete Quiz 3 in Canvas. This quiz covers muscular system organization, muscle function, nervous system structures, basic neurophysiology, and related practical nursing applications.",
            durationMinutes: 30
          },
          {
            title: "Quiz 4: Body Systems Integration",
            content: "Complete Quiz 4 in Canvas. This quiz checks cardiovascular, respiratory, digestive, urinary, reproductive, endocrine, and lymphatic system concepts with emphasis on how body systems work together.",
            durationMinutes: 30
          }
        ]
      },
      {
        title: "PN104 Faculty Instructor Resources",
        lessons: [
          {
            title: "PN104_Ch05_Integumentary_System_FACULTY_with_instructor_script_notes.pptx",
            content: "Faculty-only PowerPoint resource for Chapter 5. This item is intentionally unpublished and hidden from students until the instructor decides otherwise.",
            durationMinutes: 0,
            published: false,
            instructorOnly: true
          },
          {
            title: "PN104_Ch06_Bone_Tissue_and_Skeletal_System_FACULTY_with_instructor_script_notes.pptx",
            content: "Faculty-only PowerPoint resource for Chapter 6. This item is intentionally unpublished and hidden from students until the instructor decides otherwise.",
            durationMinutes: 0,
            published: false,
            instructorOnly: true
          }
        ]
      }
    ],
    gradeItems: [
      { title: "Quiz 1: Anatomy and Physiology Foundations", pointsPossible: 50, dueDate: "2026-07-27" },
      { title: "Quiz 2: Integumentary and Skeletal Systems", pointsPossible: 50, dueDate: "2026-08-10" },
      { title: "Quiz 3: Muscular and Nervous Systems", pointsPossible: 50, dueDate: "2026-08-31" },
      { title: "Quiz 4: Body Systems Integration", pointsPossible: 50, dueDate: "2026-09-21" }
    ]
  },
  introNursingCourse,
  longTermCareNursingCourse
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
