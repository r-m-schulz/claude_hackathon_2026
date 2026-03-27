"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { DEPARTMENTS, type BusinessSummary } from "@triageai/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/client/api";

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

type SettingsResponse = {
  business: BusinessSummary;
};

type SettingsForm = {
  business_name: string;
  legal_name: string;
  primary_department: string;
  support_email: string;
  phone: string;
  website: string;
  address_line: string;
  city: string;
  country: string;
  timezone: string;
  hero_headline: string;
  hero_subheadline: string;
  brand_summary: string;
  workflow_summary: string;
  care_model: string;
  patient_volume: string;
  workflow_needs: string;
  brand_tone: string;
  intake_priorities: string;
};

function toFormState(business: BusinessSummary): SettingsForm {
  return {
    business_name: business.name ?? "",
    legal_name: business.legal_name ?? "",
    primary_department: business.primary_department ?? "",
    support_email: business.support_email ?? "",
    phone: business.phone ?? "",
    website: business.website ?? "",
    address_line: business.address_line ?? "",
    city: business.city ?? "",
    country: business.country ?? "",
    timezone: business.timezone ?? "Europe/Dublin",
    hero_headline: business.hero_headline ?? "",
    hero_subheadline: business.hero_subheadline ?? "",
    brand_summary: business.brand_summary ?? "",
    workflow_summary: business.workflow_summary ?? "",
    care_model: business.onboarding_answers.care_model ?? "",
    patient_volume: business.onboarding_answers.patient_volume ?? "",
    workflow_needs: business.onboarding_answers.workflow_needs ?? "",
    brand_tone: business.onboarding_answers.brand_tone ?? "",
    intake_priorities: business.onboarding_answers.intake_priorities ?? "",
  };
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<BusinessSummary | null>(null);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSettings() {
    try {
      const response = await apiFetch<SettingsResponse>("/api/business/settings");
      setBusiness(response.business);
      setForm(toFormState(response.business));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      if (headerFile) {
        formData.append("header_image", headerFile);
      }

      const response = await apiFetch<{ business: BusinessSummary }>("/api/business/settings", {
        method: "POST",
        body: formData,
      });

      setBusiness(response.business);
      setForm(toFormState(response.business));
      setLogoFile(null);
      setHeaderFile(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return <p style={{ margin: 0, color: "#64748b" }}>Loading settings...</p>;
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <header
        style={{
          borderRadius: 24,
          border: "1px solid #dbe2ee",
          background: "#ffffff",
          padding: 24,
          display: "grid",
          gap: 14,
        }}
      >
        <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#64748b" }}>
          Settings
        </p>
        <h1 style={{ margin: 0, fontSize: 34 }}>Company settings</h1>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
          Update the business details, onboarding answers, and brand assets used to tailor the workspace header and
          company profile.
        </p>
      </header>

      {error ? (
        <section
          style={{
            borderRadius: 18,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            padding: 18,
            color: "#991b1b",
          }}
        >
          {error}
        </section>
      ) : null}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 20 }}>
        <section
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          <article
            style={{
              borderRadius: 24,
              border: "1px solid #dbe2ee",
              background: "#ffffff",
              padding: 24,
              display: "grid",
              gap: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 24 }}>Business details</h2>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <Label htmlFor="business_name">Business name</Label>
                <Input
                  id="business_name"
                  value={form.business_name}
                  onChange={(event) => setForm((current) => (current ? { ...current, business_name: event.target.value } : current))}
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <Label htmlFor="legal_name">Legal name</Label>
                <Input
                  id="legal_name"
                  value={form.legal_name}
                  onChange={(event) => setForm((current) => (current ? { ...current, legal_name: event.target.value } : current))}
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <Label htmlFor="primary_department">Primary department</Label>
                <select
                  id="primary_department"
                  value={form.primary_department}
                  onChange={(event) =>
                    setForm((current) => (current ? { ...current, primary_department: event.target.value } : current))
                  }
                  style={selectStyle}
                >
                  <option value="" disabled>
                    Select a department
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
                <Input
                  id="support_email"
                  type="email"
                  value={form.support_email}
                  onChange={(event) => setForm((current) => (current ? { ...current, support_email: event.target.value } : current))}
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => (current ? { ...current, phone: event.target.value } : current))}
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(event) => setForm((current) => (current ? { ...current, website: event.target.value } : current))}
                />
              </div>
            </div>
          </article>

          <article
            style={{
              borderRadius: 24,
              border: "1px solid #dbe2ee",
              background: "#ffffff",
              padding: 24,
              display: "grid",
              gap: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 24 }}>Header and location</h2>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <Label htmlFor="address_line">Address</Label>
                <Input
                  id="address_line"
                  value={form.address_line}
                  onChange={(event) => setForm((current) => (current ? { ...current, address_line: event.target.value } : current))}
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(event) => setForm((current) => (current ? { ...current, city: event.target.value } : current))}
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(event) => setForm((current) => (current ? { ...current, country: event.target.value } : current))}
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={form.timezone}
                  onChange={(event) => setForm((current) => (current ? { ...current, timezone: event.target.value } : current))}
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <Label htmlFor="hero_headline">Header headline</Label>
                <Input
                  id="hero_headline"
                  value={form.hero_headline}
                  onChange={(event) => setForm((current) => (current ? { ...current, hero_headline: event.target.value } : current))}
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <Label htmlFor="hero_subheadline">Header subheadline</Label>
                <Input
                  id="hero_subheadline"
                  value={form.hero_subheadline}
                  onChange={(event) => setForm((current) => (current ? { ...current, hero_subheadline: event.target.value } : current))}
                />
              </div>
            </div>
          </article>
        </section>

        <section
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(300px, 0.9fr)",
          }}
        >
          <article
            style={{
              borderRadius: 24,
              border: "1px solid #dbe2ee",
              background: "#ffffff",
              padding: 24,
              display: "grid",
              gap: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 24 }}>Tailoring answers</h2>
            <div style={{ display: "grid", gap: 16 }}>
              {[
                { key: "care_model", label: "Care model" },
                { key: "patient_volume", label: "Patient volume" },
                { key: "workflow_needs", label: "Workflow needs" },
                { key: "brand_tone", label: "Brand tone" },
                { key: "intake_priorities", label: "Intake priorities" },
                { key: "brand_summary", label: "Brand summary" },
                { key: "workflow_summary", label: "Workflow summary" },
              ].map((field) => (
                <div key={field.key} style={{ display: "grid", gap: 8 }}>
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <textarea
                    id={field.key}
                    value={form[field.key as keyof SettingsForm]}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, [field.key]: event.target.value } : current,
                      )
                    }
                    style={textareaStyle}
                  />
                </div>
              ))}
            </div>
          </article>

          <article
            style={{
              borderRadius: 24,
              border: "1px solid #dbe2ee",
              background: "#ffffff",
              padding: 24,
              display: "grid",
              gap: 16,
              alignContent: "start",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 24 }}>Brand assets</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 14, color: "#475569" }}>Current logo</div>
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid #e2e8f0",
                  background: business?.logo_url ? `url(${business.logo_url}) center/cover` : "#f8fafc",
                  minHeight: 120,
                }}
              />
              <input type="file" accept="image/*" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} />
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 14, color: "#475569" }}>Current header image</div>
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid #e2e8f0",
                  background: business?.header_image_url ? `url(${business.header_image_url}) center/cover` : "#f8fafc",
                  minHeight: 180,
                }}
              />
              <input type="file" accept="image/*" onChange={(event) => setHeaderFile(event.target.files?.[0] ?? null)} />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving settings..." : "Save Company Settings"}
            </Button>
          </article>
        </section>
      </form>
    </section>
  );
}
