# QUICK START GUIDE
## PN Program Enrollment Website

---

## ⚡ 30-Second Setup

1. **Open the website**
   - Find the folder: `c:\PN Admission & Enrollment\enrollment-website\`
   - Double-click `index.html`
   - The website opens in your browser

2. **Start using**
   - Click "Start Enrollment →" button
   - Fill out the 5-step process
   - Data saves automatically

✅ **Done!** No installation required.

---

## 🎯 What Each Step Does

### Step 1: Introduction
- Watch enrollment process video
- See the 5-step overview
- Learn program requirements
- Click "Start Enrollment"

### Step 2: Registration
- Enter personal information (name, email, phone)
- Enter address
- Enter education background
- Click "Continue"

### Step 3: Agreement
- Read the enrollment agreement
- **Sign** on the signature canvas by clicking and dragging
- Check the "I agree" box
- Click "Continue to Payment"

### Step 4: Payment
- Choose a payment plan:
  - Full: $12,500 now
  - Two: $6,500 x 2
  - 12 months: $1,125/month
  - 6 months: $2,250/month
- Payment schedule shows automatically
- Enter credit card info (for demo - not real processing)
- Click "Confirm & Continue"

### Step 5: Milestones
- See enrollment summary
- Track 12 program milestones with checkboxes
- Download documents
- View support contact info

---

## 📺 Adding Your Video

Replace the video placeholder with your own:

### Quick Way:
1. Find your video file (should be .mp4)
2. Save it as: `enrollment-process.mp4`
3. Put it in the same folder as `index.html`
4. Done! It will automatically play

### Advanced Way:
If using YouTube:
1. Open `index.html` with a text editor
2. Find this line (around line 55):
   ```html
   <video width="100%" controls poster="thumbnail.jpg">
       <source src="enrollment-process.mp4" type="video/mp4">
   </video>
   ```
3. Replace with:
   ```html
   <iframe width="100%" height="500" 
       src="https://www.youtube.com/embed/VIDEO_ID_HERE" 
       frameborder="0" allowfullscreen>
   </iframe>
   ```
4. Replace `VIDEO_ID_HERE` with your YouTube video ID

---

## 🎨 Customize Easily

### Change the institution name:
1. Open `index.html` with Notepad
2. Find "Broward-Miami Health Institute"
3. Replace with your school name
4. Save

### Change program cost:
1. Open `app.js` with Notepad
2. Find `baseAmount = 12500`
3. Change 12500 to your cost
4. Save

### Change colors:
1. Open `styles.css` with Notepad
2. Find `:root {` at the top
3. Change colors like:
   - `--primary-color: #0066cc;` (main blue)
   - `--secondary-color: #00a86b;` (green)
4. Save

### Change contact info:
In Step 5 (Milestones page), find:
```
Student Services: (954) 123-4567 | studentservices@bmhi.edu
Program Director: (954) 123-4568 | nursing@bmhi.edu
Payment Questions: (954) 123-4569 | billing@bmhi.edu
```
Replace with your actual phone and email.

---

## ✍️ Student Signature

Students sign on the white box in Step 3:
1. Click and drag to sign
2. "Clear Signature" button to erase
3. "Sign & Save" button to save the signature
4. Signature is saved to their enrollment record

---

## 💾 Where is the Data Saved?

All student information is saved in the browser:
- Form data auto-saves
- Signature is saved
- Payment selection is saved
- Milestone checkboxes are saved

If a student closes and reopens the website on the **same browser**, their data is still there!

---

## 📥 Download Documents

Students can download 3 documents from Step 5:
1. **Enrollment Confirmation** - Summary of registration
2. **Payment Schedule** - Their payment plan breakdown
3. **Signed Agreement** - The signed enrollment document

---

## ❓ Common Questions

**Q: Is this a real payment system?**
A: No, it's a demo. For real payments, you'll need to connect to Stripe or PayPal (that's an advanced setup).

**Q: Can I change the program cost?**
A: Yes, easily! See "Customize" section above.

**Q: Can students use this on their phones?**
A: Yes! The website is fully responsive and works on phones, tablets, and computers.

**Q: What if a student loses their data?**
A: They can start over, OR you can teach them to clear the browser cache and start fresh.

**Q: Can I add more steps?**
A: Yes, but you'll need to edit the HTML/CSS/JavaScript files. See README.md for details.

**Q: How many students can use this?**
A: Unlimited! Each student uses it in their own browser.

**Q: Do I need to install anything?**
A: No! Just open index.html in a browser. It works offline too!

---

## 🚀 Going Live

Before students start using this for real:

1. ✅ Update your institution name everywhere
2. ✅ Update your contact information
3. ✅ Update program cost
4. ✅ Add your video
5. ✅ Customize payment plans if needed
6. ✅ Update milestones for your program
7. ✅ Test everything in your browser
8. ✅ Host on a web server (optional - can work on file system)

---

## 📁 File Overview

- **index.html** - The main webpage (everything the user sees)
- **styles.css** - The design and colors
- **app.js** - The logic and functionality
- **README.md** - Detailed documentation
- **QUICK-START.md** - This file!

---

## 💡 Pro Tips

1. **Keep a backup** - Copy the entire folder before making changes
2. **Test first** - Try the whole process before showing students
3. **Test on mobile** - Open on a phone to see how it looks
4. **Check the video** - Make sure your video loads correctly
5. **Update contact info** - Students will try to call!

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Page won't open | Double-click index.html or drag it into browser |
| Video won't play | Make sure video file is in same folder, try .mp4 format |
| Form won't save | Make sure JavaScript is enabled (should be by default) |
| Signature not working | Try a different browser, not incognito mode |
| Colors look wrong | Save the CSS file after editing |
| Changes won't show | Hard refresh: Ctrl+Shift+R |

---

## 📞 Need Help?

All the code is in plain English and well-commented. 

Most common changes:
- Edit `index.html` to change text, costs, milestones
- Edit `styles.css` to change colors and design
- Edit `app.js` to change payment amounts or validation

---

## ✨ What's Included

✅ Professional design
✅ 5-step workflow
✅ Video embedding
✅ Student registration form
✅ Enrollment agreement
✅ Digital signature
✅ Payment plan calculator
✅ Milestone tracking
✅ Document downloads
✅ Auto-saving data
✅ Form validation
✅ Mobile responsive
✅ No dependencies (pure HTML/CSS/JS)

---

## 🎉 You're All Set!

Your PN enrollment website is ready to use. Open `index.html` and start!

For more detailed information, see **README.md**

---

**Last Updated: February 2, 2026**
**Version: 1.0**
