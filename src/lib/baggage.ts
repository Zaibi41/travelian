// Baggage, one way everywhere (#36). The gateway formats baggage (app/services/baggage.py) and sends
// `baggage` (short) and `baggage_detail` (full words); this file shows those, and formats the same way for
// data that has no gateway text (older bookings, group listings). src/lib/baggage-cases.json is the same table
// of cases the gateway tests use, so the two cannot drift.
//
// Short, hand carry first: "7 kg" (hand carry only) · "7+20 kg" · "7+1×23 kg" · "7 kg + 1 pc"
// Full words: "7 kg hand carry + 20 kg checked" · "7 kg hand carry only, no checked bag"
// Unknown: "Baggage: check with airline". Never a raw supplier code, never an assumed hand carry.

export const BAGGAGE_UNKNOWN = "Baggage: check with airline";
const MAX_KG = 100;

/** handKg: hand carry. Checked is a total weight (checkedKg) or pieces (pieces, optionally pieceKg each).
 *  0 checked kg or 0 pieces = no checked bag; undefined = not known. */
export interface BaggageParts {
  handKg?: number;
  checkedKg?: number;
  pieces?: number;
  pieceKg?: number;
}

export interface BaggageText {
  /** Short form for cards, tables and filters. */
  short: string;
  /** Full words for tooltips and expanded details. */
  detail: string;
  known: boolean;
  /** Hand carry only, no checked bag ("7 kg"). */
  handOnly: boolean;
  /** For sorting filter options: checked kg (pieces count as their weight, or 0). */
  sortKey: number;
  /** The values behind the text (empty when not known). */
  parts: BaggageParts;
}

const has = (value: number | undefined): value is number => value !== undefined;

export function formatBaggage(parts: BaggageParts): BaggageText {
  const { handKg, checkedKg, pieces, pieceKg } = parts;
  const known = has(handKg) || has(checkedKg) || has(pieces);
  const noChecked = checkedKg === 0 || pieces === 0;
  const hand = handKg ? handKg : undefined;
  const withPieces = !!pieces && !checkedKg;
  const sortKey = checkedKg ?? (pieces ? pieces * (pieceKg ?? 0) : 0);
  if (!known) return { short: BAGGAGE_UNKNOWN, detail: BAGGAGE_UNKNOWN, known, handOnly: false, sortKey, parts };

  let short: string;
  if (withPieces) {
    const piece = pieceKg ? `${pieces}×${pieceKg} kg` : `${pieces} pc`;
    short = hand === undefined ? `${piece} checked` : pieceKg ? `${hand}+${piece}` : `${hand} kg + ${piece}`;
  } else if (checkedKg) {
    short = hand !== undefined ? `${hand}+${checkedKg} kg` : `${checkedKg} kg checked`;
  } else if (hand !== undefined) {
    short = noChecked ? `${hand} kg` : `${hand} kg hand carry`;
  } else {
    short = noChecked ? "No checked bag" : BAGGAGE_UNKNOWN;
  }

  const handWords = hand !== undefined ? `${hand} kg hand carry` : undefined;
  let checkedWords: string | undefined;
  if (withPieces) {
    const noun = pieces === 1 ? "piece" : "pieces";
    checkedWords = `${pieces} checked ${noun}${pieceKg ? ` of up to ${pieceKg} kg${pieces! > 1 ? " each" : ""}` : ""}`;
  } else if (checkedKg) {
    checkedWords = `${checkedKg} kg checked`;
  }
  let detail: string;
  if (handWords && checkedWords) detail = `${handWords} + ${checkedWords}`;
  else if (handWords) detail = noChecked ? `${handWords} only, no checked bag` : `${handWords}; checked baggage: check with airline`;
  else if (checkedWords) detail = `${checkedWords}; hand carry: check with airline`;
  else detail = noChecked ? "No checked bag; hand carry: check with airline" : BAGGAGE_UNKNOWN;

  return { short, detail, known, handOnly: hand !== undefined && noChecked, sortKey, parts };
}

