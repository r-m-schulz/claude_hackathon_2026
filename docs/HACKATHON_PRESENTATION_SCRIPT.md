# TriageAI Presentation

## Core Message

TriageAI helps clinics turn scattered patient information into structured, reviewable clinical workflow.

Our strongest live demo today is:

- clinic signup and login
- staff and patient management
- patient notes and file uploads
- Claude-powered extraction and note analysis
- a backend triage engine with human approval guardrails

Say this clearly:

> We are not replacing doctors. We are helping clinics collect better context and make better decisions faster.

## Slide 1: Problem

On slide:

`Patient urgency changes. Static scheduling does not.`

Say:

"In healthcare, a patient can deteriorate between appointments, but most systems do not capture that change well. Important context is buried in notes, PDFs, and uploaded files, so teams often react too late."

## Slide 2: Solution

On slide:

`TriageAI turns patient context into actionable workflow.`

Say:

"TriageAI gives clinics one workspace to manage staff, patients, notes, and uploads. Claude reads that context, extracts the important information, and prepares it for safer triage and scheduling decisions."

## Slide 3: Tech Stack

Use this image:

![Tech Stack Graph](/Users/finn/Documents/Projects/doctor/claude_hackathon_2026/docs/assets/tech-stack-graph.svg)

Say:

"Our stack is simple. Staff use a Next.js web app, patients connect through a mobile layer, the backend is built with Next.js API routes, Claude handles extraction and analysis, and Supabase handles auth, database, and storage."

Short version:

"Frontend on top, backend in the middle, Claude and Supabase underneath."

## Slide 4: Doctor Workflow

Use this image:

![Doctor Workflow Graph](/Users/finn/Documents/Projects/doctor/claude_hackathon_2026/docs/assets/doctor-workflow-graph.svg)

Say:

"The workflow is: new patient information comes in, Claude analyzes it, the system creates a risk summary, and the doctor reviews the recommendation. The key point is that the doctor stays in control at every step."

Short version:

"Input, analysis, risk summary, doctor review, final decision."

## Slide 5: What We Built

On slide:

`Live today: workspace, patients, uploads, extraction, analysis`

Say:

"What is live today is the clinic workspace itself. A clinic can sign up, add staff, create patients, upload notes and documents, and see extracted patient context saved back into the timeline. That gives us a real, working foundation for AI-supported triage."

## Slide 6: Ethics and Safety

On slide:

`AI advises. Humans decide.`

Say:

"We designed safety into the product. The system never automatically moves appointments. The backend enforces a 7-day rule, psychiatric crisis cases can escalate immediately, and every meaningful action is designed for human review."

## Slide 7: Impact

On slide:

`Better context today. Better prioritisation tomorrow.`

Say:

"Our impact is practical. We help clinics organize patient information, surface important changes earlier, and support doctors with clearer context. That means better decisions, less fragmentation, and a safer path to smarter scheduling."

## 45-Second Closing

"TriageAI solves a real workflow problem in healthcare: patient urgency changes, but clinic systems are fragmented and slow to reflect it. We built a working clinic workspace where teams can manage patients, upload notes and documents, and use Claude to extract meaningful clinical context. That context can already feed a safer triage engine, with strong guardrails so AI supports doctors instead of replacing them."

## Live Demo Order

1. Show the landing page.
2. Show login or signup.
3. Open the company workspace.
4. Open patients.
5. Open one patient profile.
6. Show a note or file upload.
7. Show the extracted text in the timeline.
8. End on the workflow graph and say the doctor always approves the final action.

## What To Repeat To Judges

- Impact: we solve fragmented patient context and delayed prioritisation.
- Technical: this is a real full-stack app with auth, storage, APIs, and Claude.
- Ethics: AI supports doctors, never replaces them.
