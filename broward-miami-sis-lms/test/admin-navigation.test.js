const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const styles = fs.readFileSync(path.join(projectRoot, "src/public/styles.css"), "utf8");
const { layout } = require(path.join(projectRoot, "src/ui.js"));

function hrefs(fragment = "") {
  return [...fragment.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

function renderAdminHeader(role = "admin") {
  return layout({
    title: "Dashboard",
    user: {
      role,
      first_name: role === "admin" ? "Admin" : "Instructor",
      last_name: "User",
      email: `${role}@browardmiamihi.com`
    },
    body: "<h1>Dashboard</h1>"
  });
}

test("admin navigation is one non-wrapping row without repeated tool links", () => {
  for (const role of ["admin", "instructor"]) {
    const html = renderAdminHeader(role);
    const tools = html.match(/<div class="sis-tools">([\s\S]*?)<\/div>/)?.[1] || "";
    const navigation = html.match(/<nav class="sis-subnav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || "";
    const repeatedHrefs = hrefs(tools).filter((href) => hrefs(navigation).includes(href));

    assert.deepEqual(repeatedHrefs, [], `${role} header should not repeat destinations`);
    assert.match(navigation, /href="\/admin\/help">SOPs<\/a>/);
    assert.match(navigation, /href="\/catalog">Catalog<\/a>/);
    assert.doesNotMatch(navigation, /Task Tickets/);
    assert.match(tools, /class="sis-tool task-tickets-link" href="\/admin\/tickets"[^>]*>Task Tickets<\/a>/);
  }

  const adminHtml = renderAdminHeader("admin");
  const adminNavigation = adminHtml.match(/<nav class="sis-subnav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || "";
  assert.match(adminNavigation, /<select aria-label="Roles"/);
  assert.match(adminNavigation, /<option value="\/admin\/admin-roles">Admin<\/option>/);
  assert.match(adminNavigation, /<option value="\/admin\/instructor-roles">Instructor<\/option>/);
  assert.doesNotMatch(adminNavigation, />Admin Roles<\/a>/);
  assert.doesNotMatch(adminNavigation, />Instructor Roles<\/a>/);
  assert.match(adminHtml, /href="\/admin\/features\/system-settings"[^>]*>Settings<\/a>/);

  const instructorHtml = renderAdminHeader("instructor");
  const instructorNavigation = instructorHtml.match(/<nav class="sis-subnav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || "";
  assert.doesNotMatch(instructorNavigation, /aria-label="Roles"/);
  assert.doesNotMatch(instructorHtml, /\/admin\/admin-roles/);
  assert.doesNotMatch(instructorHtml, /\/admin\/instructor-roles/);
  assert.doesNotMatch(instructorHtml, /\/admin\/features(?:\/system-settings)?/);
  assert.match(instructorNavigation, /href="\/admin\/courses">Dashboard<\/a>/);
  assert.match(instructorHtml, /<a class="sis-logo" href="\/admin\/courses">/);

  assert.match(styles, /\.sis-subnav \{[\s\S]*?flex-wrap: nowrap;[\s\S]*?overflow-x: auto;[\s\S]*?\}/);
  assert.match(styles, /\.sis-subnav a \{[\s\S]*?flex: 0 0 auto;[\s\S]*?white-space: nowrap;[\s\S]*?\}/);
  assert.match(styles, /\.sis-tool\.task-tickets-link \{[\s\S]*?color: #b42318;[\s\S]*?font-weight: 900;[\s\S]*?\}/);
  assert.match(styles, /\.sis-role-menu select \{[\s\S]*?font-weight: 800;[\s\S]*?\}/);
});
