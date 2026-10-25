import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TravelersClassPicker, type TravelersValue } from "./TravelersClassPicker";

function Harness({ mode = "travelers" }: { mode?: "travelers" | "cabin" }) {
  const [value, setValue] = useState<TravelersValue>({ adults: 1, children: 0, infants: 0, cabin: "Economy" });
  return <><TravelersClassPicker mode={mode} value={value} onChange={setValue} /><output data-testid="value">{JSON.stringify(value)}</output></>;
}

const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("TravelersClassPicker", () => {
  it("enforces passenger minima and updates the summary immediately", () => {
    render(<Harness />);
    press("1 Traveler");
    for (const label of ["Adults", "Children", "Infants"]) expect(screen.getByRole("button", { name: `Decrease ${label}` })).toBeDisabled();
    press("Increase Children");
    expect(screen.getByRole("button", { name: "2 Travelers" })).toBeInTheDocument();
    expect(screen.getByTestId("value")).toHaveTextContent('"children":1');
    press("Decrease Children");
    expect(screen.getByRole("button", { name: "Decrease Children" })).toBeDisabled();
  });

  it("prevents infants exceeding adults and adult reductions below infants", () => {
    render(<Harness />);
    press("1 Traveler");
    press("Increase Infants");
    expect(screen.getByRole("button", { name: "Increase Infants" })).toBeDisabled();
    press("Increase Adults");
    press("Increase Infants");
    expect(screen.getByRole("button", { name: "Decrease Adults" })).toBeDisabled();
    press("Decrease Infants");
    press("Decrease Adults");
    expect(screen.getByTestId("value")).toHaveTextContent('"adults":1,"children":0,"infants":1');
  });

  it("retains passenger values after Done and reopening", () => {
    render(<Harness />);
    press("1 Traveler");
    press("Increase Adults");
    press("Done");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    press("2 Travelers");
    expect(screen.getByRole("button", { name: "Decrease Adults" })).not.toBeDisabled();
  });

  it("selects exactly one cabin and retains its backend value", () => {
    render(<Harness mode="cabin" />);
    press("Economy");
    for (const cabin of ["Premium Economy", "Business", "First", "Economy"]) {
      press(`Select ${cabin} cabin`);
      expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
      expect(screen.getByTestId("value")).toHaveTextContent(`"cabin":"${cabin}"`);
    }
    press("Select Business cabin");
    press("Done");
    press("Business");
    expect(screen.getByRole("button", { name: "Select Business cabin" })).toHaveAttribute("aria-pressed", "true");
  });
});
