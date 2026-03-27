# Engineer 3: Patient Mobile App

## Mission

Build the patient experience that makes survey completion, appointment visibility, and notification response feel immediate and reliable.

## You Own

- `apps/mobile/**`
- mobile navigation, session handling, local form state, and patient-facing notification UX
- dynamic survey rendering and patient-side validation
- push permission flow, token capture, and deep-link handling

Keep the scope focused on the Expo app. Backend send logic and dashboard workflows belong elsewhere.

## You Do Not Own

- Supabase schema or RLS
- Claude prompts or triage scoring
- Clinician approval workflows
- Dashboard pages
- Server-side notification dispatch

## Primary Deliverables

- Expo app shell
- Magic-link patient auth flow
- Protected patient home screen
- Pending survey list
- Dynamic survey renderer for all supported question types
- Survey submission flow
- Appointment summary on the home screen
- Push permission request and notification tap routing

## Build Order

### Step 1: App Shell And Contracts

- Set up navigation and screen structure.
- Keep survey and appointment payloads typed from shared contracts.
- Use local mock fixtures immediately so the app work does not wait on the backend.

### Step 2: Auth

- Implement the Supabase magic-link flow.
- Handle deep links and session persistence.
- Guard app routes so logged-out patients cannot reach the protected screens.

### Step 3: Survey Inbox And Renderer

- Build the pending survey list screen.
- Build one renderer that supports `scale`, `yes_no`, `multiple_choice`, and `free_text`.
- Support question labels, options, and validation cleanly without department-specific code.

### Step 4: Submission And Refresh

- Submit to the backend once.
- Prevent duplicate submission.
- Show a clear completion state.
- Refresh the patient home and pending survey state after success.

### Step 5: Appointment Home And Notifications

- Show the next appointment and key survey status on the home screen.
- Request push permissions.
- Capture and register the device token once the backend contract exists.
- Route notification taps to the right survey or home view.

## Acceptance Criteria

- A patient can sign in by magic link and stay signed in across app restarts.
- The app can load pending surveys from the backend.
- The renderer can display every current survey question type without hard-coding a department flow.
- Survey submission works once and clearly reflects success or retry state.
- The home screen shows the next appointment and refreshes after submission or approval.
- Notification taps open the correct location in the app.

## Risks To Handle Early

- The spec does not fully define a patient home endpoint, so push Engineer 1 to freeze that contract early.
- Deep-link handling can derail magic-link auth if it is left until late.
- New question variants can break the renderer if optional fields are not handled defensively.
- The mobile app should not expose raw risk scoring unless the backend explicitly decides that is patient-safe.
- Push delivery can slip, but the app still needs a clean in-app path to pending surveys and appointment updates.

## Handoffs

- Ask Engineer 1 for mock and then live payloads for pending surveys, submit survey, and patient home.
- Confirm with Engineer 2 what patient-facing state changes after a clinician approves a suggestion so the mobile copy stays consistent.
- Flag backend contract gaps quickly because the app depends on a small number of well-defined payloads.

## Definition Of Done

- The patient can sign in, open a pending survey, submit it, and return to a refreshed home screen.
- The app can show the next appointment cleanly for the demo patient.
- Notification handling is wired enough that the demo does not rely on manual navigation alone.
