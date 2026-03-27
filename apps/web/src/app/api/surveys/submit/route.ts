import { createSupabaseServerClient } from "@/lib/server/supabase";

interface SubmitSurveyInput {
  survey_id: string;
  patient_id: string;
  responses: { question_id: string; value: string | number }[];
}

export async function POST(req: Request) {
  const body: SubmitSurveyInput = await req.json();
  const { survey_id, patient_id, responses } = body;

  const supabase = createSupabaseServerClient();

  // Verify the survey belongs to this patient and is not already completed
  const { data: survey } = await supabase
    .from("surveys")
    .select("id, completed_at, patient_id")
    .eq("id", survey_id)
    .eq("patient_id", patient_id)
    .single();

  if (!survey) {
    return Response.json({ error: "Survey not found" }, { status: 404 });
  }
  if (survey.completed_at) {
    return Response.json({ error: "Survey already submitted" }, { status: 409 });
  }

  // Persist responses — the AI analysis is triggered via /api/ai/analyse-survey
  await supabase
    .from("surveys")
    .update({
      responses,
      completed_at: new Date().toISOString(),
    })
    .eq("id", survey_id);

  // Kick off AI analysis asynchronously via internal fetch
  // (fire-and-forget so the patient gets a fast response)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  fetch(`${baseUrl}/api/ai/analyse-survey`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ survey_id, patient_id, responses }),
  }).catch((err) => console.error("[survey submit] analyse-survey failed:", err));

  return Response.json({ success: true });
}
