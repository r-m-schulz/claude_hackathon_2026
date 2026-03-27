import { claude, MODEL, parseAIAnalysis } from "@/lib/claude";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { triggerTriageEvaluation } from "@/lib/triage";

interface SummariseNoteInput {
  note_id: string;
  patient_id: string;
  department: string;
  content: string;
}

export async function POST(req: Request) {
  const body: SummariseNoteInput = await req.json();
  const { note_id, patient_id, department, content } = body;

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

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const analysis = parseAIAnalysis(raw);

  const supabase = createSupabaseServerClient();
  await supabase
    .from("clinical_notes")
    .update({ ai_summary: analysis })
    .eq("id", note_id);

  await triggerTriageEvaluation(patient_id, "note", note_id, analysis.severity_score);

  return Response.json({ success: true, analysis });
}
