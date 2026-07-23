const minimumQuizQuestions = 15;

const legalQuestions = [
  ["Which documentation entry is most appropriate?", ["Patient appears difficult and rude.", "Patient states, \"My pain is 7 out of 10.\"", "Patient probably did not take the medication.", "Patient had a bad day."], 1],
  ["When should a nurse document patient care?", ["As soon as possible after providing the care.", "Only at the end of the shift.", "Whenever another nurse requests it.", "Only if the patient's condition changes."], 0],
  ["What is the best response to an error in a paper medical record?", ["Erase it completely.", "Cover it with correction fluid.", "Follow facility policy, draw a single line through it, and initial the correction.", "Remove the page from the record."], 2],
  ["Which action best protects patient confidentiality?", ["Discussing care in a public elevator.", "Sharing a password with a classmate.", "Accessing only records needed to provide assigned care.", "Posting a de-identified clinical story on personal social media."], 2],
  ["A student receives a social-media friend request from a current patient. What is the best action?", ["Accept it but do not discuss health information.", "Decline it and maintain professional boundaries.", "Accept it after clinical ends.", "Ask another student what to do publicly."], 1],
  ["Which element is necessary for informed consent?", ["The patient receives understandable information and decides voluntarily.", "A family member always signs for the patient.", "The nurse chooses the treatment for the patient.", "Consent is assumed whenever the patient enters a facility."], 0],
  ["Which action is an example of battery?", ["Threatening to give an injection.", "Performing a procedure after a competent patient refuses it.", "Reporting suspected abuse.", "Explaining the risks of a procedure."], 1],
  ["Which action is an example of assault?", ["Threatening an unwanted procedure in a way that creates fear.", "Accidentally spilling water.", "Documenting a late entry correctly.", "Calling the provider about a change in condition."], 0],
  ["What should the nurse do first after discovering a patient-care error?", ["Hide the error to protect coworkers.", "Assess the patient and take immediate safety actions.", "Change the medical record.", "Wait until the next shift to report it."], 1],
  ["Which statement about an incident report is correct?", ["It replaces documentation in the medical record.", "It is used to improve safety and follow facility reporting policy.", "It is given to the patient as the discharge summary.", "It is used to assign public blame."], 1],
  ["A nurse is asked to perform a task outside the legal scope of practice. What is the best response?", ["Perform it if the unit is busy.", "Refuse safely and notify the appropriate supervisor.", "Ask a family member to assist.", "Perform it once and learn afterward."], 1],
  ["Which organization primarily regulates nursing practice within a state?", ["The state board of nursing.", "The hospital gift shop.", "A private social-media group.", "The local newspaper."], 0],
  ["Which action demonstrates accountability?", ["Blaming another person for a missed observation.", "Reporting a mistake promptly and participating in corrective action.", "Changing a time entry to avoid questions.", "Leaving documentation for the next shift."], 1],
  ["What information should be included in a late entry?", ["The current date and time and a clear identification that it is a late entry.", "A false time that makes the entry appear current.", "Only the nurse's opinion.", "No signature or initials."], 0],
  ["Which action follows the minimum-necessary privacy principle?", ["Opening every chart on the unit.", "Sharing the entire record with a curious coworker.", "Using only the information needed for the assigned task.", "Printing a record to read at home."], 2]
];

