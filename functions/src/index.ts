import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { getWeatherData, WeatherApiError } from "./clients/weatherApi";
import { evaluateWeatherSafety } from "./logic/evaluateWeatherSafety";
import {
  AiReschedulerError,
  generateAIReschedule,
} from "./logic/aiRescheduler";
import type {
  FlightBookingRecord,
  StudentRecord,
  TrainingLevel,
  WeatherSnapshot,
} from "./types";
import {
  enqueueNotification,
  enqueueForRecipient,
  processPendingNotifications,
} from "./logic/notificationQueue";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const logger = functions.logger;

export const ping = functions.https.onRequest((request, response) => {
  response.status(200).json({
    ok: true,
    service: "functions",
    time: new Date().toISOString(),
  });
});

const isTrainingLevel = (value: unknown): value is TrainingLevel => {
  return value === "student" || value === "private" || value === "instrument";
};

const getUtcDateStart = (date: Date): Date => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
};

const formatDateIso = (date: Date): string => {
  return date.toISOString().split("T")[0] ?? "";
};

type ErrorLogType = "weather_api" | "firestore" | "openai_api";

const logError = async (params: {
  type: ErrorLogType;
  message: string;
  bookingId?: string;
  studentId?: string;
  retryCount?: number;
  cause?: unknown;
}) => {
  const { type, message, bookingId, studentId, retryCount, cause } = params;

  logger.error(message, {
    type,
    bookingId,
    studentId,
    cause,
  });

  const payload: Record<string, unknown> = {
    type,
    message,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    retryCount: retryCount ?? 0,
    resolved: false,
  };

  if (bookingId) {
    payload.bookingId = bookingId;
  }

  if (studentId) {
    payload.studentId = studentId;
  }

  try {
    await db.collection("errorLogs").add(payload);
  } catch (error) {
    logger.error("Failed to log error to Firestore", {
      originalMessage: message,
      error,
    });
  }
};

const findFirstInstructorId = async (): Promise<string | null> => {
  try {
    const snapshot = await db
      .collection("students")
      .where("role", "==", "instructor")
      .orderBy("name", "asc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].id;
  } catch (error) {
    logger.error("Failed to resolve instructor", { error });
    return null;
  }
};

const assertStringField = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `${fieldName} must be a string`
    );
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `${fieldName} must be a non-empty string`
    );
  }

  return trimmed;
};

const assertTrainingLevelField = (value: unknown): TrainingLevel => {
  if (typeof value !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "trainingLevel must be a string"
    );
  }

  if (!isTrainingLevel(value)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "trainingLevel must be one of: student, private, instrument"
    );
  }

  return value;
};

const parseViolations = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "violations must be an array of strings"
    );
  }

  const normalized = value.map((entry, index) => {
    if (typeof entry !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `violations[${index}] must be a string`
      );
    }

    return entry.trim();
  });

  return normalized.filter((item) => item.length > 0);
};

const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_PROMPT_VERSION = "2025-11-08.v1";

const createTrainingLevelResolver = () => {
  const cache = new Map<string, TrainingLevel>();

  return async (studentId: string | undefined): Promise<TrainingLevel> => {
    if (!studentId) {
      return "student";
    }

    const cached = cache.get(studentId);
    if (cached) {
      return cached;
    }

    try {
      const studentSnap = await db.collection("students").doc(studentId).get();

      if (!studentSnap.exists) {
        logger.warn("Student document missing when resolving training level", {
          studentId,
        });
        return "student";
      }

      const data = studentSnap.data() as StudentRecord | undefined;

      if (data && isTrainingLevel(data.trainingLevel)) {
        cache.set(studentId, data.trainingLevel);
        return data.trainingLevel;
      }

      logger.warn("Student training level missing or invalid", {
        studentId,
        trainingLevel: data?.trainingLevel,
      });
      return "student";
    } catch (error) {
      await logError({
        type: "firestore",
        message: "Failed to load student training level",
        studentId,
        cause: error,
      });
      return "student";
    }
  };
};

