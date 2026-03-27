"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { BusinessWorkspaceSummary } from "@triageai/shared";

import { LogoIcon } from "@/components/logo";
import { apiFetch } from "@/lib/client/api";
import { createSupabaseBrowserClient, getSupabaseBrowserSession } from "@/lib/client/supabase";

type DashboardShellProps = {
  children: ReactNode;
};

const navigation = [
  { href: "/company",  label: "Company",  icon: "⊞" },
  { href: "/patients", label: "Patients", icon: "⊕" },
  { href: "/schedule", label: "Workflow",  icon: "⊟" },
  { href: "/settings", label: "Settings", icon: "⊙" },
];

function formatRole(role: string) {
  return role === "hr" ? "HR / Reception" : "Practitioner";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
      const session = await getSupabaseBrowserSession();
      if (!session) {
        if (isMounted) router.replace("/login");
        return;
      }

      try {
        const nextWorkspace = await apiFetch<BusinessWorkspaceSummary>("/api/business/workspace");
        if (!isMounted) return;
        setWorkspace(nextWorkspace);
        setError(null);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load workspace.");
      }
    }

    void loadWorkspace();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { router.replace("/login"); return; }
      void loadWorkspace();
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function signOut() {
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login");
  }

  const businessName = workspace?.business.name ?? "Loading…";
  const employeeName = workspace?.current_employee.full_name ?? "—";
  const employeeRole = workspace ? formatRole(workspace.current_employee.role) : "—";
  const dept = workspace?.business.primary_department?.replaceAll("_", " ") ?? "General";

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "240px 1fr", background: "var(--ds-page)" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        background: "var(--ds-sidebar)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
      }}>
        {/* Brand bar */}
        <div style={{
          padding: "16px 16px 14px",
          borderBottom: "1px solid var(--ds-sidebar-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <LogoIcon />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0", letterSpacing: "-0.01em" }}>TriageAI</div>
            <div style={{ fontSize: 10, color: "rgba(148,163,184,0.7)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 1 }}>Clinical Platform</div>
          </div>
        </div>

        {/* Workspace info */}
        <div style={{
          margin: "12px 12px 0",
          padding: "10px 12px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--ds-sidebar-border)",
          borderRadius: 6,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(148,163,184,0.6)", marginBottom: 4 }}>
            Workspace
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#CBD5E1", lineHeight: 1.35 }}>{businessName}</div>
          <div style={{ fontSize: 11, color: "rgba(148,163,184,0.55)", marginTop: 3 }}>{dept}</div>
        </div>

        {/* Nav links */}
        <nav style={{ marginTop: 16, flex: 1 }}>
          {navigation.map(({ href, label }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`db-nav-link${isActive ? " db-nav-link-active" : ""}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Quick stats */}
        {workspace && (
          <div style={{
            margin: "0 12px",
            padding: "10px 12px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--ds-sidebar-border)",
            borderRadius: 6,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}>
            {[
              { label: "Employees", value: workspace.employees.length },
              { label: "Patients",  value: workspace.patient_count },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(148,163,184,0.5)" }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#94A3B8", lineHeight: 1.2, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* User */}
        <div style={{
          padding: "14px 12px",
          borderTop: "1px solid var(--ds-sidebar-border)",
          marginTop: 12,
          display: "grid",
          gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "#1E3A5F",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#60A5FA",
              flexShrink: 0,
            }}>
              {initials(employeeName)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#CBD5E1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{employeeName}</div>
              <div style={{ fontSize: 10, color: "rgba(148,163,184,0.55)", marginTop: 1 }}>{employeeRole}</div>
            </div>
          </div>
          <button type="button" onClick={signOut} className="db-btn db-btn-ghost-sidebar">
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ padding: "20px 24px", overflow: "auto", minHeight: "100vh" }}>
        {error ? (
          <div className="db-alert-error">{error}</div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
