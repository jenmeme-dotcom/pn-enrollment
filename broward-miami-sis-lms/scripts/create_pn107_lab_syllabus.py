from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "course_materials" / "medical-surgical-nursing-i-pn107-lab"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH = OUTPUT_DIR / "PN107-Lab-Syllabus-12-Weeks.docx"
LOGO_PATH = ROOT / "src" / "public" / "assets" / "bmhi-logo-transparent.png"

NAVY = "173B5E"
PALE_BLUE = "EAF2F7"
PALE_GRAY = "F4F6F8"
LIGHT_BORDER = "D9D9D9"


BASELINE_WEEKS = [
    {
        "week": 1,
        "hours": "2.0",
        "topic": "Asepsis and Infection Control",
        "outcomes": [
            "Perform hand hygiene using alcohol-based sanitizer and soap and water.",
            "Select, don, remove, and dispose of personal protective equipment safely.",
            "Create and maintain a sterile field without contaminating it.",
        ],
        "skills": [
            "Performing Hand Hygiene Using an Alcohol-Based Hand Sanitizer",
            "Performing Hand Hygiene Using Soap and Water (Handwashing)",
            "Using Personal Protective Equipment",
            "Preparing a Sterile Field Using a Packaged Sterile Drape",
            "Preparing a Sterile Field Using a Commercially Prepared Sterile Kit or Tray",
            "Adding Sterile Items to a Sterile Field",
            "Putting on Sterile Gloves and Removing Soiled Gloves",
        ],
    },
    {
        "week": 2,
        "hours": "1.5",
        "topic": "Foundations Safety and Vital Signs",
        "outcomes": [
            "Use two identifiers and verify allergies before care.",
            "Measure and document vital signs, pain, intake, and output accurately.",
            "Apply fall prevention and safe body mechanics during mobility assistance.",
        ],
        "skills": [
            "Identifying a Client and Verifying Allergies",
            "Measuring Temperature Pulse Respirations Blood Pressure and Pain",
            "Measuring Intake and Output",
            "Using a Transfer Belt and Preventing Falls",
        ],
    },
    {
        "week": 3,
        "hours": "1.5",
        "topic": "Health Assessment Documentation and Escalation",
        "outcomes": [
            "Complete an organized head-to-toe and focused assessment.",
            "Recognize abnormal findings and escalate concerns promptly.",
            "Document findings and deliver an accurate SBAR handoff.",
        ],
        "skills": [
            "Performing a Head-to-Toe Assessment",
            "Performing Focused Respiratory Cardiac Abdominal and Neurologic Assessments",
            "Collecting Specimens and Preparing a Client for Diagnostic Testing",
            "Documenting Care and Giving an SBAR Handoff",
        ],
    },
    {
        "week": 4,
        "hours": "1.5",
        "topic": "Oxygenation and Respiratory Care",
        "outcomes": [
            "Assess respiratory status and interpret pulse oximetry in context.",
            "Set up prescribed oxygen equipment and follow oxygen safety practices.",
            "Teach coughing, deep breathing, incentive spirometry, and inhaled medication technique.",
        ],
        "skills": [
            "Assessing Respiratory Status and Measuring Oxygen Saturation",
            "Administering Oxygen by Nasal Cannula and Face Mask",
            "Teaching Incentive Spirometry Coughing and Deep Breathing",
            "Administering an Inhaler or Nebulizer Treatment",
            "Performing Oral Suctioning in Simulation",
        ],
    },
    {
        "week": 5,
        "hours": "1.5",
        "topic": "Perfusion and Cardiovascular Care",
        "outcomes": [
            "Perform focused cardiac and peripheral vascular assessments.",
            "Obtain orthostatic vital signs and recognize perfusion changes.",
            "Apply ordered mechanical venous thromboembolism prevention safely.",
        ],
        "skills": [
            "Performing a Focused Cardiac and Peripheral Vascular Assessment",
            "Measuring Orthostatic Vital Signs",
            "Applying ECG or Telemetry Leads",
            "Assessing Peripheral Pulses Capillary Refill Edema and Neurovascular Status",
            "Applying Antiembolism Stockings and Sequential Compression Devices",
        ],
    },
    {
        "week": 6,
        "hours": "1.5",
        "topic": "Medication and Intravenous Safety",
        "outcomes": [
            "Use medication rights, reconcile orders, and complete required safety checks.",
            "Prepare and administer common nonintravenous medications in simulation.",
            "Verify infusion calculations and identify local or systemic IV complications.",
        ],
        "skills": [
            "Performing Medication Safety Checks and MAR Verification",
            "Administering Oral Medications",
            "Administering Subcutaneous and Intramuscular Injections",
            "Preparing and Administering Insulin Safely",
            "Assessing a Peripheral IV Site and Verifying an Infusion Pump",
            "Responding to Infiltration Phlebitis Occlusion or Fluid Overload",
        ],
    },
    {
        "week": 7,
        "hours": "1.5",
        "topic": "Neurologic and Sensory Care",
        "outcomes": [
            "Perform a focused neurologic assessment and trend changes.",
            "Apply seizure, aspiration, and fall precautions.",
            "Communicate safely with clients who have sensory impairments.",
        ],
        "skills": [
            "Performing a Focused Neurologic Assessment",
            "Assessing Pupils and Level of Consciousness Using the Glasgow Coma Scale",
            "Implementing Seizure Aspiration and Fall Precautions",
            "Assisting With Hearing Vision and Communication Needs",
        ],
    },
    {
        "week": 8,
        "hours": "1.5",
        "topic": "Nutrition and Gastrointestinal Care",
        "outcomes": [
            "Perform an abdominal assessment in the correct sequence.",
            "Maintain aspiration precautions during enteral nutrition simulation.",
            "Provide ostomy care and document gastrointestinal output accurately.",
        ],
        "skills": [
            "Performing an Abdominal Assessment",
            "Inserting and Caring for a Nasogastric Tube in Simulation",
            "Administering an Enteral Feeding and Maintaining Aspiration Precautions",
            "Providing Ostomy Care and Client Teaching",
            "Collecting a Stool Specimen and Documenting Output",
        ],
    },
    {
        "week": 9,
        "hours": "1.5",
        "topic": "Endocrine and Glucose Management",
        "outcomes": [
            "Measure capillary blood glucose and report critical results.",
            "Prepare and administer insulin safely in simulation.",
            "Recognize and respond to hypoglycemia and hyperglycemia.",
        ],
        "skills": [
            "Measuring Capillary Blood Glucose",
            "Preparing Insulin and Administering a Subcutaneous Injection",
            "Responding to Hypoglycemia and Hyperglycemia",
            "Teaching Glucose Monitoring Medication Nutrition and Sick-Day Safety",
        ],
    },
    {
        "week": 10,
        "hours": "1.5",
        "topic": "Urinary Renal and Musculoskeletal Care",
        "outcomes": [
            "Perform urinary catheter care and sterile insertion in simulation.",
            "Monitor fluid balance and collect urine specimens correctly.",
            "Use safe transfer, mobility, and neurovascular assessment techniques.",
        ],
        "skills": [
            "Inserting an Indwelling Urinary Catheter in Simulation",
            "Providing Catheter Care and Collecting a Sterile Urine Specimen",
            "Monitoring Intake Output Daily Weight and Fluid Balance",
            "Assisting With Transfer Ambulation Range of Motion and Assistive Devices",
            "Performing Neurovascular Checks and Applying Cast or Traction Precautions",
        ],
    },
    {
        "week": 11,
        "hours": "1.5",
        "topic": "Skin Integrity Wound and Perioperative Care",
        "outcomes": [
            "Assess skin and wounds and identify pressure injury risk.",
            "Perform a sterile dressing change and document drains and output.",
            "Apply safe preoperative and postoperative nursing checks.",
        ],
        "skills": [
            "Assessing Skin Wounds and Pressure Injury Risk",
            "Measuring and Documenting a Wound",
            "Performing a Sterile Dressing Change",
            "Emptying and Documenting a Closed-Suction Drain",
            "Completing Preoperative and Postoperative Safety Checks",
        ],
    },
    {
        "week": 12,
        "hours": "3.0",
        "topic": "Integrated Medical Surgical Competency Checkoff",
        "outcomes": [
            "Integrate assessment, medication, IV, infection-control, and safety skills.",
            "Recognize deterioration and initiate the correct chain of escalation.",
            "Complete an accurate final SBAR report and nursing note.",
        ],
        "skills": [
            "Integrated Head-to-Toe Assessment Checkoff",
            "Medication and IV Safety Checkoff",
            "Recognizing Deterioration and Initiating Rapid Response",
            "Final SBAR Handoff and Documentation Checkoff",
        ],
    },
]


