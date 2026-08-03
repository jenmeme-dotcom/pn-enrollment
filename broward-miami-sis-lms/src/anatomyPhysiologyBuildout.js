const { quizContent } = require("./nursingCourseQuizzes");

const materialBase = "/course-materials/anatomy-and-physiology-pn104";
const neurologicalExamVideoUrl = "https://ecu.hosted.panopto.com/Panopto/Pages/Viewer.aspx?id=b49f0174-1ab3-498a-ae4e-ae6a018a5955";
const chapterMaterialUrl = (chapter) => `${materialBase}/${chapter.studentFile}`;

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
  studentFile: `${stem}.pptx`,
  facultyFile: `${stem}_FACULTY.pptx`
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

const additionalQuizQuestions = {
  3: [
    q("The term superior means:", ["Toward the head or above another structure.", "Toward the feet.", "Farther from the point of attachment.", "Toward the back only."]),
    q("The term distal means:", ["Farther from the point of attachment.", "Closer to the point of attachment.", "Toward the midline.", "Toward the head."]),
    q("A transverse plane divides the body into:", ["Upper and lower portions.", "Right and left portions.", "Front and back portions.", "Deep and superficial portions."]),
    q("The dorsal body cavity contains the:", ["Brain and spinal cord.", "Heart and lungs.", "Stomach and liver.", "Bladder and reproductive organs."]),
    q("An ion is an atom that:", ["Has gained or lost electrons and carries a charge.", "Has no nucleus.", "Contains only neutrons.", "Cannot participate in reactions."]),
    q("A substance with a pH of 7 is:", ["Neutral.", "Strongly acidic.", "Strongly alkaline.", "Always toxic."]),
    q("Enzymes primarily:", ["Speed chemical reactions without being consumed.", "Store genetic information.", "Form bones directly.", "Carry oxygen in blood."]),
    q("The plasma membrane:", ["Selectively controls movement into and out of the cell.", "Produces all body hormones.", "Stores urine.", "Connects bones at joints."]),
    q("Mitochondria are important for:", ["ATP production.", "Protein packaging only.", "Blood clotting.", "Bone resorption."]),
    q("Ribosomes are the sites of:", ["Protein synthesis.", "Urine formation.", "Gas exchange.", "Joint movement."]),
    q("The nucleus contains most of the cell's:", ["DNA.", "Synovial fluid.", "Bile.", "Hemoglobin."]),
    q("Diffusion moves particles:", ["From higher to lower concentration.", "Only by using ATP.", "From lower to higher concentration only.", "Through bone tissue only."]),
    q("Osmosis is the movement of:", ["Water across a selectively permeable membrane.", "Proteins through bone.", "Air through the trachea.", "Blood through heart valves."]),
    q("Active transport requires:", ["Cellular energy.", "No membrane proteins.", "Only gravity.", "A joint capsule."]),
    q("Connective tissue commonly:", ["Supports, binds, protects, or transports.", "Conducts every nerve impulse.", "Lines every body surface only.", "Produces all movement."]),
    q("Muscle tissue is specialized to:", ["Contract and produce movement.", "Store genetic material.", "Form the epidermis.", "Filter plasma."]),
    q("Nervous tissue is specialized for:", ["Rapid communication using electrical and chemical signals.", "Calcium storage only.", "Bile production.", "Blood clotting."]),
    q("The dermis contains:", ["Blood vessels, nerves, glands, and connective tissue.", "Only dead keratinized cells.", "Nephrons.", "Alveoli."]),
    q("Sweat glands contribute to:", ["Temperature regulation.", "Bone formation.", "Oxygen transport.", "Urine concentration."]),
    q("The skin helps prevent:", ["Excessive fluid loss and entry of pathogens.", "All aging changes.", "Every allergic response.", "All heat production."]),
    q("Compact bone is organized into structural units called:", ["Osteons.", "Nephrons.", "Alveoli.", "Sarcomeres."]),
    q("Red bone marrow is a major site of:", ["Blood cell formation.", "Bile storage.", "Nerve impulse generation.", "Urine storage."]),
    q("The vertebral column protects the:", ["Spinal cord.", "Heart.", "Liver.", "Urinary bladder."]),
    q("The sternum is located in the:", ["Anterior thorax.", "Posterior skull.", "Pelvic cavity.", "Lower leg."]),
    q("The pelvic girdle transfers body weight to the:", ["Lower limbs.", "Upper limbs.", "Skull.", "Ribs only."]),
    q("The humerus is the bone of the:", ["Upper arm.", "Thigh.", "Forearm.", "Lower leg."]),
    q("The femur is the bone of the:", ["Thigh.", "Upper arm.", "Forearm.", "Chest."]),
    q("Ligaments connect:", ["Bone to bone.", "Muscle to bone.", "Nerve to muscle.", "Skin to cartilage."]),
    q("Tendons connect:", ["Muscle to bone.", "Bone to bone.", "Artery to vein.", "Nerve to gland."]),
    q("Articular cartilage primarily:", ["Reduces friction and cushions joint surfaces.", "Produces red blood cells.", "Stores bile.", "Generates action potentials."])
  ],
  6: [
    q("The basic contractile unit of skeletal muscle is the:", ["Sarcomere.", "Neuron.", "Nephron.", "Alveolus."]),
    q("Actin and myosin interact to produce:", ["Muscle contraction.", "Urine filtration.", "Blood clotting.", "Hormone secretion."]),
    q("Calcium initiates skeletal muscle contraction by:", ["Allowing actin and myosin interaction.", "Stopping ATP formation.", "Destroying motor neurons.", "Closing all ion channels."]),
    q("ATP is required during muscle activity for:", ["Cross-bridge cycling and relaxation.", "Making bile only.", "Storing oxygen in plasma only.", "Producing cerebrospinal fluid."]),
    q("A motor neuron carries impulses toward:", ["Skeletal muscle fibers.", "Only sensory receptors.", "Bone marrow.", "The epidermis only."]),
    q("The neuromuscular junction uses which neurotransmitter?", ["Acetylcholine.", "Insulin.", "Thyroxine.", "Hemoglobin."]),
    q("A muscle that opposes the action of another is an:", ["Antagonist.", "Agonist only.", "Osteoblast.", "Interneuron."]),
    q("Dendrites generally:", ["Receive incoming signals.", "Carry impulses away from the cell body only.", "Produce hormones.", "Form myelin in every tissue."]),
    q("An axon generally:", ["Carries an impulse away from the neuron cell body.", "Receives every signal toward the nucleus.", "Filters blood.", "Forms cartilage."]),
    q("A synapse is the:", ["Communication junction between a neuron and another cell.", "Contractile unit of muscle.", "Filtering unit of kidney.", "Gas-exchange surface."]),
    q("Neurotransmitters are released from the:", ["Axon terminal.", "Bone matrix.", "Glomerulus.", "Alveolar sac."]),
    q("Sensory neurons carry information:", ["Toward the central nervous system.", "Only from the brain to muscle.", "From glands to blood only.", "Between bones."]),
    q("Motor neurons carry commands:", ["From the central nervous system to effectors.", "Only from skin to spinal cord.", "Between red blood cells.", "From kidneys to bladder."]),
    q("The brainstem helps regulate:", ["Breathing, heart rate, and consciousness.", "Bone length only.", "Bile storage.", "Skin pigmentation."]),
    q("The parietal lobe processes much of the body's:", ["Somatic sensory information.", "Urine output.", "Hormone production.", "Blood clotting."]),
    q("The occipital lobe is primarily associated with:", ["Vision.", "Hearing.", "Balance only.", "Digestion."]),
    q("The temporal lobe contributes to:", ["Hearing and memory.", "Kidney filtration.", "Skeletal growth.", "Blood pressure only."]),
    q("The meninges:", ["Protect and cover the brain and spinal cord.", "Secrete insulin.", "Move joints.", "Form platelets."]),
    q("Cerebrospinal fluid helps:", ["Cushion and protect the central nervous system.", "Digest fats.", "Carry oxygen in red blood cells.", "Produce urine."]),
    q("Afferent pathways carry information:", ["Toward the central nervous system.", "Away from the central nervous system.", "Only between muscles.", "Only through endocrine glands."]),
    q("Efferent pathways carry commands:", ["Away from the central nervous system.", "Only toward sensory receptors.", "Into bone marrow.", "Across the skin surface."]),
    q("The hypothalamus helps coordinate the nervous system with the:", ["Endocrine system.", "Skeletal system only.", "Integument only.", "Lymphatic vessels only."]),
    q("The adrenal medulla releases hormones that support:", ["The stress response.", "Bone remodeling only.", "Milk production only.", "Blood clotting only."]),
    q("Glucagon generally:", ["Raises blood glucose.", "Lowers blood calcium only.", "Stops metabolism.", "Decreases heart rate directly."]),
    q("Parathyroid hormone helps regulate:", ["Blood calcium.", "Vision.", "Bile production.", "Red blood cell shape."]),
    q("The thyroid gland is located in the:", ["Anterior neck.", "Pelvic cavity.", "Cranial cavity.", "Posterior knee."]),
    q("The pineal gland secretes:", ["Melatonin.", "Insulin.", "Aldosterone.", "Erythropoietin."]),
    q("A neurological change that requires prompt reporting is:", ["New unilateral weakness.", "Stable eye color.", "A long-standing birthmark.", "Normal sleepiness at bedtime."]),
    q("Pupil assessment evaluates size, equality, and:", ["Reaction to light.", "Blood type.", "Joint mobility.", "Urine concentration."]),
    q("The safest action when a new neurological deficit appears is to:", ["Assess and promptly report the change.", "Wait until discharge.", "Ask a visitor to diagnose it.", "Ignore it if pain is absent."])
  ],
  9: [
    q("Hemoglobin is found primarily in:", ["Red blood cells.", "Platelets.", "Plasma proteins only.", "Lymph nodes."]),
    q("White blood cells primarily contribute to:", ["Immune defense.", "Oxygen transport.", "Joint lubrication.", "Urine storage."]),
    q("Plasma is the:", ["Liquid portion of blood.", "Contractile layer of the heart.", "Air inside alveoli.", "Outer skin layer."]),
    q("The atrioventricular valves prevent blood from flowing back into the:", ["Atria during ventricular contraction.", "Aorta during relaxation only.", "Venae cavae.", "Pulmonary veins."]),
    q("The sinoatrial node normally functions as the heart's:", ["Primary pacemaker.", "Main valve.", "Largest artery.", "Oxygen reservoir."]),
    q("Coronary arteries supply blood to the:", ["Heart muscle.", "Lung alveoli only.", "Kidney cortex.", "Skin surface."]),
    q("Systole refers to ventricular:", ["Contraction and ejection.", "Relaxation and filling.", "Electrical silence.", "Valve destruction."]),
    q("Diastole refers to ventricular:", ["Relaxation and filling.", "Contraction and ejection.", "Clot formation.", "Oxygen diffusion only."]),
    q("Veins generally contain valves that help:", ["Prevent backward blood flow.", "Generate the heartbeat.", "Produce red blood cells.", "Digest nutrients."]),
    q("Blood pressure is influenced by cardiac output and:", ["Peripheral resistance.", "Skin color.", "Bone length.", "Pupil size."]),
    q("Lymph nodes help:", ["Filter lymph and support immune responses.", "Pump blood.", "Produce bile.", "Store urine."]),
    q("The spleen contributes to immune function and:", ["Filters blood.", "Ventilates the lungs.", "Produces urine.", "Moves the skeleton."]),
    q("Antibodies are produced by activated:", ["B lymphocytes/plasma cells.", "Red blood cells.", "Platelets.", "Osteocytes."]),
    q("The trachea carries air toward the:", ["Bronchi.", "Esophagus.", "Aorta.", "Ureters."]),
    q("The epiglottis helps prevent food from entering the:", ["Airway.", "Stomach.", "Small intestine.", "Liver."]),
    q("Surfactant helps alveoli:", ["Remain open by reducing surface tension.", "Produce mucus only.", "Filter blood.", "Absorb nutrients."]),
    q("Oxygen moves from the alveoli into pulmonary capillaries by:", ["Diffusion.", "Active transport only.", "Peristalsis.", "Filtration through nephrons."]),
    q("Carbon dioxide is removed primarily through the:", ["Lungs.", "Skin only.", "Gallbladder.", "Bone marrow."]),
    q("The esophagus moves food to the stomach by:", ["Peristalsis.", "Filtration.", "Ventilation.", "Diffusion across alveoli."]),
    q("The stomach begins substantial digestion of:", ["Proteins.", "Oxygen.", "Urine.", "Bone minerals."]),
    q("The gallbladder stores and concentrates:", ["Bile.", "Insulin.", "Urine.", "Cerebrospinal fluid."]),
    q("Bile assists with the digestion of:", ["Fats.", "Proteins only.", "Nucleic acids only.", "Minerals only."]),
    q("The large intestine primarily absorbs:", ["Water and electrolytes.", "Most amino acids.", "Oxygen.", "Hormones."]),
    q("Villi increase the small intestine's:", ["Absorptive surface area.", "Muscle mass.", "Acid production only.", "Blood pressure."]),
    q("Catabolism refers to reactions that:", ["Break larger molecules into smaller ones.", "Build every complex molecule.", "Stop energy release.", "Occur only in bone."]),
    q("Anabolism refers to reactions that:", ["Build larger molecules from smaller ones.", "Only break down glucose.", "Remove carbon dioxide.", "Filter plasma."]),
    q("Basal metabolic rate is the energy used to:", ["Maintain essential functions at rest.", "Perform maximal exercise only.", "Digest one meal only.", "Produce urine only."]),
    q("A sudden drop in oxygen saturation should prompt you to:", ["Assess breathing and promptly report the change.", "Wait until the next weekly quiz.", "Document only at discharge.", "Ignore it if the patient is awake."]),
    q("A weak rapid pulse may indicate a change in:", ["Circulatory status.", "Bone density only.", "Skin pigment only.", "Joint classification."]),
    q("A&P knowledge supports safe care because it helps you:", ["Connect findings to the body system involved.", "Diagnose independently outside your role.", "Avoid reassessment.", "Replace facility policy."])
  ],
  12: [
    q("The glomerulus is the site where:", ["Blood filtration begins in the nephron.", "Urine is stored.", "Hormones are made in the bladder.", "Sperm mature."]),
    q("The ureters carry urine from the:", ["Kidneys to the bladder.", "Bladder to the outside.", "Liver to the gallbladder.", "Urethra to the kidneys."]),
    q("The urinary bladder primarily:", ["Stores urine.", "Filters blood.", "Produces erythropoietin only.", "Regulates ventilation."]),
    q("Aldosterone promotes renal retention of:", ["Sodium and water.", "Carbon dioxide.", "Bile.", "Glucose in every situation."]),
    q("The kidneys release erythropoietin in response to:", ["Reduced oxygen availability.", "High blood calcium only.", "Increased bile.", "Joint inflammation."]),
    q("Sodium is the major cation in the:", ["Extracellular fluid.", "Intracellular fluid only.", "Bone matrix only.", "Gastric lumen only."]),
    q("Potassium is the major cation in the:", ["Intracellular fluid.", "Extracellular fluid only.", "Plasma only.", "Lymph only."]),
    q("An isotonic solution has:", ["A concentration similar to body fluids.", "No dissolved particles.", "Only water.", "A pH of exactly 1."]),
    q("Dehydration generally means:", ["Body fluid loss exceeds intake.", "Fluid intake exceeds output.", "Red blood cells increase only.", "The bladder cannot store urine."]),
    q("Edema is:", ["Excess fluid in interstitial tissues.", "Air in the pleural space.", "Loss of all plasma proteins.", "A bone infection."]),
    q("The lungs help regulate acid-base balance by controlling:", ["Carbon dioxide elimination.", "Sodium filtration only.", "Bile release.", "Bone marrow production."]),
    q("The kidneys help regulate acid-base balance by controlling hydrogen ions and:", ["Bicarbonate.", "Hemoglobin only.", "Melanin.", "Synovial fluid."]),
    q("A pH above 7.45 is consistent with:", ["Alkalemia.", "Acidemia.", "Neutral blood.", "Isotonicity."]),
    q("The uterus is the organ where:", ["A fertilized ovum can implant and develop.", "Oocytes are produced.", "Sperm mature.", "Urine is stored."]),
    q("Ovulation is the release of an oocyte from the:", ["Ovary.", "Uterus.", "Vagina.", "Pituitary."]),
    q("The endometrium is the inner lining of the:", ["Uterus.", "Ovary.", "Testis.", "Bladder."]),
    q("Sperm mature and are stored primarily in the:", ["Epididymis.", "Prostate.", "Seminal vesicle.", "Urethra."]),
    q("The prostate contributes fluid to:", ["Semen.", "Urine only.", "Blood plasma.", "Lymph."]),
    q("Testosterone is produced mainly by cells in the:", ["Testes.", "Ovaries only.", "Thyroid.", "Pancreas."]),
    q("Estrogen and progesterone help regulate the:", ["Female reproductive cycle.", "Cardiac conduction system.", "Clotting cascade only.", "Alveolar gas exchange."]),
    q("A zygote is formed when:", ["Sperm and oocyte nuclei unite.", "Mitosis stops permanently.", "The placenta separates.", "Urine enters the bladder."]),
    q("The embryonic period is especially important because:", ["Major organ systems begin forming.", "All growth is complete.", "No cell division occurs.", "The placenta is no longer needed."]),
    q("The fetal period is characterized mainly by:", ["Growth and maturation of organ systems.", "Formation of the zygote only.", "Absence of circulation.", "Loss of chromosomes."]),
    q("A chromosome contains:", ["DNA and associated proteins.", "Only lipids.", "Only glucose.", "Synovial fluid."]),
    q("A gene is:", ["A DNA sequence that contributes to a functional product or trait.", "An entire organ system.", "A type of joint.", "A blood vessel."]),
    q("A dominant allele is expressed when:", ["At least one copy is present.", "Two recessive copies are always present.", "No chromosomes are present.", "Meiosis is absent."]),
    q("A recessive trait is typically expressed when:", ["Two recessive alleles are present.", "One dominant allele is present.", "Only one chromosome exists.", "Mitosis produces platelets."]),
    q("Homeostasis depends on body systems:", ["Working together through coordinated feedback.", "Functioning independently without communication.", "Remaining completely unchanged.", "Stopping metabolism."]),
    q("When urine output drops unexpectedly, you should first:", ["Assess relevant findings and report the change according to policy.", "Diagnose kidney failure independently.", "Ignore it until discharge.", "Give unprescribed fluid."]),
    q("The safest NCLEX-PN approach to a body-system question is to:", ["Identify the system, compare the finding with normal function, and choose the safest in-scope action.", "Choose the longest answer automatically.", "Ignore assessment data.", "Select an action outside your role."])
  ]
};

