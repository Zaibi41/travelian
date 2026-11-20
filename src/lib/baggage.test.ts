import { describe, expect, it } from "vitest";
import cases from "./baggage-cases.json";
import {
  BAGGAGE_UNKNOWN, baggageFilterOptions, baggageText, formatBaggage, groupBaggageParts, groupBaggageText, parseBaggageText, type BaggageParts,
} from "./baggage";

// #36: the same table of cases as the gateway (travelian-api-gateway tests/baggage_cases.json).
type Case = { source: string; input: Record<string, unknown>; short: string; detail: string };

function sooperfare(policies: Record<string, unknown>[]): BaggageParts {
  // The website never reads SooperFare policies itself (the gateway does): check its short text reads back the same.
  const carry = policies.find(row => row.type === "carry");
  const checked = policies.find(row => row.type === "checked");
  const kg = (row?: Record<string, unknown>) => (typeof row?.weight_limit === "number" ? row.weight_limit : undefined);
  if (!checked) return { handKg: kg(carry) };
  const checkedKg = kg(checked);
  return checkedKg ? { handKg: kg(carry), checkedKg } : checkedKg === 0 ? { handKg: kg(carry), checkedKg: 0 } : { handKg: kg(carry), pieces: checked.pieces as number };
}

function read(test: Case): BaggageParts {
  const input = test.input as Record<string, never>;
  switch (test.source) {
    case "parts": return { handKg: input.hand_kg, checkedKg: input.checked_kg, pieces: input.pieces, pieceKg: input.piece_kg };
    case "southair": {
      // The gateway reads Southair; its fares include 7 kg hand carry when the checked text is understood.
      const checked = parseBaggageText(input.checked);
      if (!formatBaggage(strip(checked)).known) return {};
      return { ...checked, handKg: input.hand_carry ? parseBaggageText(`${input.hand_carry} hand carry`).handKg : checked.handKg ?? 7 };
    }
    case "sooperfare": return sooperfare(input.policies);
    case "group": return groupBaggageParts(input.checked, input.hand_carry);
    default: return parseBaggageText(input.text);
  }
}

const strip = (parts: BaggageParts) => Object.fromEntries(Object.entries(parts).filter(([, value]) => value !== undefined)) as BaggageParts;

describe("baggage formatter", () => {
  it.each((cases as { cases: Case[] }).cases.map(test => [`${test.source}: ${JSON.stringify(test.input).slice(0, 60)}`, test] as const))(
    "%s", (_name, test) => {
      const shown = formatBaggage(strip(read(test)));
      expect([shown.short, shown.detail]).toEqual([test.short, test.detail]);
    });

  it.each(["SUBJECT TO SUPPLIER RULES", "See supplier details", "BAG-CODE-XJ", "null", "undefined", "999KG", "", null, undefined])(
    "never shows raw supplier text: %s", raw => {
      expect(baggageText(raw).short).toBe(BAGGAGE_UNKNOWN);
    });

  it("shows the gateway's words when it sent them", () => {
    expect(baggageText("7+20 kg", "7 kg hand carry + 20 kg checked")).toMatchObject({ short: "7+20 kg", detail: "7 kg hand carry + 20 kg checked" });
    expect(groupBaggageText("20", "7", "7+20 kg", "7 kg hand carry + 20 kg checked").short).toBe("7+20 kg");
    expect(groupBaggageText("20", "7").short).toBe("7+20 kg"); // no gateway label: formatted the same way
  });

  it("builds filter options from the results, lightest first, hand carry only labelled, unknown last", () => {
    const options = baggageFilterOptions(["7+30 kg", BAGGAGE_UNKNOWN, "7+20 kg", "7 kg hand carry only, no checked bag", "7+20 kg", "7+46 kg", "7+23 kg", "7+40 kg"]
      .map(text => baggageText(text)));
    expect(options.map(option => option.label)).toEqual([
      "7 kg (hand carry only)", "7+20 kg", "7+23 kg", "7+30 kg", "7+40 kg", "7+46 kg", BAGGAGE_UNKNOWN,
    ]);
    expect(options[0].value).toBe("7 kg");
  });
});

describe("the gateway's text", () => {
  it.each((cases as { cases: { short: string; detail: string }[] }).cases.filter(test => test.short !== BAGGAGE_UNKNOWN).map(test => [test.short, test] as const))(
    "%s: shown as sent; its values read from the full words", (_name, test) => {
      const shown = baggageText(test.short, test.detail);
      expect([shown.short, shown.detail, shown.known]).toEqual([test.short, test.detail, true]);
      expect(formatBaggage(shown.parts).short).toBe(test.short); // the words carry the same values
    });

  it("'7 kg' from the gateway is hand carry only, not a checked allowance", () => {
    const shown = baggageText("7 kg", "7 kg hand carry only, no checked bag");
    expect(shown.handOnly).toBe(true);
    expect(shown.parts).toEqual({ handKg: 7, checkedKg: 0 });
  });
});
