"use client";

import type { ReactNode } from "react";
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
  if (value) return new Date(value);
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

function isSameInstant(a: string, b: string) {
  return new Date(a).getTime() === new Date(b).getTime();
}

function SideSection({ title, label, children }: { title: string; label?: string; children: ReactNode }) {
  return (
    <div className="db-card" style={{ overflow: "hidden" }}>
      <div className="db-card-header">
        <span className="db-card-title">{title}</span>
        {label && <span className="db-badge db-badge-blue">{label}</span>}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
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
        if (!isMounted) return;
        setWorkspace(nextWorkspace);

        const department =
          (searchParams.get("department") as Department | null) ??
          nextWorkspace.current_employee.department ??
          nextWorkspace.business.primary_department ??
          nextWorkspace.recent_patients[0]?.department ??
          null;

        if (!department) throw new Error("No department is configured for this workspace schedule.");

        const [scheduleResponse, patientsResponse] = await Promise.all([
          apiFetch<ScheduleResponse>(`/api/appointments/schedule?department=${encodeURIComponent(department)}&week_start=${encodeURIComponent(weekStart.toISOString())}`),
          apiFetch<PatientsResponse>("/api/business/patients"),
        ]);

        if (!isMounted) return;

        setSchedule(scheduleResponse.schedule);
        setActiveDepartment(scheduleResponse.department);
        setPatients([...patientsResponse.patients].sort((a, b) => a.full_name.localeCompare(b.full_name)));

        const latestRecommendation = loadLatestCriticalRecommendation();
        if (latestRecommendation && focusPatientId && latestRecommendation.patient_id === focusPatientId) {
          setRecommendation(latestRecommendation);
          setSelectedSlot(latestRecommendation.suggested_at ?? null);
        } else {
          setRecommendation(null);
        }

        setError(null);
        setActionError(null);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load workflow view.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    setLoading(true);
    void loadPage();
    return () => { isMounted = false; };
  }, [focusPatientId, searchKey, weekStart]);

  const hrEmployees = useMemo(() => workspace?.employees.filter((e) => e.role === "hr") ?? [], [workspace]);
  const practitioners = useMemo(() => workspace?.employees.filter((e) => e.role === "practitioner") ?? [], [workspace]);
  const focusedPatient = useMemo(() => patients.find((p) => p.id === focusPatientId) ?? null, [focusPatientId, patients]);

  const visiblePatients = useMemo(() => {
    const query = deferredPatientSearch.trim().toLowerCase();
    const matches = patients.filter((p) => {
      if (!query) return true;
      return [p.full_name, p.email ?? "", p.phone ?? "", p.department.replaceAll("_", " ")].join(" ").toLowerCase().includes(query);
    });
    const deptMatches = activeDepartment ? matches.filter((p) => p.department === activeDepartment) : matches;
    return (deptMatches.length > 0 ? deptMatches : matches).slice(0, 10);
  }, [activeDepartment, deferredPatientSearch, patients]);

  const displacedPatients = useMemo(
    () => recommendation?.changes.filter((c) => c.direction === "later" && c.patient_id !== recommendation.patient_id) ?? [],
    [recommendation],
  );

  const recommendedExistingAppointment = useMemo(
    () => recommendation?.focused_appointment_id
      ? schedule.find((item) => item.appointment_id === recommendation.focused_appointment_id) ?? null
      : null,
    [recommendation, schedule],
  );

  const focusedAppointment = useMemo(() => {
    const appointmentId = recommendation?.focused_appointment_id ?? focusAppointmentId;
    return appointmentId ? schedule.find((item) => item.appointment_id === appointmentId) ?? null : null;
  }, [focusAppointmentId, recommendation, schedule]);

  const recommendedBaseSlot = recommendation?.suggested_at ?? (recommendation?.focused_appointment_id ? recommendedExistingAppointment?.scheduled_at ?? null : null);
  const pendingSlot = selectedSlot ?? recommendedBaseSlot ?? null;
  const pendingPatientName = recommendation?.patient_name ?? focusPatientName;
  const pendingDepartment = recommendation?.department ?? activeDepartment;
  const pendingRiskScore = recommendation?.critical_score ?? null;
  const pendingRiskTier = recommendation?.risk_tier ?? null;
  const canConfirmAppointment = Boolean(focusPatientId && pendingSlot && pendingPatientName && pendingDepartment);
  const canCreateAdditionalAppointment = Boolean(focusPatientId && selectedSlot && pendingPatientName && pendingDepartment && selectedSlot !== focusedAppointment?.scheduled_at);
  const occupiedSlotSelection = useMemo(
    () =>
      selectedSlot
        ? schedule.find((item) => isSameInstant(item.scheduled_at, selectedSlot) && item.appointment_id !== focusedAppointment?.appointment_id) ?? null
        : null,
    [focusedAppointment?.appointment_id, schedule, selectedSlot],
  );
  const pendingSlotLabel =
    recommendation?.suggested_at && pendingSlot === recommendation.suggested_at
      ? recommendation.focused_appointment_id ? "pending confirm" : "recommended slot"
      : recommendation?.focused_appointment_id && !selectedSlot
        ? "current flagged slot"
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

  async function onConfirmAppointment(mode: "confirm" | "create" = "confirm") {
    const slotToBook = mode === "create" ? selectedSlot : pendingSlot;
    if (!focusPatientId || !slotToBook) return;

    setConfirmingAppointment(true);
    setConfirmationMessage(null);
    setActionError(null);

    try {
      const body: ConfirmAppointmentInput = {
        patient_id: focusPatientId,
        appointment_id: mode === "create" ? null : recommendation?.focused_appointment_id ?? focusAppointmentId ?? null,
        scheduled_at: slotToBook,
        justification: mode === "create"
          ? `Manual calendar booking created for ${pendingPatientName ?? "the focused patient"}.`
          : recommendation?.rationale ?? `Manual calendar booking created for ${pendingPatientName ?? "the focused patient"}.`,
      };

      const response = await apiFetch<ConfirmAppointmentResponse>("/api/appointments/confirm", { method: "POST", body: JSON.stringify(body) });

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
      if (pendingPatientName) nextSearch.set("focus_patient_name", pendingPatientName);
      router.replace(`/schedule?${nextSearch.toString()}`);
    } catch (confirmError) {
      setActionError(confirmError instanceof Error ? confirmError.message : "Unable to confirm the appointment.");
    } finally {
      setConfirmingAppointment(false);
    }
  }

  if (loading) return <p style={{ margin: 0, color: "var(--ds-text-3)", fontSize: 13 }}>Loading workflow…</p>;
  if (error || !workspace) return <div className="db-alert-error">{error ?? "Unable to load workflow view."}</div>;

  return (
    <div className="db-page">

      {/* ── Page header ── */}
      <div className="db-page-header">
        <div className="db-page-title-row">
          <div>
            <div className="db-label-section">Workflow</div>
            <h1 className="db-page-title" style={{ marginTop: 4 }}>Critical Scheduling</h1>
            <p className="db-page-desc">Live patient priority, reslot suggestions, and the latest AI triage recommendation.</p>
          </div>
          {activeDepartment && (
            <span className="db-badge db-badge-blue">{activeDepartment.replaceAll("_", " ")}</span>
          )}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 16, alignItems: "start" }}>

        {/* Calendar */}
        <div className="db-card" style={{ overflow: "hidden" }}>
          <div className="db-card-header">
            <span className="db-card-title">Weekly Calendar</span>
            <span style={{ fontSize: 12, color: "var(--ds-text-3)" }}>
              Solid = booked · Dashed = recommended reslot
            </span>
          </div>
          <div style={{ padding: "0 0 4px" }}>
            <WeeklySchedule
              items={schedule}
              weekStart={weekStart}
              onWeekChange={setWeekStart}
              highlightedAppointmentId={focusAppointmentId}
              highlightedPatientId={focusPatientId}
              onSlotSelect={focusPatientId ? (slotAt) => {
                const conflictingAppointment = schedule.find(
                  (item) => isSameInstant(item.scheduled_at, slotAt) && item.appointment_id !== focusedAppointment?.appointment_id,
                );

                if (conflictingAppointment) {
                  setActionError(
                    `${formatDateTime(slotAt)} is already booked for ${conflictingAppointment.patient_name}. Choose an empty slot to add a new appointment.`,
                  );
                  setConfirmationMessage(null);
                  return;
                }

                setSelectedSlot(slotAt);
                setConfirmationMessage(null);
                setActionError(null);
              } : undefined}
              proposedSlot={pendingSlot}
              proposedPatientId={focusPatientId}
              proposedPatientName={pendingPatientName}
              proposedDepartment={pendingDepartment}
              proposedRiskScore={pendingRiskScore}
              proposedRiskTier={pendingRiskTier}
              proposedLabel={pendingSlotLabel}
            />
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: "grid", gap: 14 }}>

          {/* Patient selector */}
          <SideSection title="Select Patient" label="Manual">
            <div style={{ display: "grid", gap: 10 }}>
              <input
                className="db-input"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search name, email, dept…"
              />

              {focusedPatient && (
                <div style={{
                  padding: "10px 12px",
                  background: "var(--ds-accent-bg)",
                  border: "1px solid #BFDBFE",
                  borderRadius: 6,
                  display: "grid",
                  gap: 8,
                }}>
                  <div className="db-label-section" style={{ color: "var(--ds-accent)" }}>Selected</div>
                  <div style={{ fontWeight: 700, color: "var(--ds-text)" }}>{focusedPatient.full_name}</div>
                  <div style={{ fontSize: 12, color: "var(--ds-text-2)" }}>
                    {focusedPatient.department.replaceAll("_", " ")} · {focusedPatient.risk_tier} {focusedPatient.risk_score}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="db-btn db-btn-primary" style={{ fontSize: 12, padding: "5px 10px" }}
                      onClick={() => focusPatientForManualBooking(focusedPatient)}>
                      Use in Calendar
                    </button>
                    <button type="button" className="db-btn db-btn-secondary" style={{ fontSize: 12, padding: "5px 10px" }}
                      onClick={clearFocusedPatient}>
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <div style={{ border: "1px solid var(--ds-border)", borderRadius: 6, overflow: "hidden", maxHeight: 280, overflowY: "auto" }}>
                {visiblePatients.length === 0 ? (
                  <div style={{ padding: 12, fontSize: 13, color: "var(--ds-text-3)" }}>No patients match.</div>
                ) : visiblePatients.map((patient) => {
                  const isSelected = patient.id === focusPatientId;
                  return (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => focusPatientForManualBooking(patient)}
                      style={{
                        width: "100%",
                        border: "none",
                        borderBottom: "1px solid #F1F5F9",
                        background: isSelected ? "var(--ds-accent-bg)" : "white",
                        padding: "9px 12px",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "grid",
                        gap: 3,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-text)" }}>{patient.full_name}</span>
                        <span className={`db-badge ${isSelected ? "db-badge-blue" : "db-badge-gray"}`}>
                          {patient.risk_tier} {patient.risk_score}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ds-text-3)" }}>
                        {patient.department.replaceAll("_", " ")} · {patient.email ?? patient.phone ?? "No contact"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </SideSection>

          {/* Alerts */}
          {confirmationMessage && (
            <div className="db-alert-success">{confirmationMessage}</div>
          )}
          {actionError && (
            <div className="db-alert-error">{actionError}</div>
          )}

          {/* Recommendation panel */}
          {recommendation && (
            <SideSection title={recommendation.patient_name} label="AI Recommendation">
              <div style={{ display: "grid", gap: 12 }}>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="db-badge db-badge-red">Score {recommendation.critical_score}</span>
                  <span className="db-badge db-badge-amber">Severity {recommendation.severity_score}</span>
                  <span className="db-badge db-badge-gray">{recommendation.risk_tier}</span>
                </div>

                <div style={{
                  padding: "10px 12px",
                  background: "#FAFCFF",
                  border: "1px solid var(--ds-border)",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "var(--ds-text-2)",
                  lineHeight: 1.6,
                }}>
                  {recommendation.rationale}
                </div>

                {recommendation.suggested_at && (
                  <div style={{ padding: "10px 12px", background: "var(--ds-accent-bg)", border: "1px solid #BFDBFE", borderRadius: 6 }}>
                    <div className="db-label-section" style={{ color: "var(--ds-accent)" }}>Recommended Slot</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ds-text)", marginTop: 6, letterSpacing: "-0.01em" }}>
                      {formatDateTime(recommendation.suggested_at)}
                    </div>
                  </div>
                )}

                {focusPatientId && (
                  <div style={{ padding: "10px 12px", border: "1px solid var(--ds-border)", borderRadius: 6, display: "grid", gap: 10 }}>
                    <div className="db-label-section">Confirm Booking</div>
                    <div style={{ fontSize: 12, color: "var(--ds-text-2)", lineHeight: 1.5 }}>
                      {pendingSlot
                        ? `${formatDateTime(pendingSlot)} for ${pendingPatientName ?? recommendation.patient_name}`
                        : "Click a free slot on the calendar."}
                    </div>
                    {occupiedSlotSelection && (
                      <div style={{ fontSize: 12, color: "#B45309", lineHeight: 1.5 }}>
                        {formatDateTime(occupiedSlotSelection.scheduled_at)} is already booked for {occupiedSlotSelection.patient_name}.
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" className="db-btn db-btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}
                        onClick={() => void onConfirmAppointment("confirm")}
                        disabled={!canConfirmAppointment || confirmingAppointment}>
                        {confirmingAppointment ? "Confirming…" : recommendation.focused_appointment_id ? "Confirm" : "Create"}
                      </button>
                      {focusedAppointment && (
                        <button type="button" className="db-btn db-btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}
                          onClick={() => void onConfirmAppointment("create")}
                          disabled={!canCreateAdditionalAppointment || confirmingAppointment}>
                          {confirmingAppointment ? "Saving…" : "Add New"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {recommendation.locked_constraints.length > 0 && (
                  <div style={{ display: "grid", gap: 6 }}>
                    <div className="db-label-section">Lock Constraints</div>
                    {recommendation.locked_constraints.map((c) => (
                      <div key={c} className="db-alert-amber" style={{ fontSize: 12 }}>{c}</div>
                    ))}
                  </div>
                )}

                <div style={{ display: "grid", gap: 6 }}>
                  <div className="db-label-section">Queue Changes</div>
                  {recommendation.changes.map((change) => (
                    <div key={`${change.appointment_id}-${change.to}`} style={{
                      padding: "8px 10px",
                      border: "1px solid var(--ds-border)",
                      borderRadius: 6,
                      display: "grid",
                      gap: 3,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ds-text)" }}>{change.patient_name}</span>
                        <span className={`db-badge ${change.direction === "later" ? "db-badge-amber" : "db-badge-green"}`}>
                          {change.direction}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ds-text-3)" }}>
                        {formatDateTime(change.from)} → {formatDateTime(change.to)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ds-text-2)", lineHeight: 1.4, marginTop: 2 }}>{change.reason}</div>
                    </div>
                  ))}
                </div>

                {displacedPatients.length > 0 && (
                  <div className="db-alert-amber" style={{ fontSize: 12 }}>
                    {displacedPatients.length} patient{displacedPatients.length === 1 ? "" : "s"} moved later — lower critical scores than {recommendation.patient_name}.
                  </div>
                )}
              </div>
            </SideSection>
          )}

          {/* Manual booking panel (no recommendation) */}
          {focusPatientId && !recommendation && (
            <SideSection title={pendingPatientName ?? "Focused Patient"} label="Book">
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 13, color: "var(--ds-text-2)", lineHeight: 1.5 }}>
                  {pendingSlot ? `Selected: ${formatDateTime(pendingSlot)}` : "Click a slot on the calendar."}
                </div>
                {occupiedSlotSelection && (
                  <div style={{ fontSize: 12, color: "#B45309", lineHeight: 1.5 }}>
                    That slot is already booked for {occupiedSlotSelection.patient_name}. Pick another time.
                  </div>
                )}
                <button type="button" className="db-btn db-btn-primary" style={{ fontSize: 13 }}
                  onClick={() => void onConfirmAppointment("create")}
                  disabled={!canCreateAdditionalAppointment || confirmingAppointment}>
                  {confirmingAppointment ? "Creating…" : "Create Appointment"}
                </button>
              </div>
            </SideSection>
          )}

          {/* HR team */}
          <SideSection title="HR / Reception">
            {hrEmployees.length === 0 ? (
              <div className="db-empty">No HR employees. Add from Company page.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {hrEmployees.map((e) => (
                  <div key={e.id} style={{ padding: "8px 10px", border: "1px solid var(--ds-border)", borderRadius: 6, background: "#FAFCFF" }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.full_name}</div>
                    <div style={{ fontSize: 12, color: "var(--ds-text-3)", marginTop: 2 }}>{e.job_title ?? e.email}</div>
                  </div>
                ))}
              </div>
            )}
          </SideSection>

          {/* Practitioners */}
          <SideSection title="Practitioners">
            {practitioners.length === 0 ? (
              <div className="db-empty">No practitioners yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {practitioners.map((e) => (
                  <div key={e.id} style={{ padding: "8px 10px", border: "1px solid var(--ds-green-bg)", borderRadius: 6, background: "var(--ds-green-bg)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.full_name}</div>
                    <div style={{ fontSize: 12, color: "var(--ds-text-3)", marginTop: 2 }}>
                      {e.department?.replaceAll("_", " ") ?? "Clinical"} · {e.email}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SideSection>

          {/* Workflow summary */}
          {(workspace.business.workflow_summary || workspace.business.onboarding_answers.workflow_needs) && (
            <SideSection title="Workflow Focus">
              <div style={{ fontSize: 13, color: "var(--ds-text-2)", lineHeight: 1.6 }}>
                {workspace.business.workflow_summary || workspace.business.onboarding_answers.workflow_needs}
              </div>
            </SideSection>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<p style={{ margin: 0, color: "var(--ds-text-3)", fontSize: 13 }}>Loading workflow…</p>}>
      <SchedulePageContent />
    </Suspense>
  );
}
