import { createSupabaseServerClient } from "@/lib/server/supabase";
import type { PatientTriageDetail, Department, AppointmentStatus, SuggestionStatus, SuggestedAction } from "@triageai/shared";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  const { data: patient, error } = await supabase
    .from("patients")
    .select(`
      id,
      full_name,
      department,
      risk_score,
      risk_tier,
      appointments (
        id,
        scheduled_at,
        original_scheduled_at,
        status,
        ai_suggested_date,
        suggestion_status,
        is_on_the_day
      ),
      triage_events (
        id,
        created_at,
        trigger_type,
        previous_score,
        new_score,
        suggested_action,
        ai_reasoning
      )
    `)
    .eq("id", id)
    .single();

  if (error || !patient) {
    return Response.json({ error: "Patient not found" }, { status: 404 });
  }

  // Next scheduled appointment
  const nextAppt = (patient.appointments as {
    id: string;
    scheduled_at: string;
    original_scheduled_at: string;
    status: string;
    ai_suggested_date: string | null;
    suggestion_status: string | null;
    is_on_the_day: boolean;
  }[])
    ?.filter((a) => a.status === "scheduled")
    ?.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    ?.[0] ?? null;

  const triageEvents = (patient.triage_events as {
    id: string;
    created_at: string;
    trigger_type: "survey" | "scan" | "note" | "manual";
    previous_score: number | null;
    new_score: number;
    suggested_action: string;
    ai_reasoning: string;
  }[])
    ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    ?? [];

  const detail: PatientTriageDetail = {
    patient_id: patient.id,
    full_name: patient.full_name,
    department: patient.department as Department,
    risk_score: patient.risk_score,
    risk_tier: patient.risk_tier as PatientTriageDetail["risk_tier"],
    next_appointment: nextAppt
      ? {
          appointment_id: nextAppt.id,
          scheduled_at: nextAppt.scheduled_at,
          original_scheduled_at: nextAppt.original_scheduled_at,
          status: nextAppt.status as AppointmentStatus,
          ai_suggested_date: nextAppt.ai_suggested_date,
          suggestion_status: (nextAppt.suggestion_status ?? null) as SuggestionStatus | null | undefined,
          is_on_the_day: nextAppt.is_on_the_day,
        }
      : null,
    triage_events: triageEvents.map((e) => ({
      event_id: e.id,
      created_at: e.created_at,
      trigger_type: e.trigger_type,
      previous_score: e.previous_score,
      new_score: e.new_score,
      suggested_action: e.suggested_action as SuggestedAction,
      ai_reasoning: e.ai_reasoning,
    })),
  };

  return Response.json(detail);
}
