import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { getSecretJson } from "../secrets.mjs";
import {
  getNotificationSettings,
  listTickets,
  recordNotificationLog,
  getJourneyReminder,
  reserveJourneyReminder,
  upsertBookingRequest,
  upsertJourneyReminder
} from "./content.mjs";

const ses = new SESClient({});

export async function notifyAdminOfBookingRequest(request) {
  const settings = await getNotificationSettings();
  const message = [
    `New ${request.type.replace(/_/g, " ")} booking request`,
    `Customer: ${request.customerName}`,
    `Phone: ${request.phone}`,
    request.email ? `Email: ${request.email}` : "",
    request.packageName ? `Package: ${request.packageName}` : "",
    request.packageId ? `Package ID: ${request.packageId}` : "",
    request.selectedOption ? `Selected option: ${request.selectedOption}` : ""
  ].filter(Boolean).join("\n");
  const result = await deliverConfiguredNotifications({
    settings,
    purpose: "booking_request_admin",
    relatedId: request.requestId,
    recipientEmail: settings.adminNotificationEmail,
    recipientPhone: settings.adminNotificationPhone,
    subject: `Travelian booking request: ${request.packageName || request.type}`,
    message
  });
  return upsertBookingRequest({
    ...request,
    notificationStatus: result.sent ? "sent" : "failed",
    notificationError: result.sent ? "" : result.errors.join("; ")
  });
}

export async function runJourneyReminders() {
  const settings = await getNotificationSettings();
  if (!settings.journeyReminderEnabled) {
    return { checked: 0, sent: 0, failed: 0, skipped: true, reason: "Journey reminders are disabled" };
  }
  const tomorrow = dateOnlyInTimeZone(addDays(new Date(), 1));
  const leadTimeHours = Number(settings.journeyReminderHoursBefore || 24);
  const tickets = (await listTickets()).filter(ticket =>
    ticket.departureDate === tomorrow &&
    ["issued", "pending"].includes(ticket.status) &&
    hoursUntilDeparture(ticket) > 0 &&
    hoursUntilDeparture(ticket) <= leadTimeHours
  );
  let sent = 0;
  let failed = 0;
  for (const ticket of tickets) {
    const existing = await getJourneyReminder(ticket.ticketId, ticket.departureDate);
    if (existing) continue;
    const reserved = await reserveJourneyReminder({
      ticketId: ticket.ticketId,
      departureDate: ticket.departureDate,
      createdAt: new Date().toISOString()
    });
    if (!reserved) continue;
    const message = fillJourneyTemplate(settings.journeyReminderTemplate, ticket);
    const result = await deliverConfiguredNotifications({
      settings,
      purpose: "journey_reminder",
      relatedId: ticket.ticketId,
      recipientEmail: ticket.customerEmail,
      recipientPhone: ticket.customerPhone,
      subject: "Travelian safe journey reminder",
      message
    });
    await upsertJourneyReminder({
      ticketId: ticket.ticketId,
      departureDate: ticket.departureDate,
      status: result.sent ? "sent" : "failed",
      error: result.sent ? "" : result.errors.join("; "),
      createdAt: new Date().toISOString(),
      sentAt: result.sent ? new Date().toISOString() : ""
    });
    if (result.sent) sent += 1;
    else failed += 1;
  }
  return { checked: tickets.length, sent, failed, departureDate: tomorrow };
}

async function deliverConfiguredNotifications({ settings, purpose, relatedId, recipientEmail, recipientPhone, subject, message }) {
  const attempts = [];
  if (settings.emailNotificationsEnabled && recipientEmail) {
    attempts.push(sendEmail({ purpose, relatedId, recipient: recipientEmail, subject, message }));
  }
  if (settings.smsNotificationsEnabled && recipientPhone) {
    attempts.push(sendTwilio({ purpose, relatedId, channel: "sms", recipient: recipientPhone, message }));
  }
  if (settings.whatsappNotificationsEnabled && recipientPhone) {
    attempts.push(sendTwilio({ purpose, relatedId, channel: "whatsapp", recipient: recipientPhone, message }));
  }
  if (!attempts.length) {
    const error = "No configured notification channel has a recipient";
    await recordNotificationLog({ purpose, relatedId, channel: "system", status: "failed", error });
    return { sent: false, errors: [error] };
  }
  const results = await Promise.all(attempts);
  return {
    sent: results.some(result => result.status === "sent"),
    errors: results.filter(result => result.status !== "sent").map(result => result.error)
  };
}

