import { requireBusinessContext } from "@/lib/server/businessAuth";
import { jsonErrorResponse, HttpError } from "@/lib/server/http";
import { createManualAppointmentRecommendation } from "@/lib/scheduling";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import type { SuggestedAction } from "@triageai/shared";

type CreateAppointmentRecommendationBody = {
  note_id?: string | null;
};

type RouteContext = {
  params: Promise<{
    patientId: string;
  }>;
};

type RecommendationStatus = "recommended" | "already_scheduled_soon" | "no_existing_appointment";

function recommendationCopy(status: RecommendationStatus) {
  switch (status) {
    case "recommended":
      return {
        suggested_action: "bring_forward" as SuggestedAction,
        reasoning:
          "Clinician requested an appointment recommendation after reviewing the uploaded note. The next scheduled appointment has been marked for earlier review.",
        message: "Appointment recommendation created. The patient is now marked for scheduling review.",
      };
    case "already_scheduled_soon":
      return {
        suggested_action: "routine" as SuggestedAction,
        reasoning:
          "Clinician requested an appointment recommendation after reviewing the uploaded note. The patient already has a scheduled appointment inside the 7-day lock, so no earlier AI date was suggested.",
        message: "The patient already has an appointment soon, so no earlier recommendation was added.",
      };
    case "no_existing_appointment":
      return {
        suggested_action: "routine" as SuggestedAction,
        reasoning:
          "Clinician requested an appointment recommendation after reviewing the uploaded note. No scheduled appointment exists yet, so scheduling staff should book the next available slot manually.",
        message: "Recommendation logged. This patient does not have an existing appointment yet, so scheduling staff should book the next available slot.",
      };
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const context = await requireBusinessContext(req);
    const { patientId } = await params;
    const body = (await req.json().catch(() => ({}))) as CreateAppointmentRecommendationBody;
    const supabase = createSupabaseServerClient();

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, risk_score")
      .eq("business_id", context.businessId)
      .eq("id", patientId)
      .maybeSingle();

    if (patientError) {
      throw new HttpError(500, patientError.message);
    }

    if (!patient) {
      throw new HttpError(404, "Patient not found.");
    }

    const recommendation = await createManualAppointmentRecommendation(patientId);
    const copy = recommendationCopy(recommendation.status);

    const { data: triageEvent, error: triageEventError } = await supabase
      .from("triage_events")
      .insert({
        patient_id: patientId,
        trigger_type: "manual",
        trigger_id: body.note_id ?? patientId,
        previous_score: patient.risk_score,
        new_score: patient.risk_score,
        suggested_action: copy.suggested_action,
        ai_reasoning: copy.reasoning,
      })
      .select("id")
      .single();

    if (triageEventError || !triageEvent) {
      throw new HttpError(400, triageEventError?.message ?? "Unable to log recommendation.");
    }

    return Response.json({
      success: true,
      event_id: triageEvent.id,
      message: copy.message,
      recommendation,
    });
  } catch (error) {
    return jsonErrorResponse(error, "Unable to create appointment recommendation.");
  }
}
