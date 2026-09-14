const path = require("node:path");
const PDFDocument = require("pdfkit");

const colors = {
  navy: "#17375C",
  teal: "#0B5661",
  tealLight: "#E8F3F5",
  ink: "#263746",
  muted: "#5C6D79",
  line: "#CFD9DF",
  paper: "#FFFFFF",
  soft: "#F5F8FA"
};

const logoPath = path.join(__dirname, "public", "assets", "bmhi-logo-transparent.png");

function pdfText(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function syllabusPdfFilename(courseCode = "", courseTitle = "") {
  const identifier = pdfText(courseCode || courseTitle || "course")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "course";
  return `${identifier}-course-syllabus.pdf`;
}

function displayDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "See course modules";
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return pdfText(raw);
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(parsed);
}

function generatedDateLabel(value = new Date()) {
  const parsed = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York"
  }).format(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
}

function pageContentWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function pageBottom(doc) {
  // Reserve a narrow footer band while keeping every text operation inside
  // PDFKit's writable content area. Writing below the bottom margin can
  // silently create additional pages while buffered pages are finalized.
  return doc.page.height - doc.page.margins.bottom - 24;
}

function drawRunningHeader(doc, model) {
  const left = doc.page.margins.left;
  const width = pageContentWidth(doc);
  doc.save();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(colors.teal)
    .text(pdfText(model.instituteName), left, 25, { width: width * 0.58, lineBreak: false });
  doc.font("Helvetica").fontSize(8).fillColor(colors.muted)
    .text(`${pdfText(model.courseCode)} Course Syllabus`, left + width * 0.58, 25, {
      align: "right",
      width: width * 0.42,
      lineBreak: false
    });
  doc.moveTo(left, 42).lineTo(left + width, 42).lineWidth(0.7).strokeColor(colors.line).stroke();
  doc.restore();
  doc.x = left;
  doc.y = 58;
}

function ensureSpace(doc, minimumHeight) {
  if (doc.y + minimumHeight > pageBottom(doc)) doc.addPage();
}

function addSectionHeading(doc, title) {
  // Keep a heading with at least the first line, bullet, or table row that
  // follows it so pages never end with an orphaned section label.
  ensureSpace(doc, 100);
  const left = doc.page.margins.left;
  const width = pageContentWidth(doc);
  doc.moveDown(0.55);
  doc.font("Helvetica-Bold").fontSize(14).fillColor(colors.teal)
    .text(pdfText(title), left, doc.y, { width });
  doc.moveTo(left, doc.y + 3).lineTo(left + width, doc.y + 3)
    .lineWidth(1).strokeColor(colors.tealLight).stroke();
  doc.moveDown(0.55);
}

function addParagraph(doc, value, options = {}) {
  const text = pdfText(value);
  if (!text) return;
  ensureSpace(doc, 30);
  doc.font(options.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.fontSize || 9.5)
    .fillColor(options.color || colors.ink)
    .text(text, {
      align: options.align || "left",
      lineGap: 2,
      paragraphGap: options.paragraphGap ?? 5,
      width: pageContentWidth(doc)
    });
}

function addBullets(doc, items = []) {
  items.filter(Boolean).forEach((item) => {
    const text = pdfText(item);
    ensureSpace(doc, Math.max(24, doc.heightOfString(text, { width: pageContentWidth(doc) - 20 }) + 10));
    const y = doc.y;
    doc.circle(doc.page.margins.left + 3, y + 5, 1.7).fillColor(colors.teal).fill();
    doc.font("Helvetica").fontSize(9.5).fillColor(colors.ink)
      .text(text, doc.page.margins.left + 14, y, {
        lineGap: 2,
        paragraphGap: 5,
        width: pageContentWidth(doc) - 14
      });
  });
}

function drawTable(doc, { headers, rows, widths }) {
  const left = doc.page.margins.left;
  const totalWidth = pageContentWidth(doc);
  const normalizedWidths = widths.map((width) => width * totalWidth);
  const padding = 6;

  function rowHeight(cells, header = false) {
    doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(header ? 8 : 8.5);
    return Math.max(
      header ? 26 : 25,
      ...cells.map((cell, index) => doc.heightOfString(pdfText(cell), {
        width: Math.max(10, normalizedWidths[index] - padding * 2),
        lineGap: 1
      }) + padding * 2)
    );
  }

  function paintRow(cells, { header = false, shaded = false } = {}) {
    const height = rowHeight(cells, header);
    const y = doc.y;
    let x = left;
    cells.forEach((cell, index) => {
      const width = normalizedWidths[index];
      doc.save();
      doc.rect(x, y, width, height).fillColor(header ? colors.teal : shaded ? colors.soft : colors.paper).fill();
      doc.rect(x, y, width, height).lineWidth(0.5).strokeColor(colors.line).stroke();
      doc.font(header ? "Helvetica-Bold" : "Helvetica")
        .fontSize(header ? 8 : 8.5)
        .fillColor(header ? colors.paper : colors.ink)
        .text(pdfText(cell), x + padding, y + padding, {
          lineGap: 1,
          width: width - padding * 2
        });
      doc.restore();
      x += width;
    });
    doc.x = left;
    doc.y = y + height;
  }

  ensureSpace(doc, rowHeight(headers, true) + 28);
  paintRow(headers, { header: true });
  rows.forEach((row, index) => {
    const height = rowHeight(row, false);
    if (doc.y + height > pageBottom(doc)) {
      doc.addPage();
      paintRow(headers, { header: true });
    }
    paintRow(row, { shaded: index % 2 === 1 });
  });
  doc.moveDown(0.7);
}

