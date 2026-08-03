const { quizContent } = require("./nursingCourseQuizzes");

const materialBase = "/course-materials/anatomy-and-physiology-pn104";
const neurologicalExamVideoUrl = "https://ecu.hosted.panopto.com/Panopto/Pages/Viewer.aspx?id=b49f0174-1ab3-498a-ae4e-ae6a018a5955";

const chapters = [
  [1, "Introduction to the Human Body", "PN104_Ch01_Intro_Human_Body"],
  [2, "The Chemical Level of Organization", "PN104_Ch02_Chemical_Level"],
  [3, "The Cellular Level of Organization", "PN104_Ch03_Cellular_Level"],
  [4, "The Tissue Level of Organization", "PN104_Ch04_Tissue_Level"],
  [5, "The Integumentary System", "PN104_Ch05_Integumentary"],
  [6, "Bone Tissue", "PN104_Ch06_Bone_Tissue"],
  [7, "The Axial Skeleton", "PN104_Ch07_Axial_Skeleton"],
  [8, "The Appendicular Skeleton", "PN104_Ch08_Appendicular_Skeleton"],
  [9, "Joints", "PN104_Ch09_Joints"],
  [10, "Muscle Tissue", "PN104_Ch10_Muscle_Tissue"],
  [11, "The Muscular System", "PN104_Ch11_Muscular_System"],
  [12, "Nervous Tissue", "PN104_Ch12_Nervous_Tissue"],
  [13, "Anatomy of the Nervous System", "PN104_Ch13_Nervous_System_Anatomy"],
  [14, "The Somatic Nervous System", "PN104_Ch14_Somatic_Nervous_System"],
  [15, "The Autonomic Nervous System", "PN104_Ch15_Autonomic_Nervous_System"],
  [16, "Neurological Assessment", "PN104_Ch16_Neurological_Exam"],
  [17, "The Endocrine System", "PN104_Ch17_Endocrine_System"],
  [18, "Blood", "PN104_Ch18_Blood"],
  [19, "The Heart", "PN104_Ch19_The_Heart"],
  [20, "Blood Vessels and Circulation", "PN104_Ch20_Blood_Vessels"],
  [21, "The Lymphatic and Immune Systems", "PN104_Ch21_Lymphatic_Immune"],
  [22, "The Respiratory System", "PN104_Ch22_Respiratory_System"],
  [23, "The Digestive System", "PN104_Ch23_Digestive_System"],
  [24, "Metabolism and Nutrition", "PN104_Ch24_Metabolism_Nutrition"],
  [25, "The Urinary System", "PN104_Ch25_Urinary_System"],
  [26, "Fluid, Electrolyte, and Acid-Base Balance", "PN104_Ch26_Fluid_Acid_Base"],
  [27, "The Reproductive System", "PN104_Ch27_Reproductive_System"],
  [28, "Development and Inheritance", "PN104_Ch28_Development_Inheritance"]
].map(([number, title, stem]) => ({
  number,
  title,
  studentFile: number === 16 ? `${stem}.pptx` : `${stem}.pdf`,
  facultyFile: number === 11 ? `${stem}.pptx` : `${stem}_FACULTY.pptx`
}));

const weekPlan = [
  [1, [1, 2, 3], "Foundations, Chemistry, and Cells"],
  [2, [4, 5], "Tissues and the Integumentary System"],
  [3, [6, 7, 8, 9], "Bones, Skeleton, and Joints"],
  [4, [10, 11], "Muscle Tissue and the Muscular System"],
  [5, [12, 13, 14], "Nervous Tissue, CNS, and Somatic Function"],
  [6, [15, 16, 17], "Autonomic, Neurological, and Endocrine Integration"],
  [7, [18, 19, 20], "Blood, Heart, and Circulation"],
  [8, [21, 22], "Lymphatic, Immune, and Respiratory Systems"],
  [9, [23, 24], "Digestion, Metabolism, and Nutrition"],
  [10, [25, 26], "Urinary, Fluid, Electrolyte, and Acid-Base Balance"],
  [11, [27], "The Reproductive System"],
  [12, [28], "Development, Inheritance, and Course Integration"]
];

