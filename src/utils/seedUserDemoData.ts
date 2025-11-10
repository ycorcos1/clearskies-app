"use client";

import {
  Timestamp,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

import type { TrainingLevel, WeatherSnapshot } from "../data/types";
import app, { db } from "../lib/firebaseConfig";
import { evaluateWeatherSafety } from "./weatherLogic";

type SeedUserDemoDataParams = {
  userId: string;
  studentName: string;
  email?: string | null;
  instructorId: string;
  useRealWeather?: boolean;
};

type SeedResult =
  | {
      seeded: true;
      totalBookings: number;
    }
  | {
      seeded: false;
      reason: string;
    };

const airports = {
  pao: {
    name: "Palo Alto Airport (PAO)",
    lat: 37.4611,
    lon: -122.115,
  },
  sql: {
    name: "San Carlos Airport (SQL)",
    lat: 37.5119,
    lon: -122.2495,
  },
  rhv: {
    name: "Reid-Hillview Airport (RHV)",
    lat: 37.3329,
    lon: -121.8195,
  },
  sjc: {
    name: "San Jose International (SJC)",
    lat: 37.3639,
    lon: -121.929,
  },
  hwd: {
    name: "Hayward Executive Airport (HWD)",
    lat: 37.6592,
    lon: -122.1218,
  },
};

const getDateString = (daysFromNow: number): string => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0] ?? "";
};

const nowTimestamp = () => Timestamp.fromDate(new Date());

const functionsInstance = getFunctions(app, "us-central1");

const getWeatherSnapshotCallable = httpsCallable<
  { lat: number; lon: number },
  { snapshot: WeatherSnapshot }
>(functionsInstance, "getWeatherSnapshot");

const fetchWeatherSnapshot = async (
  lat: number,
  lon: number
): Promise<WeatherSnapshot | null> => {
  try {
    const result = await getWeatherSnapshotCallable({ lat, lon });
    const snapshot = result.data.snapshot;

    if (!snapshot) {
      throw new Error("Missing weather snapshot");
    }

    return snapshot;
  } catch (error) {
    console.error("Failed to fetch weather snapshot", { lat, lon, error });
    return null;
  }
};

const deleteExistingDemoData = async (userId: string) => {
  const demoQuery = query(
    collection(db, "bookings"),
    where("studentId", "==", userId),
    where("demo", "==", true)
  );

  const snapshot = await getDocs(demoQuery);
  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(db);

  for (const bookingDoc of snapshot.docs) {
    const bookingRef = bookingDoc.ref;
    const reschedules = await getDocs(collection(bookingRef, "aiReschedules"));

    reschedules.forEach((rescheduleDoc) => {
      batch.delete(rescheduleDoc.ref);
    });

    batch.delete(bookingRef);
  }

  await batch.commit();
};

type DemoWeatherProfileKey =
  | "safeClear"
  | "breezyCaution"
  | "lowVisibilityUnsafe"
  | "thunderstormUnsafe";

const demoWeatherTemplates: Record<
  DemoWeatherProfileKey,
  Omit<WeatherSnapshot, "observedAt">
> = {
  safeClear: {
    visibilityMiles: 8,
    windKts: 6.0, // Match WeatherAPI precision (1 decimal place)
    gustKts: 9.0, // Match WeatherAPI precision (1 decimal place)
    cloudPercent: 20,
    tempC: 18,
    conditionText: "Clear",
    hazards: {
      hasThunderstorm: false,
      hasFog: false,
      hasPrecipitation: false,
      icingRisk: false,
    },
    provider: "demo",
  },
  breezyCaution: {
    visibilityMiles: 6.8,
    windKts: 8.0, // Match WeatherAPI precision
    gustKts: 16.0, // Match WeatherAPI precision
    cloudPercent: 28,
    tempC: 17,
    conditionText: "Partly cloudy",
    hazards: {
      hasThunderstorm: false,
      hasFog: false,
      hasPrecipitation: false,
      icingRisk: false,
    },
    provider: "demo",
  },
  lowVisibilityUnsafe: {
    visibilityMiles: 2.4,
    windKts: 8.0, // Match WeatherAPI precision
    gustKts: 12.0, // Match WeatherAPI precision
    cloudPercent: 35,
    tempC: 12,
    conditionText: "Fog",
    hazards: {
      hasThunderstorm: false,
      hasFog: true,
      hasPrecipitation: false,
      icingRisk: false,
    },
    provider: "demo",
  },
  thunderstormUnsafe: {
    visibilityMiles: 5.5,
    windKts: 14.0, // Match WeatherAPI precision
    gustKts: 24.0, // Match WeatherAPI precision
    cloudPercent: 68,
    tempC: 19,
    conditionText: "Thunderstorm",
    hazards: {
      hasThunderstorm: true,
      hasFog: false,
      hasPrecipitation: true,
      icingRisk: false,
    },
    provider: "demo",
  },
};

const createDemoWeatherSnapshot = (
  key: DemoWeatherProfileKey
): WeatherSnapshot => {
  const template = demoWeatherTemplates[key];
  return {
    ...template,
    observedAt: new Date().toISOString(),
  };
};

