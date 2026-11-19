// Sends the customer to a hosted payment page (PayFast) by posting the checkout form the gateway prepared
// (POST /v1/public/bookings/{reference}/payments/payfast). The old Lambda PayFast session is gone (B14).

export interface HostedPaymentForm {
  method?: "POST";
  action: string;
  fields: Record<string, string | number | boolean | null | undefined>;
}

export function submitHostedPayment(session: HostedPaymentForm) {
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
