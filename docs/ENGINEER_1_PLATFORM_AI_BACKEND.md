# Engineer 1: Platform, AI, And Backend

## Mission

Own the server-side source of truth so the other two engineers can build against stable contracts instead of guessing.

## You Own

- `supabase/**`
- `packages/shared/**`
- `apps/web/src/app/api/**`
- `apps/web/src/lib/server/**`
- `apps/web/src/lib/claude.ts`
- `apps/web/src/lib/prompts.ts`
- `apps/web/src/lib/triage.ts`
- `apps/web/src/lib/scheduling.ts`
- `apps/web/src/lib/psychiatric.ts`
- demo seed data and backend fixtures

If the final folder names differ, keep this same logical ownership.

## You Do Not Own

- Clinician dashboard pages and components
- Mobile screens and navigation
- Notification presentation on the device
- Any UI-only state management that lives purely in web or mobile

## Primary Deliverables

- Supabase migrations for the spec schema
- RLS policies and auth assumptions that make `auth.uid()` reliable
- Storage setup for uploaded scans and images
- Shared enums, interfaces, and request/response DTOs
- Claude wrapper and department prompt library
- `POST /api/ai/analyse-scan`
- `POST /api/ai/generate-survey`
- `POST /api/ai/analyse-survey`
- `POST /api/ai/summarise-note` if time allows after the main demo path
- `triggerTriageEvaluation()` and score aggregation
- `createAppointmentSuggestion()` and scheduling rules
- `GET /api/triage/list`
- `GET /api/triage/patient/:id`
- `POST /api/triage/approve`
- `POST /api/triage/reject`
- `POST /api/triage/modify`
- `GET /api/appointments/schedule`
- `POST /api/appointments/on-the-day`
- `POST /api/appointments/reschedule`
- `GET /api/surveys/pending/:patient_id`
- `POST /api/surveys/submit`
- minimal patient home read endpoint if needed to unblock mobile

## Build Order

### Step 1: Freeze Shared Contracts

- Define the department enum, risk tiers, suggested actions, survey question shape, AI analysis shape, and route DTOs.
- Decide how auth identities map to `patients.id` and `clinicians.id`.
- Publish sample payloads for the dashboard and mobile engineers on day one.

### Step 2: Land The Data Layer

- Create the SQL migrations for all core tables.
- Apply all required constraints from the spec.
- Add RLS policies.
- Add any indexes needed for list and schedule queries.
- Set up storage for image uploads.

### Step 3: Build AI Primitives

- Create `claude.ts`.
- Create `prompts.ts` for all seven departments.
- Parse model JSON safely and fail clearly when malformed.
- Start with the dermatology path first.

### Step 4: Build Triage And Scheduling

- Implement `triggerTriageEvaluation()`.
- Implement `scoreToTier()` and `tierToAction()`.
- Implement psychiatric crisis escalation before normal survey analysis.
- Implement the 7-day scheduling rule in application logic as well as SQL.

### Step 5: Ship Integration APIs

- Publish read APIs first so Engineer 2 and Engineer 3 can wire their screens.
- Publish write APIs second.
- Document realtime payload shapes.
- Seed one complete dermatology patient journey for demo use.

## Acceptance Criteria

- Fresh-project Supabase migration succeeds without manual edits.
- The 7-day suggestion rule is enforced in both SQL and server logic.
- A survey submission updates `surveys`, `patients`, `triage_events`, and `appointments` correctly.
- The dermatologist demo patient can move from low or medium risk to high risk through AI analysis.
- `original_scheduled_at` is preserved when an appointment changes.
- Psychiatric crisis handling can set a patient to `critical` before the standard scoring flow finishes.
- The dashboard team has stable read and write contracts to integrate against.
- The mobile team has stable pending-survey, submit-survey, and patient-home contracts to integrate against.

## Risks To Handle Early

- The spec assumes `auth.uid()` maps directly to patient and clinician rows. If that mapping is vague, everything above the DB layer becomes brittle.
- `notifyOnCallClinician`, `evaluateFlag`, and `generateReasoning` are referenced but not fully designed. Define them early.
- Psychiatric note filtering is an API-layer privacy rule, not just a DB concern.
- Push delivery can be stubbed temporarily, but the interface to trigger it cannot be left vague.

## Handoffs

- By the first integration checkpoint, give Engineer 2 mock and then live payloads for triage list, patient detail, schedule, and review actions.
- By the first integration checkpoint, give Engineer 3 mock and then live payloads for pending surveys, survey submission, and patient home.
- Call out any contract changes immediately because both UI workstreams depend on your output.

## Definition Of Done

- Backend routes exist for the full dermatology demo path.
- Shared types are reused instead of copied into each app.
- Demo seed data exists.
- Engineers 2 and 3 are not blocked on undocumented server behavior.
