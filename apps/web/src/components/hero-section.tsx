"use client";

import Link from "next/link";
import { HeroHeader } from "@/components/header";
import { InfiniteSlider } from "@/components/motion-primitives/infinite-slider";
import { ProgressiveBlur } from "@/components/motion-primitives/progressive-blur";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/svgs/chevron-right";
import { Bolt } from "@/components/ui/svgs/bolt";
import { VercelFull } from "@/components/ui/svgs/vercel";
import { SupabaseFull } from "@/components/ui/svgs/supabase";
import { Hulu } from "@/components/ui/svgs/hulu";
import { Spotify } from "@/components/ui/svgs/spotify";
import { FirebaseFull } from "@/components/ui/svgs/firebase";
import { Beacon } from "@/components/ui/svgs/beacon";
import { Claude } from "@/components/ui/svgs/claude";
import { Figma } from "@/components/ui/svgs/figma";
import { Cisco } from "@/components/ui/svgs/cisco";

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
              <div className="hero-ctas">
                <Button asChild size="default" className="cta-primary">
                  <Link href="/login">
                    <span>Start Building</span>
                    <ChevronRightIcon className="cta-icon" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="default" className="cta-secondary">
                  <Link href="/signin">Request a demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="brands-section">
          <div className="brands-row">
            <div className="brands-lead">Powering the best care teams</div>
            <div className="brands-marquee">
              <InfiniteSlider speed={40} gap={96}>
                <Bolt />
                <VercelFull />
                <SupabaseFull />
                <Hulu />
                <Spotify />
                <FirebaseFull />
                <Beacon />
                <Claude />
                <Figma />
                <Cisco />
              </InfiniteSlider>

              <div className="brands-fade left" />
              <div className="brands-fade right" />
              <ProgressiveBlur direction="left" className="brands-blur left" />
              <ProgressiveBlur direction="right" className="brands-blur right" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
