import type { RiskTier } from "@triageai/shared";

import { createSupabaseServerClient } from "@/lib/server/supabase";

type ClinicalNoteSeverityRow = {
  patient_id: string;
  ai_summary: {
    severity_score?: number;
  } | null;
  created_at: string;
};

export function scoreToTier(score: number): RiskTier {
  if (score <= 25) return "low";
  if (score <= 50) return "medium";
  if (score <= 75) return "high";
  return "critical";
}

export async function loadLatestNoteScoreMap(patientIds: string[]) {
  const uniquePatientIds = [...new Set(patientIds.filter(Boolean))];
  const scoreMap = new Map<string, number>();

  if (uniquePatientIds.length === 0) {
    return scoreMap;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinical_notes")
    .select("patient_id, ai_summary, created_at")
    .in("patient_id", uniquePatientIds)
    .not("ai_summary", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as ClinicalNoteSeverityRow[]) {
    if (scoreMap.has(row.patient_id)) {
      continue;
    }

    scoreMap.set(row.patient_id, row.ai_summary?.severity_score ?? 0);
  }

  return scoreMap;
}
