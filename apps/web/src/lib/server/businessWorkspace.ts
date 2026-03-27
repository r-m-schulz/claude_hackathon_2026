import type {
  BusinessEmployeeSummary,
  BusinessOnboardingAnswers,
  BusinessPatientDetail,
  BusinessPatientSummary,
  BusinessSummary,
  BusinessWorkspaceSummary,
  Department,
  PatientContextEntry,
  PatientContextEntryType,
  RiskTier,
} from "@triageai/shared";

import { createSupabaseServerClient } from "@/lib/server/supabase";
import { HttpError } from "@/lib/server/http";

type BusinessRow = {
  id: string;
  name: string;
  legal_name: string | null;
  primary_department: Department | null;
  support_email: string | null;
  phone: string | null;
  website: string | null;
  address_line: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;
  brand_summary: string | null;
  workflow_summary: string | null;
  logo_url: string | null;
  header_image_url: string | null;
  onboarding_answers: Partial<BusinessOnboardingAnswers> | null;
};

type EmployeeRow = {
  id: string;
  auth_user_id: string;
  linked_clinician_id: string | null;
  full_name: string;
  email: string;
  role: BusinessEmployeeSummary["role"];
  department: Department | null;
  job_title: string | null;
  is_owner: boolean;
  created_at: string;
};

type PatientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  dob: string;
  department: Department;
  risk_score: number;
  risk_tier: RiskTier;
  created_at: string;
  auth_user_id: string | null;
  paired_at: string | null;
  gp_id: string | null;
};

type ContextEntryRow = {
  id: string;
  entry_type: PatientContextEntryType;
  title: string;
  body_text: string | null;
  extracted_text: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_bucket: string | null;
  file_path: string | null;
  created_at: string;
  created_by_employee_id: string | null;
};

const EMPTY_ONBOARDING: BusinessOnboardingAnswers = {
  care_model: "",
  patient_volume: "",
  workflow_needs: "",
  brand_tone: "",
  intake_priorities: "",
};

export function normalizeOnboardingAnswers(value: Partial<BusinessOnboardingAnswers> | null | undefined) {
  return {
    care_model: value?.care_model ?? "",
    patient_volume: value?.patient_volume ?? "",
    workflow_needs: value?.workflow_needs ?? "",
    brand_tone: value?.brand_tone ?? "",
    intake_priorities: value?.intake_priorities ?? "",
  };
}

function mapBusiness(row: BusinessRow): BusinessSummary {
  return {
    id: row.id,
    name: row.name,
    legal_name: row.legal_name,
    primary_department: row.primary_department,
    support_email: row.support_email,
    phone: row.phone,
    website: row.website,
    address_line: row.address_line,
    city: row.city,
    country: row.country,
    timezone: row.timezone,
    hero_headline: row.hero_headline,
    hero_subheadline: row.hero_subheadline,
    brand_summary: row.brand_summary,
    workflow_summary: row.workflow_summary,
    logo_url: row.logo_url,
    header_image_url: row.header_image_url,
    onboarding_answers: normalizeOnboardingAnswers(row.onboarding_answers),
  };
}

function mapEmployee(row: EmployeeRow): BusinessEmployeeSummary {
  return {
    id: row.id,
    auth_user_id: row.auth_user_id,
    linked_clinician_id: row.linked_clinician_id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    department: row.department,
    job_title: row.job_title,
    is_owner: row.is_owner,
    created_at: row.created_at,
  };
}

function mapPatient(
  row: PatientRow,
  practitionerNameByClinicianId: Map<string, string>,
): BusinessPatientSummary {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    dob: row.dob,
    department: row.department,
    risk_score: row.risk_score,
    risk_tier: row.risk_tier,
    created_at: row.created_at,
    is_paired: Boolean(row.auth_user_id),
    paired_at: row.paired_at,
    primary_practitioner_name: row.gp_id ? practitionerNameByClinicianId.get(row.gp_id) ?? null : null,
  };
}

async function getBusinessRow(businessId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, name, legal_name, primary_department, support_email, phone, website, address_line, city, country, timezone, hero_headline, hero_subheadline, brand_summary, workflow_summary, logo_url, header_image_url, onboarding_answers",
    )
    .eq("id", businessId)
    .single();

  if (error) {
    throw new HttpError(500, error.message);
  }

  return data as BusinessRow;
}

async function getEmployeeRows(businessId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("business_employees")
    .select(
      "id, auth_user_id, linked_clinician_id, full_name, email, role, department, job_title, is_owner, created_at",
    )
    .eq("business_id", businessId)
    .order("is_owner", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new HttpError(500, error.message);
  }

  return (data ?? []) as EmployeeRow[];
}

async function getPatientRows(businessId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, email, phone, dob, department, risk_score, risk_tier, created_at, auth_user_id, paired_at, gp_id")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new HttpError(500, error.message);
  }

  return (data ?? []) as PatientRow[];
}

