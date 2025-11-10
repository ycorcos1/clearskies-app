import type { WeatherSnapshot } from "../data/types";

const WEATHER_API_BASE_URL = "https://api.weatherapi.com/v1/current.json";
const RETRY_DELAYS_MS = [0, 5_000, 15_000, 45_000];
const REQUEST_TIMEOUT_MS = 10_000;
const KNOTS_PER_MPH = 0.868976;

const THUNDERSTORM_KEYWORDS = ["thunder", "t-storm", "storm"];
const FOG_KEYWORDS = ["fog", "mist", "haze"];
const PRECIPITATION_KEYWORDS = [
  "rain",
  "drizzle",
  "snow",
  "sleet",
  "hail",
  "shower",
];

export class WeatherApiError extends Error {
  readonly statusCode?: number;
  readonly attempts: number;

  constructor(
    message: string,
    attempts: number,
    statusCode?: number,
    cause?: Error
  ) {
    super(message);
    this.name = "WeatherApiError";
    this.statusCode = statusCode;
    this.attempts = attempts;

    if (cause) {
      this.cause = cause;
    }
  }
}

type WeatherApiResponse = {
  location: {
    localtime?: string;
  };
  current: {
    last_updated?: string;
    temp_c?: number;
    vis_miles?: number;
    wind_mph?: number;
    gust_mph?: number;
    cloud?: number;
    condition?: {
      text?: string;
    };
  };
};

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const ensureServerEnvironment = () => {
  if (typeof window !== "undefined") {
    throw new Error("getWeatherData must be executed on the server.");
  }
};

const validateCoordinates = (lat: number, lon: number) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Latitude and longitude must be finite numbers.");
  }

  if (Math.abs(lat) > 90) {
    throw new Error("Latitude must be between -90 and 90 degrees.");
  }

  if (Math.abs(lon) > 180) {
    throw new Error("Longitude must be between -180 and 180 degrees.");
  }
};

const toKnots = (mph?: number): number => {
  if (!Number.isFinite(mph)) {
    return 0;
  }

  const knots = (mph as number) * KNOTS_PER_MPH;
  return Math.round(knots * 10) / 10;
};

const normalizeNumber = (value?: number, fallback = 0): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Number(value);
};

const parseObservedAt = (lastUpdated?: string, localtime?: string): string => {
  const fallbacks = [lastUpdated, localtime];

  for (const candidate of fallbacks) {
    if (!candidate) {
      continue;
    }

    const normalized = candidate.replace(" ", "T");
    const parsed = new Date(normalized);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
};

const detectHazards = (conditionText: string, icingRisk: boolean) => {
  const lowerText = conditionText.toLowerCase();

  const hasThunderstorm = THUNDERSTORM_KEYWORDS.some((keyword) =>
    lowerText.includes(keyword)
  );

  const hasFog = FOG_KEYWORDS.some((keyword) => lowerText.includes(keyword));

  const hasPrecipitation = PRECIPITATION_KEYWORDS.some((keyword) =>
    lowerText.includes(keyword)
  );

  return {
    hasThunderstorm,
    hasFog,
    hasPrecipitation,
    icingRisk,
  };
};

const fetchWithRetry = async (
  url: string,
  attempts: number
): Promise<Response> => {
  let attempt = 0;
  let lastError: Error | undefined;
  let lastStatus: number | undefined;

  while (attempt < attempts) {
    const delayMs =
      RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    if (delayMs > 0) {
      await delay(delayMs);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        lastStatus = response.status;
        lastError = new Error(
          `WeatherAPI responded with status ${response.status}`
        );
        attempt += 1;
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError =
        error instanceof Error
          ? error
          : new Error("Unknown error during WeatherAPI request.");
      attempt += 1;
    }
  }

  throw new WeatherApiError(
    lastError?.message ?? "Failed to fetch WeatherAPI data.",
    attempts,
    lastStatus,
    lastError
  );
};

export const getWeatherData = async (
  lat: number,
  lon: number
): Promise<WeatherSnapshot> => {
  ensureServerEnvironment();
  validateCoordinates(lat, lon);

  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "WEATHER_API_KEY is not defined. Set it in your environment to call WeatherAPI."
    );
  }

  const url = new URL(WEATHER_API_BASE_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", `${lat},${lon}`);
  url.searchParams.set("aqi", "no");

  const response = await fetchWithRetry(url.toString(), RETRY_DELAYS_MS.length);
  const payload = (await response.json()) as WeatherApiResponse;

  const visibilityMiles = normalizeNumber(payload.current?.vis_miles);
  const windKts = toKnots(payload.current?.wind_mph);
  const gustKtsRaw = toKnots(payload.current?.gust_mph);
  const gustKts = gustKtsRaw > 0 ? gustKtsRaw : windKts;
  const cloudPercent = normalizeNumber(payload.current?.cloud);
  const tempC = normalizeNumber(payload.current?.temp_c);
  const conditionText = payload.current?.condition?.text ?? "Unknown";

  const icingRisk = tempC <= 0 && cloudPercent > 50;
  const hazards = detectHazards(conditionText, icingRisk);
  const observedAt = parseObservedAt(
    payload.current?.last_updated,
    payload.location?.localtime
  );

  const snapshot: WeatherSnapshot = {
    visibilityMiles,
    windKts,
    gustKts,
    cloudPercent,
    tempC,
    conditionText,
    hazards,
    observedAt,
    provider: "weatherapi",
  };

  return snapshot;
};
