import { expect, test, type Page } from "@playwright/test";
import { gatewayView } from "./support/gateway";

// Sign-in guard and expired sessions. Intercepted gateway and Cognito answers only (made-up
// tokens); nothing reaches a real gateway or Cognito.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const KEY = "travelian.session.v1";
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (payload: object) => `${b64({ alg: "none", typ: "JWT" })}.${b64(payload)}.c2lnbmF0dXJl`;

async function mock(page: Page, { searchStatus = 200 } = {}) {
  await page.route("**/*", route => {
    const request = route.request();
    const url = gatewayView(request.url());
    if (url.hostname.startsWith("cognito-idp.")) {
      const target = request.headers()["x-amz-target"] ?? "";
      const now = Math.floor(Date.now() / 1000);
      if (target.endsWith("InitiateAuth")) {
        return route.fulfill({ contentType: "application/x-amz-json-1.1", body: JSON.stringify({
          ChallengeName: "PASSWORD_VERIFIER",
          ChallengeParameters: { SALT: "1a2b3c4d", SRP_B: "ab".repeat(192), SECRET_BLOCK: "c2VjcmV0LWJsb2Nr", USER_ID_FOR_SRP: "staff", USERNAME: "staff" },
        }) });
      }
      if (target.endsWith("RespondToAuthChallenge")) {
        return route.fulfill({ contentType: "application/x-amz-json-1.1", body: JSON.stringify({ AuthenticationResult: {
          IdToken: jwt({ email: "staff@travelian.com", name: "Session Test", sub: "s-1", "cognito:groups": ["super_admin"], iat: now, exp: now + 3600 }),
          AccessToken: jwt({ sub: "s-1", username: "staff", iat: now, exp: now + 3600 }),
          RefreshToken: "test-refresh", ExpiresIn: 3600, TokenType: "Bearer",
        } }) });
      }
      return route.fulfill({ status: 400, contentType: "application/x-amz-json-1.1", body: JSON.stringify({ __type: "NotAuthorizedException", message: "No." }) });
    }
    if (url.port === "8000") {
      if (url.pathname === "/v1/admin/customers") {
        return searchStatus === 401
          ? route.fulfill({ status: 401, json: { detail: "Token expired." } })
          : route.fulfill({ json: { results: [], can_manage: true, can_merge: true } });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.fulfill({ json: {} });
  });
}

const signedIn = (page: Page) => page.addInitScript(key => {
  if (!sessionStorage.getItem("e2e-seeded")) {
    sessionStorage.setItem("e2e-seeded", "1");
    localStorage.setItem(key, JSON.stringify({
      email: "staff@travelian.com", name: "Session Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    }));
  }
}, KEY);

const menu = (page: Page) => page.getByRole("link", { name: "Customers & Travelers" });

async function signIn(page: Page) {
  await page.getByLabel("Email").fill("staff@travelian.com");
  await page.getByLabel("Password", { exact: true }).fill("test-only-password");
  await page.getByRole("button", { name: "Sign In" }).click();
}

test("no session: /admin/customers shows sign-in and no menu, then returns there after sign-in", async ({ page }) => {
  await mock(page);
  await page.goto("/admin/customers");
  await expect(page.getByRole("heading", { name: "Sign in to Travelian" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("redirect")).toBe("/admin/customers");
  await expect(menu(page)).toHaveCount(0);
  await expect(page.getByText("Your session expired. Sign in again.")).toHaveCount(0);   // never signed in: no expired message

  await signIn(page);
  await expect(page).toHaveURL(/\/admin\/customers$/);
  await expect(page.getByRole("heading", { level: 1, name: "Customers & Travelers" })).toBeVisible();
});

test("an expired session never shows the shell", async ({ page }) => {
  await mock(page);
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({
    email: "staff@travelian.com", name: "Session Test", createdAt: new Date().toISOString(), accessToken: "old", expiresAt: Date.now() - 60_000,
  })), KEY);
  await page.goto("/admin/customers");
  await expect(page.getByText("Your session expired. Sign in again.")).toBeVisible();
  await expect(menu(page)).toHaveCount(0);
});

test("a 401 mid-session lands on sign-in with the message and no menu", async ({ page }) => {
  await mock(page, { searchStatus: 401 });
  await signedIn(page);
  await page.goto("/admin/customers");
  await expect(menu(page)).toBeVisible();
  await page.getByLabel("Search", { exact: true }).fill("khan");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in to Travelian" })).toBeVisible();
  await expect(page.getByText("Your session expired. Sign in again.")).toBeVisible();
  await expect(menu(page)).toHaveCount(0);
  const url = new URL(page.url());
  expect([url.pathname, url.searchParams.get("redirect"), url.searchParams.get("reason")]).toEqual(["/signin", "/admin/customers?q=khan", "expired"]);
});

test("a redirect to another site is ignored after sign-in", async ({ page }) => {
  await mock(page);
  await page.goto(`/signin?redirect=${encodeURIComponent("//evil.example/admin")}`);
  await signIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  expect(new URL(page.url()).host).toBe("localhost:8080");
});

test("already signed in: Sign In on the public site lands on /admin and the form never appears", async ({ page }) => {
  await mock(page);
  await signedIn(page);
  // Record if the sign-in form is ever put on the page, even for a moment.
  await page.addInitScript(() => {
    (window as unknown as { formSeen: boolean }).formSeen = false;
    new MutationObserver(() => {
      if (document.querySelector("#email") || [...document.querySelectorAll("h1")].some(h => h.textContent?.includes("Sign in to Travelian"))) {
        (window as unknown as { formSeen: boolean }).formSeen = true;
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("link", { name: "Sign In", exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { formSeen: boolean }).formSeen)).toBe(false);
});

test("expired-session redirect from /admin/customers: the form and the message show", async ({ page }) => {
  await mock(page);
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({
    email: "staff@travelian.com", name: "Session Test", createdAt: new Date().toISOString(), accessToken: "old", expiresAt: Date.now() - 60_000,
  })), KEY);
  await page.goto("/admin/customers");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByText("Your session expired. Sign in again.")).toBeVisible();
  expect(new URL(page.url()).searchParams.get("redirect")).toBe("/admin/customers");
});
