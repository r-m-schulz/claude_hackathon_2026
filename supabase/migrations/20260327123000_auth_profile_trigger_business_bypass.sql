-- ============================================================
-- TriageAI — Auth Profile Trigger Business Bypass
--
-- Business workspace routes create and manage their own clinician,
-- patient, and employee rows. Those auth users must not be auto-
-- provisioned by the legacy handle_new_auth_user trigger.
-- ============================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role           text;
  v_full_name      text;
  v_department     text;
  v_clinician_role text;
  v_dob            date;
  v_skip_profile   text;
begin
  v_skip_profile := coalesce(lower(new.raw_user_meta_data ->> 'skip_profile_provisioning'), 'false');

  if v_skip_profile = 'true' then
    return new;
  end if;

  v_role           := new.raw_user_meta_data ->> 'role';
  v_full_name      := new.raw_user_meta_data ->> 'full_name';
  v_department     := new.raw_user_meta_data ->> 'department';
  v_clinician_role := coalesce(new.raw_user_meta_data ->> 'clinician_role', 'clinician');

  if v_role is null then
    raise exception 'auth.users insert missing required metadata field: role';
  end if;
  if v_full_name is null then
    raise exception 'auth.users insert missing required metadata field: full_name';
  end if;
  if v_department is null then
    raise exception 'auth.users insert missing required metadata field: department';
  end if;

  if v_department not in (
    'orthopaedics','dermatology','physiotherapy',
    'general_surgery','psychiatry','gastroenterology','cardiology'
  ) then
    raise exception 'Invalid department value: %', v_department;
  end if;

  if v_role = 'clinician' then
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

  else
    raise exception 'Unknown role value: %. Must be "clinician" or "patient"', v_role;
  end if;

  return new;
end;
$$;
