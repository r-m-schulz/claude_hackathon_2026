import TriageList from "../../../components/triage/TriageList";
import { mockTriageItems } from "../../../lib/client/mockDashboard";

export default function TriagePage() {
  const triageItems = [...mockTriageItems].sort((a, b) => b.risk_score - a.risk_score);

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Dashboard
        </p>
        <h1 style={{ margin: "6px 0 0" }}>Ranked triage feed</h1>
      </header>

      <TriageList items={triageItems} />
    </section>
  );
}