import type {
  CriticalScheduleChange,
  Department,
  RiskTier,
  ScheduleRecommendationDirection,
} from "@triageai/shared";

import { loadLatestNoteScoreMap, scoreToTier } from "@/lib/noteSeverity";
import { createSupabaseServerClient } from "@/lib/server/supabase";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SLOT_INTERVAL_MINUTES = 30;
const SLOT_START_HOUR = 8;
const SLOT_END_HOUR = 18;
const SLOT_LOOKAHEAD_DAYS = 42;

export const ACTIVE_APPOINTMENT_STATUSES = ["scheduled", "rescheduled"] as const;

type RelatedPatient =
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

type SchedulingPatientRow = {
  id: string;
  full_name: string;
  department: Department;
  business_id: string | null;
  risk_score: number;
  risk_tier: RiskTier;
};

type AppointmentRow = {
  id: string;
  patient_id: string;
  department: Department;
  scheduled_at: string;
  ai_suggested_date: string | null;
  suggestion_status: string | null;
  is_on_the_day: boolean;
  patients: RelatedPatient;
};

type QueueAppointment = {
  appointmentId: string;
  patientId: string;
  patientName: string;
  businessId: string | null;
  department: Department;
  riskScore: number;
  riskTier: RiskTier;
  scheduledAt: string;
  aiSuggestedDate: string | null;
  suggestionStatus: string | null;
  isOnTheDay: boolean;
};

export type SeverityDrivenScheduleStatus =
  | "recommended"
  | "already_scheduled_soon"
  | "already_best_slot"
  | "no_existing_appointment";

export type SeverityDrivenScheduleResult = {
  status: SeverityDrivenScheduleStatus;
  patient_id: string;
  patient_name: string;
  department: Department;
  critical_score: number;
  risk_tier: RiskTier;
  appointment_id: string | null;
  scheduled_at: string | null;
  suggested_at: string | null;
  week_start: string;
  queue_rank: number | null;
  appointment_count: number;
  has_existing_appointment: boolean;
  is_on_the_day: boolean;
  justification: string;
  locked_constraints: string[];
  changes: CriticalScheduleChange[];
};

export type ManualAppointmentRecommendationResult = {
  status: SeverityDrivenScheduleStatus;
  appointment_id: string | null;
  suggested_date: string | null;
};

function isSameBusiness(a: string | null, b: string | null) {
  return a === b;
}

export function isActiveAppointmentStatus(status: string) {
  return ACTIVE_APPOINTMENT_STATUSES.includes(
    status as (typeof ACTIVE_APPOINTMENT_STATUSES)[number],
  );
}

function getRelatedPatient(patientValue: RelatedPatient) {
  if (Array.isArray(patientValue)) {
    return patientValue[0] ?? null;
  }

  return patientValue;
}

