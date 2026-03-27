import type { RiskTier, SuggestedAction } from "@triageai/shared";
import { loadLatestNoteScoreMap, scoreToTier } from "@/lib/noteSeverity";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { createAppointmentSuggestion } from "@/lib/scheduling";

type TriggerType = "scan" | "survey" | "note" | "manual";

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
  return `Risk score ${direction} to ${newScore} (${tier}) following ${triggerType} analysis. Notes can fully reset the active patient score, while scan and survey signals can raise the live score immediately so the scheduler can suggest earlier return slots or create a new follow-up recommendation.`;
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
    .select("risk_score, risk_tier")
    .eq("id", patient_id)
    .single();

  if (!patient) throw new Error(`Patient not found: ${patient_id}`);

  const latestNoteScoreMap =
    trigger_type === "note" ? await loadLatestNoteScoreMap([patient_id]) : new Map<string, number>();
  const aggregatedScore =
    trigger_type === "note"
      ? latestNoteScoreMap.get(patient_id) ?? new_component_score
      : Math.max(new_component_score, Math.round((patient.risk_score ?? 0) * 0.85));

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

  await createAppointmentSuggestion(patient_id, newTier, event.id);
}
