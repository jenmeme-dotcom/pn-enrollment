const legacyTitle = "[PN104 DAY 2026] Samantha Brunvil Midterm — Chapters 1–8 and 15–18";
const title = "[PN104 DAY 2026] Practice Midterm — Chapters 1–8 and 15–18";
const studentEmail = "samanthabrunvil2106@gmail.com";
const dueDate = "2026-09-04 23:59:59";

const rawQuestions = [
  ["A patient is lying face down. Which position should the nurse document?", "Prone", "Supine", "Fowler's", "Lithotomy"],
  ["Which cavity is separated from the abdominal cavity by the diaphragm?", "Thoracic cavity", "Pelvic cavity", "Cranial cavity", "Vertebral cavity"],
  ["A structure located closer to the body surface is described as:", "Superficial", "Deep", "Distal", "Inferior"],
  ["Which statement best describes positive feedback?", "The response strengthens the original stimulus until an endpoint occurs", "The response reverses every stimulus", "The response maintains an unchanging body state", "The response occurs only in the nervous system"],
  ["Which element is present in all organic molecules?", "Carbon", "Sodium", "Iron", "Calcium"],
  ["When an atom gains an electron, it becomes a:", "Negative ion", "Positive ion", "Neutron", "Isotope without charge"],
  ["Which reaction joins smaller molecules by removing water?", "Dehydration synthesis", "Hydrolysis", "Ionization", "Dissociation"],
  ["A buffer helps maintain homeostasis by:", "Resisting sudden changes in pH", "Producing ATP", "Destroying all acids", "Stopping osmosis"],
  ["Which plasma-membrane component helps control what enters and leaves the cell?", "Transport protein", "Chromosome", "Nucleolus", "Centriole"],
  ["A cell placed in a hypertonic solution will usually:", "Lose water and shrink", "Gain water and burst", "Remain unchanged in every case", "Begin mitosis immediately"],
  ["Which organelle modifies and packages proteins for secretion?", "Golgi apparatus", "Smooth endoplasmic reticulum", "Centriole", "Nucleolus"],
  ["During which phase of mitosis do chromosomes align at the cell equator?", "Metaphase", "Prophase", "Anaphase", "Telophase"],
  ["Which tissue forms glands and covers exposed body surfaces?", "Epithelial tissue", "Connective tissue", "Muscle tissue", "Nervous tissue"],
  ["Goblet cells primarily secrete:", "Mucus", "Collagen", "Calcium", "Hemoglobin"],
  ["Which connective-tissue fiber provides the greatest tensile strength?", "Collagen fiber", "Reticular fiber", "Elastic fiber", "Keratin fiber"],
  ["Cardiac muscle is best described as:", "Striated and involuntary", "Nonstriated and voluntary", "Striated and voluntary", "Nonstriated and multinucleated"],
  ["Which epidermal cells produce melanin?", "Melanocytes", "Keratinocytes only", "Fibroblasts", "Macrophages in bone"],
  ["Which skin structure raises a hair when it contracts?", "Arrector pili muscle", "Sebaceous gland", "Meissner corpuscle", "Nail matrix"],
  ["A full-thickness burn destroys:", "The epidermis and dermis", "Only the stratum corneum", "Only the hypodermis", "Bone but not skin"],
  ["Vitamin D produced with help from the skin supports absorption of:", "Calcium", "Sodium", "Glucose", "Oxygen"],
  ["Which hormone stimulates osteoclast activity when blood calcium is low?", "Parathyroid hormone", "Calcitonin", "Insulin", "Melatonin"],
  ["Longitudinal bone growth occurs at the:", "Epiphyseal plate", "Medullary cavity", "Periosteal artery", "Compact-bone osteon"],
  ["Which fracture breaks the skin?", "Open fracture", "Closed fracture", "Compression fracture", "Stress fracture"],
  ["Yellow bone marrow primarily stores:", "Fat", "Calcium salts", "Red blood cells", "Synovial fluid"],
  ["Which skull bone contains the foramen magnum?", "Occipital bone", "Frontal bone", "Temporal bone", "Sphenoid bone"],
  ["The dens is a projection on which vertebra?", "Axis", "Atlas", "Seventh cervical vertebra", "First thoracic vertebra"],
  ["True ribs attach directly to the sternum through:", "Their own costal cartilage", "The clavicle", "The scapula", "The lumbar vertebrae"],
  ["Which spinal curvature is normally present at birth?", "Thoracic curvature", "Cervical curvature", "Lumbar curvature", "No spinal curvature"],
  ["Which forearm bone is on the thumb side in anatomical position?", "Radius", "Ulna", "Humerus", "Scaphoid"],
  ["Which lower-leg bone bears most body weight?", "Tibia", "Fibula", "Patella", "Talus"],
  ["The glenoid cavity articulates with the:", "Head of the humerus", "Head of the femur", "Olecranon", "Clavicular shaft"],
  ["Which joint movement decreases the angle between two bones?", "Flexion", "Extension", "Abduction", "Circumduction"],
  ["Which neurotransmitter is released by most sympathetic postganglionic neurons?", "Norepinephrine", "Acetylcholine", "Glutamate", "GABA"],
  ["Sympathetic preganglionic neurons originate mainly in the:", "Thoracic and upper lumbar spinal cord", "Brainstem and sacral spinal cord", "Cerebral cortex only", "Cervical spinal cord only"],
  ["Stimulation of beta-1 receptors most directly causes:", "Increased heart rate", "Bronchoconstriction", "Pupil constriction", "Increased intestinal motility"],
  ["Parasympathetic stimulation generally causes the pupils to:", "Constrict", "Dilate", "Remain fixed", "Lose accommodation permanently"],
  ["Which cranial nerve controls facial expression?", "Facial nerve VII", "Trigeminal nerve V", "Optic nerve II", "Vagus nerve X"],
  ["A positive Babinski response in an adult is:", "Abnormal and may indicate corticospinal tract dysfunction", "A normal finding", "Evidence of normal hearing", "A test of cerebellar balance only"],
  ["Which test assesses coordination by asking the patient to touch the nose and examiner's finger?", "Finger-to-nose test", "Romberg test", "Snellen test", "Weber test"],
  ["Unequal pupils should be documented with the term:", "Anisocoria", "Ataxia", "Aphasia", "Areflexia"],
  ["Which gland secretes thyroid-stimulating hormone?", "Anterior pituitary", "Thyroid gland", "Posterior pituitary", "Adrenal medulla"],
  ["Excess growth hormone in an adult produces:", "Acromegaly", "Dwarfism", "Myxedema", "Tetany"],
  ["Aldosterone increases renal reabsorption of:", "Sodium", "Glucose", "Calcium exclusively", "Bicarbonate exclusively"],
  ["The adrenal medulla secretes primarily:", "Epinephrine and norepinephrine", "Cortisol and aldosterone", "Insulin and glucagon", "T3 and T4"],
  ["Which plasma protein contributes most to blood oncotic pressure?", "Albumin", "Fibrin", "Hemoglobin", "Heparin"],
  ["A person with type AB-positive blood has:", "A, B, and Rh antigens on red blood cells", "No red-cell antigens", "Only Rh antibodies", "Only A antigen"],
  ["Which white blood cell commonly increases during allergic reactions and parasitic infections?", "Eosinophil", "Neutrophil", "Monocyte", "Lymphocyte"],
  ["The intrinsic pathway of coagulation begins when:", "Blood contacts damaged vessel surfaces", "Tissue factor enters blood", "The spleen releases platelets", "Erythropoietin enters plasma"],
  ["Erythropoietin is released mainly by the kidneys in response to:", "Low blood oxygen", "High blood calcium", "High platelet count", "Low plasma glucose"],
  ["Which finding after a neurological assessment requires the most urgent report?", "New one-sided weakness and difficulty speaking", "Equal hand grips", "Pupils that constrict to light", "A steady gait"]
];

const questions = rawQuestions.map(([prompt, correct, ...distractors], index) => {
  const answer = (index * 3 + 1) % 4;
  const options = [...distractors];
  options.splice(answer, 0, correct);
  return { prompt, options, answer };
});

const content = `Canvas item type: Exam.\n\nPRIVATE PRACTICE MIDTERM FOR SAMANTHA BRUNVIL. Complete all 50 original questions covering Chapters 1–8 and 15–18. Select the one best answer. You have 60 minutes after selecting Start Now.\n\nQUIZ_DATA_BASE64:${Buffer.from(JSON.stringify(questions), "utf8").toString("base64")}`;

module.exports = { title, legacyTitle, studentEmail, dueDate, questions, content };
