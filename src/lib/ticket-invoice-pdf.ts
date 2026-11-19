import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { TravelTicket } from "@/data/models";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from "@/lib/site-config";

type InvoiceIcon =
  | "plane"
  | "user"
  | "briefcase"
  | "info"
  | "calendar"
  | "clock"
  | "phone"
  | "mail"
  | "globe"
  | "carryOn"
  | "passport"
  | "seat";

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

function weekday(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
}

function escapeHtml(value?: string | number) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function icon(name: InvoiceIcon, className = "") {
  const paths: Record<InvoiceIcon, string> = {
    plane: '<path d="M21.7 16.2v-2.1l-8.2-5V3.7a1.5 1.5 0 0 0-3 0v5.4l-8.2 5v2.1l8.2-2.6v4.9l-2.1 1.6v1.6l3.6-1 3.6 1v-1.6l-2.1-1.6v-4.9z"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    briefcase: '<rect width="18" height="14" x="3" y="6" rx="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/><path d="M10 12v2h4v-2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20"/><path d="M12 2a15 15 0 0 0 0 20"/>',
    carryOn: '<rect width="14" height="18" x="5" y="3" rx="2"/><path d="M9 3V1h6v2"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h6"/>',
    passport: '<rect width="15" height="20" x="4.5" y="2" rx="1.5"/><circle cx="12" cy="10" r="3"/><path d="M9 10h6"/><path d="M12 7a5 5 0 0 1 0 6"/><path d="M12 7a5 5 0 0 0 0 6"/><path d="M8 17h8"/>',
    seat: '<path d="M8 3v8a3 3 0 0 0 3 3h5"/><path d="M6 3a2 2 0 0 0-2 2v8a6 6 0 0 0 6 6h6"/><path d="M16 12v9"/><path d="M12 7h4a2 2 0 0 1 2 2v3"/>',
  };
  return `<svg class="icon icon-${name} ${className}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function routePlane() {
  return `
    <svg class="route-plane-icon" viewBox="0 0 24 24" aria-hidden="true">
      <g transform="rotate(90 12 12)">
        <path d="M21.7 16.2v-2.1l-8.2-5V3.7a1.5 1.5 0 0 0-3 0v5.4l-8.2 5v2.1l8.2-2.6v4.9l-2.1 1.6v1.6l3.6-1 3.6 1v-1.6l-2.1-1.6v-4.9z"/>
      </g>
    </svg>
  `;
}

function logoMark() {
  return `
    <svg class="logo-mark" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#061f52" stroke-width="2.4"/>
      <circle cx="50" cy="50" r="34" fill="none" stroke="#d8dee8" stroke-width="1"/>
      <path d="M15 69h70" stroke="#007d82" stroke-width="1.5"/>
      <text x="50" y="63" text-anchor="middle" fill="#061f52" font-family="Georgia,serif" font-size="56" font-weight="700">T</text>
      <g transform="translate(43 66) rotate(90 7 7)" fill="#007d82">
        <path d="M14.8 9.5V8.2l-5.5-3.4V1.3a1 1 0 0 0-2 0v3.5L1.8 8.2v1.3l5.5-1.7V11l-1.4 1v1.1l2.4-.7 2.4.7V12l-1.4-1V7.8z"/>
      </g>
    </svg>
  `;
}

function sectionTitle(title: string, iconName: InvoiceIcon, trailing = "") {
  return `
    <div class="section-title">
      <div class="section-icon">${icon(iconName)}</div>
      <h2>${escapeHtml(title)}</h2>
      <div class="title-line"></div>
      ${trailing}
    </div>
  `;
}

function passengerInfo(label: string, value: string | undefined, iconName: InvoiceIcon) {
  const className = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `
    <div class="passenger-item passenger-${className}">
      <div class="passenger-icon">${icon(iconName)}</div>
      <div class="passenger-copy">
        <div class="info-label">${escapeHtml(label)}</div>
        <div class="info-value">${escapeHtml(value || "Not specified")}</div>
      </div>
    </div>
  `;
}

function schedule(iconName: "calendar" | "clock", primary?: string, secondary?: string) {
  return `
    <div class="schedule">
      <span class="schedule-icon">${icon(iconName)}</span>
      <div>
        <b>${escapeHtml(primary || "Not specified")}</b>
        ${secondary ? `<span>${escapeHtml(secondary)}</span>` : ""}
      </div>
    </div>
  `;
}

function sideInfo(label: string, value?: string) {
  if (!value) return "";
  return `
    <div class="side-info">
      <div class="label">${escapeHtml(label)}</div>
      <div class="side-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function invoiceCss() {
  return `
    :root{--navy:#061f52;--teal:#007d82;--text:#172b4d;--muted:#52637c;--line:#cfd7e3;--white:#fff;}
    *{box-sizing:border-box;}
    .travelian-invoice-stage{position:fixed;left:-10000px;top:0;width:210mm;background:#fff;color:var(--text);font-family:Arial,Helvetica,sans-serif;}
    .ticket-page{display:flex;flex-direction:column;width:210mm;min-height:297mm;margin:0;background:#fff;border:8px solid var(--navy);padding:22px 24px 0;color:var(--text);overflow:hidden;}
    .header{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:18px;align-items:center;border-bottom:1.5px solid var(--navy);padding-bottom:15px;margin-bottom:18px;}
    .brand{display:flex;align-items:center;gap:18px;min-width:0;}
    .logo-mark{display:block;width:100px;height:100px;flex:0 0 auto;}
    .brand-name{font-family:Georgia,serif;font-size:54px;font-weight:800;color:var(--navy);line-height:.92;white-space:nowrap;}
    .brand-name span{color:var(--teal);}
    .tagline{margin-top:11px;color:var(--teal);font-size:11px;letter-spacing:2.5px;text-transform:uppercase;white-space:nowrap;}
    .doc-title{color:var(--navy);font-size:20px;font-weight:900;line-height:1.15;text-align:right;text-transform:uppercase;}
    .section-title{display:flex;align-items:center;gap:14px;margin:14px 0 10px;}
    .section-title h2{margin:0;color:var(--navy);font-size:20px;font-weight:500;line-height:1;text-transform:uppercase;white-space:nowrap;}
    .section-icon{display:flex;width:42px;height:42px;flex:0 0 auto;align-items:center;justify-content:center;border-radius:50%;background:var(--teal);color:#fff;}
    .title-line{height:1px;flex:1;background:var(--navy);opacity:.62;}
    .pnr{color:var(--navy);font-size:20px;font-weight:900;white-space:nowrap;}
    .pnr span{color:var(--teal);}
    .icon{display:block;width:20px;height:20px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.9;}
    .icon-plane{fill:currentColor;stroke:none;}
    .card{border:1.3px solid var(--line);border-radius:11px;background:#fff;}
    .flight-card{display:grid;grid-template-columns:130px minmax(0,1fr) minmax(0,1fr) 140px;min-height:270px;padding:18px 16px;}
    .flight-column{min-width:0;padding:0 13px;border-right:1px solid var(--line);}
    .flight-column:first-child{padding-left:0;}
    .flight-column:last-child{border-right:0;padding-right:0;}
    .arrival-column{padding-left:31px;}
    .label,.info-label{color:var(--teal);font-size:11px;font-weight:900;line-height:1.25;text-transform:uppercase;}
    .flight-number{margin-top:34px;color:var(--navy);font-size:28px;font-weight:900;line-height:1.05;}
    .dash{border-top:1px dashed #b7c1d0;margin:20px 0;}
    .airline{color:var(--text);font-size:12px;line-height:1.55;overflow-wrap:anywhere;}
    .route-column{position:relative;}
    .airport-code{margin-top:31px;color:var(--navy);font-size:16px;font-weight:900;}
    .airport-city{margin-top:5px;color:var(--navy);font-size:25px;font-weight:900;line-height:1;}
    .airport-name{min-height:34px;margin-top:8px;color:var(--text);font-size:10px;line-height:1.35;overflow-wrap:anywhere;}
    .route-plane{position:absolute;right:-30px;top:65px;z-index:2;display:flex;align-items:center;color:var(--navy);}
    .route-plane::before,.route-plane::after{display:block;width:16px;border-top:1px dashed #8190a7;content:"";}
    .route-plane-icon{display:block;width:38px;height:38px;fill:currentColor;}
    .schedule-stack{display:grid;gap:16px;margin-top:24px;}
    .schedule{display:grid;grid-template-columns:25px minmax(0,1fr);gap:9px;align-items:start;min-height:26px;}
    .schedule-icon{color:var(--teal);}
    .schedule-icon .icon{width:20px;height:20px;stroke-width:2;}
    .schedule b{display:block;color:var(--navy);font-size:16px;line-height:1.1;}
    .schedule span{display:block;margin-top:7px;color:var(--text);font-size:11px;line-height:1.05;}
    .side-stack{display:grid;align-content:start;gap:0;}
    .side-info{padding:0 0 20px;margin:0 0 18px;border-bottom:1px dashed #b7c1d0;}
    .side-info:last-child{margin-bottom:0;border-bottom:0;}
    .side-value{margin-top:12px;color:var(--navy);font-size:19px;font-weight:900;line-height:1.18;text-transform:uppercase;overflow-wrap:normal;}
    .passenger-card{display:grid;grid-template-columns:1.15fr 1fr .9fr 1.14fr 1.34fr;padding:0;}
    .passenger-item{display:flex;min-width:0;gap:9px;align-items:flex-start;padding:15px 11px;border-right:1px solid var(--line);}
    .passenger-item:last-child{border-right:0;}
    .passenger-icon{flex:0 0 auto;color:var(--teal);}
    .passenger-icon .icon{width:21px;height:21px;stroke-width:1.9;}
    .passenger-copy{min-width:0;}
    .info-value{margin-top:11px;color:var(--navy);font-size:11.5px;font-weight:900;line-height:1.35;overflow-wrap:anywhere;}
    .passenger-contact-number .info-value,.passenger-email .info-value{font-size:10px;white-space:nowrap;overflow-wrap:normal;}
    .baggage-card{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));max-width:430px;padding:0;}
    .baggage-item{display:flex;min-width:0;gap:15px;align-items:center;padding:14px 20px;border-right:1px solid var(--line);}
    .baggage-item:last-child{border-right:0;}
    .baggage-icon{flex:0 0 auto;color:var(--teal);}
    .baggage-icon .icon{width:30px;height:30px;stroke-width:1.9;}
    .baggage-value{margin-top:10px;color:var(--navy);font-size:21px;font-weight:900;}
    .important-card{padding:12px 18px;}
    .important-list{display:grid;gap:10px;padding:0;margin:0;list-style:none;}
    .important-list li{display:grid;grid-template-columns:23px minmax(0,1fr);gap:12px;align-items:center;color:var(--text);font-size:12px;line-height:1.35;}
    .num{display:flex;width:23px;height:23px;align-items:center;justify-content:center;border-radius:50%;background:var(--teal);color:#fff;font-size:12px;font-weight:900;line-height:1;}
    .footer-zone{margin-top:auto;}
    .thanks{display:grid;grid-template-columns:minmax(70px,1fr) auto minmax(70px,1fr);gap:20px;align-items:center;margin:16px 0 15px;color:var(--teal);font-family:Georgia,serif;font-size:20px;font-style:italic;}
    .thanks::before,.thanks::after{height:1px;background:var(--teal);content:"";}
    .thanks span{white-space:nowrap;text-align:center;}
    .footer{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:center;margin:0 -24px;padding:15px 24px;background:var(--navy);color:#fff;font-size:13px;}
    .footer-item{display:flex;min-width:0;min-height:30px;align-items:center;justify-content:center;gap:11px;border-right:1px solid rgba(255,255,255,.5);white-space:nowrap;}
    .footer-item:last-child{border-right:0;}
    .footer-icon{display:flex;width:29px;height:29px;flex:0 0 auto;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.68);border-radius:50%;}
    .footer-icon .icon{width:15px;height:15px;stroke-width:1.8;}
  `;
}

