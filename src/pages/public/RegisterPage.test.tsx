import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./RegisterPage";
import { confirmSignUp, signUpWithPassword } from "@/lib/cognito-auth";
import { rememberAccountRole } from "@/lib/role-mapping";

vi.mock("@/lib/cognito-auth", () => ({ signUpWithPassword: vi.fn(), confirmSignUp: vi.fn() }));
vi.mock("@/lib/role-mapping", () => ({ rememberAccountRole: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); vi.mocked(signUpWithPassword).mockReset(); });
const renderPage = () => render(<HelmetProvider><MemoryRouter><RegisterPage /></MemoryRouter></HelmetProvider>);
const fill = () => {
  for (const [label, value] of [["Full Name", "Test Member"], ["Email", "member@example.test"], ["Mobile Number", "+92 300 0000000"], ["Password", "test-password"], ["Confirm Password", "test-password"]]) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }
  fireEvent.click(screen.getByRole("checkbox"));
};
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

describe("registration presentation", () => {
  it("shows inline errors and focuses the first invalid field", () => {
    renderPage(); submit();
    expect(screen.getByLabelText("Full Name")).toHaveFocus();
    expect(screen.getByLabelText("Mobile Number")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
    expect(signUpWithPassword).not.toHaveBeenCalled();
  });

  it("preserves entered values for invalid email and mismatched passwords", () => {
    renderPage(); fill();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "invalid-email" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "different" } });
    submit();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveValue("test-password");
    expect(signUpWithPassword).not.toHaveBeenCalled();
  });

  it.each([["Customer", "customer"], ["Travel Partner", "agency_owner"]])("preserves %s role mapping and registration payload", async (label, role) => {
    vi.mocked(signUpWithPassword).mockResolvedValue({ UserSub: "test", UserConfirmed: true });
    renderPage(); fill();
    fireEvent.click(screen.getByRole("radio", { name: label }));
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    if (label === "Travel Partner") expect(screen.getByText(/Travel Partner accounts are reviewed/)).toBeInTheDocument();
    else expect(screen.queryByText(/Travel Partner accounts are reviewed/)).not.toBeInTheDocument();
    submit();
    await waitFor(() => expect(rememberAccountRole).toHaveBeenCalledWith("member@example.test", role));
    expect(signUpWithPassword).toHaveBeenCalledWith("member@example.test", "test-password", "Test Member");
  });

  it("preserves email verification transition and confirmation call", async () => {
    vi.mocked(signUpWithPassword).mockResolvedValue({ UserSub: "test", UserConfirmed: false });
    vi.mocked(confirmSignUp).mockResolvedValue({});
    renderPage(); fill(); submit();
    const code = await screen.findByLabelText("Verification code");
    fireEvent.change(code, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify Account" }));
    await waitFor(() => expect(confirmSignUp).toHaveBeenCalledWith("member@example.test", "123456"));
    await screen.findByLabelText("Full Name");
  });

  it("prevents duplicates and displays backend failure without clearing values", async () => {
    let reject: (error: Error) => void = () => {};
    vi.mocked(signUpWithPassword).mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    renderPage(); fill();
    const form = screen.getByRole("button", { name: "Create Account" }).closest("form")!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(signUpWithPassword).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Creating account…" })).toBeDisabled();
    await act(async () => reject(new Error("An account with this email already exists.")));
    expect(screen.getByRole("alert")).toHaveTextContent("An account with this email already exists.");
    expect(screen.getByLabelText("Password")).toHaveValue("test-password");
  });
});
