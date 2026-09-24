const assert = require("node:assert/strict");
const { test } = require("node:test");
const { adminAccessAccounts } = require("../src/adminAccess");

test("Gamarha Joseph and Gaynelle White have approved admin logins", () => {
  assert.deepEqual(
    adminAccessAccounts.filter((account) => ["gamarha.joseph@gmail.com", "royaltrini1@yahoo.com"].includes(account.email)),
    [
      { firstName: "Gamarha", lastName: "Joseph", email: "gamarha.joseph@gmail.com" },
      { firstName: "Gaynelle", lastName: "White", email: "royaltrini1@yahoo.com" }
    ]
  );
});
