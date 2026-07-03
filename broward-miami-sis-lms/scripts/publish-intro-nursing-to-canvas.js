require("dotenv").config({ quiet: true });

const fs = require("node:fs");
const path = require("node:path");
const { introNursingCourse } = require("../src/introNursingBuildout");

const rootDir = path.resolve(__dirname, "..");
const buildDir = path.resolve(rootDir, "dist", "canvas", introNursingCourse.slug);
const buildoutPath = path.join(buildDir, "canvas-api-buildout.json");

const baseUrl = normalizeBaseUrl(process.env.CANVAS_BASE_URL);
const token = process.env.CANVAS_ACCESS_TOKEN;
const accountId = process.env.CANVAS_ACCOUNT_ID;
const existingCourseId = process.env.CANVAS_COURSE_ID;
const publish = String(process.env.CANVAS_PUBLISH || "false").toLowerCase() === "true";
const dryRun = process.argv.includes("--dry-run");

if (!fs.existsSync(buildoutPath)) {
  throw new Error(`Missing Canvas buildout. Run npm run build:canvas:intro-nursing first: ${buildoutPath}`);
}

if (!baseUrl || !token || (!accountId && !existingCourseId)) {
  console.error(`Canvas publishing needs environment values:

CANVAS_BASE_URL=https://your-school.instructure.com
CANVAS_ACCESS_TOKEN=your-canvas-access-token
CANVAS_ACCOUNT_ID=1

Optional:
CANVAS_COURSE_ID=12345       # update an existing course instead of creating one
CANVAS_PUBLISH=true          # publish created Canvas content

Run a preview without posting:
npm run publish:canvas:intro-nursing -- --dry-run
`);
  process.exit(1);
}

const buildout = JSON.parse(fs.readFileSync(buildoutPath, "utf8"));

function normalizeBaseUrl(value) {
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

function canvasPath(pathname) {
  return `${baseUrl}/api/v1${pathname}`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function params(entries) {
  const body = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => body.append(key, String(item)));
    } else {
      body.append(key, String(value));
    }
  }
  return body;
}

async function request(method, pathname, bodyEntries) {
  const url = canvasPath(pathname);
  if (dryRun && method !== "GET") {
    console.log(`[dry-run] ${method} ${pathname}`);
    return { id: `dry-${Math.random().toString(36).slice(2)}`, url: slugify(path.basename(pathname)), title: "Dry Run" };
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json+canvas-string-ids",
      ...(bodyEntries ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body: bodyEntries ? params(bodyEntries) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = data?.errors ? JSON.stringify(data.errors) : text;
    throw new Error(`${method} ${pathname} failed (${response.status}): ${message}`);
  }
  return data;
}

async function getAll(pathname) {
  if (dryRun) return [];
  let url = canvasPath(pathname);
  const items = [];
  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json+canvas-string-ids"
      }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`GET ${url} failed (${response.status}): ${text}`);
    items.push(...(text ? JSON.parse(text) : []));
    const link = response.headers.get("link") || "";
    const next = link.split(",").find((part) => part.includes('rel="next"'));
    url = next ? next.match(/<([^>]+)>/)?.[1] : "";
  }
  return items;
}

async function upsertCourse() {
  const entries = [
    ["course[name]", introNursingCourse.title],
    ["course[course_code]", introNursingCourse.courseNumber],
    ["course[sis_course_id]", process.env.CANVAS_SIS_COURSE_ID || `BMHI-${introNursingCourse.slug}`],
    ["course[license]", buildout.course.license || "private"],
    ["course[is_public]", buildout.course.is_public ? "true" : "false"],
    ["course[default_view]", "wiki"],
    ["course[course_format]", "blended"],
    ["course[offer]", publish ? "true" : "false"]
  ];

  if (existingCourseId) {
    const course = await request("PUT", `/courses/${existingCourseId}`, entries);
    console.log(`Updated Canvas course ${course.id}: ${course.name}`);
    return course;
  }

  const course = await request("POST", `/accounts/${accountId}/courses`, entries);
  console.log(`Created Canvas course ${course.id}: ${course.name}`);
  return course;
}

