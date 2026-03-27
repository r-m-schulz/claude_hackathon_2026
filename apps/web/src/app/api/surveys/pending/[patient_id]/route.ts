import { createSupabaseServerClient } from "@/lib/server/supabase";
import type { PendingSurveySummary, Department } from "@triageai/shared";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ patient_id: string }> },
) {
  const { patient_id } = await params;
  const supabase = createSupabaseServerClient();

  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("id, patient_id, department, sent_at, questions")
    .eq("patient_id", patient_id)
    .is("completed_at", null)
    .order("sent_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const pending: PendingSurveySummary[] = (surveys ?? []).map((s) => ({
    survey_id: s.id,
    patient_id: s.patient_id,
    department: s.department as Department,
    sent_at: s.sent_at,
    questions: s.questions,
  }));

  return Response.json({ surveys: pending });
}
