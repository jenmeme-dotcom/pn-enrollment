const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");

let serverProcess;
let database;
let temporaryDirectory;
let uploadDirectory;
let baseUrl;
let adminCookie;
let instructorCookie;
let studentCookie;
let firstCourse;
let secondCourse;

function reservePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const { port } = socket.address();
      socket.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function startServer(port, databaseFile) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`Server did not start in time.\n${output}`)), 120_000);
    serverProcess = spawn(process.execPath, ["--no-warnings", "src/server.js"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_FILE: databaseFile,
        EMAIL_DELIVERY_ENABLED: "false",
        NODE_ENV: "test",
        PORT: String(port),
        PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
        SESSION_SECRET: "course-marketing-tools-test-secret",
        UPLOAD_DIR: uploadDirectory
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    const onOutput = (chunk) => {
      output += chunk.toString();
      if (!output.includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      resolve();
    };
    serverProcess.stdout.on("data", onOutput);
    serverProcess.stderr.on("data", onOutput);
    serverProcess.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    serverProcess.once("exit", (code, signal) => {
      if (output.includes("SIS/LMS running at")) return;
      clearTimeout(timeout);
      reject(new Error(`Server exited before startup (${code ?? signal}).\n${output}`));
    });
  });
}

async function login(email, password, loginRole) {
  const response = await fetch(`${baseUrl}/login`, {
    body: new URLSearchParams({ email, password, loginRole }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    redirect: "manual"
  });
  assert.equal(response.status, 302, `Expected ${email} to sign in`);
  const setCookie = response.headers.getSetCookie?.()[0] || response.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";", 1)[0];
  assert.match(cookie, /^bmhi\.sid=/);
  return cookie;
}

