# TriageAI Delivery Framework

## Objective

Build the hackathon MVP around one end-to-end dermatology demo path first:

1. Patient signs in on mobile.
2. Patient receives and completes a survey.
3. Backend analyses the survey with Claude and re-scores the patient.
4. A triage event appears in the clinician dashboard in real time.
5. A clinician reviews and approves the AI suggestion.
6. The appointment changes without violating any hard rules.
7. The patient sees the updated appointment state in the app.

All seven departments should exist in the shared enum and prompt layer, but the first complete flow should be dermatology.

## Non-Negotiables From The Spec

- Never move an appointment automatically. AI suggests; clinician or admin approves.
- Never suggest a date within 7 days of now.
- Never overwrite `original_scheduled_at`.
- Keep the exact department enum values from the spec.
- Keep the exact risk tiers and suggested action values from the spec.
- Psychiatry crisis handling runs before normal survey analysis and can bypass the queue.
- Psychiatric note visibility must be filtered in the API layer.

## Recommended Repo Framework

Use the repo with these logical boundaries from the start, even if the final folder names change:

```text
apps/
  web/              # Next.js dashboard + API routes
  mobile/           # Expo patient app
packages/
  shared/           # shared TypeScript types and API contracts
supabase/
  migrations/       # SQL schema, RLS, seeds
docs/
  *.md              # planning and handoff docs
```

This matters because the three engineers can work in parallel only if shared contracts, server logic, dashboard UI, and mobile UI are clearly separated.

## Workstream Split

| Engineer | Primary ownership | First unblocker they must ship |
|---|---|---|
| Engineer 1 | Platform, Supabase, AI orchestration, backend APIs, triage engine | Shared types, schema, auth assumptions, mock API contracts |
| Engineer 2 | Clinician dashboard, triage feed, patient detail, schedule review flows | Auth shell and dashboard screens against mocked backend contracts |
| Engineer 3 | Patient mobile app, survey flow, appointment home, notifications UX | Expo shell and dynamic survey renderer against mocked survey payloads |

## Shared Contracts To Freeze Early

Freeze these before the UI work goes too far:

- `Department`
- `RiskTier`
- `SuggestedAction`
- `AppointmentStatus`
- `SuggestionStatus`
- `AIAnalysis`
- `SurveyQuestion`
- `AnalyseScanInput`
- `GenerateSurveyInput`
- `AnalyseSurveyInput`
- `GET /api/triage/list` response
- `GET /api/triage/patient/:id` response
- `GET /api/appointments/schedule` response
- `GET /api/surveys/pending/:patient_id` response
- `POST /api/surveys/submit` payload and success shape
- Realtime payloads for `triage_events` and `patients`

## Delivery Sequence

### Phase 0: Skeleton And Contracts

- Engineer 1 creates the base repo shape, shared types, env contract, Supabase client helpers, and SQL migration plan.
- Engineer 2 builds the clinician shell and key pages against static fixtures that match the frozen contracts.
- Engineer 3 builds the Expo shell and dynamic survey renderer against static fixtures that match the frozen contracts.

### Phase 1: Core Backend

- Engineer 1 lands schema, RLS, storage setup, Claude wrapper, prompts, and the three AI endpoints.
- Engineer 2 integrates the live triage list and patient detail views as soon as read APIs exist.
- Engineer 3 integrates pending surveys and submission as soon as patient-facing APIs exist.

### Phase 2: Review And Scheduling Flow

- Engineer 1 lands `triggerTriageEvaluation()`, scheduling rules, and approve/reject/modify endpoints.
- Engineer 2 lands the schedule UI, review modals, and realtime subscriptions.
- Engineer 3 lands appointment home state refresh and notification routing.

### Phase 3: Demo Polish

- Engineer 1 seeds the dermatology demo data and hardens error handling around model output.
- Engineer 2 polishes the clinician happy path and, if time allows, adds the optional scan upload screen.
- Engineer 3 polishes mobile auth, notification UX, and the post-submit confirmation flow.

## Integration Checkpoints

### Checkpoint 1: Contract Freeze

- Shared types compile.
- Engineers 2 and 3 have mock JSON fixtures from Engineer 1.
- Auth identity mapping is agreed: patient and clinician rows must align with Supabase auth IDs or the RLS rules will break.

### Checkpoint 2: Read Integration

- Dashboard can read the ranked triage list and a patient detail payload.
- Mobile can read pending surveys and a patient home payload.
- Both clients stop using local fixtures for their primary screens.

### Checkpoint 3: Write Integration

- Mobile can submit a survey and trigger live backend analysis.
- Dashboard can approve, reject, or modify a suggestion.
- Schedule changes obey the 7-day rule in both API logic and DB constraints.

### Checkpoint 4: Demo Rehearsal

- One seeded dermatology patient flows cleanly from survey completion to clinician approval.
- Realtime updates work.
- Error states are handled well enough that the demo does not dead-end if one API call fails.

## Collaboration Rules

- Engineer 1 owns contract publication. Engineers 2 and 3 should not invent backend shapes in isolation.
- Engineers 2 and 3 should start with mocks immediately instead of waiting for live APIs.
- Any schema or route change that breaks another workstream must be discussed before merge.
- Demo-first beats breadth. Finish the dermatology path before polishing the other six departments.
- Push notifications are important, but they are not allowed to block survey submission, triage review, or appointment approval.
- Stretch work starts only after the core demo path is stable.

## Definition Of MVP Done

- Clinician login works.
- Patient magic-link login works.
- A survey can be generated, rendered, submitted, analysed, and stored.
- A triage event updates the patient risk score and appears in the dashboard.
- A clinician can approve a valid AI suggestion from the dashboard.
- The appointment change is visible to the patient.
- No appointment suggestion violates the 7-day rule.
- The demo can be run end-to-end with seeded dermatology data.