# Convert the fourteen instructional blocks to a twelve-week calendar exactly
# as approved: source Weeks 1-2 share calendar Week 1, source Weeks 3-11 become
# calendar Weeks 2-10, source Weeks 12-13 share calendar Week 11, and source
# Week 14 remains the integrated Week 12 checkoff. The existing baseline data
# already combines source Weeks 10-11 and source Weeks 12-13, so the urinary /
# musculoskeletal block is split below while the Week 11 block remains merged.
WEEKS = [
    {
        "week": 1,
        "hours": "3.5",
        "topic": "Asepsis Infection Control Safety and Vital Signs",
        "outcomes": BASELINE_WEEKS[0]["outcomes"] + BASELINE_WEEKS[1]["outcomes"],
        "skills": BASELINE_WEEKS[0]["skills"] + BASELINE_WEEKS[1]["skills"],
    },
    *[
        {**week, "week": index + 2}
        for index, week in enumerate(BASELINE_WEEKS[2:9])
    ],
    {
        "week": 9,
        "hours": "0.75",
        "topic": "Urinary and Renal Care",
        "outcomes": [
            "Perform urinary catheter care and sterile insertion in simulation.",
            "Monitor fluid balance and collect urine specimens correctly.",
        ],
        "skills": BASELINE_WEEKS[9]["skills"][:3],
    },
    {
        "week": 10,
        "hours": "0.75",
        "topic": "Musculoskeletal Care",
        "outcomes": [
            "Use safe transfer mobility and assistive-device techniques.",
            "Perform neurovascular checks and apply cast or traction precautions.",
        ],
        "skills": BASELINE_WEEKS[9]["skills"][3:],
    },
    {**BASELINE_WEEKS[10], "week": 11},
    {**BASELINE_WEEKS[11], "week": 12},
]


