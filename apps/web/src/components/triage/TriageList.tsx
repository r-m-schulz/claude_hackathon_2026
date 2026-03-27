import type { TriageListItem } from "@triageai/shared";
import Link from "next/link";

type TriageListProps = {
  items: TriageListItem[];
};

function riskColor(riskTier: TriageListItem["risk_tier"]) {
  if (riskTier === "critical") {
    return "#b91c1c";
  }

  if (riskTier === "high") {
    return "#c2410c";
  }

  if (riskTier === "medium") {
    return "#a16207";
  }

  return "#166534";
}

export default function TriageList({ items }: TriageListProps) {
  if (items.length === 0) {
    return (
      <section
        style={{
          border: "1px solid #dbe2ee",
          borderRadius: 16,
          background: "#ffffff",
          padding: 24,
        }}
      >
        No triage events available.
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: 12 }}>
      {items.map((item) => (
        <article
          key={item.patient_id}
          style={{
            border: "1px solid #dbe2ee",
            borderRadius: 14,
            background: "#ffffff",
            padding: 16,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>{item.patient_name}</h2>
              <p style={{ margin: "4px 0 0", color: "#4b5563", textTransform: "capitalize" }}>
                {item.department.replaceAll("_", " ")}
              </p>
            </div>

            <div
              style={{
                alignSelf: "start",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 999,
                padding: "4px 10px",
                fontWeight: 600,
                color: riskColor(item.risk_tier),
                textTransform: "uppercase",
                fontSize: 12,
                letterSpacing: "0.06em",
              }}
            >
              {item.risk_tier} ({item.risk_score})
            </div>
          </div>

          <p style={{ margin: 0, lineHeight: 1.4, color: "#1e293b" }}>
            {item.ai_reasoning ?? "No AI reasoning available yet."}
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 14, color: "#475569" }}>
              Trigger: <strong>{item.latest_trigger_type}</strong> | Suggested action:{" "}
              <strong>{item.suggested_action.replaceAll("_", " ")}</strong> | Status:{" "}
              <strong>{item.suggestion_status ?? "unknown"}</strong>
            </div>

            <Link
              href={`/patients/${item.patient_id}`}
              style={{
                background: "#0f172a",
                color: "#ffffff",
                borderRadius: 10,
                padding: "8px 12px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Open patient
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}