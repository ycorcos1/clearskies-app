import { getFunctions, httpsCallable } from "firebase/functions";

import type { TrainingLevel, WeatherSnapshot } from "../data/types";
import app from "./firebaseConfig";

const functions = getFunctions(app, "us-central1");

export interface ManualWeatherCheckResult {
  status: "safe" | "caution" | "unsafe";
  trainingLevel: TrainingLevel;
  violations: string[];
  metrics: {
    visibilityMiles: number;
    windKts: number;
    gustKts: number;
    cloudPercent: number;
    tempC: number;
    hazards: WeatherSnapshot["hazards"];
    inferredCeilingFt: number | null;
  };
}

const validateResult = (payload: unknown): ManualWeatherCheckResult => {
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new Error("Invalid weather response format.");
  }

  const { status, trainingLevel, violations, metrics } = payload as Record<
    string,
    unknown
  >;

  if (status !== "safe" && status !== "caution" && status !== "unsafe") {
    throw new Error("Invalid weather status received.");
  }

  if (
    trainingLevel !== "student" &&
    trainingLevel !== "private" &&
    trainingLevel !== "instrument"
  ) {
    throw new Error("Invalid training level returned.");
  }

  if (!Array.isArray(violations)) {
    throw new Error("Violations missing from response.");
  }

  if (typeof metrics !== "object" || metrics === null) {
    throw new Error("Weather metrics missing from response.");
  }

  const normalizedViolations = violations
    .map((item) => (typeof item === "string" ? item : ""))
    .filter(Boolean);

  const metricsRecord = metrics as Record<string, unknown>;

  const parseNumber = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const hazardsRaw = metricsRecord.hazards;
  const hazards =
    typeof hazardsRaw === "object" && hazardsRaw !== null
      ? (hazardsRaw as WeatherSnapshot["hazards"])
      : {
          hasThunderstorm: false,
          hasFog: false,
          hasPrecipitation: false,
          icingRisk: false,
        };

  const inferredCeiling =
    typeof metricsRecord.inferredCeilingFt === "number"
      ? metricsRecord.inferredCeilingFt
      : null;

  return {
    status,
    trainingLevel,
    violations: normalizedViolations,
    metrics: {
      visibilityMiles: parseNumber(metricsRecord.visibilityMiles),
      windKts: parseNumber(metricsRecord.windKts),
      gustKts: parseNumber(metricsRecord.gustKts),
      cloudPercent: parseNumber(metricsRecord.cloudPercent),
      tempC: parseNumber(metricsRecord.tempC),
      hazards,
      inferredCeilingFt: inferredCeiling,
    },
  };
};

export const refreshWeatherForBooking = async (
  bookingId: string
): Promise<ManualWeatherCheckResult> => {
  if (!bookingId) {
    throw new Error("Invalid booking identifier.");
  }

  const callable = httpsCallable<{ bookingId: string }, unknown>(
    functions,
    "manualWeatherCheck"
  );

  const response = await callable({ bookingId });

  return validateResult(response.data);
};