/** A weight in kg: 20, "20", "20.0", "20KG", "07". undefined when it isn't one. */
function kg(value: unknown): number | undefined {
  if (value === null || value === undefined || typeof value === "boolean") return undefined;
  const text = String(value).trim().replace(/\s*(kgs?|kilos?|kilograms?)\s*$/i, "");
  if (!/^\d+(\.0+)?$/.test(text)) return undefined;
  const number = Number(text);
  return Number.isInteger(number) && number <= MAX_KG ? number : undefined;
}

const NONE = /^(nil+|no(ne)?|0\s*(kgs?|pcs?|pieces?)?|not included)(\s+(checked|check-?in))?(\s+(baggage|bags?))?(\s+(included|allowed))?$/i;
const NO_CHECKED = /\b(no checked (baggage|bag)|checked baggage not included|nil+ baggage|no baggage)\b|^nil+\b|\b(cabin|hand)[\s-]*(bag|baggage|carry) only\b/i;
const PIECES = /(\d+)\s*(?:checked\s+)?(?:pcs?|pieces?)\b(?:\s*(?:x|×|of(?: up to)?|@)?\s*(\d+)\s*kgs?)?/i;
const TIMES = /(\d+)\s*[x×]\s*(\d+)\s*kgs?/i;
const HAND = /(\d+)\s*kgs?\s*(?:hand[\s-]*carry|hand[\s-]*bag(?:gage)?|cabin(?:\s+bag(?:gage)?)?|carry[\s-]*on)/i;
const CHECKED = /(\d+)\s*kgs?\s*(?:checked|check-?in)/i;
const PLUS = /^(\d+)\s*\+\s*(\d+)\s*kgs?$/i;
const PLUS_PIECES = /^(\d+)\s*\+\s*(\d+)\s*[x×]\s*(\d+)\s*kgs?$/i;
const HAND_PLUS_PC = /^(\d+)\s*kgs?\s*\+\s*(\d+)\s*pcs?$/i;
const WEIGHT = /^(\d+)\s*kgs?$/i;
const EMPTY = new Set(["null", "undefined", "n/a", "na", "-", BAGGAGE_UNKNOWN.toLowerCase(), "baggage info not available"]);

/** Baggage from text: the gateway's short form, supplier text ("20KG", "Nill Baggage", "1PC", "2PC 23KG") and what
 *  earlier versions stored ("20 kg checked, 7 kg hand carry"). Anything else is unknown. */
export function parseBaggageText(text: unknown): BaggageParts {
  const value = String(text ?? "").replace(/\s+/g, " ").trim().replace(/^\.+|\.+$/g, "");
  if (!value || EMPTY.has(value.toLowerCase())) return {};
  let match: RegExpMatchArray | null;
  if ((match = value.match(PLUS_PIECES))) return { handKg: kg(match[1]), pieces: Number(match[2]), pieceKg: kg(match[3]) };
  if ((match = value.match(HAND_PLUS_PC))) return { handKg: kg(match[1]), pieces: Number(match[2]) };
  if ((match = value.match(PLUS))) return { handKg: kg(match[1]), checkedKg: kg(match[2]) };
  const hand = value.match(HAND);
  const handKg = hand ? kg(hand[1]) : undefined;
  if (NONE.test(value) || NO_CHECKED.test(value)) return { handKg, checkedKg: 0 };
  if ((match = value.match(TIMES))) return { handKg, pieces: Number(match[1]), pieceKg: kg(match[2]) };
  if ((match = value.match(PIECES))) return { handKg, pieces: Number(match[1]), pieceKg: match[2] ? kg(match[2]) : undefined };
  if ((match = value.match(CHECKED))) return { handKg, checkedKg: kg(match[1]) };
  if (handKg !== undefined) return { handKg };
  if ((match = value.match(WEIGHT))) return { checkedKg: kg(match[1]) };
  return {};
}

