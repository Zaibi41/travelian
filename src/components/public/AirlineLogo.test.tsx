import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AirlineLogo as PublicAirlineLogo } from "./AirlineLogo";
import { AirlineLogo as AdminAirlineLogo } from "@/components/admin/ui/AirlineLogo";

describe.each([
  ["public", PublicAirlineLogo],
  ["admin", AdminAirlineLogo],
])("%s AirlineLogo", (_name, AirlineLogo) => {
  it.each([
    ["Gulf Air", "GF 765", "/airline-logos/gulf-air.png"],
    ["Gulf Air", undefined, "/airline-logos/gulf-air.png"],
    ["Airline", "TK 715", "/airline-logos/turkish-airlines.png"],
    ["Emirates", "EK 623", "/airline-logos/emirates.png"],
    ["Qatar Airways", "QR 629", "/airline-logos/qatar-airways.png"],
    ["Fly Jinnah", "9P 842", "/airline-logos/fly-jinnah.png"],
    ["PIA", "PK 303", "/airline-logos/pia.png"],
    ["Airblue", "PA 470", "/airline-logos/airblue.png"],
    ["Oman Air", "WY 346", "/airline-logos/oman-air.png"],
  ])("%s %s uses %s", (airline, flightNumber, src) => {
    render(<AirlineLogo airline={airline} flightNumber={flightNumber} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", src);
  });

  it("prefers Travelian's own logo over a supplier image, and falls back to it if ours fails", () => {
    render(<AirlineLogo airline="Gulf Air" flightNumber="GF 765" imageUrl="/v1/logos/abc" />);
    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("src", "/airline-logos/gulf-air.png");
    fireEvent.error(image);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/v1/logos/abc");
  });

  it.each([
    ["South Air", "Z8266"],
    ["South Air International Regional Airways Limited", "Z8 267"],
    ["Airline", "Z8266"],
    ["South Air", undefined],
  ])("%s %s uses Travelian's South Air file", (airline, flightNumber) => {
    render(<AirlineLogo airline={airline} flightNumber={flightNumber} imageUrl="/v1/logos/z8" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/airline-logos/south-air.png");
  });

  it("uses the supplier image for an airline without a logo file, then the IATA code badge if it fails", () => {
    render(<AirlineLogo airline="Unknown Air" flightNumber="ZZ 1" imageUrl="/v1/logos/zz" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/v1/logos/zz");
    fireEvent.error(screen.getByRole("img"));
    const badge = screen.getByRole("img", { name: "Unknown Air logo" });
    expect(badge.tagName).toBe("DIV");
    expect(badge).toHaveTextContent(/^ZZ$/);
  });

  it("shows the IATA code badge when there is no logo file and no supplier image", () => {
    render(<AirlineLogo airline="Unknown Air" flightNumber="X3 1200" />);
    expect(screen.getByRole("img", { name: "Unknown Air logo" })).toHaveTextContent(/^X3$/);
  });

  it("falls back to the code badge when both our file and the supplier image fail", () => {
    render(<AirlineLogo airline="South Air" flightNumber="Z8266" imageUrl="/v1/logos/z8" />);
    fireEvent.error(screen.getByRole("img"));
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("img", { name: "South Air logo" })).toHaveTextContent(/^Z8$/);
  });

  it("uses a separately given airline code (gateway airline_code) for the logo file or the badge", () => {
    const { unmount } = render(<AirlineLogo airline="South Air" code="Z8" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/airline-logos/south-air.png");
    unmount();
    render(<AirlineLogo airline="Some New Airline" code="x3" />);
    expect(screen.getByRole("img", { name: "Some New Airline logo" })).toHaveTextContent(/^X3$/);
  });

  it("shows the plane icon only when the airline code is unknown", () => {
    const { container } = render(<AirlineLogo airline="Unknown Air" flightNumber="Not specified" />);
    expect(screen.getByRole("img", { name: "Unknown Air logo" })).toHaveTextContent("");
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
