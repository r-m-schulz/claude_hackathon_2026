"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DEPARTMENTS, type BusinessWorkspaceSummary } from "@triageai/shared";

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

function formatRole(role: string) {
  return role === "hr" ? "HR / Reception" : "Practitioner";
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

  useEffect(() => {
    void loadWorkspace();
  }, []);

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

      setEmployeeForm({
        full_name: "",
        email: "",
        password: "",
        role: "practitioner",
        department: "",
        job_title: "",
      });

      await loadWorkspace();
    } catch (submitError) {
      setEmployeeError(submitError instanceof Error ? submitError.message : "Unable to add employee.");
    } finally {
      setSavingEmployee(false);
    }
  }

  if (loading) {
    return <p style={{ margin: 0, color: "#64748b" }}>Loading company workspace...</p>;
  }

  if (error || !workspace) {
    return (
      <section
        style={{
          borderRadius: 18,
          border: "1px solid #fecaca",
          background: "#fef2f2",
          padding: 18,
          color: "#991b1b",
        }}
      >
        {error ?? "Unable to load company workspace."}
      </section>
    );
  }

  const { business, employees, recent_patients: recentPatients } = workspace;

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <section
        style={{
          borderRadius: 28,
          border: "1px solid #dbe2ee",
          padding: 28,
          background: business.header_image_url
            ? `linear-gradient(rgba(15,23,42,0.52), rgba(15,23,42,0.8)), url(${business.header_image_url}) center/cover`
            : "linear-gradient(135deg, #0f172a 0%, #115e59 100%)",
          color: "#f8fafc",
          display: "grid",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 700 }}>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#bfdbfe" }}>
              Company Workspace
            </p>
            <h1 style={{ margin: "10px 0 0", fontSize: 40, lineHeight: 1.05 }}>{business.name}</h1>
            <p style={{ margin: "14px 0 0", maxWidth: 560, lineHeight: 1.7, color: "rgba(226,232,240,0.88)" }}>
              {business.hero_headline ?? "Business workspace tailored to your clinic."}
            </p>
            {business.hero_subheadline ? (
              <p style={{ margin: "10px 0 0", maxWidth: 620, lineHeight: 1.65, color: "rgba(226,232,240,0.76)" }}>
                {business.hero_subheadline}
              </p>
            ) : null}
          </div>

          <div
            style={{
              minWidth: 240,
              borderRadius: 22,
              border: "1px solid rgba(148,163,184,0.26)",
              background: "rgba(15,23,42,0.26)",
              padding: 18,
              display: "grid",
              gap: 8,
            }}
          >
            <div>{employees.length} employees</div>
            <div>{workspace.patient_count} patients</div>
            <div>{business.primary_department?.replaceAll("_", " ") ?? "General practice"}</div>
            <div>{business.city ? `${business.city}, ${business.country ?? ""}`.trim() : business.timezone ?? "Europe/Dublin"}</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {[
            { label: "Care model", value: business.onboarding_answers.care_model || "Not provided yet" },
            { label: "Patient volume", value: business.onboarding_answers.patient_volume || "Not provided yet" },
            { label: "Workflow needs", value: business.onboarding_answers.workflow_needs || "Not provided yet" },
            { label: "Brand tone", value: business.onboarding_answers.brand_tone || "Not provided yet" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                borderRadius: 18,
                padding: 16,
                border: "1px solid rgba(148,163,184,0.24)",
                background: "rgba(15,23,42,0.24)",
                minHeight: 120,
              }}
            >
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#bfdbfe" }}>
                {item.label}
              </div>
              <div style={{ marginTop: 10, lineHeight: 1.6 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
          alignItems: "stretch",
        }}
      >
        <div style={{ display: "grid", gap: 18, gridTemplateRows: "auto 1fr", height: "100%" }}>
          <article
            style={{
              background: "#ffffff",
              border: "1px solid #dbe2ee",
              borderRadius: 24,
              padding: 24,
              display: "grid",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 26 }}>Employees</h2>
                <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
                  Manage practitioners and HR / reception staff from the company view.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/settings">Open settings</Link>
              </Button>
            </div>

            <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {employees.map((employee) => (
                <article
                  key={employee.id}
                  style={{
                    borderRadius: 18,
                    border: "1px solid #e2e8f0",
                    padding: 18,
                    display: "grid",
                    gap: 8,
                    background: employee.role === "hr" ? "#f8fafc" : "#f0fdf4",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{employee.full_name}</strong>
                    <span
                      style={{
                        fontSize: 12,
                        borderRadius: 999,
                        background: "#ffffff",
                        border: "1px solid #dbe2ee",
                        padding: "4px 8px",
                        textTransform: "uppercase",
                      }}
                    >
                      {formatRole(employee.role)}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: "#475569" }}>{employee.email}</div>
                  <div style={{ fontSize: 14, color: "#475569" }}>
                    {employee.department ? employee.department.replaceAll("_", " ") : "Operations"}
                  </div>
                  <div style={{ fontSize: 14, color: "#475569" }}>
                    {employee.job_title || (employee.is_owner ? "Owner" : "Team member")}
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article
            style={{
              background: "#ffffff",
              border: "1px solid #dbe2ee",
              borderRadius: 24,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              height: "100%",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 26 }}>Recent patients</h2>
                <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
                  The company view keeps patients and employee workflows together.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/patients">Open full patient list</Link>
              </Button>
            </div>

            <div style={{ display: "grid", gap: 12, flex: 1, alignContent: "start" }}>
              {recentPatients.length === 0 ? (
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px dashed #cbd5e1",
                    background: "#f8fafc",
                    padding: 18,
                    color: "#475569",
                  }}
                >
                  No patients yet. Add your first patient from the Patients page.
                </div>
              ) : (
                recentPatients.map((patient) => (
                  <div
                    key={patient.id}
                    style={{
                      borderRadius: 18,
                      border: "1px solid #e2e8f0",
                      padding: 18,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong>{patient.full_name}</strong>
                      <div style={{ marginTop: 6, fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
                        {patient.department.replaceAll("_", " ")} | {patient.primary_practitioner_name ?? "Unassigned"} |{" "}
                        {patient.is_paired ? "Paired account" : "Not paired"}
                      </div>
                    </div>
                    <Button asChild>
                      <Link href={`/patients/${patient.id}`}>Open profile</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>

        <form
          onSubmit={onCreateEmployee}
          style={{
            background: "#ffffff",
            border: "1px solid #dbe2ee",
            borderRadius: 24,
            padding: 24,
            display: "grid",
            gap: 16,
            alignContent: "start",
            height: "100%",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Add employee</h2>
            <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
              Practitioners get clinical access. HR handles workflow and calendar support.
            </p>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="employee_name">Full name</Label>
            <Input
              id="employee_name"
              value={employeeForm.full_name}
              onChange={(event) => setEmployeeForm((current) => ({ ...current, full_name: event.target.value }))}
              placeholder="Jordan Casey"
              required
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="employee_email">Email</Label>
            <Input
              id="employee_email"
              type="email"
              value={employeeForm.email}
              onChange={(event) => setEmployeeForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="jordan@clinic.ie"
              required
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="employee_password">Temporary password</Label>
            <Input
              id="employee_password"
              type="password"
              value={employeeForm.password}
              onChange={(event) => setEmployeeForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Temporary password"
              required
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="employee_role">Role</Label>
            <select
              id="employee_role"
              value={employeeForm.role}
              onChange={(event) =>
                setEmployeeForm((current) => ({
                  ...current,
                  role: event.target.value,
                  department: event.target.value === "practitioner" ? current.department : "",
                }))
              }
              style={selectStyle}
            >
              <option value="practitioner">Practitioner</option>
              <option value="hr">HR / Reception</option>
            </select>
          </div>

          {employeeForm.role === "practitioner" ? (
            <div style={{ display: "grid", gap: 8 }}>
              <Label htmlFor="employee_department">Department</Label>
              <select
                id="employee_department"
                value={employeeForm.department}
                onChange={(event) =>
                  setEmployeeForm((current) => ({ ...current, department: event.target.value }))
                }
                style={selectStyle}
                required
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
          ) : null}

          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="employee_title">Job title</Label>
            <Input
              id="employee_title"
              value={employeeForm.job_title}
              onChange={(event) => setEmployeeForm((current) => ({ ...current, job_title: event.target.value }))}
              placeholder={employeeForm.role === "hr" ? "Reception lead" : "Consultant dermatologist"}
            />
          </div>

          {employeeError ? <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>{employeeError}</p> : null}

          <Button type="submit" className="w-full" disabled={savingEmployee}>
            {savingEmployee ? "Adding employee..." : "Add Employee"}
          </Button>
        </form>
      </section>

    </section>
  );
}
