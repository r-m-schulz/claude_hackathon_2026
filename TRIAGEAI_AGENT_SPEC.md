# TRIAGEAI — AGENT TECHNICAL SPECIFICATION
> Version: 1.0 | Stack: Next.js · Supabase · Claude API · React Native (Expo)
> Read this file before writing any code. All architectural decisions are final unless marked `[DISCUSS]`.

---

## SYSTEM OVERVIEW

TriageAI is a multi-department hospital triage and scheduling platform. AI continuously re-evaluates patient risk between appointments based on uploaded scans, images, clinical notes, and patient-submitted surveys. It then generates a priority-ranked patient list and suggested schedule modifications for human approval.

**Critical constraint:** The AI never moves an appointment automatically. All schedule changes require explicit approval from a clinician or admin.

---

## TECH STACK

```
Database:        Supabase (PostgreSQL + Realtime + Storage + Auth)
Backend API:     Next.js API Routes (App Router)
AI Model:        claude-sonnet-4-6 via @anthropic-ai/sdk
Patient App:     React Native + Expo (managed workflow)
Web Dashboard:   Next.js + Tailwind CSS
Push Notifs:     Expo Push Notifications
Calendar UI:     FullCalendar (web dashboard)
Auth:            Supabase Auth — magic link for patients, email/password for clinicians/admins
```

---

## DEPARTMENTS

The system supports exactly 7 departments. Use these string values as enum throughout:

```
orthopaedics
dermatology
physiotherapy
general_surgery
psychiatry
gastroenterology
cardiology
```

---

## DATABASE SCHEMA

All tables in Supabase. Apply RLS policies (see RLS section below).

### Table: `patients`

```sql
create table patients (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  dob             date not null,
  department      text not null check (department in ('orthopaedics','dermatology','physiotherapy','general_surgery','psychiatry','gastroenterology','cardiology')),
  gp_id           uuid references clinicians(id),
  risk_score      integer default 0 check (risk_score between 0 and 100),
  risk_tier       text default 'low' check (risk_tier in ('low','medium','high','critical')),
  risk_updated_at timestamptz,
  created_at      timestamptz default now()
);
```

### Table: `clinicians`

```sql
create table clinicians (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  email      text unique not null,
  department text not null,
  role       text default 'clinician' check (role in ('clinician','consultant','admin')),
  created_at timestamptz default now()
);
```

### Table: `appointments`

```sql
create table appointments (
  id                    uuid primary key default gen_random_uuid(),
  patient_id            uuid not null references patients(id),
  clinician_id          uuid references clinicians(id),
  department            text not null,
  scheduled_at          timestamptz not null,
  original_scheduled_at timestamptz not null,    -- never overwrite this
  status                text default 'scheduled' check (status in ('scheduled','completed','cancelled','rescheduled')),
  ai_suggested_date     timestamptz,             -- null if no active suggestion
  suggestion_status     text check (suggestion_status in ('pending','approved','rejected')),
  is_on_the_day         boolean default false,
  notes                 text,
  created_at            timestamptz default now(),

  -- HARD RULE: AI cannot suggest a date within 7 days of now
  -- Enforced at application layer AND here as a constraint on ai_suggested_date
  constraint no_suggestion_within_7_days
    check (ai_suggested_date is null or ai_suggested_date > now() + interval '7 days')
);
```

### Table: `scans_and_images`

```sql
create table scans_and_images (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references patients(id),
  appointment_id      uuid references appointments(id),
  department          text not null,
  scan_type           text not null check (scan_type in ('dermoscopy','endoscopy','colonoscopy','sigmoidoscopy','x_ray','ecg','mri','echo','wound_photo','other')),
  file_url            text not null,             -- Supabase Storage signed URL
  ai_analysis         jsonb,                     -- see AI_OUTPUT_SCHEMA below
  analysed_at         timestamptz,
  clinician_reviewed  boolean default false,
  created_at          timestamptz default now()
);
```

### Table: `surveys`

