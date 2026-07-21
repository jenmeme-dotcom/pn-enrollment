require("dotenv").config({ quiet: true });

const { db, initialize } = require("../src/db");

initialize();

const canvasBaseUrl = (process.env.CANVAS_BASE_URL || "https://hic.instructure.com").replace(/\/+$/, "");
const canvasToken = process.env.CANVAS_API_TOKEN || process.env.CANVAS_ACCESS_TOKEN;

const courseMappings = [
  {
    slug: "medical-terminology",
    canvasCourseId: process.env.CANVAS_MEDICAL_TERMINOLOGY_COURSE_ID || process.env.CANVAS_PN101_COURSE_ID || "283"
  },
  {
    slug: "introduction-to-nursing-practical-nursing",
    canvasCourseId: process.env.CANVAS_INTRO_NURSING_COURSE_ID || process.env.CANVAS_PN102_COURSE_ID || "282"
  },
  {
    slug: "long-term-care-nursing-pn103",
    canvasCourseId: process.env.CANVAS_LONG_TERM_CARE_NURSING_COURSE_ID || process.env.CANVAS_PN103_COURSE_ID
  }
].filter((mapping) => mapping.canvasCourseId);

function usage() {
  console.log(`
Canvas discussion importer

Required environment:
  CANVAS_API_TOKEN=your_canvas_access_token
  # or CANVAS_ACCESS_TOKEN=your_canvas_access_token

Optional environment:
  CANVAS_BASE_URL=https://hic.instructure.com
  CANVAS_MEDICAL_TERMINOLOGY_COURSE_ID=283
  CANVAS_INTRO_NURSING_COURSE_ID=your_intro_nursing_canvas_id

Run:
  node --no-warnings scripts/import-canvas-discussions.js
`);
}

