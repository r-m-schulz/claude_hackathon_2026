import { claude, MODEL } from "@/lib/claude";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { HttpError } from "@/lib/server/http";

const EXTRACTION_SYSTEM_PROMPT =
  "You extract text and context from business and patient documents. Return only raw JSON with keys extracted_text and summary.";

const EXTRACTION_USER_PROMPT =
  'Extract any visible or embedded text from this file. Preserve clinically relevant wording when present, but clean obvious OCR noise. Return JSON in this shape: {"extracted_text":"...","summary":"..."}';

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").toLowerCase();
}

function parseExtractionResponse(raw: string) {
  const cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      extracted_text?: unknown;
      summary?: unknown;
    };

    return {
      extractedText: typeof parsed.extracted_text === "string" ? parsed.extracted_text.trim() : "",
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    };
  } catch {
    return {
      extractedText: cleaned,
      summary: "",
    };
  }
}

async function uploadFile(
  bucket: "business-assets" | "patient-documents",
  path: string,
  file: File,
) {
  const supabase = createSupabaseServerClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type || undefined,
    upsert: true,
  });

  if (error) {
    throw new HttpError(400, error.message);
  }
}

export async function uploadBusinessAsset(
  file: File,
  businessId: string,
  kind: "logo" | "header",
) {
  const safeName = sanitizeFileName(file.name || `${kind}.png`);
  const path = `${businessId}/${kind}/${Date.now()}-${safeName}`;

  await uploadFile("business-assets", path, file);

  const supabase = createSupabaseServerClient();
  const { data } = supabase.storage.from("business-assets").getPublicUrl(path);

  return {
    path,
    url: data.publicUrl,
  };
}

export async function uploadPatientDocument(file: File, businessId: string, patientId: string) {
  const safeName = sanitizeFileName(file.name || "upload");
  const path = `${businessId}/${patientId}/${Date.now()}-${safeName}`;

  await uploadFile("patient-documents", path, file);

  return {
    path,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
  };
}

export async function extractTextFromUploadedFile(file: File) {
  const mimeType = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (mimeType === "text/plain") {
    return {
      extractedText: buffer.toString("utf8").slice(0, 50000),
      summary: "Plain text imported directly.",
    };
  }

  if (
    mimeType !== "application/pdf" &&
    mimeType !== "image/jpeg" &&
    mimeType !== "image/png" &&
    mimeType !== "image/webp" &&
    mimeType !== "image/gif"
  ) {
    return {
      extractedText: "",
      summary: "File stored successfully. OCR extraction is available for images, PDFs, and text files.",
    };
  }

  const content =
    mimeType === "application/pdf"
      ? [
          {
            type: "document" as const,
            title: file.name,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: buffer.toString("base64"),
            },
          },
          {
            type: "text" as const,
            text: EXTRACTION_USER_PROMPT,
          },
        ]
      : [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: buffer.toString("base64"),
            },
          },
          {
            type: "text" as const,
            text: EXTRACTION_USER_PROMPT,
          },
        ];

  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: 1800,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content,
      },
    ],
  });

  const raw = response.content
    .map((block) => (block.type === "text" ? (block as { text: string }).text : ""))
    .filter(Boolean)
    .join("\n");

  return parseExtractionResponse(raw);
}
