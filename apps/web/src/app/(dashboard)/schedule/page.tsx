"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  BusinessWorkspaceSummary,
  CriticalScheduleRecommendation,
  Department,
  WeeklyScheduleItem,
} from "@triageai/shared";

import WeeklySchedule from "@/components/calendar/WeeklySchedule";
import { apiFetch } from "@/lib/client/api";
import { loadLatestCriticalRecommendation } from "@/lib/client/recommendationSession";

type ScheduleResponse = {
  schedule: WeeklyScheduleItem[];
  department: Department;
  week_start: string;
  week_end: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function parseInitialWeekStart(value: string | null) {
  if (value) {
    return new Date(value);
  }

  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function SchedulePage() {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [workspace, setWorkspace] = useState<BusinessWorkspaceSummary | null>(null);
  const [schedule, setSchedule] = useState<WeeklyScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => parseInitialWeekStart(searchParams.get("week_start")));
  const [recommendation, setRecommendation] = useState<CriticalScheduleRecommendation | null>(null);

  const focusPatientId = searchParams.get("focus_patient_id");
  const focusAppointmentId = searchParams.get("focus_appointment_id");

  useEffect(() => {
    setWeekStart(parseInitialWeekStart(searchParams.get("week_start")));
  }, [searchKey]);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      try {
        const nextWorkspace = await apiFetch<BusinessWorkspaceSummary>("/api/business/workspace");
        if (!isMounted) {
          return;
        }

        setWorkspace(nextWorkspace);

        const department =
          (searchParams.get("department") as Department | null) ??
          nextWorkspace.current_employee.department ??
          nextWorkspace.business.primary_department ??
          nextWorkspace.recent_patients[0]?.department ??
          null;

        if (!department) {
          throw new Error("No department is configured for this workspace schedule.");
        }

        const scheduleResponse = await apiFetch<ScheduleResponse>(
          `/api/appointments/schedule?department=${encodeURIComponent(department)}&week_start=${encodeURIComponent(weekStart.toISOString())}`,
        );

        if (!isMounted) {
          return;
        }

        setSchedule(scheduleResponse.schedule);

        const latestRecommendation = loadLatestCriticalRecommendation();
        if (
          latestRecommendation &&
          focusPatientId &&
          latestRecommendation.patient_id === focusPatientId
        ) {
          setRecommendation(latestRecommendation);
        } else {
          setRecommendation(null);
        }

        setError(null);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load workflow view.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    void loadPage();

    return () => {
      isMounted = false;
    };
  }, [focusPatientId, searchKey, weekStart]);

  const hrEmployees = useMemo(
    () => workspace?.employees.filter((employee) => employee.role === "hr") ?? [],
    [workspace],
  );
  const practitioners = useMemo(
    () => workspace?.employees.filter((employee) => employee.role === "practitioner") ?? [],
    [workspace],
  );
  const displacedPatients = useMemo(
    () =>
      recommendation?.changes.filter(
        (change) => change.direction === "later" && change.patient_id !== recommendation.patient_id,
      ) ?? [],
    [recommendation],
  );

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

  return (
    <section style={{ display: "grid", gap: 20 }}>
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
        <h1 style={{ margin: 0, fontSize: 34 }}>Critical scheduling workflow</h1>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
          The calendar now reflects live patient priority, suggested reslots, and the latest critical-engine
          recommendation for this workspace.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(320px, 0.7fr)",
          alignItems: "start",
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
            minHeight: 780,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Calendar</h2>
            <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.6 }}>
              Solid cards show current bookings. Dashed cards show the engine’s recommended slot for pending
              reschedules.
            </p>
          </div>

          <div style={{ minHeight: 680 }}>
            <WeeklySchedule
              items={schedule}
              weekStart={weekStart}
              onWeekChange={setWeekStart}
              highlightedAppointmentId={focusAppointmentId}
              highlightedPatientId={focusPatientId}
            />
          </div>
        </article>

        <div style={{ display: "grid", gap: 20 }}>
          {recommendation ? (
            <article
              style={{
                borderRadius: 24,
                border: "1px solid #bfdbfe",
                background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
                padding: 24,
                display: "grid",
                gap: 14,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#1d4ed8",
                  }}
                >
                  Latest Recommendation
                </p>
                <h2 style={{ margin: "8px 0 0", fontSize: 24 }}>{recommendation.patient_name}</h2>
                <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.6 }}>
                  Critical score <strong>{recommendation.critical_score}</strong> from note severity{" "}
                  <strong>{recommendation.severity_score}</strong>. Risk tier:{" "}
                  <strong>{recommendation.risk_tier}</strong>.
                </p>
              </div>

              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid #dbeafe",
                  background: "#ffffff",
                  padding: 18,
                  color: "#1e293b",
                  lineHeight: 1.7,
                }}
              >
                {recommendation.rationale}
              </div>

              {recommendation.suggested_at ? (
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid #c7d2fe",
                    background: "#f8faff",
                    padding: 18,
                  }}
                >
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>
                    Recommended Slot
                  </div>
                  <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
                    {formatDateTime(recommendation.suggested_at)}
                  </div>
                </div>
              ) : null}

              {recommendation.locked_constraints.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <strong style={{ color: "#0f172a" }}>Lock constraints</strong>
                  {recommendation.locked_constraints.map((constraint) => (
                    <div
                      key={constraint}
                      style={{
                        borderRadius: 16,
                        border: "1px solid #fde68a",
                        background: "#fffbeb",
                        padding: 14,
                        color: "#92400e",
                        lineHeight: 1.6,
                      }}
                    >
                      {constraint}
                    </div>
                  ))}
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 10 }}>
                <strong style={{ color: "#0f172a" }}>Queue changes</strong>
                {recommendation.changes.map((change) => (
                  <div
                    key={`${change.appointment_id}-${change.to}`}
                    style={{
                      borderRadius: 16,
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      padding: 14,
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                      {change.patient_name} · {change.direction}
                    </div>
                    <div style={{ fontSize: 14, color: "#475569" }}>
                      {formatDateTime(change.from)} → {formatDateTime(change.to)}
                    </div>
                    <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.6 }}>{change.reason}</div>
                  </div>
                ))}
              </div>

              {displacedPatients.length > 0 ? (
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid #fed7aa",
                    background: "#fff7ed",
                    padding: 18,
                    color: "#9a3412",
                    lineHeight: 1.7,
                  }}
                >
                  {displacedPatients.length} patient{displacedPatients.length === 1 ? "" : "s"} moved later because
                  their critical scores were lower than {recommendation.patient_name}.
                </div>
              ) : null}
            </article>
          ) : null}

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
              Practitioners own treatment decisions, patient review, and the critical ranking that drives schedule
              recommendations.
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
