"use client";

import { HeroHeader } from "@/components/header";
import "../landing.css";

export default function SolutionPage() {
  return (
    <div className="landing-shell">
      <HeroHeader />
      <main className="info-page">
        <section className="info-hero">
          <p className="eyebrow">Solution</p>
          <h1>AI-powered triage with human oversight</h1>
          <p className="lede">
            TriageAI ingests scans, surveys, and clinical notes, scores risk per department, and suggests safer schedules—while clinicians
            stay in control.
          </p>
        </section>

        <section className="info-columns">
          <div className="info-block">
            <h2>How it works</h2>
            <ul>
              <li>Data in: uploads, surveys, and notes flow into the AI engine.</li>
              <li>AI analysis: department-specific prompts produce severity, red flags, and reasoning.</li>
              <li>Scheduling engine: applies 7-day lock, generates ranked suggestions and weekly calendar diffs.</li>
              <li>Human approval: clinicians/admins approve, reject, or modify every change.</li>
              <li>Notify patients: confirmed updates sync to the patient app.</li>
            </ul>
          </div>
          <div className="info-block">
            <h2>Why it’s safer</h2>
            <ul>
              <li>Never auto-moves appointments; 7-day lock enforced in the database.</li>
              <li>One active suggestion per appointment; full audit trail on every decision.</li>
              <li>Psychiatry crisis responses bypass scheduling and alert the on-call clinician.</li>
              <li>Confidence scores surfaced; low confidence triggers manual verification.</li>
            </ul>
          </div>
          <div className="info-block">
            <h2>Built for hospitals</h2>
            <ul>
              <li>Realtime triage feed with risk tiers and data provenance.</li>
              <li>Patient app for surveys and notifications; admin calendar with drag-and-drop preview.</li>
              <li>Supabase RLS keeps departments isolated; encryption in transit and at rest.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
