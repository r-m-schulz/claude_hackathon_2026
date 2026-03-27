# TriageAI Presentation Analyst Brief

## Purpose

Create a short, clean, professional hackathon presentation for TriageAI.

The deck should feel:

- clear
- credible
- clinically professional
- technically strong
- ethically grounded

The presentation should not oversell unfinished UI. It should present the strongest real story:

- live clinic workspace
- patient record management
- note and document upload
- Claude-powered extraction and note analysis
- backend triage and scheduling guardrails

## Audience

The audience is hackathon judges.

They are scoring on:

- Impact Potential
- Technical Execution
- Ethical Alignment
- Presentation

The deck should therefore make these points obvious:

- this solves a real healthcare workflow problem
- this is a real full-stack build, not just a concept
- the AI supports doctors, not replaces them
- the team understands safety and limitations

## Core Message

TriageAI helps clinics turn scattered patient information into structured, reviewable clinical workflow.

Short version:

`Better patient context -> better prioritisation -> safer decisions`

## Important Positioning

Do not present this as a fully polished autonomous hospital scheduling product.

Present it as:

- a working clinic workspace
- with real AI-powered patient context extraction
- and a backend triage engine already wired underneath

Say clearly that:

- the business workspace and patient context flow are demo-ready
- the triage logic and safety rules exist in the backend
- the patient mobile app and full triage dashboard are the next layer

This makes the presentation stronger, more honest, and more defensible.

## Recommended Deck Length

Use 7 main slides.

Target time:

- 3 to 4 minutes total

## Design Direction

Keep the slides very simple.

Use:

- white or soft grey background
- navy text
- teal accents
- light green for approved / safe actions
- soft gold or light amber for doctor review / human decision points

Tone:

- medical
- trustworthy
- modern
- not flashy

Avoid:

- crowded slides
- too much text
- complex diagrams
- bold claims about features that are not live in the demo

## Existing Visual Assets

Use these two visuals directly:

- Tech stack graph: [tech-stack-graph.svg](/Users/finn/Documents/Projects/doctor/claude_hackathon_2026/docs/assets/tech-stack-graph.svg)
- Doctor workflow graph: [doctor-workflow-graph.svg](/Users/finn/Documents/Projects/doctor/claude_hackathon_2026/docs/assets/doctor-workflow-graph.svg)

Also use this script file as reference:

- [HACKATHON_PRESENTATION_SCRIPT.md](/Users/finn/Documents/Projects/doctor/claude_hackathon_2026/docs/HACKATHON_PRESENTATION_SCRIPT.md)

## Slide Structure

## Slide 1: Problem

### Goal

Establish the real problem quickly.

### Slide title

`Patient urgency changes. Static scheduling does not.`

### On-slide content

One short sentence:

`Important changes in patient condition are often buried in notes, PDFs, and uploads until it is too late.`

### Speaker note

"In healthcare, a patient may deteriorate between appointments, but most systems do not capture that change well. Important context is fragmented across notes, files, and staff workflows, so teams often react late."

### Visual suggestion

Use a simple split layout:

- left: title and one-sentence problem
- right: one clean healthcare image or abstract medical workflow graphic

## Slide 2: Solution

### Goal

Show what TriageAI does in one sentence.

### Slide title

`TriageAI turns patient context into actionable workflow.`

### On-slide content

Use 3 short phrases:

- `Manage patients in one workspace`
- `Extract meaning from notes and files with Claude`
- `Support safer triage with human review`

### Speaker note

"TriageAI gives clinics one workspace to manage staff, patients, notes, and uploads. Claude reads that context, extracts the important information, and prepares it for safer triage and scheduling decisions."

### Visual suggestion

Simple product overview slide.

Could use:

- 3 horizontal cards
- or one mock product screenshot if available

## Slide 3: Tech Stack

### Goal

Make the build feel real and understandable.

### Slide title

`Simple, real, full-stack architecture`

### Required visual

Use:

![Tech Stack Graph](/Users/finn/Documents/Projects/doctor/claude_hackathon_2026/docs/assets/tech-stack-graph.svg)

### On-slide caption

`Next.js web + API, Claude for analysis, Supabase for auth, storage, and data`

### Speaker note

"Staff use a Next.js web app, patients connect through a mobile layer, the backend is built with Next.js API routes, Claude handles extraction and analysis, and Supabase handles auth, database, and storage."

### Analyst instruction

Do not redraw this as a complicated cloud architecture diagram.

Keep it exactly as a simple 5-block visual.

## Slide 4: Doctor Workflow

### Goal

Show the human-in-the-loop story very clearly.

### Slide title

`AI supports doctors. It does not replace them.`

### Required visual

Use:

![Doctor Workflow Graph](/Users/finn/Documents/Projects/doctor/claude_hackathon_2026/docs/assets/doctor-workflow-graph.svg)

