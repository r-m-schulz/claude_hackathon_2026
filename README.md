# TriageAI Hackathon 2026

Repository scaffold for the TriageAI hackathon MVP described in [TRIAGEAI_AGENT_SPEC.md](./TRIAGEAI_AGENT_SPEC.md).

## Repo Layout

```text
apps/
  web/                 # Next.js clinician dashboard + API routes
  mobile/              # Expo patient app
packages/
  shared/              # shared contracts, enums, and DTOs
supabase/
  migrations/          # SQL migrations
  seeds/               # seed files for demo data
docs/
  *.md                 # planning and engineer ownership docs
```

## Working Model

- `apps/web` is the backend and clinician dashboard surface.
- `apps/mobile` is the patient-facing Expo app.
- `packages/shared` is the single source of truth for shared TypeScript contracts.
- `supabase` holds schema and seed assets for local and hosted environments.

## First Build Target

Finish the dermatology demo path first:

1. Patient signs in on mobile.
2. Patient completes a survey.
3. Backend analyses it and updates triage state.
4. Dashboard shows the new event in real time.
5. Clinician approves the suggestion.
6. Patient sees the updated appointment.

## Planning Docs

- [docs/TRIAGEAI_DELIVERY_FRAMEWORK.md](./docs/TRIAGEAI_DELIVERY_FRAMEWORK.md)
- [docs/ENGINEER_1_PLATFORM_AI_BACKEND.md](./docs/ENGINEER_1_PLATFORM_AI_BACKEND.md)
- [docs/ENGINEER_2_CLINICIAN_DASHBOARD.md](./docs/ENGINEER_2_CLINICIAN_DASHBOARD.md)
- [docs/ENGINEER_3_PATIENT_MOBILE.md](./docs/ENGINEER_3_PATIENT_MOBILE.md)
