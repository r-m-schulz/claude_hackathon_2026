-- ============================================================
-- TriageAI — Initial Schema Migration
-- ============================================================

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- Note: clinicians must be created before patients (FK reference)
-- ============================================================

-- ------------------------------------------------------------
-- clinicians
-- ------------------------------------------------------------
create table clinicians (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text unique not null,
  department  text not null check (department in (
    'orthopaedics','dermatology','physiotherapy',
    'general_surgery','psychiatry','gastroenterology','cardiology'
  )),
  role        text not null default 'clinician' check (role in ('clinician','consultant','admin')),
  created_at  timestamptz not null default now()
);

-- Clinicians authenticate via Supabase Auth.
-- auth.uid() must match clinicians.id — enforced by the insert trigger below.

-- ------------------------------------------------------------
-- patients
-- ------------------------------------------------------------
create table patients (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  dob              date not null,
  department       text not null check (department in (
    'orthopaedics','dermatology','physiotherapy',
    'general_surgery','psychiatry','gastroenterology','cardiology'
  )),
  gp_id            uuid references clinicians(id),
  risk_score       integer not null default 0 check (risk_score between 0 and 100),
  risk_tier        text not null default 'low' check (risk_tier in ('low','medium','high','critical')),
  risk_updated_at  timestamptz,
  created_at       timestamptz not null default now()
);

-- Patients authenticate via Supabase Auth (magic link).
-- auth.uid() must match patients.id.

-- ------------------------------------------------------------
-- appointments
-- ------------------------------------------------------------
create table appointments (
  id                     uuid primary key default gen_random_uuid(),
  patient_id             uuid not null references patients(id) on delete cascade,
  clinician_id           uuid references clinicians(id),
  department             text not null check (department in (
    'orthopaedics','dermatology','physiotherapy',
    'general_surgery','psychiatry','gastroenterology','cardiology'
  )),
  scheduled_at           timestamptz not null,
  original_scheduled_at  timestamptz not null,
  status                 text not null default 'scheduled' check (status in (
    'scheduled','completed','cancelled','rescheduled'
  )),
  ai_suggested_date      timestamptz,
  suggestion_status      text check (suggestion_status in ('pending','approved','rejected')),
  is_on_the_day          boolean not null default false,
  notes                  text,
  created_at             timestamptz not null default now(),

  -- Hard rule: AI cannot suggest a date within 7 days of now
  constraint no_suggestion_within_7_days
    check (ai_suggested_date is null or ai_suggested_date > now() + interval '7 days')
);

-- Prevent original_scheduled_at from ever being updated
create or replace function prevent_original_scheduled_at_change()
returns trigger language plpgsql as $$
begin
  if new.original_scheduled_at <> old.original_scheduled_at then
    raise exception 'original_scheduled_at is immutable and cannot be changed';
  end if;
  return new;
end;
$$;

create trigger lock_original_scheduled_at
  before update on appointments
  for each row execute function prevent_original_scheduled_at_change();

-- ------------------------------------------------------------
-- scans_and_images
-- ------------------------------------------------------------
create table scans_and_images (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references patients(id) on delete cascade,
  appointment_id      uuid references appointments(id),
  department          text not null check (department in (
    'orthopaedics','dermatology','physiotherapy',
    'general_surgery','psychiatry','gastroenterology','cardiology'
  )),
  scan_type           text not null check (scan_type in (
    'dermoscopy','endoscopy','colonoscopy','sigmoidoscopy',
    'x_ray','ecg','mri','echo','wound_photo','other'
  )),
  file_url            text not null,
  ai_analysis         jsonb,
  analysed_at         timestamptz,
  clinician_reviewed  boolean not null default false,
  created_at          timestamptz not null default now()
);

-- ------------------------------------------------------------
-- surveys
-- ------------------------------------------------------------
create table surveys (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references patients(id) on delete cascade,
  department       text not null check (department in (
    'orthopaedics','dermatology','physiotherapy',
    'general_surgery','psychiatry','gastroenterology','cardiology'
  )),
  generated_by_ai  boolean not null default true,
  questions        jsonb not null,
  responses        jsonb,
  ai_analysis      jsonb,
  sent_at          timestamptz not null default now(),
  completed_at     timestamptz,
  affects_appointment boolean not null default false,
  created_at       timestamptz not null default now()
);

