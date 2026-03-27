import Link from "next/link";

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 16,
          border: "1px solid #dbe2ee",
          background: "#ffffff",
          padding: 24,
          display: "grid",
          gap: 16,
        }}
      >
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
            Clinician access
          </p>
          <h1 style={{ margin: "6px 0 0" }}>Sign in to dashboard</h1>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          Email
          <input type="email" placeholder="clinician@hospital.com" style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Password
          <input type="password" placeholder="••••••••" style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }} />
        </label>

        <Link
          href="/triage"
          style={{
            textAlign: "center",
            borderRadius: 10,
            background: "#0f172a",
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 600,
            padding: "10px 12px",
          }}
        >
          Continue (mock login)
        </Link>
      </section>
    </main>
  );
}