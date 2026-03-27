import type {
  PatientHomeSummary,
  PendingSurveySummary,
} from "@triageai/shared";

export const MOCK_PATIENT_HOME: PatientHomeSummary = {
  patient_id: "patient-demo-001",
  full_name: "Sarah Mitchell",
  department: "dermatology",
  next_appointment: {
    appointment_id: "appt-demo-001",
    scheduled_at: new Date(
      Date.now() + 42 * 24 * 60 * 60 * 1000
    ).toISOString(), // 6 weeks from now
    status: "scheduled",
    suggestion_status: null,
    is_on_the_day: false,
  },
  pending_survey_count: 1,
};

export const MOCK_PENDING_SURVEYS: PendingSurveySummary[] = [
  {
    survey_id: "survey-demo-001",
    patient_id: "patient-demo-001",
    department: "dermatology",
    sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    questions: [
      {
        id: "q1",
        text: "Have you noticed any new or changing moles or skin lesions in the past 4 weeks?",
        type: "yes_no",
        clinical_flag_if: { operator: "eq", value: "yes" },
      },
      {
        id: "q2",
        text: "How would you rate any itching, bleeding, or discomfort from the lesion?",
        type: "scale",
        scale_min: 0,
        scale_max: 10,
        scale_labels: { min: "None", max: "Severe" },
      },
      {
        id: "q3",
        text: "How would you describe the border of the lesion?",
        type: "multiple_choice",
        options: ["Regular and smooth", "Slightly irregular", "Very irregular or ragged", "Not sure"],
      },
      {
        id: "q4",
        text: "Has the colour of the lesion changed recently?",
        type: "yes_no",
        clinical_flag_if: { operator: "eq", value: "yes" },
      },
      {
        id: "q5",
        text: "Please describe any other skin changes or concerns you want your clinician to know about.",
        type: "free_text",
      },
    ],
  },
];