export const checkWeatherStatus = functions
  .region("us-central1")
  .pubsub.schedule("every 1 hours")
  .onRun(async () => {
    const now = new Date();
    const startDate = getUtcDateStart(now);
    const endDate = getUtcDateStart(now);
    endDate.setUTCDate(endDate.getUTCDate() + 7);

    const startIso = formatDateIso(startDate);
    const endIso = formatDateIso(endDate);

    logger.info("Starting hourly weather check", {
      startIso,
      endIso,
    });

    let bookingsSnapshot;

    try {
      bookingsSnapshot = await db
        .collection("bookings")
        .where("status", "==", "scheduled")
        .where("scheduledDate", ">=", startIso)
        .where("scheduledDate", "<=", endIso)
        .get();
    } catch (error) {
      await logError({
        type: "firestore",
        message: "Failed to query bookings for weather check",
        cause: error,
      });
      return null;
    }

    if (bookingsSnapshot.empty) {
      logger.info("No scheduled bookings requiring weather check.");
      return null;
    }

    const resolveTrainingLevel = createTrainingLevelResolver();

    for (const docSnap of bookingsSnapshot.docs) {
      const bookingId = docSnap.id;
      const data = docSnap.data() as FlightBookingRecord;

      if (data.status !== "scheduled") {
        continue;
      }

      const studentId = data.studentId;
      const departure = data.departureLocation;
      const isDemoBooking = Boolean(data.demo);
      const demoSnapshot = data.demoWeather as WeatherSnapshot | undefined;
      const locationName = departure?.name ?? "Unknown location";

      // Skip demo bookings without demo weather snapshot (don't use real weather)
      if (isDemoBooking && !demoSnapshot) {
        logger.warn("Demo booking missing demoWeather snapshot, skipping", {
          bookingId,
        });
        continue;
      }

      if (
        !isDemoBooking &&
        (!departure ||
          !Number.isFinite(departure.lat) ||
          !Number.isFinite(departure.lon))
      ) {
        await logError({
          type: "firestore",
          message: "Booking missing valid departure coordinates",
          bookingId,
          studentId,
        });
        continue;
      }

      try {
        // For demo bookings, always use the booking's stored training level
        // This ensures consistent evaluation based on the training level at booking creation
        const trainingLevel = isDemoBooking
          ? isTrainingLevel(data.trainingLevel)
            ? data.trainingLevel
            : "student"
          : isTrainingLevel(data.trainingLevel)
          ? data.trainingLevel
          : await resolveTrainingLevel(studentId);
        let weatherSnapshot: WeatherSnapshot;

        if (isDemoBooking && demoSnapshot) {
          weatherSnapshot = demoSnapshot;
        } else {
          if (
            !departure ||
            !Number.isFinite(departure.lat) ||
            !Number.isFinite(departure.lon)
          ) {
            throw new Error("Missing coordinates for live weather lookup.");
          }

          weatherSnapshot = await getWeatherData(departure.lat, departure.lon);
        }

        const evaluation = evaluateWeatherSafety(
          weatherSnapshot,
          trainingLevel
        );

        await docSnap.ref.update({
          weatherStatus: evaluation.status,
          lastWeatherCheck: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (evaluation.status === "unsafe" && studentId) {
          try {
            await enqueueNotification({
              bookingId,
              studentId,
              instructorId: data.assignedInstructor,
              type: "weather_alert",
              payload: {
                scheduledDate: data.scheduledDate,
                scheduledTime: data.scheduledTime,
                locationName,
                trainingLevel,
                studentName: data.studentName,
                violations: evaluation.violations,
              },
            });
          } catch (enqueueError) {
            await logError({
              type: "firestore",
              message: "Failed to enqueue weather alert notification",
              bookingId,
              studentId,
              cause: enqueueError,
            });
          }
        }

        logger.info("Updated booking weather status", {
          bookingId,
          status: evaluation.status,
          trainingLevel,
          violations: evaluation.violations.length,
          visibility: weatherSnapshot.visibilityMiles,
          wind: weatherSnapshot.windKts,
          cloud: weatherSnapshot.cloudPercent,
          hasFog: weatherSnapshot.hazards.hasFog,
          usingDemoSnapshot: isDemoBooking && !!demoSnapshot,
        });
      } catch (error) {
        if (error instanceof WeatherApiError) {
          await logError({
            type: "weather_api",
            message: error.message,
            bookingId,
            studentId,
            retryCount: error.attempts - 1,
            cause: error,
          });
        } else {
          await logError({
            type: "firestore",
            message: error instanceof Error ? error.message : "Unknown error",
            bookingId,
            studentId,
            cause: error,
          });
        }
      }
    }

    logger.info("Completed hourly weather check", {
      processed: bookingsSnapshot.size,
    });

    return null;
  });

export const manualWeatherCheck = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required to refresh weather data."
      );
    }

    const bookingId = assertStringField(data?.bookingId, "bookingId");

    let bookingSnap;
    try {
      bookingSnap = await db.collection("bookings").doc(bookingId).get();
    } catch (error) {
      await logError({
        type: "firestore",
        message: "Failed to load booking for manual weather check",
        bookingId,
        studentId: context.auth.uid,
        cause: error,
      });
      throw new functions.https.HttpsError(
        "internal",
        "Unable to load booking. Please try again."
      );
    }

    if (!bookingSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Flight booking not found."
      );
    }

    const bookingData = bookingSnap.data() as FlightBookingRecord;

    if (bookingData.studentId && bookingData.studentId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You can only refresh weather data for your own flights."
      );
    }

    if (bookingData.status !== "scheduled") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Only scheduled flights can be refreshed."
      );
    }

    const departure = bookingData.departureLocation;

    if (
      !departure ||
      !Number.isFinite(departure.lat) ||
      !Number.isFinite(departure.lon)
    ) {
      await logError({
        type: "firestore",
        message: "Booking missing valid departure coordinates",
        bookingId,
        studentId: bookingData.studentId,
      });

      throw new functions.https.HttpsError(
        "failed-precondition",
        "This booking is missing departure coordinates."
      );
    }

    const resolveTrainingLevel = createTrainingLevelResolver();

    const trainingLevel = isTrainingLevel(bookingData.trainingLevel)
      ? bookingData.trainingLevel
      : await resolveTrainingLevel(bookingData.studentId);

    const isDemoBooking = Boolean(bookingData.demo);
    const demoSnapshot = bookingData.demoWeather;

    try {
      let weatherSnapshot: WeatherSnapshot;

      if (isDemoBooking && demoSnapshot) {
        weatherSnapshot = demoSnapshot;
      } else {
        if (isDemoBooking && !demoSnapshot) {
          logger.warn("Demo booking missing demoWeather snapshot", {
            bookingId,
          });
        }

        weatherSnapshot = await getWeatherData(departure.lat, departure.lon);
      }

      const evaluation = evaluateWeatherSafety(weatherSnapshot, trainingLevel);

      await bookingSnap.ref.update({
        weatherStatus: evaluation.status,
        trainingLevel,
        lastWeatherCheck: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (evaluation.status === "unsafe" && bookingData.studentId) {
        try {
          await enqueueNotification({
            bookingId,
            studentId: bookingData.studentId,
            instructorId: bookingData.assignedInstructor,
            type: "weather_alert",
            payload: {
              scheduledDate: bookingData.scheduledDate,
              scheduledTime: bookingData.scheduledTime,
              locationName: departure.name,
              trainingLevel,
              studentName: bookingData.studentName,
              violations: evaluation.violations,
            },
          });
        } catch (enqueueError) {
          await logError({
            type: "firestore",
            message: "Failed to enqueue weather alert notification",
            bookingId,
            studentId: data.studentId,
            cause: enqueueError,
          });
        }
      }

      logger.info("Manual weather refresh completed", {
        bookingId,
        status: evaluation.status,
        trainingLevel,
      });

      return {
        status: evaluation.status,
        trainingLevel,
        violations: evaluation.violations,
        metrics: evaluation.metrics,
      };
    } catch (error) {
      if (error instanceof WeatherApiError) {
        await logError({
          type: "weather_api",
          message: error.message,
          bookingId,
          studentId: data.studentId,
          retryCount: error.attempts - 1,
          cause: error,
        });

        throw new functions.https.HttpsError(
          "unavailable",
          "Weather data is temporarily unavailable. Please try again shortly."
        );
      }

      await logError({
        type: "firestore",
        message: error instanceof Error ? error.message : "Unknown error",
        bookingId,
        studentId: data.studentId,
        cause: error,
      });

      throw new functions.https.HttpsError(
        "internal",
        "Unable to refresh weather data. Please try again."
      );
    }
  });

