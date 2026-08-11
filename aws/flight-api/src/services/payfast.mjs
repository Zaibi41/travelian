import { randomUUID } from "node:crypto";
import { getSecretJson } from "../secrets.mjs";
import { getBookingRecord, listBookings, upsertBookingRecord } from "./content.mjs";

const DEFAULT_BASE_URL = "https://ipg1.apps.net.pk/Ecommerce/api/Transaction";
const DEFAULT_TOKEN_PATH = "/GetAccessToken";
const DEFAULT_POST_PATH = "/PostTransaction";

export async function createPayFastSession(input = {}) {
  const {
    bookingId,
    amount,
    currency = "PKR",
    customerName = "",
    customerEmail = "",
    customerPhone = "",
    description = "Travelian online payment",
    method = "card",
    successUrl,
    failureUrl,
  } = input;

  if (!bookingId) throw badRequest("bookingId is required");
  const config = await getPayFastConfig();
  const booking = await getBookingRecord(bookingId);
  if (!booking) throw notFound("Booking not found");

  const bookingAmount = Number(booking?.pricing?.total);
  const numericAmount = Number(amount);
  const payableAmount = Number.isFinite(bookingAmount) && bookingAmount > 0 ? bookingAmount : numericAmount;
  const bookingCurrency = String(booking?.pricing?.currency || currency || "PKR").toUpperCase();
  if (!Number.isFinite(payableAmount) || payableAmount <= 0) throw badRequest("amount must be greater than zero");
  if (bookingCurrency !== "PKR") throw badRequest("PayFast payments must be submitted in PKR");

  const paymentId = `pf-${randomUUID()}`;
  const basketId = shortBasketId(bookingId, paymentId);
  const amountText = payableAmount.toFixed(2);
  const token = await requestAccessToken(config, {
    basketId,
    amount: amountText,
  });

  const now = new Date();
  const resolvedSuccessUrl = successUrl || config.successUrl;
  const resolvedFailureUrl = failureUrl || config.failureUrl;
  if (!resolvedSuccessUrl || !resolvedFailureUrl) {
    throw gatewayConfigError("PayFast successUrl and failureUrl are required");
  }

  const fields = {
    MERCHANT_ID: config.merchantId,
    MERCHANT_NAME: config.merchantName || "Travelian",
    TOKEN: token,
    PROCCODE: config.processCode || processCodeForMethod(method),
    TXNAMT: amountText,
    CUSTOMER_MOBILE_NO: cleanPhone(customerPhone),
    CUSTOMER_EMAIL_ADDRESS: customerEmail || config.fallbackCustomerEmail || "travelian.pk@gmail.com",
    SIGNATURE: config.signature || "",
    VERSION: config.version || "MERCHANT-CART-0.1",
    TXNDESC: description,
    SUCCESS_URL: resolvedSuccessUrl,
    FAILURE_URL: resolvedFailureUrl,
    BASKET_ID: basketId,
    ORDER_DATE: formatPayFastDate(now),
    CHECKOUT_URL: config.checkoutUrl || resolvedSuccessUrl,
    CURRENCY_CODE: "PKR",
    TRAN_TYPE: "ECOMM_PURCHASE",
  };

  const payment = {
    provider: "payfast",
    paymentId,
    basketId,
    amount: payableAmount,
    currency: "PKR",
    method,
    status: "initiated",
    createdAt: now.toISOString(),
    customerName,
    gatewayUrl: config.postUrl,
  };

  await upsertBookingRecord({
    ...booking,
    id: bookingId,
    paymentMethod: method === "1link" ? "1link" : "card",
    paymentStatus: "pending",
    onlinePayment: payment,
    paymentAttempts: [...(Array.isArray(booking.paymentAttempts) ? booking.paymentAttempts : []), payment],
  });

  return {
    provider: "payfast",
    paymentId,
    bookingId,
    basketId,
    method: "POST",
    action: config.postUrl,
    fields,
  };
}

export async function updatePayFastPayment(input = {}) {
  const bookingId = input.bookingId || input.BOOKING_ID || input.ORDER_ID;
  const basketId = input.basketId || input.BASKET_ID;
  if (!bookingId && !basketId) throw badRequest("bookingId or basketId is required");

  const booking = bookingId ? await getBookingRecord(bookingId) : await findBookingByBasketId(basketId);
  if (!booking) {
    return { status: "ignored", reason: "No booking found for payment callback" };
  }

  const normalizedStatus = normalizePayFastStatus(input.status || input.STATUS || input.transactionStatus || input.TXN_STATUS);
  const onlinePayment = {
    ...(booking.onlinePayment || {}),
    status: normalizedStatus,
    providerReference: input.transactionId || input.TXN_ID || input.RDRAUTHID || input.AUTH_ID || "",
    gatewayResponse: sanitizeGatewayResponse(input),
    updatedAt: new Date().toISOString(),
  };

  const item = await upsertBookingRecord({
    ...booking,
    id: booking.id || booking.bookingId,
    paymentStatus: normalizedStatus === "paid" ? "paid" : normalizedStatus === "failed" ? "unpaid" : "pending",
    status: normalizedStatus === "paid" ? "payment_received" : booking.status,
    onlinePayment,
  });

  return { status: normalizedStatus, item };
}

