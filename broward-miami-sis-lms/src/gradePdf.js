const PDFDocument = require("pdfkit");
const { PassThrough } = require("node:stream");

const palette = { navy: "#17375C", teal: "#0B5661", ink: "#263746", muted: "#5C6D79", line: "#CFD9DF", soft: "#F2F7F9", white: "#FFFFFF" };

function pdfText(value = "") {
  return String(value ?? "").normalize("NFKC")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...").replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, "")
    .replace(/\s+/g, " ").trim();
}

function numberLabel(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function gradePdfFilename(courseCode = "course") {
  const code = pdfText(courseCode).replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "course";
  return `${code}-student-grades.pdf`;
}

function gradeReportRow(row) {
  const points = Number(row.points_possible);
  const hasScore = row.status !== "pending" && row.score !== null && row.score !== undefined && row.score !== "" && Number.isFinite(Number(row.score));
  let status = hasScore ? "Graded" : "Not yet graded";
  if (row.status === "pending") status = "Pending review";
  else if (row.status === "completed") status = "Completed";
  else if (row.status === "incomplete") status = "Incomplete";
  else if (row.status === "submitted_ungraded") status = "Submitted; awaiting grade";
  else if (row.status === "missing") status = "Missing; no posted grade";
  else if (row.attempt_status === "started") status = "Started; not submitted";
  else if (row.attempt_status === "retake") status = "Retake in progress; saved grade retained";
  return {
    title: pdfText(row.title),
    supporting: Boolean(row.supporting_activity),
    gradingPending: Boolean(row.grading_pending),
    due: row.project_due_week
      ? pdfText(row.due_date) || `Week ${Number(row.project_due_week)}; calendar date pending`
      : "",
    points: row.grading_pending ? "Grading allocation pending" : points > 0 ? numberLabel(points) : "Status only",
    score: hasScore ? numberLabel(row.score) : "-",
    status,
    hasScore
  };
}

function createStudentGradePdfBuffer(model) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const output = new PassThrough();
    output.on("data", chunk => chunks.push(chunk));
    output.on("end", () => resolve(Buffer.concat(chunks)));
    output.on("error", reject);
    const doc = new PDFDocument({
      size: "LETTER", margins: { top: 54, right: 44, bottom: 48, left: 44 }, bufferPages: true,
      info: {
        Title: `${pdfText(model.courseCode)} - Student Grade Report`,
        Author: pdfText(model.instituteName || "Broward-Miami Health Institute"),
        Subject: "Student assignment results and posted final grade",
        Creator: "BMHI Student Portal"
      }
    });
    doc.on("error", reject);
    doc.pipe(output);
    const left = 44;
    const width = 524;
    const bottom = 716;
    const courseCode = pdfText(model.courseCode || "Course");
    const student = pdfText(model.studentName || "Student");
    const rows = (model.rows || []).map(gradeReportRow);
    const supportingCount = rows.filter(row => row.supporting).length;

    function continuationHeader() {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(palette.teal)
        .text(`${courseCode} | Student Grade Report`, left, 27, { width: 300, lineBreak: false });
      doc.font("Helvetica").fontSize(8).fillColor(palette.muted)
        .text(student, 344, 27, { width: 224, align: "right", lineBreak: false });
      doc.moveTo(left, 43).lineTo(left + width, 43).strokeColor(palette.line).stroke();
      doc.x = left;
      doc.y = 57;
    }
    doc.on("pageAdded", continuationHeader);

    function ensureSpace(height) {
      if (doc.y + height > bottom) doc.addPage();
    }

    function paragraph(text, { bold = false, size = 9, color = palette.ink } = {}) {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size);
      const normalized = pdfText(text);
      ensureSpace(doc.heightOfString(normalized, { width, lineGap: 2 }) + 8);
      doc.fillColor(color).text(normalized, left, doc.y, { width, lineGap: 2 });
      doc.moveDown(0.45);
    }

    function heading(text) {
      // Keep section introductions with the table header and its first row.
      ensureSpace(160);
      doc.moveDown(0.45);
      paragraph(text, { bold: true, size: 12, color: palette.teal });
    }

    function table(headers, tableRows, fractions) {
      const widths = fractions.map(fraction => fraction * width);
      const padding = 6;
      function height(cells, header) {
        doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
        return Math.max(27, ...cells.map((cell, i) => doc.heightOfString(pdfText(cell), { width: widths[i] - padding * 2, lineGap: 1 }) + padding * 2));
      }
      function paint(cells, header = false, shade = false) {
        const h = height(cells, header);
        const y = doc.y;
        let x = left;
        cells.forEach((cell, i) => {
          doc.rect(x, y, widths[i], h).fill(header ? palette.teal : shade ? palette.soft : palette.white);
          doc.rect(x, y, widths[i], h).lineWidth(0.5).stroke(palette.line);
          doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor(header ? palette.white : palette.ink)
            .text(pdfText(cell), x + padding, y + padding, { width: widths[i] - padding * 2, lineGap: 1 });
          x += widths[i];
        });
        doc.x = left;
        doc.y = y + h;
      }
      ensureSpace(height(headers, true) + (tableRows.length ? height(tableRows[0]) : 30));
      paint(headers, true);
      tableRows.forEach((cells, index) => {
        if (doc.y + height(cells) > bottom) {
          doc.addPage();
          paint(headers, true);
        }
        paint(cells, false, index % 2 === 1);
      });
      doc.moveDown(0.6);
    }

    try {
      doc.rect(0, 0, 612, 77).fill(palette.navy);
      doc.font("Helvetica-Bold").fontSize(17).fillColor(palette.white)
        .text(pdfText(model.instituteName || "Broward-Miami Health Institute"), left, 20, { width });
      doc.font("Helvetica").fontSize(10).fillColor("#D9EDF1").text("STUDENT GRADE REPORT", left, 48, { width });
      doc.y = 98;
      paragraph(model.courseTitle, { bold: true, size: 17, color: palette.navy });
      paragraph(`${courseCode} | ${student} | Student ID: ${model.studentNumber || "Not recorded"}`, { bold: true });
      paragraph(model.studentEmail, { color: palette.muted });
      const generated = new Date(model.generatedAt || Date.now());
      paragraph(`Generated ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(generated)} (Eastern Time)`, { size: 8, color: palette.muted });

      heading(model.officialFinalGrade ? "Posted Official Final Grade" : "Provisional Progress Report");
      paragraph(model.officialFinalGrade ? `Official final grade posted by the school: ${model.officialFinalGrade}` : "Official final grade: Not posted", { bold: true });
      const summary = model.summary || {};
      paragraph(`Recorded course points: ${numberLabel(summary.earned || 0)} / ${numberLabel(summary.possible || 0)} (provisional; course items only).`, { bold: true });
      paragraph(`Posted course grades: ${Number(summary.gradedCount || 0)} of ${Number(summary.requiredCount || 0)} scored course items. The available-points total includes required items that do not yet have a posted score.`);
      paragraph("This report lists posted assignment results. Missing scores and pending reviews remain ungraded; a dash is not a zero. A posted zero is shown as 0. Status-only activities have no numeric score.", { color: palette.muted });
      if (supportingCount) {
        paragraph(`${supportingCount} supporting activities are listed separately below. ${summary.supportingActivityNote || "These results do not add course points and require instructor allocation under the syllabus."} No course percentage or letter grade is calculated from these activities.`, { color: palette.muted });
      }
      if (rows.some(row => row.gradingPending)) {
        paragraph(model.projectGradingNote || "Project grading points and category allocation are pending instructor confirmation. These submission sections do not add points to the course total.", { color: palette.muted });
        paragraph("Project due weeks are relative to this course. Calendar dates will be posted after the instructor confirms the schedule.", { color: palette.muted });
      }
      paragraph("This is a progress report, not an official transcript. Completion and the official final grade are determined by the school under the course syllabus.", { size: 8, color: palette.muted });

      const coreRows = rows.filter(row => !row.supporting);
      const supportingRows = rows.filter(row => row.supporting);
      const assignmentLabel = row => row.due ? `${row.title} | Due: ${row.due}` : row.title;
      const toCells = row => [assignmentLabel(row), row.points, row.score, row.status];
      heading("Course Assignment Results");
      if (coreRows.length) table(["Assignment", "Points possible", "Posted score", "Status"], coreRows.map(toCells), [0.49, 0.15, 0.13, 0.23]);
      else paragraph("No scored course assignments are currently listed.");
      if (supportingRows.length) {
        heading("Supporting Activity Results");
        paragraph("Activity points describe each activity's scale only. They are not additional syllabus course points.", { color: palette.muted });
        table(["Supporting activity", "Activity points", "Posted score", "Status"], supportingRows.map(toCells), [0.49, 0.15, 0.13, 0.23]);
      }

      if ((model.syllabusGradeRows || []).length || (model.syllabusPolicies || []).length) {
        heading("Syllabus Grading Requirements");
        paragraph("The following requirements come from the course syllabus. Activity results alone do not establish clinical competency or course completion.", { color: palette.muted });
        if ((model.syllabusGradeRows || []).length) {
          table(["Syllabus category / assessment", "Points"], model.syllabusGradeRows.map(item => {
            const row = gradeReportRow(item);
            return [assignmentLabel(row), row.points];
          }), [0.77, 0.23]);
        }
        (model.syllabusPolicies || []).forEach(([label, value]) => paragraph(`${label}: ${value}`));
      }

      const range = doc.bufferedPageRange();
      for (let index = range.start; index < range.start + range.count; index += 1) {
        doc.switchToPage(index);
        doc.moveTo(left, 726).lineTo(left + width, 726).lineWidth(0.5).stroke(palette.line);
        doc.font("Helvetica").fontSize(7.5).fillColor(palette.muted)
          .text(`${courseCode} | Private student record`, left, 732, { width: 390, lineBreak: false })
          .text(`Page ${index + 1} of ${range.count}`, 434, 732, { width: 134, align: "right", lineBreak: false });
      }
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}

module.exports = { createStudentGradePdfBuffer, gradePdfFilename, gradeReportRow };
