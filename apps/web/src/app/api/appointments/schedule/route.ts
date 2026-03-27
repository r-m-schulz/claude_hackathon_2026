import { createSupabaseServerClient } from "@/lib/server/supabase";
import type { WeeklyScheduleItem, Department } from "@triageai/shared";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department") as Department | null;
  const weekStart = searchParams.get("week_start"); // ISO date string

  if (!department) {
    return Response.json({ error: "department query param required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const start = weekStart ? new Date(weekStart) : (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
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
      patients (full_name)
    `)
    .eq("department", department)
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString())
    .order("scheduled_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const schedule: WeeklyScheduleItem[] = (appointments ?? []).map((a) => ({
    appointment_id: a.id,
    patient_id: a.patient_id,
    patient_name: (a.patients as unknown as { full_name: string } | null)?.full_name ?? "Unknown",
    department: a.department as Department,
    scheduled_at: a.scheduled_at,
    original_scheduled_at: a.original_scheduled_at,
    status: a.status as WeeklyScheduleItem["status"],
    ai_suggested_date: a.ai_suggested_date ?? null,
    suggestion_status: (a.suggestion_status ?? null) as WeeklyScheduleItem["suggestion_status"],
    is_on_the_day: a.is_on_the_day,
  }));

  return Response.json({ schedule, week_start: start.toISOString() });
}
