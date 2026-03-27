-- ============================================================
-- TriageAI — Auth Profile Auto-Provisioning Trigger
--
-- When a new user is created in auth.users, this trigger reads
-- raw_user_meta_data and automatically creates the matching row
-- in either `clinicians` or `patients` with id = auth.users.id.
--
-- This is what makes auth.uid() == clinicians.id / patients.id
-- reliable for all RLS policies.
--
-- Metadata contract (set at signUp or via admin API):
--   raw_user_meta_data: {
--     role:            "clinician" | "patient"   (required)
--     full_name:       string                     (required)
--     department:      string                     (required)
--     -- clinician only --
--     clinician_role:  "clinician"|"consultant"|"admin"  (optional, default "clinician")
--     -- patient only --
--     dob:             "YYYY-MM-DD"               (required for patients)
--     onboarding_status: "active"|"unverified"    (optional, default "active")
--     -- Future: onboarding_code will gate patient activation. Not enforced yet.
--   }
-- ============================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
-- security definer so the function can write to clinicians/patients
-- even when called in the context of an anon/authenticated role
set search_path = public
as $$
declare
  v_role           text;
  v_full_name      text;
  v_department     text;
  v_clinician_role text;
  v_dob            date;
  v_onboarding     text;
begin
  -- Read fields from raw_user_meta_data (set by client signUp call)
  v_role           := new.raw_user_meta_data ->> 'role';
  v_full_name      := new.raw_user_meta_data ->> 'full_name';
  v_department     := new.raw_user_meta_data ->> 'department';
  v_clinician_role := coalesce(new.raw_user_meta_data ->> 'clinician_role', 'clinician');
  v_onboarding     := coalesce(new.raw_user_meta_data ->> 'onboarding_status', 'active');

  -- Validate required fields common to all roles
  if v_role is null then
    raise exception 'auth.users insert missing required metadata field: role';
  end if;
  if v_full_name is null then
    raise exception 'auth.users insert missing required metadata field: full_name';
  end if;
  if v_department is null then
    raise exception 'auth.users insert missing required metadata field: department';
  end if;

  -- Validate department value
  if v_department not in (
    'orthopaedics','dermatology','physiotherapy',
    'general_surgery','psychiatry','gastroenterology','cardiology'
  ) then
    raise exception 'Invalid department value: %', v_department;
  end if;

  if v_role = 'clinician' then
    -- Validate clinician_role
    if v_clinician_role not in ('clinician','consultant','admin') then
      raise exception 'Invalid clinician_role value: %', v_clinician_role;
    end if;

    insert into public.clinicians (id, full_name, email, department, role)
    values (
      new.id,
      v_full_name,
      new.email,
      v_department,
      v_clinician_role
    )
    on conflict (id) do nothing;

  elsif v_role = 'patient' then
    v_dob := (new.raw_user_meta_data ->> 'dob')::date;

    if v_dob is null then
      raise exception 'auth.users insert for patient missing required metadata field: dob';
    end if;

    insert into public.patients (id, full_name, dob, department, risk_score, risk_tier)
    values (
      new.id,
      v_full_name,
      v_dob,
      v_department,
      0,
      'low'
    )
    on conflict (id) do nothing;

    -- NOTE: onboarding_status is captured in raw_user_meta_data for now.
    -- Future: when one-time-code onboarding is added, check v_onboarding here
    -- and reject or flag patients with status = 'unverified' until code is redeemed.

  else
    raise exception 'Unknown role value: %. Must be "clinician" or "patient"', v_role;
  end if;

  return new;
end;
$$;

-- Attach trigger to auth.users
-- Drops first so this migration is safe to re-run
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
