"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DEPARTMENTS, type BusinessPatientSummary, type BusinessWorkspaceSummary } from "@triageai/shared";
import { apiFetch } from "@/lib/client/api";

export default function PatientsPage() {
  const [patients, setPatients] = useState<BusinessPatientSummary[]>([]);
  const [workspace, setWorkspace] = useState<BusinessWorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingPatient, setSavingPatient] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    dob: "",
    department: "",
    assigned_practitioner_id: "",
    portal_email: "",
    portal_password: "",
  });

  const practitioners = useMemo(
    () => workspace?.employees.filter((e) => e.role === "practitioner") ?? [],
    [workspace],
  );

  async function loadData() {
    try {
      const [workspaceResponse, patientResponse] = await Promise.all([
        apiFetch<BusinessWorkspaceSummary>("/api/business/workspace"),
        apiFetch<{ patients: BusinessPatientSummary[] }>("/api/business/patients"),
      ]);
      setWorkspace(workspaceResponse);
      setPatients(patientResponse.patients);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load patients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  async function onCreatePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPatient(true);
    setPatientError(null);

    try {
      await apiFetch("/api/business/patients", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          assigned_practitioner_id: form.assigned_practitioner_id || null,
          portal_email: form.portal_email || null,
          portal_password: form.portal_password || null,
        }),
      });

      setForm({ full_name: "", email: "", phone: "", dob: "", department: "", assigned_practitioner_id: "", portal_email: "", portal_password: "" });
      await loadData();
    } catch (submitError) {
      setPatientError(submitError instanceof Error ? submitError.message : "Unable to create patient.");
    } finally {
      setSavingPatient(false);
    }
  }

  async function onDeletePatient(patientId: string) {
    if (!window.confirm("Remove this patient from the business workspace?")) return;

    try {
      await apiFetch(`/api/business/patients/${patientId}`, { method: "DELETE" });
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to remove patient.");
    }
  }

  if (loading) return <p style={{ margin: 0, color: "var(--ds-text-3)", fontSize: 13 }}>Loading…</p>;
  if (error)   return <div className="db-alert-error">{error}</div>;

  const paired   = patients.filter((p) => p.is_paired).length;
  const unpaired = patients.length - paired;

  return (
    <div className="db-page">

      {/* ── Page header ── */}
      <div className="db-page-header">
        <div className="db-page-title-row">
          <div>
            <div className="db-label-section">Patient Management</div>
            <h1 className="db-page-title" style={{ marginTop: 4 }}>Patients</h1>
            <p className="db-page-desc">Add records, pair portal accounts, and manage clinical assignments.</p>
          </div>
        </div>

        <div className="db-stat-row">
          {[
            { label: "Total patients",   value: patients.length },
            { label: "Portal paired",    value: paired },
            { label: "Unpaired",         value: unpaired },
            { label: "Practitioners",    value: practitioners.length },
          ].map(({ label, value }) => (
            <div key={label} className="db-stat-chip">
              <div className="db-stat-chip-label">{label}</div>
              <div className="db-stat-chip-value">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 16, alignItems: "start" }}>

        {/* Patient table */}
        <div className="db-card">
          <div className="db-card-header">
            <span className="db-card-title">All Patients</span>
            <span style={{ fontSize: 12, color: "var(--ds-text-3)" }}>{patients.length} records</span>
          </div>

          {patients.length === 0 ? (
            <div style={{ padding: 16 }}>
              <div className="db-empty">No patients yet. Use the form to add the first record.</div>
            </div>
          ) : (
            <table className="db-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>DOB</th>
                  <th>Department</th>
                  <th>Practitioner</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{patient.full_name}</div>
                    </td>
                    <td style={{ color: "var(--ds-text-2)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                      {patient.dob}
                    </td>
                    <td style={{ color: "var(--ds-text-2)" }}>
                      {patient.department.replaceAll("_", " ")}
                    </td>
                    <td style={{ color: "var(--ds-text-2)" }}>
                      {patient.primary_practitioner_name ?? <span style={{ color: "var(--ds-text-3)" }}>Unassigned</span>}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--ds-text-3)" }}>
                      {patient.email ?? patient.phone ?? "—"}
                    </td>
                    <td>
                      <span className={`db-dot ${patient.is_paired ? "db-dot-green" : "db-dot-amber"}`}>
                        {patient.is_paired ? "Paired" : "Unpaired"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link href={`/patients/${patient.id}`} className="db-btn db-btn-secondary" style={{ fontSize: 12, padding: "4px 9px" }}>
                          Profile
                        </Link>
                        <button
                          type="button"
                          className="db-btn db-btn-danger"
                          style={{ fontSize: 12, padding: "4px 9px" }}
                          onClick={() => onDeletePatient(patient.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add patient form */}
        <form onSubmit={onCreatePatient} className="db-card" style={{ padding: 16, display: "grid", gap: 12 }}>
          <div>
            <div className="db-card-title">Add Patient</div>
            <div style={{ fontSize: 12, color: "var(--ds-text-3)", marginTop: 3, lineHeight: 1.5 }}>
              Pair a portal account now or later from the patient profile.
            </div>
          </div>

          <hr className="db-divider" />

          <div className="db-field">
            <label className="db-label-field" htmlFor="full_name">Full name</label>
            <input id="full_name" type="text" required className="db-input" value={form.full_name}
              onChange={(e) => setForm((c) => ({ ...c, full_name: e.target.value }))} />
          </div>

          <div className="db-field">
            <label className="db-label-field" htmlFor="email">Contact email</label>
            <input id="email" type="email" className="db-input" value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
          </div>

          <div className="db-field">
            <label className="db-label-field" htmlFor="phone">Phone</label>
            <input id="phone" type="text" className="db-input" value={form.phone}
              onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} />
          </div>

          <div className="db-field">
            <label className="db-label-field" htmlFor="dob">Date of birth</label>
            <input id="dob" type="date" required className="db-input" value={form.dob}
              onChange={(e) => setForm((c) => ({ ...c, dob: e.target.value }))} />
          </div>

          <div className="db-field">
            <label className="db-label-field" htmlFor="department">Department</label>
            <select id="department" required className="db-select" value={form.department}
              onChange={(e) => setForm((c) => ({ ...c, department: e.target.value }))}>
              <option value="" disabled>Select department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d.replaceAll("_", " ")}</option>
              ))}
            </select>
          </div>

          <div className="db-field">
            <label className="db-label-field" htmlFor="assigned_practitioner">Assigned practitioner</label>
            <select id="assigned_practitioner" className="db-select" value={form.assigned_practitioner_id}
              onChange={(e) => setForm((c) => ({ ...c, assigned_practitioner_id: e.target.value }))}>
              <option value="">Leave unassigned</option>
              {practitioners.map((e) => (
                <option key={e.id} value={e.linked_clinician_id ?? ""}>{e.full_name}</option>
              ))}
            </select>
          </div>

          <div style={{ padding: "10px 12px", background: "#F8FAFC", border: "1px solid var(--ds-border)", borderRadius: 6, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ds-text-3)" }}>
              Portal pairing (optional)
            </div>
            <div className="db-field">
              <label className="db-label-field" htmlFor="portal_email">Portal email</label>
              <input id="portal_email" type="email" className="db-input" value={form.portal_email}
                onChange={(e) => setForm((c) => ({ ...c, portal_email: e.target.value }))} />
            </div>
            <div className="db-field">
              <label className="db-label-field" htmlFor="portal_password">Temp password</label>
              <input id="portal_password" type="password" className="db-input" value={form.portal_password}
                onChange={(e) => setForm((c) => ({ ...c, portal_password: e.target.value }))} />
            </div>
          </div>

          {patientError && <div className="db-alert-error">{patientError}</div>}

          <button type="submit" className="db-btn db-btn-primary" disabled={savingPatient} style={{ width: "100%" }}>
            {savingPatient ? "Creating…" : "Add Patient"}
          </button>
        </form>
      </div>
    </div>
  );
}
