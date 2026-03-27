"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { BusinessWorkspaceSummary } from "@triageai/shared";

import { apiFetch } from "@/lib/client/api";
import { createSupabaseBrowserClient } from "@/lib/client/supabase";

type DashboardShellProps = {
  children: ReactNode;
};

const navigation = [
  { href: "/company", label: "Company" },
  { href: "/patients", label: "Patients" },
  { href: "/schedule", label: "Workflow" },
  { href: "/settings", label: "Settings" },
];

function formatRole(role: string) {
  return role === "hr" ? "HR / Reception" : "Practitioner";
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [workspace, setWorkspace] = useState<BusinessWorkspaceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        if (isMounted) {
          router.replace("/login");
        }
        return;
      }

      try {
        const nextWorkspace = await apiFetch<BusinessWorkspaceSummary>("/api/business/workspace");

        if (!isMounted) {
          return;
        }

        setWorkspace(nextWorkspace);
        setError(null);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load workspace.");
      }
    }

    void loadWorkspace();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
        return;
      }

      void loadWorkspace();
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const businessName = workspace?.business.name ?? "Business workspace";
  const employeeName = workspace?.current_employee.full_name ?? "Loading...";
  const employeeRole = workspace ? formatRole(workspace.current_employee.role) : "Workspace role";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "300px minmax(0, 1fr)",
        background: "#eef2f7",
      }}
    >
      <aside
        style={{
          padding: 24,
          background: "linear-gradient(180deg, #0f172a 0%, #102a43 58%, #115e59 100%)",
          color: "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            borderRadius: 24,
            border: "1px solid rgba(148,163,184,0.18)",
            padding: 20,
            background: workspace?.business.header_image_url
              ? `linear-gradient(rgba(15, 23, 42, 0.52), rgba(15, 23, 42, 0.86)), url(${workspace.business.header_image_url}) center/cover`
              : "rgba(15,23,42,0.2)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#93c5fd",
            }}
          >
            TriageAI
          </p>
          <h1 style={{ margin: "12px 0 0", fontSize: 28, lineHeight: 1.1 }}>{businessName}</h1>
          <p style={{ margin: "12px 0 0", lineHeight: 1.6, color: "rgba(226,232,240,0.86)" }}>
            {workspace?.business.hero_headline ?? "Business-first workspace for doctors, practitioners, and HR teams."}
          </p>
        </div>

        <nav style={{ display: "grid", gap: 8 }}>
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  borderRadius: 14,
                  padding: "12px 14px",
                  textDecoration: "none",
                  fontWeight: 600,
                  color: isActive ? "#0f172a" : "#e2e8f0",
                  background: isActive ? "#d1fae5" : "rgba(15, 23, 42, 0.16)",
                  border: isActive ? "1px solid rgba(209,250,229,0.95)" : "1px solid rgba(148,163,184,0.12)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            borderRadius: 20,
            border: "1px solid rgba(148,163,184,0.18)",
            padding: 18,
            background: "rgba(15,23,42,0.16)",
            display: "grid",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>{employeeName}</div>
            <div style={{ fontSize: 13, color: "rgba(226,232,240,0.74)" }}>{employeeRole}</div>
          </div>
          <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
            <div>{workspace ? `${workspace.employees.length} employees` : "Loading employees"}</div>
            <div>{workspace ? `${workspace.patient_count} patients` : "Loading patients"}</div>
          </div>
          <button
            type="button"
            onClick={signOut}
            style={{
              marginTop: 6,
              border: "1px solid rgba(148,163,184,0.22)",
              background: "transparent",
              color: "#f8fafc",
              borderRadius: 12,
              padding: "10px 12px",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div style={{ display: "grid", gridTemplateRows: "88px minmax(0, 1fr)" }}>
        <header
          style={{
            padding: "22px 28px",
            borderBottom: "1px solid #dbe2ee",
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#64748b" }}>
              Business Workspace
            </div>
            <strong style={{ fontSize: 20 }}>{businessName}</strong>
          </div>
          <div style={{ fontSize: 14, color: "#475569" }}>
            {workspace?.business.support_email ?? workspace?.current_employee.email ?? "Loading contact"}
          </div>
        </header>

        <main style={{ padding: 28, overflowY: "auto" }}>
          {error ? (
            <section
              style={{
                borderRadius: 18,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                padding: 18,
                color: "#991b1b",
              }}
            >
              {error}
            </section>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
