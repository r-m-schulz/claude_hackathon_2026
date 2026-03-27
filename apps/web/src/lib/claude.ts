import Anthropic from "@anthropic-ai/sdk";
import type { AIAnalysis, RiskTier, SuggestedAction } from "@triageai/shared";

export const MODEL = "claude-sonnet-4-6";

const TIER_ORDER: RiskTier[] = ["low", "medium", "high", "critical"];
const ACTION_ORDER: SuggestedAction[] = [
  "no_change",
  "routine",
  "bring_forward",
  "on_the_day_flag",
];
const TIER_SCORE_FLOORS: Record<RiskTier, number> = {
  low: 24,
  medium: 48,
  high: 72,
  critical: 90,
};

function createClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY.");
  return new Anthropic({ apiKey });
}

export const claude = createClient();

function scoreToTier(score: number): RiskTier {
  if (score <= 25) return "low";
  if (score <= 50) return "medium";
  if (score <= 75) return "high";
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

function moreSevereTier(a: RiskTier, b: RiskTier) {
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b;
}

function moreUrgentAction(a: SuggestedAction, b: SuggestedAction) {
  return ACTION_ORDER.indexOf(a) >= ACTION_ORDER.indexOf(b) ? a : b;
}

function calibrateAIAnalysis(analysis: AIAnalysis): AIAnalysis {
  const detectedTier = moreSevereTier(
    analysis.risk_tier,
    scoreToTier(Math.round(analysis.severity_score)),
  );
  const redFlagBoost = Math.min(18, analysis.red_flags.length * 5);
  const findingBoost = Math.min(10, analysis.findings.length * 2);
  const confidenceBoost = Math.max(0, Math.round((analysis.confidence - 0.55) * 20));
  const actionBoost =
    analysis.recommended_action === "on_the_day_flag"
      ? 12
      : analysis.recommended_action === "bring_forward"
        ? 7
        : analysis.recommended_action === "routine"
          ? 3
          : 0;

  const calibratedScore = Math.min(
    100,
    Math.max(
      TIER_SCORE_FLOORS[detectedTier],
      Math.round(analysis.severity_score + redFlagBoost + findingBoost + confidenceBoost + actionBoost),
    ),
  );
  const calibratedTier = moreSevereTier(detectedTier, scoreToTier(calibratedScore));
  const calibratedAction = moreUrgentAction(
    analysis.recommended_action,
    tierToAction(calibratedTier),
  );

  return {
    ...analysis,
    severity_score: calibratedScore,
    risk_tier: calibratedTier,
    recommended_action: calibratedAction,
  };
}

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

  return calibrateAIAnalysis(analysis);
}
