import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { TravelTicket } from "@/data/mock";

function fullPassengerName(ticket: TravelTicket) {
  return [ticket.title, ticket.firstName, ticket.lastName].filter(Boolean).join(" ")
    || ticket.passengerName
    || "Passenger";
}

function invoiceNumber(ticket: TravelTicket) {
  return ticket.invoiceNumber || `INV-${ticket.ticketId.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
}

function formatDate(value?: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
}

function formatCurrency(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return `PKR ${value.toLocaleString("en-PK")}`;
}

function escapeHtml(value?: string | number) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function optionalInfo(label: string, value?: string) {
  if (!value) return "";
  const className = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `
    <div class="info-item info-${className}">
      <div class="info-label">${escapeHtml(label)}</div>
      <div class="info-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function optionalSideInfo(label: string, value?: string) {
  if (!value) return "";
  return `
    <div>
      <div class="label">${escapeHtml(label)}</div>
      <div class="value-med">${escapeHtml(value)}</div>
    </div>
  `;
}

function optionalFare(label: string, value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return `<div class="fare-line"><span>${escapeHtml(label)}</span><strong>${escapeHtml(formatCurrency(value))}</strong></div>`;
}

function totalFare(ticket: TravelTicket) {
  const baseFare = Number(ticket.baseFare || 0);
  const tax = Number(ticket.tax || 0);
  return baseFare || tax ? baseFare + tax : Number(ticket.price || 0);
}