```sql
create table surveys (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references patients(id),
  department          text not null,
  generated_by_ai     boolean default true,
  questions           jsonb not null,            -- see SURVEY_QUESTION_SCHEMA below
  responses           jsonb,                     -- null until patient submits
  ai_analysis         jsonb,                     -- populated after submission
  sent_at             timestamptz default now(),
  completed_at        timestamptz,
  affects_appointment boolean default false,
  created_at          timestamptz default now()
);
```

### Table: `clinical_notes`

```sql
create table clinical_notes (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references patients(id),
  clinician_id uuid references clinicians(id),
  content      text not null,
  ai_summary   jsonb,                            -- see AI_OUTPUT_SCHEMA below
  created_at   timestamptz default now()
);
```

### Table: `triage_events`

```sql
create table triage_events (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references patients(id),
  trigger_type     text not null check (trigger_type in ('survey','scan','note','manual')),
  trigger_id       uuid not null,               -- FK to the triggering record's id
  previous_score   integer,
  new_score        integer,
  ai_reasoning     text,                        -- plain English explanation
  suggested_action text check (suggested_action in ('bring_forward','routine','on_the_day_flag','no_change')),
  approved_by      uuid references clinicians(id),
  actioned_at      timestamptz,
  created_at       timestamptz default now()
);
```

---

## ROW LEVEL SECURITY (RLS)

Enable RLS on all tables. Apply these policies:

```sql
-- Patients: can only read/update their own row
create policy "patients_self" on patients
  for all using (auth.uid() = id);

-- Appointments: patients see own, clinicians see their department
create policy "appointments_patient" on appointments
  for select using (patient_id = auth.uid());

create policy "appointments_clinician" on appointments
  for all using (
    exists (
      select 1 from clinicians
      where clinicians.id = auth.uid()
      and clinicians.department = appointments.department
    )
  );

-- Psychiatric notes: only treating clinician can view ai_summary
-- Implement by filtering ai_summary out of SELECT for non-treating clinicians
-- Handle in API layer, not RLS, due to column-level complexity
```

---

## AI INTEGRATION

### Client Setup

```typescript
// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk';

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = 'claude-sonnet-4-6';
```

---

### AI OUTPUT SCHEMA

All AI calls return structured JSON. Parse and store in the `ai_analysis` jsonb column.

```typescript
interface AIAnalysis {
  severity_score: number;          // 0-100
  risk_tier: 'low' | 'medium' | 'high' | 'critical';
  findings: string[];              // list of clinical observations
  red_flags: string[];             // list of urgent concerns (empty array if none)
  confidence: number;              // 0-1, model confidence
  recommended_action: 'bring_forward' | 'routine' | 'on_the_day_flag' | 'no_change';
  reasoning: string;               // plain English explanation for clinician
  scoring_framework_used: string;  // e.g. "ABCDE criteria + CAP Score"
}
```

---

### TASK 1: IMAGE / SCAN ANALYSIS

**Endpoint:** `POST /api/ai/analyse-scan`

**Input:**
```typescript
interface AnalyseScanInput {
  scan_id: string;
  patient_id: string;
  department: string;
  scan_type: string;
  file_url: string;       // fetch from Supabase Storage, convert to base64
}
```

**Implementation:**

```typescript
// api/ai/analyse-scan/route.ts
import { claude, MODEL } from '@/lib/claude';
import { DEPARTMENT_PROMPTS } from '@/lib/prompts';

export async function POST(req: Request) {
  const { scan_id, patient_id, department, scan_type, file_url } = await req.json();

  // Fetch image from Supabase Storage and convert to base64
  const imageResponse = await fetch(file_url);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString('base64');
  const mediaType = imageResponse.headers.get('content-type') || 'image/jpeg';

  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: DEPARTMENT_PROMPTS[department].imageAnalysis,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64Image }
        },
        {
          type: 'text',
          text: `Scan type: ${scan_type}. Analyse this image and return only valid JSON matching the AIAnalysis schema. No preamble.`
        }
      ]
    }]
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const analysis: AIAnalysis = JSON.parse(raw.replace(/```json|```/g, '').trim());

  // Store result
  const supabase = createSupabaseServerClient();
  await supabase.from('scans_and_images').update({
    ai_analysis: analysis,
    analysed_at: new Date().toISOString()
  }).eq('id', scan_id);

  // Trigger triage re-evaluation
  await triggerTriageEvaluation(patient_id, 'scan', scan_id, analysis.severity_score);

  return Response.json({ success: true, analysis });
}
```

