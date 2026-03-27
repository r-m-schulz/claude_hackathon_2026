"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEPARTMENTS } from "@triageai/shared";

import { LogoIcon } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/client/supabase";

const selectStyle: CSSProperties = {
  width: "100%",
  borderRadius: "0.75rem",
  border: "1px solid #d6dde8",
  padding: "12px 14px",
  fontSize: 14,
  color: "#172033",
  background: "#ffffff",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 110,
  borderRadius: "0.75rem",
  border: "1px solid #d6dde8",
  padding: "12px 14px",
  fontSize: 14,
  fontFamily: "inherit",
  lineHeight: 1.6,
  resize: "vertical",
  color: "#172033",
  background: "#ffffff",
};

function FilePreview({
  file,
  label,
}: {
  file: File | null;
  label: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div
      style={{
        border: "1px solid #dbe2ee",
        borderRadius: 18,
        padding: 14,
        background: "#ffffff",
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </p>
      {previewUrl ? (
        <div
          style={{
            marginTop: 12,
            minHeight: 120,
            borderRadius: 14,
            backgroundImage: `url(${previewUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: "1px solid #e2e8f0",
          }}
        />
      ) : (
        <div
          style={{
            marginTop: 12,
            minHeight: 120,
            borderRadius: 14,
            border: "1px dashed #cbd5e1",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            color: "#64748b",
            padding: 16,
            lineHeight: 1.5,
          }}
        >
          {file ? `${file.name} selected` : "Upload an image to preview your clinic branding"}
        </div>
      )}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);

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

    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch("/api/business/signup", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setLoading(false);
      setError(data?.error ?? "Unable to create the business workspace.");
      return;
    }

    const ownerEmail = String(formData.get("owner_email") ?? "");
    const ownerPassword = String(formData.get("owner_password") ?? "");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ownerEmail,
      password: ownerPassword,
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
        background:
          "radial-gradient(circle at top left, rgba(34,197,94,0.14), transparent 24%), radial-gradient(circle at top right, rgba(59,130,246,0.12), transparent 26%), #f5f7fb",
        padding: "32px 20px 64px",
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gap: 20 }}>
        <section
          style={{
            borderRadius: 30,
            background: "linear-gradient(135deg, #0f172a 0%, #115e59 100%)",
            color: "#f8fafc",
            padding: "36px 32px",
            display: "grid",
            gap: 22,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 720 }}>
              <Link href="/" aria-label="go home" style={{ display: "inline-flex" }}>
                <LogoIcon />
              </Link>
              <p
                style={{
                  margin: "24px 0 12px",
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(191,219,254,0.9)",
                }}
              >
                Business Signup
              </p>
              <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.05 }}>
                Build a branded doctor workspace that fits how your clinic runs.
              </h1>
              <p style={{ marginTop: 18, maxWidth: 620, lineHeight: 1.7, color: "rgba(226,232,240,0.88)" }}>
                Create the practice, answer onboarding questions, upload your logo and header image, and start with a
                business workspace tailored to your team.
              </p>
            </div>

            <div
              style={{
                minWidth: 260,
                border: "1px solid rgba(148,163,184,0.28)",
                borderRadius: 22,
                padding: 20,
                background: "rgba(15,23,42,0.24)",
                backdropFilter: "blur(14px)",
              }}
            >
              <p style={{ margin: 0, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: "#bfdbfe" }}>
                Included
              </p>
              <ul style={{ margin: "14px 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
                <li>Branded business header and company settings</li>
                <li>Practitioner and HR employee roles</li>
                <li>Patients with notes, uploads, and OCR context</li>
                <li>Patient account pairing from the business view</li>
              </ul>
            </div>
          </div>
        </section>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 20 }}>
          <section
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #dbe2ee",
                borderRadius: 24,
                padding: 24,
                display: "grid",
                gap: 18,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>Practice profile</h2>
                <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
                  Set the core business details for the clinic.
                </p>
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="business_name">Business name</Label>
                  <Input id="business_name" name="business_name" required placeholder="Northside Dermatology Clinic" />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="legal_name">Legal name</Label>
                  <Input id="legal_name" name="legal_name" placeholder="Northside Dermatology Ltd" />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="primary_department">Primary department</Label>
                  <select id="primary_department" name="primary_department" required style={selectStyle} defaultValue="">
                    <option value="" disabled>
                      Select the main specialty
                    </option>
                    {DEPARTMENTS.map((department) => (
                      <option key={department} value={department}>
                        {department.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="support_email">Support email</Label>
                  <Input id="support_email" name="support_email" type="email" placeholder="hello@northsideclinic.ie" />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" placeholder="+353 1 555 0123" />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" name="website" placeholder="https://northsideclinic.ie" />
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #dbe2ee",
                borderRadius: 24,
                padding: 24,
                display: "grid",
                gap: 18,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>Location and brand</h2>
                <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
                  These answers shape the company header and business settings page.
                </p>
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="address_line">Address</Label>
                  <Input id="address_line" name="address_line" placeholder="12 Main Street" />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" placeholder="Dublin" />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" placeholder="Ireland" />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" name="timezone" defaultValue="Europe/Dublin" />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="hero_headline">Header headline</Label>
                  <Input id="hero_headline" name="hero_headline" placeholder="Fast, patient-first dermatology care" />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="hero_subheadline">Header subheadline</Label>
                  <Input
                    id="hero_subheadline"
                    name="hero_subheadline"
                    placeholder="Built for quick specialist access, better intake, and clear follow-up."
                  />
                </div>
              </div>
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(300px, 0.8fr)",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #dbe2ee",
                borderRadius: 24,
                padding: 24,
                display: "grid",
                gap: 18,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>Tailoring questions</h2>
                <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
                  Tell the workspace how your business operates so the company header, settings, and workflow context
                  reflect your clinic.
                </p>
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="care_model">How do you describe your care model?</Label>
                  <textarea
                    id="care_model"
                    name="care_model"
                    style={textareaStyle}
                    placeholder="Boutique dermatology practice focused on rapid lesion review and preventative skin health."
                  />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="patient_volume">What is your typical patient volume?</Label>
                  <textarea
                    id="patient_volume"
                    name="patient_volume"
                    style={textareaStyle}
                    placeholder="We see 30-40 patients per day with a mix of new referrals and return visits."
                  />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="workflow_needs">What workflow or calendar support matters most?</Label>
                  <textarea
                    id="workflow_needs"
                    name="workflow_needs"
                    style={textareaStyle}
                    placeholder="HR and reception handle intake, follow-up scheduling, referral uploads, and rebooking."
                  />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="brand_tone">What tone should the business header and copy use?</Label>
                  <textarea
                    id="brand_tone"
                    name="brand_tone"
                    style={textareaStyle}
                    placeholder="Warm, highly professional, reassuring, and modern."
                  />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="intake_priorities">What intake priorities should staff keep in mind?</Label>
                  <textarea
                    id="intake_priorities"
                    name="intake_priorities"
                    style={textareaStyle}
                    placeholder="Image quality, urgent lesion changes, referral context, and continuity for vulnerable patients."
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #dbe2ee",
                  borderRadius: 24,
                  padding: 24,
                  display: "grid",
                  gap: 14,
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: 24 }}>Brand assets</h2>
                  <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
                    Upload visuals your business can reuse as the company header and logo.
                  </p>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <Label htmlFor="logo">Logo image</Label>
                    <input
                      id="logo"
                      name="logo"
                      type="file"
                      accept="image/*"
                      onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <Label htmlFor="header_image">Header image</Label>
                    <input
                      id="header_image"
                      name="header_image"
                      type="file"
                      accept="image/*"
                      onChange={(event) => setHeaderFile(event.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
              </div>

              <FilePreview file={logoFile} label="Logo preview" />
              <FilePreview file={headerFile} label="Header preview" />
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #dbe2ee",
                borderRadius: 24,
                padding: 24,
                display: "grid",
                gap: 16,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>Owner account</h2>
                <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
                  This first account becomes the initial business owner and practitioner admin.
                </p>
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="owner_full_name">Owner full name</Label>
                  <Input id="owner_full_name" name="owner_full_name" required placeholder="Dr Alex Murphy" />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="owner_email">Owner email</Label>
                  <Input id="owner_email" name="owner_email" type="email" required placeholder="alex@northsideclinic.ie" />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor="owner_password">Password</Label>
                  <Input id="owner_password" name="owner_password" type="password" required placeholder="Choose a password" />
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #dbe2ee",
                borderRadius: 24,
                padding: 24,
                display: "grid",
                gap: 16,
                alignContent: "space-between",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>After signup</h2>
                <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
                  You will land in a business dashboard where you can add employees, add patients, upload files,
                  capture OCR-style context, and manage business settings.
                </p>
              </div>

              {error ? <p style={{ margin: 0, color: "#b91c1c", lineHeight: 1.6 }}>{error}</p> : null}

              <div style={{ display: "grid", gap: 12 }}>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating workspace..." : "Create Business Workspace"}
                </Button>
                <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                  Already have a workspace?
                  <Button asChild variant="link" className="px-2">
                    <Link href="/login">Sign in</Link>
                  </Button>
                </p>
              </div>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
