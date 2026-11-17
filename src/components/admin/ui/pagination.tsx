import { Button } from "./button";

/** Previous / "Page 2 of 5" / Next, right-aligned (public button shape, small size). */
export function Pagination({ page, pages, onPage, label = "Pages" }: { page: number; pages: number; onPage: (page: number) => void; label?: string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label={label} className="flex items-center justify-end gap-2 text-body text-muted-foreground">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span className="tabular-nums">Page {page} of {pages}</span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </nav>
  );
}
