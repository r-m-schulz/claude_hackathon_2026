import { claude, MODEL, parseAIAnalysis } from "@/lib/claude";
import { DEPARTMENT_PROMPTS } from "@/lib/prompts";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { triggerTriageEvaluation } from "@/lib/triage";
import { checkPsychiatricCrisisResponses, escalatePsychiatricCrisis } from "@/lib/psychiatric";
import type { AnalyseSurveyInput, Department, SurveyQuestion } from "@triageai/shared";

export async function POST(req: Request) {
  const body: AnalyseSurveyInput = await req.json();
  const { survey_id, patient_id, responses } = body;

  const supabase = createSupabaseServerClient();

  const { data: survey } = await supabase
    .from("surveys")
    .select("*, patients(department, risk_score, risk_tier)")
    .eq("id", survey_id)
    .single();

  if (!survey) {
    return Response.json({ error: "Survey not found" }, { status: 404 });
  }

  const department: Department = survey.patients.department;
  const questions: SurveyQuestion[] = survey.questions;

  // Psychiatric crisis check — runs before anything else
  if (department === "psychiatry") {
    const crisisDetected = checkPsychiatricCrisisResponses(questions, responses);
    if (crisisDetected) {
      await escalatePsychiatricCrisis(patient_id, survey_id);
      // Continue with full analysis below
    }
  }

  const formattedResponses = responses
    .map((r) => {
      const q = questions.find((q) => q.id === r.question_id);
      return `Q: ${q?.text ?? r.question_id}\nA: ${r.value}`;
    })
    .join("\n\n");

  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: DEPARTMENT_PROMPTS[department].surveyAnalysis,
    messages: [
      {
        role: "user",
        content: `Patient current risk score: ${survey.patients.risk_score}\nPatient current risk tier: ${survey.patients.risk_tier}\n\nSurvey responses:\n${formattedResponses}\n\nAnalyse these responses and return ONLY valid JSON matching AIAnalysis schema.\nNo preamble.`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const analysis = parseAIAnalysis(raw);

  await supabase
    .from("surveys")
    .update({
      responses,
      ai_analysis: analysis,
      completed_at: new Date().toISOString(),
    })
    .eq("id", survey_id);

  await triggerTriageEvaluation(patient_id, "survey", survey_id, analysis.severity_score);

  return Response.json({ success: true, analysis });
}
