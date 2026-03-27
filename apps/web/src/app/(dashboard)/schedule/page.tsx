"use client";

import { Suspense, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  BusinessPatientSummary,
  BusinessWorkspaceSummary,
  ConfirmAppointmentInput,
  ConfirmAppointmentResponse,
  CriticalScheduleRecommendation,
  Department,
  WeeklyScheduleItem,
} from "@triageai/shared";

import WeeklySchedule from "@/components/calendar/WeeklySchedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/client/api";
import {
  clearLatestCriticalRecommendation,
  loadLatestCriticalRecommendation,
} from "@/lib/client/recommendationSession";

type ScheduleResponse = {
  schedule: WeeklyScheduleItem[];
  department: Department;
  week_start: string;
  week_end: string;
};

type PatientsResponse = {
  patients: BusinessPatientSummary[];
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

function weekStartForValue(value: string) {
  const date = new Date(value);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function SchedulePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [workspace, setWorkspace] = useState<BusinessWorkspaceSummary | null>(null);
  const [patients, setPatients] = useState<BusinessPatientSummary[]>([]);
  const [schedule, setSchedule] = useState<WeeklyScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => parseInitialWeekStart(searchParams.get("week_start")));
  const [recommendation, setRecommendation] = useState<CriticalScheduleRecommendation | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirmingAppointment, setConfirmingAppointment] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [activeDepartment, setActiveDepartment] = useState<Department | null>(null);
  const [patientSearch, setPatientSearch] = useState("");

  const focusPatientId = searchParams.get("focus_patient_id");
  const focusAppointmentId = searchParams.get("focus_appointment_id");
  const focusPatientName = searchParams.get("focus_patient_name");
  const deferredPatientSearch = useDeferredValue(patientSearch);

  useEffect(() => {
    setWeekStart(parseInitialWeekStart(searchParams.get("week_start")));
    setSelectedSlot(null);
    setActionError(null);
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

        const [scheduleResponse, patientsResponse] = await Promise.all([
          apiFetch<ScheduleResponse>(
            `/api/appointments/schedule?department=${encodeURIComponent(department)}&week_start=${encodeURIComponent(weekStart.toISOString())}`,
          ),
          apiFetch<PatientsResponse>("/api/business/patients"),
        ]);

        if (!isMounted) {
          return;
        }

        setSchedule(scheduleResponse.schedule);
        setActiveDepartment(scheduleResponse.department);
        setPatients(
          [...patientsResponse.patients].sort((a, b) => a.full_name.localeCompare(b.full_name)),
        );

        const latestRecommendation = loadLatestCriticalRecommendation();
        if (
          latestRecommendation &&
          focusPatientId &&
          latestRecommendation.patient_id === focusPatientId
        ) {
          setRecommendation(latestRecommendation);
          setSelectedSlot(latestRecommendation.suggested_at ?? null);
        } else {
          setRecommendation(null);
        }

        setError(null);
        setActionError(null);
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
  const focusedPatient = useMemo(
    () => patients.find((patient) => patient.id === focusPatientId) ?? null,
    [focusPatientId, patients],
  );
  const visiblePatients = useMemo(() => {
    const query = deferredPatientSearch.trim().toLowerCase();
    const matches = patients.filter((patient) => {
      if (!query) {
        return true;
      }

      const haystack = [
        patient.full_name,
        patient.email ?? "",
        patient.phone ?? "",
        patient.department.replaceAll("_", " "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
    const departmentMatches = activeDepartment
      ? matches.filter((patient) => patient.department === activeDepartment)
      : matches;

    return (departmentMatches.length > 0 ? departmentMatches : matches).slice(0, 10);
  }, [activeDepartment, deferredPatientSearch, patients]);
  const displacedPatients = useMemo(
    () =>
      recommendation?.changes.filter(
        (change) => change.direction === "later" && change.patient_id !== recommendation.patient_id,
      ) ?? [],
    [recommendation],
  );
  const pendingSlot = selectedSlot ?? recommendation?.suggested_at ?? null;
  const pendingPatientName = recommendation?.patient_name ?? focusPatientName;
  const pendingDepartment = recommendation?.department ?? activeDepartment;
  const pendingRiskScore = recommendation?.critical_score ?? null;
  const pendingRiskTier = recommendation?.risk_tier ?? null;
  const canConfirmAppointment = Boolean(focusPatientId && pendingSlot && pendingPatientName && pendingDepartment);
  const pendingSlotLabel =
    recommendation?.suggested_at && pendingSlot === recommendation.suggested_at
      ? recommendation.focused_appointment_id
        ? "pending confirm"
        : "recommended slot"
      : "selected slot";

  function focusPatientForManualBooking(patient: BusinessPatientSummary) {
    setSelectedSlot(null);
    setConfirmationMessage(null);
    setActionError(null);
    setRecommendation(null);

    const nextSearch = new URLSearchParams(searchParams.toString());
    nextSearch.set("department", patient.department);
    nextSearch.set("week_start", weekStart.toISOString());
    nextSearch.set("focus_patient_id", patient.id);
    nextSearch.set("focus_patient_name", patient.full_name);
    nextSearch.delete("focus_appointment_id");

    router.replace(`/schedule?${nextSearch.toString()}`);
  }

  function clearFocusedPatient() {
    setSelectedSlot(null);
    setConfirmationMessage(null);
    setActionError(null);
    setRecommendation(null);

    const nextSearch = new URLSearchParams(searchParams.toString());
    nextSearch.delete("focus_patient_id");
    nextSearch.delete("focus_patient_name");
    nextSearch.delete("focus_appointment_id");

    router.replace(`/schedule?${nextSearch.toString()}`);
  }

  async function onConfirmAppointment() {
    if (!focusPatientId || !pendingSlot) {
      return;
    }

    setConfirmingAppointment(true);
    setConfirmationMessage(null);
    setActionError(null);

    try {
      const body: ConfirmAppointmentInput = {
        patient_id: focusPatientId,
        appointment_id: recommendation?.focused_appointment_id ?? focusAppointmentId ?? null,
        scheduled_at: pendingSlot,
        justification:
          recommendation?.rationale ??
          `Manual calendar booking created for ${pendingPatientName ?? "the focused patient"}.`,
      };

      const response = await apiFetch<ConfirmAppointmentResponse>("/api/appointments/confirm", {
        method: "POST",
        body: JSON.stringify(body),
      });

      clearLatestCriticalRecommendation();
      setRecommendation(null);
      setSelectedSlot(null);
      setConfirmationMessage(
        response.action === "created"
          ? `Appointment created for ${pendingPatientName ?? "the patient"} at ${formatDateTime(response.scheduled_at)}.`
          : `Appointment confirmed for ${pendingPatientName ?? "the patient"} at ${formatDateTime(response.scheduled_at)}.`,
      );

      const nextWeekStart = weekStartForValue(response.scheduled_at);
      setWeekStart(nextWeekStart);

      const nextSearch = new URLSearchParams(searchParams.toString());
      nextSearch.set("department", response.department);
      nextSearch.set("week_start", nextWeekStart.toISOString());
      nextSearch.set("focus_patient_id", response.patient_id);
      nextSearch.set("focus_appointment_id", response.appointment_id);
      if (pendingPatientName) {
        nextSearch.set("focus_patient_name", pendingPatientName);
      }

      router.replace(`/schedule?${nextSearch.toString()}`);
    } catch (confirmError) {
      setActionError(
        confirmError instanceof Error
          ? confirmError.message
          : "Unable to confirm the appointment.",
      );
    } finally {
      setConfirmingAppointment(false);
    }
  }

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
    <section
      style={{
        display: "grid",
        gap: 20,
        gridTemplateRows: "auto auto",
        minHeight: "calc(100vh - 32px)",
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
            overflow: "hidden",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Calendar</h2>
            <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.6 }}>
              Solid cards show current bookings. Dashed cards show the engine’s recommended slot for pending
              reschedules.
            </p>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <WeeklySchedule
              items={schedule}
              weekStart={weekStart}
              onWeekChange={setWeekStart}
              highlightedAppointmentId={focusAppointmentId}
              highlightedPatientId={focusPatientId}
              onSlotSelect={
                focusPatientId
                  ? (slotAt) => {
                      setSelectedSlot(slotAt);
                      setConfirmationMessage(null);
                    }
                  : undefined
              }
              proposedSlot={pendingSlot}
              proposedPatientId={focusPatientId}
              proposedPatientName={pendingPatientName}
              proposedDepartment={pendingDepartment}
              proposedRiskScore={pendingRiskScore}
              proposedRiskTier={pendingRiskTier}
              proposedLabel={pendingSlotLabel}
            />
          </div>
        </article>

        <div
          style={{
            display: "grid",
            gap: 20,
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
                Manual Scheduling
              </p>
              <h2 style={{ margin: "8px 0 0", fontSize: 24 }}>Choose a patient</h2>
              <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.6 }}>
                Pick a patient, then click a slot on the calendar to create the appointment manually.
              </p>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <Input
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
                placeholder="Search patient name, email, phone, or department"
              />
              {focusedPatient ? (
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                    padding: 16,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1d4ed8" }}>
                      Selected patient
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 700, color: "#0f172a" }}>{focusedPatient.full_name}</div>
                    <div style={{ marginTop: 6, fontSize: 14, color: "#475569" }}>
                      {focusedPatient.department.replaceAll("_", " ")} · {focusedPatient.risk_tier} {focusedPatient.risk_score}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      type="button"
                      onClick={() => focusPatientForManualBooking(focusedPatient)}
                    >
                      Use in Calendar
                    </Button>
                    <Button type="button" variant="outline" onClick={clearFocusedPatient}>
                      Clear Selection
                    </Button>
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  maxHeight: 300,
                  overflowY: "auto",
                }}
              >
                {visiblePatients.length === 0 ? (
                  <div style={{ padding: 16, color: "#475569", lineHeight: 1.6 }}>
                    No patients match this search.
                  </div>
                ) : (
                  visiblePatients.map((patient) => {
                    const isSelected = patient.id === focusPatientId;

                    return (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => focusPatientForManualBooking(patient)}
                        style={{
                          width: "100%",
                          border: "none",
                          borderBottom: "1px solid #e2e8f0",
                          background: isSelected ? "#eff6ff" : "transparent",
                          padding: 16,
                          textAlign: "left",
                          cursor: "pointer",
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <strong style={{ color: "#0f172a" }}>{patient.full_name}</strong>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: 999,
                              background: isSelected ? "#dbeafe" : "#e2e8f0",
                              color: isSelected ? "#1d4ed8" : "#475569",
                            }}
                          >
                            {patient.risk_tier} {patient.risk_score}
                          </span>
                        </div>
                        <div style={{ fontSize: 14, color: "#475569" }}>
                          {patient.department.replaceAll("_", " ")}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          {patient.email ?? patient.phone ?? "No contact details"}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </article>

          {confirmationMessage ? (
            <article
              style={{
                borderRadius: 18,
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                padding: 18,
                color: "#166534",
                lineHeight: 1.7,
              }}
            >
              {confirmationMessage}
            </article>
          ) : null}

          {actionError ? (
            <article
              style={{
                borderRadius: 18,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                padding: 18,
                color: "#991b1b",
                lineHeight: 1.7,
              }}
            >
              {actionError}
            </article>
          ) : null}

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

              {focusPatientId ? (
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid #dbeafe",
                    background: "#ffffff",
                    padding: 18,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#64748b",
                      }}
                    >
                      Confirm Booking
                    </div>
                    <div style={{ marginTop: 8, color: "#334155", lineHeight: 1.6 }}>
                      {pendingSlot
                        ? `Confirm ${formatDateTime(pendingSlot)} for ${pendingPatientName ?? recommendation.patient_name}, or click another slot in the calendar to override it.`
                        : "Click any free slot on the calendar to create or confirm the appointment."}
                    </div>
                  </div>
                  <Button onClick={onConfirmAppointment} disabled={!canConfirmAppointment || confirmingAppointment}>
                    {confirmingAppointment
                      ? "Confirming..."
                      : recommendation.focused_appointment_id
                        ? "Confirm Appointment"
                        : "Create Appointment"}
                  </Button>
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

          {focusPatientId && !recommendation ? (
            <article
              style={{
                borderRadius: 24,
                border: "1px solid #dbe2ee",
                background: "#ffffff",
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
                  Book Appointment
                </p>
                <h2 style={{ margin: "8px 0 0", fontSize: 24 }}>
                  {pendingPatientName ?? "Focused patient"}
                </h2>
                <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.6 }}>
                  Click a slot on the calendar to create a new appointment for this patient.
                </p>
              </div>

              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid #dbeafe",
                  background: "#ffffff",
                  padding: 18,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ color: "#334155", lineHeight: 1.6 }}>
                  {pendingSlot
                    ? `Selected slot: ${formatDateTime(pendingSlot)}`
                    : "No slot selected yet."}
                </div>
                <Button onClick={onConfirmAppointment} disabled={!canConfirmAppointment || confirmingAppointment}>
                  {confirmingAppointment ? "Creating..." : "Create Appointment"}
                </Button>
              </div>
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

export default function SchedulePage() {
  return (
    <Suspense fallback={<p style={{ margin: 0, color: "#64748b" }}>Loading workflow view...</p>}>
      <SchedulePageContent />
    </Suspense>
  );
}
