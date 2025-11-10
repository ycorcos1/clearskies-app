import type {
  TrainingLevel,
  WeatherHazards,
  WeatherSnapshot,
} from "../data/types";

export type SafetyStatus = "safe" | "caution" | "unsafe";

export interface WeatherSafetyEvaluation {
  status: SafetyStatus;
  violations: string[];
  metrics: {
    visibilityMiles: number;
    windKts: number;
    gustKts: number;
    cloudPercent: number;
    tempC: number;
    hazards: WeatherHazards;
    inferredCeilingFt: number | null;
  };
}

const TRAINING_LABEL: Record<TrainingLevel, string> = {
  student: "Student Pilot",
  private: "Private Pilot",
  instrument: "Instrument Rated",
};

const estimateCeilingFt = (cloudPercent: number): number | null => {
  if (!Number.isFinite(cloudPercent)) {
    return null;
  }

  if (cloudPercent <= 40) {
    return 3000;
  }

  if (cloudPercent <= 75) {
    return 1500;
  }

  return 800;
};

const withinMargin = (value: number, threshold: number, margin = 0.1) => {
  if (!Number.isFinite(value) || !Number.isFinite(threshold)) {
    return false;
  }

  const lowerBound = threshold * (1 - margin);
  return value >= lowerBound && value < threshold;
};

const formatValue = (value: number | null, unit: string) => {
  if (value == null) {
    return `unknown ${unit}`.trim();
  }

  return `${value} ${unit}`.trim();
};

const pushHazardViolations = (
  hazards: WeatherHazards,
  trainingLevel: TrainingLevel,
  violations: string[]
) => {
  const trainingLabel = TRAINING_LABEL[trainingLevel];

  if (hazards.hasThunderstorm) {
    violations.push(
      `Thunderstorms present (not permitted for ${trainingLabel})`
    );
  }

  if (trainingLevel === "student") {
    if (hazards.hasFog) {
      violations.push(`Fog present (not permitted for ${trainingLabel})`);
    }

    if (hazards.hasPrecipitation) {
      violations.push(
        `Precipitation present (not permitted for ${trainingLabel})`
      );
    }

    return;
  }
};

export const evaluateWeatherSafety = (
  snapshot: WeatherSnapshot,
  trainingLevel: TrainingLevel
): WeatherSafetyEvaluation => {
  const { visibilityMiles, windKts, gustKts, cloudPercent, tempC, hazards } =
    snapshot;

  const inferredCeilingFt = estimateCeilingFt(cloudPercent);
  const trainingLabel = TRAINING_LABEL[trainingLevel];
  const violations: string[] = [];
  let caution = false;

  pushHazardViolations(hazards, trainingLevel, violations);

  if (trainingLevel === "student") {
    if (!(visibilityMiles > 5)) {
      violations.push(
        `Visibility: ${visibilityMiles} mi (minimum: 5 mi for ${trainingLabel})`
      );

      if (withinMargin(visibilityMiles, 5)) {
        caution = true;
      }
    }

    if (!(windKts < 10)) {
      violations.push(
        `Wind: ${windKts} kt (maximum: 10 kt for ${trainingLabel})`
      );
    } else if (gustKts >= 10) {
      caution = true;
    }

    if (!(cloudPercent <= 40)) {
      violations.push(
        `Cloud cover: ${cloudPercent}% (requires clear/scattered clouds for ${trainingLabel})`
      );

      if (cloudPercent <= 50) {
        caution = true;
      }
    }
  } else if (trainingLevel === "private") {
    if (!(visibilityMiles > 3)) {
      violations.push(
        `Visibility: ${visibilityMiles} mi (minimum: 3 mi for ${trainingLabel})`
      );

      if (withinMargin(visibilityMiles, 3)) {
        caution = true;
      }
    }

    if (!(windKts < 20)) {
      violations.push(
        `Wind: ${windKts} kt (maximum: 20 kt for ${trainingLabel})`
      );
    } else if (gustKts >= 20) {
      caution = true;
    }

    if (!(inferredCeilingFt != null && inferredCeilingFt > 1000)) {
      violations.push(
        `Ceiling: ${formatValue(
          inferredCeilingFt,
          "ft"
        )} (minimum: > 1000 ft for ${trainingLabel})`
      );

      if (
        inferredCeilingFt != null &&
        inferredCeilingFt > 900 &&
        inferredCeilingFt <= 1000
      ) {
        caution = true;
      }
    }

    if (hazards.hasPrecipitation && !hazards.hasThunderstorm) {
      caution = true;
    }
  } else {
    // Instrument rated
    if (!(visibilityMiles > 1)) {
      violations.push(
        `Visibility: ${visibilityMiles} mi (minimum: 1 mi for ${trainingLabel})`
      );

      if (withinMargin(visibilityMiles, 1)) {
        caution = true;
      }
    }

    if (hazards.icingRisk) {
      violations.push(
        `Icing risk detected (not permitted for ${trainingLabel})`
      );
    }

    if (gustKts >= 35 && !violations.length) {
      caution = true;
    }
  }

  const status: SafetyStatus = violations.length
    ? "unsafe"
    : caution
    ? "caution"
    : "safe";

  return {
    status,
    violations,
    metrics: {
      visibilityMiles,
      windKts,
      gustKts,
      cloudPercent,
      tempC,
      hazards,
      inferredCeilingFt,
    },
  };
};
