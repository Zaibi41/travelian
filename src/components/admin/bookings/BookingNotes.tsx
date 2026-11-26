import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { FieldLabel, Textarea } from "@/components/admin/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { addBookingNote, fetchBookingNotes } from "@/lib/admin-bookings/api";
import { formatDateTime } from "@/lib/admin-bookings/format";
import { GatewayError } from "@/lib/gateway/client";

const MAX = 1000;
// The booking is open, so "not found" here means the gateway doesn't offer notes (yet): hide the section.
const notShown = (error: unknown) => error instanceof GatewayError && error.kind === "not_found";

function who(role?: string | null, userId?: string | null) {
  if (!userId) return "System";
  const name = role ? role.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()) : "User";
  return `${name} · ${userId.slice(0, 8)}`;
}

/** gateway#89: staff notes on the booking (Overview tab). Back office; newest first; adding one is also logged on Audit. */
export function BookingNotes({ bookingId }: { bookingId: string }) {
  const id = useId();
  const queryClient = useQueryClient();
  const key = ["admin-bookings", "notes", bookingId];
  const notes = useQuery({ queryKey: key, queryFn: ({ signal }) => fetchBookingNotes(bookingId, { signal }), retry: (n, e) => !notShown(e) && n < 1 });
  const [body, setBody] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const add = useMutation({
    mutationFn: () => addBookingNote(bookingId, body.trim()),
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: error => setProblem(error instanceof GatewayError ? error.message : "The note couldn't be saved. Nothing was saved."),
  });
  if (notShown(notes.error)) return null;  // the gateway doesn't offer notes yet
  const submit = () => {
    if (!body.trim()) return setProblem("Write the note first.");
    setProblem(null);
    add.mutate();
  };
  return (
    <section aria-labelledby={`${id}-title`} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
      <h2 id={`${id}-title`} className="text-section font-semibold text-foreground">Notes</h2>
      <form noValidate className="flex flex-col gap-2" onSubmit={event => { event.preventDefault(); submit(); }}>
        <FieldLabel htmlFor={`${id}-body`}>Add a note</FieldLabel>
        <Textarea id={`${id}-body`} rows={2} maxLength={MAX} value={body} onChange={event => setBody(event.target.value)}
          placeholder="e.g. Customer will pay by Friday" aria-describedby={`${id}-count`} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span id={`${id}-count`} className="text-label text-muted-foreground tabular-nums">{body.length}/{MAX}</span>
          <Button type="submit" variant="primary" disabled={add.isPending}>{add.isPending ? "Saving…" : "Add note"}</Button>
        </div>
        {problem && <p role="alert" className="text-label text-status-critical-text">{problem}</p>}
      </form>
      {notes.isPending ? (
        <div className="flex flex-col gap-1.5" aria-busy="true" aria-label="Loading notes"><Skeleton className="h-10 rounded-md" /><Skeleton className="h-10 rounded-md" /></div>
      ) : notes.error ? (
        <p role="alert" className="text-body text-muted-foreground">{notes.error instanceof GatewayError ? notes.error.message : "Notes couldn't be loaded."}</p>
      ) : !notes.data?.notes.length ? (
        <p className="text-body text-muted-foreground">No notes yet.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border" aria-label="Booking notes">
          {notes.data.notes.map(note => (
            <li key={note.id} className="flex min-w-0 flex-col gap-0.5 py-2">
              <p className="whitespace-pre-wrap break-words text-body text-foreground">{note.body}</p>
              <p className="text-label text-muted-foreground"><span className="tabular-nums">{formatDateTime(note.created_at)}</span> · {who(note.created_by_role, note.created_by_user_id)}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
