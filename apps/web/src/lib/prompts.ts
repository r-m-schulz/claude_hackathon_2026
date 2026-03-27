import { DEPARTMENTS, type Department } from "@triageai/shared";

export type DepartmentPromptSet = {
  imageAnalysis: string;
  surveyGeneration: string;
  surveyAnalysis: string;
};

export const DEPARTMENT_PROMPTS: Record<Department, DepartmentPromptSet> =
  Object.fromEntries(
    DEPARTMENTS.map((department) => [
      department,
      {
        imageAnalysis: `TODO: add ${department} image analysis prompt.`,
        surveyGeneration: `TODO: add ${department} survey generation prompt.`,
        surveyAnalysis: `TODO: add ${department} survey analysis prompt.`,
      },
    ]),
  ) as Record<Department, DepartmentPromptSet>;
