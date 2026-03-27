-- ============================================================
-- TriageAI Demo Seed — Dermatology Patient Journey
-- Implements the hackathon demo scenario from TRIAGEAI_AGENT_SPEC.md
--
-- Patient: 52-year-old, fair skin, family history of melanoma
-- Journey: survey submission → AI flags high risk → clinician approves
--
-- Run AFTER the initial migration.
-- Uses fixed UUIDs so the seed is idempotent and re-runnable.
-- ============================================================

-- Fixed UUIDs for demo entities
-- Clinician:   a1000000-0000-0000-0000-000000000001
-- Patient:     b2000000-0000-0000-0000-000000000001
-- Appointment: c3000000-0000-0000-0000-000000000001
-- Survey:      d4000000-0000-0000-0000-000000000001
-- Triage evt:  e5000000-0000-0000-0000-000000000001

-- ------------------------------------------------------------
-- 1. Demo clinician (dermatology consultant)
-- ------------------------------------------------------------
insert into clinicians (id, full_name, email, department, role)
values (
  'a1000000-0000-0000-0000-000000000001',
  'Dr Sarah Okafor',
  'sarah.okafor@triageai.demo',
  'dermatology',
  'consultant'
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 2. Demo patient
-- Age: 52, fair skin (Fitzpatrick I-II), family history of melanoma
-- ------------------------------------------------------------
insert into patients (id, full_name, dob, department, gp_id, risk_score, risk_tier)
values (
  'b2000000-0000-0000-0000-000000000001',
  'James Whitfield',
  '1973-11-04',
  'dermatology',
  'a1000000-0000-0000-0000-000000000001',
  32,   -- starting risk score (low-medium)
  'low'
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 3. Appointment — 6 weeks from now (the demo starting state)
-- ------------------------------------------------------------
insert into appointments (
  id,
  patient_id,
  clinician_id,
  department,
  scheduled_at,
  original_scheduled_at,
  status
)
values (
  'c3000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'dermatology',
  now() + interval '42 days',   -- 6 weeks out
  now() + interval '42 days',   -- original — never changes
  'scheduled'
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 4. Clinical note (existing history from GP)
-- ------------------------------------------------------------
insert into clinical_notes (patient_id, clinician_id, content, ai_summary)
values (
  'b2000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'Patient referred by GP for routine dermatology review. History of significant UV exposure (outdoor work for 20+ years). Mother had melanoma diagnosed age 67. Patient has Fitzpatrick skin type II. Multiple benign naevi noted on back at last review 18 months ago. No concerning lesions at time of referral.',
  '{
    "severity_score": 32,
    "risk_tier": "low",
    "findings": ["Fitzpatrick type II skin", "Significant UV exposure history", "Family history of melanoma (mother)", "Multiple benign naevi on back"],
    "red_flags": [],
    "confidence": 0.85,
    "recommended_action": "routine",
    "reasoning": "Patient has several melanoma risk factors (UV exposure, family history, skin type) but no active concerning lesions at time of referral. Routine monitoring appropriate.",
    "scoring_framework_used": "ABCDE criteria + CAP Score"
  }'::jsonb
)
on conflict do nothing;

-- ------------------------------------------------------------
-- 5. Pre-completed survey — shows the before state
--    (patient reports new lesion, rapid change — triggers high risk)
-- ------------------------------------------------------------
insert into surveys (
  id,
  patient_id,
  department,
  generated_by_ai,
  questions,
  responses,
  ai_analysis,
  sent_at,
  completed_at,
  affects_appointment
)
values (
  'd4000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001',
  'dermatology',
  true,
  '[
    {"id":"q1","text":"Have you noticed any new moles or skin spots in the past month?","type":"yes_no","clinical_flag_if":{"operator":"eq","value":"yes"}},
    {"id":"q2","text":"Has any existing mole or spot changed in size, shape or colour?","type":"yes_no","clinical_flag_if":{"operator":"eq","value":"yes"}},
    {"id":"q3","text":"How quickly did you notice this change?","type":"multiple_choice","options":["Over several years","Over the past year","Over the past 3 months","Over the past 4 weeks","Within the past 2 weeks"]},
    {"id":"q4","text":"Does the lesion have an irregular or uneven border?","type":"yes_no"},
    {"id":"q5","text":"Does the lesion have more than one colour?","type":"yes_no","clinical_flag_if":{"operator":"eq","value":"yes"}},
    {"id":"q6","text":"How large does the lesion appear to be? (approximate diameter in mm)","type":"scale","scale_min":0,"scale_max":30,"scale_labels":{"min":"Less than 1mm","max":"30mm or more"}},
    {"id":"q7","text":"Has the lesion bled or become crusty?","type":"yes_no","clinical_flag_if":{"operator":"eq","value":"yes"}},
    {"id":"q8","text":"On a scale of 0-10, how concerned are you about this skin change?","type":"scale","scale_min":0,"scale_max":10,"scale_labels":{"min":"Not concerned","max":"Very concerned"},"clinical_flag_if":{"operator":"gte","value":8}}
  ]'::jsonb,
  '[
    {"question_id":"q1","value":"yes"},
    {"question_id":"q2","value":"yes"},
    {"question_id":"q3","value":"Within the past 2 weeks"},
    {"question_id":"q4","value":"yes"},
    {"question_id":"q5","value":"yes"},
    {"question_id":"q6","value":7},
    {"question_id":"q7","value":"no"},
    {"question_id":"q8","value":8}
  ]'::jsonb,
  '{
    "severity_score": 74,
    "risk_tier": "high",
    "findings": [
      "New lesion reported within past month",
      "Rapid colour and shape change within 2 weeks (Evolution — ABCDE E criterion met)",
      "Irregular border reported (Border — ABCDE B criterion met)",
      "Multi-coloured lesion reported (Colour — ABCDE C criterion met)",
      "Estimated diameter 7mm (Diameter — ABCDE D criterion borderline)",
      "Patient self-reports high concern (8/10)"
    ],
    "red_flags": [
      "Rapid evolution over 2 weeks — significant ABCDE red flag",
      "Multiple ABCDE criteria met simultaneously"
    ],
    "confidence": 0.82,
    "recommended_action": "bring_forward",
    "reasoning": "Patient meets multiple ABCDE criteria simultaneously: Border irregularity, Colour variation, and rapid Evolution within 2 weeks. Combined with elevated CAP score (family history of melanoma, Fitzpatrick type II, UV exposure history), this warrants earlier review. Current appointment is 6 weeks away — recommend bringing forward to within 3 weeks.",
    "scoring_framework_used": "ABCDE criteria + CAP Score"
  }'::jsonb,
  now() - interval '2 hours',
  now() - interval '1 hour',
  true
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 6. Triage event — generated after survey analysis
--    Shows the risk jump from 32 → 74
-- ------------------------------------------------------------
insert into triage_events (
  id,
  patient_id,
  trigger_type,
  trigger_id,
  previous_score,
  new_score,
  ai_reasoning,
  suggested_action
)
values (
  'e5000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001',
  'survey',
  'd4000000-0000-0000-0000-000000000001',
  32,
  74,
  'Risk score increased by 42 to 74 (high) following survey analysis. Weighted aggregation: scan 40%, survey 35%, clinical notes 25%. Multiple ABCDE criteria met: rapid evolution (2 weeks), border irregularity, colour variation. CAP score elevated by family history and skin type.',
  'bring_forward'
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 7. Update patient risk score to reflect post-survey state
--    and attach AI suggestion to appointment
-- ------------------------------------------------------------
update patients
set
  risk_score      = 74,
  risk_tier       = 'high',
  risk_updated_at = now() - interval '1 hour'
where id = 'b2000000-0000-0000-0000-000000000001';

update appointments
set
  ai_suggested_date = now() + interval '21 days',   -- bring forward to 3 weeks
  suggestion_status = 'pending'
where id = 'c3000000-0000-0000-0000-000000000001';