async function findBookingByBasketId(basketId) {
  if (!basketId) return null;
  const items = await listBookings();
  return items.find((booking) => (
    booking?.onlinePayment?.basketId === basketId ||
    (Array.isArray(booking?.paymentAttempts) && booking.paymentAttempts.some((attempt) => attempt?.basketId === basketId))
  )) || null;
}

async function getPayFastConfig() {
  const secretId = process.env.PAYFAST_SECRET_ID || "travelian/payments/payfast";
  const secret = await getSecretJson(secretId);
  const config = {
    ...(secret || {}),
    merchantId: process.env.PAYFAST_MERCHANT_ID || secret?.merchantId || secret?.MERCHANT_ID,
    securedKey: process.env.PAYFAST_SECURED_KEY || secret?.securedKey || secret?.SECURED_KEY,
    merchantName: process.env.PAYFAST_MERCHANT_NAME || secret?.merchantName || secret?.MERCHANT_NAME,
    baseUrl: (process.env.PAYFAST_BASE_URL || secret?.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, ""),
    tokenPath: process.env.PAYFAST_TOKEN_PATH || secret?.tokenPath || DEFAULT_TOKEN_PATH,
    postPath: process.env.PAYFAST_POST_PATH || secret?.postPath || DEFAULT_POST_PATH,
    successUrl: process.env.PAYFAST_SUCCESS_URL || secret?.successUrl,
    failureUrl: process.env.PAYFAST_FAILURE_URL || secret?.failureUrl,
    checkoutUrl: process.env.PAYFAST_CHECKOUT_URL || secret?.checkoutUrl,
    processCode: process.env.PAYFAST_PROCESS_CODE || secret?.processCode,
    signature: process.env.PAYFAST_SIGNATURE || secret?.signature,
    fallbackCustomerEmail: process.env.PAYFAST_FALLBACK_CUSTOMER_EMAIL || secret?.fallbackCustomerEmail,
    version: process.env.PAYFAST_VERSION || secret?.version,
  };
  if (!config.merchantId || !config.securedKey) {
    throw gatewayConfigError("PayFast merchantId and securedKey are not configured");
  }
  config.tokenUrl = absoluteGatewayUrl(config.baseUrl, config.tokenPath);
  config.postUrl = absoluteGatewayUrl(config.baseUrl, config.postPath);
  return config;
}

async function requestAccessToken(config, { basketId, amount }) {
  const body = new URLSearchParams({
    MERCHANT_ID: config.merchantId,
    SECURED_KEY: config.securedKey,
    TXNAMT: amount,
    BASKET_ID: basketId,
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Travelian/1.0",
    },
    body,
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    const error = new Error("PayFast token request failed");
    error.statusCode = 502;
    error.details = [safeGatewayMessage(payload)];
    throw error;
  }
  const token = payload?.ACCESS_TOKEN || payload?.access_token || payload?.token || payload?.data?.ACCESS_TOKEN || payload?.data?.token;
  if (!token) {
    const error = new Error("PayFast token response did not include an access token");
    error.statusCode = 502;
    error.details = [safeGatewayMessage(payload)];
    throw error;
  }
  return token;
}

function absoluteGatewayUrl(baseUrl, path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function processCodeForMethod(method) {
  return String(method).toLowerCase() === "1link" ? "00" : "00";
}

function shortBasketId(bookingId, paymentId) {
  return `${String(bookingId).replace(/[^A-Za-z0-9-]/g, "").slice(0, 24)}-${paymentId.slice(3, 11)}`.slice(0, 48);
}

function cleanPhone(phone = "") {
  return String(phone || "").replace(/[^\d+]/g, "").slice(0, 20) || "03000000000";
}

function formatPayFastDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function normalizePayFastStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["paid", "success", "successful", "completed", "approved"].some(term => value.includes(term))) return "paid";
  if (["fail", "cancel", "declin", "reject", "error"].some(term => value.includes(term))) return "failed";
  return "pending";
}

function sanitizeGatewayResponse(input) {
  const output = { ...input };
  for (const key of Object.keys(output)) {
    if (/token|secured|secret|key|card|cvv|pan/i.test(key)) delete output[key];
  }
  return output;
}

function safeGatewayMessage(payload) {
  if (!payload) return "No response body";
  if (typeof payload === "string") return payload.slice(0, 500);
  return JSON.stringify(sanitizeGatewayResponse(payload)).slice(0, 500);
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function gatewayConfigError(message) {
  const error = new Error(message);
  error.statusCode = 503;
  return error;
}