---

### TASK 2: SURVEY GENERATION

**Endpoint:** `POST /api/ai/generate-survey`

**Input:**
```typescript
interface GenerateSurveyInput {
  patient_id: string;
  department: string;
}
```

**Survey Question Schema** (stored in `surveys.questions`):

```typescript
interface SurveyQuestion {
  id: string;
  text: string;
  type: 'scale' | 'yes_no' | 'multiple_choice' | 'free_text';
  options?: string[];        // for multiple_choice only
  scale_min?: number;        // for scale only (default 0)
  scale_max?: number;        // for scale only (default 10)
  scale_labels?: {           // for scale only
    min: string;
    max: string;
  };
  clinical_flag_if?: {       // optional: if response matches, flag for escalation
    operator: 'gte' | 'lte' | 'eq';
    value: number | string;
  };
}
```

**Implementation:**

```typescript
export async function POST(req: Request) {
  const { patient_id, department } = await req.json();

  const supabase = createSupabaseServerClient();

  // Fetch patient context
  const { data: patient } = await supabase
    .from('patients')
    .select('*, clinical_notes(content, created_at)')
    .eq('id', patient_id)
    .single();

  const recentNotes = patient.clinical_notes
    ?.slice(0, 3)
    .map(n => n.content)
    .join('\n---\n') || 'No recent notes.';

  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: DEPARTMENT_PROMPTS[department].surveyGeneration,
    messages: [{
      role: 'user',
      content: `
        Patient risk tier: ${patient.risk_tier}
        Recent clinical notes: ${recentNotes}
        
        Generate a personalised survey with 5-12 questions.
        Return ONLY valid JSON: { "questions": SurveyQuestion[] }
        No preamble, no markdown.
      `
    }]
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const { questions } = JSON.parse(raw.replace(/```json|```/g, '').trim());

  const { data: survey } = await supabase.from('surveys').insert({
    patient_id,
    department,
    generated_by_ai: true,
    questions,
    sent_at: new Date().toISOString()
  }).select().single();

  return Response.json({ survey_id: survey.id, questions });
}
```

---

### TASK 3: SURVEY RESPONSE ANALYSIS

**Endpoint:** `POST /api/ai/analyse-survey`

**Input:**
```typescript
interface AnalyseSurveyInput {
  survey_id: string;
  patient_id: string;
  responses: { question_id: string; value: string | number }[];
}
```

**Implementation:**

```typescript
export async function POST(req: Request) {
  const { survey_id, patient_id, responses } = await req.json();

  const supabase = createSupabaseServerClient();
  const { data: survey } = await supabase
    .from('surveys')
    .select('*, patients(department, risk_score, risk_tier)')
    .eq('id', survey_id)
    .single();

  const department = survey.patients.department;

  // PSYCHIATRIC CRISIS CHECK — run before anything else
  if (department === 'psychiatry') {
    const crisisDetected = checkPsychiatricCrisisResponses(survey.questions, responses);
    if (crisisDetected) {
      await escalatePsychiatricCrisis(patient_id, survey_id);
      // still continue with full analysis below
    }
  }

  const formattedResponses = responses.map(r => {
    const q = survey.questions.find(q => q.id === r.question_id);
    return `Q: ${q?.text}\nA: ${r.value}`;
  }).join('\n\n');

  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: DEPARTMENT_PROMPTS[department].surveyAnalysis,
    messages: [{
      role: 'user',
      content: `
        Patient current risk score: ${survey.patients.risk_score}
        Patient current risk tier: ${survey.patients.risk_tier}
        
        Survey responses:
        ${formattedResponses}
        
        Analyse these responses and return ONLY valid JSON matching AIAnalysis schema.
        No preamble.
      `
    }]
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const analysis: AIAnalysis = JSON.parse(raw.replace(/```json|```/g, '').trim());

  await supabase.from('surveys').update({
    responses,
    ai_analysis: analysis,
    completed_at: new Date().toISOString()
  }).eq('id', survey_id);

  await triggerTriageEvaluation(patient_id, 'survey', survey_id, analysis.severity_score);

  return Response.json({ success: true, analysis });
}
```

