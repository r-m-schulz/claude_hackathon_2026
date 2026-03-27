import { DEPARTMENTS, type Department } from "@triageai/shared";

import { createManagedAuthUser, deleteManagedAuthUser, requireBusinessContext } from "@/lib/server/businessAuth";
import { jsonErrorResponse, HttpError } from "@/lib/server/http";
import { listBusinessPatients } from "@/lib/server/businessWorkspace";
import { createSupabaseServerClient } from "@/lib/server/supabase";

type CreatePatientBody = {
  full_name?: string;
  email?: string;
  phone?: string;
  dob?: string;
  department?: Department;
  assigned_practitioner_id?: string | null;
  portal_email?: string;
  portal_password?: string;
};

function isDepartment(value: string): value is Department {
  return DEPARTMENTS.includes(value as Department);
}

export async function GET(req: Request) {
  try {
    const context = await requireBusinessContext(req);
    const patients = await listBusinessPatients(context.businessId);
    return Response.json({ patients });
  } catch (error) {
    return jsonErrorResponse(error, "Unable to load patients.");
  }
}

export async function POST(req: Request) {
  let authUserId: string | null = null;

  try {
    const context = await requireBusinessContext(req);
    const body = (await req.json()) as CreatePatientBody;
    const fullName = body.full_name?.trim();
    const contactEmail = body.email?.trim() || null;
    const phone = body.phone?.trim() || null;
    const dob = body.dob?.trim();
    const departmentValue = body.department?.trim?.() ?? body.department;
    const assignedPractitionerId = body.assigned_practitioner_id?.trim() || null;
    const portalEmail = body.portal_email?.trim() || null;
    const portalPassword = body.portal_password?.trim() || null;

    if (!fullName) {
      throw new HttpError(400, "Patient name is required.");
    }

    if (!dob) {
      throw new HttpError(400, "Date of birth is required.");
    }

    if (!departmentValue || !isDepartment(departmentValue)) {
      throw new HttpError(400, "Patient department is invalid.");
    }

    if ((portalEmail && !portalPassword) || (!portalEmail && portalPassword)) {
      throw new HttpError(400, "Provide both portal email and password to pair an account.");
    }

    const supabase = createSupabaseServerClient();

    if (assignedPractitionerId) {
      const { data: practitioner, error: practitionerError } = await supabase
        .from("business_employees")
        .select("id")
        .eq("business_id", context.businessId)
        .eq("linked_clinician_id", assignedPractitionerId)
        .eq("role", "practitioner")
        .maybeSingle();

      if (practitionerError) {
        throw new HttpError(500, practitionerError.message);
      }

      if (!practitioner) {
        throw new HttpError(400, "Assigned practitioner does not belong to this business.");
      }
    }

    if (portalEmail && portalPassword) {
      const authUser = await createManagedAuthUser({
        email: portalEmail,
        password: portalPassword,
        metadata: {
          full_name: fullName,
          workspace_role: "patient",
        },
      });

      authUserId = authUser.id;
    }

    const { error } = await supabase.from("patients").insert({
      business_id: context.businessId,
      auth_user_id: authUserId,
      full_name: fullName,
      email: contactEmail ?? portalEmail,
      phone,
      dob,
      department: departmentValue,
      gp_id: assignedPractitionerId,
      paired_at: authUserId ? new Date().toISOString() : null,
      created_by_employee_id: context.employee.id,
    });

    if (error) {
      throw new HttpError(400, error.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    if (authUserId) {
      await deleteManagedAuthUser(authUserId).catch(() => null);
    }

    return jsonErrorResponse(error, "Unable to create patient.");
  }
}