const foundationalQuestions = [
  ["Which action best demonstrates patient advocacy?", ["Speaking up when a patient's expressed concern has not been addressed.", "Making decisions without the patient.", "Withholding information to save time.", "Ignoring a request that is inconvenient."], 0],
  ["What is the practical nurse's priority when a patient's condition changes?", ["Wait for the next scheduled assessment.", "Observe, protect the patient, and report promptly through the chain of command.", "Post the concern in a group chat.", "Ask the family to diagnose the problem."], 1],
  ["Which communication method supports a safe handoff?", ["A structured, concise report with current findings and concerns.", "Unverified assumptions.", "A message without patient identifiers or context.", "Waiting until after leaving the facility."], 0],
  ["Which response demonstrates therapeutic communication?", ["Tell me more about what is worrying you.", "You should not feel that way.", "Everything will be fine.", "Why did you make that choice?"], 0],
  ["Which action supports patient-centered care?", ["Including the patient's goals and preferences in planning care.", "Using the same plan for every patient.", "Avoiding questions about beliefs and preferences.", "Giving instructions without checking understanding."], 0],
  ["What is the best way to confirm that patient teaching was understood?", ["Ask, Do you understand?", "Use teach-back and ask the patient to explain or demonstrate the instructions.", "Provide more medical terminology.", "Ask a visitor to sign the instructions."], 1],
  ["Which action reflects cultural humility?", ["Ask respectful questions and avoid assumptions about the patient.", "Treat cultural preferences as unimportant.", "Expect every person from a group to have identical beliefs.", "Avoid using qualified interpreters."], 0],
  ["Which task is appropriate to delegate?", ["A task allowed by policy to a competent team member, with clear directions and follow-up.", "Initial assessment of an unstable patient.", "Any task the nurse does not want to complete.", "A task outside the delegatee's role."], 0],
  ["What is the first step of the nursing process?", ["Assessment.", "Implementation.", "Evaluation.", "Planning."], 0],
  ["Which finding should be reported promptly?", ["A sudden change in level of consciousness.", "A patient choosing a different television channel.", "An empty visitor chair.", "A meal tray arriving on time."], 0],
  ["Which action is part of standard precautions?", ["Performing hand hygiene before and after patient contact.", "Reusing single-use gloves.", "Recapping every used needle.", "Skipping personal protective equipment when hurried."], 0],
  ["Which behavior best demonstrates professionalism?", ["Arriving prepared, maintaining boundaries, and accepting feedback.", "Discussing patients in public areas.", "Ignoring school and facility policies.", "Posting complaints about clinical experiences online."], 0],
  ["What is the purpose of the chain of command?", ["To communicate unresolved safety concerns to the appropriate level.", "To avoid documenting concerns.", "To replace emergency response procedures.", "To allow students to change facility policy."], 0],
  ["Which response best protects a patient's dignity?", ["Provide privacy and explain care before beginning.", "Discuss personal details where others can hear.", "Expose the patient longer than necessary.", "Use a nickname without asking the patient."], 0],
  ["Which nursing action supports quality improvement?", ["Reporting hazards and participating in efforts to prevent recurrence.", "Hiding near misses.", "Ignoring patterns in patient outcomes.", "Changing records after an event."], 0]
];

function toQuestion([prompt, options, answer]) {
  return { prompt, options, answer };
}

function ensureIntroNursingQuizQuestionMinimum(content = "", title = "", minimum = minimumQuizQuestions) {
  const source = String(content || "");
  const match = source.match(/QUIZ_DATA_BASE64:([A-Za-z0-9+/=]+)/);
  if (!match) return source;
  let questions;
  try {
    questions = JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
  } catch {
    return source;
  }
  if (!Array.isArray(questions)) return source;
  const valid = questions.filter((question) => question && typeof question.prompt === "string" && Array.isArray(question.options) && Number.isInteger(question.answer));
  const context = `${title} ${valid.map((question) => question.prompt).join(" ")}`.toLowerCase();
  const isLegal = /legal|ethical|ethic|hipaa|privacy|confidential|document|negligen|consent|scope|incident/.test(context);
  const candidates = (isLegal ? [...legalQuestions, ...foundationalQuestions] : [...foundationalQuestions, ...legalQuestions]).map(toQuestion);
  const prompts = new Set(valid.map((question) => question.prompt.trim().toLowerCase()));
  for (const candidate of candidates) {
    if (valid.length >= minimum) break;
    const key = candidate.prompt.trim().toLowerCase();
    if (!prompts.has(key)) {
      valid.push(candidate);
      prompts.add(key);
    }
  }
  if (valid.length < minimum || valid.length === questions.length) return source;
  const encoded = Buffer.from(JSON.stringify(valid), "utf8").toString("base64");
  return source.replace(match[0], `QUIZ_DATA_BASE64:${encoded}`);
}

module.exports = { ensureIntroNursingQuizQuestionMinimum, minimumQuizQuestions };
