# MedLens AI

MEDLENS — AI-POWERED CLINICAL INFORMATION INTELLIGENCE

GOOGLE HACKATHON — ONE-SHOT MVP BUILD COMMAND

You are an autonomous senior full-stack engineer, AI engineer, UI/UX designer, and product developer.

Your task is to BUILD the complete working MedLens MVP inside the existing project.

This is a Google Hackathon project, so optimize for:

A genuinely useful problem

Strong and meaningful AI usage

Google/Gemini integration

Excellent user experience

A clear end-to-end demonstration

Technical credibility

Reliability

Innovation

A polished presentation

Minimum unnecessary complexity

DO NOT merely describe the application. BUILD IT.

DO NOT stop after creating the foundation.

DO NOT create a static prototype.

DO NOT waste AI/agent usage on unnecessary features.

1. FIRST ACTION — INSPECT THE EXISTING PROJECT

Before modifying anything:

Inspect the existing MedLens project.

Determine the current frontend.

Determine the current backend.

Determine the database.

Inspect existing components.

Inspect existing API routes.

Inspect existing configuration.

Identify completed functionality.

Identify incomplete functionality.

Identify errors.

If the project already contains working functionality:

REUSE IT.

Do not rebuild working components.

If the project is empty:

Create the required architecture.

2. CORE MEDLENS CONCEPT

MedLens is an:

AI-powered medical information organization and review platform.

The problem:

Medical information is often scattered across prescriptions, laboratory reports, discharge summaries, and other documents.

MedLens transforms these unstructured documents into:

structured information

understandable summaries

medication history

chronological medical history

report comparisons

traceable information

user-verified records

The primary experience must be:

UPLOAD
↓
UNDERSTAND
↓
STRUCTURE
↓
TRACE
↓
VERIFY
↓
ORGANIZE
↓
COMPARE
↓
SUMMARIZE

3. MEDICAL SAFETY BOUNDARY

MedLens is NOT a diagnostic or treatment system.

It must NEVER:

diagnose a disease

prescribe medication

recommend changing medication

recommend stopping medication

recommend increasing/decreasing dosage

invent medical values

invent reference ranges

invent missing dates

invent medication frequency

invent information that is not present in the source

If information is missing:

"Not available in source."

If information requires user verification:

"Review required."

Conditions/diagnoses may only be displayed if explicitly present in the source document.

4. GOOGLE / GEMINI AI INTEGRATION

Use Google Gemini as the primary AI capability where appropriate.

The Gemini API must be accessed ONLY from the backend.

Never expose the Gemini API key in frontend code.

Use Gemini for:

A. Medical document understanding

Extract structured information from uploaded documents.

B. Intelligent summarization

Generate an understandable summary based ONLY on validated extracted information.

C. Document classification

Identify document type such as:

Prescription

Laboratory report

Discharge summary

Medical report

Other medical document

Do NOT use Gemini for deterministic tasks such as:

arithmetic

comparison

sorting

validation

status changes

database operations

Use normal application code for those.

5. AI STRUCTURED EXTRACTION

Do NOT ask Gemini for unrestricted prose as the primary extraction method.

Use structured JSON output.

Minimum schema:

{
"document_type": "",
"document_date": "",
"provider": "",
"medications": [],
"lab_results": [],
"conditions": [],
"procedures": [],
"notes": []
}

Each extracted item should contain provenance information whenever possible.

Validate Gemini output using backend Pydantic schemas BEFORE storing it.

If validation fails:

do not save invalid information

mark processing as REVIEW REQUIRED

preserve the original document

allow retry

6. ARCHITECTURE

Preferred architecture:

Browser
↓
React + Vite
↓
FastAPI
↓
PostgreSQL

AI processing:

FastAPI
↓
Gemini API

Document processing:

Uploaded Document
↓
PyMuPDF text extraction
↓
OCR if necessary
↓
Gemini structured extraction
↓
Pydantic validation
↓
PostgreSQL

The frontend communicates ONLY with FastAPI.

The frontend must NEVER directly communicate with PostgreSQL.

Gemini must NEVER directly write to PostgreSQL.

7. TECHNOLOGY

Use the existing project stack where practical.

Preferred:

Frontend:

React

Vite

Tailwind CSS

React Router

Backend:

Python

FastAPI

Pydantic

SQLAlchemy

JWT authentication

secure password hashing

Database:

PostgreSQL

Document processing:

PyMuPDF

Tesseract OCR when required

AI:

Google Gemini API

Do not introduce unnecessary frameworks or dependencies.

8. MINIMUM DATABASE

Create only the necessary entities:

users
patients
documents
extracted_records
medications
audit_logs

Use:

primary keys

foreign keys

