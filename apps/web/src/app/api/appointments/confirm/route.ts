import type { ConfirmAppointmentInput, ConfirmAppointmentResponse } from "@triageai/shared";

import { requireBusinessContext } from "@/lib/server/businessAuth";
import { jsonErrorResponse, HttpError } from "@/lib/server/http";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/scheduling";
import { createSupabaseServerClient } from "@/lib/server/supabase";

function getRelatedPatientName(
  patientValue:
    | Array<{ full_name: string; business_id: string | null }>
    | { full_name: string; business_id: string | null }
    | null,
) {
  if (Array.isArray(patientValue)) {
    return patientValue[0]?.full_name ?? "another patient";
  }

  return patientValue?.full_name ?? "another patient";
}

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
    const conflictQuery = supabase
      .from("appointments")
      .select(`
        id,
        patient_id,
        patients!inner (
          full_name,
          business_id
        )
      `)
      .eq("department", patient.department)
      .eq("scheduled_at", slotIso)
      .in("status", [...ACTIVE_APPOINTMENT_STATUSES])
      .eq("patients.business_id", context.businessId);

    if (appointmentId) {
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .select("id, patient_id, scheduled_at, clinician_id, suggestion_status, is_on_the_day")
        .eq("id", appointmentId)
        .eq("patient_id", patientId)
        .maybeSingle();

      if (appointmentError) {
        throw new HttpError(500, appointmentError.message);
      }

      if (!appointment) {
        throw new HttpError(404, "Appointment not found.");
      }

      const { data: conflictingAppointments, error: conflictError } = await conflictQuery
        .neq("id", appointmentId);

      if (conflictError) {
        throw new HttpError(500, conflictError.message);
      }

      if ((conflictingAppointments ?? []).length > 0) {
        throw new HttpError(
          409,
          `${new Date(slotIso).toLocaleString("en-IE", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
          })} is already booked for ${getRelatedPatientName(conflictingAppointments?.[0]?.patients as Parameters<typeof getRelatedPatientName>[0])}.`,
        );
      }

      const isSameSlot = new Date(appointment.scheduled_at).getTime() === scheduledAt.getTime();
      const preserveOnTheDayFlag = isSameSlot && appointment.is_on_the_day;
      const updatePayload = {
        clinician_id: appointment.clinician_id ?? clinicianId,
        scheduled_at: slotIso,
        status: isSameSlot ? "scheduled" : "rescheduled",
        ai_suggested_date: null,
        suggestion_status: preserveOnTheDayFlag ? "approved" : null,
        is_on_the_day: preserveOnTheDayFlag,
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

    const { data: conflictingAppointments, error: conflictError } = await conflictQuery;

    if (conflictError) {
      throw new HttpError(500, conflictError.message);
    }

    if ((conflictingAppointments ?? []).length > 0) {
      throw new HttpError(
        409,
        `${new Date(slotIso).toLocaleString("en-IE", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })} is already booked for ${getRelatedPatientName(conflictingAppointments?.[0]?.patients as Parameters<typeof getRelatedPatientName>[0])}.`,
      );
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
