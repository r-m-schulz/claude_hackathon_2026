// ============================================================
// Auth / Registration
// ============================================================

export const CLINICIAN_ROLES = ["clinician", "consultant", "admin"] as const;
export type ClinicianRole = (typeof CLINICIAN_ROLES)[number];

/**
 * Onboarding status for patients.
 * Currently all patients default to "active" — reserved for future
 * one-time-code gating (patient onboarding code will gate patient
 * activation later without breaking this contract).
 */
export const ONBOARDING_STATUSES = ["active", "unverified"] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export type RegisterInput =
  | {
      role: "clinician";
      email: string;
      password: string;
      full_name: string;
      department: Department;
      clinician_role?: ClinicianRole; // defaults to "clinician"
    }
  | {
      role: "patient";
      email: string;
      password: string;
      full_name: string;
      department: Department;
      dob: string; // ISO date YYYY-MM-DD
      // Future: onboarding_code?: string (not enforced yet)
    };

export type RegisterResponse = {
  success: boolean;
  user_id?: string;
  role?: "clinician" | "patient";
  profile_created: boolean;
  message: string;
};

// ============================================================
// Departments
// ============================================================

export const DEPARTMENTS = [
  "orthopaedics",
  "dermatology",
  "physiotherapy",
  "general_surgery",
  "psychiatry",
  "gastroenterology",
  "cardiology",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const RISK_TIERS = ["low", "medium", "high", "critical"] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

export const SUGGESTED_ACTIONS = [
  "bring_forward",
  "routine",
  "on_the_day_flag",
  "no_change",
] as const;
export type SuggestedAction = (typeof SUGGESTED_ACTIONS)[number];

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
  "rescheduled",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const SUGGESTION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export const SURVEY_QUESTION_TYPES = [
  "scale",
  "yes_no",
  "multiple_choice",
  "free_text",
] as const;
export type SurveyQuestionType = (typeof SURVEY_QUESTION_TYPES)[number];

export type SurveyFlagRule = {
  operator: "gte" | "lte" | "eq";
  value: number | string;
};

export type SurveyQuestion = {
  id: string;
  text: string;
  type: SurveyQuestionType;
  options?: string[];
  scale_min?: number;
  scale_max?: number;
  scale_labels?: {
    min: string;
    max: string;
  };
  clinical_flag_if?: SurveyFlagRule;
};

export type AIAnalysis = {
  severity_score: number;
  risk_tier: RiskTier;
  findings: string[];
  red_flags: string[];
  confidence: number;
  recommended_action: SuggestedAction;
  reasoning: string;
  scoring_framework_used: string;
};

export type AnalyseScanInput = {
  scan_id: string;
  patient_id: string;
  department: Department;
  scan_type: string;
  file_url: string;
};

export type GenerateSurveyInput = {
  patient_id: string;
  department: Department;
};

export type SurveyResponseValue = string | number;

export type SurveyResponseItem = {
  question_id: string;
  value: SurveyResponseValue;
};

export type AnalyseSurveyInput = {
  survey_id: string;
  patient_id: string;
  responses: SurveyResponseItem[];
};

export type TriageListItem = {
  patient_id: string;
  patient_name: string;
  department: Department;
  risk_score: number;
  risk_tier: RiskTier;
  latest_trigger_type: "survey" | "scan" | "note" | "manual";
  suggested_action: SuggestedAction;
  suggestion_status?: SuggestionStatus | null;
  scheduled_at?: string | null;
  ai_reasoning?: string | null;
};

export type PatientTriageDetail = {
  patient_id: string;
  full_name: string;
  department: Department;
  risk_score: number;
  risk_tier: RiskTier;
  next_appointment: {
    appointment_id: string;
    scheduled_at: string;
    original_scheduled_at: string;
    status: AppointmentStatus;
    ai_suggested_date?: string | null;
    suggestion_status?: SuggestionStatus | null;
    is_on_the_day: boolean;
  } | null;
  triage_events: Array<{
    event_id: string;
    created_at: string;
    trigger_type: "survey" | "scan" | "note" | "manual";
    previous_score?: number | null;
    new_score: number;
    suggested_action: SuggestedAction;
    ai_reasoning: string;
  }>;
};

export type WeeklyScheduleItem = {
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  department: Department;
  scheduled_at: string;
  original_scheduled_at: string;
  status: AppointmentStatus;
  ai_suggested_date?: string | null;
  suggestion_status?: SuggestionStatus | null;
  is_on_the_day: boolean;
};

export type PendingSurveySummary = {
  survey_id: string;
  patient_id: string;
  department: Department;
  sent_at: string;
  questions: SurveyQuestion[];
};

export type PatientHomeSummary = {
  patient_id: string;
  full_name: string;
  department: Department;
  next_appointment: {
    appointment_id: string;
    scheduled_at: string;
    status: AppointmentStatus;
    suggestion_status?: SuggestionStatus | null;
    is_on_the_day: boolean;
  } | null;
  pending_survey_count: number;
};

export const BUSINESS_EMPLOYEE_ROLES = ["practitioner", "hr"] as const;
export type BusinessEmployeeRole = (typeof BUSINESS_EMPLOYEE_ROLES)[number];

export const PATIENT_CONTEXT_ENTRY_TYPES = ["note", "image", "pdf", "file"] as const;
export type PatientContextEntryType = (typeof PATIENT_CONTEXT_ENTRY_TYPES)[number];

export type BusinessOnboardingAnswers = {
  care_model: string;
  patient_volume: string;
  workflow_needs: string;
  brand_tone: string;
  intake_priorities: string;
};

export type BusinessSummary = {
  id: string;
  name: string;
  legal_name?: string | null;
  primary_department?: Department | null;
  support_email?: string | null;
  phone?: string | null;
  website?: string | null;
  address_line?: string | null;
  city?: string | null;
  country?: string | null;
  timezone?: string | null;
  hero_headline?: string | null;
  hero_subheadline?: string | null;
  brand_summary?: string | null;
  workflow_summary?: string | null;
  logo_url?: string | null;
  header_image_url?: string | null;
  onboarding_answers: BusinessOnboardingAnswers;
};

export type BusinessEmployeeSummary = {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  role: BusinessEmployeeRole;
  department?: Department | null;
  job_title?: string | null;
  is_owner: boolean;
  linked_clinician_id?: string | null;
  created_at: string;
};

export type BusinessPatientSummary = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  dob: string;
  department: Department;
  risk_score: number;
  risk_tier: RiskTier;
  created_at: string;
  is_paired: boolean;
  paired_at?: string | null;
  primary_practitioner_name?: string | null;
};

export type PatientContextEntry = {
  id: string;
  entry_type: PatientContextEntryType;
  title: string;
  body_text?: string | null;
  extracted_text?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_url?: string | null;
  created_at: string;
  created_by_name?: string | null;
};

export type BusinessPatientDetail = BusinessPatientSummary & {
  auth_user_id?: string | null;
  assigned_practitioner_id?: string | null;
  assigned_practitioner_name?: string | null;
  context_entries: PatientContextEntry[];
};

export type BusinessWorkspaceSummary = {
  business: BusinessSummary;
  current_employee: BusinessEmployeeSummary;
  employees: BusinessEmployeeSummary[];
  patient_count: number;
  recent_patients: BusinessPatientSummary[];
};
