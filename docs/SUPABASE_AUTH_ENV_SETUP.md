# Supabase Auth + Env Setup

## 1) Create your local env file

From the repo root:

```bash
cp apps/web/env.local.template apps/web/.env.local
```

Then edit `apps/web/.env.local`.

## 2) Where to find each key in Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase Dashboard -> **Project Settings** -> **API** -> **Project URL**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Supabase Dashboard -> **Project Settings** -> **API** -> **Project API keys** -> **anon public**
- `SUPABASE_SERVICE_ROLE_KEY`
  - Supabase Dashboard -> **Project Settings** -> **API** -> **Project API keys** -> **service_role secret**
  - Keep this server-only; never expose in browser code.
- `ANTHROPIC_API_KEY`
  - Anthropic Console -> **API Keys**
- `NEXT_PUBLIC_SITE_URL`
  - For local dev: `http://localhost:3000`

## 3) Enable email/password auth in Supabase

- Supabase Dashboard -> **Authentication** -> **Providers** -> **Email**
- Enable **Email provider**
- Enable **Email + Password** sign-ins
- Optional: disable "Confirm email" for faster hackathon testing

## 4) Create a test clinician user

In Supabase:

- **Authentication** -> **Users** -> **Add user**
- Use an email/password you can log in with

Then ensure this user also exists in your `clinicians` table with the **same UUID** as `auth.users.id`.

## 5) New web auth flow in this repo

- `/login` now uses Supabase `signInWithPassword`.
- `/` checks session and redirects to `/login` if signed out.
- Home page includes a `Sign out` button.

## 6) Run the app

```bash
pnpm dev:web
```

Open [http://localhost:3000/login](http://localhost:3000/login).