async function get(route, cookie) {
  return fetch(`${baseUrl}${route}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual"
  });
}

async function addFile(courseId, { title, filename, type, bytes }, cookie = adminCookie) {
  const form = new FormData();
  form.set("title", title);
  form.set("note", `Test resource for ${filename}`);
  form.set("marketingFile", new Blob([bytes], { type }), filename);
  return fetch(`${baseUrl}/admin/courses/${courseId}/marketing-assets`, {
    body: form,
    headers: { cookie },
    method: "POST",
    redirect: "manual"
  });
}

async function addLink(courseId, { title, externalUrl }, cookie = instructorCookie) {
  return fetch(`${baseUrl}/admin/courses/${courseId}/marketing-assets`, {
    body: new URLSearchParams({ title, externalUrl, note: "Campaign landing page" }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie
    },
    method: "POST",
    redirect: "manual"
  });
}

async function removeAsset(courseId, assetId, cookie = adminCookie) {
  return fetch(`${baseUrl}/admin/courses/${courseId}/marketing-assets/${assetId}/remove`, {
    body: new URLSearchParams(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie
    },
    method: "POST",
    redirect: "manual"
  });
}

before(async () => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bmhi-course-marketing-tools-"));
  uploadDirectory = path.join(temporaryDirectory, "uploads");
  fs.mkdirSync(uploadDirectory, { recursive: true });
  const databaseFile = path.join(temporaryDirectory, "marketing.sqlite");
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer(port, databaseFile);

  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA busy_timeout = 5000;");
  [firstCourse, secondCourse] = database.prepare("SELECT id, title FROM courses ORDER BY id LIMIT 2").all();
  assert.ok(firstCourse && secondCourse, "Expected at least two seeded courses");

  const studentPhoto = "marketing-tools-student.png";
  fs.writeFileSync(
    path.join(uploadDirectory, studentPhoto),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  );
  database.prepare(`
    UPDATE users
    SET organization_status = 'organized', photo_review_status = 'approved',
      photo_storage_name = ?, photo_original_name = ?
    WHERE email = 'student@browardmiamihi.com'
  `).run(studentPhoto, studentPhoto);

  adminCookie = await login("admin@browardmiamihi.com", "AdminPass123!", "faculty");
  instructorCookie = await login("instructor@browardmiamihi.com", "InstructorPass123!", "faculty");
  studentCookie = await login("student@browardmiamihi.com", "StudentPass123!", "student");
});

after(async () => {
  database?.close();
  if (serverProcess && serverProcess.exitCode === null) {
    await new Promise((resolve) => {
      serverProcess.once("exit", resolve);
      serverProcess.kill("SIGTERM");
      setTimeout(resolve, 5_000).unref();
    });
  }
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
});

test("every selected course manage page has staff-only Marketing Tools", async () => {
  for (const cookie of [adminCookie, instructorCookie]) {
    const response = await get(`/admin/courses/${firstCourse.id}/manage`, cookie);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /id="marketing-tools"/);
    assert.match(html, />Marketing Tools</);
    assert.match(html, new RegExp(`action="/admin/courses/${firstCourse.id}/marketing-assets"`));
    assert.match(html, /accept="\.pdf,\.png,\.jpg,\.jpeg,\.webp,\.ppt,\.pptx"/);
  }

  const studentPage = await get(`/admin/courses/${firstCourse.id}/manage`, studentCookie);
  assert.equal(studentPage.status, 403);
});

test("PDF, PNG, JPG, PPT, and PPTX assets upload and download inside one course", async () => {
  const fixtures = [
    { extension: "pdf", type: "application/pdf", bytes: Buffer.from("%PDF-1.4\nmarketing test\n%%EOF") },
    { extension: "png", type: "image/png", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
    { extension: "jpg", type: "image/jpeg", bytes: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
    { extension: "ppt", type: "application/vnd.ms-powerpoint", bytes: Buffer.from("legacy powerpoint fixture") },
    { extension: "pptx", type: "application/vnd.openxmlformats-officedocument.presentationml.presentation", bytes: Buffer.from("pptx fixture") }
  ];

  for (const fixture of fixtures) {
    const filename = `campaign-${fixture.extension}.${fixture.extension}`;
    const title = `Campaign ${fixture.extension.toUpperCase()}`;
    const response = await addFile(firstCourse.id, { ...fixture, title, filename });
    assert.equal(response.status, 302, `Expected ${fixture.extension} upload to redirect`);
    assert.equal(response.headers.get("location"), `/admin/courses/${firstCourse.id}/manage#marketing-tools`);

    const asset = database.prepare(`
      SELECT * FROM course_marketing_assets
      WHERE course_id = ? AND title = ?
    `).get(firstCourse.id, title);
    assert.ok(asset, `Expected ${fixture.extension} asset to be saved`);
    assert.equal(asset.asset_type, "file");
    assert.equal(asset.file_original_name, filename);

    const download = await get(`/admin/courses/${firstCourse.id}/marketing-assets/${asset.id}/download`, instructorCookie);
    assert.equal(download.status, 200, `Expected ${fixture.extension} download to work`);
    assert.match(download.headers.get("content-disposition") || "", /^attachment;/i);
    assert.ok((download.headers.get("content-disposition") || "").includes(filename));
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), fixture.bytes);
  }

  const otherCoursePage = await get(`/admin/courses/${secondCourse.id}/manage`, adminCookie);
  const otherCourseHtml = await otherCoursePage.text();
  const otherMarketingSection = otherCourseHtml.match(/<section class="card course-marketing-tools"[\s\S]*?<\/section>/)?.[0] || "";
  assert.equal(otherCoursePage.status, 200);
  assert.match(otherMarketingSection, /id="marketing-tools"/);
  assert.doesNotMatch(otherMarketingSection, /Campaign (?:PDF|PNG|JPG|PPT|PPTX)/);

  const sample = database.prepare("SELECT id FROM course_marketing_assets WHERE course_id = ? ORDER BY id LIMIT 1").get(firstCourse.id);
  assert.equal((await get(`/admin/courses/${secondCourse.id}/marketing-assets/${sample.id}/download`, adminCookie)).status, 404);
  assert.equal((await get(`/admin/courses/${firstCourse.id}/marketing-assets/${sample.id}/download`, studentCookie)).status, 403);
});

test("external links are scoped to their course and render an explicit Open link control", async () => {
  const title = "Fall Campaign Landing Page";
  const response = await addLink(firstCourse.id, {
    title,
    externalUrl: "https://example.com/bmhi-campaign"
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), `/admin/courses/${firstCourse.id}/manage#marketing-tools`);

  const asset = database.prepare("SELECT * FROM course_marketing_assets WHERE course_id = ? AND title = ?").get(firstCourse.id, title);
  assert.ok(asset);
  assert.equal(asset.asset_type, "link");
  assert.equal(asset.external_url, "https://example.com/bmhi-campaign");

  const firstPage = await get(`/admin/courses/${firstCourse.id}/manage`, instructorCookie);
  const firstHtml = await firstPage.text();
  assert.match(firstHtml, /href="https:\/\/example\.com\/bmhi-campaign"[^>]*target="_blank"[^>]*rel="noopener"[^>]*>Open link<\/a>/);
  assert.match(firstHtml, new RegExp(`action="/admin/courses/${firstCourse.id}/marketing-assets/${asset.id}/remove"`));

  const secondPage = await get(`/admin/courses/${secondCourse.id}/manage`, adminCookie);
  assert.doesNotMatch(await secondPage.text(), new RegExp(title));
});

