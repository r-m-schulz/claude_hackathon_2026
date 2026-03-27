import { requireBusinessContext } from "@/lib/server/businessAuth";
import { extractTextFromUploadedFile, uploadPatientDocument } from "@/lib/server/documentExtraction";
import { readOptionalFile, readStringField } from "@/lib/server/formData";
import { jsonErrorResponse, HttpError } from "@/lib/server/http";
import { createSupabaseServerClient } from "@/lib/server/supabase";

type RouteContext = {
  params: Promise<{
    patientId: string;
  }>;
};

function getEntryType(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType === "application/pdf") {
    return "pdf";
  }

  return "file";
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const context = await requireBusinessContext(req);
    const { patientId } = await params;
    const formData = await req.formData();
    const file = readOptionalFile(formData, "file");

    if (!file) {
      throw new HttpError(400, "A file is required.");
    }

    const supabase = createSupabaseServerClient();
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("business_id", context.businessId)
      .eq("id", patientId)
      .maybeSingle();

    if (patientError) {
      throw new HttpError(500, patientError.message);
    }

    if (!patient) {
      throw new HttpError(404, "Patient not found.");
    }

    const title = readStringField(formData, "title") || file.name;
    const uploaderNote = readStringField(formData, "body_text");
    const upload = await uploadPatientDocument(file, context.businessId, patientId);
    const extraction = await extractTextFromUploadedFile(file);

    const { error } = await supabase.from("patient_context_entries").insert({
      business_id: context.businessId,
      patient_id: patientId,
      created_by_employee_id: context.employee.id,
      entry_type: getEntryType(upload.mimeType),
      title,
      body_text: uploaderNote || extraction.summary || null,
      extracted_text: extraction.extractedText || null,
      file_name: upload.fileName,
      mime_type: upload.mimeType,
      file_bucket: "patient-documents",
      file_path: upload.path,
      metadata: {
        extraction_summary: extraction.summary,
      },
    });

    if (error) {
      throw new HttpError(400, error.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    return jsonErrorResponse(error, "Unable to upload the patient document.");
  }
}