async function upsertPage(courseId, title, body, frontPage = false) {
  const url = slugify(title);
  const entries = [
    ["wiki_page[title]", title],
    ["wiki_page[body]", body],
    ["wiki_page[published]", publish ? "true" : "false"],
    ["wiki_page[editing_roles]", "teachers"],
    ["wiki_page[front_page]", frontPage ? "true" : "false"]
  ];

  try {
    const page = await request("PUT", `/courses/${courseId}/pages/${url}`, entries);
    console.log(`Updated page: ${title}`);
    return page;
  } catch (error) {
    if (!String(error.message).includes("(404)")) throw error;
    const page = await request("POST", `/courses/${courseId}/pages`, entries);
    console.log(`Created page: ${title}`);
    return page;
  }
}

async function setFrontPageView(courseId) {
  await request("PUT", `/courses/${courseId}`, [["course[default_view]", "wiki"]]);
}

async function upsertModule(courseId, title, position) {
  const modules = await getAll(`/courses/${courseId}/modules?per_page=100`);
  const existing = modules.find((module) => module.name === title);
  const entries = [
    ["module[name]", title],
    ["module[position]", position],
    ["module[published]", publish ? "true" : "false"]
  ];
  if (existing) {
    const module = await request("PUT", `/courses/${courseId}/modules/${existing.id}`, entries);
    console.log(`Updated module: ${title}`);
    return module;
  }
  const module = await request("POST", `/courses/${courseId}/modules`, entries);
  console.log(`Created module: ${title}`);
  return module;
}

async function addModuleItem(courseId, moduleId, title, type, contentIdOrUrl, position) {
  const items = await getAll(`/courses/${courseId}/modules/${moduleId}/items?per_page=100`);
  if (items.some((item) => item.title === title)) {
    console.log(`Module item already exists: ${title}`);
    return;
  }

  const entries = [
    ["module_item[title]", title],
    ["module_item[type]", type],
    ["module_item[position]", position],
    ["module_item[published]", publish ? "true" : "false"]
  ];
  if (type === "Page") entries.push(["module_item[page_url]", contentIdOrUrl]);
  else entries.push(["module_item[content_id]", contentIdOrUrl]);

  await request("POST", `/courses/${courseId}/modules/${moduleId}/items`, entries);
  console.log(`Added module item: ${title}`);
}

async function upsertAssignment(courseId, item) {
  const assignments = await getAll(`/courses/${courseId}/assignments?per_page=100`);
  const existing = assignments.find((assignment) => assignment.name === item.title);
  const entries = [
    ["assignment[name]", item.title],
    ["assignment[points_possible]", item.pointsPossible],
    ["assignment[published]", publish ? "true" : "false"],
    ["assignment[submission_types][]", item.title.includes("Participation") ? "none" : "online_text_entry"],
    ["assignment[description]", assessmentDescription(item.title)]
  ];

  if (existing) {
    const assignment = await request("PUT", `/courses/${courseId}/assignments/${existing.id}`, entries);
    console.log(`Updated assignment: ${item.title}`);
    return assignment;
  }
  const assignment = await request("POST", `/courses/${courseId}/assignments`, entries);
  console.log(`Created assignment: ${item.title}`);
  return assignment;
}

async function upsertQuiz(courseId, item) {
  const quizzes = await getAll(`/courses/${courseId}/quizzes?per_page=100`);
  const existing = quizzes.find((quiz) => quiz.title === item.title);
  const entries = [
    ["quiz[title]", item.title],
    ["quiz[description]", assessmentDescription(item.title)],
    ["quiz[quiz_type]", "assignment"],
    ["quiz[points_possible]", item.pointsPossible],
    ["quiz[published]", publish ? "true" : "false"],
    ["quiz[shuffle_answers]", "true"],
    ["quiz[hide_results]", "until_after_last_attempt"]
  ];

  if (existing) {
    const quiz = await request("PUT", `/courses/${courseId}/quizzes/${existing.id}`, entries);
    console.log(`Updated quiz: ${item.title}`);
    return quiz;
  }
  const quiz = await request("POST", `/courses/${courseId}/quizzes`, entries);
  console.log(`Created quiz shell: ${item.title}`);
  return quiz;
}