---

### TASK 4: HOLISTIC RISK SCORE AGGREGATION

Called by `triggerTriageEvaluation()` after every scan, survey, or note analysis.

```typescript
// lib/triage.ts

export async function triggerTriageEvaluation(
  patient_id: string,
  trigger_type: 'scan' | 'survey' | 'note' | 'manual',
  trigger_id: string,
  new_component_score: number
) {
  const supabase = createSupabaseServerClient();

  const { data: patient } = await supabase
    .from('patients')
    .select('risk_score, risk_tier, department')
    .eq('id', patient_id)
    .single();

  // Fetch latest scores from each data source
  const [latestScan, latestSurvey, latestNotes] = await Promise.all([
    supabase.from('scans_and_images')
      .select('ai_analysis')
      .eq('patient_id', patient_id)
      .not('ai_analysis', 'is', null)
      .order('analysed_at', { ascending: false })
      .limit(1)
      .single(),
    supabase.from('surveys')
      .select('ai_analysis')
      .eq('patient_id', patient_id)
      .not('ai_analysis', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single(),
    supabase.from('clinical_notes')
      .select('ai_summary')
      .eq('patient_id', patient_id)
      .not('ai_summary', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  // Weighted aggregation
  const WEIGHTS = { scan: 0.40, survey: 0.35, notes: 0.25 };

  const scanScore = latestScan.data?.ai_analysis?.severity_score ?? 0;
  const surveyScore = latestSurvey.data?.ai_analysis?.severity_score ?? 0;
  const notesScores = latestNotes.data?.map(n => n.ai_summary?.severity_score ?? 0) ?? [];
  const avgNotesScore = notesScores.length > 0
    ? notesScores.reduce((a, b) => a + b, 0) / notesScores.length
    : 0;

  const aggregatedScore = Math.round(
    (scanScore * WEIGHTS.scan) +
    (surveyScore * WEIGHTS.survey) +
    (avgNotesScore * WEIGHTS.notes)
  );

  const newTier = scoreToTier(aggregatedScore);
  const suggestedAction = tierToAction(newTier);

  // Update patient risk score
  await supabase.from('patients').update({
    risk_score: aggregatedScore,
    risk_tier: newTier,
    risk_updated_at: new Date().toISOString()
  }).eq('id', patient_id);

  // Log triage event
  const { data: event } = await supabase.from('triage_events').insert({
    patient_id,
    trigger_type,
    trigger_id,
    previous_score: patient.risk_score,
    new_score: aggregatedScore,
    suggested_action: suggestedAction,
    ai_reasoning: generateReasoning(patient.risk_score, aggregatedScore, trigger_type)
  }).select().single();

  // If score is high or critical, create appointment suggestion
  if (['high', 'critical'].includes(newTier)) {
    await createAppointmentSuggestion(patient_id, newTier, event.id);
  }
}

function scoreToTier(score: number): string {
  if (score <= 30) return 'low';
  if (score <= 55) return 'medium';
  if (score <= 80) return 'high';
  return 'critical';
}

function tierToAction(tier: string): string {
  const map = {
    low: 'no_change',
    medium: 'routine',
    high: 'bring_forward',
    critical: 'on_the_day_flag'
  };
  return map[tier] || 'no_change';
}
```

---

### APPOINTMENT SUGGESTION LOGIC

