import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignInPage from "./SignInPage";
import { signInWithPassword } from "@/lib/cognito-auth";

vi.mock("@/lib/cognito-auth", () => ({ signInWithPassword: vi.fn() }));
const renewSession = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session-renewal", () => ({ renewSession: () => renewSession() }));
vi.mock("@/contexts/RoleContext", () => ({ useRole: () => ({ setCurrentRole: vi.fn() }) }));

const renderPage = () => render(<HelmetProvider><MemoryRouter><SignInPage /></MemoryRouter></HelmetProvider>);
const fill = () => {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "member@example.test" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
};

beforeEach(() => { vi.mocked(signInWithPassword).mockReset(); renewSession.mockReset(); localStorage.clear(); });

describe("Sign In presentation", () => {
  it("shows field errors and focuses the first invalid field without authenticating", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(screen.getByLabelText("Email")).toHaveFocus();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "invalid-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("preserves credentials and shows server errors as text", async () => {
    vi.mocked(signInWithPassword).mockRejectedValue(new Error("Incorrect email or password."));
    renderPage(); fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Incorrect email or password."));
    expect(signInWithPassword).toHaveBeenCalledWith("member@example.test", "test-password");
    expect(screen.getByLabelText("Email")).toHaveValue("member@example.test");
    expect(screen.getByLabelText("Password")).toHaveValue("test-password");
  });

  it("keeps submitting disabled and prevents duplicate form submissions", async () => {
    let reject: (reason: Error) => void = () => {};
    vi.mocked(signInWithPassword).mockImplementation(() => new Promise((_, rejectPromise) => { reject = rejectPromise; }));
    renderPage(); fill();
    const form = screen.getByRole("button", { name: "Sign In" }).closest("form")!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    expect(signInWithPassword).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error("Please try again.")));
    expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
  });

  it("preserves password visibility and the registration link", () => {
    renderPage();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
  });

  const Landed = () => <p>Landed on {useLocation().pathname}</p>;
  const signInAt = (url: string) => render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="*" element={<Landed />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
  const session = { email: "staff@travelian.com", name: "Staff", createdAt: "", groups: ["super_admin"] };

  it("returns to the remembered admin page after sign-in", async () => {
    vi.mocked(signInWithPassword).mockResolvedValue(session);
    signInAt("/signin?redirect=%2Fadmin%2Fcustomers&reason=expired");
    expect(screen.getByRole("status")).toHaveTextContent("Your session expired. Sign in again.");
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(await screen.findByText("Landed on /admin/customers")).toBeInTheDocument();
  });

  it.each(["https://evil.example/admin", "//evil.example/admin", "javascript:alert(1)", "/signup"])("ignores the redirect %s and goes to the dashboard", async redirect => {
    vi.mocked(signInWithPassword).mockResolvedValue(session);
    signInAt(`/signin?redirect=${encodeURIComponent(redirect)}`);
    expect(screen.queryByRole("status")).toBeNull();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(await screen.findByText("Landed on /admin")).toBeInTheDocument();
  });

  describe("already signed in", () => {
    const KEY = "travelian.session.v1";
    const store = (extra: Record<string, unknown>) => localStorage.setItem(KEY, JSON.stringify({ email: "staff@travelian.com", name: "Staff", createdAt: "", accessToken: "a", ...extra }));

    it("a valid session never shows the form and goes to /admin", () => {
      store({ expiresAt: Date.now() + 60_000 });
      signInAt("/signin");
      expect(screen.getByText("Landed on /admin")).toBeInTheDocument();
      expect(screen.queryByLabelText("Email")).toBeNull();
    });

    it("a valid session goes to a safe remembered page; an unsafe one is ignored", () => {
      store({ expiresAt: Date.now() + 60_000 });
      const { unmount } = signInAt("/signin?redirect=%2Fadmin%2Fcustomers");
      expect(screen.getByText("Landed on /admin/customers")).toBeInTheDocument();
      unmount();
      signInAt(`/signin?redirect=${encodeURIComponent("//evil.example/admin")}`);
      expect(screen.getByText("Landed on /admin")).toBeInTheDocument();
    });

    it("expired with a refresh token that works: refresh once, then the admin, no form", async () => {
      store({ expiresAt: Date.now() - 1000, refreshToken: "r" });
      renewSession.mockImplementation(async () => {
        store({ expiresAt: Date.now() + 60_000, refreshToken: "r" });
        return true;
      });
      signInAt("/signin");
      expect(screen.queryByLabelText("Email")).toBeNull();
      expect(await screen.findByText("Landed on /admin")).toBeInTheDocument();
      expect(renewSession).toHaveBeenCalledTimes(1);
    });

    it("expired with a refresh that fails: session cleared, form shown, no message unless sent from an expired admin page", async () => {
      store({ expiresAt: Date.now() - 1000, refreshToken: "r" });
      renewSession.mockResolvedValue(false);
      const { unmount } = signInAt("/signin");
      expect(await screen.findByLabelText("Email")).toBeInTheDocument();
      expect(localStorage.getItem(KEY)).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
      unmount();
      store({ expiresAt: Date.now() - 1000, refreshToken: "r" });
      signInAt("/signin?redirect=%2Fadmin%2Fcustomers&reason=expired");
      expect(await screen.findByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Your session expired. Sign in again.");
    });

    it("no session: the form, as before", () => {
      signInAt("/signin");
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(renewSession).not.toHaveBeenCalled();
    });
  });
});

