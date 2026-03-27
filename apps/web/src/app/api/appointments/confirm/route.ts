import type { ConfirmAppointmentInput, ConfirmAppointmentResponse } from "@triageai/shared";

import { requireBusinessContext } from "@/lib/server/businessAuth";
import { jsonErrorResponse, HttpError } from "@/lib/server/http";
import { createSupabaseServerClient } from "@/lib/server/supabase";

export async function POST(req: Request) {
  try {
    const context = await requireBusinessContext(req);
    const body = (await req.json()) as ConfirmAppointmentInput;
    const patientId = body.patient_id?.trim();
    const appointmentId = body.appointment_id?.trim() || null;
    const justification = body.justification?.trim() || null;
    const scheduledAt = new Date(body.scheduled_at);

    if (!patientId) {
      throw new HttpError(400, "Patient id is required.");
    }

    if (Number.isNaN(scheduledAt.getTime())) {
      throw new HttpError(400, "A valid appointment time is required.");
    }

    if (scheduledAt.getTime() <= Date.now()) {
      throw new HttpError(400, "Appointment time must be in the future.");
    }

    const supabase = createSupabaseServerClient();
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, full_name, business_id, department, gp_id")
      .eq("business_id", context.businessId)
      .eq("id", patientId)
      .maybeSingle();

    if (patientError) {
      throw new HttpError(500, patientError.message);
    }

    if (!patient) {
      throw new HttpError(404, "Patient not found.");
    }

    const clinicianId = patient.gp_id ?? context.employee.linked_clinician_id ?? null;
    const noteText = justification ? `AI scheduling justification: ${justification}` : null;
    const slotIso = scheduledAt.toISOString();

    if (appointmentId) {
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .select("id, patient_id, scheduled_at, clinician_id")
        .eq("id", appointmentId)
        .eq("patient_id", patientId)
        .maybeSingle();

      if (appointmentError) {
        throw new HttpError(500, appointmentError.message);
      }

      if (!appointment) {
        throw new HttpError(404, "Appointment not found.");
      }

      const updatePayload = {
        clinician_id: appointment.clinician_id ?? clinicianId,
        scheduled_at: slotIso,
        status:
          new Date(appointment.scheduled_at).getTime() === scheduledAt.getTime()
            ? "scheduled"
            : "rescheduled",
        ai_suggested_date: null,
        suggestion_status: null,
        is_on_the_day: false,
        ...(noteText ? { notes: noteText } : {}),
      };

      const { error: updateError } = await supabase
        .from("appointments")
        .update(updatePayload)
        .eq("id", appointmentId);

      if (updateError) {
        throw new HttpError(400, updateError.message);
      }

      const response: ConfirmAppointmentResponse = {
        success: true,
        action: "updated",
        appointment_id: appointmentId,
        patient_id: patientId,
        department: patient.department,
        scheduled_at: slotIso,
      };

      return Response.json(response);
    }

    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        patient_id: patientId,
        clinician_id: clinicianId,
        department: patient.department,
        scheduled_at: slotIso,
        original_scheduled_at: slotIso,
        status: "scheduled",
        suggestion_status: null,
        is_on_the_day: false,
        notes: noteText,
      })
      .select("id")
      .single();

    if (insertError || !appointment) {
      throw new HttpError(400, insertError?.message ?? "Unable to create appointment.");
    }

    const response: ConfirmAppointmentResponse = {
      success: true,
      action: "created",
      appointment_id: appointment.id as string,
      patient_id: patientId,
      department: patient.department,
      scheduled_at: slotIso,
    };

    return Response.json(response);
  } catch (error) {
    return jsonErrorResponse(error, "Unable to confirm the appointment.");
  }
}