function practitionerMapFromEmployees(employees: EmployeeRow[]) {
  return employees.reduce((map, employee) => {
    if (employee.linked_clinician_id) {
      map.set(employee.linked_clinician_id, employee.full_name);
    }

    return map;
  }, new Map<string, string>());
}

export async function getBusinessWorkspaceByAuthUserId(authUserId: string): Promise<BusinessWorkspaceSummary> {
  const supabase = createSupabaseServerClient();
  const { data: currentEmployeeRow, error: employeeError } = await supabase
    .from("business_employees")
    .select(
      "id, business_id, auth_user_id, linked_clinician_id, full_name, email, role, department, job_title, is_owner, created_at",
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (employeeError) {
    throw new HttpError(500, employeeError.message);
  }

  if (!currentEmployeeRow) {
    throw new HttpError(404, "No business workspace was found for this account.");
  }

  const businessId = currentEmployeeRow.business_id as string;
  const [businessRow, employeeRows, patientRows] = await Promise.all([
    getBusinessRow(businessId),
    getEmployeeRows(businessId),
    getPatientRows(businessId),
  ]);

  const practitionerNameByClinicianId = practitionerMapFromEmployees(employeeRows);
  const employees = employeeRows.map(mapEmployee);
  const patients = patientRows.map((row) => mapPatient(row, practitionerNameByClinicianId));

  return {
    business: mapBusiness(businessRow),
    current_employee: mapEmployee(currentEmployeeRow as EmployeeRow),
    employees,
    patient_count: patients.length,
    recent_patients: patients.slice(0, 6),
  };
}

export async function listBusinessPatients(businessId: string) {
  const [employeeRows, patientRows] = await Promise.all([getEmployeeRows(businessId), getPatientRows(businessId)]);
  const practitionerNameByClinicianId = practitionerMapFromEmployees(employeeRows);

  return patientRows.map((row) => mapPatient(row, practitionerNameByClinicianId));
}

export async function getBusinessPatientDetail(
  businessId: string,
  patientId: string,
): Promise<BusinessPatientDetail> {
  const supabase = createSupabaseServerClient();
  const [employeeRows, patientResult, contextResult] = await Promise.all([
    getEmployeeRows(businessId),
    supabase
      .from("patients")
      .select(
        "id, full_name, email, phone, dob, department, risk_score, risk_tier, created_at, auth_user_id, paired_at, gp_id",
      )
      .eq("business_id", businessId)
      .eq("id", patientId)
      .maybeSingle(),
    supabase
      .from("patient_context_entries")
      .select(
        "id, entry_type, title, body_text, extracted_text, file_name, mime_type, file_bucket, file_path, created_at, created_by_employee_id",
      )
      .eq("business_id", businessId)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
  ]);

  if (patientResult.error) {
    throw new HttpError(500, patientResult.error.message);
  }

  if (!patientResult.data) {
    throw new HttpError(404, "Patient not found.");
  }

  if (contextResult.error) {
    throw new HttpError(500, contextResult.error.message);
  }

  const employeeNameById = employeeRows.reduce((map, employee) => {
    map.set(employee.id, employee.full_name);
    return map;
  }, new Map<string, string>());
  const practitionerNameByClinicianId = practitionerMapFromEmployees(employeeRows);
  const patient = patientResult.data as PatientRow;
  const basePatient = mapPatient(patient, practitionerNameByClinicianId);

  const contextEntries = await Promise.all(
    ((contextResult.data ?? []) as ContextEntryRow[]).map(async (entry): Promise<PatientContextEntry> => {
      let fileUrl: string | null = null;

      if (entry.file_bucket && entry.file_path) {
        const { data } = await supabase.storage.from(entry.file_bucket).createSignedUrl(entry.file_path, 60 * 60);
        fileUrl = data?.signedUrl ?? null;
      }

      return {
        id: entry.id,
        entry_type: entry.entry_type,
        title: entry.title,
        body_text: entry.body_text,
        extracted_text: entry.extracted_text,
        file_name: entry.file_name,
        mime_type: entry.mime_type,
        file_url: fileUrl,
        created_at: entry.created_at,
        created_by_name: entry.created_by_employee_id
          ? employeeNameById.get(entry.created_by_employee_id) ?? null
          : null,
      };
    }),
  );

  return {
    ...basePatient,
    auth_user_id: patient.auth_user_id,
    assigned_practitioner_id: patient.gp_id,
    assigned_practitioner_name: patient.gp_id
      ? practitionerNameByClinicianId.get(patient.gp_id) ?? null
      : null,
    context_entries: contextEntries,
  };
}

export function emptyOnboardingAnswers() {
  return { ...EMPTY_ONBOARDING };
}
