import { createSupabaseServerClient } from "@/lib/server/supabase";

interface RescheduleInput {
  appointment_id: string;
  clinician_id: string;
  new_date: string; // ISO string
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const body: RescheduleInput = await req.json();
  const { appointment_id, clinician_id, new_date } = body;

  const newDate = new Date(new_date);

  if (newDate.getTime() < Date.now() + SEVEN_DAYS_MS) {
    return Response.json(
      { error: "New date must be at least 7 days from today" },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, suggestion_status")
    .eq("id", appointment_id)
    .eq("suggestion_status", "approved")
    .single();

  if (!appointment) {
    return Response.json(
      { error: "Appointment not found or suggestion not approved" },
      { status: 404 },
    );
  }

  await supabase
    .from("appointments")
    .update({
      scheduled_at: new_date,
      status: "rescheduled",
      ai_suggested_date: null,
      suggestion_status: null,
    })
    .eq("id", appointment_id);

  return Response.json({ success: true, new_scheduled_at: new_date });
}
