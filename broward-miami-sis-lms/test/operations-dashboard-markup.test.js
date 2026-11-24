"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { renderOperationsDashboard } = require("../src/operationsDashboard");

test("operations dashboard renders trusted tuition markup between overview controls and contacts", () => {
  const html = renderOperationsDashboard({
    statsMarkup: '<div data-section="stats">Stats</div>',
    filterMarkup: '<form data-section="filter">Filter</form>',
    tuitionMarkup: '<section data-section="tuition">Tuition and payments</section>',
    contactsMarkup: '<div data-section="contacts">Contacts</div>'
  });

  const statsIndex = html.indexOf('data-section="stats"');
  const filterIndex = html.indexOf('data-section="filter"');
  const tuitionIndex = html.indexOf('data-section="tuition"');
  const contactsIndex = html.indexOf('data-section="contacts"');

  assert.ok(statsIndex >= 0, "expected overview stats markup");
  assert.ok(filterIndex > statsIndex, "expected cohort filter after overview stats");
  assert.ok(tuitionIndex > filterIndex, "expected tuition markup after the cohort filter");
  assert.ok(contactsIndex > tuitionIndex, "expected student contacts after tuition markup");
});

test("operations dashboard keeps tuition markup optional", () => {
  const html = renderOperationsDashboard({ contactsMarkup: '<div data-section="contacts">Contacts</div>' });

  assert.doesNotMatch(html, /undefined|null/);
  assert.match(html, /data-section="contacts"/);
});
