const API_BASE_URL = (import.meta.env.VITE_TRAVELIAN_API_BASE_URL || "https://api.travelian.pk").replace(/\/$/, "");

export interface PayFastSessionInput {
  bookingId: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  description: string;
  method: "card" | "1link";
  successUrl: string;
  failureUrl: string;
}

export interface PayFastSession {
  provider: "payfast";
  paymentId: string;
  bookingId: string;
  basketId: string;
  method: "POST";
  action: string;
  fields: Record<string, string | number | boolean | null | undefined>;
}

export async function createPayFastSession(input: PayFastSessionInput): Promise<PayFastSession> {
  const response = await fetch(`${API_BASE_URL}/payments/payfast/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to start online payment");
  }
  return payload.item;
}

export function submitHostedPayment(session: PayFastSession) {
  const form = document.createElement("form");
  form.method = session.method || "POST";
  form.action = session.action;
  form.style.display = "none";

  for (const [name, value] of Object.entries(session.fields || {})) {
    if (value === undefined || value === null) continue;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
