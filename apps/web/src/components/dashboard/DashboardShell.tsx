"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { createSupabaseBrowserClient } from "@/lib/client/supabase";

type DashboardShellProps = {
  children: ReactNode;
};

type ClinicianSummary = {
  full_name: string | null;
  email: string | null;
};

const navigation = [
  { href: "/triage", label: "Triage Feed" },
  { href: "/schedule", label: "Schedule" },
];

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [clinicianName, setClinicianName] = useState("Loading...");
  const [clinicianEmail, setClinicianEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadClinician(session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) {
      if (!session) {
        if (!isMounted) return;
        setClinicianName("Not signed in");
        setClinicianEmail(null);
        router.replace("/login");
        return;
      }

      const metadata = session.user.user_metadata;
      const metadataName =
        typeof metadata?.full_name === "string"
          ? metadata.full_name
          : [metadata?.first_name, metadata?.last_name]
              .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
              .join(" ")
              .trim();

      const fallbackName = metadataName || session.user.email || "Signed in clinician";

      const { data } = await supabase
        .from("clinicians")
        .select("full_name, email")
        .eq("id", session.user.id)
        .maybeSingle();
      const clinician = data as ClinicianSummary | null;

      if (!isMounted) return;

      setClinicianName(clinician?.full_name || fallbackName);
      setClinicianEmail(clinician?.email || session.user.email || null);
    }

    supabase.auth.getSession().then(({ data }) => {
      void loadClinician(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadClinician(session);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        height: "100vh",
      overflow: "hidden",
      }}
    >
      <aside
        style={{
          background: "#0f172a",
          color: "#e2e8f0",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#93c5fd",
            }}
          >
            TriageAI
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: 20 }}>Clinician Dashboard</h1>
        </div>

        <nav style={{ display: "grid", gap: 8 }}>
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  color: isActive ? "#0f172a" : "#e2e8f0",
                  background: isActive ? "#bfdbfe" : "transparent",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            marginTop: "auto",
            border: "1px solid #334155",
            borderRadius: 12,
            padding: 12,
            fontSize: 14,
          }}
        >
          <div style={{ fontWeight: 600 }}>Signed in</div>
          <div style={{ opacity: 0.95 }}>{clinicianName}</div>
          {clinicianEmail && clinicianEmail !== clinicianName ? (
            <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>{clinicianEmail}</div>
          ) : null}
        </div>
      </aside>

      <div style={{ display: "grid", gridTemplateRows: "72px 1fr", height: "100%", overflow: "hidden" }}>
        <header
          style={{
            borderBottom: "1px solid #dbe2ee",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <strong>Clinical Review Workspace</strong>
          <Link href="/login" style={{ fontSize: 14, color: "#0f172a" }}>
            Sign out
          </Link>
        </header>

        <main style={{ padding: 24, overflow: "hidden", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>{children}</main>
      </div>
    </div>
  );
}
