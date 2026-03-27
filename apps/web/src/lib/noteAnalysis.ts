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
  patientId,
}: AnalyseClinicalNoteInput & { patientId: string }): Promise<AIAnalysis> {
  const supabase = createSupabaseServerClient();
  const [{ data: patient }, { data: contextEntries }] = await Promise.all([
    supabase
      .from("patients")
      .select("full_name, risk_score, risk_tier")
      .eq("id", patientId)
      .maybeSingle(),
    supabase
      .from("patient_context_entries")
      .select("entry_type, title, body_text, extracted_text, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const recentContext = (contextEntries ?? [])
    .map((entry) => {
      const body = entry.body_text || entry.extracted_text || "";
      return `[${entry.entry_type}] ${entry.title}: ${body}`.trim();
    })
    .join("\n---\n") || "No recent context available.";

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
Use the full severity range rather than clustering near zero:
- 0-25: stable / administrative / minimal clinical concern
- 26-50: active issue needing follow-up
- 51-75: worsening symptoms or clear clinician concern that should prompt earlier review
- 76-100: urgent or critical deterioration, red flags, or same-day escalation concern
When the note documents worsening symptoms, failed treatment, recurrent flare, red flags, or clinician concern about earlier review, bias the score upward rather than conservative.
No preamble. Raw JSON only.`,
    messages: [
      {
        role: "user",
        content: `Patient name: ${patient?.full_name ?? "Unknown patient"}
Current critical score: ${patient?.risk_score ?? 0}
Current risk tier: ${patient?.risk_tier ?? "low"}
Recent patient context:
${recentContext}

New clinical note:
${content}`,
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
  const analysis = await analyseClinicalNoteContent({ department, content, patientId });
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
