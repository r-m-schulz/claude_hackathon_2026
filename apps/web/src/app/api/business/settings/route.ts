import { DEPARTMENTS, type BusinessOnboardingAnswers, type Department } from "@triageai/shared";

import { requireBusinessContext } from "@/lib/server/businessAuth";
import { uploadBusinessAsset } from "@/lib/server/documentExtraction";
import { readOptionalFile, readRequiredStringField, readStringField } from "@/lib/server/formData";
import { jsonErrorResponse, HttpError } from "@/lib/server/http";
import { getBusinessWorkspaceByAuthUserId } from "@/lib/server/businessWorkspace";
import { createSupabaseServerClient } from "@/lib/server/supabase";

function isDepartment(value: string): value is Department {
  return DEPARTMENTS.includes(value as Department);
}

export async function GET(req: Request) {
  try {
    const context = await requireBusinessContext(req);
    const workspace = await getBusinessWorkspaceByAuthUserId(context.user.id);

    return Response.json({
      business: workspace.business,
      current_employee: workspace.current_employee,
    });
  } catch (error) {
    return jsonErrorResponse(error, "Unable to load settings.");
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireBusinessContext(req);
    const formData = await req.formData();

    const businessName = readRequiredStringField(formData, "business_name", "Business name");
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

    let logoAsset: { path: string; url: string } | null = null;
    let headerAsset: { path: string; url: string } | null = null;

    if (logoFile) {
      logoAsset = await uploadBusinessAsset(logoFile, context.businessId, "logo");
    }

    if (headerFile) {
      headerAsset = await uploadBusinessAsset(headerFile, context.businessId, "header");
    }

    const supabase = createSupabaseServerClient();
    const updatePayload: Record<string, unknown> = {
      name: businessName,
      legal_name: readStringField(formData, "legal_name") || null,
      primary_department: primaryDepartmentValue,
      support_email: readStringField(formData, "support_email") || null,
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
      updated_at: new Date().toISOString(),
    };

    if (logoAsset) {
      updatePayload.logo_path = logoAsset.path;
      updatePayload.logo_url = logoAsset.url;
    }

    if (headerAsset) {
      updatePayload.header_image_path = headerAsset.path;
      updatePayload.header_image_url = headerAsset.url;
    }

    const { error } = await supabase.from("businesses").update(updatePayload).eq("id", context.businessId);

    if (error) {
      throw new HttpError(400, error.message);
    }

    const workspace = await getBusinessWorkspaceByAuthUserId(context.user.id);
    return Response.json({ success: true, business: workspace.business });
  } catch (error) {
    return jsonErrorResponse(error, "Unable to save settings.");
  }
}
