import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import type {
  NotificationAudience,
  NotificationChannel,
  NotificationEmailContext,
  NotificationEvent,
  NotificationQueueRecord,
  NotificationType,
  StudentRecord,
} from "../types";
import {
  extractNotificationSettings,
  isEmailDeliveryConfigured,
  logNotificationEvent,
  renderEmailTemplate,
  sendEmailNotification,
  shouldSendEmailNotification,
} from "./notifications";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const logger = functions.logger;

const QUEUE_COLLECTION = "notificationQueue";
const STUDENTS_COLLECTION = "students";
const NOTIFICATIONS_COLLECTION = "notificationEvents";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_HOURS = 8;

type EnqueueParams = {
  bookingId: string;
  studentId: string;
  instructorId?: string | null;
  type: NotificationType;
  channel?: NotificationChannel;
  payload: NotificationEmailContext;
};

const getQueueDocId = (
  bookingId: string,
  recipientId: string,
  type: NotificationType,
  channel: NotificationChannel
) => `${bookingId}-${recipientId}-${type}-${channel}`;

export const enqueueForRecipient = async ({
  bookingId,
  studentId,
  recipientId,
  audience,
  type,
  channel,
  payload,
}: {
  bookingId: string;
  studentId: string;
  recipientId: string;
  audience: NotificationAudience;
  type: NotificationType;
  channel: NotificationChannel;
  payload: NotificationEmailContext;
}): Promise<void> => {
  const queueRef = db
    .collection(QUEUE_COLLECTION)
    .doc(getQueueDocId(bookingId, recipientId, type, channel));
  const now = admin.firestore.FieldValue.serverTimestamp();

  const payloadWithAudience: NotificationEmailContext = {
    ...payload,
    audience,
  };

  // Create in-app notification immediately (don't wait for queue processing)
  try {
    const student = await resolveUser(studentId);
    const message = buildNotificationMessage(
      type,
      payloadWithAudience,
      audience,
      student
    );

    await createInAppNotification({
      userId: recipientId,
      type,
      bookingId,
      message,
    });
  } catch (error) {
    logger.error("Failed to create in-app notification", {
      bookingId,
      recipientId,
      error,
    });
    // Don't throw - continue with email queue
  }

  // Queue email notification for processing
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(queueRef);

    if (!snapshot.exists) {
      transaction.set(queueRef, {
        bookingId,
        studentId,
        recipientId,
        audience,
        type,
        channel,
        status: "pending",
        attempts: 0,
        scheduledAt: now,
        createdAt: now,
        updatedAt: now,
        payload: payloadWithAudience,
      });
      return;
    }

    const data = snapshot.data() as NotificationQueueRecord;

    if (data.status === "sent") {
      transaction.update(queueRef, {
        payload: payloadWithAudience,
        studentId,
        recipientId,
        audience,
        updatedAt: now,
      });
      return;
    }

    transaction.update(queueRef, {
      payload: payloadWithAudience,
      studentId,
      recipientId,
      audience,
      status: "pending",
      scheduledAt: now,
      updatedAt: now,
    });
  });

  logger.info("Notification enqueued", {
    bookingId,
    studentId,
    recipientId,
    audience,
    type,
    channel,
  });
};

export const enqueueNotification = async ({
  bookingId,
  studentId,
  instructorId,
  type,
  channel = "email",
  payload,
}: EnqueueParams): Promise<void> => {
  await enqueueForRecipient({
    bookingId,
    studentId,
    recipientId: studentId,
    audience: "student",
    type,
    channel,
    payload,
  });

  if (instructorId) {
    await enqueueForRecipient({
      bookingId,
      studentId,
      recipientId: instructorId,
      audience: "instructor",
      type,
      channel,
      payload,
    });
  }
};

const scheduleNextAttempt = (attempts: number) => {
  const next = new Date();
  const multiplier = Math.max(1, attempts);
  next.setHours(next.getHours() + RETRY_DELAY_HOURS * multiplier);
  return admin.firestore.Timestamp.fromDate(next);
};

const resolveUser = async (
  userId: string
): Promise<StudentRecord | undefined> => {
  if (!userId) {
    return undefined;
  }

  try {
    const snap = await db.collection(STUDENTS_COLLECTION).doc(userId).get();
    if (!snap.exists) {
      return undefined;
    }

    return snap.data() as StudentRecord;
  } catch (error) {
    logger.error("Failed to load user for notification", {
      userId,
      error,
    });
    return undefined;
  }
};

