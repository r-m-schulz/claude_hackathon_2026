import { notFound } from "next/navigation";

import { getMockPatientDetail } from "../../../../lib/client/mockDashboard";

type PatientPageProps = {
  params: Promise<{
    patientId: string;
  }>;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function PatientPage({ params }: PatientPageProps) {
  const { patientId } = await params;
  const patient = getMockPatientDetail(patientId);

  if (!patient) {
    notFound();
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Patient detail
          </p>
          <h1 style={{ margin: "6px 0 0" }}>{patient.full_name}</h1>
        </div>

        <div
          style={{
            border: "1px solid #dbe2ee",
            background: "#ffffff",
            borderRadius: 10,
            padding: "8px 12px",
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {patient.risk_tier} ({patient.risk_score})
        </div>
      </header>

      <article style={{ border: "1px solid #dbe2ee", borderRadius: 14, background: "#ffffff", padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Next appointment context</h2>
        {patient.next_appointment ? (
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Scheduled: {formatDateTime(patient.next_appointment.scheduled_at)} | Original: {" "}
            {formatDateTime(patient.next_appointment.original_scheduled_at)} | Status: {" "}
            {patient.next_appointment.suggestion_status ?? "none"} | On-the-day: {" "}
            {patient.next_appointment.is_on_the_day ? "yes" : "no"}
          </p>
        ) : (
          <p style={{ margin: 0 }}>No upcoming appointment.</p>
        )}
      </article>

      <article style={{ border: "1px solid #dbe2ee", borderRadius: 14, background: "#ffffff", padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>AI review actions</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #16a34a" }}>
            Approve suggestion
          </button>
          <button type="button" style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #b45309" }}>
            Modify date
          </button>
          <button type="button" style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #b91c1c" }}>
            Reject with reason
          </button>
        </div>
      </article>

      <article style={{ border: "1px solid #dbe2ee", borderRadius: 14, background: "#ffffff", padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Triage timeline</h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
          {patient.triage_events.map((event) => (
            <li key={event.event_id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>{formatDateTime(event.created_at)}</div>
              <strong style={{ textTransform: "capitalize" }}>{event.trigger_type}</strong>
              <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5 }}>{event.ai_reasoning}</div>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                Score: {event.previous_score ?? "n/a"} to {event.new_score} | Suggested action: {" "}
                {event.suggested_action.replaceAll("_", " ")}
              </div>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}