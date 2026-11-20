const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { TextDecoder } = require("node:util");
const multer = require("multer");
const { PN_ORIENTATION_FILES } = require("./pnOrientation");

const ADMIN_ORIENTATION_PATH = "/admin/lpn-orientation";
const MAX_VIDEO_BYTES = 75 * 1024 * 1024;
const MAX_POSTER_BYTES = 5 * 1024 * 1024;
const MAX_TRANSCRIPT_BYTES = 200 * 1024;
const FILE_FIELDS = Object.keys(PN_ORIENTATION_FILES);

function renderUploadForm(saved) {
  return `
    <section class="stack">
      <div class="section-head">
        <div>
          <h1>LPN program orientation</h1>
          <p>Update the welcome video, its poster, and the written transcript.</p>
        </div>
        <a class="button ghost" href="/admin">Back to Dashboard</a>
      </div>
      ${saved ? `<p class="flash" role="status">The LPN orientation video, poster, and transcript have been saved.</p>` : ""}
      <article class="card">
        <h2>Upload the finished orientation</h2>
        <p>Choose all three files together. The poster should show Nurse Joy with her mouth naturally closed before she starts speaking.</p>
        <form method="post" action="${ADMIN_ORIENTATION_PATH}/media" enctype="multipart/form-data">
          <label>Welcome video (MP4, up to 75 MB)
            <input type="file" name="video" accept=".mp4,video/mp4" required>
          </label>
          <label>Video poster (JPEG, up to 5 MB)
            <input type="file" name="poster" accept=".jpg,.jpeg,image/jpeg" required>
          </label>
          <label>Written transcript (UTF-8 text, up to 200 KB)
            <input type="file" name="transcript" accept=".txt,text/plain" required>
          </label>
          <button type="submit">Save orientation media</button>
        </form>
      </article>
    </section>
  `;
}

function validationError(message) {
  const error = new Error(message);
  error.orientationValidation = true;
  return error;
}

function readHeader(filePath, length) {
  const descriptor = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(length);
    const count = fs.readSync(descriptor, buffer, 0, length, 0);
    return buffer.subarray(0, count);
  } finally {
    fs.closeSync(descriptor);
  }
}

function validateUploads(files) {
  if (!files || FILE_FIELDS.some((field) => files[field]?.length !== 1)) {
    throw validationError("Choose one video, one poster, and one transcript together.");
  }
  const video = files.video[0];
  if (!video.size || video.size > MAX_VIDEO_BYTES) throw validationError("The MP4 video must be no larger than 75 MB.");
  const videoHeader = readHeader(video.path, 12);
  if (videoHeader.length < 12 || videoHeader.toString("ascii", 4, 8) !== "ftyp"
      || videoHeader.readUInt32BE(0) < 12 || videoHeader.readUInt32BE(0) > video.size) {
    throw validationError("The welcome video must be a valid MP4 file.");
  }

  const poster = files.poster[0];
  if (!poster.size || poster.size > MAX_POSTER_BYTES) throw validationError("The JPEG poster must be no larger than 5 MB.");
  const posterHeader = readHeader(poster.path, 2);
  if (posterHeader.length !== 2 || posterHeader[0] !== 0xff || posterHeader[1] !== 0xd8) {
    throw validationError("The video poster must be a JPEG file.");
  }

  const transcript = files.transcript[0];
  if (!transcript.size || transcript.size > MAX_TRANSCRIPT_BYTES) throw validationError("The transcript must be no larger than 200 KB.");
  const transcriptBytes = fs.readFileSync(transcript.path);
  let transcriptText;
  try {
    transcriptText = new TextDecoder("utf-8", { fatal: true }).decode(transcriptBytes);
  } catch {
    throw validationError("The transcript must use UTF-8 text.");
  }
  if (transcriptBytes.includes(0) || !transcriptText.trim()) {
    throw validationError("The transcript must contain readable text without NUL characters.");
  }
}

function installUploads(files, mediaDirectory, temporaryDirectory) {
  // Backups are copies: existing media stays available until each replacement
  // is atomically renamed into place, and failures can restore the old set.
  const existing = new Map();
  const installed = [];
  for (const field of FILE_FIELDS) {
    const destination = path.join(mediaDirectory, PN_ORIENTATION_FILES[field]);
    const backup = path.join(temporaryDirectory, `previous-${field}`);
    try {
      const stat = fs.lstatSync(destination);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Orientation media destination is not a regular file.");
      fs.copyFileSync(destination, backup);
      existing.set(field, backup);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  try {
    for (const field of FILE_FIELDS) {
      const destination = path.join(mediaDirectory, PN_ORIENTATION_FILES[field]);
      fs.chmodSync(files[field][0].path, 0o600);
      fs.renameSync(files[field][0].path, destination);
      installed.push(field);
    }
  } catch (error) {
    let restorationFailed = false;
    for (const field of installed.reverse()) {
      const destination = path.join(mediaDirectory, PN_ORIENTATION_FILES[field]);
      try {
        if (existing.has(field)) fs.renameSync(existing.get(field), destination);
        else fs.rmSync(destination, { force: true });
      } catch {
        restorationFailed = true;
      }
    }
    // Preserve recovery copies if the filesystem itself prevented rollback.
    if (restorationFailed) error.preserveOrientationRecovery = true;
    throw error;
  }
}

function registerPnOrientationUploadRoutes({ app, requireAuth, requireRole, render, mediaDirectory }) {
  const destinationDirectory = path.resolve(mediaDirectory);
  const storage = multer.diskStorage({
    destination: (req, _file, callback) => callback(null, req.pnOrientationUploadDirectory),
    filename: (_req, _file, callback) => callback(null, crypto.randomUUID())
  });
  const upload = multer({
    storage,
    limits: { fileSize: MAX_VIDEO_BYTES, files: 3, fields: 0, parts: 6 }
  }).fields(FILE_FIELDS.map((name) => ({ name, maxCount: 1 })));

  app.get(ADMIN_ORIENTATION_PATH, requireAuth, requireRole("admin"), (req, res) => {
    res.set("Cache-Control", "private, no-store");
    render(req, res, "LPN program orientation", renderUploadForm(req.query.saved === "1"));
  });

  app.post(`${ADMIN_ORIENTATION_PATH}/media`, requireAuth, requireRole("admin"), (req, res, next) => {
    let temporaryDirectory;
    try {
      const incoming = path.join(destinationDirectory, ".incoming");
      fs.mkdirSync(incoming, { recursive: true, mode: 0o700 });
      temporaryDirectory = fs.mkdtempSync(path.join(incoming, "request-"));
      fs.chmodSync(temporaryDirectory, 0o700);
      req.pnOrientationUploadDirectory = temporaryDirectory;
    } catch (error) {
      return next(error);
    }

    const cleanup = () => fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    upload(req, res, (uploadError) => {
      if (uploadError) {
        cleanup();
        return res.status(400).send("Upload one MP4 video, one JPEG poster, and one text transcript within the listed size limits.");
      }
      try {
        validateUploads(req.files);
        installUploads(req.files, destinationDirectory, temporaryDirectory);
        cleanup();
        return res.redirect(303, `${ADMIN_ORIENTATION_PATH}?saved=1`);
      } catch (error) {
        if (!error.preserveOrientationRecovery) cleanup();
        if (error.orientationValidation) return res.status(400).send(error.message);
        return next(error);
      }
    });
  });
}

module.exports = { registerPnOrientationUploadRoutes };
