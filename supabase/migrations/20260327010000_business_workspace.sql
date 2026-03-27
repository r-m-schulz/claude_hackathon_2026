-- ============================================================
-- TriageAI — Business Workspace Extension
-- ============================================================

create table businesses (
  id                  uuid primary key default gen_random_uuid(),
  owner_auth_user_id  uuid unique not null,
  name                text not null,
  legal_name          text,
  primary_department  text check (primary_department in (
    'orthopaedics','dermatology','physiotherapy',
    'general_surgery','psychiatry','gastroenterology','cardiology'
  )),
  support_email       text,
  phone               text,
  website             text,
  address_line        text,
  city                text,
  country             text,
  timezone            text not null default 'Europe/Dublin',
  hero_headline       text,
  hero_subheadline    text,
  brand_summary       text,
  workflow_summary    text,
  logo_path           text,
  logo_url            text,
  header_image_path   text,
  header_image_url    text,
  onboarding_answers  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table business_employees (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses(id) on delete cascade,
  auth_user_id        uuid unique not null,
  linked_clinician_id uuid references clinicians(id) on delete set null,
  full_name           text not null,
  email               text not null,
  role                text not null check (role in ('practitioner', 'hr')),
  department          text check (department in (
    'orthopaedics','dermatology','physiotherapy',
    'general_surgery','psychiatry','gastroenterology','cardiology'
  )),
  job_title           text,
  is_owner            boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint business_employees_business_email_unique unique (business_id, email)
);

alter table clinicians
  add column if not exists business_id uuid references businesses(id) on delete set null;

alter table patients
  add column if not exists business_id uuid references businesses(id) on delete set null,
  add column if not exists auth_user_id uuid unique,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists paired_at timestamptz,
  add column if not exists created_by_employee_id uuid references business_employees(id) on delete set null;

create table patient_context_entries (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null references businesses(id) on delete cascade,
  patient_id             uuid not null references patients(id) on delete cascade,
  created_by_employee_id uuid references business_employees(id) on delete set null,
  entry_type             text not null check (entry_type in ('note', 'image', 'pdf', 'file')),
  title                  text not null,
  body_text              text,
  extracted_text         text,
  file_name              text,
  mime_type              text,
  file_bucket            text,
  file_path              text,
  metadata               jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now()
);

create index idx_business_employees_business_id on business_employees(business_id);
create index idx_business_employees_auth_user_id on business_employees(auth_user_id);
create index idx_patients_business_id on patients(business_id);
create index idx_patients_auth_user_id on patients(auth_user_id);
create index idx_patient_context_entries_patient_created
  on patient_context_entries(patient_id, created_at desc);
create index idx_patient_context_entries_business_created
  on patient_context_entries(business_id, created_at desc);

alter table businesses enable row level security;
alter table business_employees enable row level security;
alter table patient_context_entries enable row level security;

create policy "businesses: employee read"
  on businesses for select
  using (
    exists (
      select 1
      from business_employees
      where business_employees.business_id = businesses.id
      and business_employees.auth_user_id = auth.uid()
    )
  );

create policy "businesses: employee update"
  on businesses for update
  using (
    exists (
      select 1
      from business_employees
      where business_employees.business_id = businesses.id
      and business_employees.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from business_employees
      where business_employees.business_id = businesses.id
      and business_employees.auth_user_id = auth.uid()
    )
  );

create policy "business_employees: same business read"
  on business_employees for select
  using (
    exists (
      select 1
      from business_employees viewer
      where viewer.business_id = business_employees.business_id
      and viewer.auth_user_id = auth.uid()
    )
  );

create policy "patients: business employee read"
  on patients for select
  using (
    business_id is not null
    and exists (
      select 1
      from business_employees
      where business_employees.business_id = patients.business_id
      and business_employees.auth_user_id = auth.uid()
    )
  );

create policy "patients: paired account read"
  on patients for select
  using (auth_user_id = auth.uid());

create policy "patients: paired account update"
  on patients for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy "patient_context_entries: business employee read"
  on patient_context_entries for select
  using (
    exists (
      select 1
      from business_employees
      where business_employees.business_id = patient_context_entries.business_id
      and business_employees.auth_user_id = auth.uid()
    )
  );

create policy "patient_context_entries: business employee insert"
  on patient_context_entries for insert
  with check (
    exists (
      select 1
      from business_employees
      where business_employees.business_id = patient_context_entries.business_id
      and business_employees.auth_user_id = auth.uid()
    )
  );

create policy "patient_context_entries: paired patient read"
  on patient_context_entries for select
  using (
    exists (
      select 1
      from patients
      where patients.id = patient_context_entries.patient_id
      and patients.auth_user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-assets',
  'business-assets',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-documents',
  'patient-documents',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream'
  ]
)
on conflict (id) do nothing;
