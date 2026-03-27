"use client";

import { HeroHeader } from "@/components/header";
import "../landing.css";

export default function AboutPage() {
  return (
    <div className="landing-shell">
      <HeroHeader />
      <main className="info-page">
        <section className="info-hero">
          <p className="eyebrow">About</p>
          <h1>TriageAI keeps clinicians in control while surfacing risk sooner</h1>
          <p className="lede">
            Built during Spring 2026 to address static hospital scheduling, TriageAI continuously re-evaluates patients between visits and
            highlights those who need earlier attention.
          </p>
        </section>

        <section className="info-columns">
          <div className="info-block">
            <h2>What we believe</h2>
            <ul>
              <li>AI is advisory only—no autonomous clinical moves.</li>
              <li>Every decision shows its reasoning and confidence.</li>
              <li>Safety first: 7-day lock on moves, crisis escalation for psychiatry.</li>
            </ul>
          </div>
          <div className="info-block">
            <h2>Who it serves</h2>
            <ul>
              <li>Clinicians: triage feed, patient history, approve/reject controls.</li>
              <li>Admins: weekly calendar with suggested changes and batch approvals.</li>
              <li>Patients: clear surveys and appointment visibility via the mobile app.</li>
            </ul>
          </div>
          <div className="info-block">
            <h2>What’s next</h2>
            <ul>
              <li>Deeper validation per department rubrics.</li>
              <li>Expanded on-the-day workflows and audit analytics.</li>
              <li>Additional safety guardrails and crisis playbooks.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
