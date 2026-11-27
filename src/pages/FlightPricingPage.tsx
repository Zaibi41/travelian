import { PageHeading } from "@/components/admin/TabbedAdminPage";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Plane } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { EmptyState, LoadingCards, Notice, Panel, PanelHeader } from "@/components/admin/ui/feedback";
import { FieldShell, Input } from "@/components/admin/ui/field";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { Tag } from "@/components/admin/ui/StatusBadge";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  AIRLINE_OPTIONS, airlineName, ruleAmountText, useFlightPricingActions, useFlightPricingRules, useFlightSuppliers,
  type FlightPricingRule, type FlightPricingRuleInput, type FlightSupplier,
} from "@/lib/flight-pricing";
import { cn } from "@/lib/utils";

// Pricing & Revenue > Flight Pricing & Rules (Super Admin): every flight supplier, and Rs-per-passenger rules on a
// supplier's fares (optionally one SooperFare source and/or one airline). The gateway stores the rules, applies them
// to live searches and booking prices (a negative rule takes its full amount off, even below cost); this page only shows and sends.

const ANY = "any";
const STATUS: Record<FlightSupplier["status"], { label: string; tone: "teal" | "navy" | "neutral" }> = {
  live: { label: "Live", tone: "teal" },
  not_public: { label: "Staff searches only", tone: "navy" },
  not_configured: { label: "Not set up", tone: "neutral" },
};

interface Draft { supplier: string; source: string; airline: string; amount: string; active: boolean }
const EMPTY: Draft = { supplier: "southair", source: ANY, airline: ANY, amount: "", active: true };

