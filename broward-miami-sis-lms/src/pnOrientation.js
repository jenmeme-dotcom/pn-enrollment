const fs = require("node:fs");
const path = require("node:path");
const { escapeHtml } = require("./ui");

const PN_ORIENTATION_PATH = "/student/lpn-orientation";
const PN_ORIENTATION_LESSON_TITLE = "LPN Program Orientation with Nurse Joy";
const PN_ORIENTATION_DIRECTORY = "lpn-program-orientation";
const PN_ORIENTATION_FILES = Object.freeze({
  video: "nurse-joy-lpn-welcome.mp4",
  poster: "nurse-joy-lpn-welcome-poster.jpg",
  transcript: "transcript.txt"
});

function hasPnOrientationAccess(db, userId) {
  if (userId === undefined || userId === null) return false;
  return Boolean(db.prepare(`
    SELECT e.id
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ?
      AND e.status IN ('active', 'completed')
      AND e.withdrawn_at IS NULL
      AND (c.slug = 'practical-nursing' OR c.category = 'Practical Nursing Course')
    LIMIT 1
  `).get(userId));
}

function renderPnOrientationCard() {
  return `
    <section class="pn-orientation-card" aria-labelledby="pn-orientation-card-title">
      <a class="pn-orientation-card-poster" href="${PN_ORIENTATION_PATH}" aria-label="Watch LPN program orientation with Nurse Joy">
        <img src="${PN_ORIENTATION_PATH}/poster" alt="Nurse Joy in nursing scrubs" width="1920" height="1080" loading="lazy">
        <span class="pn-orientation-play" aria-hidden="true">▶</span>
        <span class="pn-orientation-duration">4:16</span>
      </a>
      <div class="pn-orientation-card-copy">
        <h2 id="pn-orientation-card-title">Start Here: LPN Program Orientation</h2>
        <p>Nurse Joy explains all four terms, course hours, skills lab, and clinical learning.</p>
        <p class="pn-orientation-reminder"><strong>Complete Complio requirements before starting clinicals.</strong></p>
        <a class="button small" href="${PN_ORIENTATION_PATH}">Watch orientation</a>
        <a class="pn-orientation-transcript-link" href="${PN_ORIENTATION_PATH}#transcript">Read transcript</a>
      </div>
    </section>
  `;
}

function renderPnOrientationPageContent(transcript = "") {
  const paragraphs = String(transcript).trim().split(/\r?\n\s*\r?\n/).filter(Boolean);
  const transcriptHtml = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\r?\n/g, "<br>")}</p>`).join("\n");
  return `
    <article class="pn-orientation-page">
      <header class="pn-orientation-page-head">
        <p class="pn-orientation-eyebrow">Practical Nursing · Start Here</p>
        <h1>${PN_ORIENTATION_LESSON_TITLE}</h1>
        <p>Your four-term program, course hours, skills lab, and clinical learning.</p>
        <p class="pn-orientation-meta">4 minutes 16 seconds · Captions included</p>
      </header>
      <div class="pn-orientation-player">
        <video controls preload="metadata" playsinline poster="${PN_ORIENTATION_PATH}/poster" aria-label="LPN program orientation with Nurse Joy">
          <source src="${PN_ORIENTATION_PATH}/video" type="video/mp4">
          Your browser cannot play this video. Use the download link below to watch it on your device.
        </video>
      </div>
      <p class="pn-orientation-reminder"><strong>Complete Complio requirements before starting clinicals.</strong> Check your account early and follow up on outstanding items.</p>
      <div class="pn-orientation-actions">
        <a href="${PN_ORIENTATION_PATH}/video" download="Nurse_Joy_LPN_Program_Welcome.mp4">Download video</a>
        <a href="${PN_ORIENTATION_PATH}/transcript" download="LPN_Program_Orientation_Transcript.txt">Download transcript</a>
        <a href="/student/dashboard">Back to Dashboard</a>
      </div>
      <details class="pn-orientation-transcript" id="transcript" open>
        <summary>Read video transcript</summary>
        <div>${transcriptHtml || "<p>The transcript is not available yet.</p>"}</div>
      </details>
    </article>
  `;
}

function registerPnOrientationMediaRoutes({ app, db, requireAuth, requireRole, courseMaterialsDir, mediaDirectory, isClassLocked = () => false }) {
  const materialDirectory = mediaDirectory ? path.resolve(mediaDirectory) : path.resolve(courseMaterialsDir, PN_ORIENTATION_DIRECTORY);
  const requirePnAccess = (req, res, next) => {
    if (isClassLocked(req.user)) return res.status(403).send("Class access is locked.");
    if (!hasPnOrientationAccess(db, req.user.id)) return res.status(403).send("This orientation is available to Practical Nursing students.");
    next();
  };
  const media = [
    ["video", "video/mp4"],
    ["poster", "image/jpeg"],
    ["transcript", "text/plain; charset=utf-8"]
  ];
  for (const [resource, contentType] of media) {
    app.get(`${PN_ORIENTATION_PATH}/${resource}`, requireAuth, requireRole("student"), requirePnAccess, (req, res) => {
      const filePath = path.join(materialDirectory, PN_ORIENTATION_FILES[resource]);
      try {
        if (!fs.statSync(filePath).isFile()) return res.status(404).send("Orientation resource not found.");
      } catch (error) {
        if (error.code === "ENOENT" || error.code === "ENOTDIR") return res.status(404).send("Orientation resource not found.");
        throw error;
      }
      res.set({
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${PN_ORIENTATION_FILES[resource]}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff"
      });
      return res.sendFile(filePath, { cacheControl: false, acceptRanges: true });
    });
  }
}

module.exports = {
  PN_ORIENTATION_PATH,
  PN_ORIENTATION_LESSON_TITLE,
  PN_ORIENTATION_DIRECTORY,
  PN_ORIENTATION_FILES,
  hasPnOrientationAccess,
  renderPnOrientationCard,
  renderPnOrientationPageContent,
  registerPnOrientationMediaRoutes
};
