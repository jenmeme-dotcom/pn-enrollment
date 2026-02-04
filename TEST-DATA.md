# SAMPLE TEST DATA
## For Testing the PN Enrollment Website

Use this data to test the website without typing everything yourself.

---

## Sample Student 1

### Personal Information
- **First Name:** Maria
- **Last Name:** Rodriguez
- **Email:** maria.rodriguez@email.com
- **Phone:** (954) 555-0101
- **Date of Birth:** 1998-03-15
- **Last 4 SSN:** 4567

### Address
- **Street:** 1234 Ocean Drive
- **City:** Miami
- **State:** FL
- **ZIP:** 33139

### Education
- **High School:** Miami Central High School
- **Graduation Year:** 2016
- **Healthcare Experience:** 2 years as a medical assistant at Miami General Hospital, helped with patient care and documentation

---

## Sample Student 2

### Personal Information
- **First Name:** James
- **Last Name:** Thompson
- **Email:** james.thompson@email.com
- **Phone:** (954) 555-0202
- **Date of Birth:** 1995-07-22
- **Last 4 SSN:** 8901

### Address
- **Street:** 5678 Coral Way
- **City:** Miami Beach
- **State:** FL
- **ZIP:** 33140

### Education
- **High School:** Miami Beach High School
- **Graduation Year:** 2013
- **Healthcare Experience:** Certified nursing assistant at community health center for 3 years

---

## Sample Student 3

### Personal Information
- **First Name:** Angela
- **Last Name:** Martinez
- **Email:** angela.martinez@email.com
- **Phone:** (954) 555-0303
- **Date of Birth:** 2000-11-08
- **Last 4 SSN:** 2345

### Address
- **Street:** 9012 Palmetto Street
- **City:** Doral
- **State:** FL
- **ZIP:** 33122

### Education
- **High School:** Doral Academy
- **Graduation Year:** 2018
- **Healthcare Experience:** Recent volunteer at Broward Hospital emergency department

---

## Test Credit Cards

⚠️ **FOR TESTING ONLY** - These are demo card numbers, not real cards

### Sample Card 1
- **Name:** Maria Rodriguez
- **Card Number:** 4532 1234 5678 9010
- **Expiry:** 12/25
- **CVV:** 123

### Sample Card 2
- **Name:** James Thompson
- **Card Number:** 5425 2334 3010 9903
- **Expiry:** 06/26
- **CVV:** 456

### Sample Card 3
- **Name:** Angela Martinez
- **Card Number:** 3782 822463 10005
- **Expiry:** 03/27
- **CVV:** 789

---

## Payment Plan Examples

### Plan 1: Full Payment
- **Amount:** $12,500
- **Due:** Today
- **Total Cost:** $12,500

### Plan 2: Two Payments
- **Payment 1:** $6,500 today
- **Payment 2:** $6,500 in 6 months
- **Total Cost:** $13,000

### Plan 3: 12 Monthly Payments
- **Amount:** $1,125/month
- **Duration:** 12 months
- **Total Cost:** $13,500

### Plan 4: 6 Monthly Payments
- **Amount:** $2,250/month
- **Duration:** 6 months
- **Total Cost:** $13,500

---

## Testing Checklist

Use this to test each feature:

### ✅ Step 1: Introduction
- [ ] Page loads correctly
- [ ] Video player displays
- [ ] 5-step overview is visible
- [ ] Requirements list is visible
- [ ] "Start Enrollment" button works

### ✅ Step 2: Registration
- [ ] All fields accept input
- [ ] "Continue" button validates all required fields
- [ ] Error message shows if field is missing
- [ ] Email validation works
- [ ] Phone validation works
- [ ] Age validation works (must be 18+)
- [ ] Data saves to browser storage
- [ ] Back button returns to step 1

### ✅ Step 3: Agreement
- [ ] Agreement document displays
- [ ] Signature canvas works (can draw with mouse)
- [ ] Signature clears with "Clear Signature" button
- [ ] Cannot continue without signature
- [ ] Cannot continue without checking agreement box
- [ ] Signature date auto-fills with today's date
- [ ] Back button returns to step 2

### ✅ Step 4: Payment
- [ ] All 4 payment plans display
- [ ] Clicking plan shows payment breakdown
- [ ] Payment schedule calculates correct dates
- [ ] Card number field formats with spaces
- [ ] Expiry field formats as MM/YY
- [ ] Error messages for invalid card info
- [ ] AutoPay checkbox works
- [ ] Back button returns to step 3