const createInAppNotification = async ({
  userId,
  type,
  bookingId,
  message,
  skipIfExists = false,
}: {
  userId: string;
  type: NotificationType;
  bookingId: string;
  message: string;
  skipIfExists?: boolean;
}): Promise<void> => {
  if (!userId || !message.trim()) {
    return;
  }

  const eventId = `${userId}-${bookingId}-${type}`;
  const eventRef = db.collection(NOTIFICATIONS_COLLECTION).doc(eventId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(eventRef);

      if (snapshot.exists && skipIfExists) {
        logger.debug("In-app notification already exists, skipping", {
          userId,
          bookingId,
          type,
        });
        return;
      }

      const existing = snapshot.exists
        ? (snapshot.data() as NotificationEvent)
        : null;
      const createdAt = existing?.createdAt ?? now;

      transaction.set(
        eventRef,
        {
          userId,
          type,
          bookingId,
          message,
          read: false,
          createdAt,
          updatedAt: now,
        },
        { merge: true }
      );
    });

    logger.info("In-app notification stored", {
      userId,
      bookingId,
      type,
    });
  } catch (error) {
    logger.error("Failed to create in-app notification", {
      userId,
      bookingId,
      type,
      error,
    });
  }
};

const formatFlightLabel = (context: NotificationEmailContext) => {
  const date = context.scheduledDate ?? "upcoming date";
  const time = context.scheduledTime ? ` at ${context.scheduledTime}` : "";
  return `${date}${time}`;
};

const buildNotificationMessage = (
  type: NotificationType,
  context: NotificationEmailContext,
  audience: NotificationAudience,
  student?: StudentRecord
): string => {
  const label = formatFlightLabel(context);
  const studentName = context.studentName ?? student?.name ?? "Student";

  switch (type) {
    case "weather_alert":
      return audience === "instructor"
        ? `${studentName}'s flight ${label} requires weather attention.`
        : `Weather alert for your flight ${label}. Conditions require attention.`;
    case "reschedule_confirmation":
      return audience === "instructor"
        ? `${studentName}'s flight has been rescheduled to ${label}.`
        : `Flight rescheduled to ${label}.`;
    case "cancellation":
      return audience === "instructor"
        ? `${studentName}'s flight ${label} was cancelled.`
        : `Flight ${label} was cancelled.`;
    case "weather_improved":
      return audience === "instructor"
        ? `${studentName}'s flight ${label} is now cleared by weather.`
        : `Weather has improved for your flight ${label}.`;
    default:
      return audience === "instructor"
        ? `${studentName} has an update for flight ${label}.`
        : `Update available for your flight ${label}.`;
  }
};

const sendInAppNotification = async ({
  record,
  student,
  context,
  skipIfExists = false,
}: {
  record: NotificationQueueRecord;
  student?: StudentRecord;
  context: NotificationEmailContext;
  skipIfExists?: boolean;
}): Promise<void> => {
  const audience = record.audience ?? context.audience ?? "student";
  const message = buildNotificationMessage(
    record.type,
    context,
    audience,
    student
  );

  const recipientId = record.recipientId ?? record.studentId;

  await createInAppNotification({
    userId: recipientId,
    type: record.type,
    bookingId: record.bookingId,
    message,
    skipIfExists,
  });
};

const shouldProcess = (
  record: NotificationQueueRecord,
  now: admin.firestore.Timestamp
): boolean => {
  if (record.status !== "pending") {
    return false;
  }

  if (!record.scheduledAt) {
    return true;
  }

  const scheduledAt = record.scheduledAt as unknown as {
    toMillis?: () => number;
  };

  if (typeof scheduledAt?.toMillis !== "function") {
    return true;
  }

  return scheduledAt.toMillis() <= now.toMillis();
};