const q = (prompt, options, answer = 0) => ({ prompt, options, answer });
const quizBanks = {
  3: [
    q("Homeostasis is best described as:", ["Maintenance of a relatively stable internal environment.", "Complete absence of change.", "Growth of every tissue.", "Voluntary control of all organs."]),
    q("The smallest living unit is the:", ["Cell.", "Atom.", "Organ.", "Tissue."]),
    q("A group of similar cells performing a shared function is a:", ["Tissue.", "System.", "Organism.", "Cavity."]),
    q("The epidermis is composed primarily of:", ["Epithelial tissue.", "Cardiac muscle.", "Nervous tissue.", "Bone tissue."]),
    q("Which structure protects the brain?", ["Cranium.", "Pelvis.", "Scapula.", "Patella."]),
    q("The axial skeleton includes the:", ["Skull, vertebral column, and thoracic cage.", "Arms and legs only.", "Pectoral girdle only.", "Pelvic girdle only."]),
    q("The appendicular skeleton includes the:", ["Limbs and their girdles.", "Skull and ribs.", "Vertebral column only.", "Sternum only."]),
    q("A freely movable joint is classified as:", ["Synovial.", "Fibrous only.", "Fixed.", "Sutural only."]),
    q("Osteoblasts primarily:", ["Build bone matrix.", "Break down bone.", "Carry oxygen.", "Transmit impulses."]),
    q("Osteoclasts primarily:", ["Resorb bone.", "Form keratin.", "Contract muscle.", "Produce insulin."]),
    q("Melanin helps protect the skin from:", ["Ultraviolet radiation.", "Joint movement.", "Blood clotting.", "Nerve impulses."]),
    q("The anatomical position has the palms facing:", ["Forward.", "Backward.", "Inward.", "Downward."]),
    q("A sagittal plane divides the body into:", ["Right and left portions.", "Front and back portions.", "Upper and lower portions.", "Superficial and deep portions."]),
    q("The thoracic cavity contains the:", ["Heart and lungs.", "Urinary bladder.", "Reproductive organs only.", "Patellae."]),
    q("Negative feedback generally:", ["Reverses a change to support stability.", "Amplifies every change.", "Stops all metabolism.", "Occurs only during labor."])
  ],
  6: [
    q("The functional unit of the nervous system is the:", ["Neuron.", "Osteon.", "Nephron.", "Alveolus."]),
    q("The central nervous system includes the:", ["Brain and spinal cord.", "Cranial nerves only.", "Autonomic nerves only.", "Sensory receptors only."]),
    q("The somatic nervous system primarily controls:", ["Skeletal muscle.", "Heart rate only.", "Gland secretion only.", "Digestion only."]),
    q("The sympathetic division prepares the body for:", ["Fight-or-flight activity.", "Sleep only.", "Bone growth.", "Blood clotting."]),
    q("The parasympathetic division generally supports:", ["Rest-and-digest functions.", "Emergency stress responses.", "Voluntary movement.", "Skin pigmentation."]),
    q("A reflex is:", ["A rapid, automatic response to a stimulus.", "A voluntary endocrine action.", "A bone-remodeling event.", "A blood-clotting protein."]),
    q("Myelin primarily:", ["Speeds nerve impulse conduction.", "Forms red blood cells.", "Stores calcium in bone.", "Produces urine."]),
    q("The cerebellum is important for:", ["Coordination and balance.", "Bile production.", "Blood filtration.", "Insulin secretion."]),
    q("The pituitary gland is often called the:", ["Master endocrine gland.", "Primary respiratory organ.", "Largest lymph node.", "Main digestive enzyme."]),
    q("Insulin lowers blood glucose by:", ["Promoting cellular uptake and storage of glucose.", "Stopping all glucose use.", "Increasing glucagon release only.", "Blocking cell membranes."]),
    q("Thyroid hormones strongly influence:", ["Metabolic rate.", "Joint type.", "Skin color only.", "Blood type."]),
    q("A neurological assessment commonly includes:", ["Mental status, pupils, strength, sensation, and reflexes.", "Only height and weight.", "Only bowel sounds.", "Only skin temperature."]),
    q("The frontal lobe contributes to:", ["Planning, judgment, behavior, and voluntary movement.", "Urine formation.", "Gas exchange.", "Blood clot formation."]),
    q("The spinal cord communicates with the body through:", ["Spinal nerves.", "Tendons only.", "Hormones only.", "Platelets."]),
    q("Endocrine glands release hormones into the:", ["Bloodstream.", "Joint cavity.", "Digestive lumen only.", "Skin surface."])
  ],
  9: [
    q("Red blood cells primarily transport:", ["Oxygen.", "Bile.", "Urine.", "Nerve impulses."]),
    q("Platelets are essential for:", ["Blood clotting.", "Gas exchange.", "Digestion.", "Hormone production."]),
    q("The right side of the heart pumps blood toward the:", ["Lungs.", "Brain only.", "Kidneys only.", "Liver only."]),
    q("The left ventricle pumps blood into the:", ["Aorta.", "Pulmonary trunk.", "Vena cava.", "Coronary sinus."]),
    q("Arteries carry blood:", ["Away from the heart.", "Only toward the heart.", "Only within the lungs.", "Only without oxygen."]),
    q("Capillaries are the major sites of:", ["Exchange between blood and tissues.", "Urine storage.", "Bile production.", "Bone growth."]),
    q("The lymphatic system helps:", ["Return tissue fluid and support immune defense.", "Produce all digestive enzymes.", "Move bones.", "Generate nerve impulses."]),
    q("Alveoli are the sites of:", ["Gas exchange.", "Blood-cell production.", "Urine concentration.", "Nutrient absorption."]),
    q("The diaphragm is the primary muscle of:", ["Breathing.", "Chewing.", "Urination.", "Vision."]),
    q("During inhalation, thoracic volume generally:", ["Increases.", "Decreases.", "Remains absent.", "Becomes solid."]),
    q("The small intestine is the major site of:", ["Nutrient absorption.", "Urine storage.", "Blood pumping.", "Air filtration."]),
    q("The liver produces:", ["Bile.", "Insulin only.", "Urine.", "Surfactant."]),
    q("The pancreas contributes to digestion by releasing:", ["Digestive enzymes.", "Red blood cells.", "Synovial fluid.", "Melanin."]),
    q("Peristalsis moves material through the:", ["Digestive tract.", "Cranial cavity.", "Bone marrow.", "Heart valves."]),
    q("Metabolism includes:", ["All chemical reactions that sustain life.", "Only breathing.", "Only movement.", "Only filtration."])
  ],
  12: [
    q("The functional unit of the kidney is the:", ["Nephron.", "Neuron.", "Osteon.", "Alveolus."]),
    q("The kidneys help regulate:", ["Fluid, electrolytes, acid-base balance, and waste removal.", "Only voluntary movement.", "Only digestion.", "Only skin color."]),
    q("Antidiuretic hormone generally promotes:", ["Water reabsorption.", "Bone resorption only.", "Red blood cell destruction.", "Bile release."]),
    q("A solution with a pH below 7 is:", ["Acidic.", "Alkaline.", "Neutral only.", "Isotonic by definition."]),
    q("The ovaries produce:", ["Oocytes and reproductive hormones.", "Bile.", "Urine.", "Platelets."]),
    q("The testes produce:", ["Sperm and testosterone.", "Insulin.", "Thyroxine.", "Bile."]),
    q("Fertilization most commonly occurs in the:", ["Uterine tube.", "Uterus.", "Vagina.", "Ovary cortex only."]),
    q("The placenta supports exchange between:", ["Maternal and fetal circulations.", "The lungs and pleura.", "The kidneys and bladder.", "Bone and muscle."]),
    q("A genotype is an organism's:", ["Genetic makeup.", "Visible traits only.", "Blood pressure.", "Body position."]),
    q("A phenotype is:", ["An observable characteristic.", "A chromosome only.", "A urinary structure.", "A nerve pathway."]),
    q("Mitosis produces:", ["Two genetically similar daughter cells.", "Gametes only.", "Four genetically different cells.", "No DNA."]),
    q("Meiosis produces:", ["Gametes with half the chromosome number.", "Skin cells.", "Two identical diploid cells.", "Platelets only."]),
    q("Acid-base balance is closely linked to the:", ["Respiratory and urinary systems.", "Skeletal system only.", "Integument only.", "Reproductive system only."]),
    q("A&P knowledge helps a practical nurse recognize:", ["Expected function and meaningful changes in condition.", "A license to diagnose independently.", "That body systems work separately.", "That assessment is unnecessary."]),
    q("The best first step when an A&P finding is unfamiliar is to:", ["Review the evidence, assess carefully, and seek appropriate guidance.", "Guess.", "Ignore it.", "Change the care plan independently."])
  ]
};

