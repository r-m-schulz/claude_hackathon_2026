import { claude, MODEL } from "@/lib/claude";
import { DEPARTMENT_PROMPTS } from "@/lib/prompts";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import type { GenerateSurveyInput, Department, SurveyQuestion } from "@triageai/shared";

export async function POST(req: Request) {
  const body: GenerateSurveyInput = await req.json();
  const { patient_id, department } = body;

  const supabase = createSupabaseServerClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("risk_tier, clinical_notes(content, created_at)")
    .eq("id", patient_id)
    .single();

  if (!patient) {
    return Response.json({ error: "Patient not found" }, { status: 404 });
  }

  const recentNotes =
    (patient.clinical_notes as { content: string }[] | null)
      ?.slice(0, 3)
      .map((n) => n.content)
      .join("\n---\n") || "No recent notes.";

  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: DEPARTMENT_PROMPTS[department as Department].surveyGeneration,
    messages: [
      {
        role: "user",
        content: `Patient risk tier: ${patient.risk_tier}\nRecent clinical notes: ${recentNotes}\n\nGenerate a personalised survey with 5-12 questions.\nReturn ONLY valid JSON: { "questions": SurveyQuestion[] }\nNo preamble, no markdown.`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const { questions } = JSON.parse(cleaned) as { questions: SurveyQuestion[] };

  const { data: survey, error } = await supabase
    .from("surveys")
    .insert({
      patient_id,
      department,
      generated_by_ai: true,
      questions,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: "Failed to save survey" }, { status: 500 });
  }

  return Response.json({ survey_id: survey.id, questions });
}
