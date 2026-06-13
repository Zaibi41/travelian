import { json, method, normalizePath, readJson, requestId } from "./http.mjs";
import { providerAction, searchFlights } from "./services/flights.mjs";
import { searchHotels, searchTransfers } from "./services/products.mjs";
import {
  createPackageImageUploadUrl,
  deleteBlogPost,
  getRandomPackageImage,
  getBlogPost,
  listBookings,
  getBookingRecord,
  getPackage,
  getNotificationSettings,
  listTickets,
  listBlogPosts,
  listBookingRequests,
  listCustomers,
  listNotificationLogs,
  listPricingRules,
  listFlightSearchLogs,
  listPackageImages,
  listPackages,
  softDeletePricingRule,
  softDeletePackage,
  softDeleteTicket,
  upsertBlogPost,
  upsertBookingRequest,
  upsertBookingRecord,
  upsertCustomer,
  upsertNotificationSettings,
  upsertPricingRule,
  upsertPackage,
  upsertTicket
} from "./services/content.mjs";
import { notifyAdminOfBookingRequest, runJourneyReminders } from "./services/notifications.mjs";
import { requireFields, validateHotelSearchRequest, validateSearchRequest, validateTransferSearchRequest } from "./validation.mjs";
import { requireApiAuth } from "./auth.mjs";

const routes = {
  "GET /health": health,
  "POST /flights/search": flightsSearch,
  "POST /hotels/search": hotelsSearch,
  "POST /transfers/search": transfersSearch,
  "POST /flights/price": flightsPrice,
  "GET /flights/fare-rules": fareRules,
  "GET /flights/seat-map": seatMap,
  "POST /bookings": createBooking,
  "GET /bookings/{bookingId}": retrieveBooking,
  "POST /bookings/{bookingId}/ticket": issueTicket,
  "POST /bookings/{bookingId}/cancel": cancelBooking,
  "POST /bookings/{bookingId}/exchange/search": exchangeSearch,
  "POST /bookings/{bookingId}/exchange/price": exchangePrice,
  "POST /bookings/{bookingId}/exchange/commit": exchangeCommit,
  "GET /bookings/{bookingId}/documents": documents,
  "GET /content/blog-posts": listBlog,
  "POST /content/blog-posts": saveBlog,
  "GET /content/blog-posts/{slug}": getBlog,
  "DELETE /content/blog-posts/{slug}": removeBlog,
  "GET /content/packages": listPackageContent,
  "POST /content/packages": savePackageContent,
  "GET /content/package-images": listPackageImageContent,
  "GET /content/package-images/random": randomPackageImageContent,
  "POST /content/package-images/upload-url": createPackageImageUploadContent,
  "GET /content/packages/{category}/{packageId}": getPackageContent,
  "DELETE /content/packages/{category}/{packageId}": removePackageContent,
  "GET /content/tickets": listTicketContent,
  "POST /content/tickets": saveTicketContent,
  "GET /content/bookings": listBookingContent,
  "POST /content/bookings": saveBookingContent,
  "PATCH /content/bookings/{bookingId}": updateBookingContent,
  "DELETE /content/tickets/{ticketId}": removeTicketContent,
  "GET /content/customers": listCustomerContent,
  "POST /content/customers": saveCustomerContent,
  "GET /content/booking-requests": listBookingRequestContent,
  "POST /content/booking-requests": createBookingRequestContent,
  "PATCH /content/booking-requests/{requestId}": updateBookingRequestContent,
  "GET /content/notification-settings": getNotificationSettingContent,
  "POST /content/notification-settings": saveNotificationSettingContent,
  "GET /content/notification-logs": listNotificationLogContent,
  "POST /tasks/journey-reminders": sendJourneyReminderTask,
  "GET /content/pricing-rules": listPricingRuleContent,
  "GET /content/flight-search-logs": listFlightSearchLogContent,
  "POST /content/pricing-rules": savePricingRuleContent,
  "DELETE /content/pricing-rules/{service}/{ruleId}": removePricingRuleContent
};

export async function handler(event) {
  if (event?.source === "aws.events" && event?.["detail-type"] === "Scheduled Event") {
    return runJourneyReminders();
  }
  const reqId = requestId(event);
  if (method(event) === "OPTIONS") return json(204, {});

  try {
    const path = normalizePath(event);
    const routeKey = `${method(event)} ${routePattern(path)}`;
    const route = routes[routeKey];
    if (!route) return json(404, { requestId: reqId, error: "Not found" });
    await requireApiAuth(event, routeKey);
    const result = await route(event, path);
    return json(200, { requestId: reqId, ...result });
  } catch (error) {
    console.error(JSON.stringify({ requestId: reqId, message: error.message, details: error.details }));
    return json(error.statusCode || 500, {
      requestId: reqId,
      error: error.message || "Internal server error",
      details: error.details
    });
  }
}

async function health() {
  return {
    status: "ok",
    service: "travelian-flight-api",
    providers: (process.env.ENABLED_PROVIDERS || "travelport,skypass,flyadeal,airsial,pia").split(",")
  };
}

