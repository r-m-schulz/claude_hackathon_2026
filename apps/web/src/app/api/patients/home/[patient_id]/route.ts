import { createSupabaseServerClient } from "@/lib/server/supabase";
import type { PatientHomeSummary, Department, AppointmentStatus, SuggestionStatus } from "@triageai/shared";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ patient_id: string }> },
) {
  const { patient_id } = await params;
  const supabase = createSupabaseServerClient();

  const { data: patient, error } = await supabase
    .from("patients")
    .select(`
      id,
      full_name,
      department,
      appointments (
        id,
        scheduled_at,
        status,
        suggestion_status,
        is_on_the_day
      ),
      surveys (
        id,
        completed_at
      )
    `)
    .eq("id", patient_id)
    .single();

  if (error || !patient) {
    return Response.json({ error: "Patient not found" }, { status: 404 });
  }

  const nextAppt = (patient.appointments as {
    id: string;
    scheduled_at: string;
    status: string;
    suggestion_status: string | null;
    is_on_the_day: boolean;
  }[])
    ?.filter((a) => a.status === "scheduled")
    ?.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    ?.[0] ?? null;

  const pendingSurveyCount = (patient.surveys as { completed_at: string | null }[])
    ?.filter((s) => !s.completed_at).length ?? 0;

  const summary: PatientHomeSummary = {
    patient_id: patient.id,
    full_name: patient.full_name,
    department: patient.department as Department,
    next_appointment: nextAppt
      ? {
          appointment_id: nextAppt.id,
          scheduled_at: nextAppt.scheduled_at,
          status: nextAppt.status as AppointmentStatus,
          suggestion_status: (nextAppt.suggestion_status ?? null) as SuggestionStatus | null | undefined,
          is_on_the_day: nextAppt.is_on_the_day,
        }
      : null,
    pending_survey_count: pendingSurveyCount,
  };

  return Response.json(summary);
}
