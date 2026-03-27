import { createSupabaseServerClient } from "@/lib/server/supabase";

interface RejectInput {
  appointment_id: string;
  clinician_id: string;
  triage_event_id: string;
  reason: string;
}

export async function POST(req: Request) {
  const body: RejectInput = await req.json();
  const { appointment_id, clinician_id, triage_event_id, reason } = body;

  if (!reason?.trim()) {
    return Response.json({ error: "Rejection reason is required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  await Promise.all([
    supabase
      .from("appointments")
      .update({
        ai_suggested_date: null,
        suggestion_status: "rejected",
      })
      .eq("id", appointment_id),

    supabase
      .from("triage_events")
      .update({
        approved_by: clinician_id,
        actioned_at: new Date().toISOString(),
        ai_reasoning: reason,
      })
      .eq("id", triage_event_id),
  ]);

  return Response.json({ success: true });
}
