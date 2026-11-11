import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "./button";
import { FieldShell, Input } from "./field";
import { describedBy } from "./classes";
import { StatusBadge, Tag } from "./StatusBadge";
import { Chip, EmptyState, LoadingCards, Notice, Panel } from "./feedback";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { ADMIN_PRODUCT_TABS } from "./product-tabs";

// The admin design system's shared components (docs/design-system.md): public-site shapes and
// sizes, admin colours, text always next to a status colour.
describe("admin Button", () => {
  it("primary is the teal action; default stays navy; sizes come from the tokens", () => {
    render(<><Button variant="primary">Hold</Button><Button>Save</Button><Button size="lg">Search</Button><Button size="sm">Next</Button></>);
    expect(screen.getByRole("button", { name: "Hold" }).className).toMatch(/\bbg-action\b/);
    expect(screen.getByRole("button", { name: "Hold" }).className).toMatch(/\bh-control\b/);
    expect(screen.getByRole("button", { name: "Save" }).className).toMatch(/\bbg-primary\b/);
    expect(screen.getByRole("button", { name: "Search" }).className).toMatch(/\bh-control-lg\b.*\brounded-field\b/);
    expect(screen.getByRole("button", { name: "Next" }).className).toMatch(/\bh-9\b/);
    expect(screen.getByRole("button", { name: "Next" }).className).not.toMatch(/\bh-control\b/);
  });

  it("a className override replaces the token size instead of keeping both", () => {
    render(<Button className="h-9 w-9" size="icon" aria-label="More" />);
    const classes = screen.getByRole("button", { name: "More" }).className.split(" ");
    expect(classes).toContain("h-9");
    expect(classes).not.toContain("h-control");
    expect(classes).not.toContain("w-control");
  });

  it("renders a link with asChild", () => {
    render(<Button asChild variant="primary"><a href="/admin/bookings/1">View booking</a></Button>);
    expect(screen.getByRole("link", { name: "View booking" })).toHaveAttribute("href", "/admin/bookings/1");
  });
});

describe("admin fields", () => {
  it("FieldShell: label above, leading icon, hint, then the error replaces the hint", () => {
    const { rerender } = render(
      <FieldShell id="email" label="Email" icon={<svg data-testid="icon" />} hint="We never share it">
        <Input id="email" aria-describedby={describedBy("email", { hint: true })} />
      </FieldShell>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAccessibleDescription("We never share it");
    expect(input.className).toMatch(/\bh-control\b.*\brounded-md\b/);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    rerender(
      <FieldShell id="email" label="Email" hint="We never share it" error="Enter an email address">
        <Input id="email" aria-invalid aria-describedby={describedBy("email", { hint: true, error: true })} />
      </FieldShell>,
    );
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter an email address");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an email address");
    expect(screen.queryByText("We never share it")).not.toBeInTheDocument();
  });
});

describe("badges, tags and notices", () => {
  it("status badges always carry text, in the public badge shape", () => {
    render(<><StatusBadge severity="action" /><StatusBadge severity="fine">Paid</StatusBadge><Tag tone="navy">Held</Tag></>);
    const badge = screen.getByText("Needs action").parentElement!;
    expect(badge.className).toMatch(/\bh-badge\b.*\brounded-pill\b.*\bpx-badge-x\b.*\btext-helper\b.*\bfont-semibold\b/);
    expect(badge.className).toMatch(/\bbg-status-action-soft\b.*\btext-status-action-text\b/);
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("Held").parentElement!.className).toMatch(/\btext-brand-navy\b/);
  });

  it("a critical notice is an alert; others are status messages with title and text", () => {
    render(<><Notice tone="critical">Gateway unavailable.</Notice><Notice title="Not recorded yet">Payments arrive later.</Notice></>);
    expect(screen.getByRole("alert")).toHaveTextContent("Gateway unavailable.");
    expect(screen.getByRole("status")).toHaveTextContent("Not recorded yetPayments arrive later.");
  });

  it("panel, empty and loading states", () => {
    render(<><Panel data-testid="panel">Body</Panel><EmptyState title="No bookings yet">Bookings appear here.</EmptyState><LoadingCards count={3} label="Loading figures" /></>);
    expect(screen.getByTestId("panel").className).toMatch(/\brounded-xl\b.*\bpx-card\b/);
    expect(screen.getByRole("status")).toHaveTextContent("No bookings yetBookings appear here.");
    expect(screen.getByLabelText("Loading figures").children).toHaveLength(3);
  });
});

describe("Chip", () => {
  it("is a toggle button with aria-pressed", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Chip onClick={onClick}>LHE → JED</Chip>);
    const chip = screen.getByRole("button", { name: "LHE → JED" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(chip).toHaveAttribute("type", "button");
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledOnce();
    rerender(<Chip pressed onClick={onClick}>LHE → JED</Chip>);
    expect(screen.getByRole("button", { name: "LHE → JED" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Dialog", () => {
  it("never taller than 85% of the viewport and scrolls inside", () => {
    render(<Dialog open><DialogContent aria-describedby={undefined}><DialogTitle>Merge</DialogTitle>Body</DialogContent></Dialog>);
    expect(screen.getByRole("dialog").className).toMatch(/max-h-\[85vh\].*overflow-y-auto.*rounded-xl/);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});

describe("product tabs", () => {
  it("the admin's own list: same order and labels as the public tabs, each with an icon", () => {
    expect(ADMIN_PRODUCT_TABS.map(tab => tab.label)).toEqual(["Flights", "Group Ticketing", "Hotels", "Umrah"]);
    expect(ADMIN_PRODUCT_TABS.every(tab => tab.icon)).toBe(true);
  });
});
