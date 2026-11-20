const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { after, before, beforeEach, describe, test } = require("node:test");
const express = require("express");
const { PN_ORIENTATION_FILES } = require("../src/pnOrientation");
const { registerPnOrientationUploadRoutes } = require("../src/pnOrientationUpload");

// These are synthetic format fixtures, not school media. Every filesystem
// operation below is limited to a test-owned temporary directory.
function mp4Fixture(label) {
  const header = Buffer.alloc(12);
  header.writeUInt32BE(12, 0);
  header.write("ftyp", 4, "ascii");
  header.write("isom", 8, "ascii");
  return Buffer.concat([header, Buffer.from(label)]);
}

const original = {
  video: mp4Fixture("original video"),
  poster: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]),
  transcript: Buffer.from("Original LPN orientation transcript.")
};
const replacement = {
  video: mp4Fixture("updated video"),
  poster: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 3, 4]),
  transcript: Buffer.from("Welcome to the LPN program. Complete Complio before clinicals.")
};

function formData({ files = replacement, omit, extraField = false } = {}) {
  const form = new FormData();
  for (const [field, type] of [["video", "video/mp4"], ["poster", "image/jpeg"], ["transcript", "text/plain"]]) {
    if (field === omit) continue;
    // Client filenames are deliberately not canonical and must not become paths.
    form.append(field, new Blob([files[field]], { type }), `../../client-${field}`);
  }
  if (extraField) form.append("unexpected", new Blob(["not allowed"]), "other.txt");
  return form;
}

describe("private LPN orientation provisioning", { concurrency: false }, () => {
  let temporaryRoot;
  let mediaDirectory;
  let server;
  let baseUrl;

  before(async () => {
    temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-pn-upload-test-"));
    mediaDirectory = path.join(temporaryRoot, "private-orientation");
    const app = express();
    const requireAuth = (req, res, next) => {
      const role = req.get("x-test-role");
      if (!role) return res.sendStatus(401);
      req.user = { id: 1, role };
      next();
    };
    const requireRole = (role) => (req, res, next) => req.user.role === role ? next() : res.sendStatus(403);
    registerPnOrientationUploadRoutes({
      app,
      requireAuth,
      requireRole,
      mediaDirectory,
      render: (_req, res, _title, body) => res.send(body)
    });
    app.use((_error, _req, res, _next) => res.status(500).send("Upload could not be saved."));
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}/admin/lpn-orientation`;
  });

  beforeEach(() => {
    fs.rmSync(mediaDirectory, { recursive: true, force: true });
    fs.mkdirSync(mediaDirectory);
    for (const [field, filename] of Object.entries(PN_ORIENTATION_FILES)) {
      fs.writeFileSync(path.join(mediaDirectory, filename), original[field]);
    }
  });

  after(async () => {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (temporaryRoot) fs.rmSync(temporaryRoot, { recursive: true, force: true });
  });

  const post = (form, role = "admin") => fetch(`${baseUrl}/media`, {
    method: "POST",
    headers: role ? { "x-test-role": role } : {},
    body: form,
    redirect: "manual"
  });
  function assertMediaEquals(expected) {
    for (const [field, filename] of Object.entries(PN_ORIENTATION_FILES)) {
      assert.deepEqual(fs.readFileSync(path.join(mediaDirectory, filename)), expected[field], filename);
    }
  }
  function assertIncomingIsEmpty() {
    const incoming = path.join(mediaDirectory, ".incoming");
    assert.deepEqual(fs.existsSync(incoming) ? fs.readdirSync(incoming) : [], []);
  }

  test("authentication and admin authorization happen before any upload files are written", async () => {
    fs.rmSync(mediaDirectory, { recursive: true, force: true });
    for (const [role, status] of [[null, 401], ["student", 403], ["instructor", 403]]) {
      const response = await post(formData(), role);
      assert.equal(response.status, status);
      await response.text();
      assert.equal(fs.existsSync(mediaDirectory), false);
    }
  });

  test("the admin form has the three required file inputs and a saved confirmation", async () => {
    const response = await fetch(`${baseUrl}?saved=1`, { headers: { "x-test-role": "admin" } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /private.*no-store/);
    const html = await response.text();
    for (const field of ["video", "poster", "transcript"]) {
      assert.match(html, new RegExp(`type="file" name="${field}"[^>]*required`));
    }
    assert.match(html, /role="status"/);
  });

  test("a complete validated set replaces the fixed private filenames and cleans its temporary files", async () => {
    const response = await post(formData());
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/admin/lpn-orientation?saved=1");
    await response.text();
    assertMediaEquals(replacement);
    assertIncomingIsEmpty();
    assert.deepEqual(fs.readdirSync(mediaDirectory).sort(), [".incoming", ...Object.values(PN_ORIENTATION_FILES)].sort());
  });

  test("partial uploads and unexpected fields preserve the existing complete media set", async () => {
    for (const form of [formData({ omit: "transcript" }), formData({ extraField: true })]) {
      const response = await post(form);
      assert.equal(response.status, 400);
      await response.text();
      assertMediaEquals(original);
      assertIncomingIsEmpty();
    }
  });

  test("invalid media headers and unsafe transcript encodings are rejected before replacement", async () => {
    const invalidCases = [
      { ...replacement, video: Buffer.from("a text file named video.mp4") },
      { ...replacement, poster: Buffer.from("a text file named poster.jpg") },
      { ...replacement, transcript: Buffer.from([0xc3, 0x28]) },
      { ...replacement, transcript: Buffer.from("hello\0world") },
      { ...replacement, transcript: Buffer.alloc(200 * 1024 + 1, 65) }
    ];
    for (const files of invalidCases) {
      const response = await post(formData({ files }));
      assert.equal(response.status, 400);
      await response.text();
      assertMediaEquals(original);
      assertIncomingIsEmpty();
    }
  });

  test("a failed later rename rolls the already replaced video back to the previous media set", async () => {
    const originalRename = fs.renameSync;
    let simulatedFailure = false;
    fs.renameSync = (source, destination) => {
      if (!simulatedFailure && destination === path.join(mediaDirectory, PN_ORIENTATION_FILES.poster)
          && path.dirname(source).startsWith(path.join(mediaDirectory, ".incoming"))) {
        simulatedFailure = true;
        const error = new Error("Simulated poster installation failure");
        error.code = "EIO";
        throw error;
      }
      return originalRename(source, destination);
    };
    try {
      const response = await post(formData());
      assert.equal(response.status, 500);
      await response.text();
      assert.equal(simulatedFailure, true);
      assertMediaEquals(original);
      assertIncomingIsEmpty();
    } finally {
      fs.renameSync = originalRename;
    }
  });
});
