"use strict";

const FUNDAMENTALS_SLUG = "fundamental-nursing-skills-and-concepts-new-cohort";
const SUPPORTING_ACTIVITY_NOTE = "CoursePoint activity results are supporting details and do not add extra course points. Category scores require instructor allocation under the syllabus.";

function markCoursePointActivities(database, course, items = []) {
  const slug = course.slug || course.course_slug || course.courseSlug || "";
  const mappedIds = new Set();
  if (slug === FUNDAMENTALS_SLUG && database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'coursepoint_import_items'").get()) {
    const mappings = database.prepare(`
      SELECT mapped.grade_item_id
      FROM coursepoint_import_items mapped JOIN courses c ON c.id = mapped.course_id
      WHERE c.slug = ?
    `).all(FUNDAMENTALS_SLUG);
    for (const mapping of mappings) mappedIds.add(Number(mapping.grade_item_id));
  }
  return items.map((item) => ({ ...item, supporting_activity: mappedIds.has(Number(item.id)) }));
}

function summarizeCourseGradePoints(rows = []) {
  const requiredRows = rows.filter((row) => !row.supporting_activity && Number(row.points_possible) > 0 &&
    !(/syllabus/i.test(String(row.title || "")) && /acknowledg(?:e)?ment/i.test(String(row.title || ""))));
  const scoredRows = requiredRows.filter((row) => row.score !== null && row.score !== undefined &&
    Number.isFinite(Number(row.score)) && row.status !== "pending");
  const supportingActivityCount = rows.filter((row) => row.supporting_activity).length;
  const earned = scoredRows.reduce((sum, row) => sum + Number(row.score), 0);
  const possible = requiredRows.reduce((sum, row) => sum + Number(row.points_possible), 0);
  return {
    earned, possible,
    percentage: possible > 0 ? earned / possible * 100 : null,
    gradedCount: scoredRows.length,
    requiredCount: requiredRows.length,
    supportingActivityCount,
    supportingActivityNote: supportingActivityCount ? SUPPORTING_ACTIVITY_NOTE : ""
  };
}

module.exports = { FUNDAMENTALS_SLUG, SUPPORTING_ACTIVITY_NOTE, markCoursePointActivities, summarizeCourseGradePoints };