timestamps

relationships

Keep document-to-record relationships intact.

9. AUTHENTICATION

Implement:

Register

Login

Logout

JWT authentication

Protected routes

Password hashing

Handle:

invalid credentials

duplicate registration

invalid/expired token

unauthorized access

Keep this simple.

10. PATIENT PROFILE

Allow the user to create and manage a patient profile.

Fields:

name

date of birth

gender

contact information

Clearly label these:

USER-ENTERED

Never infer missing patient information.

11. DOCUMENT UPLOAD

Support:

PDF

JPG/PNG images where practical

Display:

filename

upload date

document type

processing status

verification status

Processing states:

UPLOADED
PROCESSING
READY
FAILED
REVIEW REQUIRED

Validate file type and file size.

Store files securely outside the public web root.

12. DOCUMENT PROCESSING

Implement:

UPLOAD
↓
TEXT EXTRACTION
↓
OCR IF REQUIRED
↓
GEMINI EXTRACTION
↓
PYDANTIC VALIDATION
↓
DATABASE STORAGE
↓
USER REVIEW

Do not over-engineer the processing system.

The objective is a reliable demo.

13. PROVENANCE — CORE DIFFERENTIATOR

Every important medical value must show where it came from.

Use four categories:

DOCUMENT

Information directly found in the uploaded document.

USER

Information entered by the user.

CALCULATED

Information calculated by application code.

AI

Information generated by Gemini.

Example:

[DOCUMENT]
Hemoglobin: 13.2 g/dL
Source: BloodReport.pdf
Page: 1

[CALCULATED]
Change from previous report: +0.4 g/dL

[AI]
Summary generated from validated information.

Never represent AI-generated information as document-derived information.

Never invent page numbers.

14. VERIFICATION SYSTEM

All AI-extracted records initially show:

UNVERIFIED

Provide:

VERIFY
EDIT
REJECT

After verification:

VERIFIED

After modification:

EDITED

Keep the original extracted value in the audit history.

This must actually update the database.

15. MEDICATION HISTORY

Create a dedicated Medication History section.

Display:

medication name

strength if available

frequency if available

start date if available

end date if available

source document

verification status

If unavailable:

Not specified

Never invent medication information.

Do not recommend medication changes.

16. MEDICAL TIMELINE

Create a chronological timeline containing:

document uploaded

document processed

information extracted

information verified

information edited

Example:

05 Sep 2026
Prescription uploaded

05 Sep 2026
Medication extracted

06 Sep 2026
Medication verified

The timeline should be visually easy to understand.

17. REPORT COMPARISON

Implement a simple report comparison system.

Allow users to select two compatible reports.

Compare available laboratory values.

Example:

HEMOGLOBIN

Previous:
12.8 g/dL

Current:
13.2 g/dL

Change:
+0.4 g/dL

Label the change:

CALCULATED

Use neutral wording.

Never make a medical conclusion from the change.

18. "WHAT CHANGED?" VIEW

Add a simple but visually impressive feature:

WHAT CHANGED?

When comparing two reports, show only changed values.

Example:

WHAT CHANGED?

Hemoglobin
12.8 → 13.2
+0.4
CALCULATED

Blood Pressure
118/78 → 120/80
CALCULATED

This should be one of the main hackathon demonstration moments.

19. AI SUMMARY

Generate a concise understandable summary using Gemini.

The summary must be generated ONLY from validated information.

Start with:

"Based on the uploaded records..."

Clearly label:

AI-GENERATED SUMMARY

The summary must not:

diagnose

prescribe

recommend treatment

invent information

20. DASHBOARD

Create a polished dashboard showing:

patient overview

number of documents

medications

verification status

recent documents

recent timeline events

quick upload

The dashboard should immediately explain what MedLens does.

21. MINIMUM PAGES

Implement only:

Landing

Register

Login

Dashboard

Patient

Documents

Document Details

Medications

Timeline

Compare Reports

Do not create unnecessary pages.

22. USER EXPERIENCE

The UI should feel like a serious modern health-information product.

Use:

clean navigation

professional typography

cards

tables

status badges

provenance badges

verification badges

timeline

responsive layout

useful empty states

useful loading states

useful error states

Avoid:

excessive animation

generic chatbot layout

unnecessary visual effects

excessive dependencies

The main workflow should always remain visible:

UPLOAD → UNDERSTAND → VERIFY → ORGANIZE → COMPARE

23. HACKATHON "WOW" EXPERIENCE

The application should have ONE clear memorable demonstration.

Build the demo around this:

"From a messy medical document to a traceable patient record in seconds."

Demonstration:

Upload a sample medical document.

Show processing.

Gemini extracts structured information.

Show medication/lab values.

