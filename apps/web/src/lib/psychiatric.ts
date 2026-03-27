import type { SurveyQuestion, SurveyResponseItem } from "@triageai/shared";
import { createSupabaseServerClient } from "@/lib/server/supabase";

function evaluateFlag(
  value: string | number,
  flag: NonNullable<SurveyQuestion["clinical_flag_if"]>,
): boolean {
  switch (flag.operator) {
    case "eq":
      return String(value) === String(flag.value);
    case "gte":
      return Number(value) >= Number(flag.value);
    case "lte":
      return Number(value) <= Number(flag.value);
  }
}

export function checkPsychiatricCrisisResponses(
  questions: SurveyQuestion[],
  responses: SurveyResponseItem[],
): boolean {
  return questions.some((q) => {
    if (!q.clinical_flag_if) return false;
    const response = responses.find((r) => r.question_id === q.id);
    if (!response) return false;
    return evaluateFlag(response.value, q.clinical_flag_if);
  });
}

export async function escalatePsychiatricCrisis(
  patient_id: string,
  survey_id: string,
): Promise<void> {
  const supabase = createSupabaseServerClient();

  // Run all three DB writes in parallel — speed matters for a crisis path
  await Promise.all([
    // 1. Create critical triage event immediately, bypassing standard queue
    supabase.from("triage_events").insert({
      patient_id,
      trigger_type: "survey",
      trigger_id: survey_id,
      new_score: 100,
      suggested_action: "on_the_day_flag",
      ai_reasoning:
        "CRISIS ALERT: Patient response indicates possible suicidal ideation. Immediate clinician review required. This alert bypasses standard triage queue.",
    }),

    // 2. Set patient to critical immediately
    supabase
      .from("patients")
      .update({
        risk_score: 100,
        risk_tier: "critical",
        risk_updated_at: new Date().toISOString(),
      })
      .eq("id", patient_id),

    // 3. Flag all scheduled appointments as on-the-day emergencies
    supabase
      .from("appointments")
      .update({ is_on_the_day: true, suggestion_status: "pending" })
      .eq("patient_id", patient_id)
      .eq("status", "scheduled"),
  ]);

  // 4. Notify on-call psychiatrist (stubbed — implement with Expo Push or similar)
  await notifyOnCallClinician(patient_id, "psychiatry", "CRISIS: Immediate review required");
}

async function notifyOnCallClinician(
  patient_id: string,
  department: string,
  message: string,
): Promise<void> {
  // TODO: integrate with Expo Push Notifications or SMS gateway
  // For now, log so the demo can show the intent
  console.warn(`[ON-CALL NOTIFY] dept=${department} patient=${patient_id} msg="${message}"`);
}