export const processPendingNotifications = async (): Promise<void> => {
  const now = admin.firestore.Timestamp.now();

  let snapshot;
  try {
    snapshot = await db
      .collection(QUEUE_COLLECTION)
      .where("status", "==", "pending")
      .where("scheduledAt", "<=", now)
      .limit(20)
      .get();
  } catch (error) {
    logger.error("Failed to query notification queue", { error });
    return;
  }

  if (snapshot.empty) {
    logger.info("No pending notifications to process.");
    return;
  }

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as NotificationQueueRecord;
    const docRef = docSnap.ref;

    if (!shouldProcess(data, now)) {
      continue;
    }

    await docRef.update({
      status: "processing",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const student = await resolveUser(data.studentId);
    const recipientId = data.recipientId ?? data.studentId;
    const recipient =
      recipientId === data.studentId ? student : await resolveUser(recipientId);
    const audience: NotificationAudience =
      data.audience ??
      data.payload.audience ??
      (recipientId === data.studentId ? "student" : "instructor");

    const notificationSettings = extractNotificationSettings(recipient);

    const context: NotificationEmailContext = {
      ...data.payload,
      audience,
      studentName: data.payload.studentName ?? student?.name,
      trainingLevel:
        data.payload.trainingLevel ?? student?.trainingLevel ?? "student",
      scheduledDate: data.payload.scheduledDate,
      scheduledTime: data.payload.scheduledTime,
      locationName: data.payload.locationName,
      studentEmail: student?.email ?? data.payload.studentEmail,
      recipientName: data.payload.recipientName ?? recipient?.name,
      recipientEmail: data.payload.recipientEmail ?? recipient?.email,
    };

    if (
      !shouldSendEmailNotification(notificationSettings, data.type) ||
      !recipient?.email
    ) {
      const reason = !recipient?.email
        ? "Recipient email unavailable"
        : "Notification preference disabled";

      await docRef.update({
        status: "sent",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastError: reason,
      });

      await logNotificationEvent({
        type: data.type,
        channel: data.channel,
        bookingId: data.bookingId,
        userId: recipientId,
        status: "sent",
        attempt: data.attempts,
        errorMessage: reason,
      });

      await sendInAppNotification({
        record: data,
        student,
        context,
        skipIfExists: true, // Skip if already created by enqueueForRecipient
      });

      continue;
    }

    if (!isEmailDeliveryConfigured()) {
      const reason = "Email delivery not configured";

      await docRef.update({
        status: "sent",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastError: reason,
      });

      await logNotificationEvent({
        type: data.type,
        channel: data.channel,
        bookingId: data.bookingId,
        userId: recipientId,
        status: "sent",
        attempt: data.attempts,
        errorMessage: reason,
      });

      await sendInAppNotification({
        record: data,
        student,
        context,
        skipIfExists: true, // Skip if already created by enqueueForRecipient
      });

      continue;
    }

    const attemptNumber = data.attempts + 1;

    try {
      const emailContext: NotificationEmailContext = {
        ...context,
        recipientEmail: recipient?.email ?? context.recipientEmail,
        recipientName: context.recipientName,
      };

      const { subject, html } = renderEmailTemplate(data.type, emailContext);

      const info = await sendEmailNotification({
        to: recipient!.email as string,
        subject,
        html,
      });

      await docRef.update({
        status: "sent",
        attempts: attemptNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastError: admin.firestore.FieldValue.delete(),
      });

      await logNotificationEvent({
        type: data.type,
        channel: data.channel,
        bookingId: data.bookingId,
        userId: recipientId,
        status: "sent",
        attempt: attemptNumber,
        messageId: info.messageId,
      });

      await sendInAppNotification({
        record: data,
        student,
        context,
        skipIfExists: true, // Skip if already created by enqueueForRecipient
      });
    } catch (error) {
      logger.error("Failed to send notification email", {
        bookingId: data.bookingId,
        studentId: data.studentId,
        error,
      });

      const shouldRetry = attemptNumber < MAX_ATTEMPTS;

      await docRef.update({
        attempts: attemptNumber,
        status: shouldRetry ? "pending" : "failed",
        scheduledAt: shouldRetry
          ? scheduleNextAttempt(attemptNumber)
          : data.scheduledAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastError:
          error instanceof Error ? error.message : "Unknown notification error",
      });

      await logNotificationEvent({
        type: data.type,
        channel: data.channel,
        bookingId: data.bookingId,
        userId: recipientId,
        status: "failed",
        attempt: attemptNumber,
        errorMessage:
          error instanceof Error ? error.message : "Unknown notification error",
      });
    }
  }
};