```typescript
// lib/scheduling.ts

export async function createAppointmentSuggestion(
  patient_id: string,
  risk_tier: string,
  triage_event_id: string
) {
  const supabase = createSupabaseServerClient();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { data: appointment } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patient_id)
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .single();

  if (!appointment) return;

  const scheduledDate = new Date(appointment.scheduled_at);

  // HARD RULE: Never suggest moving to within 7 days
  if (scheduledDate <= sevenDaysFromNow) {
    // Appointment is already soon — if critical, flag for on-the-day only
    if (risk_tier === 'critical') {
      await supabase.from('appointments').update({
        is_on_the_day: true,
        suggestion_status: 'pending'
      }).eq('id', appointment.id);
    }
    return;
  }

  // Suggest moving forward by a calculated amount based on tier
  const daysToAdvance = risk_tier === 'critical' ? null : risk_tier === 'high' ? 21 : 14;
  const suggestedDate = daysToAdvance
    ? new Date(Date.now() + daysToAdvance * 24 * 60 * 60 * 1000)
    : null;

  // Only suggest if it's actually earlier than current appointment
  if (suggestedDate && suggestedDate >= scheduledDate) return;

  await supabase.from('appointments').update({
    ai_suggested_date: suggestedDate?.toISOString() ?? null,
    suggestion_status: 'pending',
    is_on_the_day: risk_tier === 'critical'
  }).eq('id', appointment.id);
}
```

---

## DEPARTMENT SYSTEM PROMPTS

```typescript
// lib/prompts.ts

export const DEPARTMENT_PROMPTS = {

  dermatology: {
    imageAnalysis: `
You are a dermatology triage assistant. Analyse the provided skin image using the ABCDE criteria (Asymmetry, Border irregularity, Colour variation, Diameter, Evolution indicators) and the CAP scoring system (Cancer history, Age, Phototype).

Return ONLY valid JSON matching this exact schema:
{
  "severity_score": <integer 0-100>,
  "risk_tier": <"low"|"medium"|"high"|"critical">,
  "findings": [<string>],
  "red_flags": [<string>],
  "confidence": <float 0-1>,
  "recommended_action": <"bring_forward"|"routine"|"on_the_day_flag"|"no_change">,
  "reasoning": <string>,
  "scoring_framework_used": "ABCDE criteria + CAP Score"
}

Score 81-100 (critical) ONLY if: rapid change in lesion, bleeding, satellite lesions visible, or clear malignant features.
No preamble. No markdown fences. Raw JSON only.
    `,
    surveyGeneration: `
You are a dermatology triage assistant generating a patient survey. Generate 5-10 targeted questions about skin changes, new lesions, UV exposure, and family history.
Return ONLY valid JSON: { "questions": [SurveyQuestion] }
Question types allowed: "scale", "yes_no", "multiple_choice", "free_text"
For scale questions include scale_min, scale_max, scale_labels.
No preamble. Raw JSON only.
    `,
    surveyAnalysis: `
You are a dermatology triage assistant. Analyse patient survey responses using ABCDE criteria and melanoma risk factors (hair colour, skin type, family history, freckling, mole count, sunburn history).
Return ONLY valid JSON matching AIAnalysis schema. No preamble.
    `
  },

  gastroenterology: {
    imageAnalysis: `
You are a gastroenterology triage assistant. Analyse the provided endoscopy/colonoscopy/sigmoidoscopy image. Apply Paris Classification for polyp morphology, Boston Bowel Prep Scale for preparation quality, and Mayo Score indicators for IBD assessment.

Return ONLY valid JSON:
{
  "severity_score": <integer 0-100>,
  "risk_tier": <"low"|"medium"|"high"|"critical">,
  "findings": [<string>],
  "red_flags": [<string>],
  "confidence": <float 0-1>,
  "recommended_action": <"bring_forward"|"routine"|"on_the_day_flag"|"no_change">,
  "reasoning": <string>,
  "scoring_framework_used": "Paris Classification + Boston Bowel Prep Scale + Mayo Score"
}

Critical flags: Paris IIa/IIc polyp morphology, haematochezia with pain, obstructing lesion.
No preamble. Raw JSON only.
    `,
    surveyGeneration: `
