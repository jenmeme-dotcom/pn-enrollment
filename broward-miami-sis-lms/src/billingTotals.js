const PN_TERM = "2026-27 Practical Nursing Term";
const PN_CHARGES = [
  { category: "Tuition", description: "Practical Nursing tuition", amount_cents: 1500000 },
  { category: "Fee", description: "Registration fee", amount_cents: 15000 },
  { category: "Fee", description: "Entrance exam fee", amount_cents: 7500 }
];
function accountCharges(enrollments, postedCharges, term = PN_TERM) {
  const rows = postedCharges.map(row => ({ ...row }));
  const nursing = enrollments.filter(row => row.status !== "withdrawn" && (row.slug === "practical-nursing" || row.category === "Practical Nursing Course"));
  if (nursing.length && term === PN_TERM) {
    for (const charge of PN_CHARGES) {
      const exists = rows.some(row => charge.category === "Tuition"
        ? row.category === "Tuition"
        : charge.description === "Registration fee"
          ? /registration/i.test(row.description || "")
          : /entrance/i.test(row.description || ""));
      if (!exists) rows.push({ ...charge, due_date: nursing[0].start_date, scheduled: true });
    }
  }
  return rows;
}
function accountTotals(charges, payments, disbursements = []) {
  const sum = rows => rows.reduce((total, row) => total + Number(row.amount_cents || 0), 0);
  const totalCharges = sum(charges);
  const appliedPayments = sum(payments);
  const financialAid = sum(disbursements.filter(row => row.status === "disbursed"));
  return { totalCharges, appliedPayments, financialAid, balance: Math.max(0, totalCharges - appliedPayments - financialAid) };
}
module.exports = { PN_TERM, PN_CHARGES, accountCharges, accountTotals };
