// Identity data is masked by default (docs/spec-v3.md: "Passport, CNIC and bank
// numbers show only the last digits"; Customers table: "Passport and date of
// birth masked"). A logged reveal needs the gateway's permission check and audit
// log, which don't exist yet, so there is no reveal control (docs/backend-todo.md).
// Masking is presentation only; the API must not send full values to roles
// without the reveal permission.

const VISIBLE = 4;
const DOT = "•";

/** "PK1234567" -> "•••••4567". Short values are fully masked. Empty -> "-". */
export function maskDocumentNumber(value?: string | null, visible = VISIBLE): string {
  const text = (value ?? "").trim();
  if (!text) return "-";
  if (text.length <= visible) return DOT.repeat(text.length);
  return DOT.repeat(text.length - visible) + text.slice(-visible);
}

/** Dates of birth are hidden entirely. Empty -> "-". */
export function maskDate(value?: string | null): string {
  return (value ?? "").trim() ? `${DOT}${DOT} ${DOT}${DOT}${DOT} ${DOT}${DOT}${DOT}${DOT}` : "-";
}

/** Search matches only the visible part of a masked number (its last digits). */
export function matchesMaskedDocument(value: string | null | undefined, term: string, visible = VISIBLE): boolean {
  const query = term.trim().toLowerCase();
  const tail = (value ?? "").trim().slice(-visible).toLowerCase();
  return !!query && query.length <= visible && tail.includes(query);
}