function invoiceHtml(ticket: TravelTicket) {
  const passengerName = fullPassengerName(ticket);
  const arrivalDate = ticket.arrivalDate || ticket.departureDate;
  const departureWeekday = weekday(ticket.departureDate);
  const arrivalWeekday = weekday(arrivalDate);
  const extraNote = ticket.notes
    ? `<li><span class="num">3</span><span>${escapeHtml(ticket.notes)}</span></li>`
    : "";

  return `
    <div id="ticket" class="ticket-page">
      <header class="header">
        <div class="brand">
          ${logoMark()}
          <div>
            <div class="brand-name">Travelian<span>.</span></div>
            <div class="tagline">Your Trusted Travel Partner</div>
          </div>
        </div>
        <div class="doc-title">E-Ticket Receipt &amp; Itinerary</div>
      </header>

      ${sectionTitle("Flight Information", "plane", `<div class="pnr">PNR: <span>${escapeHtml(ticket.pnr || ticket.bookingId)}</span></div>`)}
      <div class="card flight-card">
        <div class="flight-column">
          <div class="label">Flight</div>
          <div class="flight-number">${escapeHtml(ticket.flightNumber || "Not specified")}</div>
          <div class="dash"></div>
          <div class="label">Operated By</div>
          <div class="airline">${escapeHtml(ticket.airline || "Not specified")}</div>
        </div>
        <div class="flight-column route-column">
          <div class="label">Departure</div>
          <div class="airport-code">${escapeHtml(ticket.origin)}</div>
          <div class="airport-city">${escapeHtml(ticket.originCity || ticket.origin)}</div>
          <div class="airport-name">${escapeHtml(ticket.originAirport || "")}</div>
          <div class="route-plane">${routePlane()}</div>
          <div class="schedule-stack">
            ${schedule("calendar", formatDate(ticket.departureDate), departureWeekday)}
            ${schedule("clock", ticket.departureTime, `${ticket.origin} Local Time`)}
          </div>
        </div>
        <div class="flight-column arrival-column">
          <div class="label">Arrival</div>
          <div class="airport-code">${escapeHtml(ticket.destination)}</div>
          <div class="airport-city">${escapeHtml(ticket.destinationCity || ticket.destination)}</div>
          <div class="airport-name">${escapeHtml(ticket.destinationAirport || "")}</div>
          <div class="schedule-stack">
            ${schedule("calendar", formatDate(arrivalDate), arrivalWeekday)}
            ${schedule("clock", ticket.arrivalTime, `${ticket.destination} Local Time`)}
          </div>
        </div>
        <div class="flight-column side-stack">
          ${sideInfo("Duration", ticket.duration)}
          ${sideInfo("Terminal", ticket.terminal)}
          ${sideInfo("Class", ticket.cabinClass)}
        </div>
      </div>

      ${sectionTitle("Passenger Details", "user")}
      <div class="card passenger-card">
        ${passengerInfo("Name", passengerName, "user")}
        ${passengerInfo("Passport Number", ticket.passportNumber, "passport")}
        ${passengerInfo("Seat Number", ticket.seatNumber, "seat")}
        ${passengerInfo("Contact Number", ticket.customerPhone, "phone")}
        ${passengerInfo("Email", ticket.customerEmail, "mail")}
      </div>

      ${sectionTitle("Baggage Information", "briefcase")}
      <div class="card baggage-card">
        <div class="baggage-item">
          <div class="baggage-icon">${icon("briefcase")}</div>
          <div><div class="info-label">Checked Baggage</div><div class="baggage-value">${ticket.checkinBaggageKg == null ? "Not specified" : `${escapeHtml(ticket.checkinBaggageKg)} KG`}</div></div>
        </div>
        <div class="baggage-item">
          <div class="baggage-icon">${icon("carryOn")}</div>
          <div><div class="info-label">Cabin Baggage</div><div class="baggage-value">${ticket.cabinBaggageKg == null ? "Not specified" : `${escapeHtml(ticket.cabinBaggageKg)} KG`}</div></div>
        </div>
      </div>

      ${sectionTitle("Important Information", "info")}
      <div class="card important-card">
        <ul class="important-list">
          <li><span class="num">1</span><span>Reached at the Airport 4 hours before the Departure time.</span></li>
          <li><span class="num">2</span><span>Refund and cancellation procedures remain strictly subject to the respective airline policies and applicable fare rules.</span></li>
          ${extraNote}
        </ul>
      </div>

      <div class="footer-zone">
        <div class="thanks"><span>Thank you for choosing Travelian.</span></div>
        <footer class="footer">
          <div class="footer-item"><span class="footer-icon">${icon("phone")}</span> ${SUPPORT_PHONE_DISPLAY}</div>
          <div class="footer-item"><span class="footer-icon">${icon("mail")}</span> ${SUPPORT_EMAIL}</div>
          <div class="footer-item"><span class="footer-icon">${icon("globe")}</span> www.travelian.pk</div>
        </footer>
      </div>
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
