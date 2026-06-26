import { DeleteCommand, GetCommand, PutCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { db } from "../db.mjs";

const tableName = process.env.CONTENT_TABLE;
const mediaBucket = process.env.MEDIA_BUCKET || "travelian.pk";
const mediaBucketRegion = process.env.MEDIA_BUCKET_REGION || "eu-north-1";
const mediaPublicBaseUrl = (process.env.MEDIA_PUBLIC_BASE_URL || "https://www.travelian.pk").replace(/\/$/, "");
const packageImagePrefix = (process.env.PACKAGE_IMAGE_PREFIX || "package-images").replace(/^\/+|\/+$/g, "");
const s3 = new S3Client({ region: mediaBucketRegion });

export async function listBlogPosts({ status } = {}) {
  ensureTable();
  const result = await db.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": "BLOG" }
  }));
  const posts = (result.Items || []).map(fromItem).sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
  return status ? posts.filter(post => post.status === status) : posts;
}

export async function getBlogPost(slug) {
  ensureTable();
  const result = await db.send(new GetCommand({
    TableName: tableName,
    Key: { pk: "BLOG", sk: `SLUG#${slug}` }
  }));
  return result.Item ? fromItem(result.Item) : null;
}

export async function upsertBlogPost(input) {
  ensureTable();
  const now = new Date().toISOString();
  const slug = input.slug || slugify(input.title);
  const post = {
    postId: input.postId || `bp-${Date.now()}`,
    title: input.title,
    slug,
    excerpt: input.excerpt || "",
    content: input.content || "",
    author: input.author || "Travelian",
    category: input.category || "Travel",
    status: input.status || "draft",
    publishedAt: input.status === "published" ? (input.publishedAt || now.slice(0, 10)) : (input.publishedAt || ""),
    tags: Array.isArray(input.tags) ? input.tags : [],
    image: input.image || "",
    updatedAt: now
  };
  await db.send(new PutCommand({
    TableName: tableName,
    Item: { pk: "BLOG", sk: `SLUG#${slug}`, ...post }
  }));
  return post;
}

export async function deleteBlogPost(slug) {
  ensureTable();
  await db.send(new DeleteCommand({
    TableName: tableName,
    Key: { pk: "BLOG", sk: `SLUG#${slug}` }
  }));
  return { deleted: true, slug };
}

export async function listPackages({ category, includeDeleted = false } = {}) {
  ensureTable();
  const result = await db.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": packagePk(category) }
  }));
  const packages = (result.Items || [])
    .map(fromItem)
    .filter(item => includeDeleted || !item.deletedAt)
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  return packages;
}

export async function getPackage(category, packageId) {
  ensureTable();
  const result = await db.send(new GetCommand({
    TableName: tableName,
    Key: { pk: packagePk(category), sk: `PACKAGE#${packageId}` }
  }));
  return result.Item ? fromItem(result.Item) : null;
}

export async function upsertPackage(category, input) {
  ensureTable();
  const now = new Date().toISOString();
  const packageId = input.packageId || `pkg-${Date.now()}`;
  const existing = await getPackage(category, packageId);
  const item = {
    ...(existing || {}),
    ...input,
    packageId,
    category,
    name: input.name || existing?.name || "",
    description: input.description || existing?.description || "",
    basePrice: Number(input.basePrice ?? existing?.basePrice ?? 0),
    duration: input.duration || existing?.duration || "",
    hotel: input.hotel || existing?.hotel || "",
    city: input.city || existing?.city || "",
    status: input.status || existing?.status || "inactive",
    includes: Array.isArray(input.includes) ? input.includes : existing?.includes || [],
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now
  };
  await db.send(new PutCommand({
    TableName: tableName,
    Item: { pk: packagePk(category), sk: `PACKAGE#${packageId}`, ...item }
  }));
  return item;
}

export async function softDeletePackage(category, packageId) {
  const existing = await getPackage(category, packageId);
  if (!existing) {
    const error = new Error("Package not found");
    error.statusCode = 404;
    throw error;
  }
  return upsertPackage(category, {
    ...existing,
    status: "inactive",
    deletedAt: new Date().toISOString()
  });
}