async function flightsSearch(event) {
  const request = validateSearchRequest(await readJson(event));
  return searchFlights(request);
}

async function hotelsSearch(event) {
  const request = validateHotelSearchRequest(await readJson(event));
  return searchHotels(request);
}

async function transfersSearch(event) {
  const request = validateTransferSearchRequest(await readJson(event));
  return searchTransfers(request);
}

async function flightsPrice(event) {
  const body = await readJson(event);
  requireFields(body, ["provider", "offerId"]);
  return { result: await providerAction(body.provider, "priceOffer", body) };
}

async function fareRules(event) {
  const query = event.queryStringParameters || {};
  requireFields(query, ["provider", "offerId"]);
  return { result: await providerAction(query.provider, "fareRules", query) };
}

async function seatMap(event) {
  const query = event.queryStringParameters || {};
  requireFields(query, ["provider", "offerId"]);
  return { result: await providerAction(query.provider, "seatMap", query) };
}

async function createBooking(event) {
  const body = await readJson(event);
  requireFields(body, ["provider", "offerId", "travelers", "contact"]);
  return { result: await providerAction(body.provider, "createBooking", body) };
}

async function retrieveBooking(event, path) {
  const provider = providerFromQuery(event);
  return { result: await providerAction(provider, "retrieveBooking", { bookingId: bookingId(path) }) };
}

async function issueTicket(event, path) {
  const body = await readJson(event);
  const provider = body.provider || providerFromQuery(event);
  return { result: await providerAction(provider, "issueTicket", { ...body, bookingId: bookingId(path) }) };
}

async function cancelBooking(event, path) {
  const body = await readJson(event);
  const provider = body.provider || providerFromQuery(event);
  return { result: await providerAction(provider, "cancelBooking", { ...body, bookingId: bookingId(path) }) };
}

async function exchangeSearch(event, path) {
  const body = await readJson(event);
  const provider = body.provider || providerFromQuery(event);
  return { result: await providerAction(provider, "exchangeSearch", { ...body, bookingId: bookingId(path) }) };
}

async function exchangePrice(event, path) {
  const body = await readJson(event);
  const provider = body.provider || providerFromQuery(event);
  return { result: await providerAction(provider, "exchangePrice", { ...body, bookingId: bookingId(path) }) };
}

async function exchangeCommit(event, path) {
  const body = await readJson(event);
  const provider = body.provider || providerFromQuery(event);
  return { result: await providerAction(provider, "exchangeCommit", { ...body, bookingId: bookingId(path) }) };
}

async function documents(event, path) {
  const provider = providerFromQuery(event);
  return { result: await providerAction(provider, "documents", { bookingId: bookingId(path) }) };
}

async function listBlog(event) {
  const status = event.queryStringParameters?.status;
  return { items: await listBlogPosts({ status }) };
}

async function getBlog(event, path) {
  const item = await getBlogPost(decodeURIComponent(path.split("/")[3]));
  if (!item) {
    const error = new Error("Blog post not found");
    error.statusCode = 404;
    throw error;
  }
  return { item };
}

async function saveBlog(event) {
  const body = await readJson(event);
  requireFields(body, ["title"]);
  return { item: await upsertBlogPost(body) };
}

async function removeBlog(event, path) {
  return { result: await deleteBlogPost(decodeURIComponent(path.split("/")[3])) };
}

async function listPackageContent(event) {
  const category = event.queryStringParameters?.category;
  const includeDeleted = event.queryStringParameters?.includeDeleted === "true";
  requireFields({ category }, ["category"]);
  return { items: await listPackages({ category, includeDeleted }) };
}

async function getPackageContent(event, path) {
  const [, , , category, packageId] = path.split("/");
  const item = await getPackage(decodeURIComponent(category), decodeURIComponent(packageId));
  if (!item || item.deletedAt) {
    const error = new Error("Package not found");
    error.statusCode = 404;
    throw error;
  }
  return { item };
}

async function savePackageContent(event) {
  const body = await readJson(event);
  requireFields(body, ["category", "name"]);
  return { item: await upsertPackage(body.category, body) };
}

async function removePackageContent(event, path) {
  const [, , , category, packageId] = path.split("/");
  return { item: await softDeletePackage(decodeURIComponent(category), decodeURIComponent(packageId)) };
}

async function listPackageImageContent(event) {
  const category = event.queryStringParameters?.category;
  requireFields({ category }, ["category"]);
  return { items: await listPackageImages({ category }) };
}

async function randomPackageImageContent(event) {
  const category = event.queryStringParameters?.category;
  requireFields({ category }, ["category"]);
  return { item: await getRandomPackageImage({ category }) };
}

async function createPackageImageUploadContent(event) {
  const body = await readJson(event);
  requireFields(body, ["category", "fileName", "contentType"]);
  return { item: await createPackageImageUploadUrl(body) };
}

