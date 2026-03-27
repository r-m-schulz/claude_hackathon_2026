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
