import { createSupabaseServerClient } from "@/lib/server/supabase";

interface OnTheDayInput {
  patient_id: string;
  clinician_id: string;
  department: string;
  notes?: string;
}

export async function POST(req: Request) {
  const body: OnTheDayInput = await req.json();
  const { patient_id, clinician_id, department, notes } = body;

  const supabase = createSupabaseServerClient();

  // Verify clinician exists and is in the right department
  const { data: clinician } = await supabase
    .from("clinicians")
    .select("id, department")
    .eq("id", clinician_id)
    .single();

  if (!clinician || clinician.department !== department) {
    return Response.json({ error: "Unauthorised" }, { status: 403 });
  }

  const now = new Date().toISOString();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      patient_id,
      clinician_id,
      department,
      scheduled_at: now,
      original_scheduled_at: now,
      status: "scheduled",
      is_on_the_day: true,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, appointment_id: appointment.id });
}
