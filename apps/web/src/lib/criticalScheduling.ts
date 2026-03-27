import type {
  AIAnalysis,
  CriticalScheduleChange,
  CriticalScheduleRecommendation,
  Department,
  RiskTier,
  ScheduleRecommendationDirection,
} from "@triageai/shared";

import { createSupabaseServerClient } from "@/lib/server/supabase";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type RunCriticalSchedulingEngineInput = {
  businessId: string;
  patientId: string;
  noteId: string;
  noteAnalysis: AIAnalysis;
};

type AppointmentRow = {
  id: string;
  patient_id: string;
  department: Department;
  scheduled_at: string;
  ai_suggested_date: string | null;
  suggestion_status: string | null;
  is_on_the_day: boolean;
  patients:
    | Array<{
        id: string;
        full_name: string;
        business_id: string | null;
        risk_score: number;
        risk_tier: RiskTier;
      }>
    | {
        id: string;
        full_name: string;
        business_id: string | null;
        risk_score: number;
        risk_tier: RiskTier;
      }
    | null;
};

type RankedAppointment = {
  appointmentId: string;
  patientId: string;
  patientName: string;
  department: Department;
  riskScore: number;
  riskTier: RiskTier;
  scheduledAt: string;
  aiSuggestedDate: string | null;
  suggestionStatus: string | null;
  isOnTheDay: boolean;
};

