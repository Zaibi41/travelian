import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { FieldLabel, Input } from "@/components/admin/ui/field";
import { Notice } from "@/components/admin/ui/feedback";
import { TABLE } from "@/components/admin/ui/classes";
import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { GatewayError } from "@/lib/gateway/client";
import { GROUP_TICKETING_LABEL, recordGroupTickets } from "@/lib/admin-search/group-holds";
import type { BookingDetail, BookingPassenger } from "@/lib/admin-bookings/types";
import { cn } from "@/lib/utils";
import { CopyPnr } from "@/components/CopyPnr";
import { titleText } from "@/lib/passenger-details";

const name = (passenger: BookingPassenger) => `${titleText(passenger.title)} ${passenger.first_name} ${passenger.last_name}`.trim();

/** A group booking's Tickets tab: the airline's final PNR and each traveler's ticket number. Staff with the gateway's
 *  can_edit_group_tickets type them in; everyone else reads them. Ticketed (final PNR and every ticket number) is the
 *  gateway's decision, as are the checks on payment, permission and format. */
export function GroupTicketsTab({ booking }: { booking: BookingDetail }) {
  const travelers = [...(booking.passengers ?? [])].sort((a, b) => a.position - b.position);
  const status = booking.group_ticketing_status;
  return (
    <section aria-label="Tickets" className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-section font-semibold text-foreground">Final PNR and tickets</h2>
        {status && <StatusBadge severity={status === "ticketed" ? "fine" : "action"}>{GROUP_TICKETING_LABEL[status]}</StatusBadge>}
      </div>
      {!status && <Notice title="Not paid in full yet">The final PNR and ticket numbers are recorded after the full payment.</Notice>}
      {booking.can_edit_group_tickets
        ? <TicketsForm booking={booking} travelers={travelers} />
        : <TicketsTable finalPnr={booking.final_pnr} travelers={travelers} />}
    </section>
  );
}

function TicketsTable({ finalPnr, travelers }: { finalPnr?: string | null; travelers: BookingPassenger[] }) {
  return (
    <>
      <p className="text-body text-foreground">Final PNR <span className="font-mono font-semibold">{finalPnr ?? "—"}</span> <CopyPnr pnr={finalPnr} /></p>
      <div className="overflow-x-auto">
        <table className={cn(TABLE.table, "min-w-[28rem]")}>
          <thead>
            <tr className={TABLE.headRow}>{["Passenger", "Ticket number", "Status"].map(column => <th key={column} scope="col" className={TABLE.th}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {travelers.map(traveler => (
              <tr key={traveler.position} className={TABLE.row}>
                <td className={cn(TABLE.td, "max-w-[18rem] truncate")} title={name(traveler)}>{name(traveler)}</td>
                <td className={cn(TABLE.td, "font-mono")}>{traveler.ticket_number ?? "—"}</td>
                <td className={TABLE.td}>{traveler.ticket_number ? <StatusBadge severity="fine">Issued</StatusBadge> : <Tag>Not issued</Tag>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TicketsForm({ booking, travelers }: { booking: BookingDetail; travelers: BookingPassenger[] }) {
  const queryClient = useQueryClient();
  const [finalPnr, setFinalPnr] = useState(booking.final_pnr ?? "");
  const [numbers, setNumbers] = useState<Record<number, string>>(
    () => Object.fromEntries(travelers.map(traveler => [traveler.position, traveler.ticket_number ?? ""])));
  const save = useMutation({
    mutationFn: () => recordGroupTickets(booking.booking_id, {
      final_pnr: finalPnr.trim().toUpperCase(),
      tickets: travelers.map(traveler => ({ position: traveler.position, ticket_number: numbers[traveler.position]?.trim() || null })),
    }),
    onSuccess: view => {
      toast.success(view.ticketing_status === "ticketed" ? "Saved. The booking is ticketed." : "Final PNR and tickets saved.");
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
  });
  const error = save.error instanceof GatewayError ? save.error.message : save.error ? "The final PNR and tickets couldn't be saved. Try again." : null;
  return (
    <form className="flex min-w-0 flex-col gap-3" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <div className="flex max-w-xs flex-col gap-1">
        <FieldLabel htmlFor="group-final-pnr">Final PNR</FieldLabel>
        <Input id="group-final-pnr" value={finalPnr} maxLength={8} autoComplete="off" className="h-control font-mono uppercase"
          onChange={event => setFinalPnr(event.target.value.replace(/\s/g, ""))} />
      </div>
      <div className="overflow-x-auto">
        <table className={cn(TABLE.table, "min-w-[18rem]")}>
          <thead>
            <tr className={TABLE.headRow}>{["Passenger", "Ticket number"].map(column => <th key={column} scope="col" className={TABLE.th}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {travelers.map(traveler => (
              <tr key={traveler.position} className={TABLE.row}>
                <td className={cn(TABLE.td, "max-w-[8rem] truncate sm:max-w-[18rem]")} title={name(traveler)}>{name(traveler)}</td>
                <td className={TABLE.td}>
                  <Input aria-label={`Ticket number, ${name(traveler)}`} value={numbers[traveler.position] ?? ""} maxLength={20} autoComplete="off"
                    className="h-control w-full min-w-[9rem] max-w-[16rem] font-mono"
                    onChange={event => setNumbers(current => ({ ...current, [traveler.position]: event.target.value.replace(/\s/g, "") }))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" className="text-helper text-status-critical-text">{error}</p>}
      <div>
        <Button type="submit" variant="primary" disabled={save.isPending || !finalPnr.trim()}>{save.isPending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}
