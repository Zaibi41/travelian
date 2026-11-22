import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STAFF_DRAFT } from "@/test/hold-fixtures";
import { FlightFareDetails } from "./SelectedFareSummary";

describe("Selected fare on the booking page (#88)", () => {
  it("shows the airline's logo file next to its name", () => {
    render(<FlightFareDetails draft={STAFF_DRAFT} />);
    const logo = screen.getByRole("img", { name: "South Air logo" });
    expect(logo.tagName).toBe("IMG");
    expect(logo.getAttribute("src")).toMatch(/airline-logos\//);
    expect(screen.getByText("South Air")).toBeInTheDocument();
  });

  it("an airline with no logo file shows its IATA code badge", () => {
    const pick = { ...STAFF_DRAFT.picks[0], flight: { ...STAFF_DRAFT.picks[0].flight, airline_code: "QZ", airline_name: "Some Long Unknown Airline Name", flight_number: "QZ101" } };
    render(<FlightFareDetails draft={{ ...STAFF_DRAFT, picks: [pick] }} />);
    expect(screen.getByRole("img", { name: "Some Long Unknown Airline Name logo" })).toHaveTextContent("QZ");
  });
});
