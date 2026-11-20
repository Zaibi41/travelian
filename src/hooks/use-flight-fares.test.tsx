import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DayFirstDateField } from "@/components/admin/ui/DayFirstDateField";
import { FARE_DEBOUNCE_MS, useFareCalendars, useFlightFares } from "./use-flight-fares";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

// #55: the fares load once From and To are set (debounced), not when the calendar opens; no cache beyond this form.
const price = (date: string, rupees: number) => ({ date, checked: true, available: true, lowest_price: { amount_minor: rupees * 100, currency: "PKR" } });
const DAYS = [price("2026-11-24", 18_500), price("2026-11-25", 19_000), price("2026-11-26", 23_000), price("2026-11-27", 30_000)];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/** A search form like admin Flights: From, To and the Departure date field with the fare calendar. */
function Form({ fetch }: { fetch: Parameters<typeof useFlightFares>[2] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState<string>();
  const fares = useFlightFares(true, { from, to, adults: 1, cabin: "economy" }, fetch);
  return (
    <>
      <input aria-label="From" value={from} onChange={(event) => setFrom(event.target.value)} />
      <input aria-label="To" value={to} onChange={(event) => setTo(event.target.value)} />
      <DayFirstDateField id="d" variant="search" value={date} onChange={setDate} calendarTitle="Select departure date"
        fares={fares.ready ? { days: fares.days, checking: fares.checking, anyDate: true, status: fares.status } : undefined} />
      <output aria-label="picked">{date ?? ""}</output>
    </>
  );
}

const type = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
const wait = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const openCalendar = () => fireEvent.click(document.getElementById("d")!);
const closeCalendar = () => fireEvent.click(screen.getByRole("button", { name: "Close" }));

describe("calendar fares load early", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-20T10:00:00")); });
  afterEach(() => vi.useRealTimers());

  it("starts once From and To are both set, after the pause, and not per key typed", async () => {
    const fetch = vi.fn().mockResolvedValue({ days: DAYS, pending: false });
    render(<Form fetch={fetch} />);
    type("From", "KHI");
    await wait(1000);
    expect(fetch).not.toHaveBeenCalled(); // To still empty
    type("To", "I");
    type("To", "IS");
    type("To", "ISL"); // a complete code, quickly changed again
    await wait(100);
    type("To", "ISB");
    await wait(FARE_DEBOUNCE_MS - 50);
    expect(fetch).not.toHaveBeenCalled(); // still inside the pause
    await wait(100);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("KHI", "ISB", 1, "economy", expect.any(AbortSignal), undefined);
    // Already loaded when the calendar opens: prices, colours with labels, and the cheapest in the legend.
    openCalendar();
    expect(screen.getByText("Cheapest Rs 18,500")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Avg")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Indicative prices. The exact price is confirmed in search results.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tuesday 24 November: from Rs 18,500/ })).toBeInTheDocument();
  });

  it("opening and closing the calendar again reuses the prices (no new request)", async () => {
    const fetch = vi.fn().mockResolvedValue({ days: DAYS, pending: false });
    render(<Form fetch={fetch} />);
    type("From", "KHI");
    type("To", "ISB");
    await wait(FARE_DEBOUNCE_MS);
    for (let i = 0; i < 3; i += 1) {
      openCalendar();
      expect(screen.getByText("Cheapest Rs 18,500")).toBeInTheDocument();
      closeCalendar();
      await wait(1000);
    }
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("changing From / To aborts the old request and ignores its answer", async () => {
    const first = deferred<{ days: typeof DAYS; pending: boolean }>();
    const signals: AbortSignal[] = [];
    const fetch = vi.fn((_from: string, _to: string, _adults: number, _cabin: string, signal?: AbortSignal) => {
      signals.push(signal!);
      return signals.length === 1 ? first.promise : Promise.resolve({ days: [price("2026-11-24", 40_000)], pending: false });
    });
    render(<Form fetch={fetch} />);
    type("From", "KHI");
    type("To", "ISB");
    await wait(FARE_DEBOUNCE_MS);
    expect(fetch).toHaveBeenCalledTimes(1);
    type("To", "LHE");
    expect(signals[0].aborted).toBe(true);
    await wait(FARE_DEBOUNCE_MS);
    expect(fetch).toHaveBeenLastCalledWith("KHI", "LHE", 1, "economy", expect.any(AbortSignal), undefined);
    await act(async () => first.resolve({ days: DAYS, pending: false })); // the old answer arrives late
    openCalendar();
    expect(screen.getByText("Cheapest Rs 40,000")).toBeInTheDocument();
    expect(screen.queryByText("Cheapest Rs 18,500")).not.toBeInTheDocument();
  });

  it("opened while the request runs: the calendar shows at once with loading price slots, then fills in", async () => {
    const answer = deferred<{ days: typeof DAYS; pending: boolean }>();
    const fetch = vi.fn(() => answer.promise);
    render(<Form fetch={fetch} />);
    type("From", "KHI");
    type("To", "ISB");
    openCalendar(); // before the pause is over, and before the answer
    expect(screen.getByText("Loading fares…")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-fare-loading]").length).toBeGreaterThan(0);
    await wait(FARE_DEBOUNCE_MS);
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => answer.resolve({ days: DAYS, pending: false }));
    expect(screen.getByText("Cheapest Rs 18,500")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-fare-loading]")).toHaveLength(0);
  });

  it("a failed request: 'Prices unavailable', and any future date can still be picked", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("502"));
    render(<Form fetch={fetch} />);
    type("From", "KHI");
    type("To", "ISB");
    await wait(FARE_DEBOUNCE_MS);
    openCalendar();
    expect(screen.getByText("Prices unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/Cheapest/)).not.toBeInTheDocument();
    const day = screen.getByRole("button", { name: /Friday 4 December/ });
    expect(day).toBeEnabled();
    fireEvent.click(day);
    expect(screen.getByLabelText("picked")).toHaveTextContent("2026-12-04");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("a new form (new search, page reload) asks again: nothing is cached", async () => {
    const fetch = vi.fn().mockResolvedValue({ days: DAYS, pending: false });
    const { unmount } = render(<Form fetch={fetch} />);
    type("From", "KHI");
    type("To", "ISB");
    await wait(FARE_DEBOUNCE_MS);
    unmount();
    render(<Form fetch={fetch} />);
    type("From", "KHI");
    type("To", "ISB");
    await wait(FARE_DEBOUNCE_MS);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("two calendars of one form on the same route share one request; a route no longer shown is forgotten", async () => {
    const load = vi.fn().mockResolvedValue({ days: DAYS });
    const { result, rerender } = renderHook(({ keys }) => useFareCalendars(keys, load), { initialProps: { keys: ["KHI-ISB-1", "KHI-ISB-1"] } });
    await wait(FARE_DEBOUNCE_MS);
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current("KHI-ISB-1").status).toBe("ready");
    rerender({ keys: ["KHI-ISB-1", "KHI-LHE-1"] });
    await wait(FARE_DEBOUNCE_MS);
    expect(load).toHaveBeenCalledTimes(2); // only the new route
    rerender({ keys: ["KHI-ISB-1", "KHI-ISB-1"] });
    rerender({ keys: ["KHI-ISB-1", "KHI-LHE-1"] });
    expect(result.current("KHI-LHE-1").status).toBe("loading"); // fresh again, not the old answer
    await wait(FARE_DEBOUNCE_MS);
    expect(load).toHaveBeenCalledTimes(3);
  });
});
