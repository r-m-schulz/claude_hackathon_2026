"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "@/components/ui/svgs/arrow-right";
import { Check } from "@/components/ui/svgs/check";
import Link from "next/link";

type Cta4Props = {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  items?: string[];
};

const defaultItems = [
  "AI triage across 7 departments",
  "Clinician approval on every change",
  "7-day scheduling lock enforced",
  "Realtime risk-ranked feed",
  "Psychiatry crisis escalation",
];

export const Cta4 = ({
  title = "See TriageAI in action",
  description = "Run an end-to-end triage: Claude analyzes scans, surveys, and notes, then generates human-approved schedule suggestions with the 7-day lock enforced.",
  buttonText = "Book a demo",
  buttonUrl = "/signin",
  items = defaultItems,
}: Cta4Props) => {
  return (
    <section className="cta-section">
      <div className="cta-shell">
        <div className="cta-card">
          <div className="cta-copy">
            <h4>{title}</h4>
            <p>{description}</p>
            <div className="cta-buttons">
              <Button className="cta-button" asChild>
                <Link href="/login">Start Building</Link>
              </Button>
              <Button className="cta-button secondary" asChild>
                <Link href="/signin">Request a demo</Link>
              </Button>
            </div>
          </div>
          <div className="cta-list">
            <ul>
              {items.map((item, idx) => (
                <li key={idx}>
                  <Check className="cta-check" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
