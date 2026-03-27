"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { DEPARTMENTS, type BusinessSummary } from "@triageai/shared";
import { apiFetch } from "@/lib/client/api";

type SettingsResponse = { business: BusinessSummary };

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

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="db-field">
      <label className="db-label-field">{label}</label>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<BusinessSummary | null>(null);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

  useEffect(() => { void loadSettings(); }, []);

  function patch(key: keyof SettingsForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((c) => c ? { ...c, [key]: e.target.value } : c);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (logoFile)   formData.append("logo", logoFile);
      if (headerFile) formData.append("header_image", headerFile);

      const response = await apiFetch<{ business: BusinessSummary }>("/api/business/settings", { method: "POST", body: formData });
      setBusiness(response.business);
      setForm(toFormState(response.business));
      setLogoFile(null);
      setHeaderFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) return <p style={{ margin: 0, color: "var(--ds-text-3)", fontSize: 13 }}>Loading…</p>;

  return (
    <form onSubmit={onSubmit} className="db-page">

      {/* ── Page header ── */}
      <div className="db-page-header">
        <div className="db-page-title-row">
          <div>
            <div className="db-label-section">Configuration</div>
            <h1 className="db-page-title" style={{ marginTop: 4 }}>Company Settings</h1>
            <p className="db-page-desc">Business details, onboarding answers, and brand assets.</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {saved && <span className="db-badge db-badge-green">Saved</span>}
            <button type="submit" className="db-btn db-btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="db-alert-error">{error}</div>}

      {/* ── Three-column grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, alignItems: "start" }}>

        {/* Business details */}
        <div className="db-card">
          <div className="db-card-header">
            <span className="db-card-title">Business Details</span>
          </div>
          <div className="db-card-body" style={{ display: "grid", gap: 12 }}>
            <FieldGroup label="Business name">
              <input id="business_name" className="db-input" value={form.business_name} onChange={patch("business_name")} />
            </FieldGroup>
            <FieldGroup label="Legal name">
              <input id="legal_name" className="db-input" value={form.legal_name} onChange={patch("legal_name")} />
            </FieldGroup>
            <FieldGroup label="Primary department">
              <select id="primary_department" className="db-select" value={form.primary_department} onChange={patch("primary_department")}>
                <option value="" disabled>Select department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d.replaceAll("_", " ")}</option>
                ))}
              </select>
            </FieldGroup>
            <FieldGroup label="Support email">
              <input id="support_email" type="email" className="db-input" value={form.support_email} onChange={patch("support_email")} />
            </FieldGroup>
            <FieldGroup label="Phone">
              <input id="phone" className="db-input" value={form.phone} onChange={patch("phone")} />
            </FieldGroup>
            <FieldGroup label="Website">
              <input id="website" className="db-input" value={form.website} onChange={patch("website")} />
            </FieldGroup>
          </div>
        </div>

        {/* Location & header */}
        <div className="db-card">
          <div className="db-card-header">
            <span className="db-card-title">Location &amp; Header</span>
          </div>
          <div className="db-card-body" style={{ display: "grid", gap: 12 }}>
            <FieldGroup label="Address">
              <input id="address_line" className="db-input" value={form.address_line} onChange={patch("address_line")} />
            </FieldGroup>
            <FieldGroup label="City">
              <input id="city" className="db-input" value={form.city} onChange={patch("city")} />
            </FieldGroup>
            <FieldGroup label="Country">
              <input id="country" className="db-input" value={form.country} onChange={patch("country")} />
            </FieldGroup>
            <FieldGroup label="Timezone">
              <input id="timezone" className="db-input" value={form.timezone} onChange={patch("timezone")} />
            </FieldGroup>
            <FieldGroup label="Header headline">
              <input id="hero_headline" className="db-input" value={form.hero_headline} onChange={patch("hero_headline")} />
            </FieldGroup>
            <FieldGroup label="Header subheadline">
              <input id="hero_subheadline" className="db-input" value={form.hero_subheadline} onChange={patch("hero_subheadline")} />
            </FieldGroup>
          </div>
        </div>

        {/* Brand assets */}
        <div className="db-card">
          <div className="db-card-header">
            <span className="db-card-title">Brand Assets</span>
          </div>
          <div className="db-card-body" style={{ display: "grid", gap: 16 }}>
            <div>
              <div className="db-label-section" style={{ marginBottom: 8 }}>Logo</div>
              <div style={{
                borderRadius: 6,
                border: "1px solid var(--ds-border)",
                background: business?.logo_url ? `url(${business.logo_url}) center/contain no-repeat` : "var(--ds-page)",
                height: 72,
                marginBottom: 8,
              }} />
              <input type="file" accept="image/*" style={{ fontSize: 12, color: "var(--ds-text-2)" }}
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
            </div>

            <div>
              <div className="db-label-section" style={{ marginBottom: 8 }}>Header Image</div>
              <div style={{
                borderRadius: 6,
                border: "1px solid var(--ds-border)",
                background: business?.header_image_url ? `url(${business.header_image_url}) center/cover` : "var(--ds-page)",
                height: 100,
                marginBottom: 8,
              }} />
              <input type="file" accept="image/*" style={{ fontSize: 12, color: "var(--ds-text-2)" }}
                onChange={(e) => setHeaderFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tailoring answers ── */}
      <div className="db-card">
        <div className="db-card-header">
          <span className="db-card-title">Tailoring Answers</span>
          <span style={{ fontSize: 12, color: "var(--ds-text-3)" }}>Used by the AI to personalise scheduling recommendations</span>
        </div>
        <div className="db-card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            {([
              { key: "care_model",       label: "Care model" },
              { key: "patient_volume",   label: "Patient volume" },
              { key: "workflow_needs",   label: "Workflow needs" },
              { key: "brand_tone",       label: "Brand tone" },
              { key: "intake_priorities",label: "Intake priorities" },
              { key: "brand_summary",    label: "Brand summary" },
              { key: "workflow_summary", label: "Workflow summary" },
            ] as { key: keyof SettingsForm; label: string }[]).map(({ key, label }) => (
              <div key={key} className="db-field">
                <label className="db-label-field" htmlFor={key}>{label}</label>
                <textarea
                  id={key}
                  className="db-textarea"
                  value={form[key]}
                  onChange={patch(key)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom save bar */}
      <div style={{
        position: "sticky",
        bottom: 0,
        background: "rgba(240,244,248,0.9)",
        backdropFilter: "blur(8px)",
        padding: "12px 0",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <button type="submit" className="db-btn db-btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save Company Settings"}
        </button>
        {saved && <span className="db-badge db-badge-green">Changes saved</span>}
        {error && <span className="db-alert-error" style={{ padding: "4px 10px" }}>{error}</span>}
      </div>
    </form>
  );
}
