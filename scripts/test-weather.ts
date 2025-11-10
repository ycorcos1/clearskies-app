import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import { WeatherApiError, getWeatherData } from "../src/lib/weatherAPI";

const maybeLoadEnvFile = () => {
  const envPath = resolve(process.cwd(), ".env.local");

  if (existsSync(envPath)) {
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
  }
};

const requireApiKey = () => {
  if (!process.env.WEATHER_API_KEY) {
    console.warn(
      "[weather:test] WEATHER_API_KEY is not set. Add it to your environment or .env.local."
    );
    process.exitCode = 1;
    return false;
  }

  return true;
};

const run = async () => {
  maybeLoadEnvFile();

  if (!requireApiKey()) {
    return;
  }

  try {
    const snapshot = await getWeatherData(37.4611, -122.115);
    console.log(
      `[weather:test] Weather snapshot for Palo Alto Airport: ${JSON.stringify(
        snapshot
      )}`
    );
  } catch (error) {
    if (error instanceof WeatherApiError) {
      console.error(
        `[weather:test] Weather API failed after ${error.attempts} attempts${
          error.statusCode ? ` (status ${error.statusCode})` : ""
        }: ${error.message}`
      );
    } else if (error instanceof Error) {
      console.error(`[weather:test] Unexpected error: ${error.message}`);
    } else {
      console.error("[weather:test] Unknown error encountered.");
    }
    process.exitCode = 1;
  }
};

run();
