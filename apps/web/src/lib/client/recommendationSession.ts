import type { CriticalScheduleRecommendation } from "@triageai/shared";

const STORAGE_KEY = "triageai.latest-critical-recommendation";

export function saveLatestCriticalRecommendation(recommendation: CriticalScheduleRecommendation) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recommendation));
}

export function loadLatestCriticalRecommendation(): CriticalScheduleRecommendation | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CriticalScheduleRecommendation;
  } catch {
    return null;
  }
}

export function clearLatestCriticalRecommendation() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
}