async function listTicketContent(event) {
  const includeDeleted = event.queryStringParameters?.includeDeleted === "true";
  return { items: await listTickets({ includeDeleted }) };
}

async function saveTicketContent(event) {
  const body = await readJson(event);
  requireFields(body, ["passengerName", "ticketNumber"]);
  return { item: await upsertTicket(body) };
}

async function listBookingContent(event) {
  const includeDeleted = event.queryStringParameters?.includeDeleted === "true";
  return { items: await listBookings({ includeDeleted }) };
}

async function saveBookingContent(event) {
  const body = await readJson(event);
  requireFields(body, ["id", "type", "status", "travelers", "contact", "pricing"]);
  return { item: await upsertBookingRecord(body) };
}

async function updateBookingContent(event, path) {
  const body = await readJson(event);
  const bookingId = decodeURIComponent(path.split("/")[3]);
  const existing = await getBookingRecord(bookingId);
  if (!existing) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }
  return { item: await upsertBookingRecord({ ...existing, ...body, id: bookingId }) };
}

async function removeTicketContent(event, path) {
  return { item: await softDeleteTicket(decodeURIComponent(path.split("/")[3])) };
}

async function listCustomerContent() {
  return { items: await listCustomers() };
}

async function saveCustomerContent(event) {
  const body = await readJson(event);
  requireFields(body, ["name", "passportNumber"]);
  return { item: await upsertCustomer(body) };
}

async function listBookingRequestContent(event) {
  return { items: await listBookingRequests(event.queryStringParameters || {}) };
}

async function createBookingRequestContent(event) {
  const body = await readJson(event);
  requireFields(body, ["type", "customerName", "phone"]);
  const item = await upsertBookingRequest(body);
  return { item: await notifyAdminOfBookingRequest(item) };
}

async function updateBookingRequestContent(event, path) {
  const body = await readJson(event);
  const requestId = decodeURIComponent(path.split("/")[3]);
  return { item: await upsertBookingRequest({ ...body, requestId }) };
}

async function getNotificationSettingContent() {
  return { item: await getNotificationSettings() };
}

async function saveNotificationSettingContent(event) {
  return { item: await upsertNotificationSettings(await readJson(event)) };
}

async function listNotificationLogContent() {
  return { items: await listNotificationLogs() };
}

async function sendJourneyReminderTask() {
  return { result: await runJourneyReminders() };
}

async function listPricingRuleContent(event) {
  const service = event.queryStringParameters?.service || "flights";
  const includeDeleted = event.queryStringParameters?.includeDeleted === "true";
  return { items: await listPricingRules({ service, includeDeleted }) };
}

async function listFlightSearchLogContent() {
  return { items: await listFlightSearchLogs() };
}

async function savePricingRuleContent(event) {
  const body = await readJson(event);
  requireFields(body, ["service", "scope"]);
  return { item: await upsertPricingRule(body) };
}

async function removePricingRuleContent(event, path) {
  const [, , , service, ruleId] = path.split("/");
  return { item: await softDeletePricingRule(decodeURIComponent(service), decodeURIComponent(ruleId)) };
}

function routePattern(path) {
  if (/^\/bookings\/[^/]+$/.test(path)) return "/bookings/{bookingId}";
  if (/^\/bookings\/[^/]+\/ticket$/.test(path)) return "/bookings/{bookingId}/ticket";
  if (/^\/bookings\/[^/]+\/cancel$/.test(path)) return "/bookings/{bookingId}/cancel";
  if (/^\/bookings\/[^/]+\/exchange\/search$/.test(path)) return "/bookings/{bookingId}/exchange/search";
  if (/^\/bookings\/[^/]+\/exchange\/price$/.test(path)) return "/bookings/{bookingId}/exchange/price";
  if (/^\/bookings\/[^/]+\/exchange\/commit$/.test(path)) return "/bookings/{bookingId}/exchange/commit";
  if (/^\/bookings\/[^/]+\/documents$/.test(path)) return "/bookings/{bookingId}/documents";
  if (/^\/content\/blog-posts\/[^/]+$/.test(path)) return "/content/blog-posts/{slug}";
  if (/^\/content\/packages\/[^/]+\/[^/]+$/.test(path)) return "/content/packages/{category}/{packageId}";
  if (/^\/content\/tickets\/[^/]+$/.test(path)) return "/content/tickets/{ticketId}";
  if (/^\/content\/bookings\/[^/]+$/.test(path)) return "/content/bookings/{bookingId}";
  if (/^\/content\/booking-requests\/[^/]+$/.test(path)) return "/content/booking-requests/{requestId}";
  if (/^\/content\/pricing-rules\/[^/]+\/[^/]+$/.test(path)) return "/content/pricing-rules/{service}/{ruleId}";
  return path;
}

function bookingId(path) {
  return decodeURIComponent(path.split("/")[2]);
}

function providerFromQuery(event) {
  const provider = event.queryStringParameters?.provider;
  if (!provider) {
    const error = new Error("provider query parameter is required");
    error.statusCode = 400;
    throw error;
  }
  return provider;
}
