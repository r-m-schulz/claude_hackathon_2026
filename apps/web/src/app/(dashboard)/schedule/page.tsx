"use client";

import { useEffect, useState } from "react";
import type { BusinessWorkspaceSummary } from "@triageai/shared";

import WeeklySchedule from "@/components/calendar/WeeklySchedule";
import { apiFetch } from "@/lib/client/api";
import { mockScheduleItems } from "@/lib/client/mockDashboard";

export default function SchedulePage() {
  const [workspace, setWorkspace] = useState<BusinessWorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const nextWorkspace = await apiFetch<BusinessWorkspaceSummary>("/api/business/workspace");
        setWorkspace(nextWorkspace);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load workflow view.");
      } finally {
        setLoading(false);
      }
    }

    void loadWorkspace();
  }, []);

  if (loading) {
    return <p style={{ margin: 0, color: "#64748b" }}>Loading workflow view...</p>;
  }

  if (error || !workspace) {
    return (
      <section
        style={{
          borderRadius: 18,
          border: "1px solid #fecaca",
          background: "#fef2f2",
          padding: 18,
          color: "#991b1b",
        }}
      >
        {error ?? "Unable to load workflow view."}
      </section>
    );
  }

  const hrEmployees = workspace.employees.filter((employee) => employee.role === "hr");
  const practitioners = workspace.employees.filter((employee) => employee.role === "practitioner");

  return (
    <section
      style={{
        display: "grid",
        gap: 20,
        gridTemplateRows: "auto 1fr",
        height: "calc(100vh - 32px)",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          borderRadius: 24,
          border: "1px solid #dbe2ee",
          background: "#ffffff",
          padding: 24,
          display: "grid",
          gap: 12,
        }}
      >
        <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#64748b" }}>
          Workflow
        </p>
        <h1 style={{ margin: 0, fontSize: 34 }}>HR and practitioner workflow</h1>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
          HR and reception handle scheduling, intake, and admin workflow. Practitioners focus on clinical review and
          patient decisions.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(320px, 0.7fr)",
          alignItems: "start",
          minHeight: 0,
        }}
      >
        <article
          style={{
            borderRadius: 24,
            border: "1px solid #dbe2ee",
            background: "#ffffff",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Calendar</h2>
            <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.6 }}>
              Weekly scheduling view for reception and HR workflow. This is currently using the existing demo calendar
              feed while the business-specific appointment layer catches up.
            </p>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <WeeklySchedule items={mockScheduleItems} />
          </div>
        </article>

        <div
          style={{
            display: "grid",
            gap: 20,
            minHeight: 0,
            overflowY: "auto",
            alignContent: "start",
          }}
        >
          <article
            style={{
              borderRadius: 24,
              border: "1px solid #dbe2ee",
              background: "#ffffff",
              padding: 24,
              display: "grid",
              gap: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 24 }}>HR / reception team</h2>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
              Staff in this role keep the business workflow moving, manage intake, and support calendar changes.
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              {hrEmployees.length === 0 ? (
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px dashed #cbd5e1",
                    background: "#f8fafc",
                    padding: 18,
                    color: "#475569",
                  }}
                >
                  No HR employees yet. Add reception or workflow staff from the Company page.
                </div>
              ) : (
                hrEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    style={{
                      borderRadius: 18,
                      border: "1px solid #e2e8f0",
                      padding: 16,
                      background: "#f8fafc",
                    }}
                  >
                    <strong>{employee.full_name}</strong>
                    <div style={{ marginTop: 6, fontSize: 14, color: "#475569" }}>{employee.email}</div>
                    <div style={{ marginTop: 4, fontSize: 14, color: "#475569" }}>
                      {employee.job_title ?? "Workflow and calendar support"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article
            style={{
              borderRadius: 24,
              border: "1px solid #dbe2ee",
              background: "#ffffff",
              padding: 24,
              display: "grid",
              gap: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 24 }}>Practitioners</h2>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
              Practitioners own treatment decisions, patient review, and clinical follow-up planning.
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              {practitioners.map((employee) => (
                <div
                  key={employee.id}
                  style={{
                    borderRadius: 18,
                    border: "1px solid #dcfce7",
                    padding: 16,
                    background: "#f0fdf4",
                  }}
                >
                  <strong>{employee.full_name}</strong>
                  <div style={{ marginTop: 6, fontSize: 14, color: "#475569" }}>{employee.email}</div>
                  <div style={{ marginTop: 4, fontSize: 14, color: "#475569" }}>
                    {employee.department?.replaceAll("_", " ") ?? "Clinical team"}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article
            style={{
              borderRadius: 24,
              border: "1px solid #dbe2ee",
              background: "#ffffff",
              padding: 24,
              display: "grid",
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 24 }}>Workflow focus for this business</h2>
            <div style={{ lineHeight: 1.8, color: "#334155" }}>
              {workspace.business.workflow_summary ||
                workspace.business.onboarding_answers.workflow_needs ||
                "No workflow summary has been added yet."}
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}
