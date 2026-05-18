import { jsPDF } from "jspdf";
import type { BookingRecord } from "./booking-store";

export function downloadETicket(b: BookingRecord) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 50;

  // Header bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Travelian", 40, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("E-Ticket / Booking Confirmation", 40, 70);
  doc.setFontSize(10);
  doc.text(`PNR: ${b.pnr}`, W - 40, 50, { align: "right" });
  doc.text(`Booking ID: ${b.id}`, W - 40, 68, { align: "right" });

  y = 130;
  doc.setTextColor(15, 23, 42);

  // Status
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Status: ${b.status.toUpperCase()}`, 40, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Issued: ${new Date(b.createdAt).toLocaleString()}`, W - 40, y, { align: "right" });
  y += 24;

  // Flight block
  if (b.flight) {
    doc.setDrawColor(220);
    doc.line(40, y, W - 40, y);
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${b.flight.airline}  ·  ${b.flight.flightNumber}`, 40, y);
    y += 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`${b.flight.from}${b.flight.fromCode ? ` (${b.flight.fromCode})` : ""}  →  ${b.flight.to}${b.flight.toCode ? ` (${b.flight.toCode})` : ""}`, 40, y);
    y += 18;
    doc.text(`Date: ${b.flight.date}    Depart: ${b.flight.departTime ?? "-"}    Arrive: ${b.flight.arriveTime ?? "-"}    Duration: ${b.flight.duration ?? "-"}`, 40, y);
    y += 16;
    if (b.flight.cabin) {
      doc.text(`Cabin: ${b.flight.cabin}`, 40, y);
      y += 16;
    }
  }

  // Travelers
  y += 10;
  doc.setDrawColor(220);
  doc.line(40, y, W - 40, y);
  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Passenger(s)", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  b.travelers.forEach((t, i) => {
    doc.text(`${i + 1}. ${t.title?.toUpperCase()} ${t.firstName} ${t.lastName}   ${t.docType.toUpperCase()}: ${t.docNumber}`, 40, y);
    y += 16;
    if (b.seat) {
      doc.text(`   Seat: ${b.seat}`, 40, y);
      y += 16;
    }
  });

  // Contact
  y += 6;
  doc.setDrawColor(220);
  doc.line(40, y, W - 40, y);
  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Contact", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Email: ${b.contact.email}`, 40, y); y += 16;
  doc.text(`Phone: ${b.contact.phone}`, 40, y); y += 16;

  // Add-ons
  if (b.addons.length) {
    y += 6;
    doc.line(40, y, W - 40, y);
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.text("Add-ons", 40, y); y += 18;
    doc.setFont("helvetica", "normal");
    b.addons.forEach(a => {
      doc.text(`• ${a.name}`, 40, y);
      doc.text(`${b.pricing.currency} ${a.price.toFixed(2)}`, W - 40, y, { align: "right" });
      y += 16;
    });
  }

  // Pricing
  y += 6;
  doc.line(40, y, W - 40, y);
  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Fare Summary", 40, y); y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Base fare", 40, y);
  doc.text(`${b.pricing.currency} ${b.pricing.base.toFixed(2)}`, W - 40, y, { align: "right" }); y += 16;
  doc.text("Add-ons", 40, y);
  doc.text(`${b.pricing.currency} ${b.pricing.addons.toFixed(2)}`, W - 40, y, { align: "right" }); y += 16;
  doc.text("Taxes & fees", 40, y);
  doc.text(`${b.pricing.currency} ${b.pricing.taxes.toFixed(2)}`, W - 40, y, { align: "right" }); y += 16;
  doc.setFont("helvetica", "bold");
  doc.text("Total Paid", 40, y);
  doc.text(`${b.pricing.currency} ${b.pricing.total.toFixed(2)}`, W - 40, y, { align: "right" }); y += 30;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Please carry a valid government ID and arrive at the airport at least 2 hours before departure.", 40, y);
  y += 12;
  doc.text("This e-ticket is your proof of booking. Travelian - Your Trusted Travel Partner.", 40, y);

  doc.save(`Travelian-${b.pnr}.pdf`);
}
