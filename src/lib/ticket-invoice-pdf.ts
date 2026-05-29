import { jsPDF } from "jspdf";
import type { TravelTicket } from "@/data/mock";

function money(value?: number) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function fullPassengerName(ticket: TravelTicket) {
  const fromParts = [ticket.title, ticket.firstName, ticket.lastName].filter(Boolean).join(" ");
  return fromParts || ticket.passengerName;
}

function row(doc: jsPDF, label: string, value: string, x: number, y: number, width = 72) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(value || "Not provided", x, y + 5, { maxWidth: width });
}

function section(doc: jsPDF, title: string, number: string, y: number) {
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 10, 2, 2, "FD");
  doc.setFillColor(15, 42, 102);
  doc.roundedRect(18, y + 2, 7, 6, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(number, 21.5, y + 6.4, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(15, 42, 102);
  doc.text(title.toUpperCase(), 29, y + 6.5);
}

export function downloadTicketInvoice(ticket: TravelTicket) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const navy = [15, 42, 102] as const;
  const amber = [224, 161, 26] as const;
  const total = ticket.price || (Number(ticket.baseFare || 0) + Number(ticket.tax || 0));
  const invoiceNumber = ticket.invoiceNumber || `INV-${ticket.ticketId.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(8, 8, 194, 281, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...navy);
  doc.text("Travelian", 16, 24);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Your Trusted Travel Partner", 16, 30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...amber);
  doc.setFontSize(15);
  doc.text("TICKET INVOICE", 194, 24, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(invoiceNumber, 194, 30, { align: "right" });
  doc.setDrawColor(...navy);
  doc.setLineWidth(0.7);
  doc.line(16, 36, 194, 36);

  section(doc, "Booking Details", "1", 43);
  row(doc, "PNR", ticket.pnr || ticket.bookingId, 18, 61);
  row(doc, "Status", ticket.status, 62, 61);
  row(doc, "Ticket Number", ticket.ticketNumber, 106, 61);
  row(doc, "Airline", `${ticket.airline || "Airline"}${ticket.flightNumber ? ` / ${ticket.flightNumber}` : ""}`, 150, 61, 40);

  section(doc, "Passenger Details", "2", 78);
  row(doc, "Passenger", fullPassengerName(ticket), 18, 96);
  row(doc, "Passenger Type", ticket.passengerType || "Adult", 62, 96);
  row(doc, "Date of Birth", ticket.dateOfBirth || "", 106, 96);
  row(doc, "Passport", ticket.passportNumber || "", 150, 96, 40);
  row(doc, "Passport Expiry", ticket.passportExpiry || "", 18, 112);
  row(doc, "Customer Email", ticket.customerEmail || ticket.cognitoEmail || "", 62, 112);
  row(doc, "Customer Phone", ticket.customerPhone || "", 128, 112);

  section(doc, "Flight Details", "3", 128);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(18, 144, 174, 38, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...navy);
  doc.text(`${ticket.airline || "Flight"}${ticket.flightNumber ? ` / ${ticket.flightNumber}` : ""}`, 24, 154);
  doc.setFontSize(20);
  doc.text(ticket.origin || "---", 24, 166);
  doc.text(ticket.destination || "---", 186, 166, { align: "right" });
  doc.setDrawColor(...amber);
  doc.setLineWidth(0.8);
  doc.line(58, 164, 152, 164);
  doc.setTextColor(...amber);
  doc.setFontSize(12);
  doc.text(">", 105, 162.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(ticket.originAirport || "Departure airport", 24, 173, { maxWidth: 70 });
  doc.text(ticket.destinationAirport || "Arrival airport", 186, 173, { align: "right", maxWidth: 70 });
  doc.text(`${ticket.departureDate || "Date"} ${ticket.departureTime || ""}`, 24, 179);
  doc.text(ticket.duration || "", 105, 174, { align: "center" });
  doc.text(ticket.arrivalTime || "", 186, 179, { align: "right" });

  section(doc, "Fare & Baggage", "4", 193);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(18, 210, 82, 34, 3, 3, "S");
  doc.roundedRect(110, 210, 82, 34, 3, 3, "S");
  row(doc, "Base Fare", money(ticket.baseFare || total), 24, 223);
  row(doc, "Tax", money(ticket.tax || 0), 24, 236);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...navy);
  doc.text(`Total ${money(total)}`, 114, 226);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Check-in: ${ticket.checkinBaggageKg ?? 0} KG`, 114, 237);
  doc.text(`Cabin: ${ticket.cabinBaggageKg ?? 0} KG`, 154, 237);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(18, 253, 174, 20, 3, 3, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Please arrive at least 4 hours before departure. Carry passport, visa and required destination documents. Flight times and airline rules may change; reconfirm with the airline before travel.", 24, 262, { maxWidth: 162 });

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("www.travelian.pk | travelian.pk@gmail.com | +92 324 4440014 | Johar Town, Lahore", 105, 283, { align: "center" });

  doc.save(`${invoiceNumber}.pdf`);
}
