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

type RecommendationStatus =
  | "recommended"
  | "already_scheduled_soon"
  | "already_best_slot"
  | "no_existing_appointment";

function recommendationCopy(status: RecommendationStatus, hasExistingAppointment: boolean) {
  switch (status) {
    case "recommended":
      return {
        suggested_action: "bring_forward" as SuggestedAction,
        reasoning:
          hasExistingAppointment
            ? "Clinician requested an appointment recommendation after reviewing the uploaded note. The existing appointment has been marked for an earlier clinically justified review slot."
            : "Clinician requested an appointment recommendation after reviewing the uploaded note. No appointment existed, so the engine selected the best available follow-up slot for confirmation.",
        message: hasExistingAppointment
          ? "Appointment recommendation created. The patient is now marked for scheduling review."
          : "Recommended follow-up slot created. Open the calendar to confirm the new appointment.",
      };
    case "already_scheduled_soon":
      return {
        suggested_action: "routine" as SuggestedAction,
        reasoning:
          "Clinician requested an appointment recommendation after reviewing the uploaded note. The patient already has a scheduled appointment inside the 7-day lock, so no earlier AI date was suggested.",
        message: "The patient already has an appointment soon, so no earlier recommendation was added.",
      };
    case "already_best_slot":
      return {
        suggested_action: "routine" as SuggestedAction,
        reasoning:
          "Clinician requested an appointment recommendation after reviewing the uploaded note. The patient already holds the best available future slot once the calendar is ranked by severity score.",
        message: "No new recommendation was added because the patient already has the best available slot for their current severity score.",
      };
    case "no_existing_appointment":
      return {
        suggested_action: "routine" as SuggestedAction,
        reasoning:
          "Clinician requested an appointment recommendation after reviewing the uploaded note, but no safe return slot could be found in the current calendar horizon.",
        message: "No return slot could be recommended automatically. Please book the patient manually from the calendar.",
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
    const copy = recommendationCopy(recommendation.status, Boolean(recommendation.appointment_id));

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