type DemoBookingConfig = {
  offset: number;
  time: string;
  location: (typeof airports)[keyof typeof airports];
  includeAi: boolean;
  weatherProfile: DemoWeatherProfileKey;
  violations?: string[];
};

export const seedUserDemoData = async ({
  userId,
  studentName,
  email,
  instructorId,
  useRealWeather = false,
}: SeedUserDemoDataParams): Promise<SeedResult> => {
  if (!userId) {
    return {
      seeded: false,
      reason: "Missing user identifier.",
    };
  }

  if (!instructorId) {
    return {
      seeded: false,
      reason: "Please select an instructor to pair with this student.",
    };
  }

  await deleteExistingDemoData(userId);

  const createdAt = nowTimestamp();
  const baseName = studentName || "Demo Pilot";
  const normalizedLevel: TrainingLevel = "student";

  const bookings: DemoBookingConfig[] = [
    {
      offset: 1,
      time: "09:00 AM",
      location: airports.pao,
      includeAi: false,
      weatherProfile: "safeClear",
    },
    {
      offset: 2,
      time: "11:30 AM",
      location: airports.sql,
      includeAi: true,
      weatherProfile: "lowVisibilityUnsafe",
      violations: [
        "Visibility below minimum for Student Pilots (2.4 mi)",
        "Fog requires postponing until conditions improve",
      ],
    },
    {
      offset: 3,
      time: "07:45 AM",
      location: airports.rhv,
      includeAi: false,
      weatherProfile: "breezyCaution",
      violations: ["Morning winds forecast gusting above 15 kt"],
    },
    {
      offset: 4,
      time: "01:15 PM",
      location: airports.hwd,
      includeAi: false,
      weatherProfile: "safeClear",
    },
    {
      offset: 5,
      time: "10:00 AM",
      location: airports.sjc,
      includeAi: true,
      weatherProfile: "thunderstormUnsafe",
      violations: [
        "Thunderstorms present within 10 nm",
        "Convective activity exceeds student safety limits",
      ],
    },
    {
      offset: 7,
      time: "03:20 PM",
      location: airports.sql,
      includeAi: false,
      weatherProfile: "safeClear",
    },
    {
      offset: 10,
      time: "08:30 AM",
      location: airports.pao,
      includeAi: false,
      weatherProfile: "breezyCaution",
      violations: ["Gusts expected near pattern altitude"],
    },
  ];

  const batch = writeBatch(db);
  const seededIds: string[] = [];

  for (const [index, booking] of bookings.entries()) {
    const bookingId = `demo-${userId}-${index + 1}`;
    const bookingRef = doc(db, "bookings", bookingId);

    const weatherSnapshot = useRealWeather
      ? (await fetchWeatherSnapshot(
          booking.location.lat,
          booking.location.lon
        )) ?? createDemoWeatherSnapshot(booking.weatherProfile)
      : createDemoWeatherSnapshot(booking.weatherProfile);

    const evaluation = evaluateWeatherSafety(weatherSnapshot, normalizedLevel);

    batch.set(bookingRef, {
      studentId: userId,
      studentName: baseName,
      trainingLevel: normalizedLevel,
      assignedInstructor: instructorId,
      scheduledDate: getDateString(booking.offset),
      scheduledTime: booking.time,
      departureLocation: booking.location,
      status: "scheduled",
      weatherStatus: evaluation.status,
      lastWeatherCheck: createdAt,
      createdAt,
      demo: true,
      demoWeather: weatherSnapshot,
    });

    seededIds.push(bookingId);
  }

  const studentRef = doc(db, "students", userId);

  batch.set(
    studentRef,
    {
      id: userId,
      name: baseName,
      email: email ?? null,
      trainingLevel: normalizedLevel,
      assignedInstructor: instructorId,
      lastSeededAt: createdAt,
      updatedAt: createdAt,
    },
    { merge: true }
  );

  await batch.commit();

  const aiSeedPromises = seededIds.map(async (bookingId, index) => {
    const bookingConfig = bookings[index];

    if (!bookingConfig.includeAi) {
      return;
    }

    const bookingRef = doc(db, "bookings", bookingId);
    const historyRef = collection(bookingRef, "aiReschedules");

    const explanation =
      index % 2 === 0
        ? "Winds are gusting beyond student pilot limits. Recommend delaying until midday lull."
        : "Convective activity detected along departure corridor. Safer to depart once thunderstorms have cleared.";

    const suggestions = [
      {
        date: getDateString(bookingConfig.offset + 1),
        time: "11:30 AM",
        reason: "Surface winds forecast to decrease below 10 kt.",
      },
      {
        date: getDateString(bookingConfig.offset + 2),
        time: "08:15 AM",
        reason:
          "Visibility expected to improve above 6 mi with scattered clouds.",
      },
      {
        date: getDateString(bookingConfig.offset + 3),
        time: "02:45 PM",
        reason:
          "Thunderstorm risk cleared; stable conditions with light winds.",
      },
    ];

    await setDoc(doc(historyRef), {
      explanation,
      suggestions,
      trainingLevel: normalizedLevel,
      violations: bookingConfig.violations ?? [],
      createdAt,
      demo: true,
    });
  });

  await Promise.all(aiSeedPromises);

  return {
    seeded: true,
    totalBookings: bookings.length,
  };
};
