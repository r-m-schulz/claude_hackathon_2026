import { claude, MODEL, parseAIAnalysis } from "@/lib/claude";
import { DEPARTMENT_PROMPTS } from "@/lib/prompts";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { triggerTriageEvaluation } from "@/lib/triage";
import type { AnalyseScanInput, Department } from "@triageai/shared";

export async function POST(req: Request) {
  const body: AnalyseScanInput = await req.json();
  const { scan_id, patient_id, department, scan_type, file_url } = body;

  // Fetch image from Supabase Storage and convert to base64
  const imageResponse = await fetch(file_url);
  if (!imageResponse.ok) {
    return Response.json({ error: "Failed to fetch scan file" }, { status: 400 });
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");
  const mediaType = (imageResponse.headers.get("content-type") || "image/jpeg") as
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp";

  const prompt = DEPARTMENT_PROMPTS[department as Department];

  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: prompt.imageAnalysis,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image },
          },
          {
            type: "text",
            text: `Scan type: ${scan_type}. Analyse this image and return only valid JSON matching the AIAnalysis schema. No preamble.`,
          },
        ],
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const analysis = parseAIAnalysis(raw);

  const supabase = createSupabaseServerClient();
  await supabase
    .from("scans_and_images")
    .update({ ai_analysis: analysis, analysed_at: new Date().toISOString() })
    .eq("id", scan_id);

  await triggerTriageEvaluation(patient_id, "scan", scan_id, analysis.severity_score);

  return Response.json({ success: true, analysis });
}
