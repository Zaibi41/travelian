import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { addDays } from "date-fns";
import { expect, it, vi } from "vitest";
import { formatDateOnly } from "@/lib/date-only";
import { HotelSearchBar } from "./HotelSearchBar";

it("prefills a hotel destination and submits only when Search is pressed", () => {
  const onSearch = vi.fn();
  const initialValues = { location: "", checkIn: formatDateOnly(addDays(new Date(), 7)), checkOut: formatDateOnly(addDays(new Date(), 10)), adults: 2, children: 0, rooms: 1 };
  render(<HotelSearchBar initialValues={initialValues} onSearch={onSearch} loading={false} />);
  const dubai = within(screen.getByRole("group", { name: "Popular destinations" })).getByRole("button", { name: "Dubai" });
  fireEvent.click(dubai);
  expect(screen.getByRole("textbox", { name: "Destination" })).toHaveValue("Dubai");
  expect(dubai).toHaveAttribute("aria-pressed", "true");
  expect(onSearch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(onSearch).toHaveBeenCalledWith({ ...initialValues, location: "Dubai" });
});