export async function createPackageImageUploadUrl({ category, fileName, contentType }) {
  const normalizedCategory = packageCategory(category);
  const safeName = sanitizeFileName(fileName);
  const safeContentType = String(contentType || "application/octet-stream");
  if (!safeContentType.startsWith("image/")) {
    const error = new Error("Only image uploads are allowed");
    error.statusCode = 400;
    throw error;
  }
  const extension = extensionFromFileName(safeName, safeContentType);
  const key = `${packageImagePrefix}/${normalizedCategory}/${Date.now()}-${randomSuffix()}${extension}`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: mediaBucket,
      Key: key,
      ContentType: safeContentType,
    }),
    { expiresIn: 600 }
  );
  return {
    key,
    uploadUrl,
    publicUrl: `${mediaPublicBaseUrl}/${key}`,
    expiresIn: 600,
  };
}

export async function listPackageImages({ category }) {
  const normalizedCategory = packageCategory(category);
  const prefix = `${packageImagePrefix}/${normalizedCategory}/`;
  const result = await s3.send(new ListObjectsV2Command({
    Bucket: mediaBucket,
    Prefix: prefix,
    MaxKeys: 1000,
  }));
  return (result.Contents || [])
    .filter(item => item.Key && !item.Key.endsWith("/"))
    .map(item => ({
      key: item.Key,
      url: `${mediaPublicBaseUrl}/${item.Key}`,
      updatedAt: item.LastModified?.toISOString?.() || "",
      size: item.Size || 0,
    }))
    .filter(item => /\.(avif|gif|jpe?g|png|webp)$/i.test(item.key));
}

export async function getRandomPackageImage({ category }) {
  const images = await listPackageImages({ category });
  if (!images.length) return null;
  return images[Math.floor(Math.random() * images.length)];
}

export async function recordFlightSearch({ request, providerStatus, resultsCount, durationMs }) {
  ensureTable();
  const createdAt = new Date().toISOString();
  const searchLogId = randomUUID();
  const hasProviderError = Object.values(providerStatus || {}).some(status => status !== "success");
  const item = {
    searchLogId,
    route: `${request.origin}-${request.destination}`,
    tripType: request.tripType,
    departureDate: request.departureDate,
    returnDate: request.returnDate || "",
    cabin: request.cabin,
    passengers: request.passengers,
    providers: providerStatus,
    resultsCount,
    durationMs,
    status: resultsCount > 0 ? "found" : hasProviderError ? "error" : "not_found",
    createdAt,
  };
  await db.send(new PutCommand({
    TableName: tableName,
    Item: { pk: "FLIGHT_SEARCH_LOG", sk: `SEARCH#${createdAt}#${searchLogId}`, ...item },
  }));
  return item;
}

export async function listFlightSearchLogs() {
  ensureTable();
  const result = await db.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": "FLIGHT_SEARCH_LOG" },
    ScanIndexForward: false,
    Limit: 100,
  }));
  return (result.Items || []).map(fromItem);
}

export async function listPricingRules({ service = "flights", includeDeleted = false } = {}) {
  ensureTable();
  const result = await db.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": pricingRulePk(service) }
  }));
  return (result.Items || [])
    .map(fromItem)
    .filter(item => includeDeleted || !item.deletedAt)
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

