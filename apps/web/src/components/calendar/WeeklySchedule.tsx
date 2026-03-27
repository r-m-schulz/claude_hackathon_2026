"use client";

import type { MouseEvent } from "react";
import type { WeeklyScheduleItem } from "@triageai/shared";
import Link from "next/link";

const START_HOUR = 7;
const END_HOUR = 20;
const HOUR_H = 80;
const CARD_H = 72;
const TIME_W = 52;
const TOTAL_H = (END_HOUR - START_HOUR) * HOUR_H;
const SLOT_INTERVAL_MINUTES = 30;

const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function getWeekStart(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  next.setDate(next.getDate() - day + (day === 0 ? -6 : 1));
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, n: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + n);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function topForDate(date: Date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const rawTop = (h - START_HOUR + m / 60) * HOUR_H;
  return Math.max(0, Math.min(TOTAL_H - CARD_H, rawTop));
}

const BADGE: Record<string, { bg: string; color: string }> = {
  pending: { bg: "#fef3c7", color: "#92400e" },
  approved: { bg: "#d1fae5", color: "#065f46" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
};

function getRecommendationDirection(item: WeeklyScheduleItem) {
  if (!item.ai_suggested_date) {
    return null;
  }

  const suggested = new Date(item.ai_suggested_date).getTime();
  const scheduled = new Date(item.scheduled_at).getTime();

  if (suggested < scheduled) {
    return "earlier";
  }

  if (suggested > scheduled) {
    return "later";
  }

  return "same";
}

function AppointmentCard({
  item,
  top,
  slotAt,
  variant,
  highlighted,
}: {
  item: WeeklyScheduleItem;
  top: number;
  slotAt: string;
  variant: "scheduled" | "recommended";
  highlighted: boolean;
}) {
  const time = new Date(slotAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const badge = item.suggestion_status ? BADGE[item.suggestion_status] : null;
  const onDay = item.is_on_the_day;
  const direction = getRecommendationDirection(item);
  const isRecommended = variant === "recommended";
  const background = isRecommended
    ? direction === "later"
      ? "#fff7ed"
      : "#ecfeff"
    : onDay
      ? "#fff7ed"
      : "#f0f9ff";
  const border = isRecommended
    ? direction === "later"
      ? "1.5px dashed #fb923c"
      : "1.5px dashed #14b8a6"
    : onDay
      ? "1.5px solid #f97316"
      : "1.5px solid #bae6fd";
  const boxShadow = highlighted
    ? "0 0 0 3px rgba(37, 99, 235, 0.18), 0 18px 30px rgba(15, 23, 42, 0.14)"
    : isRecommended
      ? "0 12px 24px rgba(20, 184, 166, 0.14)"
      : undefined;

  return (
    <Link
      href={`/patients/${item.patient_id}`}
      onClick={(event) => event.stopPropagation()}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{
          position: "absolute",
          top,
          left: 4,
          right: 4,
          height: CARD_H,
          borderRadius: 8,
          padding: "5px 8px",
          background,
          border,
          boxShadow,
          overflow: "hidden",
          cursor: "pointer",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 1 }}>
          {time}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#0f172a",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.patient_name}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#64748b",
            textTransform: "capitalize",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: 3,
          }}
        >
          {item.department.replaceAll("_", " ")}
        </div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: 99,
              background: isRecommended ? "#dbeafe" : "#e2e8f0",
              color: isRecommended ? "#1d4ed8" : "#475569",
            }}
          >
            {isRecommended ? "recommended" : "current"}
          </span>
          {badge ? (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: 99,
                background: badge.bg,
                color: badge.color,
              }}
            >
              {item.suggestion_status}
            </span>
          ) : null}
          {onDay ? (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: 99,
                background: "#ffedd5",
                color: "#c2410c",
              }}
            >
              on-day
            </span>
          ) : null}
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: 99,
              background: "#ffffff",
              color: "#0f172a",
            }}
          >
            {item.risk_tier} {item.risk_score}
          </span>
        </div>
      </div>
    </Link>
  );
}

