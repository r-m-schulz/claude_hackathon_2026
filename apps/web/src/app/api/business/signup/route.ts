import { DEPARTMENTS, type BusinessOnboardingAnswers, type Department } from "@triageai/shared";

import { createManagedAuthUser, deleteManagedAuthUser } from "@/lib/server/businessAuth";
import { uploadBusinessAsset } from "@/lib/server/documentExtraction";
import { readOptionalFile, readRequiredStringField, readStringField } from "@/lib/server/formData";
import { jsonErrorResponse, HttpError } from "@/lib/server/http";
import { createSupabaseServerClient } from "@/lib/server/supabase";

function isDepartment(value: string): value is Department {
  return DEPARTMENTS.includes(value as Department);
}

export async function POST(req: Request) {
  let authUserId: string | null = null;
  let businessId: string | null = null;

  try {
    const formData = await req.formData();

    const businessName = readRequiredStringField(formData, "business_name", "Business name");
    const ownerFullName = readRequiredStringField(formData, "owner_full_name", "Owner full name");
    const ownerEmail = readRequiredStringField(formData, "owner_email", "Owner email");
    const ownerPassword = readRequiredStringField(formData, "owner_password", "Owner password");
    const primaryDepartmentValue = readRequiredStringField(
      formData,
      "primary_department",
      "Primary department",
    );

    if (!isDepartment(primaryDepartmentValue)) {
      throw new HttpError(400, "Primary department is invalid.");
    }

    const onboardingAnswers: BusinessOnboardingAnswers = {
      care_model: readStringField(formData, "care_model"),
      patient_volume: readStringField(formData, "patient_volume"),
      workflow_needs: readStringField(formData, "workflow_needs"),
      brand_tone: readStringField(formData, "brand_tone"),
      intake_priorities: readStringField(formData, "intake_priorities"),
    };

    const logoFile = readOptionalFile(formData, "logo");
    const headerFile = readOptionalFile(formData, "header_image");

    const authUser = await createManagedAuthUser({
      email: ownerEmail,
      password: ownerPassword,
      metadata: {
        full_name: ownerFullName,
        workspace_type: "business_owner",
      },
    });

    authUserId = authUser.id;

    const supabase = createSupabaseServerClient();
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert({
        owner_auth_user_id: authUser.id,
        name: businessName,
        legal_name: readStringField(formData, "legal_name") || null,
        primary_department: primaryDepartmentValue,
        support_email: readStringField(formData, "support_email") || ownerEmail,
        phone: readStringField(formData, "phone") || null,
        website: readStringField(formData, "website") || null,
        address_line: readStringField(formData, "address_line") || null,
        city: readStringField(formData, "city") || null,
        country: readStringField(formData, "country") || null,
        timezone: readStringField(formData, "timezone") || "Europe/Dublin",
        hero_headline: readStringField(formData, "hero_headline") || null,
        hero_subheadline: readStringField(formData, "hero_subheadline") || null,
        brand_summary: readStringField(formData, "brand_summary") || null,
        workflow_summary: readStringField(formData, "workflow_summary") || null,
        onboarding_answers: onboardingAnswers,
      })
      .select("id")
      .single();

    if (businessError || !business) {
      throw new HttpError(400, businessError?.message ?? "Unable to create business.");
    }

    businessId = business.id as string;

    let logoAsset: { path: string; url: string } | null = null;
    let headerAsset: { path: string; url: string } | null = null;

    if (logoFile) {
      logoAsset = await uploadBusinessAsset(logoFile, businessId, "logo");
    }

    if (headerFile) {
      headerAsset = await uploadBusinessAsset(headerFile, businessId, "header");
    }

    if (logoAsset || headerAsset) {
      const { error: assetUpdateError } = await supabase
        .from("businesses")
        .update({
          logo_path: logoAsset?.path ?? null,
          logo_url: logoAsset?.url ?? null,
          header_image_path: headerAsset?.path ?? null,
          header_image_url: headerAsset?.url ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", businessId);

      if (assetUpdateError) {
        throw new HttpError(400, assetUpdateError.message);
      }
    }

    const { error: clinicianError } = await supabase.from("clinicians").insert({
      id: authUser.id,
      business_id: businessId,
      full_name: ownerFullName,
      email: ownerEmail,
      department: primaryDepartmentValue,
      role: "admin",
    });

    if (clinicianError) {
      throw new HttpError(400, clinicianError.message);
    }

    const { error: employeeError } = await supabase.from("business_employees").insert({
      business_id: businessId,
      auth_user_id: authUser.id,
      linked_clinician_id: authUser.id,
      full_name: ownerFullName,
      email: ownerEmail,
      role: "practitioner",
      department: primaryDepartmentValue,
      job_title: "Practice owner",
      is_owner: true,
    });

    if (employeeError) {
      throw new HttpError(400, employeeError.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    if (authUserId) {
      const supabase = createSupabaseServerClient();
      await supabase.from("clinicians").delete().eq("id", authUserId);
    }

    if (businessId) {
      const supabase = createSupabaseServerClient();
      await supabase.from("businesses").delete().eq("id", businessId);
    }

    if (authUserId) {
      await deleteManagedAuthUser(authUserId).catch(() => null);
    }

    return jsonErrorResponse(error, "Unable to create the business workspace.");
  }
}
