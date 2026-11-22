import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DatePickerField } from "./date-picker-field";
import { pickDate } from "@/test/pick-date";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

function Harness({ min, max, initial, typeable, defaultMonth }: { min?: string; max?: string; initial?: string; typeable?: boolean; defaultMonth?: string }) {
  const [value, setValue] = useState<string | undefined>(initial);
  return (
    <>
      <label htmlFor="dob">Date of Birth</label>
      <DatePickerField id="dob" value={value} onChange={setValue} min={min} max={max} placeholder="Select date of birth" typeable={typeable} defaultMonth={defaultMonth} />
      <output data-testid="value">{value ?? ""}</output>
    </>
  );
}

describe("DatePickerField", () => {
  it("opens from its field, jumps by month and year lists, and keeps an ISO value shown day first", () => {
    render(<Harness max="2026-11-19" />);
    const field = screen.getByLabelText("Date of Birth");
    expect(field).toHaveTextContent("Select date of birth");
    pickDate(field, "1990-03-14");
    expect(screen.getByTestId("value")).toHaveTextContent("1990-03-14");
    expect(field).toHaveTextContent("14 Mar 1990");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); // closes after picking
  });

  it("days outside min/max can't be picked; the year list stops at the limits", () => {
    render(<Harness min="2026-11-19" max="2026-12-31" initial="2026-11-25" />);
    fireEvent.click(screen.getByLabelText("Date of Birth"));
    const dialog = screen.getByRole("dialog");
    const years = Array.from((dialog.querySelectorAll("select")[1] as HTMLSelectElement).options).map(option => option.value);
    expect(years).toEqual(["2026"]);
    const eighteenth = Array.from(dialog.querySelectorAll("button")).find(button => button.textContent === "18");
    expect(eighteenth).toBeDisabled();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("value")).toHaveTextContent("2026-11-25");
  });

  it("is a button with the field's name and state for keyboard and screen readers", () => {
    render(<><label htmlFor="x">Date of Expiry</label><DatePickerField id="x" value="2031-01-01" onChange={() => undefined} invalid describedBy="x-error" /></>);
    const field = screen.getByRole("button", { name: "Date of Expiry" });
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAttribute("aria-describedby", "x-error");
    expect(field).toHaveTextContent("1 Jan 2031");
  });

  it("typeable: the date is typed day first, a wrong or out-of-range one says so, and the calendar still works (#155)", () => {
    render(<Harness typeable min="1906-01-01" max="2026-11-19" />);
    const input = screen.getByLabelText("Date of Birth");
    expect(input).toHaveAttribute("placeholder", "DD/MM/YYYY");
    fireEvent.change(input, { target: { value: "14031990" } });
    expect(input).toHaveValue("14/03/1990");
    expect(screen.getByTestId("value")).toHaveTextContent("1990-03-14");
    fireEvent.change(input, { target: { value: "31/02/1990" } });
    fireEvent.blur(input);
    expect(screen.getByTestId("value")).toHaveTextContent("");
    expect(screen.getByText("Enter the date as DD/MM/YYYY.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(input, { target: { value: "01/01/2030" } });
    fireEvent.blur(input);
    expect(screen.getByText("Choose 19 Nov 2026 or earlier.")).toBeInTheDocument();
    pickDate(screen.getByRole("button", { name: "Open calendar" }), "1988-04-12");
    expect(screen.getByTestId("value")).toHaveTextContent("1988-04-12");
    expect(input).toHaveValue("12/04/1988");
  });

  it("opens on the default month while nothing is picked (#155)", () => {
    render(<Harness defaultMonth="1996-11-01" max="2026-11-19" />);
    fireEvent.click(screen.getByLabelText("Date of Birth"));
    const selects = screen.getByRole("dialog").querySelectorAll("select");
    expect((selects[1] as HTMLSelectElement).value).toBe("1996");
    expect((selects[0] as HTMLSelectElement).value).toBe("10");
  });
});
