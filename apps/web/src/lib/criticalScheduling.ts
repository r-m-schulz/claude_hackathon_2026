import type {
  AIAnalysis,
  CriticalScheduleRecommendation,
} from "@triageai/shared";

import { getSeverityDrivenScheduleResult } from "@/lib/scheduling";
import { createSupabaseServerClient } from "@/lib/server/supabase";

type RunCriticalSchedulingEngineInput = {
  businessId: string;
  patientId: string;
  noteId: string;
  noteAnalysis: AIAnalysis;
};

export async function runCriticalSchedulingEngine({
  businessId,
  patientId,
  noteId,
  noteAnalysis,
}: RunCriticalSchedulingEngineInput): Promise<CriticalScheduleRecommendation | null> {
  const supabase = createSupabaseServerClient();
  const { data: patient, error } = await supabase
    .from("patients")
    .select("id")
    .eq("business_id", businessId)
    .eq("id", patientId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!patient) {
    return null;
  }

  const recommendation = await getSeverityDrivenScheduleResult(patientId);

  return {
    patient_id: recommendation.patient_id,
    patient_name: recommendation.patient_name,
    department: recommendation.department,
    note_id: noteId,
    severity_score: noteAnalysis.severity_score,
    critical_score: recommendation.critical_score,
    risk_tier: recommendation.risk_tier,
    focused_appointment_id: recommendation.appointment_id,
    suggested_at: recommendation.suggested_at,
    week_start: recommendation.week_start,
    rationale: recommendation.justification,
    locked_constraints: recommendation.locked_constraints,
    changes: recommendation.changes,
  };
}