def shade_cell(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_border(cell, color=LIGHT_BORDER, size="6"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.find(qn("w:tcBorders"))
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        node = borders.find(qn(tag))
        if node is None:
            node = OxmlElement(tag)
            borders.append(node)
        node.set(qn("w:val"), "single")
        node.set(qn("w:sz"), size)
        node.set(qn("w:color"), color)


def set_cell_margins(cell, top=90, start=100, bottom=90, end=100):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_row_cant_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    if tr_pr.find(qn("w:cantSplit")) is None:
        tr_pr.append(OxmlElement("w:cantSplit"))


def set_font(run, name="Arial", size=11, bold=False, color="000000"):
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), name)
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)


def add_bullet(doc, text, level=0):
    paragraph = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    paragraph.paragraph_format.space_after = Pt(2)
    set_font(paragraph.add_run(text), size=10.5)
    return paragraph


def add_link(paragraph, text, url):
    part = paragraph.part
    rel_id = part.relate_to(url, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", is_external=True)
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), rel_id)
    run = OxmlElement("w:r")
    r_pr = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "0563C1")
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    r_pr.append(color)
    r_pr.append(underline)
    run.append(r_pr)
    text_node = OxmlElement("w:t")
    text_node.text = text
    run.append(text_node)
    hyperlink.append(run)
    paragraph._p.append(hyperlink)


