"use client";

import type { WeeklyScheduleItem } from "@triageai/shared";
import Link from "next/link";
import { useState } from "react";

// ── config ──────────────────────────────────────────────────────────────────
const START_HOUR = 7;   // 7 am
const END_HOUR   = 20;  // 8 pm (exclusive label)
const HOUR_H     = 80;  // px per hour
const CARD_H     = 72;  // px per appointment card
const TIME_W     = 52;  // px for the time gutter on the left
const TOTAL_H    = (END_HOUR - START_HOUR) * HOUR_H;

const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

// ── helpers ──────────────────────────────────────────────────────────────────
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); // Monday
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function topForDate(date: Date): number {
  const h = date.getHours();
  const m = date.getMinutes();
  return (h - START_HOUR + m / 60) * HOUR_H;
}

const BADGE: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#fef3c7", color: "#92400e" },
  approved: { bg: "#d1fae5", color: "#065f46" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
};

// ── appointment card (absolutely positioned) ──────────────────────────────
function AppointmentCard({ item, top }: { item: WeeklyScheduleItem; top: number }) {
  const time = new Date(item.scheduled_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const badge = item.suggestion_status ? BADGE[item.suggestion_status] : null;
  const onDay  = item.is_on_the_day;

  return (
    <Link
      href={`/patients/${item.patient_id}`}
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
          background: onDay ? "#fff7ed" : "#f0f9ff",
          border: onDay ? "1.5px solid #f97316" : "1.5px solid #bae6fd",
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
          {badge && (
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
          )}
          {onDay && (
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
          )}
        </div>
      </div>
    </Link>
  );
}

// ── main component ────────────────────────────────────────────────────────
export default function WeeklySchedule({ items }: { items: WeeklyScheduleItem[] }) {
  const defaultWeek =
    items.length > 0
      ? getWeekStart(new Date(items[0].scheduled_at))
      : getWeekStart(new Date());

  const [weekStart, setWeekStart] = useState(defaultWeek);

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
    items.filter((item) => isSameDay(new Date(item.scheduled_at), day))
  );

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
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%"}}>

      {/* ── week navigation ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button style={navBtn} onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</button>
        <button style={navBtn} onClick={() => setWeekStart(addDays(weekStart, 7))}>›</button>
        <span style={{ fontWeight: 600, color: "#0f172a", fontSize: 15 }}>{weekLabel}</span>
        <button
          onClick={() => setWeekStart(getWeekStart(new Date()))}
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

      {/* ── calendar wrapper — single scroll container for both axes ── */}
      <div
        style={{
          flex: 1,
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          overflow: "auto",
          background: "#ffffff",
          minHeight: 0,
        }}
      >
        {/* inner min-width wrapper so narrow viewports scroll rather than squish */}
        <div style={{ minWidth: TIME_W + 7 * 120, display: "flex", flexDirection: "column" }}>

          {/* ── day headers (sticky to scroll container) ── */}
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
                    minWidth: 120,
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

          {/* ── time grid ── */}
          <div style={{ display: "flex", position: "relative", height: TOTAL_H }}>

            {/* time gutter */}
            <div
              style={{
                width: TIME_W,
                flexShrink: 0,
                position: "relative",
                borderRight: "1px solid #e2e8f0",
              }}
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    top: (h - START_HOUR) * HOUR_H - 8,
                    right: 8,
                    fontSize: 11,
                    color: "#94a3b8",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  {h === 12 ? "12 pm" : h > 12 ? `${h - 12} pm` : `${h} am`}
                </div>
              ))}
            </div>

            {/* day columns */}
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={day.toISOString()}
                  style={{
                    flex: 1,
                    minWidth: 120,
                    position: "relative",
                    borderRight: "1px solid #e2e8f0",
                    background: isToday ? "#f8fafc" : "transparent",
                  }}
                >
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      style={{
                        position: "absolute",
                        top: (h - START_HOUR) * HOUR_H,
                        left: 0,
                        right: 0,
                        borderTop: "1px solid #f1f5f9",
                        pointerEvents: "none",
                      }}
                    />
                  ))}
                  {itemsByDay[i].map((item) => {
                    const top = topForDate(new Date(item.scheduled_at));
                    return <AppointmentCard key={item.appointment_id} item={item} top={top} />;
                  })}
                </div>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  );
}
