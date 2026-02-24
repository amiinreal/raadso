-- Seed Privacy Policy Content
-- Using Dollar Quoting $$ to handle internal quotes safely

INSERT INTO platform_config (key, value, updated_at)
VALUES (
  'privacy_policy_content',
  $$# Privacy Policy

**Effective Date:** February 7, 2026

Welcome to Raadso ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and share information about you when you use our platform, including our website and services (collectively, the "Services").

We distinguish between two main types of users: **Candidates** (job seekers) and **Employers** (companies hiring).

## 1. Information We Collect

### A. Candidates (Job Seekers)
When you build your professional profile with us, we collect:
- **Identity & Contact:** Name, email address, phone number, location (city/country), and nationality.
- **Professional Profile:** Your work history, education degrees and institutions, skills, languages, headline, and professional summary.
- **Documents:** Uploaded Resumes/CVs, portfolios, and other professional file attachments.
- **Media:** Profile images (if uploaded).
- **Preferences:** Job search criteria, "Open to Work" status, salary expectations, and visibility settings.
- **Behavioral Data:** Jobs you view, save (`saved_jobs`), or apply to, and your search history.

### B. Employers (Companies)
To facilitate the hiring process, we collect:
- **Company Information:** Company name, industry, description, website URL, and branding assets (logo).
- **Media & Content:** Marketing content, including office images and embedded **YouTube videos** to showcase your company culture.
- **Legal & Verification:** Organization number, business validity status, and contact details.
- **Team Members:** Names, emails, and permissions of recruiters and team members invited to the tenant account.
- **Hiring Data:** Job postings, application review notes, and candidate interactions.

### C. Automatically Collected Information
For all users, we automatically collect:
- **Device Information:** IP address, device type, browser type, and operating system.
- **Security Data:** Session tokens, login timestamps, and two-factor authentication (2FA) metadata (device fingerprinting).

## 2. How We Use Your Information

### Candidates
- **Job Matching:** We use automated algorithms to match your skills and experience with job requirements, calculated as a **Compatibility Score**.
- **Applications:** When you apply for a job, your profile and relevant documents are shared with the specific Employer.
- **Recommendations:** We personalize job feeds based on your activity and preferences.
- **Visibility:** If you set your profile to "Searchable," Employers can find you in our candidate database.

### Employers
- **Recruitment:** To manage job postings, track applicant pipelines, and communicate with candidates.
- **Branding:** To display your company profile publicly to prospective candidates.
- **Verification:** To ensure the legitimacy of companies on our platform.

## 3. Automated Processing & AI
We use artificial intelligence to assist in the recruitment process:
- **Compatibility Scores:** We analyze candidate profiles against job descriptions to generate a match score (0-100%) and a skill match analysis.
- **Usage:** These scores aid Employers in sorting applications but do not make automatic decisions. All hiring decisions are made by human recruiters.

## 4. Media & Third-Party Content
- **Images:** Candidates and Employers may upload images. These are stored securely and served via our content delivery networks.
- **YouTube Videos:** Employers may embed YouTube videos on their company pages. Viewing these videos may involve Third-Party cookies from YouTube/Google, subject to their respective privacy policies.

## 5. Security & Data Retention
- **Encryption:** All sensitive data is encrypted in transit and at rest.
- **Access Control:** We support and encourage Two-Factor Authentication (2FA) for all accounts.
- **Audit Logs:** Administrative actions and critical changes are logged to an audit trail for security and compliance.

## 6. Your Rights
You have the right to access, correct, or delete your personal data. You can manage your profile settings directly through the dashboard or contact support for assistance.

## 7. Contact Us
If you have questions about this policy or our data practices, please contact us.
$$,
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
