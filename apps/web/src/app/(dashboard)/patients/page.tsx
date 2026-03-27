"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DEPARTMENTS, type BusinessPatientSummary, type BusinessWorkspaceSummary } from "@triageai/shared";

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
    () => workspace?.employees.filter((employee) => employee.role === "practitioner") ?? [],
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

  useEffect(() => {
    void loadData();
  }, []);

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

      setForm({
        full_name: "",
        email: "",
        phone: "",
        dob: "",
        department: "",
        assigned_practitioner_id: "",
        portal_email: "",
        portal_password: "",
      });

      await loadData();
    } catch (submitError) {
      setPatientError(submitError instanceof Error ? submitError.message : "Unable to create patient.");
    } finally {
      setSavingPatient(false);
    }
  }

  async function onDeletePatient(patientId: string) {
    const confirmed = window.confirm("Remove this patient from the business workspace?");

    if (!confirmed) {
      return;
    }

    try {
      await apiFetch(`/api/business/patients/${patientId}`, {
        method: "DELETE",
      });

      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to remove patient.");
    }
  }

  if (loading) {
    return <p style={{ margin: 0, color: "#64748b" }}>Loading patients...</p>;
  }

  if (error) {
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
        {error}
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <header
        style={{
          borderRadius: 24,
          border: "1px solid #dbe2ee",
          padding: 24,
          background: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#64748b" }}>
            Patient Management
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: 34 }}>Patients</h1>
          <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.6 }}>
            Add new patients, pair portal accounts, and keep notes and uploaded context tied to the business record.
          </p>
        </div>
        <div
          style={{
            minWidth: 220,
            borderRadius: 20,
            border: "1px solid #e2e8f0",
            padding: 18,
            background: "#f8fafc",
          }}
        >
          <div style={{ fontWeight: 700 }}>{patients.length} patient records</div>
          <div style={{ marginTop: 8, fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
            {practitioners.length} practitioners available for assignment.
          </div>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
          alignItems: "stretch",
        }}
      >
        <article
          style={{
            background: "#ffffff",
            border: "1px solid #dbe2ee",
            borderRadius: 24,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            height: "100%",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Current patients</h2>
            <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
              Each patient profile can hold notes, uploaded images or PDFs, extracted text, and paired login details.
            </p>
          </div>

          <div style={{ display: "grid", gap: 12, flex: 1, alignContent: "start" }}>
            {patients.length === 0 ? (
              <div
                style={{
                  borderRadius: 18,
                  border: "1px dashed #cbd5e1",
                  background: "#f8fafc",
                  padding: 18,
                  color: "#475569",
                }}
              >
                No patients yet. Use the form to add the first patient.
              </div>
            ) : (
              patients.map((patient) => (
                <div
                  key={patient.id}
                  style={{
                    borderRadius: 18,
                    border: "1px solid #e2e8f0",
                    padding: 18,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <strong>{patient.full_name}</strong>
                      <div style={{ marginTop: 6, fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
                        {patient.department.replaceAll("_", " ")} | {patient.primary_practitioner_name ?? "Unassigned"}
                      </div>
                    </div>
                    <div
                      style={{
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background: patient.is_paired ? "#dcfce7" : "#fef3c7",
                        color: patient.is_paired ? "#166534" : "#92400e",
                        alignSelf: "start",
                      }}
                    >
                      {patient.is_paired ? "Paired" : "Unpaired"}
                    </div>
                  </div>

                  <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
                    {patient.email ?? "No email"} | {patient.phone ?? "No phone"} | DOB {patient.dob}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Button asChild>
                      <Link href={`/patients/${patient.id}`}>Open profile</Link>
                    </Button>
                    <Button type="button" variant="outline" onClick={() => onDeletePatient(patient.id)}>
                      Remove patient
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <form
          onSubmit={onCreatePatient}
          style={{
            background: "#ffffff",
            border: "1px solid #dbe2ee",
            borderRadius: 24,
            padding: 24,
            display: "grid",
            gap: 16,
            alignContent: "start",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Add patient</h2>
            <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
              Create the business-side record now. Pair a portal account now or later from the patient profile.
            </p>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
              required
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="email">Contact email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              value={form.dob}
              onChange={(event) => setForm((current) => ({ ...current, dob: event.target.value }))}
              required
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="department">Department</Label>
            <select
              id="department"
              value={form.department}
              onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
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

          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="assigned_practitioner">Assigned practitioner</Label>
            <select
              id="assigned_practitioner"
              value={form.assigned_practitioner_id}
              onChange={(event) =>
                setForm((current) => ({ ...current, assigned_practitioner_id: event.target.value }))
              }
              style={selectStyle}
            >
              <option value="">Leave unassigned</option>
              {practitioners.map((employee) => (
                <option key={employee.id} value={employee.linked_clinician_id ?? ""}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              borderRadius: 18,
              border: "1px solid #e2e8f0",
              padding: 16,
              background: "#f8fafc",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 700 }}>Optional patient portal pairing</div>
            <div style={{ display: "grid", gap: 8 }}>
              <Label htmlFor="portal_email">Portal email</Label>
              <Input
                id="portal_email"
                type="email"
                value={form.portal_email}
                onChange={(event) => setForm((current) => ({ ...current, portal_email: event.target.value }))}
              />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <Label htmlFor="portal_password">Temporary portal password</Label>
              <Input
                id="portal_password"
                type="password"
                value={form.portal_password}
                onChange={(event) => setForm((current) => ({ ...current, portal_password: event.target.value }))}
              />
            </div>
          </div>

          {patientError ? <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>{patientError}</p> : null}

          <Button type="submit" className="w-full" disabled={savingPatient}>
            {savingPatient ? "Creating patient..." : "Add Patient"}
          </Button>
        </form>
      </section>
    </section>
  );
}