/** Group fares: checked and hand carry as the supplier sends them ("20", 20, "20 KG", "1PC"; hand "7", "07"). */
export function groupBaggageParts(checked: unknown, handCarry: unknown): BaggageParts {
  const handKg = kg(handCarry) || undefined;
  const checkedKg = kg(checked);
  if (checkedKg === undefined && checked !== null && checked !== undefined && checked !== "") {
    const parsed = parseBaggageText(checked);
    return { ...parsed, handKg: handKg ?? parsed.handKg };
  }
  return { handKg, checkedKg };
}

const clean = (parts: BaggageParts): BaggageParts =>
  Object.fromEntries(Object.entries(parts).filter(([, value]) => value !== undefined)) as BaggageParts;

/** Baggage text to show. Uses the gateway's `baggage` / `baggage_detail` when given; otherwise formats `text`. */
export function baggageText(text: unknown, detail?: string | null): BaggageText {
  if (typeof text === "string" && text.trim() && detail && detail.trim()) {
    // The gateway already formatted it: show its text as sent (e.g. a round trip's "7+20 kg / 7+30 kg"). The values
    // come from the full words, which can't be misread ("7 kg" alone could be a supplier's checked allowance).
    const fromWords = formatBaggage(clean(parseBaggageText(detail)));
    return { ...fromWords, short: text.trim(), detail: detail.trim(), known: text.trim() !== BAGGAGE_UNKNOWN };
  }
  return formatBaggage(clean(parseBaggageText(text)));
}

/** Group baggage to show: the gateway's label when sent, else formatted from checked + hand carry. */
export function groupBaggageText(checked: unknown, handCarry: unknown, label?: string | null, detail?: string | null): BaggageText {
  if (label && detail) return baggageText(label, detail);
  return formatBaggage(clean(groupBaggageParts(checked, handCarry)));
}

/** Filter label: the short form, with "(hand carry only)" when there is no checked bag. */
export const baggageFilterLabel = (baggage: BaggageText) => (baggage.handOnly ? `${baggage.short} (hand carry only)` : baggage.short);

/** Filter options from the fares in the results: hand carry only, then hand carry + checked by checked weight
 *  ("7+20 kg", "7+23 kg", ...), then checked only (no hand-carry value from the supplier), then unknown. */
export function baggageFilterOptions(values: BaggageText[]): { value: string; label: string }[] {
  const seen = new Map<string, BaggageText>();
  for (const value of values) if (!seen.has(value.short)) seen.set(value.short, value);
  const group = (value: BaggageText) => (!value.known ? 3 : value.handOnly ? 0 : value.parts.handKg ? 1 : 2);
  return [...seen.values()]
    .sort((a, b) => group(a) - group(b) || a.sortKey - b.sortKey || (a.parts.handKg ?? 0) - (b.parts.handKg ?? 0) || a.short.localeCompare(b.short))
    .map(value => ({ value: value.short, label: baggageFilterLabel(value) }));
}

/** For a value shown next to a "Baggage" label: "Check with airline" instead of repeating "Baggage:". */
export const underBaggageLabel = (text: string) => (text === BAGGAGE_UNKNOWN ? "Check with airline" : text);

/** Hand carry alone, for a "Hand carry" box: "7 kg", or "Check with airline". */
export const handCarryText = ({ parts }: BaggageText) => (parts.handKg ? `${parts.handKg} kg` : "Check with airline");

/** Checked baggage alone, for a "Checked baggage" box: "20 kg", "1×23 kg", "1 pc", "No checked bag" or "Check with airline". */
export function checkedText({ parts }: BaggageText) {
  if (parts.checkedKg) return `${parts.checkedKg} kg`;
  if (parts.pieces) return parts.pieceKg ? `${parts.pieces}×${parts.pieceKg} kg` : `${parts.pieces} pc`;
  if (parts.checkedKg === 0 || parts.pieces === 0) return "No checked bag";
  return "Check with airline";
}
