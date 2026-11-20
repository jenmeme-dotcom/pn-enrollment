const chapterGuides3 = require("./pharmacologyCaseStudyGuides3");

const chapterCaseStudies = [
  ...require("./pharmacologyCaseStudies1"),
  ...require("./pharmacologyCaseStudies2"),
  ...require("./pharmacologyCaseStudies3").map((caseStudy) => ({
    ...caseStudy,
    instructorGuide: chapterGuides3[caseStudy.chapter]
  }))
].sort((left, right) => left.chapter - right.chapter);

function caseStudyAssignmentTitle(caseStudy) {
  return `Chapter ${caseStudy.chapter} Case Study: ${caseStudy.title}`;
}

function instructorGuideTitle(caseStudy) {
  return `Chapter ${caseStudy.chapter} Instructor Answer Guide: ${caseStudy.title}`;
}

function chapterNumber(caseStudy) {
  return String(caseStudy.chapter).padStart(2, "0");
}

function licensedCaseStudyHref(caseStudy) {
  return `/course-materials/introductory-clinical-pharmacology-pn106/PN106-Lippincott-Case-Study-Chapter-${chapterNumber(caseStudy)}.pdf`;
}

function licensedAnswerKeyHref(caseStudy) {
  return `/admin/course-materials/introductory-clinical-pharmacology-pn106/PN106-Lippincott-Answer-Chapter-${chapterNumber(caseStudy)}.docx`;
}

function legacyCaseStudyContent(caseStudy) {
  return `Original BMHI Case Study

Chapter alignment
Ford, Introductory Clinical Pharmacology, 12th edition, Chapter ${caseStudy.chapter}: ${caseStudy.title}. This original BMHI practice scenario is aligned with the assigned Lippincott chapter. It is not copied from publisher case-study text.

Before you begin
Complete the assigned chapter reading and the related Lippincott prequiz and PrepU activities. Use the course text and instructor-approved resources when supporting your response.

Scenario
${caseStudy.scenario}

Student response
1. Identify the priority assessment cues and explain why they matter.
2. Explain the relevant medication or drug-class action, indication, and expected therapeutic response.
3. Identify the contraindications, precautions, interactions, adverse effects, or red flags that apply to this case.
4. Describe the nursing actions and monitoring required now and during follow-up.
5. ${caseStudy.decisionPrompt}
6. ${caseStudy.teachingPrompt}
7. Explain how the nurse will evaluate whether the therapy and teaching were effective.

Submission requirements
Answer every question in complete sentences and identify the chapter concepts used in your reasoning. Submit a typed response, an attached file, or both. Use only fictional information; never include a real patient's name, date of birth, medical-record number, photograph, or other identifying information. Points and the due date will be set by the instructor.`;
}

function legacyInstructorGuideContent(caseStudy) {
  const expectedElements = caseStudy.instructorGuide
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n");
  return `Instructor Answer Guide

Instructor-only material
This guide is restricted to instructors and administrators. It is not visible in the student portal. Do not publish or paste it into a student-facing page before the case has been completed and reviewed.

Case
Chapter ${caseStudy.chapter}: ${caseStudy.title}

Expected response elements
${expectedElements}

Scoring guidance
Accept clinically sound wording that reaches the same safe priorities. Look for assessment before intervention, recognition of urgent red flags, medication-specific reasoning, monitoring, patient teaching, and a measurable evaluation plan. The elements above are a guide rather than the only acceptable response. Use the instructor's approved rubric and points allocation.`;
}

function caseStudyContent(caseStudy) {
  return `Licensed Lippincott Case Study

Exact publisher case study
This is the exact Lippincott case-study document authorized for use in PN 106, Chapter ${caseStudy.chapter}: ${caseStudy.title}. The case wording has not been rewritten or replaced with a BMHI-authored scenario.

Open or download the case study
${licensedCaseStudyHref(caseStudy)}

Complete the assignment
Read the case and answer every question in the licensed document. Submit a typed response, an attached file, or both using the assignment form on this page. Use the course text and instructor-approved resources when supporting your answers.

Student privacy
Use only the fictional information in the case. Never add a real patient's name, date of birth, medical-record number, photograph, or other identifying information. Points and the due date will be set by the instructor.`;
}

function instructorGuideContent(caseStudy) {
  return `Licensed Lippincott Instructor Answer Key

Instructor-only material
This exact publisher answer document is restricted to instructors and administrators. It is not visible in the student portal and cannot be downloaded there. Do not publish or paste it into a student-facing page before the case has been completed and reviewed.

Case
Chapter ${caseStudy.chapter}: ${caseStudy.title}

Open or download the answer key
${licensedAnswerKeyHref(caseStudy)}

Use the instructor's approved rubric and points allocation when grading the student's submitted response.`;
}

module.exports = {
  chapterCaseStudies,
  caseStudyAssignmentTitle,
  caseStudyContent,
  instructorGuideContent,
  instructorGuideTitle,
  legacyCaseStudyContent,
  legacyInstructorGuideContent,
  licensedAnswerKeyHref,
  licensedCaseStudyHref
};
