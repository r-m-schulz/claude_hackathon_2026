import Anthropic from "@anthropic-ai/sdk";
import type { AIAnalysis } from "@triageai/shared";

export const MODEL = "claude-sonnet-4-6";

function createClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY.");
  return new Anthropic({ apiKey });
}

export const claude = createClient();

/**
 * Parse raw model text output into AIAnalysis.
 * Strips markdown fences if the model adds them despite instructions.
 */
export function parseAIAnalysis(raw: string): AIAnalysis {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned non-JSON output: ${raw.slice(0, 200)}`);
  }

  const analysis = parsed as AIAnalysis;

  if (
    typeof analysis.severity_score !== "number" ||
    !analysis.risk_tier ||
    !Array.isArray(analysis.findings) ||
    !Array.isArray(analysis.red_flags) ||
    typeof analysis.confidence !== "number" ||
    !analysis.recommended_action ||
    !analysis.reasoning
  ) {
    throw new Error(`Claude output missing required AIAnalysis fields: ${cleaned.slice(0, 300)}`);
  }

  return analysis;
}