export async function upsertPricingRule(input) {
  ensureTable();
  const now = new Date().toISOString();
  const service = pricingRuleService(input.service);
  let ruleId = input.ruleId;
  let existing = ruleId ? await getPricingRule(service, ruleId) : null;
  const scope = pricingRuleScope(input.scope || existing?.scope);
  const target = String(input.target ?? existing?.target ?? "").trim();
  if (scope === "supplier" && target) {
    const supplierRule = (await listPricingRules({ service })).find(rule =>
      rule.scope === "supplier" && normalizePricingTarget(rule.target) === normalizePricingTarget(target)
    );
    if (supplierRule && supplierRule.ruleId !== ruleId) {
      ruleId = supplierRule.ruleId;
      existing = supplierRule;
    }
  }
  ruleId ||= randomUUID();
  const item = {
    ...(existing || {}),
    ...input,
    ruleId,
    service,
    scope,
    name: String(input.name || existing?.name || pricingRuleName(scope, input.target)),
    target,
    percentage: finiteNumber(input.percentage ?? existing?.percentage),
    fixedAmount: finiteNumber(input.fixedAmount ?? existing?.fixedAmount),
    minimumMargin: Math.max(0, finiteNumber(input.minimumMargin ?? existing?.minimumMargin)),
    enabled: input.enabled === undefined ? existing?.enabled !== false : Boolean(input.enabled),
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now
  };
  if (!["global", "b2c"].includes(scope) && !item.target) {
    const error = new Error("Target is required for this pricing rule scope");
    error.statusCode = 400;
    throw error;
  }
  await db.send(new PutCommand({
    TableName: tableName,
    Item: { pk: pricingRulePk(service), sk: `RULE#${ruleId}`, ...item }
  }));
  return item;
}

export async function softDeletePricingRule(service, ruleId) {
  const existing = await getPricingRule(service, ruleId);
  if (!existing) {
    const error = new Error("Pricing rule not found");
    error.statusCode = 404;
    throw error;
  }
  return upsertPricingRule({
    ...existing,
    enabled: false,
    deletedAt: new Date().toISOString()
  });
}

export async function listTickets({ includeDeleted = false } = {}) {
  ensureTable();
  const result = await db.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": "TICKET" }
  }));
  return (result.Items || [])
    .map(fromItem)
    .filter(item => includeDeleted || !item.deletedAt)
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

export async function listBookings({ includeDeleted = false } = {}) {
  ensureTable();
  const result = await db.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": "BOOKING" }
  }));
  return (result.Items || [])
    .map(fromItem)
    .filter(item => includeDeleted || !item.deletedAt)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export async function getBookingRecord(bookingId) {
  ensureTable();
  const result = await db.send(new GetCommand({
    TableName: tableName,
    Key: { pk: "BOOKING", sk: `BOOKING#${bookingId}` }
  }));
  return result.Item ? fromItem(result.Item) : null;
}

export async function upsertBookingRecord(input) {
  ensureTable();
  const now = new Date().toISOString();
  const id = input.id || input.bookingId || `TRV-${Date.now()}`;
  const existing = await getBookingRecord(id);
  const item = {
    ...(existing || {}),
    ...input,
    id,
    bookingId: input.bookingId || existing?.bookingId || id,
    pnr: input.pnr || existing?.pnr || "",
    type: input.type || existing?.type || "flight",
    status: input.status || existing?.status || "held",
    travelers: Array.isArray(input.travelers) ? input.travelers : existing?.travelers || [],
    contact: input.contact || existing?.contact || {},
    addons: Array.isArray(input.addons) ? input.addons : existing?.addons || [],
    paymentMethod: input.paymentMethod || existing?.paymentMethod || "hold",
    paymentStatus: input.paymentStatus || existing?.paymentStatus || "unpaid",
    ticketStatus: input.ticketStatus || existing?.ticketStatus || "not_issued",
    pricing: input.pricing || existing?.pricing || { base: 0, addons: 0, taxes: 0, total: 0, currency: "PKR" },
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now
  };
  await db.send(new PutCommand({
    TableName: tableName,
    Item: { pk: "BOOKING", sk: `BOOKING#${id}`, ...item }
  }));
  return item;
}

export async function getTicket(ticketId) {
  ensureTable();
  const result = await db.send(new GetCommand({
    TableName: tableName,
    Key: { pk: "TICKET", sk: `TICKET#${ticketId}` }
  }));
  return result.Item ? fromItem(result.Item) : null;
}

