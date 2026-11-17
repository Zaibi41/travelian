import { useEffect, useState } from "react";
import { formatDay } from "@/lib/admin-search/date-display";
import { cn } from "@/lib/utils";
import { SEARCH_FIELD } from "@/components/admin/ui/search-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Contact, Luggage, MessageSquare, Search, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductTabLinks } from "@/components/admin/ui/ProductTabLinks";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { DashboardErrorNotice } from "@/components/admin/dashboard/DashboardStates";
import { DocumentDialog, MergeDialog, PersonFormDialog } from "@/components/admin/people/PersonDialogs";
import { ValidityBadge } from "@/components/admin/people/SavedDocuments";
import { formatDateTime } from "@/lib/admin-bookings/format";
import { GatewayError } from "@/lib/gateway/client";
import { MIN_SEARCH_LENGTH, RECENT_LIMIT, listRecentPeople, searchPeople, type PersonSearch, type PersonSummary } from "@/lib/saved-people/api";
import { ID_TYPE_LABEL, fullName, peopleErrorMessage } from "@/lib/saved-people/states";
import { CUSTOMERS_TABS, customersTabPath, personPath, type CustomersTab } from "@/lib/saved-people/routes";

// Customers & Travelers (spec 8, mockups customers-*). Data: travelian-api-gateway
// /v1/admin/customers only. One record per person: the Customers and Travelers tabs
// are two views of the same saved people. Permissions come from the search response.
// Hidden until the backend has them (docs/backend-todo.md): every summary card, the Source,
// Agency, Branch, Last booking, Document validity, Flag, Nationality, Document expiry and
// Customer (owner) filters, the Bookings, Flag and Notes columns, and Flag with reason.
// Documents, dates of birth, phones and emails show in full; there is no Reveal.
const TAB_ICONS: Record<string, LucideIcon> = { "": Contact, travelers: Luggage, communications: MessageSquare };

export default function CustomersTravelersPage({ tab = "" }: { tab?: string }) {
  const current: CustomersTab = CUSTOMERS_TABS.find(entry => entry.slug === tab) ?? CUSTOMERS_TABS[0];
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      {current.slug === "communications" ? (
        <>
          <h1 className="font-display text-page-title font-bold text-foreground">Customers &amp; Travelers</h1>
          <ProductTabLinks label="Customers & Travelers" tabs={CUSTOMERS_TABS.map(entry => ({ to: customersTabPath(entry, q), label: entry.label, icon: TAB_ICONS[entry.slug] }))} />
          <NotAvailableNotice title="Communications aren't available yet">
            Message history comes with the notification service. Shared WhatsApp inbox is decided after the dashboard is built.
          </NotAvailableNotice>
        </>
      ) : (
        <PeopleRegister tab={current} q={q} />
      )}
    </div>
  );
}

