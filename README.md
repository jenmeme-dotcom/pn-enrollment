# PN Program Enrollment Website
## Broward-Miami Health Institute

A complete, professional web application for managing practical nursing program enrollment with video, registration, digital agreements, payment planning, and milestone tracking.

---

## 📋 Features

### 1. **Introduction/Landing Page**
- Embedded video player for enrollment process explanation
- 5-step process overview with visual cards
- Program requirements checklist
- Professional design with responsive layout

### 2. **Student Registration**
- Comprehensive form with personal information
- Address information collection
- Educational background details
- Input validation and error handling
- Form data persistence using localStorage

### 3. **Enrollment Agreement**
- Full legal agreement document
- Digital signature canvas with drawing tools
- Signature clearing functionality
- Acknowledgment checkbox
- Printable agreement

### 4. **Payment Plan Calculator**
- 4 payment plan options:
  - Full payment ($12,500)
  - Two payments ($6,500 x 2)
  - 12 monthly payments ($1,125/month)
  - 6 monthly payments ($2,250/month)
- Dynamic payment breakdown table
- Payment schedule generation
- Secure payment information form
- AutoPay option for monthly installments

### 5. **Milestone Tracking**
- 12 program milestones with checkboxes
- Pre-program requirements
- Mid-program evaluations
- Final certification milestones
- Enrollment summary display
- Document downloads (confirmation, payment schedule, agreement)

### 6. **Additional Features**
- Multi-step progress indicator
- Automatic data saving to browser storage
- Form validation with helpful error messages
- Responsive design for mobile, tablet, and desktop
- Professional styling and animations
- Contact information section
- Download documents functionality

---

## 🚀 Getting Started

### Prerequisites
- Windows 11 (or any modern operating system)
- Any modern web browser (Chrome, Firefox, Edge, Safari)
- No server or special software required!

### Installation

1. **Extract the website folder**
   - Navigate to: `c:\PN Admission & Enrollment\enrollment-website\`

2. **Open in browser**
   - Double-click on `index.html` in File Explorer, OR
   - Right-click on `index.html` → Open with → Your preferred browser

3. **Start using**
   - The website will open in your default browser
   - All data is saved automatically to your browser's local storage

---

## 📁 File Structure

```
enrollment-website/
├── index.html          # Main HTML page (2500+ lines)
├── styles.css          # Complete styling and responsive design
├── app.js              # JavaScript application logic
└── README.md           # This file
```

### File Descriptions

**index.html**
- Complete HTML structure for all 5 steps
- Semantic HTML5 markup
- Accessible form elements
- Video placeholder and embedding
- Progress indicators
- All form sections and content

**styles.css**
- Professional, modern design
- Responsive grid layout
- Mobile-first approach
- Print styles for downloading documents
- Smooth animations and transitions
- CSS custom properties for easy customization
- 1000+ lines of styling

**app.js**
- Complete JavaScript application logic
- Form validation
- Digital signature drawing
- Payment plan calculations
- Data persistence with localStorage
- Event handling and navigation
- Document generation
- 800+ lines of functional code

---

## 🎥 Adding Your Video

The website includes a video placeholder. To add your enrollment process video:

### Option 1: Local Video File
1. Export your video as MP4 format
2. Save it as `enrollment-process.mp4` in the same folder as index.html
3. Update the video source in index.html if needed

### Option 2: YouTube/External Video
In index.html, replace the `<video>` tag with:
```html
<iframe width="100%" height="500" 
    src="https://www.youtube.com/embed/YOUR_VIDEO_ID" 
    frameborder="0" allowfullscreen>
</iframe>
```

---

## 📝 Customization Guide

### Change Program Name
1. Open `index.html`
2. Find "Broward-Miami Health Institute" 
3. Replace with your institution name
4. Update contact information at the bottom

### Change Program Cost
1. Open `app.js`
2. Find `baseAmount = 12500`
3. Change to your program cost

### Customize Payment Plans
In `app.js`, find the `updatePaymentBreakdown()` function:
```javascript
case 1:
    enrollmentData.paymentPlan = {
        name: 'Full Payment',
        totalAmount: baseAmount,  // Change this
        fee: 0
    };
```

### Customize Milestones
In `index.html`, edit the milestone cards in Step 5:
```html
<div class="milestone-card">
    <div class="milestone-header">
        <div class="milestone-checkbox">
            <input type="checkbox" class="milestone-check" id="m1">
        </div>
        <div class="milestone-info">
            <h4>Your Milestone Title</h4>
            <p class="milestone-date">Due: Your Date</p>
        </div>
    </div>
    <p class="milestone-desc">Your description here</p>