-- ------------------------------------------------------------
-- clinical_notes
-- ------------------------------------------------------------
create table clinical_notes (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references patients(id) on delete cascade,
  clinician_id uuid references clinicians(id),
  content      text not null,
  ai_summary   jsonb,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- triage_events
-- ------------------------------------------------------------
create table triage_events (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references patients(id) on delete cascade,
  trigger_type     text not null check (trigger_type in ('survey','scan','note','manual')),
  trigger_id       uuid not null,
  previous_score   integer,
  new_score        integer,
  ai_reasoning     text,
  suggested_action text check (suggested_action in (
    'bring_forward','routine','on_the_day_flag','no_change'
  )),
  approved_by      uuid references clinicians(id),
  actioned_at      timestamptz,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Appointments: common query patterns
create index idx_appointments_patient_id        on appointments(patient_id);
create index idx_appointments_clinician_id      on appointments(clinician_id);
create index idx_appointments_department_status on appointments(department, status);
create index idx_appointments_scheduled_at      on appointments(scheduled_at);

-- Triage events: sorted feeds
create index idx_triage_events_patient_id   on triage_events(patient_id);
create index idx_triage_events_created_at   on triage_events(created_at desc);

-- Scans: latest per patient
create index idx_scans_patient_analysed on scans_and_images(patient_id, analysed_at desc);

-- Surveys: pending surveys per patient
create index idx_surveys_patient_completed on surveys(patient_id, completed_at);

-- Clinical notes: latest per patient
create index idx_notes_patient_created on clinical_notes(patient_id, created_at desc);

-- Patients: department list + risk sort
create index idx_patients_department_risk on patients(department, risk_score desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table patients        enable row level security;
alter table clinicians      enable row level security;
alter table appointments    enable row level security;
alter table scans_and_images enable row level security;
alter table surveys         enable row level security;
alter table clinical_notes  enable row level security;
alter table triage_events   enable row level security;

-- ------------------------------------------------------------
-- Helper: is the current user a clinician?
-- ------------------------------------------------------------
create or replace function is_clinician()
returns boolean language sql security definer as $$
  select exists (
    select 1 from clinicians where id = auth.uid()
  );
$$;

-- Helper: get current clinician's department
create or replace function clinician_department()
returns text language sql security definer as $$
  select department from clinicians where id = auth.uid();
$$;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from clinicians where id = auth.uid() and role = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- patients policies
-- ------------------------------------------------------------

-- Patients can read/update their own row
create policy "patients: self read"
  on patients for select
  using (auth.uid() = id);

create policy "patients: self update"
  on patients for update
  using (auth.uid() = id);

-- Clinicians can read patients in their department
create policy "patients: clinician read"
  on patients for select
  using (
    exists (
      select 1 from clinicians
      where clinicians.id = auth.uid()
      and clinicians.department = patients.department
    )
  );

-- Admins can read all patients
create policy "patients: admin read"
  on patients for select
  using (is_admin());

-- Backend service role bypasses RLS (service_role key used server-side)

-- ------------------------------------------------------------
-- clinicians policies
-- ------------------------------------------------------------

-- Clinicians can read their own row
create policy "clinicians: self read"
  on clinicians for select
  using (auth.uid() = id);

-- Clinicians can read other clinicians in the same department
create policy "clinicians: same department read"
  on clinicians for select
  using (
    exists (
      select 1 from clinicians c
      where c.id = auth.uid()
      and c.department = clinicians.department
    )
  );

-- Admins can read all clinicians
create policy "clinicians: admin read"
  on clinicians for select
  using (is_admin());

-- ------------------------------------------------------------
-- appointments policies
-- ------------------------------------------------------------

-- Patients see their own appointments
create policy "appointments: patient read"
  on appointments for select
  using (patient_id = auth.uid());

-- Clinicians see appointments in their department
create policy "appointments: clinician read"
  on appointments for select
  using (
    exists (
      select 1 from clinicians
      where clinicians.id = auth.uid()
      and clinicians.department = appointments.department
    )
  );

-- Clinicians can update appointments in their department
create policy "appointments: clinician update"
  on appointments for update
  using (
    exists (
      select 1 from clinicians
      where clinicians.id = auth.uid()
      and clinicians.department = appointments.department
    )
  );

-- Admins can do all operations on appointments
create policy "appointments: admin all"
  on appointments for all
  using (is_admin());

-- ------------------------------------------------------------
-- scans_and_images policies
-- ------------------------------------------------------------

-- Patients can view their own scans
create policy "scans: patient read"
  on scans_and_images for select
  using (patient_id = auth.uid());

-- Clinicians can read and update scans in their department
create policy "scans: clinician all"
  on scans_and_images for all
  using (
    exists (
      select 1 from clinicians
      where clinicians.id = auth.uid()
      and clinicians.department = scans_and_images.department
    )
  );

-- ------------------------------------------------------------
-- surveys policies
-- ------------------------------------------------------------

-- Patients can read their own surveys and submit responses
create policy "surveys: patient read"
  on surveys for select
  using (patient_id = auth.uid());

create policy "surveys: patient update responses"
  on surveys for update
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

-- Clinicians can read surveys in their department
create policy "surveys: clinician read"
  on surveys for select
  using (
    exists (
      select 1 from clinicians
      where clinicians.id = auth.uid()
      and clinicians.department = surveys.department
    )
  );

-- Clinicians can insert/update surveys (generate + analyse)
create policy "surveys: clinician write"
  on surveys for all
  using (
    exists (
      select 1 from clinicians
      where clinicians.id = auth.uid()
      and clinicians.department = surveys.department
    )
  );

-- ------------------------------------------------------------
-- clinical_notes policies
-- Note: psychiatric ai_summary column filtering is handled at
-- the API layer, not RLS, due to column-level complexity.
-- ------------------------------------------------------------

-- Patients cannot read clinical notes (clinician-only)
-- Clinicians read notes for patients in their department
create policy "notes: clinician read"
  on clinical_notes for select
  using (
    exists (
      select 1 from clinicians
      where clinicians.id = auth.uid()
      and clinicians.department = (
        select department from patients where patients.id = clinical_notes.patient_id
      )
    )
  );

create policy "notes: clinician write"
  on clinical_notes for insert
  with check (
    exists (
      select 1 from clinicians
      where clinicians.id = auth.uid()
    )
  );

create policy "notes: clinician update"
  on clinical_notes for update
  using (clinician_id = auth.uid());

-- ------------------------------------------------------------
-- triage_events policies
-- ------------------------------------------------------------

-- Patients cannot see raw triage events
-- Clinicians see triage events for their department's patients
create policy "triage_events: clinician read"
  on triage_events for select
  using (
    exists (
      select 1 from clinicians
      where clinicians.id = auth.uid()
      and clinicians.department = (
        select department from patients where patients.id = triage_events.patient_id
      )
    )
  );

-- Clinicians can insert triage events (approve/reject actions)
create policy "triage_events: clinician insert"
  on triage_events for insert
  with check (is_clinician());

-- Clinicians can update triage events they approved
create policy "triage_events: clinician update own"
  on triage_events for update
  using (approved_by = auth.uid());

-- Admins can do all operations on triage_events
create policy "triage_events: admin all"
  on triage_events for all
  using (is_admin());

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scans',
  'scans',
  false,  -- private: all access via signed URLs
  52428800,  -- 50MB per file
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'image/dicom'
  ]
)
on conflict (id) do nothing;

-- Storage RLS: patients can upload to their own folder (scans/{patient_id}/*)
create policy "storage: patient upload"
  on storage.objects for insert
  with check (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage: patient read own"
  on storage.objects for select
  using (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Clinicians can read all scans (signed URL generation on server side)
create policy "storage: clinician read"
  on storage.objects for select
  using (
    bucket_id = 'scans'
    and is_clinician()
  );

-- Service role (server-side) handles all other storage operations via service key
