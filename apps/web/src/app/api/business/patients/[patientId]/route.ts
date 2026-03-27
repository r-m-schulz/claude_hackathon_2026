import { deleteManagedAuthUser, requireBusinessContext } from "@/lib/server/businessAuth";
import { jsonErrorResponse, HttpError } from "@/lib/server/http";
import { getBusinessPatientDetail } from "@/lib/server/businessWorkspace";
import { createSupabaseServerClient } from "@/lib/server/supabase";

type RouteContext = {
  params: Promise<{
    patientId: string;
  }>;
};

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const context = await requireBusinessContext(req);
    const { patientId } = await params;
    const patient = await getBusinessPatientDetail(context.businessId, patientId);
    return Response.json(patient);
  } catch (error) {
    return jsonErrorResponse(error, "Unable to load patient.");
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const context = await requireBusinessContext(req);
    const { patientId } = await params;
    const supabase = createSupabaseServerClient();

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, auth_user_id")
      .eq("business_id", context.businessId)
      .eq("id", patientId)
      .maybeSingle();

    if (patientError) {
      throw new HttpError(500, patientError.message);
    }

    if (!patient) {
      throw new HttpError(404, "Patient not found.");
    }

    const { data: entries, error: entriesError } = await supabase
      .from("patient_context_entries")
      .select("file_bucket, file_path")
      .eq("business_id", context.businessId)
      .eq("patient_id", patientId);

    if (entriesError) {
      throw new HttpError(500, entriesError.message);
    }

    const filePathsByBucket = (entries ?? []).reduce<Record<string, string[]>>((acc, entry) => {
      if (!entry.file_bucket || !entry.file_path) {
        return acc;
      }

      acc[entry.file_bucket] = acc[entry.file_bucket] ?? [];
      acc[entry.file_bucket].push(entry.file_path);
      return acc;
    }, {});

    await Promise.all(
      Object.entries(filePathsByBucket).map(async ([bucket, paths]) => {
        if (paths.length === 0) {
          return;
        }

        await supabase.storage.from(bucket).remove(paths);
      }),
    );

    const { error: deleteError } = await supabase
      .from("patients")
      .delete()
      .eq("business_id", context.businessId)
      .eq("id", patientId);

    if (deleteError) {
      throw new HttpError(400, deleteError.message);
    }

    if (patient.auth_user_id) {
      await deleteManagedAuthUser(patient.auth_user_id as string).catch(() => null);
    }

    return Response.json({ success: true });
  } catch (error) {
    return jsonErrorResponse(error, "Unable to remove patient.");
  }
}
