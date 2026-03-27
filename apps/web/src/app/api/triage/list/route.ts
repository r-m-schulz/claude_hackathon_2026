import { createSupabaseServerClient } from "@/lib/server/supabase";
import { isActiveAppointmentStatus } from "@/lib/scheduling";
import type { TriageListItem, Department } from "@triageai/shared";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department") as Department | null;

  if (!department) {
    return Response.json({ error: "department query param required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // Fetch patients with their latest triage event and next appointment
  const { data: patients, error } = await supabase
    .from("patients")
    .select(`
      id,
      full_name,
      department,
      risk_score,
      risk_tier,
      triage_events (
        id,
        trigger_type,
        suggested_action,
        ai_reasoning,
        created_at
      ),
      appointments (
        id,
        scheduled_at,
        ai_suggested_date,
        suggestion_status,
        status
      )
    `)
    .eq("department", department)
    .order("risk_score", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const list: TriageListItem[] = (patients ?? []).map((p) => {
    // Latest triage event
    const latestEvent = (p.triage_events as {
      id: string;
      trigger_type: "survey" | "scan" | "note" | "manual";
      suggested_action: string;
      ai_reasoning: string;
      created_at: string;
    }[])
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      ?.[0];

    // Next scheduled appointment
    const nextAppt = (p.appointments as {
      id: string;
      scheduled_at: string;
      ai_suggested_date: string | null;
      suggestion_status: string | null;
      status: string;
    }[])
      ?.filter((a) => isActiveAppointmentStatus(a.status))
      ?.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      ?.[0];

    return {
      patient_id: p.id,
      patient_name: p.full_name,
      department: p.department as Department,
      risk_score: p.risk_score,
      risk_tier: p.risk_tier as TriageListItem["risk_tier"],
      latest_trigger_type: latestEvent?.trigger_type ?? "manual",
      suggested_action: (latestEvent?.suggested_action ?? "no_change") as TriageListItem["suggested_action"],
      suggestion_status: (nextAppt?.suggestion_status ?? null) as TriageListItem["suggestion_status"],
      scheduled_at: nextAppt?.scheduled_at ?? null,
      ai_reasoning: latestEvent?.ai_reasoning ?? null,
    };
  });

  return Response.json({ list });
}