function isQuizOrExam(title) {
  return /quiz|exam/i.test(title);
}

function assessmentDescription(title) {
  const week = introNursingCourse.weeks.find((item) => item.assessment === title || item.assessment.includes(title));
  if (week) return `<p>${escapeHtml(week.activities)}</p><p><strong>Week:</strong> ${week.week}</p>`;
  if (/quiz 1/i.test(title)) return "<p>Biweekly quiz covering Weeks 1-2.</p>";
  if (/quiz 2/i.test(title)) return "<p>Biweekly quiz covering Weeks 3-4.</p>";
  if (/quiz 3/i.test(title)) return "<p>Biweekly quiz covering Weeks 7-8.</p>";
  if (/quiz 4/i.test(title)) return "<p>Biweekly quiz covering Weeks 9-10.</p>";
  if (/midterm/i.test(title)) return "<p>Midterm exam covering Weeks 1-6.</p>";
  if (/final/i.test(title)) return "<p>Cumulative final exam completed in Week 12.</p>";
  return "<p>Course assessment aligned to the weekly learning objectives.</p>";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function assessmentModuleTitle(title) {
  const week = introNursingCourse.weeks.find((item) => item.assessment === title || item.assessment.includes(title));
  if (week) return `Week ${week.week}: ${week.title}`;
  const quizWeek = title.match(/Weeks? (\d+)(?:-(\d+))?/i);
  if (quizWeek) {
    const weekNumber = Number(quizWeek[2] || quizWeek[1]);
    const found = introNursingCourse.weeks.find((item) => item.week === weekNumber);
    if (found) return `Week ${found.week}: ${found.title}`;
  }
  if (/midterm/i.test(title)) return `Week 6: ${introNursingCourse.weeks[5].title}`;
  if (/final/i.test(title)) return `Week 12: ${introNursingCourse.weeks[11].title}`;
  return "Orientation and Course Resources";
}

async function publishToCanvas() {
  const course = await upsertCourse();
  const courseId = course.id || existingCourseId;

  const pageMap = new Map();
  for (const page of buildout.pages) {
    const body = fs.readFileSync(path.join(buildDir, page.file), "utf8").replaceAll("COURSE_ID", courseId);
    const saved = await upsertPage(courseId, page.title, body, Boolean(page.front_page));
    pageMap.set(page.title, saved.url || slugify(page.title));
  }
  await setFrontPageView(courseId);

  const moduleMap = new Map();
  for (const [moduleIndex, module] of introNursingCourse.modules.entries()) {
    const savedModule = await upsertModule(courseId, module.title, moduleIndex + 1);
    moduleMap.set(module.title, savedModule.id);
    for (const [lessonIndex, lesson] of module.lessons.entries()) {
      const pageTitle = `${module.title}: ${lesson.title}`;
      const pageBody = `<h2>${escapeHtml(lesson.title)}</h2><p>${escapeHtml(lesson.content).replaceAll("\n", "<br>")}</p>`;
      const page = await upsertPage(courseId, pageTitle, pageBody);
      await addModuleItem(courseId, savedModule.id, lesson.title, "Page", page.url || slugify(pageTitle), lessonIndex + 1);
    }
  }

  const assessmentObjects = new Map();
  for (const item of introNursingCourse.gradeItems) {
    const saved = isQuizOrExam(item.title)
      ? await upsertQuiz(courseId, item)
      : await upsertAssignment(courseId, item);
    assessmentObjects.set(item.title, saved);
  }

  const modulePositions = new Map();
  for (const item of introNursingCourse.gradeItems) {
    const moduleTitle = assessmentModuleTitle(item.title);
    const moduleId = moduleMap.get(moduleTitle);
    const saved = assessmentObjects.get(item.title);
    if (!moduleId || !saved?.id) continue;
    const position = (modulePositions.get(moduleId) || 50) + 1;
    modulePositions.set(moduleId, position);
    await addModuleItem(courseId, moduleId, item.title, isQuizOrExam(item.title) ? "Quiz" : "Assignment", saved.id, position);
  }

  console.log(`Canvas publish complete for course ${courseId}.`);
}

publishToCanvas().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
