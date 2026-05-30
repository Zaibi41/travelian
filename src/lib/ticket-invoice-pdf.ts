import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { TravelTicket } from "@/data/mock";

const LOGO_URL = "/invoice-assets/logo.jpeg";

function fullPassengerName(ticket: TravelTicket) {
  const fromParts = [ticket.title, ticket.firstName, ticket.lastName].filter(Boolean).join(" ");
  return fromParts || ticket.passengerName || "Passenger";
}

function splitPassengerName(ticket: TravelTicket) {
  if (ticket.firstName || ticket.lastName) {
    return { firstName: ticket.firstName || "", lastName: ticket.lastName || "" };
  }
  const parts = String(ticket.passengerName || "").trim().split(/\s+/);
  return { firstName: parts.slice(0, 1).join(" "), lastName: parts.slice(1).join(" ") };
}

function invoiceNumber(ticket: TravelTicket) {
  return ticket.invoiceNumber || `INV-${ticket.ticketId.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
}

function statusValue(ticket: TravelTicket) {
  if (ticket.status === "cancelled") return "cancelled";
  if (ticket.status === "pending") return "pending";
  return "confirmed";
}

function statusLabel(ticket: TravelTicket) {
  const status = statusValue(ticket);
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value?: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
}

function airportName(value?: string, fallback?: string) {
  return value || fallback || "";
}

function escapeHtml(value?: string | number) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function invoiceCss() {
  return `
    :root{--navy:#0f2a66;--amber:#e0a11a;--muted:#6b7280;--line:#e5e7eb;--surface:#f8fafc;--ok:#15803d;--ok-bg:#dcfce7;--bad:#b91c1c;--bad-bg:#fee2e2;--warn:#b45309;--warn-bg:#fef3c7;}
    *{box-sizing:border-box;}
    .travelian-invoice-stage{position:fixed;left:-10000px;top:0;width:210mm;background:#fff;color:#1f2937;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
    .page{width:210mm;max-width:100%;min-height:297mm;margin:0 auto;background:#fff;display:flex;align-items:stretch;box-shadow:0 24px 64px rgba(15,42,102,0.12),0 0 0 1px rgba(15,42,102,0.06);position:relative;border-radius:8px;overflow:hidden;}
    .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.045;width:420px;pointer-events:none;z-index:0;}
    .content{flex:1;min-width:0;min-height:0;padding:22px 26px 20px;position:relative;z-index:1;display:flex;flex-direction:column;}
    .header{display:flex;justify-content:space-between;align-items:center;gap:24px;padding-bottom:8px;border-bottom:2px solid var(--navy);margin-bottom:0;}
    .brand-box{display:flex;gap:0;align-items:center;}
    .brand{font-size:19px;font-weight:800;color:var(--navy);letter-spacing:-0.02em;}
    .title{text-align:right;align-self:center;}
    .title h1{font-size:18px;color:var(--amber);margin:0;font-weight:800;letter-spacing:0.14em;}
    .info-section{margin-top:12px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(15,42,102,0.06);}
    .info-section-head{display:flex;align-items:center;gap:10px;padding:7px 12px;background:linear-gradient(90deg,var(--surface) 0%,#fff 100%);border-bottom:1px solid var(--line);font-size:11px;font-weight:800;color:var(--navy);letter-spacing:0.06em;text-transform:uppercase;}
    .info-section-head .num{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;background:var(--navy);color:#fff;border-radius:6px;font-size:10px;}
    .info-section-head.subtle{background:#fff;color:var(--muted);font-weight:700;}
    .info-section-head.subtle::before{content:"";width:6px;height:15px;background:#ffb300;border-radius:2px;margin-right:4px;}
    .info-section-body{padding:11px 13px 12px;}
    .field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 16px;}
    .field-grid.cols-4{grid-template-columns:repeat(4,minmax(0,1fr));}
    .field .label{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;display:block;}
    .export-plain-value{display:block;width:100%;font-size:14px;font-weight:600;color:#111827;line-height:1.45;padding:2px 0;}
    .export-plain-pnr{font-size:18px;font-weight:800;color:var(--navy);letter-spacing:0.08em;}
    .export-status-pill{display:inline-flex!important;align-items:center;width:auto!important;padding:5px 12px!important;border-radius:999px;font-size:11px!important;font-weight:800!important;letter-spacing:0.06em;text-transform:uppercase;line-height:1.2;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .export-status-pill--confirmed{background:#dcfce7;color:#15803d;}
    .export-status-pill--cancelled{background:#fee2e2;color:#b91c1c;}
    .export-status-pill--pending{background:#fef3c7;color:#b45309;}
    .passenger-section .info-section-body{padding:8px 10px 9px;}
    .passenger-table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;}
    .passenger-table th,.passenger-table td{text-align:left;vertical-align:top;padding:6px 8px;}
    .passenger-table th{font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid var(--line);}
    .passenger-table td{border-bottom:1px solid #eef2f7;}
    .passenger-table tr:last-child td{border-bottom:none;}
    .passenger-table .export-plain-value{font-size:13px;}
    .flight{margin-bottom:14px;padding:11px 13px;border:1px solid var(--line);border-radius:12px;background:linear-gradient(180deg,#fbfcff 0%,#fff 45%);}
    .flight:last-child{margin-bottom:0;}
    .airline{display:flex;align-items:center;gap:0;font-size:12px;color:var(--muted);margin-bottom:10px;}
    .route-visual{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:56px;}
    .route-end{flex:0 0 auto;min-width:72px;}
    .route-end--to{text-align:right;}
    .route-end .code{font-size:22px;font-weight:800;color:var(--navy);letter-spacing:0.06em;line-height:1.15;margin-top:2px;}
    .route-end .airport-name{font-size:11px;color:var(--muted);margin-top:3px;line-height:1.2;max-width:155px;}
    .route-hint{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;font-weight:700;}
    .route-end--to .route-hint{text-align:right;}
    .route-center{flex:1;display:flex;align-items:center;min-width:0;padding:0 2px;margin-top:14px;}
    .route-line{flex:1;border-radius:1px;background:linear-gradient(90deg,#0f2a66 0%,#0f2a66 28%,#ffb300 58%,#0f2a66 100%);opacity:1;height:3px;min-width:20px;}
    .route-mid{flex-shrink:0;display:flex;flex-direction:row;align-items:center;justify-content:center;padding:0 10px;text-align:center;gap:6px;}
    .route-mid-plane{font-size:14px;line-height:1;color:var(--navy);opacity:0.72;transform:rotate(0deg);}
    .route-mid-duration{font-size:13px;font-weight:800;color:var(--navy);letter-spacing:0.02em;white-space:nowrap;margin-top:0;}
    .route-times{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:2px;}
    .route-times .time{font-size:12px;color:var(--muted);font-weight:700;}
    .route-times .time.to{text-align:right;}
    .dual-grid{display:grid;grid-template-columns:1fr;gap:14px;margin-top:14px;}
    .table-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px;}
    .table-row:last-child{border-bottom:none;}
    .table-row.total{font-weight:800;color:var(--navy);}
    .baggage-cell{display:inline-flex;align-items:center;gap:8px;font-weight:800;color:var(--navy);}
    .baggage-unit{font-size:12px;font-weight:800;color:var(--muted);letter-spacing:0.08em;user-select:none;}
    .terms-body{font-size:12px;line-height:1.55;color:#374151;padding:2px 0 4px;}
    .terms-body ul{list-style:none;margin:0;padding:0;}
    .terms-body li{position:relative;padding-left:1.15em;margin-bottom:7px;}
    .terms-body li:last-child{margin-bottom:0;}
    .terms-body li::before{content:"*";position:absolute;left:0;top:0.15em;color:#ffb300;font-weight:900;font-size:1.2em;line-height:1;}
    .terms-body strong{color:var(--navy);font-weight:800;}
    .footer{margin-top:8px;padding-top:14px;border-top:none;font-size:12px;color:var(--muted);}
    .footer-bottom{margin-top:6px;background:linear-gradient(135deg,var(--navy) 0%,#152a5c 100%);color:#fff;text-align:left;padding:7px 10px;font-size:11px;font-weight:600;line-height:1.25;border-radius:0 0 8px 8px;border:1px solid rgba(244,166,42,0.35);border-top:none;}
    .footer-bottom-contact{display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;}
    .footer-bottom-item{display:flex;align-items:center;gap:4px;white-space:nowrap;}
    .footer-bottom-label{opacity:0.8;font-size:9px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;}
  `;
}

function invoiceHtml(ticket: TravelTicket) {
  const passenger = splitPassengerName(ticket);
  const airline = `${ticket.airline || "Airline"}${ticket.flightNumber ? ` • ${ticket.flightNumber}` : ""}`;
  const status = statusValue(ticket);

  return `
    <div id="ticket" class="page">
      <img src="${LOGO_URL}" alt="" class="watermark" />
      <div class="content">
        <div class="header">
          <div class="brand-box"><div class="brand">TRAVELIAN</div></div>
          <div class="title"><h1>BOOKING INFORMATION</h1></div>
        </div>

        <div class="info-section">
          <div class="info-section-head"><span class="num">1</span> Booking details</div>
          <div class="info-section-body">
            <div class="field-grid cols-4">
              <div class="field"><span class="label">PNR</span><span class="export-plain-value export-plain-pnr">${escapeHtml(ticket.pnr || ticket.bookingId)}</span></div>
              <div class="field"><span class="label">Status</span><span class="export-plain-value export-status-pill export-status-pill--${status}">${escapeHtml(statusLabel(ticket).toUpperCase())}</span></div>
              <div class="field"><span class="label">Ticket number</span><span class="export-plain-value">${escapeHtml(ticket.ticketNumber)}</span></div>
              <div class="field"><span class="label">Airline</span><span class="export-plain-value">${escapeHtml(airline)}</span></div>
            </div>
          </div>
        </div>

        <div class="info-section passenger-section">
          <div class="info-section-head"><span class="num">2</span> Passenger details</div>
          <div class="info-section-body">
            <table class="passenger-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>First name</th>
                  <th>Last name</th>
                  <th>Passenger type</th>
                  <th>Date of birth</th>
                  <th>Passport number</th>
                  <th>Passport expiry</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span class="export-plain-value">${escapeHtml(ticket.title || "Mr")}</span></td>
                  <td><span class="export-plain-value">${escapeHtml(passenger.firstName || fullPassengerName(ticket))}</span></td>
                  <td><span class="export-plain-value">${escapeHtml(passenger.lastName)}</span></td>
                  <td><span class="export-plain-value">${escapeHtml(ticket.passengerType || "Adult")}</span></td>
                  <td><span class="export-plain-value">${escapeHtml(formatDate(ticket.dateOfBirth))}</span></td>
                  <td><span class="export-plain-value">${escapeHtml(ticket.passportNumber)}</span></td>
                  <td><span class="export-plain-value">${escapeHtml(formatDate(ticket.passportExpiry))}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="info-section">
          <div class="info-section-head"><span class="num">3</span> Flight details</div>
          <div class="info-section-body">
            <div class="flight">
              <div class="airline"><span>${escapeHtml(airline)}</span></div>
              <div class="route-visual">
                <div class="route-end route-end--from">
                  <div class="route-hint">From</div>
                  <div class="code">${escapeHtml(ticket.origin || "---")}</div>
                  <div class="airport-name">${escapeHtml(airportName(ticket.originAirport, "Departure Airport"))}</div>
                </div>
                <div class="route-center">
                  <div class="route-line"></div>
                  <div class="route-mid"><span class="route-mid-plane" aria-hidden="true">&#9992;</span></div>
                  <div class="route-line"></div>
                </div>
                <div class="route-end route-end--to">
                  <div class="route-hint">To</div>
                  <div class="code">${escapeHtml(ticket.destination || "---")}</div>
                  <div class="airport-name">${escapeHtml(airportName(ticket.destinationAirport, "Arrival Airport"))}</div>
                </div>
              </div>
              <div class="route-times">
                <div class="time">${escapeHtml(ticket.departureTime || ticket.departureDate || "")}</div>
                <div class="route-mid"><div class="route-mid-duration">${escapeHtml(ticket.duration || "")}</div></div>
                <div class="time to">${escapeHtml(ticket.arrivalTime || "")}</div>
              </div>
            </div>
          </div>
        </div>

        <div id="fareBaggageGrid" class="dual-grid">
          <div class="info-section" style="margin-top:0;">
            <div class="info-section-head subtle">Baggage</div>
            <div class="info-section-body">
              <div class="table-row"><span>Check-in</span><span class="baggage-cell"><span>${escapeHtml(ticket.checkinBaggageKg ?? 20)}</span><span class="baggage-unit">KG</span></span></div>
              <div class="table-row"><span>Cabin</span><span class="baggage-cell"><span>${escapeHtml(ticket.cabinBaggageKg ?? 7)}</span><span class="baggage-unit">KG</span></span></div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <div class="info-section-head"><span class="num">4</span> Terms &amp; conditions</div>
          <div class="info-section-body">
            <div class="terms-body">
              <ul>
                <li>Arrive at least <strong>4 hours</strong> before departure. Bring your <strong>passport</strong> and any <strong>visa</strong> or entry documents required for your destination.</li>
                <li><strong>Reconfirm</strong> your flight with the <strong>airline</strong> before you travel. <strong>Baggage</strong> limits follow the <strong>operating airline's</strong> policy (check your ticket or the airline's website).</li>
                <li>Fares are <strong>non-refundable</strong> unless your ticket says otherwise. <strong>Flight times</strong> can change; always verify the latest schedule with the airline.</li>
                <li>This e-ticket is a booking summary only; carriage is subject to the airline's rules and applicable law.</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="footer-bottom">
            <div class="footer-bottom-contact">
              <div class="footer-bottom-item"><span class="footer-bottom-label">Web</span><span>www.travelian.pk</span></div>
              <div class="footer-bottom-item"><span class="footer-bottom-label">Email</span><span>travelian.pk@gmail.com</span></div>
              <div class="footer-bottom-item"><span class="footer-bottom-label">Phone</span><span>0300-4440014 / 0324-4440014</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function imageReady(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    });
  }));
}

export async function downloadTicketInvoice(ticket: TravelTicket) {
  const stage = document.createElement("div");
  stage.className = "travelian-invoice-stage";
  stage.innerHTML = `<style>${invoiceCss()}</style>${invoiceHtml(ticket)}`;
  document.body.appendChild(stage);

  try {
    await imageReady(stage);
    const ticketElement = stage.querySelector("#ticket") as HTMLElement | null;
    if (!ticketElement) throw new Error("Invoice template could not be rendered.");

    const canvas = await html2canvas(ticketElement, {
      scale: 3,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: ticketElement.scrollWidth,
      windowHeight: ticketElement.scrollHeight,
    });

    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 7;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const ratio = canvas.height / canvas.width;
    let width = maxW;
    let height = width * ratio;
    if (height > maxH) {
      height = maxH;
      width = height / ratio;
    }
    const x = margin + (maxW - width) / 2;
    const y = margin + (maxH - height) / 2;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, width, height);
    pdf.save(`${invoiceNumber(ticket)}.pdf`);
  } finally {
    stage.remove();
  }
}