</div>
```

### Change Colors
In `styles.css`, modify the CSS variables at the top:
```css
:root {
    --primary-color: #0066cc;      /* Main blue */
    --secondary-color: #00a86b;    /* Green */
    --success-color: #28a745;      /* Success green */
    /* ... more colors ... */
}
```

---

## 💾 Data Management

### Where is my data saved?
- All form data is saved to your browser's **localStorage**
- Data persists even if you close and reopen the browser
- Data is specific to each browser/device

### Clear saved data
Press F12 to open Developer Tools:
1. Go to "Application" tab
2. Find "Local Storage"
3. Find your website
4. Delete the entry "pn-enrollment-data"

### Export/Backup Data
In browser console (F12 → Console):
```javascript
console.log(JSON.stringify(enrollmentData, null, 2));
```

---

## 🖨️ Printing & Documents

Users can:
1. Download enrollment confirmation as text file
2. Download payment schedule as text file
3. Download signed agreement as text file
4. Print any page using Ctrl+P

The website includes print-specific CSS to hide unnecessary elements.

---

## 🔒 Security Notes

This is a client-side application:
- ⚠️ Do NOT use for actual credit card processing
- For production use with real payments, integrate with:
  - Stripe
  - PayPal
  - Authorize.net
  - Square

Currently, payment information is:
- Validated for format only
- Masked in display (shows only last 4 digits)
- NOT sent to any server
- Suitable for demonstration/testing only

---

## 📱 Browser Compatibility

✅ Works on:
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## 🎨 Design Features

### Responsive Layout
- Mobile: 320px and up
- Tablet: 768px and up
- Desktop: 1000px and up

### Accessibility
- Semantic HTML5
- Proper form labels
- Color contrast compliance
- Keyboard navigation support
- Touch-friendly on mobile

### User Experience
- Progress indicator showing current step
- Auto-saving form data
- Clear error messages
- Visual feedback on interactions
- Smooth animations

---

## 📚 Help & Support Section

Built-in contact information in Step 5:
- Student Services phone
- Program Director email
- Billing department contact

Customize these in the `index.html` file.

---

## ⚙️ Technical Details

### No External Dependencies
- Pure HTML5
- Vanilla CSS3
- Vanilla JavaScript (ES6)
- No jQuery or frameworks needed
- Works offline after first load

### File Size
- index.html: ~120 KB
- styles.css: ~35 KB
- app.js: ~30 KB
- **Total: ~185 KB** (very fast loading)

### Performance
- Fast page load time
- Smooth animations
- Efficient form validation
- Minimal DOM manipulation

---

## 🐛 Troubleshooting

### Video not playing
- Ensure video file is in the same folder as index.html
- Check browser supports MP4 format
- Try MP4 format instead of other formats

### Form data not saving
- Check browser's localStorage is enabled
- Try a different browser
- Clear browser cache and try again

### Signature not working
- Make sure you're not in private/incognito mode
- Try a different browser
- Check if JavaScript is enabled (F12 → Console)

### Payment plan not showing breakdown
- Select a payment plan first
- Refresh the page
- Clear browser cache

---

## 📞 Support

For customization or integration help:
1. Edit the configuration in `app.js`
2. Modify styling in `styles.css`
3. Update content in `index.html`

All code is well-commented for easy modification.

---

## 📄 License

This enrollment website is provided for use at Broward-Miami Health Institute.

---

## 🎓 Program Information

**Practical Nursing Program**
- Duration: 12 months
- Cost: $12,500
- Format: Full-time, Monday-Friday, 8 AM - 4 PM
- Requirements: High School Diploma/GED, 18+ years old, CPR certification
- License: NCLEX-PN examination

---

## ✅ Checklist for Going Live

Before deploying this website:

- [ ] Update institution name throughout
- [ ] Update contact phone numbers and emails
- [ ] Update program cost and payment plans
- [ ] Add your video file (enrollment-process.mp4)
- [ ] Update program requirements
- [ ] Customize milestones for your program
- [ ] Update colors to match your branding
- [ ] Test all form validations
- [ ] Test payment plan calculations
- [ ] Test signature functionality
- [ ] Test on mobile devices
- [ ] Set up backend for actual payment processing
- [ ] Configure email notifications
- [ ] Test document downloads

---

**Version:** 1.0  
**Last Updated:** February 2, 2026  
**Created for:** Broward-Miami Health Institute

---

Enjoy! 🎉
