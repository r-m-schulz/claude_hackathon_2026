"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { LogoIcon } from "@/components/logo";
import { Button } from "@/components/ui/button";

const menuItems = [
  { name: "Features", href: "#" },
  { name: "Solution", href: "#" },
  { name: "Pricing", href: "#" },
  { name: "About", href: "#" },
];

export const HeroHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="landing-header">
      <nav className={scrolled ? "nav-shell nav-scrolled" : "nav-shell"} data-state={menuOpen ? "active" : ""}>
        <div className="nav-inner">
          <div className="nav-left">
            <Link href="/" aria-label="home" className="nav-logo">
              <LogoIcon />
              <span className="nav-logo-text">TriageAI</span>
            </Link>

            <button
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="nav-toggle"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="nav-toggle-line" />
              <span className="nav-toggle-line" />
            </button>

            <div className="nav-links desktop">
              {menuItems.map((item) => (
                <Link key={item.name} href={item.href} className="nav-link">
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

            <div className={menuOpen ? "nav-actions mobile-open" : "nav-actions"}>
              <div className="nav-links mobile">
                {menuItems.map((item) => (
                  <Link key={item.name} href={item.href} className="nav-link mobile-item">
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="nav-cta">
                <Button asChild variant="outline" className="nav-btn secondary">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="nav-btn primary">
                  <Link href="/signin">Sign Up</Link>
                </Button>
              </div>
            </div>
        </div>
      </nav>
    </header>
  );
};