You are a gastroenterology triage assistant. Generate 6-12 questions about bowel habits, bleeding, pain, weight loss, and fatigue. Be specific and clinically relevant.
Return ONLY valid JSON: { "questions": [SurveyQuestion] }. No preamble.
    `,
    surveyAnalysis: `
Analyse gastroenterology survey responses using Mayo Score indicators and standard IBD/colorectal clinical criteria.
Return ONLY valid JSON matching AIAnalysis schema. No preamble.
    `
  },

  cardiology: {
    imageAnalysis: `
You are a cardiology triage assistant. Analyse the provided ECG, echocardiogram report, or cardiac imaging using HEART Score components (History, ECG findings, Age, Risk factors) and GRACE Score indicators.
Return ONLY valid JSON matching AIAnalysis schema with scoring_framework_used: "HEART Score + GRACE Score".
Critical flags: ST elevation, new LBBB, severe LV dysfunction, critical stenosis language.
No preamble. Raw JSON only.
    `,
    surveyGeneration: `
Generate 5-10 cardiology survey questions covering chest pain frequency/severity, dyspnoea, palpitations, syncope, and medication adherence.
Return ONLY valid JSON: { "questions": [SurveyQuestion] }. No preamble.
    `,
    surveyAnalysis: `
Analyse cardiology survey responses using HEART Score risk factors and ESC risk stratification guidelines.
Return ONLY valid JSON matching AIAnalysis schema. No preamble.
    `
  },

  orthopaedics: {
    imageAnalysis: `
You are an orthopaedic triage assistant. Analyse imaging reports using Kellgren-Lawrence grading for osteoarthritis and PROMS (Patient-Reported Outcome Measures) indicators.
Return ONLY valid JSON matching AIAnalysis schema with scoring_framework_used: "Kellgren-Lawrence Grade + PROMS".
Critical flags: acute fracture language, joint space collapse, nerve compression.
No preamble. Raw JSON only.
    `,
    surveyGeneration: `
Generate 5-10 orthopaedic survey questions using NRS pain scale, functional limitation assessment, and medication/physio compliance.
Return ONLY valid JSON: { "questions": [SurveyQuestion] }. No preamble.
    `,
    surveyAnalysis: `
Analyse using Kellgren-Lawrence criteria and Oswestry Disability Index / KOOS / HOOS as applicable.
Return ONLY valid JSON matching AIAnalysis schema. No preamble.
    `
  },

  physiotherapy: {
    imageAnalysis: `
Analyse functional assessment images/videos for range of motion and physical capacity indicators.
Return ONLY valid JSON matching AIAnalysis schema with scoring_framework_used: "Oswestry Disability Index + KOOS/HOOS".
NOTE: For physio, IMPROVEMENT (decreasing score over time) is also a flag — suggest early discharge review if score < 20.
No preamble. Raw JSON only.
    `,
    surveyGeneration: `
Generate 5-10 physiotherapy survey questions covering pain (NRS), range of motion self-assessment, exercise compliance, and work/daily activity impact.
Return ONLY valid JSON: { "questions": [SurveyQuestion] }. No preamble.
    `,
    surveyAnalysis: `
Analyse using Oswestry Disability Index, KOOS/HOOS, and SF-36 subset. Flag both deterioration AND significant improvement for early discharge consideration.
Return ONLY valid JSON matching AIAnalysis schema. No preamble.
    `
  },

  general_surgery: {
    imageAnalysis: `
You are a surgical triage assistant. Analyse pre/post-op imaging, wound photos, or pathology reports using ASA Physical Status classification indicators and BWAT (Bates-Jensen Wound Assessment Tool) for wound images.
Return ONLY valid JSON matching AIAnalysis schema.
Critical flags: wound dehiscence signs, purulent discharge, necrotic tissue, acute bleeding.
No preamble. Raw JSON only.
    `,
    surveyGeneration: `
