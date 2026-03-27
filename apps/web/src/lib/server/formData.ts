import { HttpError } from "@/lib/server/http";

export function readStringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function readRequiredStringField(formData: FormData, key: string, label: string) {
  const value = readStringField(formData, key);

  if (!value) {
    throw new HttpError(400, `${label} is required.`);
  }

  return value;
}

export function readOptionalFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}
