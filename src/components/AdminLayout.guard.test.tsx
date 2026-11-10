import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const renewSession = vi.fn();
vi.mock("@/lib/session-renewal", () => ({ renewSession: () => renewSession(), isUserSignOut: () => false, markUserSignOut: () => undefined }));
vi.mock("@/lib/cognito-auth", () => ({ cognitoLogoutUrl: () => "" }));

import { useAdminSession } from "./AdminLayout";

const KEY = "travelian.session.v1";
function Guarded() {
  return useAdminSession() ? <nav aria-label="Admin menu">Menu</nav> : null;
}
function SignIn() {
  const location = useLocation();
  return <p>Sign in page {location.search}</p>;
}
const show = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/admin/*" element={<Guarded />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  localStorage.clear();
  renewSession.mockReset();
});

describe("admin route guard", () => {
  it("no session: no menu, sign-in remembers the page, no expired message", async () => {
    show("/admin/customers?q=khan");
    expect(await screen.findByText("Sign in page ?redirect=%2Fadmin%2Fcustomers%3Fq%3Dkhan")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Admin menu" })).toBeNull();
  });

  it("an expired session without a refresh token: cleared, sign-in with the expired reason", async () => {
    localStorage.setItem(KEY, JSON.stringify({ email: "t@example.invalid", name: "T", createdAt: "", accessToken: "x", expiresAt: Date.now() - 1000 }));
    show("/admin/customers");
    expect(await screen.findByText("Sign in page ?redirect=%2Fadmin%2Fcustomers&reason=expired")).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(renewSession).not.toHaveBeenCalled();
  });

  it("an expired session with a refresh token: one refresh, then the page", async () => {
    localStorage.setItem(KEY, JSON.stringify({ email: "t@example.invalid", name: "T", createdAt: "", accessToken: "x", refreshToken: "r", expiresAt: Date.now() - 1000 }));
    renewSession.mockImplementation(async () => {
      localStorage.setItem(KEY, JSON.stringify({ email: "t@example.invalid", name: "T", createdAt: "", accessToken: "y", refreshToken: "r", expiresAt: Date.now() + 60_000 }));
      return true;
    });
    show("/admin/customers");
    expect(await screen.findByRole("navigation", { name: "Admin menu" })).toBeInTheDocument();
    expect(renewSession).toHaveBeenCalledTimes(1);
  });

  it("a valid session shows the page", () => {
    localStorage.setItem(KEY, JSON.stringify({ email: "t@example.invalid", name: "T", createdAt: "", accessToken: "x", expiresAt: Date.now() + 60_000 }));
    show("/admin/customers");
    expect(screen.getByRole("navigation", { name: "Admin menu" })).toBeInTheDocument();
  });
});