async function sendEmail({ purpose, relatedId, recipient, subject, message }) {
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!from) return logFailure({ purpose, relatedId, channel: "email", recipient, error: "NOTIFICATION_FROM_EMAIL is not configured" });
  try {
    await ses.send(new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [recipient] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Text: { Data: message, Charset: "UTF-8" } }
      }
    }));
    return recordNotificationLog({ purpose, relatedId, channel: "email", recipient, status: "sent" });
  } catch (error) {
    return logFailure({ purpose, relatedId, channel: "email", recipient, error: error.message });
  }
}

async function sendTwilio({ purpose, relatedId, channel, recipient, message }) {
  const secret = await getSecretJson(process.env.NOTIFICATION_PROVIDER_SECRET_ID);
  const accountSid = secret?.twilioAccountSid;
  const authToken = secret?.twilioAuthToken;
  const from = channel === "whatsapp" ? secret?.twilioWhatsappFrom : secret?.twilioSmsFrom;
  if (!accountSid || !authToken || !from) {
    return logFailure({ purpose, relatedId, channel, recipient, error: "Twilio notification secret is not configured" });
  }
  const body = new URLSearchParams({
    To: channel === "whatsapp" && !String(recipient).startsWith("whatsapp:") ? `whatsapp:${recipient}` : String(recipient),
    From: channel === "whatsapp" && !String(from).startsWith("whatsapp:") ? `whatsapp:${from}` : String(from),
    Body: message
  });
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });
    if (!response.ok) throw new Error(`Twilio returned HTTP ${response.status}`);
    return recordNotificationLog({ purpose, relatedId, channel, recipient, status: "sent" });
  } catch (error) {
    return logFailure({ purpose, relatedId, channel, recipient, error: error.message });
  }
}

function logFailure({ purpose, relatedId, channel, recipient, error }) {
  return recordNotificationLog({ purpose, relatedId, channel, recipient, status: "failed", error });
}

function fillJourneyTemplate(template, ticket) {
  return String(template || "")
    .replace(/\[Passenger Name\]/g, ticket.passengerName || "Passenger")
    .replace(/\[Flight No\.\]/g, ticket.flightNumber || "your flight")
    .replace(/\[Flight No\]/g, ticket.flightNumber || "your flight")
    .replace(/\[Origin\]/g, ticket.origin || "your origin")
    .replace(/\[Destination\]/g, ticket.destination || "your destination")
    .replace(/\[Date\/Time\]/g, [ticket.departureDate, ticket.departureTime].filter(Boolean).join(" "));
}

function addDays(date, count) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + count);
  return next;
}

function dateOnlyInTimeZone(date) {
  const parts = zonedParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function hoursUntilDeparture(ticket) {
  const departure = /^(\d{2}):(\d{2})/.exec(ticket.departureTime || "09:00");
  const [year, month, day] = String(ticket.departureDate).split("-").map(Number);
  if (!departure || !year || !month || !day) return Number.POSITIVE_INFINITY;
  const now = zonedParts(new Date());
  const nowWallClock = Date.UTC(Number(now.year), Number(now.month) - 1, Number(now.day), Number(now.hour), Number(now.minute));
  const departureWallClock = Date.UTC(year, month - 1, day, Number(departure[1]), Number(departure[2]));
  return (departureWallClock - nowWallClock) / 3_600_000;
}

function zonedParts(date) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.TRAVELIAN_TIME_ZONE || "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date).map(part => [part.type, part.value]));
  return values;
}
