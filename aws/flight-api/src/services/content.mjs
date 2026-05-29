import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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
  const item = {
    ...(existing || {}),
    ...input,
    customerId,
    name: input.name || existing?.name || "",
    email: input.email || existing?.email || "",
    phone: input.phone || existing?.phone || "",
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now
  };
  await db.send(new PutCommand({
    TableName: tableName,
    Item: { pk: "CUSTOMER", sk: `CUSTOMER#${customerId}`, ...item }
  }));
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

function ensureTable() {
  if (!tableName) {
    const error = new Error("CONTENT_TABLE is not configured");
    error.statusCode = 500;
    throw error;
  }
}
