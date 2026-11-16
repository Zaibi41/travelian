import { useState } from "react";
import { formatDay } from "@/lib/admin-search/date-display";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { DashboardErrorNotice } from "@/components/admin/dashboard/DashboardStates";
import { DocumentDialog, MergeDialog, PersonFormDialog } from "@/components/admin/people/PersonDialogs";
import { ValidityBadge } from "@/components/admin/people/SavedDocuments";
import { countryName } from "@/data/countries";
import { formatDateTime } from "@/lib/admin-bookings/format";
import { bookingDetailPath } from "@/lib/admin-bookings/tabs";
import { GatewayError } from "@/lib/gateway/client";
import { fetchPerson, removeDocument, type PersonDetail, type SavedDocument } from "@/lib/saved-people/api";
import { ID_TYPE_LABEL, TITLE_LABEL, fullName, peopleErrorMessage } from "@/lib/saved-people/states";
import { personPath } from "@/lib/saved-people/routes";

// A saved person: details, documents and bookings (Customers & Travelers). Edit,
// documents and merge show only when the gateway says the caller may (can_manage, can_merge).
export default function SavedPersonPage() {
  const { personId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const person = useQuery({
    queryKey: ["saved-people", "detail", personId],
    queryFn: ({ signal }) => fetchPerson(personId, { signal }),
    retry: (count, error) => !(error instanceof GatewayError && ["forbidden", "not_found", "unauthorized"].includes(error.kind)) && count < 1,
  });
  const [editing, setEditing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [removing, setRemoving] = useState<SavedDocument | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["saved-people"] });
  const back = (
    <Link to="/admin/customers" className="inline-flex w-fit items-center gap-1.5 text-body text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Customers &amp; Travelers
    </Link>
  );

  if (person.isPending) {
    return (
      <div className="flex min-w-0 flex-col gap-section-gap" aria-busy="true" aria-label="Loading person">
        {back}
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (person.error || !person.data) {
    const error = person.error;
    return (
      <div className="flex min-w-0 flex-col gap-section-gap">
        {back}
        {error instanceof GatewayError && error.kind === "forbidden" ? (
          <NotAvailableNotice title="Not available for your role">Saved customers and travelers are for the Travelian back office.</NotAvailableNotice>
        ) : (
          <DashboardErrorNotice message={peopleErrorMessage(error, "This person couldn't be loaded. Try again in a moment.")} />
        )}
      </div>
    );
  }

  const data: PersonDetail = person.data;
  const name = fullName(data);
  const merged = Boolean(data.merged_into_id);
  const documents = data.documents ?? [];
  const bookings = data.bookings ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      {back}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 truncate font-display text-page-title font-bold text-foreground" title={name}>{name}</h1>
        {!merged && (
          <div className="flex flex-wrap gap-2">
            {data.can_manage && <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
            {data.can_merge && <Button variant="outline" onClick={() => setMerging(true)}>Merge duplicates</Button>}
          </div>
        )}
      </div>

      {merged && data.merged_into_id && (
        <NotAvailableNotice title="This person was merged">
          Their documents and bookings are on the other record. <Link className="font-medium text-foreground underline" to={personPath(data.merged_into_id)}>Open the kept record</Link>
        </NotAvailableNotice>
      )}

      <section aria-label="Details" className="rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Title", data.title ? TITLE_LABEL[data.title] ?? data.title : "—"],
            ["Date of birth", formatDay(data.date_of_birth) || "—"],
            ["Nationality", data.nationality ? countryName(data.nationality) ?? data.nationality : "—"],
            ["Phone", data.phone ?? "—"],
            ["Email", data.email ?? "—"],
            ["Last booking", formatDateTime(data.last_booking_at)],
          ].map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col">
              <dt className="text-label text-muted-foreground">{label}</dt>
              <dd className="truncate text-foreground" title={value}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Documents" className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-section font-semibold text-foreground">Documents</h2>
          {data.can_manage && !merged && <Button variant="outline" size="sm" onClick={() => setAttaching(true)}>Attach document</Button>}
        </div>
        {documents.length === 0 ? (
          <p className="text-body text-muted-foreground">No documents saved.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-table">
              <thead>
                <tr className="bg-muted text-left">
                  <th scope="col" className="h-table-header px-2.5 font-semibold text-foreground">Document type</th>
                  <th scope="col" className="h-table-header px-2.5 font-semibold text-foreground">Country</th>
                  <th scope="col" className="h-table-header px-2.5 font-semibold text-foreground">Number</th>
                  <th scope="col" className="h-table-header px-2.5 font-semibold text-foreground">Expiry</th>
                  {data.can_manage && !merged && <th scope="col" className="h-table-header px-2.5 font-semibold text-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {documents.map(document => (
                  <tr key={document.id} className="border-b border-border last:border-b-0">
                    <td className="px-2.5 py-2 text-foreground">{ID_TYPE_LABEL[document.id_type]}</td>
                    <td className="px-2.5 py-2 text-foreground">{document.document_country}</td>
                    <td className="px-2.5 py-2 tabular-nums text-foreground">{document.document_number}</td>
                    <td className="px-2.5 py-2 text-foreground">
                      <span className="flex items-center gap-1.5 whitespace-nowrap tabular-nums">{formatDay(document.document_expiry) || "—"}<ValidityBadge validity={document.document_validity} /></span>
                    </td>
                    {data.can_manage && !merged && (
                      <td className="px-2.5 py-2">
                        <Button variant="outline" size="sm" aria-label={`Remove ${ID_TYPE_LABEL[document.id_type]} ${document.document_number}`}
                          onClick={() => setRemoving(document)}>Remove</Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Bookings" className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
        <h2 className="font-display text-section font-semibold text-foreground">Bookings</h2>
        {bookings.length === 0 ? (
          <p className="text-body text-muted-foreground">No bookings linked yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-table">
              <thead>
                <tr className="bg-muted text-left">
                  <th scope="col" className="h-table-header px-2.5 font-semibold text-foreground">Booking ID</th>
                  <th scope="col" className="h-table-header px-2.5 font-semibold text-foreground">As</th>
                  <th scope="col" className="h-table-header px-2.5 font-semibold text-foreground">Created at</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(booking => (
                  <tr key={`${booking.booking_id}-${booking.role}`} className="border-b border-border last:border-b-0">
                    <td className="px-2.5 py-2"><Link className="font-semibold text-foreground hover:underline" to={bookingDetailPath(booking.booking_id)}>{booking.booking_id}</Link></td>
                    <td className="px-2.5 py-2 text-foreground">{booking.role === "customer" ? "Customer" : "Traveler"}</td>
                    <td className="px-2.5 py-2 whitespace-nowrap tabular-nums text-foreground">{formatDateTime(booking.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <PersonFormDialog open person={data} onOpenChange={setEditing} onSaved={(_id, message) => { setEditing(false); toast.success(message); void refresh(); }} />
      )}
      {merging && (
        <MergeDialog open source={data} onOpenChange={setMerging} onMerged={kept => { setMerging(false); toast.success("People merged."); void refresh(); navigate(personPath(kept)); }} />
      )}
      {attaching && (
        <DocumentDialog open person={data} onOpenChange={setAttaching} onSaved={detail => {
          setAttaching(false);
          toast.success("Document saved.");
          queryClient.setQueryData(["saved-people", "detail", personId], detail);
          void refresh();
        }} />
      )}
      <RemoveDocumentDialog personId={data.id} document={removing} onClose={() => setRemoving(null)} onRemoved={detail => {
        setRemoving(null);
        toast.success("Document removed.");
        queryClient.setQueryData(["saved-people", "detail", personId], detail);
        void refresh();
      }} />
    </div>
  );
}

function RemoveDocumentDialog({ personId, document, onClose, onRemoved }: {
  personId: string;
  document: SavedDocument | null;
  onClose: () => void;
  onRemoved: (detail: PersonDetail) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <AlertDialog open={Boolean(document)} onOpenChange={open => { if (!open && !busy) { setError(null); onClose(); } }}>
      <AlertDialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this document?</AlertDialogTitle>
          <AlertDialogDescription>
            {document ? `${ID_TYPE_LABEL[document.id_type]} ${document.document_number}. ` : ""}Past bookings keep their own copy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p role="alert" className="text-body text-status-critical-text">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={async event => {
              event.preventDefault();
              if (!document) return;
              setBusy(true);
              setError(null);
              try {
                onRemoved(await removeDocument(personId, document.id));
              } catch (failure) {
                setError(peopleErrorMessage(failure, "The document couldn't be removed. Try again in a moment."));
              } finally {
                setBusy(false);
              }
            }}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
