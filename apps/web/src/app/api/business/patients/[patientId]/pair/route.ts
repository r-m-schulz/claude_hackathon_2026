import { createManagedAuthUser, deleteManagedAuthUser, requireBusinessContext } from "@/lib/server/businessAuth";
import { jsonErrorResponse, HttpError } from "@/lib/server/http";
import { createSupabaseServerClient } from "@/lib/server/supabase";

type PairPatientBody = {
  email?: string;
  password?: string;
};

type RouteContext = {
  params: Promise<{
    patientId: string;
  }>;
};

export async function POST(req: Request, { params }: RouteContext) {
  let authUserId: string | null = null;

  try {
    const context = await requireBusinessContext(req);
    const { patientId } = await params;
    const body = (await req.json()) as PairPatientBody;
    const email = body.email?.trim();
    const password = body.password?.trim();

    if (!email || !password) {
      throw new HttpError(400, "Patient portal email and password are required.");
    }

    const supabase = createSupabaseServerClient();
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, full_name, auth_user_id")
      .eq("business_id", context.businessId)
      .eq("id", patientId)
      .maybeSingle();

    if (patientError) {
      throw new HttpError(500, patientError.message);
    }

    if (!patient) {
      throw new HttpError(404, "Patient not found.");
    }

    if (patient.auth_user_id) {
      throw new HttpError(400, "This patient already has a paired account.");
    }

    const authUser = await createManagedAuthUser({
      email,
      password,
      metadata: {
        full_name: patient.full_name,
        workspace_role: "patient",
      },
    });

    authUserId = authUser.id;

    const { error: updateError } = await supabase
      .from("patients")
      .update({
        auth_user_id: authUser.id,
        email,
        paired_at: new Date().toISOString(),
      })
      .eq("business_id", context.businessId)
      .eq("id", patientId);

    if (updateError) {
      throw new HttpError(400, updateError.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    if (authUserId) {
      await deleteManagedAuthUser(authUserId).catch(() => null);
    }

    return jsonErrorResponse(error, "Unable to pair the patient account.");
  }
}
