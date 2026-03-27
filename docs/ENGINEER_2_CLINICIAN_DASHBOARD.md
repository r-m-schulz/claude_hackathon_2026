# Engineer 2: Clinician Dashboard

## Mission

Build the clinician-facing control surface that makes AI recommendations reviewable, explainable, and safe to action.

## You Own

- `apps/web/src/app/(dashboard)/**`
- `apps/web/src/components/dashboard/**`
- `apps/web/src/components/calendar/**`
- `apps/web/src/components/triage/**`
- `apps/web/src/lib/client/**`
- web-only hooks, dashboard state, and presentation logic

If the repo shape changes, keep ownership focused on the clinician UI surface and not the backend rules.

## You Do Not Own

- Supabase schema or RLS
- Claude integration and AI scoring logic
- Appointment rule enforcement
- Patient mobile flows
- Notification send infrastructure

## Primary Deliverables

- Clinician login flow and protected dashboard shell
- Triage list ranked by risk and urgency
- Patient detail page with triage history and AI reasoning
- Weekly schedule view using FullCalendar
- Approve flow for AI suggestions
- Reject flow with reason capture
- Modify flow for clinician-edited dates
- Realtime subscriptions for new triage events and patient risk updates
- Optional scan upload and AI result display for the bonus dermatology demo

## Build Order

### Step 1: Build Against Mock Contracts

- Start immediately with static fixtures shaped like the backend contracts.
- Build route structure, protected layout, and loading states before the backend is fully ready.
- Keep the UI strongly typed so contract drift becomes obvious quickly.

### Step 2: Triage Feed First

- Make the default landing page the ranked triage list.
- Show patient name, department, current risk tier, latest trigger, suggested action, and pending status.
- Make it easy for the clinician to jump straight into one flagged patient.

### Step 3: Patient Detail And Explainability

- Show the risk history and timeline of triage events.
- Show the latest survey, scan, note summary, and appointment context.
- Surface AI reasoning in plain language so the clinician knows why the patient is flagged.

### Step 4: Scheduling And Review Actions

- Build the weekly calendar view.
- Overlay AI suggestion states clearly.
- Support approve, reject, and modify flows with strong validation feedback.
- Reflect the on-the-day flag and any consultant-approval conditions returned by the backend.

### Step 5: Realtime And Polish

- Subscribe to `triage_events` inserts.
- Subscribe to patient risk updates.
- Prevent duplicate inserts on reconnect.
- Add empty, loading, and failure states that still let the demo recover.

## Acceptance Criteria

- Unauthenticated users cannot access the dashboard.
- Clinicians land on a working triage feed after login.
- The triage list sorts and renders from typed payloads rather than hard-coded UI assumptions.
- A flagged dermatology patient can be opened and understood without leaving the patient detail page.
- Approve, reject, and modify all call the correct backend routes and show success or failure clearly.
- The schedule visually distinguishes scheduled, pending, approved, rejected, and on-the-day states.
- New triage events appear without a full page refresh.

## Risks To Handle Early

- Backend contract drift will cause churn. Push for payload freeze early.
- Realtime ordering can create duplicates or stale ranking if it is handled loosely.
- The UI must never imply that the AI has already changed the schedule.
- Psychiatric data should only render what the backend explicitly returns.
- The modify flow must make the difference between AI suggestion review and manual rescheduling obvious.

## Handoffs

- Ask Engineer 1 for fixtures on day one and replace them with live data route by route.
- Confirm the exact payloads for triage list, patient detail, schedule, and action responses before polishing the UI.
- Coordinate with Engineer 3 on any patient-visible status language so the dashboard and mobile app describe the same state consistently.

## Definition Of Done

- The clinician can log in, see a live high-risk patient, inspect the reasoning, and approve the suggestion.
- The dashboard reflects backend truth rather than re-implementing scheduling logic on the client.
- The dermatology demo flow is smooth enough to present without explaining missing UI pieces.
