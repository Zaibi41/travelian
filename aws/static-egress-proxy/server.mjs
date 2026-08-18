import http from "node:http";

const port = Number(process.env.PORT || 8787);
const token = process.env.EGRESS_PROXY_TOKEN || "";
const allowedHosts = new Set(
  String(process.env.ALLOWED_EGRESS_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
);

const hopByHopHeaders = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      return send(response, 200, { status: "ok", service: "travelian-static-egress-proxy" });
    }

    if (request.method !== "POST" || request.url !== "/proxy") {
      return send(response, 404, { error: "Not found" });
    }

    if (!token || request.headers["x-travelian-egress-token"] !== token) {
      return send(response, 401, { error: "Unauthorized" });
    }

    const payload = JSON.parse(await readBody(request));
    const targetUrl = new URL(String(payload.url || ""));
    if (!["https:", "http:"].includes(targetUrl.protocol)) {
      return send(response, 400, { error: "Unsupported target protocol" });
    }

    if (!allowedHosts.has(targetUrl.hostname.toLowerCase())) {
      return send(response, 403, { error: "Target host is not allowed" });
    }

    const headers = {};
    for (const [key, value] of Object.entries(payload.headers || {})) {
      const normalizedKey = key.toLowerCase();
      if (!hopByHopHeaders.has(normalizedKey)) headers[key] = value;
    }

    const upstream = await fetch(targetUrl, {
      method: payload.method || "GET",
      headers,
      body: payload.body ?? undefined,
    });

    const upstreamBody = await upstream.text();
    response.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(upstreamBody);
  } catch (error) {
    send(response, 502, { error: "Provider egress request failed" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Travelian static egress proxy listening on 127.0.0.1:${port}`);
});

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body || "{}"));
    request.on("error", reject);
  });
}

function send(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}
