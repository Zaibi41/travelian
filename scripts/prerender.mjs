// Prerenders the static public pages so search engines and link previews get real HTML
// without running JavaScript. Run after `npm run build`; writes dist-prerender/<name>.html.
//
// The deploy uploads each file as an extensionless S3 key ("faq", "about", ...) so CloudFront
// serves it for that exact URL, and the home page as index.html. index.html is also CloudFront's
// fallback for every other route, so each page carries a guard that empties #root before paint
// when the URL is not the page it was rendered for; the app then renders the real route as before.
//
// API calls are held (never answered) while rendering: pages are captured in their loading state,
// never with build-time fares, prices or seat counts that would go stale.
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

export const PRERENDER_ROUTES = [
  "/",
  "/group-ticketing",
  "/deals",
  "/about",
  "/contact",
  "/faq",
  "/careers",
  "/privacy",
  "/terms",
];

const PORT = Number(process.env.PRERENDER_PORT || 4179);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const OUT_DIR = new URL("../dist-prerender/", import.meta.url);

// Same script on every page: it compares the URL with the page's data-prerendered path.
const GUARD_JS =
  `(function(){var r=document.getElementById("root"),p=location.pathname.replace(/\\/+$/,"")||"/";` +
  `if(r&&r.getAttribute("data-prerendered")!==p)r.innerHTML="";})();`;

async function waitForServer(url, timeoutMs = 30_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try { if ((await fetch(url)).ok) return; } catch { /* not up yet */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Preview server did not start on ${url}`);
}

async function launch() {
  try { return await chromium.launch({ channel: "chrome" }); } catch { return await chromium.launch(); }
}

async function render(browser, path) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  // Hold every request that leaves the preview server (API, fonts, analytics).
  await page.route(url => url.origin !== ORIGIN, () => new Promise(() => {}));
  await page.goto(ORIGIN + path, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(expected => {
    const canonical = document.querySelector('link[rel="canonical"][data-rh]');
    return document.querySelectorAll("#root h1").length === 1
      && canonical && new URL(canonical.href).pathname === expected
      && !document.querySelector("#root [role=status]")?.textContent?.includes("Loading page");
  }, path, { timeout: 30_000 });
  await page.waitForTimeout(500);
  if (errors.length) throw new Error(`${path}: ${errors.join("; ")}`);
  const html = await page.evaluate(({ path, guardJs }) => {
    const root = document.getElementById("root");
    root.setAttribute("data-prerendered", path);
    const script = document.createElement("script");
    script.textContent = guardJs;
    root.after(script);
    // index.html is served for every unknown route too, so it must not claim to be the home page's URL.
    if (path === "/") document.querySelectorAll('link[rel="canonical"], meta[property="og:url"]').forEach(el => el.remove());
    return "<!doctype html>\n" + document.documentElement.outerHTML;
  }, { path, guardJs: GUARD_JS });
  await page.close();
  // Vite's preload helper adds <link rel="modulepreload"> tags with absolute URLs of the preview server:
  // make every same-origin URL relative, and refuse to write a page that still points at it.
  const relative = html.replaceAll(ORIGIN, "");
  if (/127\.0\.0\.1|localhost/.test(relative)) throw new Error(`${path}: prerendered HTML still references the preview server`);
  if (!relative.includes(`src="${ENTRY}"`)) throw new Error(`${path}: rendered from another build (no ${ENTRY})`);
  return relative;
}

// Another preview already on this port would be rendered instead of this build: refuse.
if (await fetch(ORIGIN + "/").then(() => true, () => false)) {
  throw new Error(`Port ${PORT} is already in use; stop that server or set PRERENDER_PORT`);
}
// Every saved page must load this build's own entry script.
const ENTRY = (await readFile(new URL("../dist/index.html", import.meta.url), "utf8")).match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
if (!ENTRY) throw new Error("dist/index.html has no entry script; run `npm run build` first");

// Start Vite itself, not through npx: killing npx would leave the preview server running on PORT.
const viteBin = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const server = spawn(process.execPath, [viteBin, "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], { stdio: "ignore" });
try {
  await waitForServer(ORIGIN + "/");
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await launch();
  try {
    for (const path of PRERENDER_ROUTES) {
      const html = await render(browser, path);
      const name = path === "/" ? "index" : path.slice(1);
      await writeFile(new URL(`${name}.html`, OUT_DIR), html);
      console.log(`prerendered ${path} -> dist-prerender/${name}.html (${Math.round(html.length / 1024)} KB)`);
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
