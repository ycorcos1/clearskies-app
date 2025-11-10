import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

import type {
  NotificationChannel,
  NotificationEmailContext,
  NotificationEventRecord,
  NotificationType,
  StudentNotificationSettings,
  StudentRecord,
} from "../types";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const logger = functions.logger;

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

let cachedConfig: SmtpConfig | null | undefined;
let transporter: nodemailer.Transporter | null = null;

const readSmtpConfig = (): SmtpConfig | null => {
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  const config = functions.config().smtp ?? {};
  const host = typeof config.host === "string" ? config.host.trim() : "";
  const portValue = typeof config.port === "string" ? config.port.trim() : "";
  const user = typeof config.user === "string" ? config.user.trim() : "";
  const pass = typeof config.pass === "string" ? config.pass.trim() : "";
  const from =
    typeof config.from === "string" && config.from.trim()
      ? config.from.trim()
      : "ClearSkies <no-reply@clearskies.app>";

  if (!host || !user || !pass) {
    cachedConfig = null;
    return null;
  }

  const portNumber = Number.parseInt(portValue, 10);

  cachedConfig = {
    host,
    port: Number.isFinite(portNumber) ? portNumber : 587,
    secure: false,
    user,
    pass,
    from,
  };

  return cachedConfig;
};

const ensureTransporter = (): nodemailer.Transporter | null => {
  const smtpConfig = readSmtpConfig();

  if (!smtpConfig) {
    transporter = null;
    return null;
  }

  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  return transporter;
};

export const isEmailDeliveryConfigured = (): boolean => {
  return ensureTransporter() != null;
};

export const shouldSendEmailNotification = (
  settings: StudentNotificationSettings | undefined,
  type: NotificationType
): boolean => {
  if (!settings) {
    return true;
  }

  switch (type) {
    case "weather_alert":
      return settings.emailWeatherAlerts ?? true;
    case "reschedule_confirmation":
      return settings.emailReschedule ?? true;
    case "weather_improved":
      return settings.emailWeatherImproved ?? true;
    default:
      return true;
  }
};

const renderHeader = (title: string) => {
  return `
    <tr>
      <td style="padding: 24px 24px 16px 24px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #1B4965; font-family: 'Inter', Arial, sans-serif;">
          ${title}
        </h1>
      </td>
    </tr>
  `;
};

const renderFooter = () => {
  return `
    <tr>
      <td style="padding: 24px; color: #7F8C8D; font-size: 12px; text-align: center; font-family: Arial, sans-serif;">
        ClearSkies © 2025 · AI-powered weather intelligence for safer flight training
      </td>
    </tr>
  `;
};

const renderViolations = (violations: string[] | undefined) => {
  if (!violations?.length) {
    return "";
  }

  const items = violations
    .map(
      (violation) =>
        `<li style="margin-bottom: 6px; color: #C0392B;">${violation}</li>`
    )
    .join("");

  return `
    <tr>
      <td style="padding: 0 24px 16px 24px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #C0392B; font-family: Arial, sans-serif;">
          Current Conditions
        </h3>
        <ul style="padding-left: 18px; margin: 0; font-size: 14px; color: #2C3E50; font-family: Arial, sans-serif;">
          ${items}
        </ul>
      </td>
    </tr>
  `;
};

const renderRescheduleOptions = (
  options: NotificationEmailContext["rescheduleOptions"]
) => {
  if (!options?.length) {
    return "";
  }

  const list = options
    .map((option, index) => {
      const label = `${index + 1}. ${option.date} at ${option.time}`;
      return `
        <li style="margin-bottom: 8px; color: #2C3E50;">
          <strong>${label}</strong><br />
          <span style="color: #566573;">${option.reason}</span>
        </li>
      `;
    })
    .join("");

  return `
    <tr>
      <td style="padding: 0 24px 16px 24px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1B4965; font-family: Arial, sans-serif;">
          Recommended Alternatives
        </h3>
        <ol style="padding-left: 18px; margin: 0; font-size: 14px; color: #2C3E50; font-family: Arial, sans-serif;">
          ${list}
        </ol>
      </td>
    </tr>
  `;
};