const assignmentRubric = [
  "Assignment rubric (25 points)",
  "- Anatomical and physiological accuracy: 10 points",
  "- Application to a patient-care situation: 6 points",
  "- Explanation and clinical reasoning: 5 points",
  "- Organization, completeness, and professional writing: 4 points"
].join("\n");

const dueDates = ["2026-07-19", "2026-07-26", "2026-08-02", "2026-08-09", "2026-08-16", "2026-08-23", "2026-08-30", "2026-09-06", "2026-09-13", "2026-09-20", "2026-09-27", "2026-10-04"];

const discussions = [
  {
    week: 3,
    title: "[PN104 2026] Week 3 Discussion: Movement, Stability, and Musculoskeletal Safety",
    dueDate: dueDates[2],
    pointsPossible: 10,
    prompt: "Choose one bone, joint, or skeletal structure from this week's chapters. Explain how its anatomy supports movement, stability, or protection. Then connect that structure to a fall, mobility, or injury-related observation a practical nurse should recognize and report. Respond meaningfully to at least one classmate by adding a safety consideration or a related anatomical connection."
  },
  {
    week: 5,
    title: "[PN104 2026] Week 5 Discussion: Nervous-System Changes — Recognize and Report",
    dueDate: dueDates[4],
    pointsPossible: 10,
    prompt: "Choose one part of the central or somatic nervous system and explain how its anatomy supports normal sensation, movement, communication, or coordination. Then describe one change—such as new weakness, numbness, confusion, or poor coordination—that a practical nurse should assess, document, and report. Respond meaningfully to at least one classmate by extending the anatomy-to-assessment connection."
  },
  {
    week: 8,
    title: "[PN104 2026] Week 8 Discussion: Defense and Oxygenation Working Together",
    dueDate: dueDates[7],
    pointsPossible: 10,
    prompt: "Explain how one lymphatic or immune structure works with the respiratory system when the body responds to infection. Identify one breathing, oxygenation, or infection-related change a practical nurse should observe and promptly report. Respond meaningfully to at least one classmate by adding another system connection or patient-safety observation."
  },
  {
    week: 11,
    title: "[PN104 2026] Week 11 Discussion: Reproductive Anatomy and Respectful Patient Education",
    dueDate: dueDates[10],
    pointsPossible: 10,
    prompt: "Choose one reproductive structure or hormonal process and explain its normal function in clear, patient-friendly language. Describe how a practical nurse can protect privacy, dignity, culture, and informed understanding while providing related education. Respond meaningfully to at least one classmate by suggesting an additional respectful teaching or communication strategy."
  }
];

