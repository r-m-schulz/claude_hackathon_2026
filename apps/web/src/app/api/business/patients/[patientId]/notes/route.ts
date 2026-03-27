import type { Department, SavePatientNoteResponse } from "@triageai/shared";

import { runCriticalSchedulingEngine } from "@/lib/criticalScheduling";
import { requireBusinessContext } from "@/lib/server/businessAuth";
import { jsonErrorResponse, HttpError } from "@/lib/server/http";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { processClinicalNote } from "@/lib/noteAnalysis";

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
      .select("id, department")
      .eq("business_id", context.businessId)
      .eq("id", patientId)
      .maybeSingle();

    if (patientError) {
      throw new HttpError(500, patientError.message);
    }

    if (!patient) {
      throw new HttpError(404, "Patient not found.");
    }

    const { data: contextEntry, error: contextEntryError } = await supabase
      .from("patient_context_entries")
      .insert({
        business_id: context.businessId,
        patient_id: patientId,
        created_by_employee_id: context.employee.id,
        entry_type: "note",
        title,
        body_text: noteText,
        extracted_text: noteText,
      })
      .select("id")
      .single();

    if (contextEntryError || !contextEntry) {
      throw new HttpError(400, contextEntryError?.message ?? "Unable to save note.");
    }

    const { data: clinicalNote, error: clinicalNoteError } = await supabase
      .from("clinical_notes")
      .insert({
        patient_id: patientId,
        clinician_id: context.employee.linked_clinician_id,
        content: noteText,
      })
      .select("id")
      .single();

    if (clinicalNoteError || !clinicalNote) {
      await supabase.from("patient_context_entries").delete().eq("id", contextEntry.id);
      throw new HttpError(400, clinicalNoteError?.message ?? "Unable to create clinical note.");
    }

    let analysis = null;
    let recommendation = null;
    let engineError: string | null = null;

    try {
      analysis = await processClinicalNote({
        noteId: clinicalNote.id as string,
        patientId,
        department: patient.department as Department,
        content: noteText,
      });

      recommendation = await runCriticalSchedulingEngine({
        businessId: context.businessId,
        patientId,
        noteId: clinicalNote.id as string,
        noteAnalysis: analysis,
      });
    } catch (error) {
      engineError = error instanceof Error ? error.message : "Unknown note-analysis error.";
    }

    const metadata = {
      clinical_note_id: clinicalNote.id,
      triage_engine: {
        status: analysis ? "processed" : "failed",
        processed_at: new Date().toISOString(),
        ai_summary: analysis,
        critical_score: recommendation?.critical_score ?? null,
        schedule_recommendation: recommendation,
        error: engineError,
      },
    };

    await supabase.from("patient_context_entries").update({ metadata }).eq("id", contextEntry.id);

    const response: SavePatientNoteResponse = {
      success: true,
      clinical_note_id: clinicalNote.id as string,
      analysis,
      engine_processed: Boolean(analysis),
      engine_error: engineError,
      critical_score: recommendation?.critical_score ?? null,
      recommendation,
    };

    return Response.json(response);
  } catch (error) {
    return jsonErrorResponse(error, "Unable to save note.");
  }
}
