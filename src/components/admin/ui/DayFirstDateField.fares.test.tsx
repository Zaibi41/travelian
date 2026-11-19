import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DayFirstDateField } from "@/components/admin/ui/DayFirstDateField";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const day = (offset: number, rupees?: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { date: iso, checked: true, available: Boolean(rupees), ...(rupees ? { lowest_price: { amount_minor: rupees * 100, currency: "PKR" } } : {}) };
};

describe("admin search date field with fares", () => {
  it("opens the website's fare calendar; picking a priced date sets it and closes", () => {
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    const days = [day(2, 14_000), day(3, 17_000)];
    render(<DayFirstDateField id="d" variant="search" calendarTitle="Select departure date" onChange={onChange} onOpenChange={onOpenChange}
      fares={{ days, anyDate: true }} />);
    fireEvent.click(screen.getByRole("textbox"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("Lowest fares found for 2 dates")).toBeInTheDocument();
    expect(screen.getAllByText("14k").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText("14k")[0].closest("button")!);
    expect(onChange).toHaveBeenCalledWith(days[0].date);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("without fares the plain calendar shows (as before)", () => {
    render(<DayFirstDateField id="d" variant="search" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("textbox"));
    expect(screen.queryByText(/Lowest fares/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("grid").length).toBeGreaterThan(0);
  });
});