Generate 5-10 post-surgical survey questions covering wound symptoms, fever, pain levels, and bowel/bladder function.
Return ONLY valid JSON: { "questions": [SurveyQuestion] }. No preamble.
    `,
    surveyAnalysis: `
Analyse using ASA classification indicators and post-operative complication risk factors.
Return ONLY valid JSON matching AIAnalysis schema. No preamble.
    `
  },

  psychiatry: {
    imageAnalysis: `This department does not use image analysis. Return: { "severity_score": 0, "risk_tier": "low", "findings": [], "red_flags": [], "confidence": 0, "recommended_action": "no_change", "reasoning": "Image analysis not applicable for psychiatry.", "scoring_framework_used": "N/A" }`,
    surveyGeneration: `
You are a psychiatric triage assistant. Generate 6-12 questions using validated frameworks: PHQ-9 (depression), GAD-7 (anxiety), AUDIT-C (alcohol), and PCL-5 (PTSD) item subsets.

CRITICAL REQUIREMENT: Include at least one question screening for suicidal ideation, phrased gently:
"Over the past 2 weeks, have you had any thoughts of harming yourself or feeling that you would be better off dead?"
Type: "yes_no"
Set clinical_flag_if: { "operator": "eq", "value": "yes" }

Tone must be compassionate and non-stigmatising. Include signposting note at end of survey.
Return ONLY valid JSON: { "questions": [SurveyQuestion] }. No preamble.
    `,
    surveyAnalysis: `
Analyse using PHQ-9, GAD-7, AUDIT-C, and PCL-5 scoring. Any indication of suicidal ideation or self-harm MUST produce risk_tier: "critical" and recommended_action: "on_the_day_flag" regardless of other scores.
Return ONLY valid JSON matching AIAnalysis schema. No preamble.
    `
  }
};
```

---

## PSYCHIATRIC CRISIS ESCALATION

```typescript
// lib/psychiatric.ts

export function checkPsychiatricCrisisResponses(
  questions: SurveyQuestion[],
  responses: { question_id: string; value: string | number }[]
): boolean {
  const crisisQuestions = questions.filter(q =>
    q.clinical_flag_if !== undefined &&
    responses.some(r =>
      r.question_id === q.id &&
      evaluateFlag(r.value, q.clinical_flag_if!)
    )
  );
  return crisisQuestions.length > 0;
}

export async function escalatePsychiatricCrisis(patient_id: string, survey_id: string) {
  const supabase = createSupabaseServerClient();

  // 1. Create critical triage event immediately
  await supabase.from('triage_events').insert({
    patient_id,
    trigger_type: 'survey',
    trigger_id: survey_id,
    new_score: 100,
    suggested_action: 'on_the_day_flag',
    ai_reasoning: 'CRISIS ALERT: Patient response indicates possible suicidal ideation. Immediate clinician review required. This alert bypasses standard triage queue.'
  });

  // 2. Update patient to critical
  await supabase.from('patients').update({
    risk_score: 100,
    risk_tier: 'critical',
    risk_updated_at: new Date().toISOString()
  }).eq('id', patient_id);

  // 3. Mark next appointment as on-the-day emergency
  await supabase.from('appointments')
    .update({ is_on_the_day: true, suggestion_status: 'pending' })
    .eq('patient_id', patient_id)
    .eq('status', 'scheduled');

  // 4. Send push notification to on-call psychiatrist
  // Implementation depends on notification service setup
  await notifyOnCallClinician(patient_id, 'psychiatry', 'CRISIS: Immediate review required');
}
```

---

## API ROUTES SUMMARY

```
POST /api/ai/analyse-scan          — Analyse uploaded scan/image
POST /api/ai/generate-survey       — Generate AI survey for patient
POST /api/ai/analyse-survey        — Analyse submitted survey responses
POST /api/ai/summarise-note        — Summarise clinical note

GET  /api/triage/list              — Priority-ranked patient list for a department
GET  /api/triage/patient/:id       — Full patient triage history
POST /api/triage/approve           — Approve AI appointment suggestion
POST /api/triage/reject            — Reject AI suggestion (requires reason)
POST /api/triage/modify            — Modify suggested date and approve

GET  /api/appointments/schedule    — Weekly schedule with AI suggestions
POST /api/appointments/on-the-day  — Book emergency same-day slot (human only)
POST /api/appointments/reschedule  — Execute approved reschedule

POST /api/surveys/submit           — Patient submits survey responses
GET  /api/surveys/pending/:patient_id — Get pending surveys for patient
```