const formatFlightDetails = (context: NotificationEmailContext) => {
  const date =
    context.scheduledDate?.length === 10
      ? context.scheduledDate
      : context.scheduledDate ?? "Upcoming date";
  const time = context.scheduledTime ?? "";
  const location = context.locationName ?? "Scheduled location";

  return `
    <tr>
      <td style="padding: 0 24px 16px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="padding: 12px; border: 1px solid #E5E7EB; border-radius: 12px; background: #F7FAFC;">
                <p style="margin: 0; font-size: 14px; color: #2C3E50; font-family: Arial, sans-serif;">
                  <strong>Date:</strong> ${date}
                </p>
                ${
                  time
                    ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #2C3E50; font-family: Arial, sans-serif;">
                      <strong>Time:</strong> ${time}
                    </p>`
                    : ""
                }
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #2C3E50; font-family: Arial, sans-serif;">
                  <strong>Location:</strong> ${location}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  `;
};

const isInstructorAudience = (context: NotificationEmailContext): boolean => {
  return context.audience === "instructor";
};

const resolveStudentName = (context: NotificationEmailContext): string => {
  return context.studentName ?? "Student Pilot";
};

const resolveRecipientName = (context: NotificationEmailContext): string => {
  if (context.recipientName) {
    return context.recipientName;
  }

  if (isInstructorAudience(context)) {
    return "Instructor";
  }

  return context.studentName ?? "Pilot";
};

const buildEmailHtml = (bodyRows: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ClearSkies Notification</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #EDF2F7;">
        <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="width: 100%; background-color: #EDF2F7; padding: 32px 0;">
          <tbody>
            <tr>
              <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="width: 100%; max-width: 600px; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 35px rgba(15, 34, 58, 0.08);">
                  <tbody>
                    ${bodyRows}
                    ${renderFooter()}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
};

const renderWeatherAlertEmail = (
  context: NotificationEmailContext
): { subject: string; html: string } => {
  const studentName = resolveStudentName(context);
  const recipientName = resolveRecipientName(context);
  const dateLabel = context.scheduledDate ?? "upcoming date";
  const subject = isInstructorAudience(context)
    ? `⚠️ Weather Alert — ${studentName}'s Flight on ${dateLabel}`
    : `⚠️ Weather Alert — Flight on ${dateLabel} Requires Attention`;

  const intro = isInstructorAudience(context)
    ? `${studentName}'s scheduled flight has been flagged due to weather conditions below the required minimums. Review the details below to determine next steps with your student.`
    : "Your scheduled flight has been flagged due to unsafe weather conditions. Please review the details below and explore alternative scheduling options.";

  const rows = `
    ${renderHeader("Weather Alert")}
    <tr>
      <td style="padding: 0 24px 16px 24px;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #2C3E50; line-height: 1.6; font-family: Arial, sans-serif;">
          Hi ${recipientName},
        </p>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #2C3E50; line-height: 1.6; font-family: Arial, sans-serif;">
          ${intro}
        </p>
      </td>
    </tr>
    ${formatFlightDetails(context)}
    ${renderViolations(context.violations)}
    ${
      context.aiExplanation
        ? `
      <tr>
        <td style="padding: 0 24px 16px 24px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1B4965; font-family: Arial, sans-serif;">
            AI Recommendation
          </h3>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #2C3E50; font-family: Arial, sans-serif;">
            ${context.aiExplanation}
          </p>
        </td>
      </tr>
      `
        : ""
    }
    ${renderRescheduleOptions(context.rescheduleOptions)}
    ${
      context.actionUrl
        ? `
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <a href="${
          context.actionUrl
        }" style="display: inline-block; padding: 12px 20px; background: #2C82C9; color: #FFFFFF; text-decoration: none; border-radius: 999px; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">
          ${
            isInstructorAudience(context)
              ? "Review Flight Status"
              : "View Reschedule Options"
          }
        </a>
      </td>
    </tr>
    `
        : ""
    }
  `;

  return {
    subject,
    html: buildEmailHtml(rows),
  };
};

const renderRescheduleConfirmationEmail = (
  context: NotificationEmailContext
): { subject: string; html: string } => {
  const studentName = resolveStudentName(context);
  const recipientName = resolveRecipientName(context);
  const dateLabel = context.scheduledDate ?? "new date";
  const subject = isInstructorAudience(context)
    ? `✅ ${studentName}'s Flight Rescheduled — ${dateLabel}`
    : `✅ Flight Rescheduled — Confirmed for ${dateLabel}`;

  const intro = isInstructorAudience(context)
    ? `${studentName}'s lesson has been successfully rescheduled. Here are the updated details so you can prepare for the session.`
    : "Your flight has been successfully rescheduled. Here are your updated details:";

  const rows = `
    ${renderHeader("Flight Rescheduled")}
    <tr>
      <td style="padding: 0 24px 16px 24px;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #2C3E50; line-height: 1.6; font-family: Arial, sans-serif;">
          Hi ${recipientName},
        </p>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #2C3E50; line-height: 1.6; font-family: Arial, sans-serif;">
          ${intro}
        </p>
      </td>
    </tr>
    ${formatFlightDetails(context)}
    ${
      context.aiExplanation
        ? `
      <tr>
        <td style="padding: 0 24px 16px 24px;">
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #2C3E50; font-family: Arial, sans-serif;">
            ${context.aiExplanation}
          </p>
        </td>
      </tr>
      `
        : ""
    }
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <p style="margin: 0; font-size: 14px; color: #2C3E50; line-height: 1.6; font-family: Arial, sans-serif;">
          ${
            isInstructorAudience(context)
              ? "Coordinate with your student if any further adjustments are needed."
              : "Add this flight to your calendar to stay prepared."
          }
        </p>
      </td>
    </tr>
  `;

  return {
    subject,
    html: buildEmailHtml(rows),
  };
};

