import type { BusinessEmployeeRole, Department } from "@triageai/shared";
import type { User } from "@supabase/supabase-js";

import { createSupabaseAuthClient, createSupabaseServerClient } from "@/lib/server/supabase";
import { HttpError } from "@/lib/server/http";

export type AuthenticatedBusinessContext = {
  user: User;
  businessId: string;
  employee: {
    id: string;
    auth_user_id: string;
    linked_clinician_id: string | null;
    full_name: string;
    email: string;
    role: BusinessEmployeeRole;
    department: Department | null;
    is_owner: boolean;
  };
};

type ManagedAuthUserInput = {
  email: string;
  password: string;
  metadata?: Record<string, unknown>;
};

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization");

  if (!header?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return header.slice(7).trim() || null;
}

export async function requireAuthUser(req: Request) {
  const accessToken = getBearerToken(req);

  if (!accessToken) {
    throw new HttpError(401, "You must be signed in to continue.");
  }

  const supabase = createSupabaseAuthClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new HttpError(401, "Your session is no longer valid. Please sign in again.");
  }

  return data.user;
}

export async function requireBusinessContext(req: Request): Promise<AuthenticatedBusinessContext> {
  const user = await requireAuthUser(req);
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("business_employees")
    .select("id, business_id, auth_user_id, linked_clinician_id, full_name, email, role, department, is_owner")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (!data) {
    throw new HttpError(403, "This account is not linked to a business workspace.");
  }

  return {
    user,
    businessId: data.business_id as string,
    employee: {
      id: data.id as string,
      auth_user_id: data.auth_user_id as string,
      linked_clinician_id: (data.linked_clinician_id as string | null) ?? null,
      full_name: data.full_name as string,
      email: data.email as string,
      role: data.role as BusinessEmployeeRole,
      department: (data.department as Department | null) ?? null,
      is_owner: Boolean(data.is_owner),
    },
  };
}

export async function createManagedAuthUser({ email, password, metadata }: ManagedAuthUserInput) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error || !data.user) {
    throw new HttpError(400, error?.message ?? "Unable to create auth user.");
  }

  return data.user;
}

export async function deleteManagedAuthUser(userId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw new HttpError(500, error.message);
  }
}
