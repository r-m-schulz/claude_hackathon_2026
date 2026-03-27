import type { WeeklyScheduleItem } from "@triageai/shared";
import Link from "next/link";

type WeeklyScheduleProps = {
  items: WeeklyScheduleItem[];
};

function toDayKey(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function toTimeLabel(dateString: string) {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WeeklySchedule({ items }: WeeklyScheduleProps) {
  if (items.length === 0) {
    return (
      <section
        style={{
          border: "1px solid #dbe2ee",
          borderRadius: 16,
          background: "#ffffff",
          padding: 24,
        }}
      >
        No appointments in this week.
      </section>
    );
  }

  const groupedByDay = items.reduce<Record<string, WeeklyScheduleItem[]>>((acc, item) => {
    const key = toDayKey(item.scheduled_at);
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <section style={{ display: "grid", gap: 12 }}>
      {Object.entries(groupedByDay).map(([day, dayItems]) => (
        <article
          key={day}
          style={{ border: "1px solid #dbe2ee", borderRadius: 14, background: "#ffffff" }}
        >
          <header style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0", fontWeight: 700 }}>
            {day}
          </header>

          <ul style={{ listStyle: "none", margin: 0, padding: 12, display: "grid", gap: 10 }}>
            {dayItems.map((item) => (
              <li
                key={item.appointment_id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div>
                  <strong>{toTimeLabel(item.scheduled_at)}</strong> {item.patient_name}
                  <div style={{ fontSize: 13, color: "#475569", textTransform: "capitalize" }}>
                    {item.department.replaceAll("_", " ")} | Suggestion: {item.suggestion_status ?? "none"}
                    {item.is_on_the_day ? " | On-the-day" : ""}
                  </div>
                </div>
                <Link href={`/patients/${item.patient_id}`}>View</Link>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}