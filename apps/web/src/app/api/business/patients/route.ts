import { DEPARTMENTS, type Department } from "@triageai/shared";

import { createManagedAuthUser, deleteManagedAuthUser, requireBusinessContext } from "@/lib/server/businessAuth";
import { jsonErrorResponse, HttpError } from "@/lib/server/http";
import { listBusinessPatients } from "@/lib/server/businessWorkspace";
import { createSupabaseServerClient } from "@/lib/server/supabase";

type CreatePatientBody = {
  full_name?: string;
  email?: string;
  phone?: string;
  dob?: string;
  department?: Department;
  assigned_practitioner_id?: string | null;
  portal_email?: string;
  portal_password?: string;
};

function isDepartment(value: string): value is Department {
  return DEPARTMENTS.includes(value as Department);
}

const WORK_START_HOUR = 9;
const WORK_END_HOUR = 17;
const DEFAULT_SLOT_HOUR = 10;
const APPOINTMENT_BREAK_MS = 60 * 60 * 1000;
const LOOKAHEAD_DAYS = 14;
const WORK_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekStart(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - diff);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function setHour(date: Date, hour: number, minute = 0) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function findNextSlot(
  appointments: Array<{ scheduled_at: string }>,
  baseDate: Date,
): Date {
  const weekStart = getWeekStart(baseDate);
  const today = startOfDay(baseDate);

  for (let offset = 0; offset < LOOKAHEAD_DAYS; offset += 1) {
    const day = addDays(weekStart, offset);
    if (day < today) continue;
    if (!WORK_DAYS.includes(day.getDay())) continue;

    const dayAppointments = appointments
      .map((appt) => new Date(appt.scheduled_at))
      .filter((apptDate) => isSameDay(apptDate, day))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dayAppointments.length === 0) {
      return setHour(day, DEFAULT_SLOT_HOUR);
    }

    for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour += 1) {
      const candidate = setHour(day, hour);
      const hasGap = dayAppointments.every(
        (existing) => Math.abs(existing.getTime() - candidate.getTime()) >= APPOINTMENT_BREAK_MS,
      );

      if (hasGap) {
        return candidate;
      }
    }
  }

  // Fallback: first next workday after the lookahead window
  let fallback = addDays(today, 1);
  while (!WORK_DAYS.includes(fallback.getDay())) {
    fallback = addDays(fallback, 1);
  }
  return setHour(fallback, DEFAULT_SLOT_HOUR);
}

export async function GET(req: Request) {
  try {
    const context = await requireBusinessContext(req);
    const patients = await listBusinessPatients(context.businessId);
    return Response.json({ patients });
  } catch (error) {
    return jsonErrorResponse(error, "Unable to load patients.");
  }
}

export async function POST(req: Request) {
  let authUserId: string | null = null;
  let createdPatientId: string | null = null;
  let supabase = null as ReturnType<typeof createSupabaseServerClient> | null;

  try {
    supabase = createSupabaseServerClient();
    const context = await requireBusinessContext(req);
    const body = (await req.json()) as CreatePatientBody;
    const fullName = body.full_name?.trim();
    const contactEmail = body.email?.trim() || null;
    const phone = body.phone?.trim() || null;
    const dob = body.dob?.trim();
    const departmentValue = body.department?.trim?.() ?? body.department;
    const assignedPractitionerId = body.assigned_practitioner_id?.trim() || null;
    const portalEmail = body.portal_email?.trim() || null;
    const portalPassword = body.portal_password?.trim() || null;

    if (!fullName) {
      throw new HttpError(400, "Patient name is required.");
    }

    if (!dob) {
      throw new HttpError(400, "Date of birth is required.");
    }

    if (!departmentValue || !isDepartment(departmentValue)) {
      throw new HttpError(400, "Patient department is invalid.");
    }

    if ((portalEmail && !portalPassword) || (!portalEmail && portalPassword)) {
      throw new HttpError(400, "Provide both portal email and password to pair an account.");
    }

    if (assignedPractitionerId) {
      const { data: practitioner, error: practitionerError } = await supabase
        .from("business_employees")
        .select("id")
        .eq("business_id", context.businessId)
        .eq("linked_clinician_id", assignedPractitionerId)
        .eq("role", "practitioner")
        .maybeSingle();

      if (practitionerError) {
        throw new HttpError(500, practitionerError.message);
      }

      if (!practitioner) {
        throw new HttpError(400, "Assigned practitioner does not belong to this business.");
      }
    }

    if (portalEmail && portalPassword) {
      const authUser = await createManagedAuthUser({
        email: portalEmail,
        password: portalPassword,
        metadata: {
          full_name: fullName,
          workspace_role: "patient",
        },
      });

      authUserId = authUser.id;
    }

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .insert({
        business_id: context.businessId,
        auth_user_id: authUserId,
        full_name: fullName,
        email: contactEmail ?? portalEmail,
        phone,
        dob,
        department: departmentValue,
        gp_id: assignedPractitionerId,
        paired_at: authUserId ? new Date().toISOString() : null,
        created_by_employee_id: context.employee.id,
      })
      .select("id, department")
      .single();

    if (patientError || !patient) {
      throw new HttpError(400, patientError?.message ?? "Unable to create patient.");
    }

    createdPatientId = patient.id as string;

    const weekStart = getWeekStart(new Date());
    const { data: existingAppointments, error: existingAppointmentsError } = await supabase
      .from("appointments")
      .select("id, scheduled_at, department, patients!inner(business_id)")
      .eq("department", departmentValue)
      .eq("patients.business_id", context.businessId)
      .gte("scheduled_at", weekStart.toISOString())
      .lt("scheduled_at", addDays(weekStart, LOOKAHEAD_DAYS).toISOString())
      .order("scheduled_at", { ascending: true });

    if (existingAppointmentsError) {
      throw new HttpError(500, existingAppointmentsError.message);
    }

    const nextSlot = findNextSlot(existingAppointments ?? [], new Date());
    const scheduledAt = nextSlot.toISOString();

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        patient_id: patient.id,
        clinician_id: assignedPractitionerId,
        department: departmentValue,
        scheduled_at: scheduledAt,
        original_scheduled_at: scheduledAt,
        status: "scheduled",
        is_on_the_day: false,
      })
      .select("id, scheduled_at")
      .single();

    if (appointmentError || !appointment) {
      throw new HttpError(500, appointmentError?.message ?? "Unable to schedule initial appointment.");
    }

    return Response.json({
      success: true,
      appointment_id: appointment.id,
      scheduled_at: appointment.scheduled_at,
    });
  } catch (error) {
    if (authUserId) {
      await deleteManagedAuthUser(authUserId).catch(() => null);
    }

    if (createdPatientId && supabase) {
      await supabase
        .from("patients")
        .delete()
        .eq("id", createdPatientId)
        .catch(() => null);
    }

    return jsonErrorResponse(error, "Unable to create patient.");
  }
}
