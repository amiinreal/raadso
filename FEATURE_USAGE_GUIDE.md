# Quick Reference - Dynamic Application Requirements

## 🎯 Feature Overview
Employers can now configure what applicants must submit for each job posting, and manage all applications from a central dashboard.

---

## 👔 For Employers

### Creating a Job with Application Requirements

1. **Click "Create Job"** in the Job Postings tab
2. **Fill in standard job details** (title, location, description, etc.)
3. **Scroll to "Application Requirements" section**
4. **Configure requirements:**
   - ✓ **Check "Require saved candidate profile"** if you want to force applicants to use their profile
   - ✓ **Check "Require CV attachment"** if you need a CV
   - ✓ **Add custom documents** by entering:
     - Document name (e.g., "Portfolio")
     - Description (optional)
     - File types (comma-separated, e.g., "pdf, zip, jpg")
     - Toggle if required or optional
     - Click "Add" button

5. **Review added requirements** in the list below
6. **Click "Save" or "Publish"**

### Managing Applications

1. **Click "Applications" tab** in Employer Dashboard
2. **See all applications** received across all jobs
3. **For each application, view:**
   - ✓ Job title and location
   - ✓ Applicant name and email
   - ✓ What they submitted (profile used, CV attached, files uploaded)
   - ✓ Their cover letter preview
   - ✓ Application date

4. **Update application status** by:
   - Hovering over the status badge
   - Clicking dropdown to select: applied → reviewing → accepted/rejected

---

## 👨‍💼 For Applicants

### Applying to a Job

1. **Navigate to job posting**
2. **Scroll to "Application Requirements" section**
3. **See what's required:**
   - ✓ "Required" = must submit
   - ⚪ No label = optional
   - 📄 Lists file types allowed (e.g., PDF, DOC)

4. **Complete the form:**
   - If profile required → check box "Use my saved profile"
   - If CV required → check box "Attach CV"
   - If files requested → upload each document
   - Cover letter (always optional)

5. **Upload documents:**
   - Click upload button
   - Select file from computer
   - Waits for upload to complete (shows "Uploading...")
   - Success message when done (✓ filename.pdf)

6. **Click "Submit Application"**
7. **System validates:**
   - All required fields filled
   - All required documents uploaded
   - Valid file types selected
   - If error → see clear message about what's missing

8. **Success!** Application submitted to employer

---

## 🔧 Configuration Examples

### Scenario 1: Basic Application (Default)
```
Require Profile: ❌ No
Require CV: ❌ No
Custom Documents: None
Result: Simple apply form with just cover letter
```

### Scenario 2: Professional Developer Role
```
Require Profile: ✅ Yes
Require CV: ✅ Yes
Custom Documents:
  - Portfolio (optional, PDF/ZIP)
  - GitHub Profile (optional, link in cover letter)
Result: Profile + CV mandatory, portfolio optional
```

### Scenario 3: Design Role
```
Require Profile: ✅ Yes
Require CV: ✅ Yes
Custom Documents:
  - Portfolio PDF (required, PDF only)
  - Case Studies (optional, PDF/PPT/DOC)
Result: Must have profile, CV, and portfolio
```

### Scenario 4: Compliance Role
```
Require Profile: ✅ Yes
Require CV: ✅ Yes
Custom Documents:
  - Background Check (required, PDF)
  - Professional License (required, PDF/JPG)
  - Certifications (optional, PDF)
Result: Strict document requirements
```

---

## 📊 Database Fields

### Jobs Table (New Columns)
```sql
require_profile BOOLEAN              -- Default: false
require_cv BOOLEAN                   -- Default: false
custom_file_requirements JSONB       -- Default: '[]'
```

### Applications Table (New Columns)
```sql
used_profile BOOLEAN                 -- Was profile used?
used_cv BOOLEAN                      -- Was CV attached?
custom_files JSONB                   -- Array of uploaded files
```

---

## 🔌 API Endpoints

### Creating a Job with Requirements
```bash
POST /jobs
{
  "title": "Senior Developer",
  "requireProfile": true,
  "requireCv": true,
  "customFileRequirements": [
    {
      "name": "Portfolio",
      "description": "GitHub portfolio or work samples",
      "required": true,
      "fileTypes": ["pdf", "zip", "txt"]
    }
  ]
}
```

### Submitting an Application
```bash
POST /applications
{
  "jobId": 123,
  "candidateId": 456,
  "usedProfile": true,
  "usedCv": true,
  "coverLetter": "I am interested...",
  "customFiles": [
    {
      "requirementId": "req-1",
      "requirementName": "Portfolio",
      "fileName": "portfolio.pdf",
      "fileUrl": "https://cdn.bunny.net/..."
    }
  ]
}
```

### Getting Applications
```bash
GET /applications
Response includes: used_profile, used_cv, custom_files, status, candidate_email
```

### Updating Application Status
```bash
PUT /applications/{applicationId}
{
  "status": "reviewing"  // or "accepted", "rejected"
}
```

---

## ✅ Checklist - Setting Up a Job

- [ ] Job title and location entered
- [ ] Job description and responsibilities filled
- [ ] Employment type selected
- [ ] Salary range entered (optional)
- [ ] Hiring contacts added
- [ ] Application deadline set (optional)
- [ ] Application requirements configured:
  - [ ] Profile requirement set
  - [ ] CV requirement set
  - [ ] Custom documents defined (if needed)
- [ ] Job saved/published

---

## ❌ Common Issues & Solutions

### "File type not allowed"
- Check the file type requirements shown below the upload button
- Only file types listed are allowed (e.g., "PDF, DOC, DOCX")
- If not in list, it will be rejected

### "File too large"
- Maximum file size is 10MB
- Compress your file and try again

### "Required file not uploaded"
- Look for fields marked with red asterisk (*)
- Upload the file and wait for success message

### "Can't find uploaded file"
- Files are stored on Bunny CDN
- If upload shows success (✓), file is stored
- Check your application from employer's view to verify

---

## 🎓 Best Practices

### For Employers
- Only require documents you actually need
- Be specific in document descriptions
- List specific file types to reduce rejections
- Check applications regularly (set reminder)

### For Applicants
- Read requirements carefully before applying
- Upload files that match the job description
- Use clear filenames (e.g., "JohnDoe_Portfolio.pdf")
- Keep cover letter concise but compelling

---

## 📱 Responsive Design
- Works on desktop, tablet, and mobile
- File uploads optimized for all devices
- Status dropdown accessible on all screen sizes
- Form validation errors clearly displayed

---

## 🚀 Future Enhancements
- [ ] Email notifications for status changes
- [ ] Application timeline/activity log
- [ ] Bulk actions (accept/reject multiple)
- [ ] Application filtering and search
- [ ] Export to CSV
- [ ] Automated emails to candidates
- [ ] Integration with calendar/scheduler
