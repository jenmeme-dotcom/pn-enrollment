const { fundamentalsCourse } = require("./fundamentalsBuildout");
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
    description: "A diploma track for practical nursing students with clinical, theory, skills lab, assessments, and credential completion tracking.",
    ghlProductKeys: ["Practical Nursing", "PN", "practical-nursing"]
  },
  {
    title: "Home Health Aide",
    slug: "home-health-aide",
    category: "Certificate Program",
    hours: 75,
    tuitionCents: 45000,
    booksSuppliesCents: 7500,
    registrationFeeCents: 15000,
    credentialType: "Certificate",
    deliveryMode: "Campus / blended",
    description: "Home health aide training with lesson progression, attendance, competency records, and printable certificate support.",
    ghlProductKeys: ["Home Health Aide", "HHA", "home-health-aide"]
  },
  {
    title: "Medical Assistant",
    slug: "medical-assistant",
    category: "Diploma Program",
    hours: 900,
    tuitionCents: 700000,
    booksSuppliesCents: 42000,
    registrationFeeCents: 15000,
    credentialType: "Diploma",
    deliveryMode: "Campus / blended",
    description: "Medical Assistant diploma program with modules for clinical skills, administrative procedures, externship, and graduation readiness.",
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
    description: "Patient Care Technician diploma track with competency, attendance, gradebook, and credential issue workflows.",
    ghlProductKeys: ["Patient Care Technician", "PCT", "patient-care-technician"]
  },
  {
    title: "Medical Billing and Coding",
    slug: "medical-billing-and-coding",
    category: "Diploma Program",
    hours: 600,
    tuitionCents: 850000,
    booksSuppliesCents: 85000,
    registrationFeeCents: 15000,
    credentialType: "Diploma",
    deliveryMode: "Online / blended",
    description: "Medical billing and coding program for revenue cycle, coding systems, claim workflows, and assessment tracking.",
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

module.exports = { courses, feeSchedule, tuitionNotes };
