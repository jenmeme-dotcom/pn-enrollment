const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const serverSource = fs.readFileSync(path.join(projectRoot, "src/server.js"), "utf8");
const uiSource = fs.readFileSync(path.join(projectRoot, "src/ui.js"), "utf8");

test("financial administration routes require the admin role", () => {
  const protectedRoutes = [
    "/admin/financial-aid",
    "/admin/financial-aid/:id/status",
    "/admin/financial-aid/:id/disbursements",
    "/admin/billing",
    "/admin/billing/charges",
    "/admin/billing/payments",
    "/admin/billing/payment-plans",
    "/admin/integrations/quickbooks/connect",
    "/admin/integrations/quickbooks/callback",
    "/admin/integrations/quickbooks/sync",
    "/admin/integrations/quickbooks/disconnect"
  ];

  protectedRoutes.forEach((route) => {
    const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(serverSource, new RegExp(`app\\.(?:get|post)\\(\"${escapedRoute}\"[^\\n]*requireRole\\(\"admin\"\\)`));
  });
});

test("instructor navigation excludes billing and financial aid", () => {
  const instructorLinks = uiSource.match(/const instructorLinks = `([\s\S]*?)`;/)?.[1] || "";
  assert.doesNotMatch(instructorLinks, /billing|financial-aid|quickbooks/i);
});

test("instructor staff portal does not load payroll records", () => {
  assert.match(serverSource, /const payRecords = canViewFinancialInformation \? db\.prepare/);
  assert.match(serverSource, /canViewFinancialInformation \? `<article class="card pay-summary-card"/);
  assert.match(serverSource, /canViewFinancialInformation \? `<section class="table-card"/);
});
