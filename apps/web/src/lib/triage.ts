import type { RiskTier, SuggestedAction } from "@triageai/shared";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { createAppointmentSuggestion } from "@/lib/scheduling";

type TriggerType = "scan" | "survey" | "note" | "manual";

const WEIGHTS = { scan: 0.4, survey: 0.35, notes: 0.25 };

function scoreToTier(score: number): RiskTier {
  if (score <= 30) return "low";
  if (score <= 55) return "medium";
  if (score <= 80) return "high";
  return "critical";
}

function tierToAction(tier: RiskTier): SuggestedAction {
  const map: Record<RiskTier, SuggestedAction> = {
    low: "no_change",
    medium: "routine",
    high: "bring_forward",
    critical: "on_the_day_flag",
  };
  return map[tier];
}

function generateReasoning(
  previousScore: number,
  newScore: number,
  triggerType: TriggerType,
): string {
  const delta = newScore - previousScore;
  const direction = delta > 0 ? `increased by ${delta}` : delta < 0 ? `decreased by ${Math.abs(delta)}` : "unchanged";
  const tier = scoreToTier(newScore);
  return `Risk score ${direction} to ${newScore} (${tier}) following ${triggerType} analysis. Weighted aggregation: scan 40%, survey 35%, clinical notes 25%.`;
}

export async function triggerTriageEvaluation(
  patient_id: string,
  trigger_type: TriggerType,
  trigger_id: string,
  new_component_score: number,
): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("risk_score, risk_tier, department")
    .eq("id", patient_id)
    .single();

  if (!patient) throw new Error(`Patient not found: ${patient_id}`);

  // Fetch latest scores from each data source in parallel
  const [latestScanResult, latestSurveyResult, latestNotesResult] = await Promise.all([
    supabase
      .from("scans_and_images")
      .select("ai_analysis")
      .eq("patient_id", patient_id)
      .not("ai_analysis", "is", null)
      .order("analysed_at", { ascending: false })
      .limit(1)
      .single(),

    supabase
      .from("surveys")
      .select("ai_analysis")
      .eq("patient_id", patient_id)
      .not("ai_analysis", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .single(),

    supabase
      .from("clinical_notes")
      .select("ai_summary")
      .eq("patient_id", patient_id)
      .not("ai_summary", "is", null)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const scanScore: number = latestScanResult.data?.ai_analysis?.severity_score ?? 0;
  const surveyScore: number = latestSurveyResult.data?.ai_analysis?.severity_score ?? 0;

  const notesScores: number[] =
    latestNotesResult.data?.map((n: { ai_summary: { severity_score?: number } | null }) => n.ai_summary?.severity_score ?? 0) ?? [];
  const avgNotesScore =
    notesScores.length > 0
      ? notesScores.reduce((a, b) => a + b, 0) / notesScores.length
      : 0;

  const aggregatedScore = Math.round(
    scanScore * WEIGHTS.scan +
    surveyScore * WEIGHTS.survey +
    avgNotesScore * WEIGHTS.notes,
  );

  const newTier = scoreToTier(aggregatedScore);
  const suggestedAction = tierToAction(newTier);

  // Update patient risk score and log triage event in parallel
  const [, eventResult] = await Promise.all([
    supabase
      .from("patients")
      .update({
        risk_score: aggregatedScore,
        risk_tier: newTier,
        risk_updated_at: new Date().toISOString(),
      })
      .eq("id", patient_id),

    supabase
      .from("triage_events")
      .insert({
        patient_id,
        trigger_type,
        trigger_id,
        previous_score: patient.risk_score,
        new_score: aggregatedScore,
        suggested_action: suggestedAction,
        ai_reasoning: generateReasoning(patient.risk_score, aggregatedScore, trigger_type),
      })
      .select()
      .single(),
  ]);

  const event = eventResult.data;
  if (!event) return;

  // Create appointment suggestion for high/critical patients
  if (newTier === "high" || newTier === "critical") {
    await createAppointmentSuggestion(patient_id, newTier, event.id);
  }
}
