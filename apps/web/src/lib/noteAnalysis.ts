import type { AIAnalysis, Department, RiskTier, SuggestedAction } from "@triageai/shared";

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

type KeywordEscalationRule = {
  label: string;
  pattern: RegExp;
  exclude?: RegExp;
  floor: number;
  riskTier: RiskTier;
  action: SuggestedAction;
  findings: string[];
  redFlags: string[];
};

const NOTE_ESCALATION_RULES: KeywordEscalationRule[] = [
  {
    label: "metastatic malignancy",
    pattern: /\b(metastatic|metastasis|stage\s*iv|advanced malignan(?:cy|t))\b/i,
    floor: 98,
    riskTier: "critical",
    action: "on_the_day_flag",
    findings: ["Metastatic or advanced malignant disease documented in the note."],
    redFlags: ["Advanced malignant disease documented."],
  },
  {
    label: "active malignancy",
    pattern: /\b(cancer|malignan(?:cy|t)|carcinoma|melanoma|lymphoma|leuka?emia|sarcoma)\b/i,
    exclude:
      /\b(family history of|fhx of|screening for|rule out|r\/o|query|concern(?:ed)? about)\b.{0,30}\b(cancer|malignan(?:cy|t)|carcinoma|melanoma|lymphoma|leuka?emia|sarcoma)\b/i,
    floor: 94,
    riskTier: "critical",
    action: "on_the_day_flag",
    findings: ["Cancer or active malignancy documented in the note."],
    redFlags: ["Active malignancy may require urgent review."],
  },
  {
    label: "oncology treatment",
    pattern: /\b(chemotherapy|chemo|radiotherapy|immunotherapy|oncology)\b/i,
    floor: 90,
    riskTier: "critical",
    action: "on_the_day_flag",
    findings: ["Active oncology treatment documented in the note."],
    redFlags: ["Cancer treatment documented in the current note."],
  },
  {
    label: "urgent deterioration",
    pattern:
      /\b(unable to weight bear|cannot weight bear|shortness of breath|chest pain|heavy bleeding|suicidal|psychosis|sepsis|fracture)\b/i,
    floor: 86,
    riskTier: "critical",
    action: "on_the_day_flag",
    findings: ["An urgent red-flag symptom or acute deterioration is documented."],
    redFlags: ["Urgent red-flag symptom documented in the clinical note."],
  },
  {
    label: "worsening symptoms",
    pattern: /\b(worsening|deteriorating|progressive|severe pain|markedly worse|failed treatment)\b/i,
    floor: 72,
    riskTier: "high",
    action: "bring_forward",
    findings: ["The note describes worsening symptoms or treatment failure."],
    redFlags: [],
  },
];

const TIER_ORDER: RiskTier[] = ["low", "medium", "high", "critical"];
const ACTION_ORDER: SuggestedAction[] = [
  "no_change",
  "routine",
  "bring_forward",
  "on_the_day_flag",
];

function moreSevereTier(a: RiskTier, b: RiskTier) {
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b;
}

function moreUrgentAction(a: SuggestedAction, b: SuggestedAction) {
  return ACTION_ORDER.indexOf(a) >= ACTION_ORDER.indexOf(b) ? a : b;
}

function scoreToTier(score: number): RiskTier {
  if (score <= 25) return "low";
  if (score <= 50) return "medium";
  if (score <= 75) return "high";
  return "critical";
}

function withUniqueEntries(existing: string[], additions: string[]) {
  const seen = new Set(existing.map((entry) => entry.trim().toLowerCase()));
  const merged = [...existing];

  for (const addition of additions) {
    const normalized = addition.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    merged.push(addition);
  }

  return merged;
}

function applyDeterministicEscalation(analysis: AIAnalysis, content: string): AIAnalysis {
  const matchedLabels: string[] = [];
  let next = {
    ...analysis,
    findings: [...analysis.findings],
    red_flags: [...analysis.red_flags],
  };

  for (const rule of NOTE_ESCALATION_RULES) {
    if (!rule.pattern.test(content)) {
      continue;
    }

    if (rule.exclude?.test(content)) {
      continue;
    }

    matchedLabels.push(rule.label);
    next = {
      ...next,
      severity_score: Math.max(next.severity_score, rule.floor),
      risk_tier: moreSevereTier(next.risk_tier, rule.riskTier),
      recommended_action: moreUrgentAction(next.recommended_action, rule.action),
      findings: withUniqueEntries(next.findings, rule.findings),
      red_flags: withUniqueEntries(next.red_flags, rule.redFlags),
    };
  }

  if (matchedLabels.length === 0) {
    return next;
  }

  return {
    ...next,
    risk_tier: moreSevereTier(next.risk_tier, scoreToTier(next.severity_score)),
    reasoning: `${next.reasoning} Deterministic escalation applied for ${matchedLabels.join(", ")} documented in the note.`,
  };
}

function actionForScore(score: number): SuggestedAction {
  if (score >= 76) {
    return "on_the_day_flag";
  }

  if (score >= 51) {
    return "bring_forward";
  }

  if (score >= 26) {
    return "routine";
  }

  return "no_change";
}

function buildHeuristicAnalysis(
  content: string,
  currentRiskScore = 18,
  currentRiskTier: RiskTier = "low",
): AIAnalysis {
  const base: AIAnalysis = {
    severity_score: currentRiskScore,
    risk_tier: currentRiskTier,
    findings: ["Clinical note saved using heuristic analysis fallback."],
    red_flags: [],
    confidence: 0.6,
    recommended_action: actionForScore(currentRiskScore),
    reasoning: "AI note analysis was unavailable, so heuristic clinical keyword scoring was used instead.",
    scoring_framework_used: "Clinical Note Heuristic",
  };

  const escalated = applyDeterministicEscalation(base, content);

  return {
    ...escalated,
    risk_tier: moreSevereTier(escalated.risk_tier, scoreToTier(escalated.severity_score)),
    recommended_action: moreUrgentAction(escalated.recommended_action, actionForScore(escalated.severity_score)),
  };
}

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
If the note states active cancer, malignancy, carcinoma, melanoma, lymphoma, leukaemia, sarcoma, metastatic disease, or oncology treatment, do not return a low score. Active malignancy should normally score in the critical range unless the note clearly says it is only family history, screening, or ruled out.
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
  return applyDeterministicEscalation(
    parseAIAnalysis(textBlock?.type === "text" ? textBlock.text : ""),
    content,
  );
}

export async function processClinicalNote({
  noteId,
  patientId,
  department,
  content,
}: ProcessClinicalNoteInput): Promise<AIAnalysis> {
  let analysis: AIAnalysis;
  const supabase = createSupabaseServerClient();

  try {
    analysis = await analyseClinicalNoteContent({ department, content, patientId });
  } catch {
    const { data: patient } = await supabase
      .from("patients")
      .select("risk_score, risk_tier")
      .eq("id", patientId)
      .maybeSingle();

    analysis = buildHeuristicAnalysis(
      content,
      patient?.risk_score ?? 18,
      patient?.risk_tier ?? "low",
    );
  }

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