export const getWeatherSnapshot = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const uid = context.auth?.uid;

    if (!uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required to fetch weather data."
      );
    }

    const latRaw = data?.lat;
    const lonRaw = data?.lon;

    const lat =
      typeof latRaw === "number"
        ? latRaw
        : typeof latRaw === "string"
        ? Number.parseFloat(latRaw)
        : Number.NaN;
    const lon =
      typeof lonRaw === "number"
        ? lonRaw
        : typeof lonRaw === "string"
        ? Number.parseFloat(lonRaw)
        : Number.NaN;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Valid latitude and longitude are required."
      );
    }

    try {
      const snapshot = await getWeatherData(lat, lon);

      return {
        snapshot,
      };
    } catch (error) {
      await logError({
        type: "weather_api",
        message: "Failed to fetch weather snapshot",
        studentId: uid,
        cause: error,
      });

      throw new functions.https.HttpsError(
        "internal",
        "Failed to fetch weather data. Please try again."
      );
    }
  });

export const cancelBooking = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const uid = context.auth?.uid;

    if (!uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required to cancel a flight."
      );
    }

    const bookingId = assertStringField(data?.bookingId, "bookingId");

    let bookingSnap;
    try {
      bookingSnap = await db.collection("bookings").doc(bookingId).get();
    } catch (error) {
      await logError({
        type: "firestore",
        message: "Failed to load booking for cancellation",
        bookingId,
        studentId: uid,
        cause: error,
      });
      throw new functions.https.HttpsError(
        "internal",
        "Unable to load booking. Please try again."
      );
    }

    if (!bookingSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Flight booking not found."
      );
    }

    const bookingData = bookingSnap.data() as FlightBookingRecord;

    if (bookingData.status !== "scheduled") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Only scheduled flights can be cancelled."
      );
    }

    const isStudent = bookingData.studentId === uid;
    const isInstructor = bookingData.assignedInstructor === uid;

    if (!isStudent && !isInstructor) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You are not authorized to cancel this flight."
      );
    }

    try {
      await bookingSnap.ref.update({
        status: "cancelled",
        cancelledBy: uid,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        lastModified: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      await logError({
        type: "firestore",
        message: "Failed to update booking during cancellation",
        bookingId,
        studentId: bookingData.studentId,
        cause: error,
      });

      throw new functions.https.HttpsError(
        "internal",
        "Unable to cancel this flight. Please try again."
      );
    }

    if (bookingData.studentId) {
      try {
        // Only notify the OTHER party, not the person who cancelled
        if (isStudent && bookingData.assignedInstructor) {
          // Student cancelled - notify instructor only
          await enqueueForRecipient({
            bookingId,
            studentId: bookingData.studentId,
            recipientId: bookingData.assignedInstructor,
            audience: "instructor",
            type: "cancellation",
            channel: "email",
            payload: {
              scheduledDate: bookingData.scheduledDate,
              scheduledTime: bookingData.scheduledTime,
              locationName: bookingData.departureLocation?.name,
              studentName: bookingData.studentName,
            },
          });
        } else if (isInstructor) {
          // Instructor cancelled - notify student only
          await enqueueForRecipient({
            bookingId,
            studentId: bookingData.studentId,
            recipientId: bookingData.studentId,
            audience: "student",
            type: "cancellation",
            channel: "email",
            payload: {
              scheduledDate: bookingData.scheduledDate,
              scheduledTime: bookingData.scheduledTime,
              locationName: bookingData.departureLocation?.name,
              studentName: bookingData.studentName,
            },
          });
        }
      } catch (enqueueError) {
        await logError({
          type: "firestore",
          message: "Failed to enqueue cancellation notification",
          bookingId,
          studentId: bookingData.studentId,
          cause: enqueueError,
        });
      }
    }

    logger.info("Booking cancelled", {
      bookingId,
      cancelledBy: uid,
      studentId: bookingData.studentId,
      assignedInstructor: bookingData.assignedInstructor,
    });

    return { success: true };
  });