export async function upsertTicket(input) {
  ensureTable();
  const now = new Date().toISOString();
  const ticketId = input.ticketId || `tk-${Date.now()}`;
  const existing = await getTicket(ticketId);
  const item = {
    ...(existing || {}),
    ...input,
    ticketId,
    bookingId: input.bookingId || existing?.bookingId || `INV-${Date.now()}`,
    passengerName: input.passengerName || existing?.passengerName || "",
    type: input.type || existing?.type || "flight",
    origin: input.origin || existing?.origin || "",
    destination: input.destination || existing?.destination || "",
    departureDate: input.departureDate || existing?.departureDate || "",
    seatNumber: input.seatNumber || existing?.seatNumber || "",
    status: input.status || existing?.status || "pending",
    price: Number(input.price ?? existing?.price ?? 0),
    ticketNumber: input.ticketNumber || existing?.ticketNumber || "",
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now
  };
  await db.send(new PutCommand({
    TableName: tableName,
    Item: { pk: "TICKET", sk: `TICKET#${ticketId}`, ...item }
  }));
  return item;
}

export async function softDeleteTicket(ticketId) {
  const existing = await getTicket(ticketId);
  if (!existing) {
    const error = new Error("Ticket not found");
    error.statusCode = 404;
    throw error;
  }
  return upsertTicket({
    ...existing,
    status: "cancelled",
    deletedAt: new Date().toISOString()
  });
}

export async function listBookingRequests({ status, type } = {}) {
  ensureTable();
  const result = await db.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": "BOOKING_REQUEST" },
    ScanIndexForward: false
  }));
  return (result.Items || [])
    .map(fromItem)
    .filter(item => !status || item.status === status)
    .filter(item => !type || item.type === type)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export async function getBookingRequest(requestId) {
  ensureTable();
  const result = await db.send(new GetCommand({
    TableName: tableName,
    Key: { pk: "BOOKING_REQUEST", sk: `REQUEST#${requestId}` }
  }));
  return result.Item ? fromItem(result.Item) : null;
}

export async function upsertBookingRequest(input) {
  ensureTable();
  const now = new Date().toISOString();
  const requestId = input.requestId || randomUUID();
  const existing = await getBookingRequest(requestId);
  const type = bookingRequestType(input.type || existing?.type);
  const status = bookingRequestStatus(input.status || existing?.status || "new");
  const customerName = String(input.customerName || existing?.customerName || "").trim();
  const phone = String(input.phone || existing?.phone || "").trim();
  if (!customerName || !phone) {
    const error = new Error("Customer name and phone number are required");
    error.statusCode = 400;
    throw error;
  }
  const item = {
    ...(existing || {}),
    ...input,
    requestId,
    type,
    status,
    customerName,
    phone,
    email: String(input.email ?? existing?.email ?? "").trim(),
    packageId: String(input.packageId ?? existing?.packageId ?? "").trim(),
    packageName: String(input.packageName ?? existing?.packageName ?? "").trim(),
    selectedOption: String(input.selectedOption ?? existing?.selectedOption ?? "").trim(),
    notes: String(input.notes ?? existing?.notes ?? "").trim(),
    assignedStaff: String(input.assignedStaff ?? existing?.assignedStaff ?? "").trim(),
    notificationStatus: input.notificationStatus || existing?.notificationStatus || "pending",
    notificationError: String(input.notificationError ?? existing?.notificationError ?? "").trim(),
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now
  };
  await db.send(new PutCommand({
    TableName: tableName,
    Item: { pk: "BOOKING_REQUEST", sk: `REQUEST#${requestId}`, ...item }
  }));
  return item;
}

export async function getNotificationSettings() {
  ensureTable();
  const result = await db.send(new GetCommand({
    TableName: tableName,
    Key: { pk: "SETTINGS", sk: "NOTIFICATIONS" }
  }));
  return {
    adminNotificationEmail: "",
    adminNotificationPhone: "",
    emailNotificationsEnabled: false,
    smsNotificationsEnabled: false,
    whatsappNotificationsEnabled: false,
    journeyReminderEnabled: false,
    journeyReminderHoursBefore: 24,
    journeyReminderTemplate: "Dear [Passenger Name],\nThank you for booking with Travelian. Your flight [Flight No.] from [Origin] to [Destination] is scheduled for [Date/Time]. We wish you a safe and pleasant journey.",
    ...(result.Item ? fromItem(result.Item) : {})
  };
}