---

## REALTIME SUBSCRIPTIONS (Supabase)

Subscribe to these channels in the clinician dashboard for live updates:

```typescript
// Dashboard realtime setup
const supabase = createSupabaseBrowserClient();

// Live triage feed
supabase
  .channel('triage_events')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'triage_events'
  }, (payload) => {
    // Add to triage feed, sort by new_score desc
    dispatch(addTriageEvent(payload.new));
  })
  .subscribe();

// Live patient risk score updates
supabase
  .channel('patient_risk')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'patients',
    filter: `department=eq.${currentDepartment}`
  }, (payload) => {
    dispatch(updatePatientRisk(payload.new));
  })
  .subscribe();
```

---

## SCHEDULING HARD RULES — SUMMARY FOR IMPLEMENTATION

| Rule | Where Enforced |
|------|----------------|
| No suggestion within 7 days | DB check constraint + application layer |
| On-the-day requires human action | No auto-booking endpoint exists. Only `POST /api/appointments/on-the-day` by authenticated clinician/admin |
| One active suggestion per appointment | Upsert on `ai_suggested_date` — previous suggestion overwritten |
| Reschedule twice in 30 days → consultant approval | Application layer check in `/api/triage/approve` |
| Psychiatric AI summary → clinician only | Filter `ai_summary` from API response if `requester.role !== 'clinician'` |
| Psychiatric crisis → bypasses queue | `escalatePsychiatricCrisis()` always runs before standard triage flow |

---

## ENVIRONMENT VARIABLES

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-side only, never expose to client
```

---

## MVP BUILD ORDER

Complete in this order for a working hackathon demo:

```
1. [ ] Supabase: create all tables + RLS policies + Storage bucket
2. [ ] Backend: Claude wrapper (lib/claude.ts) + department prompts (lib/prompts.ts)
3. [ ] Backend: POST /api/ai/analyse-scan (dermatology first)
4. [ ] Backend: POST /api/ai/generate-survey
5. [ ] Backend: POST /api/ai/analyse-survey
6. [ ] Backend: triggerTriageEvaluation() + createAppointmentSuggestion()
7. [ ] Web: Auth (clinician login)
8. [ ] Web: Triage feed with realtime subscription + approve/reject buttons
9. [ ] Web: Patient profile page (risk score, history)
10. [ ] Mobile: Auth (patient magic link)
11. [ ] Mobile: Survey screen (render from JSON + submit)
12. [ ] Mobile: Home screen (next appointment)

DEMO FLOW (Dermatology):
Patient submits survey → backend calls Claude → triage event created →
dashboard shows flag in real time → clinician approves → appointment updates
```

---

## DEMO SCENARIO (HACKATHON)

**Department:** Dermatology
**Patient:** 52-year-old, fair skin, family history of melanoma, appointment in 6 weeks

1. Patient receives survey notification (mobile app)
2. Patient reports: new lesion appeared, border irregular, colour changed in 2 weeks
3. Survey submitted → Claude analysis → severity_score: 74, risk_tier: "high"
4. Triage event fires → patient risk jumps from 32 → 74
5. Dashboard: new flag appears in real time — "HIGH — bring forward appointment"
6. AI reasoning shown: "ABCDE criteria met: border irregularity + rapid colour change (2 weeks). CAP score elevated. Recommend earlier review."
7. Clinician clicks Approve — appointment moves from 6 weeks → 2 weeks
8. Patient notified via push notification

**Optional bonus demo:** Upload a dermoscopy image → show Claude's image analysis output live.

---

*End of spec. Do not deviate from the database schema or scheduling hard rules without discussion.*
