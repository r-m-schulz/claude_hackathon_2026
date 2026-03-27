export const MODEL = "claude-sonnet-4-6";

export function getAnthropicApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY.");
  }

  return apiKey;
}
