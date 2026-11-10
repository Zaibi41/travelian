import { StatusBadge } from "@/components/admin/StatusBadge";
import type { SavedDocument } from "@/lib/saved-people/api";
import { ID_TYPE_LABEL, VALIDITY_LABEL } from "@/lib/saved-people/states";

const VALIDITY_SEVERITY = { valid: "fine", expiring: "action", expired: "critical" } as const;

/** A document's validity as a colored chip that always carries its text label. */
export function ValidityBadge({ validity }: { validity?: SavedDocument["document_validity"] }) {
  return validity ? <StatusBadge severity={VALIDITY_SEVERITY[validity]}>{VALIDITY_LABEL[validity]}</StatusBadge> : null;
}

/** Masked documents, one line each: type, country, last 3 characters, expiry year, validity. */
export function MaskedDocuments({ documents }: { documents: SavedDocument[] }) {
  if (documents.length === 0) return <p className="text-body text-muted-foreground">No documents saved.</p>;
  return (
    <ul className="flex flex-col gap-1">
      {documents.map(document => (
        <li key={document.id} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-body text-foreground">
          <span className="truncate">
            {ID_TYPE_LABEL[document.id_type]} · {document.document_country} · {document.document_number_masked}
            {document.document_expiry_masked ? ` · expires ${document.document_expiry_masked}` : ""}
          </span>
          <ValidityBadge validity={document.document_validity} />
        </li>
      ))}
    </ul>
  );
}
