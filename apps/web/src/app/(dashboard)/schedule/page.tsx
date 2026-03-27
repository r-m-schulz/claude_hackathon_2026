import WeeklySchedule from "../../../components/calendar/WeeklySchedule";
import { mockScheduleItems } from "../../../lib/client/mockDashboard";

export default function SchedulePage() {
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Dashboard
        </p>
        <h1 style={{ margin: "6px 0 0" }}>Weekly schedule</h1>
      </header>

      <WeeklySchedule items={mockScheduleItems} />
    </section>
  );
}