export const generateRescheduleSuggestions = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required to request AI reschedule suggestions."
      );
    }

    const openaiConfig = functions.config().openai ?? {};
    const apiKey =
      typeof openaiConfig.api_key === "string" ? openaiConfig.api_key : "";

    if (!apiKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "OpenAI API key is not configured. Set functions.config().openai.api_key before calling this function."
      );
    }

    const model =
      typeof openaiConfig.model === "string" && openaiConfig.model.trim()
        ? openaiConfig.model.trim()
        : OPENAI_DEFAULT_MODEL;
    const promptVersion =
      typeof openaiConfig.prompt_version === "string" &&
      openaiConfig.prompt_version.trim()
        ? openaiConfig.prompt_version.trim()
        : OPENAI_PROMPT_VERSION;

    const bookingId = assertStringField(data?.bookingId, "bookingId");
    const studentName = assertStringField(data?.studentName, "studentName");
    const trainingLevel = assertTrainingLevelField(data?.trainingLevel);
    const scheduledDate = assertStringField(
      data?.scheduledDate,
      "scheduledDate"
    );
    const scheduledTime = assertStringField(
      data?.scheduledTime,
      "scheduledTime"
    );
    const locationName = assertStringField(data?.locationName, "locationName");
    const violations = parseViolations(data?.violations);

    const studentId =
      typeof data?.studentId === "string" && data.studentId.trim()
        ? data.studentId.trim()
        : undefined;

    try {
      const result = await generateAIReschedule(
        {
          bookingId,
          studentName,
          trainingLevel,
          scheduledDate,
          scheduledTime,
          locationName,
          violations,
        },
        {
          db,
          apiKey,
          model,
          promptVersion,
          requestTimeoutMs: 15000,
          serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
        }
      );

      logger.info("Generated AI reschedule suggestions", {
        bookingId,
        model,
        promptVersion,
        requester: context.auth.uid,
      });

      return result;
    } catch (error) {
      if (error instanceof AiReschedulerError) {
        await logError({
          type: "openai_api",
          message: error.message,
          bookingId,
          studentId,
          cause: error.causeValue ?? error,
        });

        const code =
          error.code === "validation_error" ? "invalid-argument" : "internal";

        throw new functions.https.HttpsError(
          code,
          "Failed to generate AI reschedule suggestions. Please try again later."
        );
      }

      await logError({
        type: "openai_api",
        message: error instanceof Error ? error.message : "Unknown AI error",
        bookingId,
        studentId,
        cause: error,
      });

      throw new functions.https.HttpsError(
        "internal",
        "Unexpected error while generating AI reschedule suggestions."
      );
    }
  });

