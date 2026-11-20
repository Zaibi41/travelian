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

  it("uses the supplier image for an airline without a logo file, then the plane icon if it fails", () => {
    const { container } = render(<AirlineLogo airline="Unknown Air" flightNumber="ZZ 1" imageUrl="/v1/logos/zz" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