function getWeekStart(dateInput: string) {
  const date = new Date(dateInput);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatSlot(value: string) {
  return new Date(value).toLocaleString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDirection(from: string, to: string): ScheduleRecommendationDirection {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();

  if (toMs < fromMs) {
    return "earlier";
  }

  if (toMs > fromMs) {
    return "later";
  }

  return "unchanged";
}

function comparePriority(a: RankedAppointment, b: RankedAppointment, focusedPatientId: string) {
  if (b.riskScore !== a.riskScore) {
    return b.riskScore - a.riskScore;
  }

  if (a.patientId === focusedPatientId && b.patientId !== focusedPatientId) {
    return -1;
  }

  if (b.patientId === focusedPatientId && a.patientId !== focusedPatientId) {
    return 1;
  }

  return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
}

function buildChangeReason({
  appointment,
  direction,
  targetSlot,
  focusedPatientName,
  focusedCriticalScore,
}: {
  appointment: RankedAppointment;
  direction: ScheduleRecommendationDirection;
  targetSlot: string;
  focusedPatientName: string;
  focusedCriticalScore: number;
}) {
  if (direction === "unchanged") {
    return `${appointment.patientName} keeps the current slot because the queue order already matches the current critical ranking.`;
  }

  if (appointment.patientName === focusedPatientName) {
    return `${appointment.patientName} is now ranked at critical score ${focusedCriticalScore}, so the engine selected ${formatSlot(targetSlot)} as the earliest safe slot after comparing all movable appointments.`;
  }

  const directionPhrase = direction === "earlier" ? "earlier" : "later";
  return `${appointment.patientName} moves ${directionPhrase} because ${focusedPatientName} now has a higher critical score (${focusedCriticalScore}) and takes priority in the reordered queue.`;
}

function getRelatedPatient(row: AppointmentRow) {
  if (Array.isArray(row.patients)) {
    return row.patients[0] ?? null;
  }

  return row.patients;
}

export async function runCriticalSchedulingEngine({
  businessId,
  patientId,
  noteId,
  noteAnalysis,
}: RunCriticalSchedulingEngineInput): Promise<CriticalScheduleRecommendation | null> {
  const supabase = createSupabaseServerClient();
  const now = Date.now();
  const lockBoundary = new Date(now + SEVEN_DAYS_MS);

  const { data: patientRow, error: patientError } = await supabase
    .from("patients")
    .select("id, full_name, department, risk_score, risk_tier")
    .eq("business_id", businessId)
    .eq("id", patientId)
    .maybeSingle();

  if (patientError) {
    throw new Error(patientError.message);
  }

  if (!patientRow) {
    return null;
  }

  const { data: appointmentRows, error: appointmentsError } = await supabase
    .from("appointments")
    .select(`
      id,
      patient_id,
      department,
      scheduled_at,
      ai_suggested_date,
      suggestion_status,
      is_on_the_day,
      patients (
        id,
        full_name,
        business_id,
        risk_score,
        risk_tier
      )
    `)
    .eq("department", patientRow.department)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true });

  if (appointmentsError) {
    throw new Error(appointmentsError.message);
  }

  const appointments: RankedAppointment[] = ((appointmentRows ?? []) as unknown as AppointmentRow[])
    .map((row) => {
      const patient = getRelatedPatient(row);

      return {
      appointmentId: row.id,
      patientId: row.patient_id,
      patientName: patient?.full_name ?? "Unknown",
      department: row.department,
      riskScore: patient?.risk_score ?? 0,
      riskTier: patient?.risk_tier ?? "low",
      scheduledAt: row.scheduled_at,
      aiSuggestedDate: row.ai_suggested_date,
      suggestionStatus: row.suggestion_status,
      isOnTheDay: row.is_on_the_day,
      businessId: patient?.business_id ?? null,
    };
    })
    .filter((row) => row.businessId === businessId)
    .map(({ businessId: _businessId, ...row }) => row);

  if (appointments.length === 0) {
    return {
      patient_id: patientId,
      patient_name: patientRow.full_name,
      department: patientRow.department as Department,
      note_id: noteId,
      severity_score: noteAnalysis.severity_score,
      critical_score: patientRow.risk_score,
      risk_tier: patientRow.risk_tier as RiskTier,
      focused_appointment_id: null,
      suggested_at: null,
      week_start: getWeekStart(new Date().toISOString()).toISOString(),
      rationale:
        `Critical score ${patientRow.risk_score} was recalculated after the new note, but there is no existing scheduled appointment in this business workspace for ${patientRow.full_name}.`,
      locked_constraints: [],
      changes: [],
    };
  }

  const movableAppointments = appointments.filter(
    (appointment) => new Date(appointment.scheduledAt).getTime() > lockBoundary.getTime(),
  );
  const frozenAppointments = appointments.filter(
    (appointment) => new Date(appointment.scheduledAt).getTime() <= lockBoundary.getTime(),
  );

  const rankedAppointments = [...movableAppointments].sort((a, b) => comparePriority(a, b, patientId));
  const availableSlots = movableAppointments
    .map((appointment) => appointment.scheduledAt)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const assignmentMap = new Map<string, string>();
  rankedAppointments.forEach((appointment, index) => {
    const slot = availableSlots[index];
    if (slot) {
      assignmentMap.set(appointment.appointmentId, slot);
    }
  });

  const currentPatientAppointment =
    appointments.find((appointment) => appointment.patientId === patientId) ?? null;

  const lockedConstraints = frozenAppointments
    .filter((appointment) => appointment.riskScore < patientRow.risk_score)
    .map(
      (appointment) =>
        `${appointment.patientName} remains at ${formatSlot(appointment.scheduledAt)} because appointments inside 7 days cannot be moved automatically.`,
    );

  const changes: CriticalScheduleChange[] = [];
  const updates = rankedAppointments.map(async (appointment) => {
    const assignedSlot = assignmentMap.get(appointment.appointmentId) ?? appointment.scheduledAt;
    const direction = getDirection(appointment.scheduledAt, assignedSlot);
    const reason = buildChangeReason({
      appointment,
      direction,
      targetSlot: assignedSlot,
      focusedPatientName: patientRow.full_name,
      focusedCriticalScore: patientRow.risk_score,
    });

    const shouldUpdateSuggestion = direction !== "unchanged";
    changes.push({
      appointment_id: appointment.appointmentId,
      patient_id: appointment.patientId,
      patient_name: appointment.patientName,
      critical_score: appointment.riskScore,
      risk_tier: appointment.riskTier,
      from: appointment.scheduledAt,
      to: assignedSlot,
      direction,
      reason,
    });

    if (shouldUpdateSuggestion) {
      await supabase
        .from("appointments")
        .update({
          ai_suggested_date: assignedSlot,
          suggestion_status: "pending",
          is_on_the_day: false,
        })
        .eq("id", appointment.appointmentId);
      return;
    }

    if (appointment.aiSuggestedDate || appointment.suggestionStatus === "pending") {
      await supabase
        .from("appointments")
        .update({
          ai_suggested_date: null,
          suggestion_status: null,
        })
        .eq("id", appointment.appointmentId);
    }
  });

  await Promise.all(updates);

  const focusedChange =
    changes.find((change) => change.patient_id === patientId) ??
    (currentPatientAppointment
      ? {
          appointment_id: currentPatientAppointment.appointmentId,
          patient_id: currentPatientAppointment.patientId,
          patient_name: currentPatientAppointment.patientName,
          critical_score: currentPatientAppointment.riskScore,
          risk_tier: currentPatientAppointment.riskTier,
          from: currentPatientAppointment.scheduledAt,
          to: currentPatientAppointment.scheduledAt,
          direction: "unchanged" as const,
          reason:
            `${currentPatientAppointment.patientName} already holds the safest available slot in the current queue ordering.`,
        }
      : null);

  const movedLater = changes.filter(
    (change) => change.direction === "later" && change.patient_id !== patientId,
  );
  const queueRank =
    [...appointments].sort((a, b) => comparePriority(a, b, patientId)).findIndex(
      (appointment) => appointment.patientId === patientId,
    ) + 1;

  const rationaleParts = [
    `Critical score ${patientRow.risk_score} (${patientRow.risk_tier}) was recalculated after note severity ${noteAnalysis.severity_score} using the patient context and the latest note.`,
    `${patientRow.full_name} is ranked ${queueRank} of ${appointments.length} scheduled ${patientRow.department.replaceAll("_", " ")} patients in this workspace.`,
    focusedChange
      ? focusedChange.direction === "earlier"
        ? `The engine recommends ${formatSlot(focusedChange.to)} because it is the earliest safe slot available after reordering all appointments outside the 7-day lock.`
        : focusedChange.direction === "later"
          ? `The engine recommends ${formatSlot(focusedChange.to)} because higher-priority patients must take the earlier movable slots.`
          : `No later reslotting was needed for ${patientRow.full_name}; the current booking already matches the priority order.`
      : `No existing appointment could be highlighted for ${patientRow.full_name}.`,
    movedLater.length > 0
      ? `${movedLater.length} lower-priority patient${movedLater.length === 1 ? "" : "s"} were moved later to keep higher critical scores earlier in the queue.`
      : `No other patient had to be moved later for this recommendation.`,
  ];

  return {
    patient_id: patientId,
    patient_name: patientRow.full_name,
    department: patientRow.department as Department,
    note_id: noteId,
    severity_score: noteAnalysis.severity_score,
    critical_score: patientRow.risk_score,
    risk_tier: patientRow.risk_tier as RiskTier,
    focused_appointment_id: focusedChange?.appointment_id ?? currentPatientAppointment?.appointmentId ?? null,
    suggested_at: focusedChange?.to ?? currentPatientAppointment?.scheduledAt ?? null,
    week_start: getWeekStart(
      focusedChange?.to ?? currentPatientAppointment?.scheduledAt ?? new Date().toISOString(),
    ).toISOString(),
    rationale: rationaleParts.join(" "),
    locked_constraints: lockedConstraints,
    changes,
  };
}
