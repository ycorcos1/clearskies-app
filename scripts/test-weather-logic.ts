import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import { getWeatherData } from "../src/lib/weatherAPI";
import type { TrainingLevel } from "../src/data/types";
import { evaluateWeatherSafety } from "../src/utils/weatherLogic";

const maybeLoadEnvFile = () => {
  const envPath = resolve(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const contents = readFileSync(envPath, "utf-8");
  const lines = contents.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");

    if (!key) {
      continue;
    }

    const value = valueParts.join("=").trim();

    if (value && !(key in process.env)) {
      process.env[key] = value;
    }
  }
};

const requireApiKey = () => {
  if (!process.env.WEATHER_API_KEY) {
    console.warn(
      "[weather:logic:test] WEATHER_API_KEY is not set. Add it to your environment or .env.local."
    );
    process.exitCode = 1;
    return false;
  }

  return true;
};

const formatViolations = (violations: string[]) => {
  if (!violations.length) {
    return "none";
  }

  if (violations.length === 1) {
    return violations[0];
  }

  return violations
    .map((violation, index) => `${index + 1}. ${violation}`)
    .join(" | ");
};

const run = async () => {
  maybeLoadEnvFile();

  if (!requireApiKey()) {
    return;
  }

  try {
    const snapshot = await getWeatherData(37.4611, -122.115);
    const trainingLevels: TrainingLevel[] = [
      "student",
      "private",
      "instrument",
    ];

    for (const level of trainingLevels) {
      const evaluation = evaluateWeatherSafety(snapshot, level);
      const {
        status,
        violations,
        metrics: {
          visibilityMiles,
          windKts,
          gustKts,
          cloudPercent,
          inferredCeilingFt,
          tempC,
        },
      } = evaluation;

      console.log(
        `[${level}] status=${status} visibility=${visibilityMiles}mi wind=${windKts}kt gust=${gustKts}kt cloud=${cloudPercent}% ceiling=${
          inferredCeilingFt ?? "n/a"
        }ft temp=${tempC}C violations=${formatViolations(violations)}`
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[weather:logic:test] Unexpected error: ${error.message}`);
    } else {
      console.error("[weather:logic:test] Unknown error encountered.");
    }
    process.exitCode = 1;
  }
};

run();
