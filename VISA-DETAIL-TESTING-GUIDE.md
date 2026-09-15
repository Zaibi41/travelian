# Visa Detail Page - Admin Panel Alignment Test Guide

## How to Test the Redesigned Visa Detail Page

The visa detail page has been completely redesigned to display all fields from the admin panel with proper formatting and responsive design.

---

## Step 1: Create a Test Visa Package in Admin Panel

1. Navigate to **Admin Visa Management**: http://localhost:8080/admin/visa

2. Click **"Add Visa Package"** button

3. Fill in the form with test data:
   ```
   Country: Dubai
   Visa Type: visit
   Processing Time: 7 working days
   Validity: 90 days
   Stay Duration: 30 days
   Status: Active / Published
   Embassy Fee: 5000
   Service Fee: 3000
   Final Selling Price: 8000
   
   Required Documents (one per line):
   Valid passport with 6 months validity
   Recent passport photos
   Bank statements (last 6 months)
   Flight booking confirmation
   Hotel reservation
   
   Terms:
   - Visa approval subject to embassy decision
   - Processing time may vary
   - Embassy fee is non-refundable
   - Service fee covers application filing and document review
   ```

4. **Upload an image** or leave blank (S3 fallback will be used)

5. Click **"Create Visa Service"**

6. **Copy the package ID** from the URL or package list

---

## Step 2: View the Visa Detail Page

1. Navigate to: `http://localhost:8080/visa/[PACKAGE-ID]`
   (Replace `[PACKAGE-ID]` with the ID you copied)

2. **What to verify:**

### Hero Section:
- [ ] Visa type badge shows "VISIT VISA"
- [ ] Validity badge shows "90 days"
- [ ] Country name is in the title
- [ ] Description displays properly
- [ ] Processing time pill shows "7 working days"
- [ ] Stay duration pill shows "30 days stay"

### Pricing Card (Right Side):
- [ ] Price Breakdown section shows:
  - Embassy Fee: PKR 5,000
  - Service Fee: PKR 3,000
  - Total Price: PKR 8,000 (large and bold)
- [ ] WhatsApp Inquiry button works
- [ ] Call Our Office button works
- [ ] Security note displays at bottom

### Main Content:
- [ ] Image displays (or fallback if no image)
- [ ] Processing Information grid shows all 4 items:
  - Processing Time: 7 working days
  - Validity Period: 90 days
  - Stay Duration: 30 days
  - Visa Type: visit
- [ ] Required Documents section shows all 5 documents with checkmarks
- [ ] Terms & Conditions displays properly formatted

### Sidebar (Right):
- [ ] "Need Assistance?" card displays
- [ ] WhatsApp and Call buttons work
- [ ] "Application Process" shows 4 steps (numbered 1-4)
- [ ] Important note displays
- [ ] "Browse All Visas" button works

---

## Step 3: Test Responsive Design

### Mobile (375px):
```
Test on actual phone or use browser DevTools
```
- [ ] Hero section stacks vertically
- [ ] Pricing card appears below title on mobile
- [ ] All text is readable
- [ ] Buttons are thumb-friendly
- [ ] No horizontal scrolling
- [ ] Processing info grid becomes 1-2 columns
- [ ] Sidebar appears below main content

### Tablet (768px):
- [ ] Layout starts to use 2-column grid where appropriate
- [ ] Pricing card stays in view
- [ ] Good use of space

### Desktop (1440px):
- [ ] Full 2-column layout (main content + sidebar)
- [ ] Pricing card fixed in hero
- [ ] All elements properly spaced
- [ ] Maximum width container applied

---

## Step 4: Test Empty State

1. Navigate to a non-existent package: http://localhost:8080/visa/invalid-id-12345

2. **What to verify:**
- [ ] Professional empty state displays
- [ ] Title: "Visa Service Not Available"
- [ ] Clear explanation message
- [ ] "Browse Visa Services" button works
- [ ] "Contact Visa Team" WhatsApp button works
- [ ] No ugly error messages

---

## Admin Panel Fields → Frontend Display Mapping

| Admin Panel Field | Frontend Location | Display Format |
|-------------------|-------------------|----------------|
| Country | Hero title | Part of visa name |
| Visa Type | Hero badge + Info grid | Capitalized badge |
| Processing Time | Hero pill + Info grid | With clock icon |
| Validity | Hero badge + Info grid | With calendar icon |
| Stay Duration | Hero pill + Info grid | "X days stay" |
| Embassy Fee | Pricing breakdown | PKR X,XXX |
| Service Fee | Pricing breakdown | PKR X,XXX |
| Final Price | Pricing breakdown + Hero | Large, bold, PKR format |
| Required Documents | Main content section | Each with checkmark icon |
| Terms | Main content card | Formatted text |
| Image | Main content (top) | Responsive image |
| Status | Visibility | Only "active" shown publicly |

---

## Common Issues to Check

1. **Missing Data:**
   - If embassy fee = 0, it should not display in breakdown
   - If service fee = 0, it should not display in breakdown
   - If no documents, fallback message shows
   - If no terms, section is hidden

2. **Price Calculation:**
   - Final price should be visible regardless of fee breakdown
   - Embassy + Service fees are optional displays
   - Total always shows

3. **Responsive Behavior:**
   - No overlapping elements
   - Proper spacing on all devices
   - CTAs accessible on mobile
   - Sidebar moves below on mobile

4. **WhatsApp Integration:**
   - Message includes package name, fees, and URL
   - Opens WhatsApp correctly
   - Message is readable

---

## Screenshots to Compare

Before redesign:
- Basic layout
- Minimal information
- No pricing breakdown
- Simple card design

After redesign:
- Premium hero section
- Complete pricing breakdown (embassy + service fees)
- Processing information grid
- Professional document list
- Application process guide
- Enhanced sidebar
- Better empty state

---

## Success Criteria

✅ All admin panel fields display correctly  
✅ Pricing breakdown shows embassy fee + service fee when > 0  
✅ Responsive on mobile, tablet, desktop  
✅ All CTAs work (WhatsApp, Call, Browse)  
✅ Professional empty state for invalid IDs  
✅ Matches Travelian brand design  
✅ Aligns with visa services listing page design  

---

## Next Steps After Testing

If everything looks good:
1. Test a few different visa types (study, business, umrah)
2. Test with/without images
3. Test with missing optional fields
4. Approve for commit

If issues found:
- Report specific issues
- Include screenshots if possible
- Mention which device/breakpoint