function AirlineSelect({ id, value, onChange }: { id: string; value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const label = value === ANY ? "Any airline" : `${airlineName(value)} (${value})`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button id={id} type="button" role="combobox" aria-expanded={open} aria-haspopup="listbox"
          className="flex h-control w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-left text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <span className="truncate" title={label}>{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] max-w-[calc(100vw-2rem)] p-0" collisionPadding={16}>
        <Command label="Search airline" filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder="Search airline or code" aria-label="Search airline" className="text-body" />
          <CommandList className="max-h-64">
            <CommandEmpty className="py-4 text-center text-body text-muted-foreground">No airline found.</CommandEmpty>
            {[{ code: ANY, name: "Any airline" }, ...AIRLINE_OPTIONS].map(option => (
              <CommandItem key={option.code} value={`${option.name} ${option.code === ANY ? "" : option.code}`}
                onSelect={() => { onChange(option.code); setOpen(false); }} className="gap-2 text-body">
                <Check className={cn("h-4 w-4 shrink-0", value === option.code ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                <span className="truncate">{option.name}</span>
                {option.code !== ANY && <span className="ml-auto shrink-0 text-helper text-muted-foreground">{option.code}</span>}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function FlightPricingPage() {
  const suppliersQuery = useFlightSuppliers();
  const rulesQuery = useFlightPricingRules();
  const { create, update, remove } = useFlightPricingActions();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FlightPricingRule | null>(null);

  const suppliers = useMemo(() => suppliersQuery.data?.suppliers ?? [], [suppliersQuery.data]);
  const rules = rulesQuery.data?.rules ?? [];
  const supplierByCode = useMemo(() => new Map(suppliers.map(supplier => [supplier.code, supplier])), [suppliers]);
  const chosen = supplierByCode.get(draft.supplier as FlightSupplier["code"]);
  const sourceName = (rule: { supplier: string; source?: string | null }) =>
    rule.source ? supplierByCode.get(rule.supplier as FlightSupplier["code"])?.sources?.find(s => s.code === rule.source)?.name ?? rule.source : "Any source";
  const supplierName = (code: string) => supplierByCode.get(code as FlightSupplier["code"])?.name ?? code;
  const saving = create.isPending || update.isPending;

  const change = (patch: Partial<Draft>) => { setDraft(current => ({ ...current, ...patch })); setFormError(null); };
  const startFor = (supplier: string) => {
    setEditingId(null);
    setDraft({ ...EMPTY, supplier });
    setFormError(null);
    document.getElementById("flight-rule-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const startEdit = (rule: FlightPricingRule) => {
    setEditingId(rule.id);
    setDraft({ supplier: rule.supplier, source: rule.source ?? ANY, airline: rule.airline_code ?? ANY, amount: String(rule.amount_minor / 100), active: rule.active ?? true });
    setFormError(null);
    document.getElementById("flight-rule-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const cancel = () => { setEditingId(null); setDraft(EMPTY); setFormError(null); };

  const save = () => {
    const rupees = Number(draft.amount.trim());
    if (!draft.supplier) return setFormError("Choose a supplier.");
    if (!draft.amount.trim() || !Number.isInteger(rupees) || rupees === 0) return setFormError("Enter the amount in whole rupees, for example -100 or 500.");
    const body: FlightPricingRuleInput = {
      supplier: draft.supplier as FlightPricingRuleInput["supplier"],
      source: draft.supplier === "sooperfare" && draft.source !== ANY ? draft.source : null,
      airline_code: draft.airline !== ANY ? draft.airline : null,
      amount_minor: rupees * 100,
      active: draft.active,
    };
    const done = (message: string) => { toast.success(message); cancel(); };
    const failed = (problem: Error) => setFormError(problem.message);
    if (editingId) update.mutate({ id: editingId, body }, { onSuccess: () => done("Rule updated. New searches use it within a minute."), onError: failed });
    else create.mutate(body, { onSuccess: () => done("Rule saved. New searches use it within a minute."), onError: failed });
  };

  const deleteNow = (rule: FlightPricingRule) => remove.mutate(rule.id, {
    onSuccess: () => { setConfirmDelete(null); if (editingId === rule.id) cancel(); toast.success("Rule deleted."); },
    onError: problem => toast.error(problem.message),
  });

  const scopeText = (rule: FlightPricingRule) => [
    supplierName(rule.supplier),
    rule.supplier === "sooperfare" ? `Source: ${rule.source ? sourceName(rule) : "Any"}` : null,
    `Airline: ${rule.airline_code ? `${airlineName(rule.airline_code)} (${rule.airline_code})` : "Any"}`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto flex max-w-5xl min-w-0 flex-col gap-section-gap">
      <div>
        <PageHeading className="flex items-center gap-2 font-display text-page-title font-bold text-foreground"><Plane aria-hidden="true" className="h-6 w-6 shrink-0 text-primary" /> Flight Pricing & Rules</PageHeading>
        <p className="mt-1 text-body text-muted-foreground">
          Add or take off an amount per passenger on a supplier's fares, for one airline or all. Taking an amount off can sell below the supplier's price.
        </p>
      </div>

      <section aria-labelledby="flight-suppliers" className="flex flex-col gap-3">
        <h2 id="flight-suppliers" className="text-section font-semibold text-foreground">Suppliers</h2>
        {suppliersQuery.isLoading && <LoadingCards count={3} label="Loading suppliers" className="sm:grid-cols-3" />}
        {suppliersQuery.error && <Notice tone="critical" title="Suppliers couldn't be loaded">{suppliersQuery.error.message}</Notice>}
        {suppliers.length > 0 && (
          <div className="grid gap-card-gap sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map(supplier => {
              const count = rules.filter(rule => rule.supplier === supplier.code).length;
              return (
                <Panel key={supplier.code} as="article" aria-label={supplier.name} data-testid="flight-supplier" className="flex flex-col gap-2">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <h3 className="truncate text-body font-semibold text-foreground" title={supplier.name}>{supplier.name}</h3>
                    <Tag tone={STATUS[supplier.status].tone}>{STATUS[supplier.status].label}</Tag>
                  </div>
                  {(supplier.sources ?? []).length > 0 && (
                    <p className="text-helper text-muted-foreground">Sources: {(supplier.sources ?? []).map(source => source.name).join(", ")}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <span className="text-helper text-muted-foreground">{count === 0 ? "No rules" : `${count} ${count === 1 ? "rule" : "rules"}`}</span>
                    <Button variant="outline" onClick={() => startFor(supplier.code)} aria-label={`Add rule for ${supplier.name}`}>Add rule</Button>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </section>

      <Panel as="section" id="flight-rule-form" aria-labelledby="flight-rule-title" className="flex scroll-mt-6 flex-col gap-3">
        <PanelHeader id="flight-rule-title" title={editingId ? "Edit rule" : "New rule"} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LabeledSelect id="flight-rule-supplier" label="Supplier" value={draft.supplier}
            options={suppliers.length ? suppliers.map(s => ({ value: s.code, label: s.name })) : [{ value: draft.supplier, label: "Loading…" }]}
            onChange={supplier => change({ supplier, source: ANY })} />
          {draft.supplier === "sooperfare" && (
            <LabeledSelect id="flight-rule-source" label="Source" value={draft.source}
              options={[{ value: ANY, label: "Any source" }, ...(chosen?.sources ?? []).map(s => ({ value: s.code, label: s.name }))]}
              onChange={source => change({ source })} />
          )}
          <FieldShell id="flight-rule-airline" label="Airline">
            <AirlineSelect id="flight-rule-airline" value={draft.airline} onChange={airline => change({ airline })} />
          </FieldShell>
          <FieldShell id="flight-rule-amount" label="Rs per passenger" hint="-100 takes Rs 100 off; 500 adds Rs 500." error={formError ?? undefined}>
            <Input id="flight-rule-amount" inputMode="numeric" value={draft.amount} placeholder="-100"
              aria-describedby={formError ? "flight-rule-amount-error" : "flight-rule-amount-hint"} aria-invalid={formError ? true : undefined}
              onChange={event => change({ amount: event.target.value.replace(/[^\d-]/g, "") })} />
          </FieldShell>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="flight-rule-active" className="flex items-center gap-2 text-body text-foreground">
            <Switch id="flight-rule-active" checked={draft.active} onCheckedChange={active => change({ active })} /> Active
          </label>
          <div className="flex gap-2">
            {editingId && <Button variant="outline" onClick={cancel} disabled={saving} className="flex-1 sm:flex-none">Cancel</Button>}
            <Button variant="primary" onClick={save} disabled={saving} className="flex-1 sm:flex-none">
              {saving ? "Saving…" : editingId ? "Update rule" : "Save rule"}
            </Button>
          </div>
        </div>
      </Panel>

      <section aria-labelledby="flight-rules" className="flex flex-col gap-3">
        <h2 id="flight-rules" className="text-section font-semibold text-foreground">Rules</h2>
        {rulesQuery.isLoading && <LoadingCards count={2} label="Loading rules" />}
        {rulesQuery.error && <Notice tone="critical" title="Rules couldn't be loaded">{rulesQuery.error.message}</Notice>}
        {rulesQuery.isSuccess && rules.length === 0 && (
          <EmptyState title="No rules yet">Fares are sold at the standard markup until you add a rule above.</EmptyState>
        )}
        {rules.map(rule => (
          <Panel key={rule.id} as="article" data-testid="flight-rule" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="truncate text-body font-semibold text-foreground" title={scopeText(rule)}>{scopeText(rule)}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-helper text-muted-foreground">
                <span className={cn("text-body font-semibold", rule.amount_minor < 0 ? "text-status-fine-text" : "text-foreground")}>
                  {ruleAmountText(rule.amount_minor)} per passenger
                </span>
                <Tag tone={rule.active ? "teal" : "neutral"}>{rule.active ? "Active" : "Off"}</Tag>
                <span>Updated {new Date(rule.updated_at).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" onClick={() => startEdit(rule)} aria-label={`Edit rule: ${scopeText(rule)}`} className="flex-1 sm:flex-none">Edit</Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(rule)} aria-label={`Delete rule: ${scopeText(rule)}`}
                className="flex-1 text-destructive sm:flex-none">Delete</Button>
            </div>
          </Panel>
        ))}
      </section>

      <Dialog open={!!confirmDelete} onOpenChange={open => { if (!open && !remove.isPending) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this rule?</DialogTitle>
            <DialogDescription className="break-words">
              {confirmDelete && `${scopeText(confirmDelete)}: ${ruleAmountText(confirmDelete.amount_minor)} per passenger`}
            </DialogDescription>
          </DialogHeader>
          <p className="text-body text-muted-foreground">New searches go back to the standard markup for these fares.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={remove.isPending}>Cancel</Button>
            <Button variant="danger" onClick={() => confirmDelete && deleteNow(confirmDelete)} disabled={remove.isPending}>
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