test("disallowed files and invalid external URLs are rejected without creating assets", async () => {
  const beforeCount = database.prepare("SELECT COUNT(*) AS count FROM course_marketing_assets WHERE course_id = ?").get(firstCourse.id).count;
  let response = await addFile(firstCourse.id, {
    title: "Executable should fail",
    filename: "campaign.exe",
    type: "application/octet-stream",
    bytes: Buffer.from("not an allowed marketing file")
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), `/admin/courses/${firstCourse.id}/manage#marketing-tools`);

  response = await addLink(firstCourse.id, {
    title: "Invalid URL should fail",
    externalUrl: "https://[invalid"
  }, adminCookie);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), `/admin/courses/${firstCourse.id}/manage#marketing-tools`);

  const afterCount = database.prepare("SELECT COUNT(*) AS count FROM course_marketing_assets WHERE course_id = ?").get(firstCourse.id).count;
  assert.equal(afterCount, beforeCount);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM course_marketing_assets WHERE title LIKE '%should fail%'").get().count, 0);
});

test("uploads to a missing course are cleaned up instead of leaving orphan files", async () => {
  const beforeFiles = fs.readdirSync(uploadDirectory).sort();
  const response = await addFile(999999, {
    title: "Orphan should be cleaned",
    filename: "orphan.pdf",
    type: "application/pdf",
    bytes: Buffer.from("%PDF-1.4\norphan test\n%%EOF")
  });
  assert.equal(response.status, 404);
  assert.deepEqual(fs.readdirSync(uploadDirectory).sort(), beforeFiles);
});

test("students cannot add or remove marketing resources", async () => {
  const addResponse = await addLink(firstCourse.id, {
    title: "Student mutation should fail",
    externalUrl: "https://example.com/student"
  }, studentCookie);
  assert.equal(addResponse.status, 403);

  const asset = database.prepare("SELECT id FROM course_marketing_assets WHERE course_id = ? ORDER BY id LIMIT 1").get(firstCourse.id);
  assert.ok(asset);
  assert.equal((await removeAsset(firstCourse.id, asset.id, studentCookie)).status, 403);
  assert.ok(database.prepare("SELECT id FROM course_marketing_assets WHERE id = ?").get(asset.id));
});

test("removal is course-scoped, deletes the stored file, and records add/remove activity", async () => {
  const title = "Resource to remove";
  const response = await addFile(firstCourse.id, {
    title,
    filename: "remove-me.pdf",
    type: "application/pdf",
    bytes: Buffer.from("%PDF-1.4\nremove me\n%%EOF")
  }, instructorCookie);
  assert.equal(response.status, 302);
  const asset = database.prepare("SELECT * FROM course_marketing_assets WHERE course_id = ? AND title = ?").get(firstCourse.id, title);
  assert.ok(asset);
  const storedPath = path.join(uploadDirectory, asset.file_storage_name);
  assert.ok(fs.existsSync(storedPath));

  const wrongCourseRemoval = await removeAsset(secondCourse.id, asset.id);
  assert.equal(wrongCourseRemoval.status, 404);
  assert.ok(database.prepare("SELECT id FROM course_marketing_assets WHERE id = ?").get(asset.id));

  const removeResponse = await removeAsset(firstCourse.id, asset.id);
  assert.equal(removeResponse.status, 302);
  assert.equal(removeResponse.headers.get("location"), `/admin/courses/${firstCourse.id}/manage#marketing-tools`);
  assert.equal(database.prepare("SELECT id FROM course_marketing_assets WHERE id = ?").get(asset.id), undefined);
  assert.equal(fs.existsSync(storedPath), false);

  const actions = database.prepare(`
    SELECT action, entity_type, entity_id, summary, details_json, actor_user_id
    FROM system_activity_log
    WHERE entity_type = 'course_marketing_asset' AND entity_id = ?
    ORDER BY id
  `).all(String(asset.id));
  assert.deepEqual(actions.map((event) => event.action), ["added_marketing_asset", "removed_marketing_asset"]);
  assert.ok(actions.every((event) => event.actor_user_id));
  assert.ok(actions.every((event) => event.summary.includes(firstCourse.title)));
  assert.ok(actions.every((event) => event.details_json.includes(title)));

  const activityPage = await get("/admin/system-activity", adminCookie);
  const activityHtml = await activityPage.text();
  assert.equal(activityPage.status, 200);
  assert.match(activityHtml, /Added marketing resource/);
  assert.match(activityHtml, /Removed marketing resource/);
  assert.match(activityHtml, new RegExp(title));
});