### On-slide caption

`New patient information -> Claude analysis -> risk summary -> doctor review`

### Speaker note

"The workflow is: new patient information comes in, Claude analyzes it, the system creates a risk summary, and the doctor reviews the recommendation. The key point is that the doctor stays in control at every step."

### Analyst instruction

This is one of the most important slides.

Make it visually clean and easy to understand in under 5 seconds.

## Slide 5: What We Built

### Goal

Be explicit about what is actually live.

### Slide title

`Live today`

### On-slide content

Use these 5 points only:

- `Clinic signup and login`
- `Staff and patient management`
- `Patient profile and context timeline`
- `Document upload with extracted text`
- `Claude-powered note analysis`

### Speaker note

"What is live today is the clinic workspace itself. A clinic can sign up, add staff, create patients, upload notes and documents, and see extracted patient context saved back into the timeline. That gives us a real, working foundation for AI-supported triage."

### Visual suggestion

Use either:

- 5 icons in a row
- or 5 clean cards

Avoid screenshots unless they are crisp and readable from distance.

## Slide 6: Ethics and Safety

### Goal

Score strongly on Ethical Alignment.

### Slide title

`AI advises. Humans decide.`

### On-slide content

Use 3 short rules:

- `No automatic appointment moves`
- `7-day safety lock`
- `Psychiatric crisis escalation`

### Speaker note

"We designed safety into the product. The system never automatically moves appointments. The backend enforces a 7-day rule, psychiatric crisis cases can escalate immediately, and every meaningful action is designed for human review."

### Visual suggestion

Use a clean policy-style slide with shield or check icons.

Make it feel calm and trustworthy, not dramatic.

## Slide 7: Impact

### Goal

End on value and future direction.

### Slide title

`Better context today. Better prioritisation tomorrow.`

### On-slide content

Use 3 short outcomes:

- `Less fragmented patient information`
- `Earlier visibility into risk`
- `Safer path to smarter scheduling`

### Speaker note

"Our impact is practical. We help clinics organize patient information, surface important changes earlier, and support doctors with clearer context. That means better decisions, less fragmentation, and a safer path to smarter scheduling."

### Visual suggestion

Use a clean closing slide.

Could include:

- one short impact statement
- one screenshot or abstract background
- team name and product name

## Optional Final Slide

If there is room, add a final title card:

`TriageAI`

`Better context. Safer decisions.`

This is optional.

## Demo Guidance

If the team is live-demoing during the presentation, the deck should match this order:

1. Landing page
2. Login or signup
3. Company workspace
4. Patients page
5. Patient profile
6. Note or file upload
7. Extracted text in the context timeline
8. Return to workflow slide and remind judges that doctor approval is central

## Exact Claims The Deck Can Safely Make

These are safe claims:

- TriageAI is a real full-stack app
- Clinics can create a workspace and manage staff and patients
- Patient notes and documents can be uploaded
- Claude extracts and summarizes context from uploaded material
- Clinical notes can be analyzed into structured outputs
- Backend triage logic and scheduling guardrails exist
- Human approval is central to the design

## Claims To Avoid

Do not claim:

- fully polished mobile patient experience
- fully polished triage dashboard UI in the live demo
- autonomous rescheduling
- doctor replacement
- production-ready deployment

## Suggested Voice

Use language that is:

- calm
- confident
- specific
- non-hype

Preferred phrases:

- `supports clinicians`
- `human-in-the-loop`
- `structured patient context`
- `safer workflow`
- `real full-stack build`

Avoid phrases like:

- `revolutionary`
- `fully automated`
- `replaces manual review`
- `solves healthcare completely`

## Rubric Mapping

### Impact Potential

Message to highlight:

`We solve fragmented patient context and delayed prioritisation in healthcare workflows.`

### Technical Execution

Message to highlight:

`This is a real build with auth, storage, APIs, AI analysis, and a working clinic workspace.`

### Ethical Alignment

Message to highlight:

`The AI supports decision-making, but every important clinical action stays under human control.`

### Presentation

Message to highlight:

`We are being explicit about what is live, what is next, and why it matters.`

## 45-Second Summary For The Team

Use this if the analyst needs a short project summary:

"TriageAI solves a real workflow problem in healthcare: patient urgency changes, but clinic systems are fragmented and slow to reflect it. We built a working clinic workspace where teams can manage patients, upload notes and documents, and use Claude to extract meaningful clinical context. That context can feed a safer triage engine, with strong guardrails so AI supports doctors instead of replacing them."

## Final Deliverable Request For Analyst

Please create:

- a 7-slide main deck
- clean speaker support notes per slide
- a simple visual style using the supplied graphs
- a version suitable for a 3 to 4 minute spoken presentation

Priority:

1. clarity
2. credibility
3. visual simplicity
4. alignment with the judging rubric
