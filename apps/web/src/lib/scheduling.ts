import type { RiskTier } from "@triageai/shared";
import { createSupabaseServerClient } from "@/lib/server/supabase";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MANUAL_RECOMMENDATION_TARGET_DAYS = 14;
const MANUAL_RECOMMENDATION_BUFFER_MS = 60 * 60 * 1000;

// Days from now to suggest for each tier
const DAYS_TO_ADVANCE: Record<string, number | null> = {
  critical: null, // on-the-day flag only — no future date suggestion
  high: 21,
  medium: 14,
};

export async function createAppointmentSuggestion(
  patient_id: string,
  risk_tier: RiskTier,
  triage_event_id: string,
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const now = Date.now();
  const sevenDaysFromNow = new Date(now + SEVEN_DAYS_MS);

  // Fetch the next scheduled appointment for this patient
  const { data: appointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", patient_id)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .single();

  if (!appointment) return;

  const scheduledDate = new Date(appointment.scheduled_at);

  // HARD RULE: appointment is already within 7 days — only flag critical as on-the-day
  if (scheduledDate <= sevenDaysFromNow) {
    if (risk_tier === "critical") {
      await supabase
        .from("appointments")
        .update({ is_on_the_day: true, suggestion_status: "pending" })
        .eq("id", appointment.id);
    }
    return;
  }

  const daysToAdvance = DAYS_TO_ADVANCE[risk_tier];

  // Critical with an appointment outside 7 days: flag on-the-day, no future date suggestion
  if (daysToAdvance === null) {
    await supabase
      .from("appointments")
      .update({
        ai_suggested_date: null,
        is_on_the_day: true,
        suggestion_status: "pending",
      })
      .eq("id", appointment.id);
    return;
  }

  const suggestedDate = new Date(now + daysToAdvance * 24 * 60 * 60 * 1000);

  // Only suggest if it actually brings the appointment forward
  if (suggestedDate >= scheduledDate) return;

  await supabase
    .from("appointments")
    .update({
      ai_suggested_date: suggestedDate.toISOString(),
      suggestion_status: "pending",
      is_on_the_day: false,
    })
    .eq("id", appointment.id);
}

export type ManualAppointmentRecommendationResult = {
  status: "recommended" | "already_scheduled_soon" | "no_existing_appointment";
  appointment_id: string | null;
  suggested_date: string | null;
};

export async function createManualAppointmentRecommendation(
  patient_id: string,
): Promise<ManualAppointmentRecommendationResult> {
  const supabase = createSupabaseServerClient();
  const now = Date.now();
  const earliestAllowedSuggestion = new Date(now + SEVEN_DAYS_MS + MANUAL_RECOMMENDATION_BUFFER_MS);

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, scheduled_at")
    .eq("patient_id", patient_id)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .single();

  if (!appointment) {
    return {
      status: "no_existing_appointment",
      appointment_id: null,
      suggested_date: null,
    };
  }

  const scheduledDate = new Date(appointment.scheduled_at);

  if (scheduledDate <= earliestAllowedSuggestion) {
    return {
      status: "already_scheduled_soon",
      appointment_id: appointment.id,
      suggested_date: null,
    };
  }

  const defaultSuggestedDate = new Date(
    now + MANUAL_RECOMMENDATION_TARGET_DAYS * 24 * 60 * 60 * 1000,
  );
  const suggestedDate =
    defaultSuggestedDate < scheduledDate ? defaultSuggestedDate : earliestAllowedSuggestion;

  await supabase
    .from("appointments")
    .update({
      ai_suggested_date: suggestedDate.toISOString(),
      suggestion_status: "pending",
      is_on_the_day: false,
    })
    .eq("id", appointment.id);

  return {
    status: "recommended",
    appointment_id: appointment.id,
    suggested_date: suggestedDate.toISOString(),
  };
}