const discussionByWeek = new Map(discussions.map((discussion) => [discussion.week, discussion]));

function weekModule([week, chapterNumbers, title]) {
  const selected = chapters.filter((chapter) => chapterNumbers.includes(chapter.number));
  const quiz = quizBanks[week];
  const discussion = discussionByWeek.get(week);
  const assignmentTitle = `[PN104 2026] Week ${week} Applied A&P Assignment`;
  return {
    title: `Week ${week}: ${title}`,
    lessons: [
      {
        title: "Weekly Overview and Learning Focus",
        durationMinutes: 30,
        content: `This week, you will study ${selected.map((chapter) => `Chapter ${chapter.number}: ${chapter.title}`).join(", ")}. Focus on normal structure, normal function, how the systems work together, and the changes you would recognize and report in practical nursing care.`
      },
      ...selected.map((chapter) => {
        const studentFileUrl = `${materialBase}/${chapter.studentFile}`;
        const isChapter16 = chapter.number === 16;
        const videoLine = isChapter16
          ? `\n\nNeurological exam video:\n- Watch: ${neurologicalExamVideoUrl}`
          : "";
        return {
          title: isChapter16
            ? "Chapter 16: Neurological Assessment — PowerPoint"
            : `Chapter ${chapter.number}: ${chapter.title} — Student Slide Review`,
          durationMinutes: 75,
          content: `Study the chapter presentation before completing this week's assignment and, when scheduled, discussion.\n\nStudent presentation (instructor notes removed):\n- Open Chapter ${chapter.number} slides: ${studentFileUrl}${isChapter16 ? "" : "?inline=1"}${videoLine}\n\nAs you study, explain the major structures in your own words, connect each structure to its function, and identify one patient-care observation related to this topic.`
        };
      }),
      ...(discussion ? [{
        title: discussion.title,
        durationMinutes: 30,
        content: `Canvas item type: Discussion.\n\n${discussion.prompt}\n\nPoints: ${discussion.pointsPossible}.\nDue: ${discussion.dueDate} at 11:59 PM.`
      }] : []),
      {
        title: assignmentTitle,
        durationMinutes: 60,
        content: `Canvas item type: Assignment.\n\nCreate a one-page concept map or short written explanation that connects this week's major structures to their functions and one practical nursing application. Use accurate terminology and explain the connection in your own words.\n\n${assignmentRubric}\n\nDue: ${dueDates[week - 1]} at 11:59 PM.`
      },
      ...(quiz ? [{
        title: `[PN104 2026] Quiz ${Object.keys(quizBanks).indexOf(String(week)) + 1}: Weeks Through ${week}`,
        durationMinutes: 45,
        content: quizContent("Complete all 15 questions. Read every option, identify what the question is asking, and choose the answer that best reflects normal anatomy and physiology.", quiz)
      }] : []),
      ...([6, 12].includes(week) ? [{
        title: week === 6 ? "[PN104 2026] Midterm Examination" : "[PN104 2026] Final Examination",
        durationMinutes: 90,
        content: quizContent(week === 6 ? "Midterm examination covering Chapters 1-17." : "Comprehensive final examination covering Chapters 1-28.", week === 6 ? [...quizBanks[3], ...quizBanks[6]] : [...quizBanks[9], ...quizBanks[12]])
      }] : [])
    ]
  };
}

