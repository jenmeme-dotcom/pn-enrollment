function q(prompt, options, answer) {
  return { prompt, options, answer };
}

const quizBanks = {
  introChapter1: [
    q("Which contribution is most associated with Florence Nightingale?", ["Using sanitation, observation, and data to improve care.", "Inventing antibiotics.", "Creating the first nurse practice act.", "Developing electronic records."], 0),
    q("The central purpose of nursing is to:", ["Support health, safety, comfort, recovery, and dignified care.", "Replace every other health profession.", "Focus only on illness treatment.", "Make decisions without the patient."], 0),
    q("A practical nurse practices:", ["Within the nurse practice act, employer policy, and assigned role.", "Without supervision in every setting.", "Only according to personal preference.", "Outside scope when the unit is busy."], 0),
    q("Which action reflects patient advocacy?", ["Reporting an unresolved safety concern through the proper chain.", "Ignoring a patient's question.", "Sharing private information.", "Choosing care without patient input."], 0),
    q("Modern nursing education emphasizes:", ["Knowledge, clinical judgment, skills, ethics, and safety.", "Memorization without practice.", "Tradition instead of evidence.", "Independent diagnosis outside scope."], 0),
    q("Clara Barton is closely associated with:", ["Humanitarian disaster care and the American Red Cross.", "The first electronic chart.", "Anesthesia discovery.", "Hospital billing reform."], 0),
    q("Lillian Wald helped advance:", ["Public health nursing and community-based care.", "Operating-room anesthesia.", "Radiology nursing.", "Pharmacy licensing."], 0),
    q("Mary Eliza Mahoney is recognized as:", ["The first professionally trained Black nurse in the United States.", "The founder of the Red Cross.", "The first hospital administrator.", "The inventor of sterile gloves."], 0),
    q("Evidence-informed nursing care combines best evidence with:", ["Clinical expertise and patient preferences.", "Habit alone.", "Social-media advice.", "The nurse's preference only."], 0),
    q("Which behavior demonstrates professionalism?", ["Arriving prepared and accepting accountability.", "Discussing patients in public.", "Ignoring feedback.", "Performing unfamiliar tasks without help."], 0),
    q("Health promotion includes:", ["Teaching actions that help people maintain or improve health.", "Treating disease only.", "Avoiding preventive care.", "Withholding understandable information."], 0),
    q("Patient-centered care requires the nurse to:", ["Respect the patient's values, needs, and choices.", "Use one plan for everyone.", "Exclude family at all times.", "Prioritize staff convenience."], 0),
    q("Which setting may employ practical nurses?", ["Hospitals, long-term care, clinics, and home health within applicable rules.", "Only operating rooms.", "Only schools.", "No community settings."], 0),
    q("Lifelong learning is important because:", ["Evidence, technology, and standards of care continue to change.", "Licensure ends the need to learn.", "Policies never change.", "Experience makes safety checks unnecessary."], 0),
    q("The best response when a student is unsure how to perform a skill is to:", ["Stop and seek guidance before proceeding.", "Guess and continue.", "Ask the patient to direct the skill.", "Document it as completed."], 0)
  ],
  introChapter2: [
    q("A nurse practice act primarily defines:", ["The legal scope and regulation of nursing practice.", "Hospital meal choices.", "Insurance premiums.", "Visitor hours."], 0),
    q("Negligence occurs when a nurse:", ["Fails to act as a reasonably prudent nurse would and harm results.", "Asks for help.", "Documents an assessment.", "Follows an order safely."], 0),
    q("Patient autonomy means respecting the patient's right to:", ["Make informed decisions about care.", "Receive every requested treatment.", "Direct care of other patients.", "Ignore facility safety rules."], 0),
    q("Beneficence means:", ["Acting to promote good.", "Avoiding all communication.", "Treating people unfairly.", "Keeping errors secret."], 0),
    q("Nonmaleficence means:", ["Avoiding or minimizing harm.", "Always agreeing with coworkers.", "Sharing information publicly.", "Completing care quickly."], 0),
    q("Justice in nursing refers to:", ["Fair and equitable treatment.", "Punishing patients.", "Keeping promises only.", "Avoiding documentation."], 0),
    q("Informed consent requires:", ["Adequate information, capacity, and a voluntary decision.", "A signature obtained through pressure.", "The nurse to perform the provider's explanation.", "No opportunity for questions."], 0),
    q("A competent adult refuses treatment. The nurse should:", ["Respect the refusal, assess understanding, notify appropriately, and document.", "Force the treatment.", "Ask family to sign instead.", "Hide the refusal."], 0),
    q("Which action protects confidentiality?", ["Discussing patient information only with authorized people involved in care.", "Posting a deidentified story with recognizable details.", "Leaving charts open in public.", "Discussing care in an elevator."], 0),
    q("An incident report is used to:", ["Support safety review and follow-up according to policy.", "Replace the medical record.", "Assign public blame.", "Punish the patient."], 0),
    q("The nurse suspects abuse of a vulnerable adult. The nurse should:", ["Follow mandatory-reporting law and policy promptly.", "Investigate alone for several weeks.", "Promise absolute secrecy.", "Wait for another injury."], 0),
    q("Professional boundaries protect:", ["The therapeutic relationship and the patient's welfare.", "The nurse's social popularity.", "Personal business arrangements.", "Online friendships with patients."], 0),
    q("Fidelity means:", ["Keeping commitments and being faithful to professional duties.", "Doing no harm.", "Fair distribution.", "Telling the truth."], 0),
    q("Veracity means:", ["Truthfulness.", "Privacy.", "Independence.", "Fairness."], 0),
    q("When an order appears unsafe, the nurse should:", ["Clarify it and use the chain of command if needed.", "Carry it out without question.", "Alter it independently.", "Ask another patient."], 0)
  ],
  introChapter3: [
    q("Good nursing documentation is:", ["Timely, factual, objective, accurate, and complete.", "Based on assumptions.", "Entered at the end of the month.", "Used only after an error."], 0),
    q("Which entry is objective?", ["Incision edges approximated; no drainage noted.", "Patient seems difficult.", "Patient had a good day.", "Patient is probably exaggerating."], 0),
    q("A late entry should be:", ["Labeled and completed according to policy with the actual event time.", "Backdated.", "Inserted under another nurse's name.", "Omitted."], 0),
    q("If a paper-chart error is made, the nurse should generally:", ["Correct it according to policy without obscuring the original entry.", "Erase it completely.", "Use correction fluid.", "Remove the page."], 0),
    q("The electronic health record password should be:", ["Kept private and never shared.", "Posted near the computer.", "Shared during busy shifts.", "Used by the entire unit."], 0),
    q("Which abbreviation practice is safest?", ["Use only organization-approved abbreviations.", "Invent abbreviations to save time.", "Use texting shortcuts.", "Abbreviate all medication names."], 0),
    q("Documentation after medication administration should include:", ["The medication record entry and relevant response or follow-up.", "Only the room number.", "An opinion about adherence.", "No time."], 0),
    q("A change in patient condition should be:", ["Assessed, reported promptly, and documented.", "Saved for shift change regardless of severity.", "Discussed only with classmates.", "Deleted from the record."], 0),
    q("Which statement about charting is correct?", ["Chart only care you provided or directly observed.", "Chart planned care before giving it.", "Copy another nurse's assessment.", "Change a coworker's entry."], 0),
    q("ISBAR supports:", ["Organized communication of patient information.", "Medication storage.", "Billing only.", "Visitor screening."], 0),
    q("The patient record is:", ["A legal and confidential document.", "A personal notebook.", "Public information.", "Optional for routine care."], 0),
    q("When quoting a patient, the nurse should:", ["Use the patient's exact words and quotation marks.", "Rewrite the statement as an assumption.", "Use judgmental language.", "Omit concerning statements."], 0),
    q("Which entry best documents pain?", ["Patient reports sharp right-knee pain rated 7/10.", "Patient complains too much.", "Pain seems fake.", "Patient is uncomfortable."], 0),
    q("Accessing a neighbor's record out of curiosity is:", ["A privacy violation.", "Acceptable for students.", "Allowed if no changes are made.", "Required for learning."], 0),
    q("Documentation should occur:", ["As soon as possible after care according to policy.", "Before care is provided.", "Only at discharge.", "Whenever another nurse remembers."], 0)
  ],
  introChapter4: [
    q("Therapeutic communication begins with:", ["Listening attentively and showing respect.", "Giving immediate advice.", "Changing the subject.", "Asking several questions at once."], 0),
    q("Which is an open-ended question?", ["Tell me what concerns you most today.", "Does it hurt, yes or no?", "You are ready, aren't you?", "Is the pain sharp?"], 0),
    q("A patient begins to cry. The best response is:", ["Remain present and allow the patient time to express feelings.", "Tell the patient not to cry.", "Leave immediately.", "Change to a cheerful topic."], 0),
    q("Which response demonstrates clarification?", ["When you say dizzy, what does that feel like to you?", "I know exactly what you mean.", "Why did you do that?", "Everything will be fine."], 0),
    q("Nonverbal communication includes:", ["Facial expression, posture, eye contact, and tone.", "Written orders only.", "Lab values only.", "Medication labels."], 0),
    q("A patient has limited English proficiency. The nurse should use:", ["A qualified medical interpreter according to policy.", "A young child relative.", "Gestures only for consent.", "An online translation without approval."], 0),
    q("SBAR stands for:", ["Situation, Background, Assessment, Recommendation.", "Safety, Billing, Action, Record.", "Subject, Behavior, Advice, Response.", "Symptoms, Bed, Admission, Referral."], 0),
    q("Closed-loop communication requires the receiver to:", ["Repeat back or confirm the message.", "Remain silent.", "Change the instruction.", "Wait until later."], 0),
    q("Which response is nontherapeutic?", ["At least it is not worse.", "Tell me more about that.", "What have you tried so far?", "I can stay with you."], 0),
    q("Personal space and eye contact should be:", ["Adapted respectfully to the patient's preferences and culture.", "Identical for every patient.", "Used to force compliance.", "Ignored during assessment."], 0),
    q("When a patient is angry, the nurse should first:", ["Remain calm, listen, and assess the concern and safety.", "Argue with the patient.", "Match the patient's volume.", "Make promises the nurse cannot keep."], 0),
    q("A communication barrier is reduced by:", ["Using plain language and checking understanding.", "Using medical jargon.", "Speaking rapidly.", "Giving many instructions at once."], 0),
    q("Which statement shows empathy?", ["This has been difficult for you.", "I know exactly how you feel.", "You should be grateful.", "Do not worry."], 0),
    q("Teach-back asks the patient to:", ["Explain the information in their own words.", "Sign without questions.", "Repeat yes or no.", "Memorize medical terms."], 0),
    q("During handoff, the nurse should communicate:", ["Relevant, accurate, current patient information and safety needs.", "Personal opinions about the patient.", "Unrelated staff gossip.", "Only the room number."], 0)
  ],
  introChapter5: [
    q("The first step of the nursing process is:", ["Assessment.", "Implementation.", "Evaluation.", "Planning."], 0),
    q("Subjective data are:", ["Information reported by the patient.", "Measured vital signs.", "Observed drainage.", "Laboratory results."], 0),
    q("Objective data are:", ["Observable or measurable findings.", "The patient's feelings only.", "Family opinions only.", "Unverified assumptions."], 0),
    q("After collecting abnormal assessment data, the nurse should:", ["Validate findings and report or act according to urgency and scope.", "Ignore them.", "Create a medical diagnosis.", "Wait until discharge."], 0),
    q("A patient-centered goal should be:", ["Specific, measurable, realistic, and time limited.", "Vague and staff focused.", "Impossible to evaluate.", "Unrelated to the problem."], 0),
    q("Implementation means:", ["Carrying out planned nursing interventions.", "Collecting only admission data.", "Writing a medical diagnosis.", "Ending the care plan."], 0),
    q("Evaluation determines whether:", ["Expected outcomes were met and the plan needs revision.", "The patient likes the room.", "Documentation can stop.", "Assessment is unnecessary."], 0),
    q("Which patient should be assessed first?", ["A patient with new difficulty breathing.", "A patient requesting a blanket.", "A stable patient awaiting discharge papers.", "A patient asking about lunch."], 0),
    q("Clinical judgment requires the nurse to:", ["Notice cues, interpret information, respond, and evaluate outcomes.", "Follow routines without assessment.", "Guess based on one finding.", "Avoid asking questions."], 0),
    q("A practical nurse contributes to the care plan by:", ["Collecting data, implementing assigned care, reporting responses, and documenting.", "Independently prescribing treatment.", "Ignoring changes.", "Diagnosing disease."], 0),
    q("Which is a priority framework?", ["Airway, breathing, circulation.", "Alphabetical room order.", "Staff preference.", "First request received."], 0),
    q("Critical thinking includes:", ["Questioning assumptions and using evidence and patient data.", "Accepting every statement without checking.", "Acting before assessment.", "Avoiding reflection."], 0),
    q("A nursing intervention should be based on:", ["The patient's assessed needs, goals, orders, evidence, and scope.", "Convenience only.", "Another patient's plan.", "A social-media post."], 0),
    q("Reassessment is essential after an intervention to:", ["Determine the patient's response.", "Avoid documentation.", "Replace the initial assessment.", "Delay reporting."], 0),
    q("When priorities change because the patient's condition worsens, the nurse should:", ["Reassess and revise actions with the care team.", "Continue the old routine only.", "Wait for the next week.", "Delete earlier documentation."], 0)
  ],
  introChapter6: [
    q("Cultural humility requires the nurse to:", ["Remain curious, self-aware, respectful, and willing to learn from the patient.", "Memorize stereotypes.", "Assume all members of a group are alike.", "Avoid discussing preferences."], 0),
    q("The best way to learn a patient's cultural preferences is to:", ["Ask the patient respectfully.", "Assume based on appearance.", "Ask another patient.", "Use a checklist without conversation."], 0),
    q("When beliefs affect a treatment plan, the nurse should:", ["Explore the patient's concerns and collaborate on safe options.", "Dismiss the beliefs.", "Threaten the patient.", "Hide information."], 0),
    q("A qualified interpreter is preferred because the interpreter:", ["Supports accurate, confidential communication.", "Makes decisions for the patient.", "Replaces informed consent.", "Is always a family member."], 0),
    q("Which question is culturally respectful?", ["Are there practices or beliefs you want us to consider in your care?", "Why do people like you do that?", "You do not believe that, do you?", "Can we ignore your customs?"], 0),
    q("Implicit bias can affect care by:", ["Influencing decisions without conscious awareness.", "Guaranteeing fairness.", "Replacing assessment.", "Improving communication automatically."], 0),
    q("Health equity means:", ["Working so everyone has a fair opportunity to attain health.", "Giving identical care regardless of need.", "Limiting access by language.", "Avoiding social needs."], 0),
    q("A social determinant of health is:", ["Housing, transportation, education, or food access.", "Eye color only.", "Room decoration.", "The nurse's schedule."], 0),
    q("A patient avoids eye contact. The nurse should:", ["Assess its meaning for that individual rather than assume disrespect.", "Demand eye contact.", "End the interview.", "Document noncompliance."], 0),
    q("Religious dietary needs should be:", ["Assessed and accommodated when safely possible.", "Ignored.", "Treated as preferences that never matter.", "Changed without discussion."], 0),
    q("Family participation in decisions should be based on:", ["The patient's wishes, capacity, and applicable law.", "The nurse's preference.", "A stereotype about the culture.", "The loudest family member."], 0),
    q("Which action supports language access?", ["Provide translated materials and interpreter services when available and appropriate.", "Use jargon.", "Ask the patient to sign unread forms.", "Speak louder in English."], 0),
    q("Culturally responsive pain assessment means:", ["Use a valid scale and accept the patient's report while exploring expression preferences.", "Assume some groups feel less pain.", "Rely only on facial expression.", "Withhold treatment based on beliefs."], 0),
    q("The nurse recognizes a personal bias. The best next step is to:", ["Reflect, seek learning, and prevent the bias from affecting care.", "Deny it.", "Avoid patients from that group.", "Share it with the patient."], 0),
    q("Individualized care means:", ["Plan with the person rather than relying on group assumptions.", "Use the same plan for everyone.", "Avoid patient questions.", "Prioritize tradition over safety."], 0)
  ],
  introChapters7to9: [
    q("Which action is most effective for preventing transmission of microorganisms?", ["Perform hand hygiene at the indicated moments.", "Wear the same gloves between patients.", "Recap used needles.", "Rely on antibiotics instead of precautions."], 0),
    q("Standard precautions should be used for:", ["Only patients with a diagnosed infection.", "Every patient regardless of diagnosis.", "Only surgical patients.", "Only patients in isolation rooms."], 1),
    q("Which link in the chain of infection is interrupted by covering a cough?", ["Reservoir.", "Portal of exit.", "Susceptible host.", "Incubation period."], 1),
    q("When removing contaminated gloves, the nurse should:", ["Touch the bare wrist with the contaminated glove.", "Avoid touching the outside of the gloves with bare skin.", "Wash and reuse disposable gloves.", "Remove the mask first and then handle the gloves."], 1),
    q("Which principle protects the nurse's back during a transfer?", ["Keep the load away from the body.", "Twist at the waist while lifting.", "Use a wide base of support and bend the knees.", "Lift alone whenever possible."], 2),
    q("Before transferring a patient from bed to chair, the nurse should first:", ["Lock the bed and chair wheels.", "Raise the bed to its highest position.", "Place the chair across the room.", "Ask the patient to pull on the nurse's neck."], 0),
    q("Range-of-motion exercises are used primarily to:", ["Increase infection risk.", "Maintain joint mobility and help prevent contractures.", "Replace all ambulation.", "Eliminate the need for repositioning."], 1),
    q("A patient becomes dizzy while ambulating. What is the priority action?", ["Continue walking quickly.", "Support the patient and lower them safely to a stable surface.", "Leave to find help.", "Ask the patient to stand still without support."], 1),
    q("Which position helps reduce pressure on the sacrum for a bedbound patient?", ["Frequent repositioning according to the care plan.", "Leaving the patient supine all shift.", "Using a donut device without an order.", "Keeping linens wrinkled."], 0),
    q("During a bath, the nurse should assess the skin for:", ["Color, temperature, moisture, and areas of breakdown.", "Only tattoos.", "Only hair distribution.", "No findings because bathing is not assessment time."], 0),
    q("Which action best protects dignity during personal hygiene?", ["Expose the entire body for efficiency.", "Provide privacy and uncover only the area being washed.", "Discuss the patient's care in the hallway.", "Complete care without explanation."], 1),
    q("Oral care for an unconscious patient is safest when the patient is:", ["Flat on the back with a large amount of fluid.", "Side-lying with suction available as appropriate.", "Standing at the sink.", "Given mouthwash to swallow."], 1),
    q("Which bed linen condition increases skin-injury risk?", ["Clean, dry, wrinkle-free linen.", "Wrinkled, damp linen under the patient.", "A draw sheet used for repositioning.", "A light blanket chosen by the patient."], 1),
    q("A patient who can wash part of the body independently should be encouraged to:", ["Do as much self-care as safely possible.", "Remain passive during all care.", "Skip hygiene to conserve energy.", "Use equipment without instruction."], 0),
    q("After providing perineal care, the nurse should:", ["Document relevant observations and report abnormal findings.", "Avoid documenting skin changes.", "Place wet linens under the patient.", "Reuse the same washcloth on the face."], 0)
  ],
  introChapters10to13: [
    q("Which action best reduces fall risk for a patient who needs assistance?", ["Keep the call light within reach and respond promptly.", "Raise all four side rails for every patient.", "Leave clutter beside the bed.", "Encourage walking without prescribed assistance."], 0),
    q("Before a procedure, patient identification should use:", ["The room number only.", "At least two approved identifiers.", "Recognition of the patient's face only.", "A family member's confirmation only."], 1),
    q("In a fire emergency, the first RACE action is to:", ["Rescue anyone in immediate danger.", "Activate the extinguisher.", "Close every window in the building.", "Evacuate personal belongings."], 0),
    q("The safest response to a near miss is to:", ["Hide it because no injury occurred.", "Report it according to policy so the system can improve.", "Change the record.", "Discuss it on social media."], 1),
    q("On admission, the nurse's priority is to:", ["Orient the patient, verify information, and assess immediate needs.", "Delay assessment until discharge.", "Store valuables without documentation.", "Assume the medication list is accurate."], 0),
    q("A safe transfer report includes:", ["Current condition, recent changes, treatments, and safety needs.", "Only the patient's name.", "Unverified opinions.", "No medication information."], 0),
    q("Discharge planning should begin:", ["Only after the patient leaves.", "Early and continue throughout the stay.", "Only when transportation arrives.", "Only if the patient requests written instructions."], 1),
    q("Which discharge action best evaluates understanding?", ["Use teach-back and ask the patient to explain the plan.", "Ask only, 'Do you understand?'", "Provide unexplained abbreviations.", "Skip questions to save time."], 0),
    q("An adult oral temperature of 103°F should be:", ["Ignored if the patient is sleeping.", "Rechecked as appropriate and reported promptly with other findings.", "Documented at the end of the week.", "Treated without an order or protocol."], 1),
    q("When counting respirations, the nurse should assess:", ["Rate, rhythm, depth, and effort.", "Rate only.", "Blood pressure only.", "Temperature and weight only."], 0),
    q("Which finding may make a pulse-oximetry reading unreliable?", ["Poor peripheral perfusion or excessive movement.", "A calm, warm hand.", "Correct probe placement.", "A stable waveform."], 0),
    q("The correct blood-pressure cuff size is important because a cuff that is too small may:", ["Produce a falsely high reading.", "Always produce zero.", "Measure temperature instead.", "Prevent pulse assessment."], 0),
    q("Which technique is used during physical assessment to listen to body sounds?", ["Inspection.", "Palpation.", "Percussion.", "Auscultation."], 3),
    q("A health history is best obtained by:", ["Using open-ended questions and clarifying the patient's responses.", "Interrupting every response.", "Relying only on assumptions.", "Avoiding medication and allergy questions."], 0),
    q("A sudden unilateral weakness found during assessment requires the nurse to:", ["Report and initiate urgent response according to policy.", "Wait until the next shift.", "Document only if it persists for a week.", "Ask the patient to walk alone."], 0)
  ],
  longTermChapters14to17: [
    q("Which finding most strongly suggests respiratory distress?", ["New use of accessory muscles and difficulty speaking.", "Regular unlabored respirations.", "Warm hands.", "A stable appetite."], 0),
    q("Oxygen safety requires the nurse to:", ["Keep oxygen away from flames and smoking materials.", "Use petroleum jelly near oxygen equipment.", "Adjust flow without an order or protocol.", "Cover the concentrator vents."], 0),
    q("A resident using oxygen becomes newly confused. The nurse should first:", ["Assess breathing and oxygenation and report the change promptly.", "Assume it is normal aging.", "Wait until the next day.", "Remove oxygen permanently."], 0),
    q("To reduce aspiration risk during tube feeding, the resident should generally be:", ["Positioned with the head elevated as ordered.", "Flat on the back.", "Placed prone without assessment.", "Encouraged to drink through a straw during feeding."], 0),
    q("Which urine finding should be reported?", ["New blood, foul odor with symptoms, or marked decrease in output.", "Pale yellow urine after hydration.", "A labeled specimen.", "Output recorded promptly."], 0),
    q("An ostomy should normally appear:", ["Moist and pink to red.", "Dry and black.", "Pale blue.", "Covered with thick powder at all times."], 0),
    q("During a choking emergency in a conscious adult who cannot speak or cough, the nurse should:", ["Activate emergency response and provide approved choking care.", "Offer water.", "Leave the resident alone.", "Wait for routine rounds."], 0),
    q("Which finding is consistent with shock?", ["Cool clammy skin, rapid pulse, and altered mentation.", "Stable vital signs and warm dry skin.", "Improved urine output.", "Normal capillary refill."], 0),
    q("The priority for severe external bleeding is to:", ["Apply direct pressure and activate emergency assistance.", "Remove all clots repeatedly.", "Delay intervention until documentation is complete.", "Give food and fluids."], 0),
    q("Before medication administration, the nurse must compare the medication with:", ["The current medication order and approved administration record.", "A roommate's medication list.", "An old discharge summary only.", "The medication color only."], 0),
    q("Which is one of the medication-administration rights?", ["Right patient.", "Right roommate.", "Right convenience.", "Right social-media post."], 0),
    q("A dosage calculation produces an unusually large dose. The nurse should:", ["Hold the medication and verify the order and calculation.", "Administer it quickly.", "Ask the resident to choose the dose.", "Round it upward without checking."], 0),
    q("A resident refuses a medication. The nurse should:", ["Assess the reason, provide appropriate information, notify as required, and document.", "Hide it in food without authorization.", "Threaten the resident.", "Record it as administered."], 0),
    q("After administering an opioid, the priority monitoring includes:", ["Respiratory rate, sedation, pain response, and safety.", "Hair color only.", "Room temperature only.", "No reassessment."], 0),
    q("A medication error is discovered. The nurse's first priority is to:", ["Assess the resident and take immediate safety actions.", "Alter the medication record.", "Hide the error.", "Wait until the end of the month."], 0)
  ],
  longTermChapters18to21: [
    q("Which finding may indicate dehydration in an older resident?", ["Dry mucous membranes, concentrated urine, and new confusion.", "Clear speech and stable intake.", "Moist mucosa and normal output.", "Improved skin integrity."], 0),
    q("Accurate intake and output includes:", ["All measured fluids taken in and eliminated according to policy.", "Water only.", "Urine only.", "Estimates documented as exact measurements."], 0),
    q("Which finding may indicate fluid overload?", ["New edema, crackles, and shortness of breath.", "Dry lips only.", "Weight loss after exercise.", "Clear lungs and no edema."], 0),
    q("An IV site is cool, swollen, and painful. The nurse should suspect:", ["Infiltration.", "Normal infusion.", "Improved circulation.", "Hyperglycemia."], 0),
    q("During a blood transfusion, fever and chills require the nurse to:", ["Stop the transfusion and follow the reaction protocol.", "Increase the rate.", "Ignore symptoms.", "Discard documentation."], 0),
    q("Which intervention helps prevent aspiration during meals?", ["Position upright and follow swallowing precautions.", "Feed rapidly while supine.", "Use thin liquids despite an order for thickened liquids.", "Skip oral assessment."], 0),
    q("A therapeutic diet should be:", ["Provided according to the prescribed plan while respecting preferences when possible.", "Changed by any staff member.", "Ignored on weekends.", "Shared between residents."], 0),
    q("Which nutrient is especially important for tissue repair?", ["Protein.", "Alcohol.", "Artificial coloring.", "Caffeine only."], 0),
    q("Before giving a tube feeding, the nurse should:", ["Verify the order, tube status, positioning, and facility procedure.", "Place the resident flat.", "Add medications without checking compatibility.", "Skip identification."], 0),
    q("A resident reports using an herbal supplement. The best response is to:", ["Document it and assess for interactions with the care team.", "Dismiss the information.", "Promise it has no risks.", "Tell the resident to double the dose."], 0),
    q("Cultural humility in complementary therapy means:", ["Ask respectfully about preferences while discussing safety and evidence.", "Ridicule the resident's beliefs.", "Assume all traditions are identical.", "Avoid reporting possible interactions."], 0),
    q("Pain assessment should include:", ["Location, intensity, quality, timing, and factors that improve or worsen it.", "Only the nurse's observation.", "Only blood pressure.", "No resident report."], 0),
    q("The most reliable indicator of pain is generally:", ["The resident's self-report when able to communicate.", "The nurse's personal opinion.", "A family member's guess only.", "Absence of crying."], 0),
    q("After a pain intervention, the nurse should:", ["Reassess pain and function within the appropriate timeframe.", "Assume it worked.", "Avoid documentation.", "Wait until discharge."], 0),
    q("Which action supports sleep in long-term care?", ["Reduce avoidable noise and cluster care when appropriate.", "Wake the resident for unnecessary tasks.", "Offer caffeine at bedtime.", "Keep bright lights on all night."], 0)
  ],
  longTermChapters22to25: [
    q("Which factor can delay wound healing?", ["Poor nutrition and impaired circulation.", "Adequate protein intake.", "Pressure relief.", "Controlled blood glucose."], 0),
    q("Which wound finding requires prompt reporting?", ["Increasing redness, warmth, purulent drainage, or separation.", "Approximated edges without drainage.", "Expected mild tenderness immediately after surgery.", "A clean intact dressing."], 0),
    q("Wound documentation should include:", ["Location, measurements, tissue, drainage, odor, surrounding skin, and pain.", "Only 'looks bad.'", "The nurse's blame statement.", "No measurements."], 0),
    q("A drain should be managed by:", ["Following the order and policy, maintaining patency, and measuring output.", "Pulling it out when full.", "Placing it above the wound without direction.", "Ignoring sudden output changes."], 0),
    q("Before collecting a specimen, the nurse should first:", ["Verify the order, patient identity, specimen type, and collection instructions.", "Use an unlabeled container.", "Collect from any available patient.", "Complete the label later from memory."], 0),
    q("A specimen label is applied:", ["At the bedside after collection according to policy.", "Before entering the patient's room for an unknown patient.", "At the nurses' station hours later.", "Without patient identifiers."], 0),
    q("For a 24-hour urine collection, if one specimen is accidentally discarded, the nurse should:", ["Follow policy, notify the appropriate person, and usually restart the collection.", "Continue without reporting.", "Add tap water.", "Estimate the missing amount."], 0),
    q("When collecting a sputum specimen, the desired sample is:", ["Secretions coughed from the lower respiratory tract.", "Saliva only.", "Mouthwash.", "Water from the bedside cup."], 0),
    q("Which statement describes lifespan development?", ["Development continues throughout life and is influenced by many factors.", "All older adults develop identically.", "Learning ends in adulthood.", "Family roles never change."], 0),
    q("Person-centered care for an older adult includes:", ["Respecting preferences, abilities, history, and goals.", "Treating every resident the same regardless of need.", "Assuming dependence.", "Excluding the resident from decisions."], 0),
    q("Grief is best understood as:", ["An individual response that may vary in pattern and duration.", "A fixed sequence completed on schedule.", "A behavior that should be discouraged.", "Evidence of mental illness in every case."], 0),
    q("Which response is therapeutic for a grieving family member?", ["I'm here with you. Tell me what you need right now.", "You should be over this soon.", "At least your loved one lived a long life.", "Do not cry."], 0),
    q("End-of-life care should prioritize:", ["Comfort, dignity, preferences, communication, and family support.", "Unwanted procedures regardless of goals.", "Avoiding all conversation.", "Removing cultural practices."], 0),
    q("Advance-directive information should be:", ["Communicated and followed according to law, policy, and current orders.", "Ignored if family members disagree.", "Changed by the nurse.", "Posted publicly."], 0),
    q("After a resident death, care should be provided:", ["According to policy while preserving dignity and respecting cultural practices.", "Without identifying the resident.", "In a public area.", "Before required notifications."], 0)
  ],
  longTermChapters37to40: [
    q("A major home-health safety priority is to:", ["Assess the actual home environment for hazards and available support.", "Assume every home has hospital equipment.", "Rearrange possessions without consent.", "Ignore caregiver ability."], 0),
    q("Home-health teaching is most effective when the nurse:", ["Uses plain language, demonstration, and teach-back in the home context.", "Uses unexplained jargon.", "Provides instructions unrelated to available resources.", "Avoids involving the patient."], 0),
    q("Long-term care promotes quality of life by:", ["Supporting rights, choice, function, relationships, and meaningful activity.", "Removing all resident choices.", "Using restraints for staff convenience.", "Avoiding family communication."], 0),
    q("A care plan in long-term care should be:", ["Individualized and updated when needs or condition change.", "Identical for every resident.", "Kept from direct-care staff.", "Based only on diagnosis."], 0),
    q("A resident reports possible abuse. The nurse should:", ["Protect the resident and follow mandatory reporting and facility procedures immediately.", "Promise secrecy and do nothing.", "Confront everyone publicly.", "Wait for proof beyond policy requirements."], 0),
    q("Rehabilitation nursing focuses on:", ["Maximizing function, independence, adaptation, and participation.", "Doing every task for the patient.", "Avoiding measurable goals.", "Preventing use of assistive devices."], 0),
    q("A restorative goal should be:", ["Specific, realistic, measurable, and meaningful to the resident.", "Chosen without resident input.", "Unrelated to function.", "Changed every hour."], 0),
    q("During rehabilitation, a resident struggles with a task. The best nursing response is to:", ["Allow safe time and cueing while encouraging the resident's effort.", "Complete every task immediately.", "Criticize the resident.", "Stop all therapy permanently."], 0),
    q("Which action helps prevent complications of immobility?", ["Repositioning, mobility, skin care, hydration, and prescribed exercise.", "Keeping the resident in one position.", "Restricting fluids without an order.", "Avoiding range of motion."], 0),
    q("Hospice care primarily emphasizes:", ["Comfort and quality of life for the patient and family.", "Cure at any cost.", "Stopping all nursing assessment.", "Excluding family support."], 0),
    q("A hospice resident reports shortness of breath. The nurse should:", ["Assess promptly and provide ordered comfort interventions.", "Dismiss the symptom as expected.", "Withhold all positioning support.", "Wait until the next week."], 0),
    q("Family members disagree about the resident's end-of-life wishes. The nurse should:", ["Use the care plan, current orders, advance-care information, and interdisciplinary support.", "Choose a side based on personal beliefs.", "Ignore the resident's documented preferences.", "Discuss the conflict publicly."], 0),
    q("Which intervention supports dignity in hospice?", ["Ask about comfort, privacy, spiritual needs, and preferred family presence.", "Avoid touching or speaking to the resident.", "Remove personal items without permission.", "Use only routine schedules regardless of preference."], 0),
    q("Bereavement support may include:", ["Listening, providing resources, and recognizing that grief responses differ.", "Setting a deadline for grief.", "Discouraging questions.", "Avoiding cultural practices."], 0),
    q("The practical nurse demonstrates accountability across home health, long-term care, rehabilitation, and hospice by:", ["Following scope and policy, reporting changes, documenting accurately, and seeking guidance.", "Working beyond scope when busy.", "Changing records to avoid review.", "Keeping safety concerns private."], 0)
  ]
};