function PeopleRegister({ tab, q }: { tab: CustomersTab; q: string }) {
  const [, setParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searching = q.trim().length >= MIN_SEARCH_LENGTH;
  // Before a search: the most recent people; with a search: the gateway's matches.
  const people = useQuery({
    queryKey: searching ? ["saved-people", "search", q.trim()] : ["saved-people", "recent"],
    queryFn: ({ signal }) => (searching ? searchPeople(q, { signal }) : listRecentPeople({ signal })),
    placeholderData: keepPreviousData,
    retry: (count, error) => !(error instanceof GatewayError && ["forbidden", "unauthorized"].includes(error.kind)) && count < 1,
  });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PersonSummary | null>(null);
  const [merging, setMerging] = useState<PersonSummary | null>(null);
  const [attaching, setAttaching] = useState<PersonSummary | null>(null);
  const data = people.data;
  const forbidden = people.error instanceof GatewayError && people.error.kind === "forbidden";
  // Unknown until the first answer; hidden only when the gateway says no.
  const canManage = data?.can_manage ?? true;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["saved-people"] });
  const customers = tab.slug === "";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-page-title font-bold text-foreground">Customers &amp; Travelers</h1>
        {customers && canManage && !forbidden && <Button onClick={() => setAdding(true)}>Add Customer</Button>}
      </div>
      <ProductTabLinks label="Customers & Travelers" tabs={CUSTOMERS_TABS.map(entry => ({ to: customersTabPath(entry, q), label: entry.label, icon: TAB_ICONS[entry.slug] }))} />
      {forbidden ? (
        <NotAvailableNotice title="Not available for your role">
          Saved customers and travelers are for the Travelian back office. A super admin can tell you who to ask.
        </NotAvailableNotice>
      ) : (
        <>
          <SearchBox
            q={q}
            placeholder={customers ? "CNIC, passport, phone, email or name" : "Name, CNIC or passport"}
            onSearch={value => setParams(value ? { q: value } : {}, { replace: true })}
          />
          {people.error && <DashboardErrorNotice message={peopleErrorMessage(people.error, "Saved people couldn't be loaded. Try again in a moment.")} />}
          <PeopleTable
            customers={customers}
            searching={searching}
            loading={people.isPending}
            data={data}
            onEdit={setEditing}
            onMerge={setMerging}
            onAttach={setAttaching}
          />
        </>
      )}
      <PersonFormDialog
        open={adding}
        onOpenChange={setAdding}
        onSaved={(personId, message) => {
          setAdding(false);
          toast.success(message);
          void refresh();
          navigate(personPath(personId));
        }}
      />
      {editing && (
        <PersonFormDialog
          open
          person={editing}
          onOpenChange={open => !open && setEditing(null)}
          onSaved={(_id, message) => {
            setEditing(null);
            toast.success(message);
            void refresh();
          }}
        />
      )}
      {merging && (
        <MergeDialog
          open
          source={merging}
          onOpenChange={open => !open && setMerging(null)}
          onMerged={kept => {
            setMerging(null);
            toast.success("People merged.");
            void refresh();
            navigate(personPath(kept));
          }}
        />
      )}
      {attaching && (
        <DocumentDialog
          open
          person={attaching}
          onOpenChange={open => !open && setAttaching(null)}
          onSaved={() => {
            setAttaching(null);
            toast.success("Document saved.");
            void refresh();
          }}
        />
      )}
    </>
  );
}

function SearchBox({ q, placeholder, onSearch }: { q: string; placeholder: string; onSearch: (value: string) => void }) {
  const [value, setValue] = useState(q);
  useEffect(() => setValue(q), [q]);
  return (
    <section aria-label="Filters" className="rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
      <form
        role="search"
        className="flex min-w-0 flex-col gap-1"
        onSubmit={event => {
          event.preventDefault();
          onSearch(value.trim());
        }}
      >
        <label htmlFor="people-search" className="text-label font-medium text-muted-foreground">Search</label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="people-search" value={value} maxLength={64} onChange={event => setValue(event.target.value)} placeholder={placeholder}
              className={cn(SEARCH_FIELD, "pl-9")} />
          </div>
          <Button type="submit" variant="outline" className="h-14 rounded-xl px-5"><Search aria-hidden="true" />Search</Button>
        </div>
      </form>
    </section>
  );
}

const TH = "h-table-header px-2.5 font-semibold text-foreground";
const TD = "px-2.5 py-2 align-top";
const ACTION = "h-8 text-body";

interface TableProps {
  customers: boolean;
  searching: boolean;
  loading: boolean;
  data?: PersonSearch;
  onEdit: (person: PersonSummary) => void;
  onMerge: (person: PersonSummary) => void;
  onAttach: (person: PersonSummary) => void;
}

