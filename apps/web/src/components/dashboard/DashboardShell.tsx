"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type DashboardShellProps = {
  children: ReactNode;
};

const navigation = [
  { href: "/triage", label: "Triage Feed" },
  { href: "/schedule", label: "Schedule" },
];

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        minHeight: "100vh",
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
          <div style={{ opacity: 0.85 }}>dr.jordan@triageai.demo</div>
        </div>
      </aside>

      <div style={{ display: "grid", gridTemplateRows: "72px 1fr" }}>
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

        <main style={{ padding: 24 }}>{children}</main>
      </div>
    </div>
  );
}