export const confirmReschedule = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const uid = context.auth?.uid;

    if (!uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required to confirm a reschedule."
      );
    }

    const bookingId = assertStringField(data?.bookingId, "bookingId");
    const newDate = assertStringField(data?.newDate, "newDate");
    const newTime = assertStringField(data?.newTime, "newTime");

    let bookingSnap;
    try {
      bookingSnap = await db.collection("bookings").doc(bookingId).get();
    } catch (error) {
      await logError({
        type: "firestore",
        message: "Failed to load booking for reschedule",
        bookingId,
        studentId: uid,
        cause: error,
      });
      throw new functions.https.HttpsError(
        "internal",
        "Unable to load booking. Please try again."
      );
    }

    if (!bookingSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Flight booking not found."
      );
    }

    const bookingData = bookingSnap.data() as FlightBookingRecord;

    if (bookingData.status !== "scheduled") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Only scheduled flights can be rescheduled."
      );
    }

    const isStudent = bookingData.studentId === uid;
    const isInstructor = bookingData.assignedInstructor === uid;

    if (!isStudent && !isInstructor) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You are not authorized to reschedule this flight."
      );
    }

    // Only students can reschedule (instructors can only cancel)
    if (!isStudent) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only students can reschedule flights. Instructors can cancel flights."
      );
    }

    try {
      await bookingSnap.ref.update({
        scheduledDate: newDate,
        scheduledTime: newTime,
        weatherStatus: null,
        lastWeatherCheck: null,
        lastModified: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      await logError({
        type: "firestore",
        message: "Failed to update booking during reschedule",
        bookingId,
        studentId: bookingData.studentId,
        cause: error,
      });

      throw new functions.https.HttpsError(
        "internal",
        "Unable to reschedule this flight. Please try again."
      );
    }

    // Only notify the instructor (student initiated the reschedule)
    if (bookingData.assignedInstructor) {
      try {
        await enqueueForRecipient({
          bookingId,
          studentId: bookingData.studentId ?? "",
          recipientId: bookingData.assignedInstructor,
          audience: "instructor",
          type: "reschedule_confirmation",
          channel: "email",
          payload: {
            scheduledDate: newDate,
            scheduledTime: newTime,
            locationName: bookingData.departureLocation?.name,
            studentName: bookingData.studentName,
            aiExplanation: data?.aiExplanation,
          },
        });
      } catch (enqueueError) {
        await logError({
          type: "firestore",
          message: "Failed to enqueue reschedule notification",
          bookingId,
          studentId: bookingData.studentId,
          cause: enqueueError,
        });
      }
    }

    logger.info("Booking rescheduled", {
      bookingId,
      rescheduledBy: uid,
      studentId: bookingData.studentId,
      newDate,
      newTime,
    });

    return { success: true, newDate, newTime };
  });