def add_heading(doc, text, level=1):
    p = doc.add_paragraph(style=f"Heading {level}")
    p.paragraph_format.space_before = Pt(12 if level == 1 else 8)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.keep_with_next = True
    set_font(p.add_run(text), size=15 if level == 1 else 12, bold=True)
    return p


def configure_styles(doc):
    normal = doc.styles["Normal"]
    normal.font.name = "Arial"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Arial")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
    normal.font.size = Pt(11)
    normal.font.color.rgb = RGBColor(0, 0, 0)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.08

    title = doc.styles["Title"]
    title.font.name = "Arial"
    title._element.rPr.rFonts.set(qn("w:ascii"), "Arial")
    title._element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
    title.font.size = Pt(24)
    title.font.bold = True
    title.font.color.rgb = RGBColor(0, 0, 0)
    title_p_pr = title._element.get_or_add_pPr()
    title_border = title_p_pr.find(qn("w:pBdr"))
    if title_border is not None:
        title_p_pr.remove(title_border)

    for level, size in ((1, 15), (2, 12)):
        style = doc.styles[f"Heading {level}"]
        style.font.name = "Arial"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Arial")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(0, 0, 0)


def add_metadata_table(doc):
    table = doc.add_table(rows=6, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width = Inches(2.0)
    table.columns[1].width = Inches(4.4)
    entries = [
        ("Course number", "PN 107 Lab"),
        ("Course title", "Medical-Surgical Nursing Skills Lab"),
        ("Length", "12 weeks  |  20 on-campus lab hours with online preparation"),
        ("Relationship to PN 107", "Companion lab for the 20 hours already included in PN 107; these are not additional program hours."),
        ("Faculty", "Stacy Milan  |  (954) 558-5174  |  sabahadur84@gmail.com"),
        ("Required product", "Lippincott Skills for Nursing Education 2.0"),
    ]
    for index, (label, value) in enumerate(entries):
        left, right = table.rows[index].cells
        shade_cell(left, PALE_BLUE)
        if index % 2:
            shade_cell(right, PALE_GRAY)
        for cell in (left, right):
            set_cell_border(cell)
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        left.paragraphs[0].paragraph_format.space_after = Pt(0)
        right.paragraphs[0].paragraph_format.space_after = Pt(0)
        set_font(left.paragraphs[0].add_run(label), size=10.5, bold=True)
        set_font(right.paragraphs[0].add_run(value), size=10.5)
    doc.add_paragraph()


def add_week_table(doc):
    table = doc.add_table(rows=1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    widths = [0.55, 0.65, 1.75, 3.55]
    for index, width in enumerate(widths):
        table.columns[index].width = Inches(width)
    headers = ["Week", "Hours", "Topic", "Required Lippincott preparation and lab skills"]
    for cell, text in zip(table.rows[0].cells, headers):
        shade_cell(cell, NAVY)
        set_cell_border(cell)
        set_cell_margins(cell, 100, 110, 100, 110)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        set_font(p.add_run(text), size=9.5, bold=True, color="FFFFFF")
    set_repeat_table_header(table.rows[0])

    for row_index, week in enumerate(WEEKS, 1):
        row = table.add_row()
        set_row_cant_split(row)
        cells = row.cells
        if row_index % 2 == 0:
            for cell in cells:
                shade_cell(cell, PALE_GRAY)
        for cell in cells:
            set_cell_border(cell)
            set_cell_margins(cell, 90, 100, 90, 100)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        for index, value in enumerate((str(week["week"]), week["hours"], week["topic"])):
            p = cells[index].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if index < 2 else WD_ALIGN_PARAGRAPH.LEFT
            set_font(p.add_run(value), size=9.5, bold=index == 2)
        skills_cell = cells[3]
        skills_cell.paragraphs[0]._element.getparent().remove(skills_cell.paragraphs[0]._element)
        for skill in week["skills"]:
            p = skills_cell.add_paragraph(style="List Bullet")
            p.paragraph_format.space_after = Pt(0)
            set_font(p.add_run(skill), size=9.0)
    return table


def add_week_details(doc):
    for index, week in enumerate(WEEKS):
        # Two weekly plans per page keeps each heading with its content and
        # avoids spillover-only pages when a week has a longer skills list.
        if index > 0 and index % 2 == 0:
            doc.add_page_break()
        add_heading(doc, f"Week {week['week']} {week['topic']}", 1)
        p = doc.add_paragraph()
        set_font(p.add_run(f"Scheduled lab time: {week['hours']} hours"), size=10.5, bold=True)
        p.paragraph_format.space_after = Pt(4)
        for outcome in week["outcomes"]:
            add_bullet(doc, outcome)
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(3)
        set_font(p.add_run("Assigned Lippincott skill videos and checklists"), size=10.5, bold=True)
        for skill in week["skills"]:
            add_bullet(doc, skill)
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(2)
        set_font(p.add_run("Student completion steps: "), size=10.5, bold=True)
        set_font(p.add_run("Open the BMHI Skills Lab in Lippincott, review the matching overview, watch the assigned video, review the publisher checklist, submit the requested preparation evidence in the portal, and attend the scheduled lab checkoff."), size=10.5)


def add_completion_record(doc):
    doc.add_page_break()
    add_heading(doc, "Twelve Week Completion Record", 1)
    p = doc.add_paragraph("Students may use this record to monitor preparation. The instructor records official competency status in the portal after direct observation.")
    p.paragraph_format.space_after = Pt(8)
    table = doc.add_table(rows=1, cols=5)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    widths = [0.55, 2.35, 1.0, 1.0, 1.6]
    for index, width in enumerate(widths):
        table.columns[index].width = Inches(width)
    headers = ["Week", "Topic", "Video reviewed", "Evidence submitted", "Instructor checkoff"]
    for cell, text in zip(table.rows[0].cells, headers):
        shade_cell(cell, NAVY)
        set_cell_border(cell)
        set_cell_margins(cell)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        set_font(p.add_run(text), size=9, bold=True, color="FFFFFF")
    set_repeat_table_header(table.rows[0])
    for index, week in enumerate(WEEKS, 1):
        row = table.add_row()
        set_row_cant_split(row)
        cells = row.cells
        if index % 2 == 0:
            for cell in cells:
                shade_cell(cell, PALE_GRAY)
        values = [str(week["week"]), week["topic"], "[   ]", "[   ]", "[   ] Complete   [   ] Remediate"]
        for column, (cell, value) in enumerate(zip(cells, values)):
            set_cell_border(cell)
            set_cell_margins(cell, 120, 100, 120, 100)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if column != 1 else WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_after = Pt(0)
            set_font(p.add_run(value), size=9)


def build_document():
    doc = Document()
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.7)
    section.bottom_margin = Inches(0.65)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)
    configure_styles(doc)

    if LOGO_PATH.exists():
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(8)
        p.add_run().add_picture(str(LOGO_PATH), width=Inches(2.65))

    title = doc.add_paragraph(style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_after = Pt(4)
    title_run = title.add_run("PN 107 Lab: Medical-Surgical Nursing Skills Lab")
    set_font(title_run, name="Arial", size=24, bold=True)

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.paragraph_format.space_after = Pt(14)
    set_font(subtitle.add_run("Twelve Week Course Syllabus"), size=14, bold=True)

    add_metadata_table(doc)

    add_heading(doc, "Course Purpose", 1)
    doc.add_paragraph(
        "This companion course organizes the 20 on-campus skills-lab hours already included in PN 107 Medical-Surgical Nursing I. Students prepare online with Lippincott Skills for Nursing Education 2.0, submit the requested preparation evidence in the BMHI student portal, and demonstrate each assigned skill during supervised lab. Portal completion alone does not establish clinical competency."
    )

    add_heading(doc, "Course Outcomes", 1)
    outcomes = [
        "Apply standard precautions, aseptic technique, patient identification, and safety practices during medical-surgical care.",
        "Perform focused assessments, recognize abnormal findings, and communicate changes using SBAR and accurate documentation.",
        "Demonstrate safe medication, oxygen, nutrition, elimination, mobility, skin, wound, and IV-related skills within the practical nurse role and school policy.",
        "Recognize deterioration, initiate the appropriate chain of escalation, and participate in emergency response within the student role.",
        "Use evidence-based preparation and instructor feedback to remediate and repeat skills until competency is demonstrated.",
    ]
    for item in outcomes:
        add_bullet(doc, item)

    add_heading(doc, "Lippincott Access and Weekly Preparation", 1)
    steps = [
        "Sign in to thePoint using the account assigned to you by the school.",
        "Open My Content, select BMHI Skills Lab or Skills Lab Cohort 2, and open Lippincott Skills for Nursing Education 2.0.",
        "Search for the exact skill title listed in the weekly module. Open the publisher overview, video, quiz when assigned, and checklist.",
        "Return to the BMHI portal and submit the requested preparation evidence before the in-person lab.",
        "Bring questions to lab and complete the instructor-observed checkoff. Repeat any skill marked for remediation.",
    ]
    for step in steps:
        add_bullet(doc, step)
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    set_font(p.add_run("Lippincott sign in: "), size=10.5, bold=True)
    add_link(p, "https://thepoint.lww.com/gateway", "https://thepoint.lww.com/gateway")

    add_heading(doc, "Competency and Completion Requirements", 1)
    requirements = [
        "Complete assigned Lippincott preparation and portal evidence before each scheduled lab.",
        "Attend scheduled lab sessions and follow uniform, identification, privacy, safety, and infection-control requirements.",
        "Demonstrate all critical safety steps and complete every required instructor checkoff.",
        "A checklist status of Complete requires direct instructor observation. Student self-attestation or portal lesson completion does not substitute for evaluation.",
        "A status of Remediate requires additional preparation and a repeat checkoff. The instructor determines the remediation plan and deadline.",
        "Never practice an invasive procedure on a person unless the instructor has authorized and is supervising the activity in accordance with school policy.",
    ]
    for item in requirements:
        add_bullet(doc, item)

    add_heading(doc, "Attendance and Professional Conduct", 1)
    doc.add_paragraph(
        "Regular and punctual attendance is required. Students must maintain the institutional minimum attendance standard and must complete all required skill checkoffs. Students will protect confidentiality, use respectful communication, remain within the student role, report hazards or injuries immediately, and follow instructor directions for equipment and simulation use."
    )

    doc.add_page_break()
    add_heading(doc, "Twelve Week Lab Schedule", 1)
    p = doc.add_paragraph(
        "The schedule totals 20 lab hours. To convert the fourteen instructional blocks to twelve calendar weeks, calendar Week 1 combines source Weeks 1 and 2, source Weeks 3 through 11 become calendar Weeks 2 through 10, calendar Week 11 combines source Weeks 12 and 13, and source Week 14 remains calendar Week 12. No instructional block is removed. The instructor may adjust the order to coordinate equipment, clinical access, and student remediation while preserving the required competencies."
    )
    p.paragraph_format.space_after = Pt(8)
    add_week_table(doc)

    add_week_details(doc)
    add_completion_record(doc)

    footer = section.footer
    footer_p = footer.paragraphs[0]
    footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer_p.paragraph_format.space_before = Pt(4)
    set_font(footer_p.add_run("Broward-Miami Health Institute  |  PN 107 Lab  |  12 weeks  |  20 lab hours"), size=8.5, color="4F5B66")

    doc.core_properties.title = "PN 107 Lab Medical Surgical Nursing Skills Lab Twelve Week Syllabus"
    doc.core_properties.subject = "Twelve-week medical-surgical nursing skills lab syllabus"
    doc.core_properties.author = "Broward-Miami Health Institute"
    doc.save(OUTPUT_PATH)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    build_document()