export async function upsertNotificationSettings(input) {
  ensureTable();
  const existing = await getNotificationSettings();
  const item = {
    ...existing,
    ...input,
    adminNotificationEmail: String(input.adminNotificationEmail ?? existing.adminNotificationEmail ?? "").trim(),
    adminNotificationPhone: String(input.adminNotificationPhone ?? existing.adminNotificationPhone ?? "").trim(),
    emailNotificationsEnabled: Boolean(input.emailNotificationsEnabled),
    smsNotificationsEnabled: Boolean(input.smsNotificationsEnabled),
    whatsappNotificationsEnabled: Boolean(input.whatsappNotificationsEnabled),
    journeyReminderEnabled: Boolean(input.journeyReminderEnabled),
    journeyReminderHoursBefore: Math.max(1, finiteNumber(input.journeyReminderHoursBefore ?? existing.journeyReminderHoursBefore ?? 24)),
    journeyReminderTemplate: String(input.journeyReminderTemplate ?? existing.journeyReminderTemplate ?? "").trim(),
    updatedAt: new Date().toISOString()
  };
  await db.send(new PutCommand({
    TableName: tableName,
    Item: { pk: "SETTINGS", sk: "NOTIFICATIONS", ...item }
  }));
  return item;
}

export async function listNotificationLogs() {
  ensureTable();
  const result = await db.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": "NOTIFICATION_LOG" },
    ScanIndexForward: false,
    Limit: 100
  }));
  return (result.Items || []).map(fromItem);
}

export async function recordNotificationLog(input) {
  ensureTable();
  const createdAt = input.createdAt || new Date().toISOString();
  const logId = input.logId || randomUUID();
  const item = { ...input, logId, createdAt };
  await db.send(new PutCommand({
    TableName: tableName,
    Item: { pk: "NOTIFICATION_LOG", sk: `LOG#${createdAt}#${logId}`, ...item }
  }));
  return item;
}

const GROUP_TICKET_COLLECTION_PK = "GROUP_TICKET_COLLECTION";

const GROUP_TICKET_INTEGRATION_BY_SLUG = {
  "collection-1": "alhaider",
  "collection-2": "dhilluandsahi",
  "collection-3": "skypass",
  "collection-4": "travelntours",
};

const KNOWN_GROUP_TICKET_INTEGRATIONS = new Set(Object.values(GROUP_TICKET_INTEGRATION_BY_SLUG));

function resolveGroupTicketIntegrationProvider(slug, input = {}, existing) {
  const candidate = String(input.integrationProvider ?? existing?.integrationProvider ?? "").trim().toLowerCase();
  if (KNOWN_GROUP_TICKET_INTEGRATIONS.has(candidate)) return candidate;
  const fromSlug = GROUP_TICKET_INTEGRATION_BY_SLUG[normalizeGroupTicketCollectionSlug(slug)];
  if (fromSlug) return fromSlug;
  const legacyProvider = String(input.providerId ?? existing?.providerId ?? "").trim().toLowerCase();
  if (KNOWN_GROUP_TICKET_INTEGRATIONS.has(legacyProvider)) return legacyProvider;
  return fromSlug || legacyProvider;
}

const DEFAULT_GROUP_TICKET_COLLECTIONS = [
  { slug: "collection-1", publicLabel: "Group Collection 1", supplierName: "Al Haider", providerId: "alhaider", integrationProvider: "alhaider", secretId: "travelian/providers/alhaider", sortOrder: 1, enabled: true },
  { slug: "collection-2", publicLabel: "Group Collection 2", supplierName: "Dhillon & Sahi", providerId: "dhilluandsahi", integrationProvider: "dhilluandsahi", secretId: "travelian/providers/dhilluandsahi", sortOrder: 2, enabled: true },
  { slug: "collection-3", publicLabel: "Group Collection 3", supplierName: "skypass", providerId: "skypass", integrationProvider: "skypass", secretId: "travelian/providers/skypass", sortOrder: 3, enabled: true },
  { slug: "collection-4", publicLabel: "Group Collection 4", supplierName: "Travel n Tours", providerId: "travelntours", integrationProvider: "travelntours", secretId: "travelian/providers/travelntours", sortOrder: 4, enabled: true },
];

function groupTicketCollectionSk(slug) {
  return `SLUG#${slug}`;
}

