"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEPARTMENTS } from "@triageai/shared";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/client/supabase";

export default function HomePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setEmail(data.session.user.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      } else {
        setEmail(session.user.email ?? null);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5f6c80" }}>
            TriageAI clinician dashboard
          </p>
          <h1 style={{ marginBottom: 12 }}>Clinician dashboard and API workspace</h1>
        </div>
        <button
          onClick={signOut}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #c7d2e5",
            background: "#ffffff",
            color: "#172033",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
      <p style={{ maxWidth: 720, lineHeight: 1.6 }}>
        Signed in as {email ?? "loading..."}.
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
