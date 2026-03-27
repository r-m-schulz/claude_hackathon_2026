import type { Department } from "@triageai/shared";

import { processClinicalNote } from "@/lib/noteAnalysis";

interface SummariseNoteInput {
  note_id: string;
  patient_id: string;
  department: Department;
  content: string;
}

export async function POST(req: Request) {
  const body: SummariseNoteInput = await req.json();
  const { note_id, patient_id, department, content } = body;

  const analysis = await processClinicalNote({
    noteId: note_id,
    patientId: patient_id,
    department,
    content,
  });

  return Response.json({ success: true, analysis });
}