function normalizeGroupTicketCollectionSlug(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getGroupTicketingCollection(slug) {
  ensureTable();
  const normalized = normalizeGroupTicketCollectionSlug(slug);
  if (!normalized) return null;
  const result = await db.send(new GetCommand({
    TableName: tableName,
    Key: { pk: GROUP_TICKET_COLLECTION_PK, sk: groupTicketCollectionSk(normalized) },
  }));
  return result.Item ? fromItem(result.Item) : null;
}

async function seedDefaultGroupTicketingCollections() {
  const now = new Date().toISOString();
  await Promise.all(DEFAULT_GROUP_TICKET_COLLECTIONS.map((entry) => db.send(new PutCommand({
    TableName: tableName,
    Item: {
      pk: GROUP_TICKET_COLLECTION_PK,
      sk: groupTicketCollectionSk(entry.slug),
      ...entry,
      createdAt: now,
      updatedAt: now,
    },
    ConditionExpression: "attribute_not_exists(pk)",
  })).catch(() => undefined)));
}

function normalizeGroupTicketCollectionDisplay(item) {
  const supplierName = String(item.supplierName || "").trim();
  const normalizedSupplier = /^sahi\s*skypass$/i.test(supplierName) ? "skypass" : supplierName;
  const publicLabel = String(item.publicLabel || "")
    .replace(/\s*\(\s*sahi\s*skypass\s*\)/gi, "")
    .trim();
  return {
    ...item,
    supplierName: normalizedSupplier,
    publicLabel: publicLabel || item.publicLabel,
  };
}

export async function listGroupTicketingCollections({ includeDeleted = false } = {}) {
  ensureTable();
  const result = await db.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": GROUP_TICKET_COLLECTION_PK },
  }));
  let items = (result.Items || [])
    .map(fromItem)
    .map(normalizeGroupTicketCollectionDisplay)
    .filter((item) => includeDeleted || !item.deletedAt);
  if (!items.length) {
    await seedDefaultGroupTicketingCollections();
    return listGroupTicketingCollections({ includeDeleted });
  }
  return items.sort((a, b) => (Number(a.sortOrder) || 999) - (Number(b.sortOrder) || 999) || String(a.slug).localeCompare(String(b.slug)));
}

export async function listGroupTicketingCollectionsPublic() {
  const items = await listGroupTicketingCollections();
  return items
    .filter((item) => item.enabled !== false)
    .map(({ slug, publicLabel, supplierName, sortOrder }) => ({
      slug,
      publicLabel,
      supplierName,
      sortOrder: Number(sortOrder) || 0,
    }));
}

export async function upsertGroupTicketingCollection(input) {
  ensureTable();
  const now = new Date().toISOString();
  const slug = normalizeGroupTicketCollectionSlug(input.slug);
  const originalSlug = normalizeGroupTicketCollectionSlug(input.originalSlug || input.slug);
  if (!slug) {
    const error = new Error("Category slug is required");
    error.statusCode = 400;
    throw error;
  }

  const existing = (await getGroupTicketingCollection(originalSlug)) || (await getGroupTicketingCollection(slug));

  for (const field of ["publicLabel", "supplierName", "secretId"]) {
    if (!String(input[field] ?? existing?.[field] ?? "").trim()) {
      const error = new Error(`${field} is required`);
      error.statusCode = 400;
      throw error;
    }
  }
  if (originalSlug && originalSlug !== slug) {
    await db.send(new DeleteCommand({
      TableName: tableName,
      Key: { pk: GROUP_TICKET_COLLECTION_PK, sk: groupTicketCollectionSk(originalSlug) },
    }));
  }

  const item = {
    slug,
    publicLabel: String(input.publicLabel).trim(),
    supplierName: normalizeGroupTicketCollectionDisplay({
      supplierName: String(input.supplierName).trim(),
      publicLabel: String(input.publicLabel).trim(),
    }).supplierName,
    providerId: String(input.providerId ?? existing?.providerId ?? "").trim().toLowerCase(),
    integrationProvider: resolveGroupTicketIntegrationProvider(slug, input, existing),
    secretId: String(input.secretId).trim(),
    sortOrder: Number(input.sortOrder ?? existing?.sortOrder ?? 0),
    enabled: input.enabled === undefined ? existing?.enabled !== false : Boolean(input.enabled),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deletedAt: undefined,
  };

  await db.send(new PutCommand({
    TableName: tableName,
    Item: { pk: GROUP_TICKET_COLLECTION_PK, sk: groupTicketCollectionSk(slug), ...item },
  }));
  return item;
}

