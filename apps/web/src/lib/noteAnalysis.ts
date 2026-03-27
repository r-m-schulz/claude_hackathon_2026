import type { AIAnalysis, Department } from "@triageai/shared";

import { claude, MODEL, parseAIAnalysis } from "@/lib/claude";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { triggerTriageEvaluation } from "@/lib/triage";

type AnalyseClinicalNoteInput = {
  department: Department;
  content: string;
};

type ProcessClinicalNoteInput = AnalyseClinicalNoteInput & {
  noteId: string;
  patientId: string;
};

export async function analyseClinicalNoteContent({
  department,
  content,
}: AnalyseClinicalNoteInput): Promise<AIAnalysis> {
  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `You are a clinical triage assistant summarising a clinical note for the ${department} department.
Assess the clinical significance and return ONLY valid JSON:
{
  "severity_score": <integer 0-100>,
  "risk_tier": <"low"|"medium"|"high"|"critical">,
  "findings": [<string>],
  "red_flags": [<string>],
  "confidence": <float 0-1>,
  "recommended_action": <"bring_forward"|"routine"|"on_the_day_flag"|"no_change">,
  "reasoning": <string>,
  "scoring_framework_used": "Clinical Note Analysis"
}
No preamble. Raw JSON only.`,
    messages: [
      {
        role: "user",
        content: `Clinical note:\n${content}`,
      },
    ],
  });

  const textBlock = response.content.find((item) => item.type === "text");
  return parseAIAnalysis(textBlock?.type === "text" ? textBlock.text : "");
}

export async function processClinicalNote({
  noteId,
  patientId,
  department,
  content,
}: ProcessClinicalNoteInput): Promise<AIAnalysis> {
  const analysis = await analyseClinicalNoteContent({ department, content });
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("clinical_notes")
    .update({ ai_summary: analysis })
    .eq("id", noteId);

  if (error) {
    throw new Error(error.message);
  }

  await triggerTriageEvaluation(patientId, "note", noteId, analysis.severity_score);
  return analysis;
}
