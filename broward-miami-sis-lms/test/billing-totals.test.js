const test = require('node:test');
const assert = require('node:assert/strict');
const { accountCharges, accountTotals } = require('../src/billingTotals');
const pn = [{category:'Practical Nursing Course', start_date:'2026-06-29'}, {category:'Practical Nursing Course', progress:100}];
test('nursing courses share one program charge and never imply payments', () => {
 const charges=accountCharges(pn,[]);
 assert.equal(charges.length,2);
 assert.deepEqual(accountTotals(charges,[]),{totalCharges:1515000,appliedPayments:0,financialAid:0,balance:1515000});
});
test('recorded registration payment counted once and tuition payments reduce balance',()=>{
 const charges=accountCharges(pn,[]);
 const totals=accountTotals(charges,[{amount_cents:15000},{amount_cents:7500},{amount_cents:200000}]);
 assert.equal(totals.balance,1292500);
});
test('partial ledger does not suppress tuition; existing charges never duplicate',()=>{
 const posted=[{category:'Fee',description:'Registration fee',amount_cents:15000}];
 const charges=accountCharges(pn,posted);
 assert.equal(accountTotals(charges,[]).totalCharges,1515000);
 assert.deepEqual(accountCharges(pn,charges),charges);
});
test('posted tuition and adjustments remain authoritative',()=>{
 const charges=accountCharges(pn,[{category:'Tuition',description:'Agreed tuition',amount_cents:1400000},{category:'Adjustment',description:'Scholarship',amount_cents:-100000}]);
 assert.equal(accountTotals(charges,[]).totalCharges,1315000);
});
test('offered and scheduled aid do not falsely mark tuition paid',()=>{
 assert.equal(accountTotals(accountCharges(pn,[]),[],[{status:'scheduled',amount_cents:100000},{status:'disbursed',amount_cents:25000}]).balance,1490000);
});
test('other courses and other terms receive no nursing program charge',()=>{
 assert.deepEqual(accountCharges([{slug:'home-health-aide'}],[]),[]);
 assert.deepEqual(accountCharges(pn,[],'2026 Summer Term'),[]);
});