function DraftSlotCard({
  top,
  slotAt,
  patientName,
  department,
  riskScore,
  riskTier,
  label,
}: {
  top: number;
  slotAt: string;
  patientName: string;
  department: string;
  riskScore?: number | null;
  riskTier?: string | null;
  label: string;
}) {
  const time = new Date(slotAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 4,
        right: 4,
        height: CARD_H,
        borderRadius: 8,
        padding: "5px 8px",
        background: "#eff6ff",
        border: "1.5px dashed #2563eb",
        boxShadow: "0 12px 24px rgba(37, 99, 235, 0.16)",
        overflow: "hidden",
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: "#1d4ed8", marginBottom: 1 }}>
        {time}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#0f172a",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {patientName}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#475569",
          textTransform: "capitalize",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          marginBottom: 3,
        }}
      >
        {department.replaceAll("_", " ")}
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: 99,
            background: "#dbeafe",
            color: "#1d4ed8",
          }}
        >
          {label}
        </span>
        {riskTier ? (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: 99,
              background: "#ffffff",
              color: "#0f172a",
            }}
          >
            {riskTier} {riskScore ?? 0}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function slotFromPointer(event: MouseEvent<HTMLDivElement>, day: Date) {
  const rect = event.currentTarget.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const hoursFromTop = Math.max(0, Math.min((TOTAL_H - 1) / HOUR_H, y / HOUR_H));
  const minutesFromStart = hoursFromTop * 60;
  const snappedMinutes =
    Math.round(minutesFromStart / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES;
  const absoluteMinutes = START_HOUR * 60 + snappedMinutes;
  const slot = new Date(day);
  slot.setHours(
    Math.min(END_HOUR - 1, Math.floor(absoluteMinutes / 60)),
    absoluteMinutes % 60,
    0,
    0,
  );

  if (slot.getTime() <= Date.now()) {
    return null;
  }

  return slot.toISOString();
}

export default function WeeklySchedule({
  items,
  weekStart,
  onWeekChange,
  highlightedAppointmentId,
  highlightedPatientId,
  onSlotSelect,
  proposedSlot,
  proposedPatientId,
  proposedPatientName,
  proposedDepartment,
  proposedRiskScore,
  proposedRiskTier,
  proposedLabel = "selected",
}: {
  items: WeeklyScheduleItem[];
  weekStart: Date;
  onWeekChange: (weekStart: Date) => void;
  highlightedAppointmentId?: string | null;
  highlightedPatientId?: string | null;
  onSlotSelect?: (slotAt: string) => void;
  proposedSlot?: string | null;
  proposedPatientId?: string | null;
  proposedPatientName?: string | null;
  proposedDepartment?: string | null;
  proposedRiskScore?: number | null;
  proposedRiskTier?: string | null;
  proposedLabel?: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${weekEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
  const itemsByDay = days.map((day) =>
    items.filter((item) => isSameDay(new Date(item.scheduled_at), day)),
  );

  const showDraftCard = Boolean(
    proposedSlot &&
      proposedPatientId &&
      proposedPatientName &&
      proposedDepartment,
  );
  const draftOverlapsExisting = showDraftCard
    ? items.some(
        (item) =>
          item.patient_id === proposedPatientId &&
          (item.scheduled_at === proposedSlot || item.ai_suggested_date === proposedSlot),
      )
    : false;

  const navBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: 18,
    color: "#334155",
    lineHeight: 1,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button style={navBtn} onClick={() => onWeekChange(addDays(weekStart, -7))}>
          ‹
        </button>
        <button style={navBtn} onClick={() => onWeekChange(addDays(weekStart, 7))}>
          ›
        </button>
        <span style={{ fontWeight: 600, color: "#0f172a", fontSize: 15 }}>{weekLabel}</span>
        <button
          onClick={() => onWeekChange(getWeekStart(new Date()))}
          style={{
            marginLeft: 4,
            padding: "4px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            cursor: "pointer",
            fontSize: 13,
            color: "#334155",
          }}
        >
          Today
        </button>
      </div>

      <div
        style={{
          flex: 1,
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          overflow: "hidden",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e2e8f0",
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#ffffff",
          }}
        >
          <div style={{ width: TIME_W, flexShrink: 0, borderRight: "1px solid #e2e8f0" }} />

          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 4px 8px",
                  background: isToday ? "#0f172a" : "transparent",
                  borderRight: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: isToday ? "#94a3b8" : "#64748b",
                  }}
                >
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: isToday ? "#ffffff" : "#0f172a",
                    lineHeight: 1.2,
                    marginTop: 2,
                  }}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <div style={{ display: "flex", position: "relative", height: TOTAL_H }}>
            <div
              style={{
                width: TIME_W,
                flexShrink: 0,
                position: "relative",
                borderRight: "1px solid #e2e8f0",
              }}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  style={{
                    position: "absolute",
                    top: (hour - START_HOUR) * HOUR_H - 8,
                    right: 8,
                    fontSize: 11,
                    color: "#94a3b8",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  {hour === 12 ? "12 pm" : hour > 12 ? `${hour - 12} pm` : `${hour} am`}
                </div>
              ))}
            </div>

            {days.map((day, index) => {
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={day.toISOString()}
                  onClick={
                    onSlotSelect
                      ? (event) => {
                          const slot = slotFromPointer(event, day);
                          if (slot) {
                            onSlotSelect(slot);
                          }
                        }
                      : undefined
                  }
                  style={{
                    flex: 1,
                    position: "relative",
                    borderRight: "1px solid #e2e8f0",
                    background: isToday ? "#f8fafc" : "transparent",
                    cursor: onSlotSelect ? "crosshair" : "default",
                  }}
                >
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      style={{
                        position: "absolute",
                        top: (hour - START_HOUR) * HOUR_H,
                        left: 0,
                        right: 0,
                        borderTop: "1px solid #f1f5f9",
                        pointerEvents: "none",
                      }}
                    />
                  ))}

                  {itemsByDay[index].map((item) => {
                    const top = topForDate(new Date(item.scheduled_at));
                    const isHighlighted =
                      item.appointment_id === highlightedAppointmentId ||
                      item.patient_id === highlightedPatientId;

                    return (
                      <AppointmentCard
                        key={`${item.appointment_id}-scheduled`}
                        item={item}
                        top={top}
                        slotAt={item.scheduled_at}
                        variant="scheduled"
                        highlighted={isHighlighted}
                      />
                    );
                  })}

                  {items
                    .filter(
                      (item) =>
                        item.ai_suggested_date &&
                        item.ai_suggested_date !== item.scheduled_at &&
                        isSameDay(new Date(item.ai_suggested_date), day),
                    )
                    .map((item) => {
                      const top = topForDate(new Date(item.ai_suggested_date as string));
                      const isHighlighted =
                        item.appointment_id === highlightedAppointmentId ||
                        item.patient_id === highlightedPatientId;

                      return (
                        <AppointmentCard
                          key={`${item.appointment_id}-recommended`}
                          item={item}
                          top={top}
                          slotAt={item.ai_suggested_date as string}
                          variant="recommended"
                          highlighted={isHighlighted}
                        />
                      );
                    })}

                  {showDraftCard &&
                  !draftOverlapsExisting &&
                  proposedSlot &&
                  proposedPatientName &&
                  proposedDepartment &&
                  isSameDay(new Date(proposedSlot), day) ? (
                    <DraftSlotCard
                      top={topForDate(new Date(proposedSlot))}
                      slotAt={proposedSlot}
                      patientName={proposedPatientName}
                      department={proposedDepartment}
                      riskScore={proposedRiskScore ?? 0}
                      riskTier={proposedRiskTier}
                      label={proposedLabel}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