export const updateTrainingLevel = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const uid = context.auth?.uid;

    if (!uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required."
      );
    }

    const newTrainingLevel = assertTrainingLevelField(data?.newTrainingLevel);

    let studentSnap;
    try {
      studentSnap = await db.collection("students").doc(uid).get();
    } catch (error) {
      await logError({
        type: "firestore",
        message: "Failed to load student profile",
        studentId: uid,
        cause: error,
      });
      throw new functions.https.HttpsError(
        "internal",
        "Unable to load student profile."
      );
    }

    if (!studentSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Student profile not found."
      );
    }

    const studentData = studentSnap.data() as StudentRecord | undefined;
    const studentRole = studentData?.role ?? "student";

    if (studentRole !== "student") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only student accounts can change training level."
      );
    }

    let assignedInstructor: string | null = null;

    if (newTrainingLevel === "student") {
      assignedInstructor = await findFirstInstructorId();
    }

    await studentSnap.ref.update({
      trainingLevel: newTrainingLevel,
      assignedInstructor,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const bookingsSnap = await db
      .collection("bookings")
      .where("studentId", "==", uid)
      .where("status", "==", "scheduled")
      .get();

    for (const bookingDoc of bookingsSnap.docs) {
      const bookingRef = bookingDoc.ref;
      const bookingData = bookingDoc.data() as FlightBookingRecord;

      const reschedulesSnap = await bookingRef
        .collection("aiReschedules")
        .get();
      for (const rescheduleDoc of reschedulesSnap.docs) {
        await rescheduleDoc.ref.delete();
      }

      const departure = bookingData.departureLocation;
      const isDemoBooking = Boolean(bookingData.demo);
      const demoSnapshot = bookingData.demoWeather as
        | WeatherSnapshot
        | undefined;
      const hasCoordinates =
        departure &&
        Number.isFinite(departure.lat) &&
        Number.isFinite(departure.lon);

      if (isDemoBooking && demoSnapshot) {
        const evaluation = evaluateWeatherSafety(
          demoSnapshot,
          newTrainingLevel
        );

        logger.info("Weather re-evaluated for demo booking", {
          bookingId: bookingRef.id,
          trainingLevel: newTrainingLevel,
          weatherStatus: evaluation.status,
          violations: evaluation.violations.length,
          visibility: demoSnapshot.visibilityMiles,
          wind: demoSnapshot.windKts,
          cloud: demoSnapshot.cloudPercent,
          usingDemoSnapshot: true,
        });

        await bookingRef.update({
          trainingLevel: newTrainingLevel,
          assignedInstructor,
          weatherStatus: evaluation.status,
          lastWeatherCheck: admin.firestore.FieldValue.serverTimestamp(),
          lastModified: admin.firestore.FieldValue.serverTimestamp(),
        });

        continue;
      }

      if (isDemoBooking && !demoSnapshot) {
        logger.warn("Demo booking missing demoWeather snapshot", {
          bookingId: bookingRef.id,
          hasDemo: bookingData.demo,
          hasDemoWeather: !!bookingData.demoWeather,
        });
        // Skip this booking - can't re-evaluate without demo weather
        await bookingRef.update({
          trainingLevel: newTrainingLevel,
          assignedInstructor,
          lastModified: admin.firestore.FieldValue.serverTimestamp(),
        });
        continue;
      }

      if (hasCoordinates) {
        try {
          const weatherSnapshot = await getWeatherData(
            departure!.lat,
            departure!.lon
          );

          const evaluation = evaluateWeatherSafety(
            weatherSnapshot,
            newTrainingLevel
          );

          logger.info("Weather re-evaluated for booking", {
            bookingId: bookingRef.id,
            trainingLevel: newTrainingLevel,
            weatherStatus: evaluation.status,
            violations: evaluation.violations.length,
            visibility: weatherSnapshot.visibilityMiles,
            wind: weatherSnapshot.windKts,
            cloud: weatherSnapshot.cloudPercent,
            usingDemoSnapshot: false,
          });

          await bookingRef.update({
            trainingLevel: newTrainingLevel,
            assignedInstructor,
            weatherStatus: evaluation.status,
            lastWeatherCheck: admin.firestore.FieldValue.serverTimestamp(),
            lastModified: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (error) {
          if (error instanceof WeatherApiError) {
            await logError({
              type: "weather_api",
              message: error.message,
              bookingId: bookingRef.id,
              studentId: uid,
              retryCount: error.attempts - 1,
              cause: error,
            });
          } else {
            await logError({
              type: "firestore",
              message: error instanceof Error ? error.message : "Unknown error",
              bookingId: bookingRef.id,
              studentId: uid,
              cause: error,
            });
          }

          await bookingRef.update({
            trainingLevel: newTrainingLevel,
            assignedInstructor,
            weatherStatus: null,
            lastWeatherCheck: null,
            lastModified: admin.firestore.FieldValue.serverTimestamp(),
          });

          logger.warn("Weather re-evaluation failed, set status to null", {
            bookingId: bookingRef.id,
            trainingLevel: newTrainingLevel,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } else {
        await bookingRef.update({
          trainingLevel: newTrainingLevel,
          assignedInstructor,
          weatherStatus: null,
          lastWeatherCheck: null,
          lastModified: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.warn("No valid departure location for booking", {
          bookingId: bookingRef.id,
          trainingLevel: newTrainingLevel,
        });
      }
    }

    logger.info("Training level updated", {
      studentId: uid,
      trainingLevel: newTrainingLevel,
      assignedInstructor,
      bookingsUpdated: bookingsSnap.size,
    });

    return { ok: true, trainingLevel: newTrainingLevel, assignedInstructor };
  });

export const listNotificationEvents = functions
  .region("us-central1")
  .https.onCall(async (_data, context) => {
    const uid = context.auth?.uid;

    if (!uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required."
      );
    }

    try {
      const snapshot = await db
        .collection("notificationEvents")
        .where("userId", "==", uid)
        .where("read", "==", false)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const events = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      logger.info("Fetched notification events", {
        uid,
        count: events.length,
      });

      return { events };
    } catch (error) {
      await logError({
        type: "firestore",
        message: "Failed to list notification events",
        studentId: uid,
        cause: error,
      });

      throw new functions.https.HttpsError(
        "internal",
        "Failed to load notifications."
      );
    }
  });

export const processNotificationQueue = functions
  .region("us-central1")
  .pubsub.schedule("every 1 hours")
  .onRun(async () => {
    await processPendingNotifications();
    return null;
  });