Click an extracted value.

Show its source/provenance.

Show UNVERIFIED.

Verify it.

Open medication history.

Compare another report.

Show WHAT CHANGED?

Generate AI summary.

Show audit history.

Make this workflow visually polished and fast.

24. ERROR HANDLING

Handle:

Invalid login
→ clear message

Invalid document
→ reject upload

File too large
→ clear message

OCR failure
→ REVIEW REQUIRED

Gemini failure
→ retry option

Invalid Gemini JSON
→ do not save

Database error
→ user-friendly error

Network failure
→ retry

Missing source information
→ "Not available in source."

The original document must never be lost because AI processing failed.

25. SECURITY

Implement:

password hashing

JWT

protected APIs

backend authorization

input validation

file validation

environment variables

safe database access

Never expose:

Gemini API key

database password

JWT secret

in frontend code.

26. AI-CREDIT / AGENT EFFICIENCY

IMPORTANT:

This task must be completed with minimum possible agent usage.

Therefore:

inspect before editing

reuse existing code

do not regenerate the entire application

do not repeatedly rewrite files

do not install unnecessary packages

do not add unnecessary AI calls

use deterministic code for calculations/comparisons

keep Gemini calls limited to extraction/classification/summary

avoid unnecessary refactoring

fix errors directly

If an existing component works, reuse it.

27. ONE-SHOT BUILD REQUIREMENT

Attempt to complete the entire MVP during this task.

DO NOT stop after:

project setup

database setup

authentication

placeholder pages

Continue until the core workflow is connected.

If an implementation error occurs:

inspect

fix

run again

continue

Do not stop because of a normal development error.

If an external API key is unavailable:

create the correct backend integration

use environment configuration

provide a clear configuration error

do not pretend a fake AI response is Gemini

28. TESTING

Before finishing, test:

registration

login

patient creation

document upload

document extraction

Gemini integration

structured validation

record display

provenance

verification

editing

medication history

timeline

report comparison

What Changed?

AI summary

audit log

Fix obvious runtime errors.

29. DO NOT OVERBUILD

Skip advanced features that are not essential.

Do NOT add:

chatbot

appointment booking

payment

e-commerce

doctor marketplace

wearable integration

social networking

complex notification systems

multi-agent systems

vector database

unnecessary RAG

unnecessary microservices

advanced analytics

A smaller working application is better than a larger broken application.

30. SYNTHETIC DEMO DATA

If sample medical documents/data are needed:

Use clearly labelled:

SYNTHETIC DEMO DATA

Never imply that fabricated information belongs to a real patient.

Keep demo data separate from user-created data.

31. FINAL ACCEPTANCE TEST

MedLens is complete only when this workflow works:

USER
↓
LOGIN
↓
PATIENT PROFILE
↓
UPLOAD MEDICAL DOCUMENT
↓
TEXT EXTRACTION / OCR
↓
GEMINI UNDERSTANDS DOCUMENT
↓
STRUCTURED INFORMATION
↓
VALIDATION
↓
PROVENANCE
↓
UNVERIFIED
↓
VERIFY / EDIT / REJECT
↓
MEDICATION HISTORY
↓
MEDICAL TIMELINE
↓
COMPARE REPORTS
↓
WHAT CHANGED?
↓
GEMINI SUMMARY
↓
AUDIT HISTORY

32. FINAL EXECUTION COMMAND

START NOW.

First inspect the existing MedLens project.

Then determine what already exists.

Then implement the missing functionality.

Reuse working code.

Build the complete minimum viable application.

Run the application.

Test the workflow.

Fix errors.

Continue until the core workflow works.

DO NOT STOP AT THE FOUNDATION.

DO NOT BUILD A STATIC MOCKUP.

DO NOT OVERBUILD.

DO NOT WASTE AGENT QUOTA.

The final product must demonstrate:

AI + medical document understanding + structured information + provenance + verification + longitudinal organization + comparison

with a polished, memorable Google Hackathon demo experience.

FINAL REPORT

After implementation, provide:

1. COMPLETED FEATURES

Only features actually implemented.

2. ARCHITECTURE

Final project structure.

3. GEMINI INTEGRATION

How Gemini is used.

4. DATABASE

Implemented tables.

5. API

Implemented endpoints.

6. SECURITY

Implemented protections.

7. TESTING

What was actually tested.

8. LIMITATIONS

Only genuine limitations.

9. RUN INSTRUCTIONS

Exact frontend/backend/database commands.

10. HACKATHON DEMO

A concise 5-minute demonstration sequence.

Do not claim something works unless it has actually been implemented and tested.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://docu-scan-health.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cd17d477-dd33-4053-854a-10a45b986a0a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
