import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AirportCombobox } from "@/components/public/AirportCombobox";
import { rememberRecentAirport } from "@/lib/recent-airports";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

// The phone airport picker (#148), through the public From field at phone width.
function setup(props: Partial<Parameters<typeof AirportCombobox>[0]> = {}) {
  const onChange = vi.fn();
  const onAdvance = vi.fn();
  render(<AirportCombobox id="from" value="" onChange={onChange} onAdvance={onAdvance} placeholder="Origin" {...props} />);
  return { onChange, onAdvance, field: screen.getByRole("combobox", { name: "Origin" }) };
}

const picker = () => screen.getByRole("dialog", { name: "Where from?" });
// Opening adds one history entry (after any earlier picker's entry has been removed).
async function historyEntryPushed(push: { mock: { calls: unknown[] } }) {
  await waitFor(() => expect(push.mock.calls).toHaveLength(1));
  expect(window.history.state?.travelianAirportPicker).toBe(true);
}

describe("AirportPickerSheet (phone)", () => {
  const width = window.innerWidth;
  beforeEach(() => {
    window.innerWidth = 390;
    window.localStorage.clear();
  });
  afterEach(() => {
    window.innerWidth = width;
  });

  it("opens full screen with its title, a focused search box, recent searches and then popular airports", async () => {
    rememberRecentAirport("public", { code: "MUX", city: "Multan", name: "Multan International Airport", country: "PK" });
    const { field } = setup();
    expect(field).toHaveAttribute("readonly");
    fireEvent.click(field);
    const dialog = picker();
    expect(within(dialog).getByRole("heading", { name: "Where from?" })).toBeInTheDocument();
    const search = within(dialog).getByRole("combobox", { name: "Where from?" });
    await waitFor(() => expect(search).toHaveFocus());
    const groups = within(dialog).getAllByRole("group");
    expect(groups.map(group => group.getAttribute("aria-labelledby") && document.getElementById(group.getAttribute("aria-labelledby")!)?.textContent))
      .toEqual(["Recent searches", "Popular airports"]);
    expect(within(groups[0]).getByRole("option", { name: /Multan.*MUX/ })).toBeInTheDocument();
    for (const code of ["KHI", "LHE", "ISB", "DXB", "JED"]) expect(within(groups[1]).getByRole("option", { name: new RegExp(code) })).toBeInTheDocument();
    // An airport is listed once: Multan is in the recent list, not again under popular.
    expect(within(groups[1]).queryByRole("option", { name: /MUX/ })).not.toBeInTheDocument();
  });

  it("matches city, airport name and code; choosing fills the field, closes and advances", async () => {
    const { field, onChange, onAdvance } = setup();
    fireEvent.click(field);
    const search = within(picker()).getByRole("combobox");
    fireEvent.change(search, { target: { value: "lah" } });
    const lahore = await within(picker()).findByRole("option", { name: /Lahore.*Allama Iqbal.*LHE/ });
    fireEvent.change(search, { target: { value: "allama" } });
    expect(await within(picker()).findByRole("option", { name: /Lahore.*LHE/ })).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "lhe" } });
    expect(await within(picker()).findByRole("option", { name: /Lahore.*LHE/ })).toBeInTheDocument();
    expect(lahore).toBeTruthy();
    fireEvent.click(within(picker()).getByRole("option", { name: /Lahore.*LHE/ }));
    expect(onChange).toHaveBeenCalledWith("LHE");
    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("arrow keys and Enter pick an airport", async () => {
    const { field, onChange } = setup();
    fireEvent.click(field);
    const search = within(picker()).getByRole("combobox");
    fireEvent.change(search, { target: { value: "lhe" } });
    await within(picker()).findByRole("option", { name: /Lahore.*LHE/ });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "ArrowUp" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("LHE");
  });

  it("shows an empty state with a hint when nothing matches", async () => {
    const { field } = setup();
    fireEvent.click(field);
    fireEvent.change(within(picker()).getByRole("combobox"), { target: { value: "zzqx" } });
    expect(await within(picker()).findByText('No airports match "zzqx"')).toBeInTheDocument();
    expect(within(picker()).getByText("Try a city, airport name or 3-letter code.")).toBeInTheDocument();
  });

  it("the back arrow closes without a change and removes its history entry", async () => {
    const back = vi.spyOn(window.history, "back");
    const push = vi.spyOn(window.history, "pushState");
    const { field, onChange, onAdvance } = setup();
    fireEvent.click(field);
    await historyEntryPushed(push);
    push.mockRestore();
    fireEvent.click(within(picker()).getByRole("button", { name: "Back" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(back).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
    expect(onAdvance).not.toHaveBeenCalled();
    back.mockRestore();
  });

  it("Escape closes without a change", async () => {
    const { field, onChange, onAdvance } = setup();
    fireEvent.click(field);
    fireEvent.keyDown(within(picker()).getByRole("combobox"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("the browser back button (popstate) closes it without a change", async () => {
    const push = vi.spyOn(window.history, "pushState");
    const { field, onChange, onAdvance } = setup();
    fireEvent.click(field);
    await historyEntryPushed(push);
    push.mockRestore();
    act(() => { window.dispatchEvent(new PopStateEvent("popstate", { state: null })); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("opens when the form asks (openSignal), not when it mounts", () => {
    const { rerender } = render(<AirportCombobox value="" onChange={() => undefined} placeholder="Destination" iconVariant="arrival" openSignal={1} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(<AirportCombobox value="" onChange={() => undefined} placeholder="Destination" iconVariant="arrival" openSignal={2} />);
    expect(screen.getByRole("dialog", { name: "Where to?" })).toBeInTheDocument();
  });

  it("keeps the dropdown on tablets and desktops", () => {
    window.innerWidth = 1024;
    const { field } = setup();
    expect(field).not.toHaveAttribute("readonly");
    fireEvent.focus(field);
    expect(screen.queryByRole("dialog", { name: "Where from?" })).not.toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: "Airports" })).toBeInTheDocument();
  });
});