const renderWeatherImprovedEmail = (
  context: NotificationEmailContext
): { subject: string; html: string } => {
  const studentName = resolveStudentName(context);
  const recipientName = resolveRecipientName(context);
  const dateLabel = context.scheduledDate ?? "upcoming date";
  const subject = isInstructorAudience(context)
    ? `☀️ Weather Improved — ${studentName}'s Flight on ${dateLabel} is Clear`
    : `☀️ Weather Improved — Flight on ${dateLabel} is Clear`;

  const intro = isInstructorAudience(context)
    ? `Good news! Weather conditions for ${studentName}'s upcoming lesson now meet the required minimums.`
    : "Great news! Weather conditions for your upcoming flight have improved and it is now safe to proceed.";

  const rows = `
    ${renderHeader("All Clear")}
    <tr>
      <td style="padding: 0 24px 16px 24px;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #2C3E50; line-height: 1.6; font-family: Arial, sans-serif;">
          Hi ${recipientName},
        </p>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #2C3E50; line-height: 1.6; font-family: Arial, sans-serif;">
          ${intro}
        </p>
      </td>
    </tr>
    ${formatFlightDetails(context)}
    ${renderViolations(context.violations)}
  `;

  return {
    subject,
    html: buildEmailHtml(rows),
  };
};

const renderGenericEmail = (
  context: NotificationEmailContext
): { subject: string; html: string } => {
  const studentName = resolveStudentName(context);
  const recipientName = resolveRecipientName(context);
  const subject = isInstructorAudience(context)
    ? `ClearSkies Update — ${studentName}'s Flight`
    : "ClearSkies Notification";

  const intro = isInstructorAudience(context)
    ? `${studentName} has an update on their upcoming flight.`
    : "A new update is available for your ClearSkies account.";

  const rows = `
    ${renderHeader("Notification")}
    <tr>
      <td style="padding: 0 24px 16px 24px;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #2C3E50; line-height: 1.6; font-family: Arial, sans-serif;">
          Hi ${recipientName},
        </p>
        <p style="margin: 0; font-size: 14px; color: #2C3E50; line-height: 1.6; font-family: Arial, sans-serif;">
          ${intro}
        </p>
      </td>
    </tr>
    ${formatFlightDetails(context)}
  `;

  return {
    subject,
    html: buildEmailHtml(rows),
  };
};

export const renderEmailTemplate = (
  type: NotificationType,
  context: NotificationEmailContext
): { subject: string; html: string } => {
  switch (type) {
    case "weather_alert":
      return renderWeatherAlertEmail(context);
    case "reschedule_confirmation":
      return renderRescheduleConfirmationEmail(context);
    case "weather_improved":
      return renderWeatherImprovedEmail(context);
    default:
      return renderGenericEmail(context);
  }
};

export const sendEmailNotification = async (params: {
  to: string;
  subject: string;
  html: string;
}) => {
  const smtpConfig = readSmtpConfig();

  if (!smtpConfig) {
    logger.warn("SMTP not configured — skipping email send", {
      to: params.to,
      subject: params.subject,
    });
    return { messageId: undefined };
  }

  const activeTransporter = ensureTransporter();

  if (!activeTransporter) {
    logger.error("Nodemailer transporter unavailable");
    throw new Error("Email transporter unavailable");
  }

  const info = await activeTransporter.sendMail({
    from: smtpConfig.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  return {
    messageId: info.messageId as string | undefined,
  };
};

export const logNotificationEvent = async (params: {
  type: NotificationType;
  channel: NotificationChannel;
  bookingId: string;
  userId: string;
  status: NotificationEventRecord["status"];
  attempt: number;
  messageId?: string;
  errorMessage?: string;
}) => {
  try {
    await db.collection("notificationLogs").add({
      type: params.type,
      channel: params.channel,
      bookingId: params.bookingId,
      userId: params.userId,
      status: params.status,
      attempt: params.attempt,
      messageId: params.messageId ?? null,
      errorMessage: params.errorMessage ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error("Failed to log notification event", {
      bookingId: params.bookingId,
      userId: params.userId,
      type: params.type,
      error,
    });
  }
};

export const extractNotificationSettings = (
  student: StudentRecord | undefined
): StudentNotificationSettings | undefined => {
  return student?.settings?.notifications;
};