function getWeekStart(value: string) {
  const date = new Date(value);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isBusinessDay(date: Date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
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

function formatSlot(value: string) {
  return new Date(value).toLocaleString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function comparePriority(
  a: QueueAppointment,
  b: QueueAppointment,
  focusedPatientId: string,
) {
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

function getTargetLeadDays(score: number, riskTier: RiskTier) {
  if (riskTier === "critical" || score >= 90) {
    return 1;
  }

  if (riskTier === "high" || score >= 72) {
    return 3;
  }

  if (riskTier === "medium" || score >= 48) {
    return 10;
  }

  return 21;
}

function buildLockedConstraints(
  lockedAppointments: QueueAppointment[],
  patient: SchedulingPatientRow,
) {
  return lockedAppointments
    .filter((appointment) => appointment.riskScore < patient.risk_score)
    .map((appointment) =>
      `${appointment.patientName} remains at ${formatSlot(appointment.scheduledAt)} because appointments inside 7 days cannot be moved automatically.`,
    );
}

function buildCandidateSlots(startAt: Date) {
  const slots: string[] = [];

  for (let dayOffset = 0; dayOffset < SLOT_LOOKAHEAD_DAYS; dayOffset += 1) {
    const day = addDays(startAt, dayOffset);
    day.setHours(0, 0, 0, 0);

    if (!isBusinessDay(day)) {
      continue;
    }

    for (
      let minutes = SLOT_START_HOUR * 60;
      minutes < SLOT_END_HOUR * 60;
      minutes += SLOT_INTERVAL_MINUTES
    ) {
      const slot = new Date(day);
      slot.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

      if (slot.getTime() >= startAt.getTime()) {
        slots.push(slot.toISOString());
      }
    }
  }

  return slots;
}

function findNextAvailableSlot(
  appointments: QueueAppointment[],
  startAt: Date,
) {
  const occupiedTimes = new Set(
    appointments.map((appointment) => new Date(appointment.scheduledAt).getTime()),
  );

  for (const candidate of buildCandidateSlots(startAt)) {
    const candidateTime = new Date(candidate).getTime();

    if (!occupiedTimes.has(candidateTime)) {
      return candidate;
    }
  }

  return null;
}

async function loadSchedulingPatient(patientId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, department, business_id, risk_score, risk_tier")
    .eq("id", patientId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(`Patient not found: ${patientId}`);
  }

  const noteScoreMap = await loadLatestNoteScoreMap([patientId]);
  const resolvedScore = noteScoreMap.get(patientId) ?? data.risk_score ?? 0;

  return {
    ...(data as SchedulingPatientRow),
    risk_score: resolvedScore,
    risk_tier: scoreToTier(resolvedScore),
  } satisfies SchedulingPatientRow;
}

async function loadDepartmentQueue(patient: SchedulingPatientRow) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
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
    .eq("department", patient.department)
    .in("status", [...ACTIVE_APPOINTMENT_STATUSES])
    .order("scheduled_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const noteScoreMap = await loadLatestNoteScoreMap(
    ((data ?? []) as AppointmentRow[]).map((row) => row.patient_id),
  );

  return ((data ?? []) as AppointmentRow[])
    .map((row) => {
      const relatedPatient = getRelatedPatient(row.patients);
      const resolvedScore =
        noteScoreMap.get(row.patient_id) ?? relatedPatient?.risk_score ?? 0;

      return {
        appointmentId: row.id,
        patientId: row.patient_id,
        patientName: relatedPatient?.full_name ?? "Unknown",
        businessId: relatedPatient?.business_id ?? null,
        department: row.department,
        riskScore: resolvedScore,
        riskTier: scoreToTier(resolvedScore),
        scheduledAt: row.scheduled_at,
        aiSuggestedDate: row.ai_suggested_date,
        suggestionStatus: row.suggestion_status,
        isOnTheDay: row.is_on_the_day,
      } satisfies QueueAppointment;
    })
    .filter((appointment) => isSameBusiness(appointment.businessId, patient.business_id));
}

async function applySchedulingUpdate(
  appointment: QueueAppointment,
  payload: {
    ai_suggested_date: string | null;
    suggestion_status: "pending" | null;
    is_on_the_day: boolean;
  },
) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("appointments")
    .update(payload)
    .eq("id", appointment.appointmentId);

  if (error) {
    throw new Error(error.message);
  }
}

function buildJustification({
  patient,
  queueRank,
  appointmentCount,
  currentAppointment,
  suggestedSlot,
  targetLeadDays,
  lockedConstraints,
  displacedCount,
  status,
}: {
  patient: SchedulingPatientRow;
  queueRank: number | null;
  appointmentCount: number;
  currentAppointment: QueueAppointment | null;
  suggestedSlot: string | null;
  targetLeadDays: number;
  lockedConstraints: string[];
  displacedCount: number;
  status: SeverityDrivenScheduleStatus;
}) {
  if (!currentAppointment && suggestedSlot) {
    return `Clinical note severity set ${patient.full_name} to score ${patient.risk_score} (${patient.risk_tier}), which justifies review within ${targetLeadDays} day${targetLeadDays === 1 ? "" : "s"}. No appointment existed, so the engine selected ${formatSlot(suggestedSlot)} as the earliest open ${patient.department.replaceAll("_", " ")} slot.`;
  }

  if (status === "already_scheduled_soon" && currentAppointment) {
    return `${patient.full_name} already has an appointment at ${formatSlot(currentAppointment.scheduledAt)}. That slot already falls inside the recommended return window for score ${patient.risk_score} (${patient.risk_tier}), so no earlier move was suggested.`;
  }

  if (status === "already_best_slot" && currentAppointment) {
    return `${patient.full_name} is score ${patient.risk_score} (${patient.risk_tier}) and already holds the best available future slot at ${formatSlot(currentAppointment.scheduledAt)} once the department queue is ranked by severity.`;
  }

  if (status === "recommended" && currentAppointment && patient.risk_tier === "critical" && !suggestedSlot) {
    return `${patient.full_name} is now critical at score ${patient.risk_score}. Their current appointment is already inside the 7-day protected window, so the engine flagged it for immediate same-day attention instead of moving it automatically.`;
  }

  if (status === "recommended" && currentAppointment && suggestedSlot) {
    const queueSummary = queueRank
      ? `${patient.full_name} is ranked ${queueRank} of ${appointmentCount} active patients in this department queue.`
      : `${patient.full_name} has been re-ranked against the current queue.`;
    const lockSummary =
      lockedConstraints.length > 0
        ? ` ${lockedConstraints.length} protected booking${lockedConstraints.length === 1 ? "" : "s"} inside the 7-day lock were preserved.`
        : "";
    const displacementSummary =
      displacedCount > 0
        ? ` ${displacedCount} lower-priority patient${displacedCount === 1 ? "" : "s"} were moved later to open this slot.`
        : "";

    return `Clinical note severity set ${patient.full_name} to score ${patient.risk_score} (${patient.risk_tier}), which justifies review within ${targetLeadDays} day${targetLeadDays === 1 ? "" : "s"}. ${queueSummary} The engine selected ${formatSlot(suggestedSlot)} as the safest available return slot.${lockSummary}${displacementSummary}`;
  }

  return `${patient.full_name} is currently score ${patient.risk_score} (${patient.risk_tier}). No alternative appointment slot could be recommended from the current calendar state.`;
}

export async function getSeverityDrivenScheduleResult(
  patientId: string,
): Promise<SeverityDrivenScheduleResult> {
  const patient = await loadSchedulingPatient(patientId);
  const queue = await loadDepartmentQueue(patient);
  const currentAppointment =
    queue
      .filter((appointment) => appointment.patientId === patientId)
      .sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      )[0] ?? null;
  const targetLeadDays = getTargetLeadDays(patient.risk_score, patient.risk_tier);

  const baseResult = {
    patient_id: patient.id,
    patient_name: patient.full_name,
    department: patient.department,
    critical_score: patient.risk_score,
    risk_tier: patient.risk_tier,
    appointment_count: queue.length,
  } as const;

  if (!currentAppointment) {
    const preferredStart = addDays(new Date(), targetLeadDays);
    preferredStart.setHours(SLOT_START_HOUR, 0, 0, 0);

    while (!isBusinessDay(preferredStart)) {
      preferredStart.setDate(preferredStart.getDate() + 1);
    }

    const suggestedSlot = findNextAvailableSlot(queue, preferredStart);

    if (!suggestedSlot) {
      return {
        ...baseResult,
        status: "no_existing_appointment",
        appointment_id: null,
        scheduled_at: null,
        suggested_at: null,
        week_start: getWeekStart(new Date().toISOString()).toISOString(),
        queue_rank: null,
        has_existing_appointment: false,
        is_on_the_day: false,
        justification: `${patient.full_name} does not currently have an appointment, and no open slot could be found in the next ${SLOT_LOOKAHEAD_DAYS} days.`,
        locked_constraints: [],
        changes: [],
      };
    }

    const virtualQueueRank =
      [...queue, {
        appointmentId: "virtual",
        patientId: patient.id,
        patientName: patient.full_name,
        businessId: patient.business_id,
        department: patient.department,
        riskScore: patient.risk_score,
        riskTier: patient.risk_tier,
        scheduledAt: suggestedSlot,
        aiSuggestedDate: null,
        suggestionStatus: null,
        isOnTheDay: false,
      } satisfies QueueAppointment]
        .sort((a, b) => comparePriority(a, b, patient.id))
        .findIndex((appointment) => appointment.patientId === patient.id) + 1;

    return {
      ...baseResult,
      status: "recommended",
      appointment_id: null,
      scheduled_at: null,
      suggested_at: suggestedSlot,
      week_start: getWeekStart(suggestedSlot).toISOString(),
      queue_rank: virtualQueueRank,
      has_existing_appointment: false,
      is_on_the_day: false,
      justification: buildJustification({
        patient,
        queueRank: virtualQueueRank,
        appointmentCount: queue.length,
        currentAppointment: null,
        suggestedSlot,
        targetLeadDays,
        lockedConstraints: [],
        displacedCount: 0,
        status: "recommended",
      }),
      locked_constraints: [],
      changes: [],
    };
  }

  const now = Date.now();
  const lockBoundary = new Date(now + SEVEN_DAYS_MS);
  const lockedAppointments = queue.filter(
    (appointment) => new Date(appointment.scheduledAt).getTime() <= lockBoundary.getTime(),
  );
  const movableAppointments = queue.filter(
    (appointment) => new Date(appointment.scheduledAt).getTime() > lockBoundary.getTime(),
  );
  const lockedConstraints = buildLockedConstraints(lockedAppointments, patient);
  const currentAppointmentTime = new Date(currentAppointment.scheduledAt).getTime();

  if (currentAppointmentTime <= lockBoundary.getTime()) {
    const shouldFlagOnTheDay = patient.risk_tier === "critical";
    const hasStalePendingSuggestion =
      currentAppointment.aiSuggestedDate !== null ||
      currentAppointment.suggestionStatus === "pending" ||
      (currentAppointment.isOnTheDay && !shouldFlagOnTheDay);

    if (shouldFlagOnTheDay) {
      if (
        !currentAppointment.isOnTheDay ||
        currentAppointment.suggestionStatus !== "pending" ||
        currentAppointment.aiSuggestedDate !== null
      ) {
        await applySchedulingUpdate(currentAppointment, {
          ai_suggested_date: null,
          suggestion_status: "pending",
          is_on_the_day: true,
        });
      }

      return {
        ...baseResult,
        status: "recommended",
        appointment_id: currentAppointment.appointmentId,
        scheduled_at: currentAppointment.scheduledAt,
        suggested_at: null,
        week_start: getWeekStart(currentAppointment.scheduledAt).toISOString(),
        queue_rank: 1,
        has_existing_appointment: true,
        is_on_the_day: true,
        justification: buildJustification({
          patient,
          queueRank: 1,
          appointmentCount: queue.length,
          currentAppointment,
          suggestedSlot: null,
          targetLeadDays,
          lockedConstraints,
          displacedCount: 0,
          status: "recommended",
        }),
        locked_constraints: lockedConstraints,
        changes: [],
      };
    }

    if (hasStalePendingSuggestion) {
      await applySchedulingUpdate(currentAppointment, {
        ai_suggested_date: null,
        suggestion_status: null,
        is_on_the_day: false,
      });
    }

    return {
      ...baseResult,
      status: "already_scheduled_soon",
      appointment_id: currentAppointment.appointmentId,
      scheduled_at: currentAppointment.scheduledAt,
      suggested_at: null,
      week_start: getWeekStart(currentAppointment.scheduledAt).toISOString(),
      queue_rank: 1,
      has_existing_appointment: true,
      is_on_the_day: false,
      justification: buildJustification({
        patient,
        queueRank: 1,
        appointmentCount: queue.length,
        currentAppointment,
        suggestedSlot: null,
        targetLeadDays,
        lockedConstraints,
        displacedCount: 0,
        status: "already_scheduled_soon",
      }),
      locked_constraints: lockedConstraints,
      changes: [],
    };
  }

  const rankedAppointments = [...movableAppointments].sort((a, b) =>
    comparePriority(a, b, patientId),
  );
  const availableSlots = movableAppointments
    .map((appointment) => appointment.scheduledAt)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const assignedSlots = new Map<string, string>();
  rankedAppointments.forEach((appointment, index) => {
    const slot = availableSlots[index];
    if (slot) {
      assignedSlots.set(appointment.appointmentId, slot);
    }
  });

  const changes: CriticalScheduleChange[] = rankedAppointments.map((appointment) => {
    const assignedSlot =
      assignedSlots.get(appointment.appointmentId) ?? appointment.scheduledAt;
    const direction = getDirection(appointment.scheduledAt, assignedSlot);

    return {
      appointment_id: appointment.appointmentId,
      patient_id: appointment.patientId,
      patient_name: appointment.patientName,
      critical_score: appointment.riskScore,
      risk_tier: appointment.riskTier,
      from: appointment.scheduledAt,
      to: assignedSlot,
      direction,
      reason:
        direction === "unchanged"
          ? `${appointment.patientName} already holds the correct slot for the current severity-ranked queue.`
          : `${appointment.patientName} moves ${direction} because the severity-ranked queue now assigns ${formatSlot(assignedSlot)} to this appointment.`,
    };
  });

  await Promise.all(
    rankedAppointments.map(async (appointment) => {
      const assignedSlot =
        assignedSlots.get(appointment.appointmentId) ?? appointment.scheduledAt;
      const direction = getDirection(appointment.scheduledAt, assignedSlot);
      const shouldClearPendingSuggestion =
        appointment.aiSuggestedDate !== null ||
        appointment.suggestionStatus === "pending" ||
        appointment.isOnTheDay;

      if (direction !== "unchanged") {
        await applySchedulingUpdate(appointment, {
          ai_suggested_date: assignedSlot,
          suggestion_status: "pending",
          is_on_the_day: false,
        });
        return;
      }

      if (shouldClearPendingSuggestion) {
        await applySchedulingUpdate(appointment, {
          ai_suggested_date: null,
          suggestion_status: null,
          is_on_the_day: false,
        });
      }
    }),
  );

  const focusedChange =
    changes.find((change) => change.appointment_id === currentAppointment.appointmentId) ??
    null;
  const queueRank =
    rankedAppointments.findIndex(
      (appointment) => appointment.appointmentId === currentAppointment.appointmentId,
    ) + 1;
  const recommendedSlot =
    focusedChange && focusedChange.direction !== "unchanged"
      ? focusedChange.to
      : null;
  const displacedCount = changes.filter(
    (change) => change.direction === "later" && change.patient_id !== patient.id,
  ).length;
  const status = recommendedSlot ? "recommended" : "already_best_slot";

  return {
    ...baseResult,
    status,
    appointment_id: currentAppointment.appointmentId,
    scheduled_at: currentAppointment.scheduledAt,
    suggested_at: recommendedSlot,
    week_start: getWeekStart(recommendedSlot ?? currentAppointment.scheduledAt).toISOString(),
    queue_rank: queueRank,
    has_existing_appointment: true,
    is_on_the_day: false,
    justification: buildJustification({
      patient,
      queueRank,
      appointmentCount: queue.length,
      currentAppointment,
      suggestedSlot: recommendedSlot,
      targetLeadDays,
      lockedConstraints,
      displacedCount,
      status,
    }),
    locked_constraints: lockedConstraints,
    changes,
  };
}

export async function createAppointmentSuggestion(
  patient_id: string,
  _risk_tier: RiskTier,
  _triage_event_id: string,
): Promise<void> {
  await getSeverityDrivenScheduleResult(patient_id);
}

export async function createManualAppointmentRecommendation(
  patient_id: string,
): Promise<ManualAppointmentRecommendationResult> {
  const recommendation = await getSeverityDrivenScheduleResult(patient_id);

  return {
    status: recommendation.status,
    appointment_id: recommendation.appointment_id,
    suggested_date: recommendation.suggested_at,
  };
}
