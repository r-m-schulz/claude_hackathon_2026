# TriageAI Web Frontend Links

Use these links while running the Next.js web app.

## Base URL

- Default: http://localhost:3000
- If 3000 is taken, use the port shown in terminal (for example, http://localhost:3002).

## Frontend Routes

- Home scaffold: http://localhost:3000/
- Dashboard index (redirects to triage): http://localhost:3000/
- Triage feed: http://localhost:3000/triage
- Weekly schedule: http://localhost:3000/schedule
- Login: http://localhost:3000/login
- Sign up: http://localhost:3000/signin
- Patient detail (dynamic): http://localhost:3000/patients/[patientId]

## Ready-to-open Patient Examples

- http://localhost:3000/patients/p-1001
- http://localhost:3000/patients/p-1002

## Notes

- Route groups like `(dashboard)` are internal folder structure and do not appear in the URL.
- The dashboard index page redirects to `/triage`.