"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { LogoIcon } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/client/supabase";

const VALUE_POINTS = [
  "Branded business onboarding and settings",
  "Practitioner and HR workspace roles",
  "Patient records with paired account management",
  "Document uploads with OCR-style extracted context",
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/company");
      }
    });
  }, [router, supabase.auth]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setLoading(false);
      setError("Email and password are required.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace("/company");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(320px, 1.08fr) minmax(360px, 0.92fr)",
        background:
          "linear-gradient(135deg, rgba(12, 24, 40, 0.98) 0%, rgba(13, 74, 72, 0.95) 46%, #f5f7fb 46%, #f5f7fb 100%)",
      }}
    >
      <section
        style={{
          padding: "72px 56px",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 32,
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <Link href="/" aria-label="go home" style={{ display: "inline-flex" }}>
            <LogoIcon />
          </Link>

          <p
            style={{
              marginTop: 36,
              marginBottom: 12,
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(191, 219, 254, 0.9)",
            }}
          >
            Practice Operations
          </p>
          <h1 style={{ margin: 0, fontSize: 46, lineHeight: 1.02 }}>
            Sign in to your clinic workspace.
          </h1>
          <p style={{ marginTop: 22, maxWidth: 460, lineHeight: 1.7, color: "rgba(226,232,240,0.86)" }}>
            TriageAI now supports business-first setup for doctors, practitioners, and HR teams with one shared view
            of patients, notes, uploads, and practice branding.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            maxWidth: 560,
          }}
        >
          {VALUE_POINTS.map((point) => (
            <div
              key={point}
              style={{
                border: "1px solid rgba(148,163,184,0.26)",
                borderRadius: 18,
                padding: "18px 16px",
                background: "rgba(15,23,42,0.24)",
                backdropFilter: "blur(14px)",
                lineHeight: 1.55,
              }}
            >
              {point}
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <form
          onSubmit={onSubmit}
          style={{
            width: "100%",
            maxWidth: 440,
            background: "#ffffff",
            borderRadius: 24,
            border: "1px solid #dbe2ee",
            boxShadow: "0 28px 70px rgba(15, 23, 42, 0.14)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 32 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 30 }}>Welcome back</h2>
              <p style={{ marginTop: 10, color: "#475569", lineHeight: 1.6 }}>
                Sign in with the account linked to your practice, practitioner, or HR workspace.
              </p>
            </div>

            <div style={{ display: "grid", gap: 18, marginTop: 28 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="doctor@yourclinic.ie"
                />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Doctor, practitioner, or HR account</span>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error ? <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>{error}</p> : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In to Workspace"}
              </Button>
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              background: "#f8fafc",
              padding: "18px 32px",
              color: "#475569",
              fontSize: 14,
            }}
          >
            Setting up a new clinic?
            <Button asChild variant="link" className="px-2">
              <Link href="/signin">Create a business workspace</Link>
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