const studentModules = weekPlan.map(weekModule);
const facultyLessons = chapters.map((chapter) => ({
  title: `Faculty PowerPoint — Chapter ${chapter.number}: ${chapter.title}`,
  durationMinutes: 0,
  published: false,
  instructorOnly: true,
  content: `Instructor-only original PowerPoint with faculty notes:\n- ${materialBase}/${chapter.facultyFile}`
}));

const gradeItems = [
  { title: "[PN104 2026] Syllabus and Course Orientation Acknowledgment", pointsPossible: 0, dueDate: dueDates[0] },
  ...weekPlan.flatMap(([week]) => {
    const items = [
      { title: `[PN104 2026] Week ${week} Applied A&P Assignment`, pointsPossible: 25, dueDate: dueDates[week - 1] }
    ];
    const discussion = discussionByWeek.get(week);
    if (discussion) items.unshift({ title: discussion.title, pointsPossible: discussion.pointsPossible, dueDate: discussion.dueDate });
    if (quizBanks[week]) items.push({ title: `[PN104 2026] Quiz ${Object.keys(quizBanks).indexOf(String(week)) + 1}: Weeks Through ${week}`, pointsPossible: 50, dueDate: dueDates[week - 1] });
    if (week === 6) items.push({ title: "[PN104 2026] Midterm Examination", pointsPossible: 150, dueDate: dueDates[week - 1] });
    if (week === 12) items.push({ title: "[PN104 2026] Final Examination", pointsPossible: 200, dueDate: dueDates[week - 1] });
    return items;
  })
];

