import type {
  PatientTriageDetail,
  TriageListItem,
  WeeklyScheduleItem,
} from "@triageai/shared";

export const mockTriageItems: TriageListItem[] = [
  {
    patient_id: "p-1001",
    patient_name: "Maya Patel",
    department: "dermatology",
    risk_score: 91,
    risk_tier: "critical",
    latest_trigger_type: "scan",
    suggested_action: "bring_forward",
    suggestion_status: "pending",
    scheduled_at: "2026-04-02T10:30:00.000Z",
    ai_reasoning:
      "Rapid lesion growth and irregular border changes indicate urgent consultant review.",
  },
  {
    patient_id: "p-1002",
    patient_name: "Sofia Green",
    department: "psychiatry",
    risk_score: 82,
    risk_tier: "high",
    latest_trigger_type: "survey",
    suggested_action: "on_the_day_flag",
    suggestion_status: "pending",
    scheduled_at: "2026-04-03T14:00:00.000Z",
    ai_reasoning:
      "Escalating distress responses in latest survey with adherence concerns.",
  },
  {
    patient_id: "p-1003",
    patient_name: "Luca Rossi",
    department: "cardiology",
    risk_score: 57,
    risk_tier: "medium",
    latest_trigger_type: "note",
    suggested_action: "routine",
    suggestion_status: "approved",
    scheduled_at: "2026-04-08T09:15:00.000Z",
    ai_reasoning:
      "Symptoms remain stable; routine follow-up remains acceptable.",
  },
  {
    patient_id: "p-1004",
    patient_name: "Noah Khan",
    department: "orthopaedics",
    risk_score: 38,
    risk_tier: "low",
    latest_trigger_type: "manual",
    suggested_action: "no_change",
    suggestion_status: "rejected",
    scheduled_at: "2026-04-11T11:45:00.000Z",
    ai_reasoning:
      "No acute change observed; clinician note confirms stable recovery trajectory.",
  },
];

export const mockScheduleItems: WeeklyScheduleItem[] = [
  {
    appointment_id: "a-2001",
    patient_id: "p-1001",
    patient_name: "Maya Patel",
    department: "dermatology",
    scheduled_at: "2026-04-02T10:30:00.000Z",
    original_scheduled_at: "2026-04-15T10:30:00.000Z",
    status: "scheduled",
    ai_suggested_date: "2026-04-02T10:30:00.000Z",
    suggestion_status: "pending",
    is_on_the_day: false,
  },
  {
    appointment_id: "a-2002",
    patient_id: "p-1002",
    patient_name: "Sofia Green",
    department: "psychiatry",
    scheduled_at: "2026-04-03T14:00:00.000Z",
    original_scheduled_at: "2026-04-03T14:00:00.000Z",
    status: "scheduled",
    ai_suggested_date: null,
    suggestion_status: "pending",
    is_on_the_day: true,
  },
  {
    appointment_id: "a-2003",
    patient_id: "p-1003",
    patient_name: "Luca Rossi",
    department: "cardiology",
    scheduled_at: "2026-04-08T09:15:00.000Z",
    original_scheduled_at: "2026-04-08T09:15:00.000Z",
    status: "scheduled",
    ai_suggested_date: null,
    suggestion_status: "approved",
    is_on_the_day: false,
  },
  {
    appointment_id: "a-2004",
    patient_id: "p-1004",
    patient_name: "Noah Khan",
    department: "orthopaedics",
    scheduled_at: "2026-04-11T11:45:00.000Z",
    original_scheduled_at: "2026-04-11T11:45:00.000Z",
    status: "scheduled",
    ai_suggested_date: null,
    suggestion_status: "rejected",
    is_on_the_day: false,
  },
];

const mockPatientDetailsMap: Record<string, PatientTriageDetail> = {
  "p-1001": {
    patient_id: "p-1001",
    full_name: "Maya Patel",
    department: "dermatology",
    risk_score: 91,
    risk_tier: "critical",
    next_appointment: {
      appointment_id: "a-2001",
      scheduled_at: "2026-04-02T10:30:00.000Z",
      original_scheduled_at: "2026-04-15T10:30:00.000Z",
      status: "scheduled",
      ai_suggested_date: "2026-04-02T10:30:00.000Z",
      suggestion_status: "pending",
      is_on_the_day: false,
    },
    triage_events: [
      {
        event_id: "e-3001",
        created_at: "2026-03-26T16:01:00.000Z",
        trigger_type: "scan",
        previous_score: 74,
        new_score: 91,
        suggested_action: "bring_forward",
        ai_reasoning:
          "Image signal variance increased with irregular pigmentation and fast progression over 2 weeks.",
      },
      {
        event_id: "e-2991",
        created_at: "2026-03-20T11:14:00.000Z",
        trigger_type: "survey",
        previous_score: 58,
        new_score: 74,
        suggested_action: "bring_forward",
        ai_reasoning:
          "Patient reported persistent irritation and new bleeding episodes.",
      },
    ],
  },
  "p-1002": {
    patient_id: "p-1002",
    full_name: "Sofia Green",
    department: "psychiatry",
    risk_score: 82,
    risk_tier: "high",
    next_appointment: {
      appointment_id: "a-2002",
      scheduled_at: "2026-04-03T14:00:00.000Z",
      original_scheduled_at: "2026-04-03T14:00:00.000Z",
      status: "scheduled",
      ai_suggested_date: null,
      suggestion_status: "pending",
      is_on_the_day: true,
    },
    triage_events: [
      {
        event_id: "e-3002",
        created_at: "2026-03-26T09:42:00.000Z",
        trigger_type: "survey",
        previous_score: 69,
        new_score: 82,
        suggested_action: "on_the_day_flag",
        ai_reasoning:
          "Survey trend shows sharp decline in sleep and concentration with elevated distress score.",
      },
    ],
  },
};

export function getMockPatientDetail(patientId: string): PatientTriageDetail | null {
  return mockPatientDetailsMap[patientId] ?? null;
}