export async function softDeleteGroupTicketingCollection(slug) {
  const existing = await getGroupTicketingCollection(slug);
  if (!existing) {
    const error = new Error("Group ticketing collection was not found");
    error.statusCode = 404;
    throw error;
  }
  const now = new Date().toISOString();
  const item = {
    ...existing,
    enabled: false,
    deletedAt: now,
    updatedAt: now,
  };
  await db.send(new PutCommand({
    TableName: tableName,
    Item: { pk: GROUP_TICKET_COLLECTION_PK, sk: groupTicketCollectionSk(existing.slug), ...item },
  }));
  return item;
}

export async function getJourneyReminder(ticketId, departureDate) {
  ensureTable();
  const result = await db.send(new GetCommand({
    TableName: tableName,
    Key: { pk: "JOURNEY_REMINDER", sk: `TICKET#${ticketId}#${departureDate}` }
  }));
  return result.Item ? fromItem(result.Item) : null;
}

export async function reserveJourneyReminder(input) {
  ensureTable();
  const item = { ...input, status: "pending", createdAt: input.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  try {
    await db.send(new PutCommand({
      TableName: tableName,
      Item: { pk: "JOURNEY_REMINDER", sk: `TICKET#${input.ticketId}#${input.departureDate}`, ...item },
      ConditionExpression: "attribute_not_exists(pk)"
    }));
    return true;
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") return false;
    throw error;
  }
}

export async function upsertJourneyReminder(input) {
  ensureTable();
  const item = { ...input, updatedAt: new Date().toISOString() };
  await db.send(new PutCommand({
    TableName: tableName,
    Item: { pk: "JOURNEY_REMINDER", sk: `TICKET#${input.ticketId}#${input.departureDate}`, ...item }
  }));
  return item;
}

export async function listCustomers() {
  ensureTable();
  const result = await db.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: { ":pk": "CUSTOMER" }
  }));
  return (result.Items || [])
    .map(fromItem)
    .filter(item => !item.deletedAt)
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

export async function getCustomer(customerId) {
  ensureTable();
  const result = await db.send(new GetCommand({
    TableName: tableName,
    Key: { pk: "CUSTOMER", sk: `CUSTOMER#${customerId}` }
  }));
  return result.Item ? fromItem(result.Item) : null;
}

export async function upsertCustomer(input) {
  ensureTable();
  const now = new Date().toISOString();
  const customerId = input.customerId || randomUUID();
  const existing = await getCustomer(customerId);
  const passportNumber = normalizePassportNumber(input.passportNumber || existing?.passportNumber);
  if (!passportNumber) {
    const error = new Error("Passport number is required");
    error.statusCode = 400;
    throw error;
  }
  const item = {
    ...(existing || {}),
    ...input,
    customerId,
    name: input.name || existing?.name || "",
    email: input.email || existing?.email || "",
    phone: input.phone || existing?.phone || "",
    passportNumber,
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now
  };
  const previousPassportNumber = normalizePassportNumber(existing?.passportNumber);
  const passportKey = { pk: "CUSTOMER_PASSPORT", sk: `PASSPORT#${passportNumber}` };
  const transactItems = [];
  if (previousPassportNumber && previousPassportNumber !== passportNumber) {
    transactItems.push({
      Delete: {
        TableName: tableName,
        Key: { pk: "CUSTOMER_PASSPORT", sk: `PASSPORT#${previousPassportNumber}` },
        ConditionExpression: "customerId = :customerId",
        ExpressionAttributeValues: { ":customerId": customerId }
      }
    });
  }
  transactItems.push({
    Put: {
      TableName: tableName,
      Item: { ...passportKey, customerId, updatedAt: now },
      ConditionExpression: "attribute_not_exists(pk) OR customerId = :customerId",
      ExpressionAttributeValues: { ":customerId": customerId }
    }
  });
  transactItems.push({
    Put: {
      TableName: tableName,
      Item: { pk: "CUSTOMER", sk: `CUSTOMER#${customerId}`, ...item }
    }
  });
  try {
    await db.send(new TransactWriteCommand({ TransactItems: transactItems }));
  } catch (error) {
    if (error.name === "TransactionCanceledException") {
      const conflict = new Error("A customer with this passport number already exists");
      conflict.statusCode = 409;
      throw conflict;
    }
    throw error;
  }
  return item;
}

