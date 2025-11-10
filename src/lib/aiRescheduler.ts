import { getFunctions, httpsCallable } from "firebase/functions";

import type { AIRescheduleResponse, TrainingLevel } from "../data/types";
import app from "./firebaseConfig";

const functions = getFunctions(app, "us-central1");

export interface RequestAIRescheduleParams {
  bookingId: string;
  studentId?: string;
  studentName: string;
  trainingLevel: TrainingLevel;
  scheduledDate: string;
  scheduledTime: string;
  locationName: string;
  violations: string[];
}

const validateResponse = (payload: unknown): AIRescheduleResponse => {
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new Error("Invalid AI reschedule response format.");
  }

  const { explanation, suggestions } = payload as Record<string, unknown>;

  if (typeof explanation !== "string" || !explanation.trim()) {
    throw new Error("AI response missing explanation.");
  }

  if (!Array.isArray(suggestions) || suggestions.length !== 3) {
    throw new Error("AI response must include exactly 3 suggestions.");
  }

  const normalizedSuggestions = suggestions.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`Suggestion ${index + 1} is invalid.`);
    }

    const { date, time, reason } = entry as Record<string, unknown>;

    if (typeof date !== "string" || !date.trim()) {
      throw new Error(`Suggestion ${index + 1} missing date.`);
    }

    if (typeof time !== "string" || !time.trim()) {
      throw new Error(`Suggestion ${index + 1} missing time.`);
    }

    if (typeof reason !== "string" || !reason.trim()) {
      throw new Error(`Suggestion ${index + 1} missing reason.`);
    }

    return {
      date: date.trim(),
      time: time.trim(),
      reason: reason.trim(),
    };
  });

  const uniquePairs = new Set(
    normalizedSuggestions.map(
      (suggestion) => `${suggestion.date}__${suggestion.time}`
    )
  );

  if (uniquePairs.size !== normalizedSuggestions.length) {
    throw new Error("AI suggestions must be unique.");
  }

  return {
    explanation: explanation.trim(),
    suggestions: normalizedSuggestions,
  };
};

export const requestAIReschedule = async (
  params: RequestAIRescheduleParams
): Promise<AIRescheduleResponse> => {
  const violations = params.violations
    .map((item) => item.trim())
    .filter(Boolean);

  const callable = httpsCallable<
    RequestAIRescheduleParams,
    AIRescheduleResponse
  >(functions, "generateRescheduleSuggestions");

  const result = await callable({
    bookingId: params.bookingId,
    studentId: params.studentId,
    studentName: params.studentName,
    trainingLevel: params.trainingLevel,
    scheduledDate: params.scheduledDate,
    scheduledTime: params.scheduledTime,
    locationName: params.locationName,
    violations,
  });

  return validateResponse(result.data);
};