// Major assessments draw from the same validated chapter banks so every
// question is aligned to material already taught in the course. The slices
// keep each exam balanced across its chapter groups without repeating items.
quizBanks.introFinal = [
  ...quizBanks.introChapter1.slice(0, 7),
  ...quizBanks.introChapter2.slice(0, 7),
  ...quizBanks.introChapter3.slice(0, 7),
  ...quizBanks.introChapter4.slice(0, 7),
  ...quizBanks.introChapter5.slice(0, 7),
  ...quizBanks.introChapter6.slice(0, 7),
  ...quizBanks.introChapters7to9.slice(0, 9),
  ...quizBanks.introChapters10to13.slice(0, 9)
];
quizBanks.longTermMidterm = [
  ...quizBanks.longTermChapters14to17,
  ...quizBanks.longTermChapters18to21.slice(0, 10)
];
quizBanks.longTermFinal = [
  ...quizBanks.longTermChapters14to17,
  ...quizBanks.longTermChapters18to21,
  ...quizBanks.longTermChapters22to25,
  ...quizBanks.longTermChapters37to40
];

function quizContent(label, questions) {
  return `${label}\n\nThis assessment contains ${questions.length} multiple-choice questions. Select Start Now when you are ready.\n\nQUIZ_DATA_BASE64:${Buffer.from(JSON.stringify(questions), "utf8").toString("base64")}`;
}

module.exports = { quizBanks, quizContent };
