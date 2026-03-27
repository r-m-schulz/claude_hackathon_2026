"use client";

import Link from "next/link";
import { HeroHeader } from "@/components/header";
import { Cta4 } from "@/components/cta";

export default function HeroSection() {
  return (
    <div className="landing-shell">
      <HeroHeader />

      <main className="landing-main">
        <section className="hero-section">
          <div className="hero-visual">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="hero-video"
              src="https://videos.pexels.com/video-files/35968183/15249566_1920_1080_30fps.mp4"
            />
          </div>

          <div className="hero-copy">
            <div className="hero-copy-inner">
              <h1 className="hero-title">Build clinical workflows faster with TriageAI</h1>
              <p className="hero-sub">Highly customizable components and dashboards for care teams.</p>
            </div>
          </div>
        </section>
      </main>
      <Cta4 />

      <footer className="landing-footer">
        <div className="landing-footer__left">© 2026 Triage AI</div>
        <div className="landing-footer__center">Claude Hackathon @ TCD 2026</div>
        <div className="landing-footer__right">
          <Link href="https://github.com/r-m-schulz/claude_hackathon_2026" target="_blank" rel="noreferrer">
            View code
          </Link>
        </div>
      </footer>
    </div>
  );
}
