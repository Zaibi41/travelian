import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// #86: hosts and ports for e2e come from e2e/support/gateway.ts (isGateway, isLocal, gatewayView, APP_URL, GATEWAY_URL).
// A spec or support file with its own copy of the gateway port or the local host list fails here.
const ROOT = resolve(process.cwd(), "e2e");
const SHARED = "support/gateway.ts";
const HARDCODED = [/["'`]8000["'`]/, /["'`]8080["'`]/, /:8000\b/, /:8080\b/, /127\.0\.0\.1/, /\blocalhost\b/, /\[::1\]/];

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.(ts|tsx|js|mjs)$/.test(entry.name) ? [path] : [];
  });
}

describe("e2e hosts and ports", () => {
  it("only e2e/support/gateway.ts names the gateway port or local hosts", () => {
    const found: string[] = [];
    for (const path of files(ROOT)) {
      const name = relative(ROOT, path).split("\\").join("/");
      if (name === SHARED) continue;
      readFileSync(path, "utf8").split("\n").forEach((line, index) => {
        if (HARDCODED.some(pattern => pattern.test(line))) found.push(`e2e/${name}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(found).toEqual([]);
  });
});
