import { BUSINESS_EMPLOYEE_ROLES, DEPARTMENTS, type BusinessEmployeeRole, type Department } from "@triageai/shared";

import { createManagedAuthUser, deleteManagedAuthUser, requireBusinessContext } from "@/lib/server/businessAuth";
import { jsonErrorResponse, HttpError } from "@/lib/server/http";
import { createSupabaseServerClient } from "@/lib/server/supabase";

type CreateEmployeeBody = {
  full_name?: string;
  email?: string;
  password?: string;
  role?: BusinessEmployeeRole;
  department?: Department | "";
  job_title?: string;
};

function isEmployeeRole(value: string): value is BusinessEmployeeRole {
  return BUSINESS_EMPLOYEE_ROLES.includes(value as BusinessEmployeeRole);
}

function isDepartment(value: string): value is Department {
  return DEPARTMENTS.includes(value as Department);
}

export async function POST(req: Request) {
  let authUserId: string | null = null;
  let clinicianCreated = false;

  try {
    const context = await requireBusinessContext(req);
    const body = (await req.json()) as CreateEmployeeBody;
    const fullName = body.full_name?.trim();
    const email = body.email?.trim();
    const password = body.password?.trim();
    const role = body.role?.trim?.() ?? body.role;
    const jobTitle = body.job_title?.trim() || null;

    if (!fullName) {
      throw new HttpError(400, "Employee name is required.");
    }

    if (!email) {
      throw new HttpError(400, "Employee email is required.");
    }

    if (!password) {
      throw new HttpError(400, "A temporary password is required.");
    }

    if (!role || !isEmployeeRole(role)) {
      throw new HttpError(400, "Employee role is invalid.");
    }

    const department =
      typeof body.department === "string" && body.department.trim().length > 0
        ? body.department.trim()
        : null;

    if (role === "practitioner" && (!department || !isDepartment(department))) {
      throw new HttpError(400, "Practitioners must have a valid department.");
    }

    const authUser = await createManagedAuthUser({
      email,
      password,
      metadata: {
        full_name: fullName,
        workspace_role: role,
      },
    });

    authUserId = authUser.id;

    const supabase = createSupabaseServerClient();

    if (role === "practitioner") {
      const { error: clinicianError } = await supabase.from("clinicians").insert({
        id: authUser.id,
        business_id: context.businessId,
        full_name: fullName,
        email,
        department,
        role: "clinician",
      });

      if (clinicianError) {
        throw new HttpError(400, clinicianError.message);
      }

      clinicianCreated = true;
    }

    const { error: employeeError } = await supabase.from("business_employees").insert({
      business_id: context.businessId,
      auth_user_id: authUser.id,
      linked_clinician_id: role === "practitioner" ? authUser.id : null,
      full_name: fullName,
      email,
      role,
      department: role === "practitioner" ? department : null,
      job_title: jobTitle,
      is_owner: false,
    });

    if (employeeError) {
      throw new HttpError(400, employeeError.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    if (authUserId) {
      const supabase = createSupabaseServerClient();

      if (clinicianCreated) {
        await supabase.from("clinicians").delete().eq("id", authUserId);
      }

      await deleteManagedAuthUser(authUserId).catch(() => null);
    }

    return jsonErrorResponse(error, "Unable to create employee.");
  }
}
