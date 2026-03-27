import { requireBusinessContext } from "@/lib/server/businessAuth";
import { jsonErrorResponse, HttpError } from "@/lib/server/http";
import { createSupabaseServerClient } from "@/lib/server/supabase";

type CreateNoteBody = {
  title?: string;
  body_text?: string;
};

type RouteContext = {
  params: Promise<{
    patientId: string;
  }>;
};

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const context = await requireBusinessContext(req);
    const { patientId } = await params;
    const body = (await req.json()) as CreateNoteBody;
    const title = body.title?.trim() || `Clinical note ${new Date().toLocaleDateString("en-IE")}`;
    const noteText = body.body_text?.trim();

    if (!noteText) {
      throw new HttpError(400, "Note text is required.");
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

    const { error } = await supabase.from("patient_context_entries").insert({
      business_id: context.businessId,
      patient_id: patientId,
      created_by_employee_id: context.employee.id,
      entry_type: "note",
      title,
      body_text: noteText,
      extracted_text: noteText,
    });

    if (error) {
      throw new HttpError(400, error.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    return jsonErrorResponse(error, "Unable to save note.");
  }
}