function addDetailGrid(doc, details = []) {
  const rows = details.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");
  if (!rows.length) return;
  drawTable(doc, {
    headers: ["Course Detail", "Information"],
    rows: rows.map(([label, value]) => [label, value]),
    widths: [0.34, 0.66]
  });
}

function addCoverHeader(doc, model) {
  const width = doc.page.width;
  doc.rect(0, 0, width, 82).fillColor(colors.navy).fill();
  try {
    doc.image(logoPath, 48, 14, { fit: [52, 52], align: "center", valign: "center" });
  } catch {
    // The text header remains complete if the optional image cannot be read.
  }
  doc.font("Helvetica-Bold").fontSize(16).fillColor(colors.paper)
    .text(pdfText(model.instituteName), 112, 20, { width: width - 160 });
  doc.font("Helvetica").fontSize(9).fillColor("#D9EDF1")
    .text(`${pdfText(model.instituteAddress)}  |  ${pdfText(model.institutePhone)}  |  ${pdfText(model.instituteEmail)}`, 112, 45, {
      width: width - 160
    });

  const left = doc.page.margins.left;
  doc.y = 108;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(colors.teal).text("COURSE SYLLABUS", left, doc.y, {
    characterSpacing: 1.2,
    width: pageContentWidth(doc)
  });
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(colors.navy)
    .text(pdfText(model.courseCode), { width: pageContentWidth(doc) });
  doc.font("Helvetica-Bold").fontSize(22).fillColor(colors.ink)
    .text(pdfText(model.courseTitle), { lineGap: 2, width: pageContentWidth(doc) });
  doc.moveDown(0.25);
  doc.font("Helvetica").fontSize(8.5).fillColor(colors.muted)
    .text(`Generated from the current BMHI course record on ${generatedDateLabel(model.generatedAt)}.`, {
      width: pageContentWidth(doc)
    });
  doc.moveDown(0.6);
}

function addPageFooters(doc, model) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const left = doc.page.margins.left;
    const width = pageContentWidth(doc);
    const y = doc.page.height - doc.page.margins.bottom - 12;
    doc.save();
    doc.moveTo(left, y - 8).lineTo(left + width, y - 8).lineWidth(0.5).strokeColor(colors.line).stroke();
    doc.font("Helvetica").fontSize(7.5).fillColor(colors.muted)
      .text(`${pdfText(model.courseCode)} Course Syllabus`, left, y, {
        lineBreak: false,
        width: width * 0.72
      });
    doc.text(`Page ${index - range.start + 1} of ${range.count}`, left + width * 0.72, y, {
      align: "right",
      lineBreak: false,
      width: width * 0.28
    });
    doc.restore();
  }
}