function htmlToText(value = "") {
  return String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function canvasRequest(pathname) {
  if (!canvasToken) {
    usage();
    throw new Error("CANVAS_API_TOKEN is required to import live Canvas discussion replies.");
  }
  const response = await fetch(`${canvasBaseUrl}${pathname}`, {
    headers: {
      Authorization: `Bearer ${canvasToken}`,
      Accept: "application/json"
    }
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Canvas request failed ${response.status} ${pathname}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : null;
}

function findLocalUser({ displayName = "", email = "" }) {
  if (email) {
    const byEmail = db.prepare("SELECT * FROM users WHERE lower(email) = lower(?)").get(email);
    if (byEmail) return byEmail;
  }
  const parts = String(displayName).trim().split(/\s+/);
  if (parts.length >= 2) {
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ");
    const byName = db.prepare(`
      SELECT *
      FROM users
      WHERE lower(first_name) = lower(?) AND lower(last_name) = lower(?)
      LIMIT 1
    `).get(firstName, lastName);
    if (byName) return byName;
  }
  return null;
}

function flattenEntries(entries = [], participantsById = new Map(), parentId = null, output = []) {
  entries.forEach((entry) => {
    const participant = participantsById.get(Number(entry.user_id)) || {};
    output.push({
      ...entry,
      parentCanvasId: parentId,
      displayName: entry.user_name || participant.display_name || participant.name || "Canvas User",
      email: participant.email || ""
    });
    flattenEntries(entry.replies || [], participantsById, entry.id, output);
  });
  return output;
}

const upsertTopic = db.prepare(`
  INSERT INTO discussion_topics (
    course_id, title, prompt, points_possible, due_at, status, source_url, source_external_id, posted_by, posted_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(course_id, title) DO UPDATE SET
    prompt = CASE WHEN excluded.prompt != '' THEN excluded.prompt ELSE discussion_topics.prompt END,
    points_possible = excluded.points_possible,
    due_at = COALESCE(excluded.due_at, discussion_topics.due_at),
    status = excluded.status,
    source_url = excluded.source_url,
    source_external_id = excluded.source_external_id
`);

const insertEntry = db.prepare(`
  INSERT INTO discussion_entries (
    topic_id, user_id, parent_id, author_name, author_email, body, source, source_external_id, posted_at
  )
  SELECT ?, ?, ?, ?, ?, ?, 'canvas', ?, ?
  WHERE NOT EXISTS (
    SELECT 1
    FROM discussion_entries
    WHERE topic_id = ? AND source = 'canvas' AND source_external_id = ?
  )
`);

async function importCourse(mapping) {
  const localCourse = db.prepare("SELECT * FROM courses WHERE slug = ?").get(mapping.slug);
  if (!localCourse) {
    console.log(`Skipping ${mapping.slug}: local course not found.`);
    return { topics: 0, replies: 0 };
  }

  const topics = await canvasRequest(`/api/v1/courses/${mapping.canvasCourseId}/discussion_topics?per_page=100`);
  let importedTopics = 0;
  let importedReplies = 0;

  for (const topic of topics) {
    const view = await canvasRequest(`/api/v1/courses/${mapping.canvasCourseId}/discussion_topics/${topic.id}/view?per_page=100`);
    const participantsById = new Map((view.participants || []).map((participant) => [Number(participant.id), participant]));
    const prompt = htmlToText(view.message || topic.message || "");
    const postedAt = topic.posted_at || topic.created_at || new Date().toISOString();
    const status = topic.locked_for_user || topic.locked ? "closed" : topic.published === false ? "draft" : "published";
    const sourceUrl = `${canvasBaseUrl}/courses/${mapping.canvasCourseId}/discussion_topics/${topic.id}`;
    upsertTopic.run(
      localCourse.id,
      topic.title,
      prompt,
      Number(topic.assignment?.points_possible || 0),
      topic.assignment?.due_at || topic.delayed_post_at || null,
      status,
      sourceUrl,
      String(topic.id),
      null,
      postedAt
    );
    importedTopics += 1;

    const savedTopic = db.prepare("SELECT id FROM discussion_topics WHERE course_id = ? AND title = ?").get(localCourse.id, topic.title);
    const canvasIdToLocalId = new Map();
    const flatEntries = flattenEntries(view.view || [], participantsById);
    for (const entry of flatEntries) {
      const localUser = findLocalUser({ displayName: entry.displayName, email: entry.email });
      const parentLocalId = entry.parentCanvasId ? canvasIdToLocalId.get(Number(entry.parentCanvasId)) || null : null;
      const result = insertEntry.run(
        savedTopic.id,
        localUser?.id || null,
        parentLocalId,
        entry.displayName,
        entry.email || localUser?.email || null,
        htmlToText(entry.message || ""),
        String(entry.id),
        entry.created_at || postedAt,
        savedTopic.id,
        String(entry.id)
      );
      const existing = db.prepare(`
        SELECT id
        FROM discussion_entries
        WHERE topic_id = ? AND source = 'canvas' AND source_external_id = ?
      `).get(savedTopic.id, String(entry.id));
      if (existing) canvasIdToLocalId.set(Number(entry.id), existing.id);
      if (result.changes) importedReplies += 1;
    }
  }

  console.log(`Imported ${importedTopics} topic(s), ${importedReplies} new repl${importedReplies === 1 ? "y" : "ies"} for ${localCourse.title}.`);
  return { topics: importedTopics, replies: importedReplies };
}

(async () => {
  if (!courseMappings.length) {
    usage();
    throw new Error("No Canvas course mappings configured.");
  }
  let totalTopics = 0;
  let totalReplies = 0;
  for (const mapping of courseMappings) {
    const result = await importCourse(mapping);
    totalTopics += result.topics;
    totalReplies += result.replies;
  }
  console.log(`Done. Checked ${totalTopics} topic(s) and imported ${totalReplies} new repl${totalReplies === 1 ? "y" : "ies"}.`);
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