const anatomyPhysiologyCourse = {
  title: "Anatomy and Physiology",
  slug: "anatomy-and-physiology",
  category: "Practical Nursing Course",
  hours: 90,
  credentialType: "Course",
  deliveryMode: "Campus / blended",
  ghlProductKeys: ["Anatomy and Physiology", "PN 104", "PN104", "anatomy-and-physiology"],
  seedVersion: "2026-07-28-complete-12-week-course-with-drive-slides",
  description: "In this 12-week Anatomy and Physiology course, you will study how the structures of the human body are organized, how they function, and how body systems work together. You will connect normal anatomy and physiology to observations, safety concerns, and changes in condition that matter in practical nursing care.",
  objectives: [
    "Use correct anatomical terminology to describe body structures and relationships.",
    "Explain normal functions from the cellular level through major organ systems.",
    "Connect anatomy and physiology concepts to practical nursing observations and patient safety.",
    "Recognize how body systems maintain homeostasis and respond to change.",
    "Communicate anatomical and physiological information clearly using professional language."
  ],
  policies: {
    attendance: "You are expected to participate in all scheduled learning activities and complete each week in sequence.",
    assessment: "Four graded discussions in Weeks 3, 5, 8, and 11 and weekly applied assignments prepare you for four 15-question quizzes, a midterm, and a comprehensive final examination.",
    materials: "Student slide reviews do not display faculty notes. Original faculty PowerPoints remain available only on the instructor side."
  },
  syllabus: {
    courseCode: "PN 104",
    length: "12 weeks",
    clockHours: 90,
    delivery: "Campus / blended",
    weeklyStructure: "chapter slide review, student-directed lesson, applied assignment with rubric, four scheduled discussions, and scheduled assessments",
    grading: "Four discussions at 10 points each (40 points total); applied assignments 25 points each; quizzes 50 points each; midterm 150 points; final 200 points."
  },
  weeks: weekPlan.map(([week, chapterNumbers, title]) => {
    const assessments = [];
    const discussion = discussionByWeek.get(week);
    if (discussion) {
      const topic = discussion.title.replace(/^\[PN104 2026\] Week \d+ Discussion:\s*/, "");
      assessments.push(`Discussion ${discussions.indexOf(discussion) + 1}: ${topic} · ${discussion.pointsPossible} points`);
    }
    assessments.push("Applied A&P Assignment · 25 points");
    if (quizBanks[week]) assessments.push(`Quiz ${Object.keys(quizBanks).indexOf(String(week)) + 1} · 50 points`);
    if (week === 6) assessments.push("Midterm Examination · 150 points");
    if (week === 12) assessments.push("Final Examination · 200 points");
    return {
      week,
      title,
      chapters: chapterNumbers.map((n) => `Chapter ${n}`).join(", "),
      dueDate: dueDates[week - 1],
      assessment: assessments.join("; ")
    };
  }),
  discussions,
  modules: [
    {
      title: "Orientation and Course Resources",
      lessons: [
        {
          title: "Course Welcome and Expectations",
          durationMinutes: 30,
          content: "Welcome to PN 104. Begin with the syllabus, calendar, grading plan, navigation guidance, and course expectations. Each week, study the assigned slides, explain the content in your own words, complete the discussions scheduled in Weeks 3, 5, 8, and 11, and apply the science to practical nursing observations."
        },
        {
          title: "PN 104 Syllabus",
          durationMinutes: 30,
          content: "Course code: PN 104\nLength: 12 weeks\nClock hours: 90\nDelivery: Campus / blended\n\nWeekly structure: chapter slide review, student-directed lesson, applied assignment with rubric, four scheduled discussions, and scheduled assessments.\n\nDiscussions: Week 3 — Movement, Stability, and Musculoskeletal Safety (due August 2); Week 5 — Nervous-System Changes — Recognize and Report (due August 16); Week 8 — Defense and Oxygenation Working Together (due September 6); Week 11 — Reproductive Anatomy and Respectful Patient Education (due September 27). All discussion deadlines are 11:59 PM in 2026 and each discussion is worth 10 points.\n\nGrading: Four discussions total 40 points; applied assignments 25 points each; quizzes 50 points each; midterm 150 points; final 200 points."
        }
      ]
    },
    ...studentModules,
    { title: "PN104 Faculty Instructor Resources", lessons: facultyLessons }
  ],
  gradeItems
};

module.exports = { anatomyPhysiologyCourse, discussions };
