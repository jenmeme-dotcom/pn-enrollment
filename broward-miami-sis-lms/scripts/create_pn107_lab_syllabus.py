import json
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


# The shared portal catalog is the single authoritative list for both the LMS
# and this downloadable syllabus. It contains every enumerated video title in
# the supplied 20-page Medical Surgical Nursing I Skills Lab syllabus.
VIDEO_CATALOG_PATH = ROOT / "src" / "pn107LabVideoCatalog.json"
VIDEO_CATALOG = json.loads(VIDEO_CATALOG_PATH.read_text(encoding="utf-8"))
WEEK_HOURS = ["3.5", "1.5", "1.5", "1.5", "1.5", "1.5", "1.5", "1.5", "0.75", "0.75", "1.5", "3.0"]
WEEK_OUTCOMES = [
    [
        "Perform hand hygiene, personal protective equipment, sterile-field, and sterile-glove procedures safely.",
        "Measure, interpret, and document temperature, pulse, respirations, and blood pressure using the assigned methods.",
    ],
    [
        "Complete an organized general survey and body-system assessment using inspection, palpation, percussion, and auscultation.",
        "Apply fall-risk reduction, restraint alternatives, and approved restraint procedures while protecting client safety and dignity.",
    ],
    [
        "Apply medication rights and safety checks across oral, enteral, topical, eye, ear, nasal, vaginal, rectal, inhaled, and injectable routes.",
        "Prepare and administer assigned injections and intravenous medications in simulation and recognize findings that require escalation.",
    ],
    [
        "Provide safe preoperative and postoperative care, including breathing, coughing, splinting, leg exercises, and warming measures.",
        "Provide assigned bathing, oral, denture, contact-lens, hair, shave, nail, and bed-making care while maintaining privacy and safety.",
    ],
    [
        "Prevent pressure injury and perform assigned wound, drain, irrigation, culture, negative-pressure, suture, and staple procedures.",
        "Apply heat, cold, and sitz-bath therapies safely and document findings, output, interventions, and response.",
    ],
    [
        "Reposition, transfer, lift, ambulate, and provide range-of-motion exercises using safe body mechanics and assistive devices.",
        "Apply and monitor compression devices, slings, bandages, casts, traction, and external fixation precautions.",
    ],
    [
        "Promote comfort and safely support transcutaneous stimulation, patient-controlled, epidural, and wound-perfusion analgesia.",
        "Assist with eating, nasogastric placement verification, tube feeding, and gastrostomy care while preventing aspiration.",
    ],
    [
        "Provide urinary elimination care, catheterization, irrigation, diversion, suprapubic-catheter, and dialysis-access support.",
        "Provide bowel elimination, enema, stool-removal, fecal-device, ostomy, colostomy-irrigation, and nasogastric procedures safely.",
    ],
    [
        "Assess oxygenation and administer prescribed oxygen through assigned delivery devices.",
        "Perform assigned airway, endotracheal, tracheostomy, chest-drainage, chest-tube, and manual-resuscitation procedures in simulation.",
    ],
    [
        "Perform cardiopulmonary resuscitation and assigned automated or manual emergency defibrillation procedures.",
        "Obtain an ECG and safely apply or monitor a cardiac monitor, transcutaneous pacemaker, and arterial-catheter removal.",
    ],
    [
        "Initiate and monitor peripheral intravenous therapy and safely manage solution, tubing, dressings, flushing, blood, and central access.",
        "Apply cervical-collar and seizure precautions and care for assigned halo, ventriculostomy, and intracranial-monitoring devices.",
    ],
    [
        "Collect assigned respiratory, urine, stool, capillary, venous, central-line, and arterial specimens using correct technique.",
        "Integrate assessment, safety, clinical reasoning, nursing-process, and communication skills during instructor-directed case simulations.",
    ],
]
WEEKS = [
    {
        "week": catalog_week["week"],
        "hours": WEEK_HOURS[index],
        "topic": catalog_week["title"],
        "source_topics": catalog_week["sourceTopics"],
        "video_count": catalog_week["videoCount"],
        "integrated_case_studies": catalog_week.get("integratedCaseStudies", False),
        "outcomes": WEEK_OUTCOMES[index],
        "skills": [f"Skill {video['code']}: {video['title']}" for video in catalog_week["videos"]],
    }
    for index, catalog_week in enumerate(VIDEO_CATALOG["weeks"])
]

assert VIDEO_CATALOG["totalVideos"] == 191
assert sum(week["video_count"] for week in WEEKS) == 191
assert sum(float(week["hours"]) for week in WEEKS) == 20.0


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
        skills_cell.paragraphs[0].paragraph_format.space_after = Pt(0)
        summary = f"{week['source_topics']}  |  {week['video_count']} required videos"
        if week["integrated_case_studies"]:
            summary += "  |  Integrated case studies"
        set_font(skills_cell.paragraphs[0].add_run(summary), size=9.0)
    return table


def add_week_details(doc):
    for index, week in enumerate(WEEKS):
        # Start each weekly index on a fresh page. Longer weeks may continue
        # naturally, but the next week never begins in the prior week's list.
        if index > 0:
            doc.add_page_break()
        add_heading(doc, f"Week {week['week']} {week['topic']}", 1)
        p = doc.add_paragraph()
        set_font(p.add_run(f"Scheduled lab time: {week['hours']} hours  |  Source: {week['source_topics']}  |  Required videos: {week['video_count']}"), size=10.0, bold=True)
        p.paragraph_format.space_after = Pt(4)
        for outcome in week["outcomes"]:
            add_bullet(doc, outcome)
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(3)
        set_font(p.add_run("Assigned Lippincott skill videos and checklists"), size=10.5, bold=True)
        for skill in week["skills"]:
            skill_paragraph = doc.add_paragraph(style="List Bullet")
            skill_paragraph.paragraph_format.space_after = Pt(0)
            skill_paragraph.paragraph_format.line_spacing = 1.0
            set_font(skill_paragraph.add_run(skill), size=8.6)
        if week["integrated_case_studies"]:
            integrated = doc.add_paragraph(style="List Bullet")
            integrated.paragraph_format.space_after = Pt(0)
            set_font(integrated.add_run("Integrated case studies: complete the instructor-directed simulations using all previously assigned skills."), size=8.6, bold=True)
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
        "The schedule totals 20 lab hours and retains every item in the official source syllabus. Calendar Week 1 combines Asepsis and Infection Control with Vital Signs. Calendar Weeks 2 through 10 retain the next subject blocks in sequence. Calendar Week 11 combines Fluid, Electrolyte, and Acid-Base Balance with Neurologic Care. Calendar Week 12 combines Laboratory Specimen Collection with Integrated Case Studies. No source topic or enumerated Lippincott video is omitted. The instructor may adjust delivery order to coordinate equipment, clinical access, and remediation while preserving all required preparation."
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