function PeopleTable({ customers, searching, loading, data, onEdit, onMerge, onAttach }: TableProps) {
  const label = customers ? "Customers" : "Travelers";
  if (loading && !data) {
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-card py-3.5 shadow-card" aria-busy="true" aria-label={`Loading ${label.toLowerCase()}`}>
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-table-row rounded-sm" />)}
      </div>
    );
  }
  const message = data && data.results.length === 0
    ? (searching ? "No saved person matches this search." : "No saved people yet. They are added from bookings, or with Add Customer.")
    : null;
  if (message || !data) {
    return (
      <section aria-label={label} className="rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
        <p className="text-body text-muted-foreground">{message}</p>
      </section>
    );
  }
  return (
    <section aria-label={label} className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
      {!searching && (
        <p className="text-label text-muted-foreground">
          The {RECENT_LIMIT} most recent people (latest booking first). Search by CNIC, passport number, phone, email or name (at least {MIN_SEARCH_LENGTH} characters) to find anyone else.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-table">
          <thead>
            {customers ? (
              <tr className="bg-muted text-left">
                <th scope="col" className={TH}>Name</th>
                <th scope="col" className={TH}>Phone</th>
                <th scope="col" className={TH}>Email</th>
                <th scope="col" className={TH}>Last booking</th>
                <th scope="col" className={TH}>Actions</th>
              </tr>
            ) : (
              <tr className="bg-muted text-left">
                <th scope="col" className={TH}>Name as on passport</th>
                <th scope="col" className={TH}>Nationality</th>
                <th scope="col" className={TH}>Date of birth</th>
                <th scope="col" className={TH}>Document type</th>
                <th scope="col" className={TH}>Document expiry</th>
                <th scope="col" className={TH}>Actions</th>
              </tr>
            )}
          </thead>
          <tbody>
            {data.results.map(person => {
              const name = fullName(person);
              const documents = person.documents ?? [];
              return (
                <tr key={person.id} className="border-b border-border last:border-b-0">
                  <td className={`${TD} max-w-[14rem]`}>
                    <Link to={personPath(person.id)} className="block truncate font-semibold text-foreground hover:underline" title={name}>{name}</Link>
                  </td>
                  {customers ? (
                    <>
                      <td className={`${TD} whitespace-nowrap text-foreground`}>{person.phone ?? "—"}</td>
                      <td className={`${TD} max-w-[14rem]`}><span className="block truncate text-foreground" title={person.email ?? undefined}>{person.email ?? "—"}</span></td>
                      <td className={`${TD} whitespace-nowrap tabular-nums text-foreground`}>{formatDateTime(person.last_booking_at)}</td>
                    </>
                  ) : (
                    <>
                      <td className={`${TD} whitespace-nowrap text-foreground`}>{person.nationality ?? "—"}</td>
                      <td className={`${TD} whitespace-nowrap tabular-nums text-foreground`}>{formatDay(person.date_of_birth) || "—"}</td>
                      <td className={`${TD} whitespace-nowrap text-foreground`}>
                        {documents.length ? documents.map(document => <span key={document.id} className="block">{ID_TYPE_LABEL[document.id_type]} {document.document_number}</span>) : "—"}
                      </td>
                      <td className={`${TD} text-foreground`}>
                        {documents.length ? documents.map(document => (
                          <span key={document.id} className="flex items-center gap-1.5 whitespace-nowrap tabular-nums">
                            {formatDay(document.document_expiry) || "—"}<ValidityBadge validity={document.document_validity} />
                          </span>
                        )) : "—"}
                      </td>
                    </>
                  )}
                  <td className={TD}>
                    <div className="flex flex-wrap gap-1.5">
                      {data.can_manage && <Button variant="outline" size="sm" className={ACTION} aria-label={`Edit ${name}`} onClick={() => onEdit(person)}>Edit</Button>}
                      {customers && data.can_merge && (
                        <Button variant="outline" size="sm" className={ACTION} aria-label={`Merge duplicates of ${name}`} onClick={() => onMerge(person)}>Merge duplicates</Button>
                      )}
                      {!customers && data.can_manage && (
                        <Button variant="outline" size="sm" className={ACTION} aria-label={`Attach document for ${name}`} onClick={() => onAttach(person)}>Attach document</Button>
                      )}
                      {customers && (
                        <Button asChild variant="outline" size="sm" className={ACTION}>
                          <Link to={personPath(person.id)} aria-label={`View bookings of ${name}`}>View bookings</Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
