"use client";

import { HeroHeader } from "@/components/header";
import "../landing.css";

export default function FeaturesPage() {
  const features = [
    {
      title: "Continuous AI triage",
      desc: "Claude reviews scans, surveys, and notes to keep risk scores current across dermatology, gastro, cardio, orthopaedics, physio, surgery, and psychiatry.",
    },
    {
      title: "Clinician-in-the-loop controls",
      desc: "AI only suggests; clinicians approve, reject, or modify every scheduling change with full reasoning and audit trail.",
    },
    {
      title: "Scheduling engine with 7-day lock",
      desc: "Automatically generates safer reschedule suggestions without moving any appointment inside a 7-day window.",
    },
    {
      title: "Real-time triage feed",
      desc: "Live, ranked list of flagged patients by severity with links to patient history and suggested actions.",
    },
    {
      title: "Department-specific scoring",
      desc: "Validated rubrics like ABCDE for dermatology, HEART for cardiology, and Boston/Paris/Mayo for GI.",
    },
    {
      title: "Patient survey automation",
      desc: "Personalized questionnaires (5–12 items) per patient; responses scored and fed back into triage instantly.",
    },
    {
      title: "Safety & ethics guardrails",
      desc: "Psychiatry crisis escalation bypasses scheduling, confidence scores shown, and all data stays encrypted with RLS.",
    },
  ];

  return (
    <div className="landing-shell">
      <HeroHeader />
      <main className="info-page">
        <section className="info-hero">
          <p className="eyebrow">Features</p>
          <h1>Everything you need to triage and schedule safely</h1>
          <p className="lede">
            Purpose-built for clinicians and admins: continuous risk scoring, human approval on every change, and scheduling rules that
            keep patients safe.
          </p>
        </section>

        <section className="info-grid">
          {features.map((item) => (
            <article key={item.title} className="info-card">
              <h2>{item.title}</h2>
              <p>{item.desc}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
