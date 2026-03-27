import { createSupabaseServerClient } from "@/lib/server/supabase";

interface ApproveInput {
  appointment_id: string;
  clinician_id: string;
  triage_event_id: string;
}

export async function POST(req: Request) {
  const body: ApproveInput = await req.json();
  const { appointment_id, clinician_id, triage_event_id } = body;

  const supabase = createSupabaseServerClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("patient_id, ai_suggested_date, clinician_id, department, scheduled_at")
    .eq("id", appointment_id)
    .single();

  if (!appointment) {
    return Response.json({ error: "Appointment not found" }, { status: 404 });
  }

  // HARD RULE: reschedule twice in 30 days requires consultant approval
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentReschedules } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", appointment.patient_id)
    .eq("status", "rescheduled")
    .gte("created_at", thirtyDaysAgo);

  if ((recentReschedules ?? 0) >= 2) {
    // Check approver is a consultant or admin
    const { data: clinician } = await supabase
      .from("clinicians")
      .select("role")
      .eq("id", clinician_id)
      .single();

    if (!clinician || !["consultant", "admin"].includes(clinician.role)) {
      return Response.json(
        { error: "Two reschedules in 30 days: consultant or admin approval required" },
        { status: 403 },
      );
    }
  }

  const newScheduledAt = appointment.ai_suggested_date;
  if (!newScheduledAt) {
    return Response.json({ error: "No AI suggested date to approve" }, { status: 400 });
  }

  // Execute the reschedule
  await Promise.all([
    supabase
      .from("appointments")
      .update({
        scheduled_at: newScheduledAt,
        ai_suggested_date: null,
        suggestion_status: "approved",
        status: "rescheduled",
      })
      .eq("id", appointment_id),

    supabase
      .from("triage_events")
      .update({
        approved_by: clinician_id,
        actioned_at: new Date().toISOString(),
      })
      .eq("id", triage_event_id),
  ]);

  return Response.json({ success: true, new_scheduled_at: newScheduledAt });
}
