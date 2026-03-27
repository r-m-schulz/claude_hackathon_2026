import { createSupabaseServerClient } from "@/lib/server/supabase";

/**
 * GET /api/clinical-notes/:patient_id?requester_id=<clinician_id>
 *
 * Psychiatric privacy rule (from spec):
 * ai_summary is stripped from notes where department = 'psychiatry'
 * unless the requester is the treating clinician for that note.
 * Handled here at the API layer — not RLS — due to column-level complexity.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ patient_id: string }> },
) {
  const { patient_id } = await params;
  const { searchParams } = new URL(req.url);
  const requester_id = searchParams.get("requester_id");

  const supabase = createSupabaseServerClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("department")
    .eq("id", patient_id)
    .single();

  if (!patient) {
    return Response.json({ error: "Patient not found" }, { status: 404 });
  }

  const { data: notes, error } = await supabase
    .from("clinical_notes")
    .select("id, clinician_id, content, ai_summary, created_at")
    .eq("patient_id", patient_id)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const isPsychiatry = patient.department === "psychiatry";

  const filtered = (notes ?? []).map((note) => {
    // Strip ai_summary for psychiatric notes unless requester is the treating clinician
    if (isPsychiatry && note.clinician_id !== requester_id) {
      return { ...note, ai_summary: null };
    }
    return note;
  });

  return Response.json({ notes: filtered });
}