function fromItem(item) {
  const { pk, sk, ...post } = item;
  return post;
}

function slugify(value = "") {
  return value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
}

function packagePk(category) {
  const normalized = packageCategory(category);
  return `PACKAGE#${normalized.toUpperCase()}`;
}

function pricingRulePk(service) {
  return `PRICING_RULE#${pricingRuleService(service).toUpperCase()}`;
}

async function getPricingRule(service, ruleId) {
  const result = await db.send(new GetCommand({
    TableName: tableName,
    Key: { pk: pricingRulePk(service), sk: `RULE#${ruleId}` }
  }));
  return result.Item ? fromItem(result.Item) : null;
}

function pricingRuleService(service) {
  const normalized = String(service || "").toLowerCase().trim();
  if (!["flights", "hotels", "umrah", "tours", "visas", "all"].includes(normalized)) {
    const error = new Error("Invalid pricing rule service");
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function pricingRuleScope(scope) {
  const normalized = String(scope || "").toLowerCase().trim();
  if (!["global", "service", "supplier", "airline", "route", "cabin", "agency", "b2c", "seasonal", "city", "country"].includes(normalized)) {
    const error = new Error("Invalid pricing rule scope");
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function pricingRuleName(scope, target) {
  const normalizedTarget = String(target || "").trim();
  return normalizedTarget ? `${scope}: ${normalizedTarget}` : `${scope} pricing rule`;
}

function normalizePricingTarget(value = "") {
  return String(value).trim().toLowerCase();
}

function finiteNumber(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) {
    const error = new Error("Pricing rule values must be valid numbers");
    error.statusCode = 400;
    throw error;
  }
  return number;
}

function packageCategory(category) {
  const normalized = String(category || "").toLowerCase().trim();
  if (!["umrah", "tour", "visa"].includes(normalized)) {
    const error = new Error("Invalid package category");
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function sanitizeFileName(fileName = "") {
  const sanitized = String(fileName).split(/[\\/]/).pop()?.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/-+/g, "-") || "";
  if (!sanitized) {
    const error = new Error("fileName is required");
    error.statusCode = 400;
    throw error;
  }
  return sanitized;
}

function extensionFromFileName(fileName, contentType) {
  const fromName = fileName.match(/\.(avif|gif|jpe?g|png|webp)$/i)?.[0]?.toLowerCase();
  if (fromName) return fromName === ".jpeg" ? ".jpg" : fromName;
  const map = {
    "image/avif": ".avif",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  return map[contentType] || ".jpg";
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizePassportNumber(value = "") {
  return String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function bookingRequestType(value) {
  const normalized = String(value || "").toLowerCase().trim().replace(/\s+/g, "_");
  if (!["umrah", "tour", "visa", "study_visa", "visit_visa", "hotel", "service", "package", "group", "manual_flight", "whatsapp_inquiry"].includes(normalized)) {
    const error = new Error("Invalid booking request type");
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function bookingRequestStatus(value) {
  const normalized = String(value || "").toLowerCase().trim().replace(/[\s/]+/g, "_");
  if (!["new", "contacted", "in_progress", "waiting_for_documents", "payment_pending", "confirmed", "cancelled_lost"].includes(normalized)) {
    const error = new Error("Invalid booking request status");
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function ensureTable() {
  if (!tableName) {
    const error = new Error("CONTENT_TABLE is not configured");
    error.statusCode = 500;
    throw error;
  }
}
