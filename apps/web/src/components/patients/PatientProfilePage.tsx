"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BusinessPatientDetail, BusinessWorkspaceSummary, SavePatientNoteResponse } from "@triageai/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/client/api";
import { saveLatestCriticalRecommendation } from "@/lib/client/recommendationSession";

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 120,
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

type PatientProfilePageProps = {
  patientId: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildScheduleHref(response: SavePatientNoteResponse) {
  if (!response.recommendation) {
    return null;
  }

  const search = new URLSearchParams({
    department: response.recommendation.department,
    week_start: response.recommendation.week_start,
    focus_patient_id: response.recommendation.patient_id,
    focus_patient_name: response.recommendation.patient_name,
  });

  if (response.recommendation.focused_appointment_id) {
    search.set("focus_appointment_id", response.recommendation.focused_appointment_id);
  }

  return `/schedule?${search.toString()}`;
}

function buildManualScheduleHref(patient: BusinessPatientDetail) {
  const search = new URLSearchParams({
    department: patient.department,
    focus_patient_id: patient.id,
    focus_patient_name: patient.full_name,
  });

  return `/schedule?${search.toString()}`;
}

export default function PatientProfilePage({ patientId }: PatientProfilePageProps) {
  const router = useRouter();
  const [patient, setPatient] = useState<BusinessPatientDetail | null>(null);
  const [workspace, setWorkspace] = useState<BusinessWorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteState, setNoteState] = useState({ title: "", body_text: "" });
  const [pairState, setPairState] = useState({ email: "", password: "" });
  const [documentState, setDocumentState] = useState({
    title: "",
    body_text: "",
    file: null as File | null,
  });
  const [savingNote, setSavingNote] = useState(false);
  const [savingPair, setSavingPair] = useState(false);
  const [savingDocument, setSavingDocument] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function loadData() {
    try {
      const [patientResponse, workspaceResponse] = await Promise.all([
        apiFetch<BusinessPatientDetail>(`/api/business/patients/${patientId}`),
        apiFetch<BusinessWorkspaceSummary>("/api/business/workspace"),
      ]);

      setPatient(patientResponse);
      setWorkspace(workspaceResponse);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load patient.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [patientId]);

  async function onSaveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingNote(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await apiFetch<SavePatientNoteResponse>(`/api/business/patients/${patientId}/notes`, {
        method: "POST",
        body: JSON.stringify(noteState),
      });

      setNoteState({ title: "", body_text: "" });

      if (!response.engine_processed) {
        setActionError(response.engine_error ?? "Note saved, but the critical engine could not complete.");
        await loadData();
        return;
      }

      if (response.recommendation) {
        saveLatestCriticalRecommendation(response.recommendation);
        const href = buildScheduleHref(response);

        if (href) {
          router.push(href);
          return;
        }
      }

      setActionMessage(
        response.critical_score
          ? `Note saved. Critical score updated to ${response.critical_score}, but no calendar recommendation was generated.`
          : "Note saved.",
      );
      await loadData();
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : "Unable to save note.");
    } finally {
      setSavingNote(false);
    }
  }

  async function onPairPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPair(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await apiFetch(`/api/business/patients/${patientId}/pair`, {
        method: "POST",
        body: JSON.stringify(pairState),
      });

      setPairState({ email: "", password: "" });
      await loadData();
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : "Unable to pair patient.");
    } finally {
      setSavingPair(false);
    }
  }

  async function onUploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingDocument(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const formData = new FormData();
      formData.append("title", documentState.title);
      formData.append("body_text", documentState.body_text);

      if (documentState.file) {
        formData.append("file", documentState.file);
      }

      await apiFetch(`/api/business/patients/${patientId}/documents`, {
        method: "POST",
        body: formData,
      });

      setDocumentState({ title: "", body_text: "", file: null });
      await loadData();
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : "Unable to upload document.");
    } finally {
      setSavingDocument(false);
    }
  }

  if (loading) {
    return <p style={{ margin: 0, color: "#64748b" }}>Loading patient profile...</p>;
  }

  if (error || !patient) {
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
        {error ?? "Unable to load patient profile."}
      </section>
    );
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
          gap: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#64748b" }}>
              Patient Profile
            </p>
            <h1 style={{ margin: "8px 0 0", fontSize: 36 }}>{patient.full_name}</h1>
            <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.6 }}>
              {patient.department.replaceAll("_", " ")} | DOB {patient.dob} | {patient.email ?? "No email"} |{" "}
              {patient.phone ?? "No phone"}
            </p>
          </div>
          <div
            style={{
              borderRadius: 22,
              border: "1px solid #e2e8f0",
              background: patient.is_paired ? "#ecfdf5" : "#fffbeb",
              color: patient.is_paired ? "#166534" : "#92400e",
              padding: 18,
              minWidth: 220,
            }}
          >
            <div style={{ fontWeight: 700 }}>{patient.is_paired ? "Patient account paired" : "Portal account pending"}</div>
            <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
              {patient.is_paired
                ? `Paired on ${patient.paired_at ? formatDate(patient.paired_at) : "recently"}`
                : "Create the patient login from this page when you are ready."}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button asChild>
            <Link href={buildManualScheduleHref(patient)}>Book on Calendar</Link>
          </Button>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div
            style={{
              borderRadius: 18,
              border: "1px solid #e2e8f0",
              padding: 16,
              background: "#f8fafc",
            }}
          >
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>
              Assigned practitioner
            </div>
            <div style={{ marginTop: 10, fontWeight: 700 }}>
              {patient.assigned_practitioner_name ?? "Unassigned"}
            </div>
          </div>
          <div
            style={{
              borderRadius: 18,
              border: "1px solid #e2e8f0",
              padding: 16,
              background: "#f8fafc",
            }}
          >
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>
              Patient status
            </div>
            <div style={{ marginTop: 10, fontWeight: 700 }}>{patient.is_paired ? "Portal ready" : "Business-side only"}</div>
          </div>
          <div
            style={{
              borderRadius: 18,
              border: "1px solid #e2e8f0",
              padding: 16,
              background: "#f8fafc",
            }}
          >
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>
              Context items
            </div>
            <div style={{ marginTop: 10, fontWeight: 700 }}>{patient.context_entries.length}</div>
          </div>
        </div>
      </header>

      {actionError ? (
        <section
          style={{
            borderRadius: 18,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            padding: 18,
            color: "#991b1b",
          }}
        >
          {actionError}
        </section>
      ) : null}

      {actionMessage ? (
        <section
          style={{
            borderRadius: 18,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            padding: 18,
            color: "#166534",
          }}
        >
          {actionMessage}
        </section>
      ) : null}

      <section
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        }}
      >
        <form
          onSubmit={onSaveNote}
          style={{
            borderRadius: 24,
            border: "1px solid #dbe2ee",
            background: "#ffffff",
            padding: 24,
            display: "grid",
            gap: 14,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Add note</h2>
            <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
              Save business-side notes directly onto the patient timeline. The critical engine will recalculate this
              patient against the rest of the queue and take you straight to the recommended calendar view.
            </p>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="note_title">Title</Label>
            <Input
              id="note_title"
              value={noteState.title}
              onChange={(event) => setNoteState((current) => ({ ...current, title: event.target.value }))}
              placeholder="Referral summary"
            />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="note_body">Note text</Label>
            <textarea
              id="note_body"
              value={noteState.body_text}
              onChange={(event) => setNoteState((current) => ({ ...current, body_text: event.target.value }))}
              style={textareaStyle}
              placeholder="Add intake context, follow-up details, referral notes, or internal business notes here."
            />
          </div>
          <Button type="submit" disabled={savingNote}>
            {savingNote ? "Saving note..." : "Save Note"}
          </Button>
        </form>

        <form
          onSubmit={onUploadDocument}
          style={{
            borderRadius: 24,
            border: "1px solid #dbe2ee",
            background: "#ffffff",
            padding: 24,
            display: "grid",
            gap: 14,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Upload document</h2>
            <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
              Upload images, PDFs, and files. OCR-style extracted text is added back into the patient context.
            </p>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="document_title">Title</Label>
            <Input
              id="document_title"
              value={documentState.title}
              onChange={(event) => setDocumentState((current) => ({ ...current, title: event.target.value }))}
              placeholder="Referral PDF"
            />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="document_note">Context note</Label>
            <textarea
              id="document_note"
              value={documentState.body_text}
              onChange={(event) => setDocumentState((current) => ({ ...current, body_text: event.target.value }))}
              style={textareaStyle}
              placeholder="Optional note about what this upload contains."
            />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <Label htmlFor="document_file">File</Label>
            <input
              id="document_file"
              type="file"
              accept="image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) =>
                setDocumentState((current) => ({ ...current, file: event.target.files?.[0] ?? null }))
              }
              required
            />
          </div>
          <Button type="submit" disabled={savingDocument}>
            {savingDocument ? "Uploading..." : "Upload to Context"}
          </Button>
        </form>

        {!patient.is_paired ? (
          <form
            onSubmit={onPairPatient}
            style={{
              borderRadius: 24,
              border: "1px solid #dbe2ee",
              background: "#ffffff",
              padding: 24,
              display: "grid",
              gap: 14,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 24 }}>Pair patient account</h2>
              <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
                Create the linked patient login so the profile is connected to a user account.
              </p>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <Label htmlFor="pair_email">Patient portal email</Label>
              <Input
                id="pair_email"
                type="email"
                value={pairState.email}
                onChange={(event) => setPairState((current) => ({ ...current, email: event.target.value }))}
                placeholder={patient.email ?? "patient@example.com"}
              />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <Label htmlFor="pair_password">Temporary password</Label>
              <Input
                id="pair_password"
                type="password"
                value={pairState.password}
                onChange={(event) => setPairState((current) => ({ ...current, password: event.target.value }))}
                placeholder="Temporary password"
              />
            </div>
            <Button type="submit" disabled={savingPair}>
              {savingPair ? "Pairing account..." : "Pair Patient Account"}
            </Button>
          </form>
        ) : null}
      </section>

      <section
        style={{
          borderRadius: 24,
          border: "1px solid #dbe2ee",
          background: "#ffffff",
          padding: 24,
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 26 }}>Patient context timeline</h2>
            <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
              Notes and uploads are stored as dated business context for this patient.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/patients">Back to patients</Link>
          </Button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {patient.context_entries.length === 0 ? (
            <div
              style={{
                borderRadius: 18,
                border: "1px dashed #cbd5e1",
                background: "#f8fafc",
                padding: 18,
                color: "#475569",
              }}
            >
              No notes or uploads yet. Add a note or document above.
            </div>
          ) : (
            patient.context_entries.map((entry) => (
              <article
                key={entry.id}
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
                    <strong>{entry.title}</strong>
                    <div style={{ marginTop: 6, fontSize: 14, color: "#475569" }}>
                      {entry.entry_type.toUpperCase()} | {entry.created_by_name ?? "Workspace user"} | {formatDate(entry.created_at)}
                    </div>
                  </div>
                  {entry.file_url ? (
                    <Button asChild variant="outline">
                      <a href={entry.file_url} target="_blank" rel="noreferrer">
                        Open file
                      </a>
                    </Button>
                  ) : null}
                </div>

                {entry.body_text ? <div style={{ lineHeight: 1.7 }}>{entry.body_text}</div> : null}

                {entry.extracted_text ? (
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid #dbe2ee",
                      background: "#f8fafc",
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#64748b",
                        marginBottom: 8,
                      }}
                    >
                      Extracted text
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, color: "#334155" }}>{entry.extracted_text}</div>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
