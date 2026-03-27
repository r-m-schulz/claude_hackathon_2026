import { createSupabaseServerClient } from "@/lib/server/supabase";
import { DEPARTMENTS, CLINICIAN_ROLES } from "@triageai/shared";
import type { RegisterInput, RegisterResponse } from "@triageai/shared";

/**
 * POST /api/auth/register
 *
 * Role-based registration endpoint. Creates a Supabase Auth user with the
 * correct metadata so the DB trigger (handle_new_auth_user) auto-provisions
 * the matching clinicians or patients row.
 *
 * Accepts RegisterInput (see packages/shared/contracts.ts).
 * Returns RegisterResponse.
 *
 * Mobile can call this endpoint directly, or use supabase.auth.signUp()
 * with the same metadata contract — both paths hit the same DB trigger.
 *
 * Future one-time-code flow: add `onboarding_code` validation here before
 * creating the auth user, then set onboarding_status accordingly in metadata.
 */
export async function POST(req: Request): Promise<Response> {
  const body: RegisterInput = await req.json();
  const { role, email, password, full_name, department } = body;

  // --- Validate common fields ---
  if (!role || !["clinician", "patient"].includes(role)) {
    return json({ success: false, profile_created: false, message: "Invalid role." }, 400);
  }
  if (!email || !password || !full_name) {
    return json({ success: false, profile_created: false, message: "email, password, and full_name are required." }, 400);
  }
  if (!department || !(DEPARTMENTS as readonly string[]).includes(department)) {
    return json({ success: false, profile_created: false, message: `Invalid department: ${department}` }, 400);
  }

  // --- Validate role-specific fields ---
  let metadata: Record<string, string> = { role, full_name, department };

  if (body.role === "clinician") {
    const clinician_role = body.clinician_role ?? "clinician";
    if (!(CLINICIAN_ROLES as readonly string[]).includes(clinician_role)) {
      return json({ success: false, profile_created: false, message: `Invalid clinician_role: ${clinician_role}` }, 400);
    }
    metadata = { ...metadata, clinician_role };
  }

  if (body.role === "patient") {
    const { dob } = body;
    if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return json({ success: false, profile_created: false, message: "dob is required for patients (format: YYYY-MM-DD)." }, 400);
    }
    // Default onboarding_status to "active" — future one-time-code flow will set "unverified"
    metadata = { ...metadata, dob, onboarding_status: "active" };
  }

  // --- Create auth user via service role (bypasses email rate limits on server) ---
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: metadata,
    // Set email_confirm: true to skip email confirmation in dev/demo
    // Remove this line in production to require confirmation
    email_confirm: true,
  });

  if (error) {
    const isDuplicate = error.message.toLowerCase().includes("already registered")
      || error.message.toLowerCase().includes("already exists");
    return json(
      { success: false, profile_created: false, message: isDuplicate ? "An account with this email already exists." : error.message },
      isDuplicate ? 409 : 500,
    );
  }

  const user = data.user;

  // The DB trigger handle_new_auth_user fires on insert and creates the profile row.
  // We do a quick existence check to confirm it worked and set profile_created accurately.
  let profile_created = false;

  if (role === "clinician") {
    const { data: row } = await supabase
      .from("clinicians")
      .select("id")
      .eq("id", user.id)
      .single();
    profile_created = !!row;
  } else {
    const { data: row } = await supabase
      .from("patients")
      .select("id")
      .eq("id", user.id)
      .single();
    profile_created = !!row;
  }

  const response: RegisterResponse = {
    success: true,
    user_id: user.id,
    role,
    profile_created,
    message: profile_created
      ? `${role} account created successfully.`
      : `Auth user created but profile row not found — check DB trigger.`,
  };

  return json(response, 201);
}

function json(body: unknown, status: number) {
  return Response.json(body, { status });
}
