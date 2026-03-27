import { createSupabaseServerClient } from "@/lib/server/supabase";

interface ModifyInput {
  appointment_id: string;
  clinician_id: string;
  triage_event_id: string;
  new_date: string; // ISO string
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const body: ModifyInput = await req.json();
  const { appointment_id, clinician_id, triage_event_id, new_date } = body;

  const proposedDate = new Date(new_date);

  // Enforce the 7-day hard rule even on manually modified suggestions
  if (proposedDate.getTime() < Date.now() + SEVEN_DAYS_MS) {
    return Response.json(
      { error: "Suggested date must be at least 7 days from today" },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient();

  await Promise.all([
    supabase
      .from("appointments")
      .update({
        scheduled_at: new_date,
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

  return Response.json({ success: true, new_scheduled_at: new_date });
}