function icon(name: "plane" | "user" | "fare" | "briefcase" | "info" | "calendar" | "clock" | "phone" | "mail" | "globe" | "carryOn") {
  const paths = {
    plane: '<path d="M21.7 16.2v-2.1l-8.2-5V3.7a1.5 1.5 0 0 0-3 0v5.4l-8.2 5v2.1l8.2-2.6v4.9l-2.1 1.6v1.6l3.6-1 3.6 1v-1.6l-2.1-1.6v-4.9z"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    fare: '<path d="M12 2v20"/><path d="M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    briefcase: '<rect width="18" height="14" x="3" y="6" rx="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/><path d="M10 12v2h4v-2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20"/><path d="M12 2a15 15 0 0 0 0 20"/>',
    carryOn: '<rect width="14" height="18" x="5" y="3" rx="2"/><path d="M9 3V1h6v2"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h6"/>',
  };
  return `<svg class="icon icon-${name}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function invoiceCss() {
  return `
    :root{--navy:#061f52;--teal:#007d82;--gold:#c99319;--text:#243147;--muted:#68758a;--line:#d8dee8;--white:#fff;}
    *{box-sizing:border-box;}
    .travelian-invoice-stage{position:fixed;left:-10000px;top:0;width:210mm;background:#fff;color:var(--text);font-family:Arial,Helvetica,sans-serif;}
    .ticket-page{width:210mm;min-height:297mm;margin:0;background:var(--white);border:8px solid var(--navy);padding:20px 24px 0;color:var(--text);overflow:hidden;}
    .header{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:24px;align-items:center;border-bottom:1.5px solid var(--navy);padding-bottom:18px;margin-bottom:20px;}
    .brand{display:flex;align-items:center;gap:16px;}
    .logo{width:72px;height:72px;border:3px solid var(--navy);border-radius:50%;display:flex;justify-content:center;align-items:center;position:relative;color:var(--navy);font-family:Georgia,serif;font-size:45px;font-weight:800;overflow:hidden;}
    .logo::before{content:"";position:absolute;inset:10px;border-radius:50%;border:1px solid #d4dae4;}
    .brand-name{font-family:Georgia,serif;font-size:44px;font-weight:800;color:var(--navy);line-height:.95;}
    .brand-name span{color:var(--teal);}
    .tagline{margin-top:8px;font-size:11px;letter-spacing:2.2px;white-space:nowrap;text-transform:uppercase;color:var(--teal);}
    .doc-title{font-size:20px;max-width:310px;line-height:1.15;font-weight:900;color:var(--navy);text-transform:uppercase;text-align:right;align-self:center;}
    .section-title{display:flex;align-items:center;gap:12px;margin:19px 0 13px;}
    .icon{display:block;width:20px;height:20px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.9;}
    .icon-plane{fill:currentColor;stroke:none;}
    .section-icon{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--teal),#00565d);color:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
    .section-icon .icon{width:20px;height:20px;}
    .section-title h2{margin:0;color:var(--navy);font-size:20px;line-height:1;text-transform:uppercase;white-space:nowrap;}
    .title-line{flex:1;height:1px;background:var(--line);}
    .pnr{margin-left:auto;font-size:20px;font-weight:900;color:var(--navy);white-space:nowrap;}
    .pnr span{color:var(--teal);}
    .card{border:1.5px solid var(--line);border-radius:10px;background:#fff;padding:18px 20px;}
    .flight-card{display:grid;grid-template-columns:132px minmax(0,1fr) minmax(0,1fr) 150px;gap:14px;align-items:stretch;}
    .flight-card>div{border-right:1px solid var(--line);padding-right:12px;}
    .flight-card>div:last-child{border-right:0;padding-right:0;}
    .label{color:var(--teal);font-weight:900;font-size:13px;text-transform:uppercase;margin-bottom:10px;}
    .value-large{font-size:28px;font-weight:900;color:var(--navy);line-height:1.1;}
    .value-med{font-size:21px;font-weight:900;color:var(--navy);line-height:1.2;}
    .small{font-size:12px;line-height:1.42;}
    .muted{color:var(--muted);}
    .dash{border-top:1px dashed #b9c3d2;margin:16px 0;}
    .route-wrap{position:relative;}
    .route-plane{position:absolute;left:100%;top:110px;transform:translateX(-50%);display:flex;align-items:center;color:var(--navy);z-index:2;}
    .route-plane .icon{width:32px;height:32px;flex:0 0 auto;transform:rotate(90deg);}
    .route-plane::before,.route-plane::after{content:"";display:block;width:34px;border-top:1px dashed #8794aa;margin:0 7px;}
    .airport-name{max-width:145px;min-height:34px;padding-right:4px;color:var(--muted);overflow-wrap:anywhere;}
    .date-time{margin-top:54px;display:grid;grid-template-columns:18px minmax(0,1fr);align-items:center;column-gap:9px;min-height:22px;}
    .date-time+.date-time{margin-top:14px;}
    .mini-icon{color:var(--teal);width:18px;display:inline-block;flex:0 0 auto;}
    .mini-icon .icon{width:16px;height:16px;stroke-width:2.2;}
    .date-time>div{display:flex;min-height:22px;flex-direction:column;justify-content:center;}
    .date-time b{display:block;line-height:1;}
    .date-time .small{display:block;margin-top:8px;line-height:1;}
    .side-stack{display:grid;gap:16px;align-content:start;}
    .side-stack .value-med{overflow-wrap:normal;word-break:normal;}
    .side-stack>div:last-child .value-med{font-size:18px;white-space:nowrap;}
    .info-row{display:flex;padding:0;}
    .info-item{min-width:0;flex:1;border-right:1px solid var(--line);padding:14px 12px;min-height:74px;}
    .info-item:last-child{border-right:0;}
    .info-label{color:var(--teal);font-size:11px;font-weight:900;text-transform:uppercase;margin-bottom:9px;}
    .info-value{color:var(--navy);font-weight:900;font-size:12.5px;line-height:1.35;overflow-wrap:anywhere;word-break:normal;}
    .info-contact-number .info-value,.info-email .info-value{font-size:11.5px;white-space:nowrap;overflow-wrap:normal;}
    .fare-table{border:1.5px solid var(--line);border-radius:10px;overflow:hidden;background:#fff;}
    .fare-head{background:var(--navy);color:#fff;padding:12px 15px;text-transform:uppercase;font-weight:900;font-size:14px;}
    .fare-line{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding:11px 15px;font-size:13px;}
    .fare-total{display:flex;justify-content:space-between;gap:12px;padding:14px 15px;font-weight:900;color:var(--navy);font-size:18px;}
    .baggage-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));max-width:430px;padding:0;}
    .baggage-item{display:flex;min-width:0;align-items:center;gap:14px;padding:14px 16px;border-right:1px solid var(--line);}
    .baggage-item:last-child{border-right:0;}
    .bag-icon{color:var(--teal);flex:0 0 auto;}
    .bag-icon .icon{width:28px;height:28px;stroke-width:2;}
    .baggage-copy{min-width:0;}
    .baggage-copy .info-label{white-space:nowrap;}
    .important-list{list-style:none;margin:0;padding:0;display:grid;gap:12px;}
    .important-list li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:12px;align-items:center;min-height:22px;font-size:13px;line-height:1.45;}
    .num{width:22px;height:22px;border-radius:50%;background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center;padding-top:1px;font-weight:900;font-size:12px;line-height:1;flex:0 0 auto;}
    .thanks{margin:18px 0 20px;display:grid;grid-template-columns:minmax(72px,1fr) auto minmax(72px,1fr);align-items:center;gap:20px;color:var(--teal);font-family:Georgia,serif;font-style:italic;font-size:20px;}
    .thanks::before,.thanks::after{content:"";height:1px;background:var(--teal);}
    .thanks span{white-space:nowrap;text-align:center;}
    .footer{margin:0 -24px;background:var(--navy);color:#fff;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:center;padding:14px 24px;font-size:13px;}
    .footer-item{display:flex;min-width:0;min-height:28px;justify-content:center;align-items:center;gap:9px;white-space:nowrap;border-right:1px solid rgba(255,255,255,.45);}
    .footer-item:last-child{border-right:0;}
    .footer-icon{width:28px;height:28px;border:1px solid rgba(255,255,255,.65);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;}
    .footer-icon .icon{width:15px;height:15px;stroke-width:1.8;}
  `;
}

function invoiceHtml(ticket: TravelTicket) {
  const passengerName = fullPassengerName(ticket);
  const status = ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1);
  const fareRows = `${optionalFare("Base Fare", ticket.baseFare)}${optionalFare("Taxes & Fees", ticket.tax)}`;
  const extraNote = ticket.notes
    ? `<li><span class="num">3</span><span>${escapeHtml(ticket.notes)}</span></li>`
    : "";

  return `
    <div id="ticket" class="ticket-page">
      <div>
        <header class="header">
          <div class="brand">
            <div class="logo">T</div>
            <div>
              <div class="brand-name">Travelian<span>.</span></div>
              <div class="tagline">Your Trusted Travel Partner</div>
            </div>
          </div>
          <div class="doc-title">E-Ticket Receipt &amp; Itinerary</div>
        </header>

        <div class="section-title">
          <div class="section-icon">${icon("plane")}</div>
          <h2>Flight Information</h2>
          <div class="title-line"></div>
          <div class="pnr">PNR: <span>${escapeHtml(ticket.pnr || ticket.bookingId)}</span></div>
        </div>

        <div class="card flight-card">
          <div>
            <div class="label">Flight</div>
            <div class="value-large">${escapeHtml(ticket.flightNumber || "Not specified")}</div>
            <div class="dash"></div>
            <div class="label muted">Operated By</div>
            <div class="small">${escapeHtml(ticket.airline || "Not specified")}</div>
          </div>

          <div class="route-wrap">
            <div class="label">Departure</div>
            <div class="small">${escapeHtml(ticket.origin)}</div>
            <div class="value-med">${escapeHtml(ticket.origin)}</div>
            <div class="small airport-name">${escapeHtml(ticket.originAirport || "")}</div>
            <div class="route-plane">${icon("plane")}</div>
            <div class="date-time"><span class="mini-icon">${icon("calendar")}</span><div><b>${escapeHtml(formatDate(ticket.departureDate))}</b></div></div>
            <div class="date-time"><span class="mini-icon">${icon("clock")}</span><div><b>${escapeHtml(ticket.departureTime || "")}</b><br><span class="small">Local Time</span></div></div>
          </div>

          <div>
            <div class="label">Arrival</div>
            <div class="small">${escapeHtml(ticket.destination)}</div>
            <div class="value-med">${escapeHtml(ticket.destination)}</div>
            <div class="small airport-name">${escapeHtml(ticket.destinationAirport || "")}</div>
            <div class="date-time"><span class="mini-icon">${icon("calendar")}</span><div><b>${escapeHtml(formatDate(ticket.departureDate))}</b></div></div>
            <div class="date-time"><span class="mini-icon">${icon("clock")}</span><div><b>${escapeHtml(ticket.arrivalTime || "")}</b><br><span class="small">Local Time</span></div></div>
          </div>

          <div class="side-stack">
            ${optionalSideInfo("Duration", ticket.duration)}
            ${optionalSideInfo("Status", status)}
            ${optionalSideInfo("Invoice", invoiceNumber(ticket))}
          </div>
        </div>

        <div class="section-title">
          <div class="section-icon">${icon("user")}</div>
          <h2>Passenger Details</h2>
          <div class="title-line"></div>
        </div>
        <div class="card info-row">
          ${optionalInfo("Name", passengerName)}
          ${optionalInfo("Passport Number", ticket.passportNumber)}
          ${optionalInfo("Seat Number", ticket.seatNumber)}
          ${optionalInfo("Contact Number", ticket.customerPhone)}
          ${optionalInfo("Email", ticket.customerEmail)}
        </div>

        <div class="section-title">
          <div class="section-icon">${icon("fare")}</div>
          <h2>Fare Details</h2>
          <div class="title-line"></div>
        </div>
        <div class="fare-table">
          <div class="fare-head">Payment Summary</div>
          ${fareRows}
          <div class="fare-total"><span>Total Amount</span><span>${escapeHtml(formatCurrency(totalFare(ticket)))}</span></div>
        </div>

        <div class="section-title">
          <div class="section-icon">${icon("briefcase")}</div>
          <h2>Baggage Information</h2>
          <div class="title-line"></div>
        </div>
        <div class="card baggage-row">
          <div class="baggage-item">
            <div class="bag-icon">${icon("briefcase")}</div>
            <div class="baggage-copy"><div class="info-label">Checked Baggage</div><div class="value-med">${ticket.checkinBaggageKg == null ? "Not specified" : `${escapeHtml(ticket.checkinBaggageKg)} KG`}</div></div>
          </div>
          <div class="baggage-item">
            <div class="bag-icon">${icon("carryOn")}</div>
            <div class="baggage-copy"><div class="info-label">Cabin Baggage</div><div class="value-med">${ticket.cabinBaggageKg == null ? "Not specified" : `${escapeHtml(ticket.cabinBaggageKg)} KG`}</div></div>
          </div>
        </div>

        <div class="section-title">
          <div class="section-icon">${icon("info")}</div>
          <h2>Important Information</h2>
          <div class="title-line"></div>
        </div>
        <div class="card">
          <ul class="important-list">
            <li><span class="num">1</span><span>Reach the airport at least 4 hours before the departure time.</span></li>
            <li><span class="num">2</span><span>Flight schedule is subject to airline confirmation. Reconfirm your flight before departure.</span></li>
            ${extraNote}
          </ul>
        </div>
      </div>

      <div class="thanks"><span>Thank you for choosing Travelian.</span></div>
      <footer class="footer">
        <div class="footer-item"><span class="footer-icon">${icon("phone")}</span> +92 324 4440014</div>
        <div class="footer-item"><span class="footer-icon">${icon("mail")}</span> travelian.pk@gmail.com</div>
        <div class="footer-item"><span class="footer-icon">${icon("globe")}</span> www.travelian.pk</div>
      </footer>
    </div>
  `;
}

export function renderTicketInvoicePreview(ticket: TravelTicket) {
  return `<style>${invoiceCss()}</style>${invoiceHtml(ticket)}`;
}

async function imagesReady(root: HTMLElement) {
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
  stage.innerHTML = renderTicketInvoicePreview(ticket);
  document.body.appendChild(stage);

  try {
    await imagesReady(stage);
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
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
    pdf.save(`${invoiceNumber(ticket)}.pdf`);
  } finally {
    stage.remove();
  }
}
