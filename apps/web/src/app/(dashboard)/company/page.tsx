"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DEPARTMENTS, type BusinessWorkspaceSummary } from "@triageai/shared";
import { apiFetch } from "@/lib/client/api";

function formatRole(role: string) {
  return role === "hr" ? "HR" : "Practitioner";
}

export default function CompanyPage() {
  const [workspace, setWorkspace] = useState<BusinessWorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "practitioner",
    department: "",
    job_title: "",
  });

  async function loadWorkspace() {
    try {
      const nextWorkspace = await apiFetch<BusinessWorkspaceSummary>("/api/business/workspace");
      setWorkspace(nextWorkspace);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load company workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadWorkspace(); }, []);

  async function onCreateEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingEmployee(true);
    setEmployeeError(null);

    try {
      await apiFetch("/api/business/employees", {
        method: "POST",
        body: JSON.stringify({
          ...employeeForm,
          department: employeeForm.role === "practitioner" ? employeeForm.department : null,
        }),
      });

      setEmployeeForm({ full_name: "", email: "", password: "", role: "practitioner", department: "", job_title: "" });
      await loadWorkspace();
    } catch (submitError) {
      setEmployeeError(submitError instanceof Error ? submitError.message : "Unable to add employee.");
    } finally {
      setSavingEmployee(false);
    }
  }

  if (loading) return <p style={{ margin: 0, color: "var(--ds-text-3)", fontSize: 13 }}>Loading…</p>;

  if (error || !workspace) {
    return <div className="db-alert-error">{error ?? "Unable to load company workspace."}</div>;
  }

  const { business, employees, recent_patients: recentPatients } = workspace;
  const practitioners = employees.filter((e) => e.role === "practitioner");
  const hrStaff = employees.filter((e) => e.role === "hr");

  return (
    <div className="db-page">

      {/* ── Page header ── */}
      <div className="db-page-header">
        <div className="db-page-title-row">
          <div>
            <div className="db-label-section">Company Workspace</div>
            <h1 className="db-page-title" style={{ marginTop: 4 }}>{business.name}</h1>
            {business.hero_headline && (
              <p className="db-page-desc">{business.hero_headline}</p>
            )}
          </div>
          <Link href="/settings" className="db-btn db-btn-secondary">Settings</Link>
        </div>

        <div className="db-stat-row">
          {[
            { label: "Employees",   value: employees.length },
            { label: "Practitioners", value: practitioners.length },
            { label: "HR / Reception", value: hrStaff.length },
            { label: "Patients",    value: workspace.patient_count },
          ].map(({ label, value }) => (
            <div key={label} className="db-stat-chip">
              <div className="db-stat-chip-label">{label}</div>
              <div className="db-stat-chip-value">{value}</div>
            </div>
          ))}
          {business.city && (
            <div className="db-stat-chip">
              <div className="db-stat-chip-label">Location</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-text)", marginTop: 4 }}>
                {business.city}{business.country ? `, ${business.country}` : ""}
              </div>
            </div>
          )}
          {business.primary_department && (
            <div className="db-stat-chip">
              <div className="db-stat-chip-label">Department</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-text)", marginTop: 4 }}>
                {business.primary_department.replaceAll("_", " ")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Onboarding metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { label: "Care model",    value: business.onboarding_answers.care_model },
          { label: "Patient volume", value: business.onboarding_answers.patient_volume },
          { label: "Workflow needs", value: business.onboarding_answers.workflow_needs },
          { label: "Brand tone",    value: business.onboarding_answers.brand_tone },
        ].map(({ label, value }) => (
          <div key={label} className="db-card" style={{ padding: "12px 14px" }}>
            <div className="db-label-section" style={{ marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 13, color: "var(--ds-text-2)", lineHeight: 1.5 }}>
              {value || <span style={{ color: "var(--ds-text-3)", fontStyle: "italic" }}>Not set</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 16, alignItems: "start" }}>

        {/* Left column */}
        <div style={{ display: "grid", gap: 16 }}>

          {/* Employees table */}
          <div className="db-card">
            <div className="db-card-header">
              <span className="db-card-title">Employees</span>
              <span style={{ fontSize: 12, color: "var(--ds-text-3)" }}>{employees.length} total</span>
            </div>
            {employees.length === 0 ? (
              <div style={{ padding: 16 }}>
                <div className="db-empty">No employees yet. Use the form to add the first team member.</div>
              </div>
            ) : (
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Title</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{employee.full_name}</div>
                        {employee.is_owner && (
                          <span className="db-badge db-badge-blue" style={{ marginTop: 3 }}>Owner</span>
                        )}
                      </td>
                      <td>
                        <span className={`db-badge ${employee.role === "practitioner" ? "db-badge-green" : "db-badge-gray"}`}>
                          {formatRole(employee.role)}
                        </span>
                      </td>
                      <td style={{ color: "var(--ds-text-2)" }}>
                        {employee.department ? employee.department.replaceAll("_", " ") : "—"}
                      </td>
                      <td style={{ color: "var(--ds-text-2)" }}>
                        {employee.job_title || "—"}
                      </td>
                      <td style={{ color: "var(--ds-text-3)", fontSize: 12 }}>{employee.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent patients */}
          <div className="db-card">
            <div className="db-card-header">
              <span className="db-card-title">Recent Patients</span>
              <Link href="/patients" className="db-btn db-btn-secondary" style={{ fontSize: 12, padding: "5px 10px" }}>
                View all
              </Link>
            </div>
            {recentPatients.length === 0 ? (
              <div style={{ padding: 16 }}>
                <div className="db-empty">No patients yet. Add from the Patients page.</div>
              </div>
            ) : (
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Practitioner</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentPatients.map((patient) => (
                    <tr key={patient.id}>
                      <td style={{ fontWeight: 600 }}>{patient.full_name}</td>
                      <td style={{ color: "var(--ds-text-2)" }}>{patient.department.replaceAll("_", " ")}</td>
                      <td style={{ color: "var(--ds-text-2)" }}>{patient.primary_practitioner_name ?? "Unassigned"}</td>
                      <td>
                        <span className={`db-dot ${patient.is_paired ? "db-dot-green" : "db-dot-amber"}`}>
                          {patient.is_paired ? "Paired" : "Unpaired"}
                        </span>
                      </td>
                      <td>
                        <Link href={`/patients/${patient.id}`} className="db-btn db-btn-secondary" style={{ fontSize: 12, padding: "4px 9px" }}>
                          Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Add employee form */}
        <form onSubmit={onCreateEmployee} className="db-card" style={{ padding: 16, display: "grid", gap: 12 }}>
          <div>
            <div className="db-card-title">Add Employee</div>
            <div style={{ fontSize: 12, color: "var(--ds-text-3)", marginTop: 3, lineHeight: 1.5 }}>
              Practitioners get clinical access; HR handles workflow and scheduling.
            </div>
          </div>

          <hr className="db-divider" />

          {[
            { id: "employee_name", label: "Full name", key: "full_name", type: "text", placeholder: "Jordan Casey", required: true },
            { id: "employee_email", label: "Email", key: "email", type: "email", placeholder: "jordan@clinic.ie", required: true },
            { id: "employee_password", label: "Temp password", key: "password", type: "password", placeholder: "••••••••", required: true },
            { id: "employee_title", label: "Job title", key: "job_title", type: "text", placeholder: employeeForm.role === "hr" ? "Reception lead" : "Consultant", required: false },
          ].map(({ id, label, key, type, placeholder, required }) => (
            <div key={id} className="db-field">
              <label className="db-label-field" htmlFor={id}>{label}</label>
              <input
                id={id}
                type={type}
                required={required}
                placeholder={placeholder}
                className="db-input"
                value={employeeForm[key as keyof typeof employeeForm]}
                onChange={(e) => setEmployeeForm((c) => ({ ...c, [key]: e.target.value }))}
              />
            </div>
          ))}

          <div className="db-field">
            <label className="db-label-field" htmlFor="employee_role">Role</label>
            <select
              id="employee_role"
              className="db-select"
              value={employeeForm.role}
              onChange={(e) => setEmployeeForm((c) => ({
                ...c, role: e.target.value,
                department: e.target.value === "practitioner" ? c.department : "",
              }))}
            >
              <option value="practitioner">Practitioner</option>
              <option value="hr">HR / Reception</option>
            </select>
          </div>

          {employeeForm.role === "practitioner" && (
            <div className="db-field">
              <label className="db-label-field" htmlFor="employee_department">Department</label>
              <select
                id="employee_department"
                className="db-select"
                value={employeeForm.department}
                required
                onChange={(e) => setEmployeeForm((c) => ({ ...c, department: e.target.value }))}
              >
                <option value="" disabled>Select department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d.replaceAll("_", " ")}</option>
                ))}
              </select>
            </div>
          )}

          {employeeError && <div className="db-alert-error">{employeeError}</div>}

          <button type="submit" className="db-btn db-btn-primary" disabled={savingEmployee} style={{ width: "100%" }}>
            {savingEmployee ? "Adding…" : "Add Employee"}
          </button>
        </form>
      </div>
    </div>
  );
}