const expandedQuizBanks = Object.fromEntries(
  Object.entries(quizBanks).map(([week, questions]) => [week, [...questions, ...(additionalQuizQuestions[week] || [])]])
);
const quizNumberByWeek = { 3: 1, 6: 2, 9: 3, 12: 4 };
const quizRangeLabel = (week) => `Weeks ${week - 2}-${week}`;

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

function chapterLessonContent(chapter) {
  const videoLine = chapter.number === 16
    ? `\n\nNeurological exam video:\n- Watch: ${neurologicalExamVideoUrl}`
    : "";
  return `Study this chapter PowerPoint before completing this week's assignment and, when scheduled, discussion.\n\nChapter ${chapter.number} PowerPoint:\n- Open or download: ${chapterMaterialUrl(chapter)}${videoLine}\n\nAs you study, explain the major structures in your own words, connect each structure to its function, and identify one patient-care observation related to this topic.`;
}

function weekModule([week, chapterNumbers, title]) {
  const selected = chapters.filter((chapter) => chapterNumbers.includes(chapter.number));
  const quiz = expandedQuizBanks[week];
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
      ...selected.map((chapter) => ({
        title: `Chapter ${chapter.number}: ${chapter.title} — PowerPoint`,
        durationMinutes: 75,
        externalUrl: null,
        content: chapterLessonContent(chapter)
      })),
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
        title: `[PN104 2026] Quiz ${quizNumberByWeek[week]}: ${quizRangeLabel(week)}`,
        durationMinutes: 75,
        content: quizContent("Complete all 45 questions: 15 questions for each week in this three-week range. Read every option, identify what the question is asking, and choose the answer that best reflects normal anatomy and physiology.", quiz)
      }] : []),
      ...([6, 12].includes(week) ? [{
        title: week === 6 ? "[PN104 2026] Quiz: Midterm Examination" : "[PN104 2026] Quiz: Final Examination",
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
    if (expandedQuizBanks[week]) items.push({ title: `[PN104 2026] Quiz ${quizNumberByWeek[week]}: ${quizRangeLabel(week)}`, pointsPossible: 50, dueDate: dueDates[week - 1] });
    if (week === 6) items.push({ title: "[PN104 2026] Quiz: Midterm Examination", pointsPossible: 150, dueDate: dueDates[week - 1] });
    if (week === 12) items.push({ title: "[PN104 2026] Quiz: Final Examination", pointsPossible: 200, dueDate: dueDates[week - 1] });
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
  seedVersion: "2026-07-29-expanded-three-week-quizzes-and-exams",
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
    assessment: "Four graded discussions in Weeks 3, 5, 8, and 11 and weekly applied assignments prepare you for four 45-question quizzes covering three weeks each, a midterm, and a comprehensive final examination.",
    materials: "Each chapter PowerPoint is attached individually in its assigned week. Student copies do not contain faculty notes; the original faculty versions remain available only on the instructor side."
  },
  syllabus: {
    courseCode: "PN 104",
    length: "12 weeks",
    clockHours: 90,
    delivery: "Campus / blended",
    weeklyStructure: "chapter slide review, student-directed lesson, applied assignment with rubric, four scheduled discussions, and scheduled assessments",
    grading: "Four discussions at 10 points each (40 points total); applied assignments 25 points each; four 45-question quizzes at 50 points each; midterm 150 points; final 200 points."
  },
  weeks: weekPlan.map(([week, chapterNumbers, title]) => {
    const assessments = [];
    const discussion = discussionByWeek.get(week);
    if (discussion) {
      const topic = discussion.title.replace(/^\[PN104 2026\] Week \d+ Discussion:\s*/, "");
      assessments.push(`Discussion ${discussions.indexOf(discussion) + 1}: ${topic} · ${discussion.pointsPossible} points`);
    }
    assessments.push("Applied A&P Assignment · 25 points");
    if (expandedQuizBanks[week]) assessments.push(`Quiz ${quizNumberByWeek[week]} · 50 points`);
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
          content: [
            "Welcome to Anatomy and Physiology",
            "In this 12-week PN 104 course, you will study how the human body is organized, how each structure supports a function, and how body systems work together to maintain life and health. You will connect normal anatomy and physiology to the observations, safety concerns, and changes in condition you will encounter as a practical nursing student.",
            "",
            "Course Details",
            "- Course code: PN 104",
            "- Length: 12 weeks",
            "- Clock hours: 90",
            "- Delivery: Campus / blended",
            "- Chapters: 1-28",
            "- Weekly structure: overview, individual chapter PowerPoints, applied assignment with rubric, four scheduled discussions, and scheduled assessments",
            "",
            "What You Should Do First",
            "- Read the PN 104 syllabus and review the course calendar, grading plan, attendance expectations, and due dates.",
            "- Open the Modules page and complete each week in order, beginning with the weekly overview.",
            "- Download and study every chapter PowerPoint assigned for the week.",
            "- Confirm that you can open Discussions, Assignments, Quizzes, Grades, Files, Inbox, and Calendar.",
            "- Contact your instructor early when terminology, instructions, grades, or deadlines are unclear.",
            "",
            "Your Weekly Learning Pattern",
            "- Preview: Read the weekly overview and identify the assigned chapters and due date.",
            "- Learn: Study each chapter PowerPoint and connect every major structure to its function.",
            "- Explain: Describe the content in your own words and use correct anatomical terminology.",
            "- Apply: Connect normal anatomy and physiology to one practical nursing observation or safety concern.",
            "- Participate: Complete the discussions scheduled in Weeks 3, 5, 8, and 11 and respond meaningfully to at least one classmate.",
            "- Assess: Submit the applied assignment and complete the scheduled quiz or examination.",
            "",
            "Grading and Major Assessments",
            "- Four scheduled discussions: 10 points each (40 points total)",
            "- Discussion due dates: Week 3 August 2; Week 5 August 16; Week 8 September 6; Week 11 September 27, 2026 by 11:59 PM",
            "- Weekly applied assignments with rubric: 25 points each",
            "- Four quizzes: 50 points each; every quiz contains 45 questions, with 15 questions for each week in its three-week range",
            "- Week 6 Midterm Examination: 150 points; covers Chapters 1-17; due August 23, 2026 by 11:59 PM",
            "- Week 12 Final Examination: 200 points; comprehensive Chapters 1-28; due October 4, 2026 by 11:59 PM",
            "",
            "How to Study Anatomy and Physiology",
            "- Learn location, structure, and function together instead of memorizing isolated terms.",
            "- Use directional terms and body planes when explaining where a structure is located.",
            "- Trace processes in sequence, such as blood flow, ventilation, digestion, filtration, and nerve signaling.",
            "- Compare normal findings with changes that require observation, reassessment, or reporting.",
            "- Use diagrams, labeling practice, concept maps, and retrieval practice rather than rereading alone.",
            "",
            "NCLEX-PN Preparation · Not Graded",
            "Anatomy and physiology helps you understand why a patient finding matters. NCLEX-PN questions often require you to recognize an abnormal change, connect it to the body system involved, and choose the safest action within the practical nurse role. The practice questions and rationales in this course help you build that clinical reasoning before the content is graded.",
            "",
            "Think Like a Practical Nurse",
            "Practice question: While caring for a patient, you observe a sudden change in breathing pattern and oxygen saturation. Which action should you take first?",
            "- A. Wait until the end of the shift to document the finding.",
            "- B. Assess the patient, support immediate safety, and promptly report the change through the appropriate chain of command.",
            "- C. Ask a visitor whether this happens often.",
            "- D. Continue routine care and recheck the patient tomorrow.",
            "",
            "Answer and Rationale",
            "Correct answer: B. A sudden respiratory change can signal impaired gas exchange or clinical deterioration. You should assess the patient, protect immediate safety, remain within your role, and communicate the change promptly so appropriate care can begin."
          ].join("\n")
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
