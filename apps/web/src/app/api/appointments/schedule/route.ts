import { requireBusinessContext } from "@/lib/server/businessAuth";
import { jsonErrorResponse } from "@/lib/server/http";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import type { WeeklyScheduleItem, Department } from "@triageai/shared";

function getRelatedPatient(
  patientValue:
    | Array<{
        full_name: string;
        business_id: string | null;
        risk_score: number;
        risk_tier: WeeklyScheduleItem["risk_tier"];
      }>
    | {
        full_name: string;
        business_id: string | null;
        risk_score: number;
        risk_tier: WeeklyScheduleItem["risk_tier"];
      }
    | null,
) {
  if (Array.isArray(patientValue)) {
    return patientValue[0] ?? null;
  }

  return patientValue;
}

export async function GET(req: Request) {
  try {
    const context = await requireBusinessContext(req);
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department") as Department | null;
    const weekStart = searchParams.get("week_start");

    if (!department) {
      return Response.json({ error: "department query param required" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const start = weekStart ? new Date(weekStart) : (() => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay() + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    })();
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id,
        patient_id,
        department,
        scheduled_at,
        original_scheduled_at,
        status,
        ai_suggested_date,
        suggestion_status,
        is_on_the_day,
        patients (
          full_name,
          business_id,
          risk_score,
          risk_tier
        )
      `)
      .eq("department", department)
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const startMs = start.getTime();
    const endMs = end.getTime();
    const inRequestedWeek = (value: string | null) => {
      if (!value) {
        return false;
      }

      const time = new Date(value).getTime();
      return time >= startMs && time < endMs;
    };

    const schedule: WeeklyScheduleItem[] = (appointments ?? [])
      .filter((appointment) => {
        const patient = getRelatedPatient(appointment.patients as unknown as Parameters<typeof getRelatedPatient>[0]);

        if (!patient || patient.business_id !== context.businessId) {
          return false;
        }

        return inRequestedWeek(appointment.scheduled_at) || inRequestedWeek(appointment.ai_suggested_date);
      })
      .map((appointment) => {
        const patient = getRelatedPatient(appointment.patients as unknown as Parameters<typeof getRelatedPatient>[0]);

        return {
          appointment_id: appointment.id,
          patient_id: appointment.patient_id,
          patient_name: patient?.full_name ?? "Unknown",
          department: appointment.department as Department,
          risk_score: patient?.risk_score ?? 0,
          risk_tier: patient?.risk_tier ?? "low",
          scheduled_at: appointment.scheduled_at,
          original_scheduled_at: appointment.original_scheduled_at,
          status: appointment.status as WeeklyScheduleItem["status"],
          ai_suggested_date: appointment.ai_suggested_date ?? null,
          suggestion_status: (appointment.suggestion_status ?? null) as WeeklyScheduleItem["suggestion_status"],
          is_on_the_day: appointment.is_on_the_day,
        };
      });

    return Response.json({
      schedule,
      department,
      week_start: start.toISOString(),
      week_end: end.toISOString(),
    });
  } catch (error) {
    return jsonErrorResponse(error, "Unable to load the schedule.");
  }
}