### ✅ Step 5: Milestones
- [ ] Summary shows correct student name and email
- [ ] Payment plan shows correct selection
- [ ] All 12 milestones display
- [ ] Milestone checkboxes work
- [ ] Completed milestones change color
- [ ] Document downloads work (3 documents)
- [ ] Contact information is correct
- [ ] "Complete Enrollment" button shows success message

### ✅ General Features
- [ ] Progress indicator updates each step
- [ ] Page layout works on mobile (test with F12)
- [ ] Forms validate correctly
- [ ] Error messages appear and disappear
- [ ] Data persists when leaving and returning
- [ ] Clear buttons work
- [ ] Form resets properly

---

## Common Test Cases

### Test Case 1: Valid Complete Registration
1. Enter all sample student 1 data
2. Click "Start Enrollment"
3. Fill all fields with Sample Student 1 data
4. Click "Continue"
5. **Expected:** Should proceed to Step 3

### Test Case 2: Missing Required Field
1. Click "Start Enrollment"
2. Fill only first name and email
3. Click "Continue"
4. **Expected:** Should show error message

### Test Case 3: Invalid Email
1. Click "Start Enrollment"
2. Enter "notanemail" in email field
3. Click "Continue"
4. **Expected:** Should show email validation error

### Test Case 4: Age Too Young
1. Click "Start Enrollment"
2. Enter date of birth as 2010-01-01 (14 years old)
3. Click "Continue"
4. **Expected:** Should show age validation error

### Test Case 5: Payment Plan Selection
1. Go to Step 4
2. Click on "Plan 3: 12 Monthly Payments"
3. **Expected:** 
   - Payment breakdown should show 12 rows
   - Each showing $1,125
   - Monthly date progression

### Test Case 6: Signature Validation
1. Go to Step 3
2. Do NOT sign, do NOT check agreement box
3. Click "Continue to Payment"
4. **Expected:** Should show error message

### Test Case 7: Complete Full Flow
1. Fill registration (use Sample Student 1)
2. Sign agreement
3. Select Plan 2 (Two Payments)
4. Enter sample card data
5. Complete enrollment
6. **Expected:** All data should be saved, success message shown

---

## Browser Testing

Test on multiple browsers:
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Microsoft Edge
- ✅ Safari (if available)
- ✅ Mobile Chrome (Android)
- ✅ Mobile Safari (iPhone)

---

## Performance Testing

These files are lightweight:
- **index.html:** ~120 KB
- **styles.css:** ~35 KB
- **app.js:** ~30 KB
- **Total:** ~185 KB

Should load in under 1 second on any modern connection.

---

## Data Persistence Testing

1. Fill out registration form
2. Go to Step 2
3. Close the browser completely
4. Reopen the website
5. **Expected:** All registration data should still be there

To clear test data:
1. Press F12 (Developer Tools)
2. Go to "Application" tab
3. Click "Local Storage"
4. Find your website URL
5. Delete the entry "pn-enrollment-data"

---

## Mobile Testing

Test on a phone using:
- **Option 1:** Open index.html from your phone's file system
- **Option 2:** Host on a local network and access from phone
- **Option 3:** Use Chrome DevTools (F12) to simulate mobile

Mobile should:
- ✅ Stack all columns vertically
- ✅ Have large, easy-to-tap buttons
- ✅ Show full width without scrolling needed
- ✅ Work with touch for signature
- ✅ Format card numbers correctly on mobile keyboard

---

## Common Issues & Solutions

| Issue | Test to Confirm | Fix |
|-------|-----------------|-----|
| Data not saving | Fill form, close browser, reopen | Check localStorage is enabled |
| Signature not working | Try drawing on canvas | Try different browser, check JavaScript |
| Video not showing | Video file present? | Save as .mp4, put in same folder |
| Buttons not working | Check console for errors | Hard refresh Ctrl+Shift+R |
| Forms look broken | Mobile view - check responsive | Check styles.css is loaded |

---

## Notes for Testers

- Test with REAL data to find UI issues
- Test with INVALID data to check error handling
- Test on MULTIPLE browsers and devices
- Test the COMPLETE flow from start to finish
- Check that DATA PERSISTS across sessions
- Verify all CALCULATIONS are correct
- Ensure all DOWNLOADS work
- Check ACCESSIBILITY on mobile

---

## Feedback Areas

While testing, note:
- [ ] Is anything confusing?
- [ ] Are button sizes good?
- [ ] Are colors professional?
- [ ] Is the flow logical?
- [ ] Are error messages clear?
- [ ] Does everything load fast?
- [ ] Do dates calculate correctly?
- [ ] Are all fields necessary?

---

**Testing Guide Version:** 1.0
**Last Updated:** February 2, 2026

Good luck with your testing! 🎉