function writeCourseSyllabusPdf(output, model) {
  const normalizedModel = {
    instituteName: "Broward-Miami Health Institute",
    instituteAddress: "6320 Miramar Pkwy Suite I, Miramar, FL 33023",
    institutePhone: "954-248-0669",
    instituteEmail: "support@browardmiamihi.com",
    courseTitle: "Course",
    courseCode: "Course",
    courseDescription: "",
    courseHours: "",
    courseCategory: "",
    courseCredential: "",
    courseDelivery: "",
    objectives: [],
    requiredTitles: [],
    policies: [],
    weeklySchedule: [],
    discussions: [],
    syllabusDetails: {},
    tallyRows: [],
    assignmentRows: [],
    upcomingRows: [],
    generatedAt: new Date(),
    ...model
  };

  const doc = new PDFDocument({
    autoFirstPage: true,
    bufferPages: true,
    compress: true,
    info: {
      Author: normalizedModel.instituteName,
      Creator: `${normalizedModel.instituteName} Student Portal`,
      Subject: `${normalizedModel.courseCode} course syllabus`,
      Title: `${normalizedModel.courseCode} - ${normalizedModel.courseTitle} Course Syllabus`
    },
    margins: { top: 54, right: 48, bottom: 52, left: 48 },
    size: "LETTER"
  });

  doc.on("pageAdded", () => drawRunningHeader(doc, normalizedModel));
  doc.pipe(output);
  addCoverHeader(doc, normalizedModel);

  addSectionHeading(doc, "Course Overview");
  addParagraph(doc, normalizedModel.courseDescription || "Course information and requirements are maintained in the BMHI learning management system.");
  addDetailGrid(doc, [
    ["Course code", normalizedModel.courseCode],
    ["Clock hours", normalizedModel.courseHours],
    ["Program area", normalizedModel.courseCategory],
    ["Credential", normalizedModel.courseCredential],
    ["Course length", normalizedModel.syllabusDetails?.length],
    ["Delivery", normalizedModel.syllabusDetails?.delivery || normalizedModel.courseDelivery]
  ]);

  if (normalizedModel.objectives.length) {
    addSectionHeading(doc, "Course Objectives");
    addBullets(doc, normalizedModel.objectives);
  }

  if (normalizedModel.requiredTitles.length) {
    addSectionHeading(doc, "Required Textbook and Course Materials");
    addBullets(doc, normalizedModel.requiredTitles);
    addParagraph(doc, "Electronic course files are available to signed-in students from the Files navigation for this course.", { color: colors.muted });
  }

  addSectionHeading(doc, "Course Assignments and Grade Tally");
  const totalPoints = normalizedModel.assignmentRows.reduce((sum, item) => sum + Number(item.points_possible || 0), 0);
  addParagraph(doc, `Total course points currently listed: ${totalPoints} points`, { bold: true });
  if (normalizedModel.tallyRows.length) {
    drawTable(doc, {
      headers: ["Assignment Type", "Points"],
      rows: normalizedModel.tallyRows.map((row) => [row.type, row.points]),
      widths: [0.72, 0.28]
    });
  }
  if (normalizedModel.assignmentRows.length) {
    drawTable(doc, {
      headers: ["Assignment", "Due Date", "Points"],
      rows: normalizedModel.assignmentRows.map((item) => [
        item.title,
        displayDate(item.due_date),
        Number(item.points_possible || 0)
      ]),
      widths: [0.58, 0.27, 0.15]
    });
  } else {
    addParagraph(doc, "No graded assignments are currently listed. Refer to course modules for the latest requirements.", { color: colors.muted });
  }

  if (normalizedModel.weeklySchedule.length) {
    addSectionHeading(doc, "Weekly Course Schedule");
    drawTable(doc, {
      headers: ["Week", "Topic and Required Reading", "Assessment", "Due Date"],
      rows: normalizedModel.weeklySchedule.map((week) => [
        `Week ${week.week}`,
        [week.title, week.chapters].filter(Boolean).join(" - "),
        week.assessment || week.assignmentTitle || "Module activities",
        week.dueDate ? displayDate(week.dueDate) : "See course calendar"
      ]),
      widths: [0.11, 0.39, 0.32, 0.18]
    });
  }

  if (normalizedModel.discussions.length) {
    addSectionHeading(doc, "Discussion Schedule");
    addParagraph(doc, "Complete the initial response and required classmate reply by the posted deadline. Use professional language and protect patient confidentiality.");
    drawTable(doc, {
      headers: ["Week", "Discussion", "Due Date", "Points"],
      rows: normalizedModel.discussions.map((discussion) => [
        `Week ${discussion.week}`,
        String(discussion.title || "").replace(/^\[[^\]]+\]\s*/, ""),
        discussion.dueDate ? displayDate(discussion.dueDate) : "See course calendar",
        Number(discussion.pointsPossible || 0)
      ]),
      widths: [0.11, 0.51, 0.23, 0.15]
    });
  }

  if (normalizedModel.policies.length) {
    addSectionHeading(doc, "Course Policies and Expectations");
    normalizedModel.policies.forEach(([label, value]) => {
      ensureSpace(doc, 38);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.navy)
        .text(pdfText(label), { paragraphGap: 3, width: pageContentWidth(doc) });
      addParagraph(doc, value);
    });
  }

  if (normalizedModel.upcomingRows.length) {
    // Keep this short summary together instead of leaving a single table row
    // stranded at the top of the final page.
    ensureSpace(doc, 240);
    addSectionHeading(doc, "Course Summary");
    drawTable(doc, {
      headers: ["Estimated Time", "Course Item"],
      rows: normalizedModel.upcomingRows.map((lesson) => [
        `${Number(lesson.duration_minutes || 0)} minutes`,
        lesson.title
      ]),
      widths: [0.24, 0.76]
    });
  }

  addPageFooters(doc, normalizedModel);
  doc.end();
  return doc;
}

function createCourseSyllabusPdfBuffer(model) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const output = new (require("node:stream").PassThrough)();
    output.on("data", (chunk) => chunks.push(chunk));
    output.on("end", () => resolve(Buffer.concat(chunks)));
    output.on("error", reject);
    const doc = writeCourseSyllabusPdf(output, model);
    doc.on("error", reject);
  });
}

module.exports = {
  createCourseSyllabusPdfBuffer,
  syllabusPdfFilename,
  writeCourseSyllabusPdf
};
