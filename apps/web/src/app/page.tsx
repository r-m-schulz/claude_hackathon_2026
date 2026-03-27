import { DEPARTMENTS } from "@triageai/shared";
import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5f6c80" }}>
        TriageAI scaffold
      </p>
      <h1 style={{ marginBottom: 12 }}>Clinician dashboard and API workspace</h1>
      <p style={{ maxWidth: 720, lineHeight: 1.6 }}>
        This app owns the clinician dashboard, the Next.js API routes, and the
        backend orchestration described in the TriageAI spec. Start with the
        dermatology demo path before broadening the scope.
      </p>
      <section style={{ marginTop: 32, padding: 24, background: "#ffffff", borderRadius: 16, border: "1px solid #dde3ee" }}>
        <h2 style={{ marginTop: 0 }}>Supported departments</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {DEPARTMENTS.map((department) => (
            <li key={department}>{department}</li>
          ))}
        </ul>
      </section>

      <section
        style={{
          marginTop: 20,
          padding: 24,
          background: "#ffffff",
          borderRadius: 16,
          border: "1px solid #dde3ee",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link href="/login">Open login page</Link>
        <Link href="/triage">Open dashboard triage feed</Link>
      </section>
    </main>
  );
}
