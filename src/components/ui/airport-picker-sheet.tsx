import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// The phone airport picker (issue #148), shared by the public site and the admin. On phones a dropdown under the
// field ends up behind the on-screen keyboard, so From and To open this full-screen picker instead: a back arrow and
// title, the search box at the top (focused), and the list in the space above the keyboard, scrolling inside.
// It uses the same Radix dialog as the search calendar (src/components/ui/calendar-popup.tsx) and the same layer,
// so it sits above the navbar and any open dialog (Modify Search), locks the page scroll and traps the focus.
// Only the presentation lives here; each field keeps its own airport data, matching and what it submits.

export interface AirportPickerOption {
  code: string;
  city: string;
  /** Second line: the airport name (and country where the field shows it). */
  detail: string;
}

export interface AirportPickerSection {
  id: string;
  label: string;
  options: AirportPickerOption[];
}

interface AirportPickerSheetProps {
  open: boolean;
  /** "Where from?" / "Where to?" */
  title: string;
  query: string;
  onQueryChange: (query: string) => void;
  sections: AirportPickerSection[];
  /** Loading or error line under the list (e.g. while the full airport directory loads). */
  status?: ReactNode;
  selectedCode?: string;
  onSelect: (code: string) => void;
  /** Back arrow, Escape, swipe back or the browser back button: closes without a change. */
  onClose: () => void;
  placeholder?: string;
}

/* ---------- Browser back closes the picker ----------
   Opening pushes one history entry (same URL, same router state plus a marker), so swipe back / the back button
   closes the picker instead of leaving the page. Closing any other way removes that entry again (history.back()),
   so the history stays clean. A picker that opens while the previous one's entry is still being removed (From
   chosen, To opens next) waits for that first. */
const MARKER = "travelianAirportPicker";
let pendingBack: Promise<void> | null = null;

function removeOwnEntry() {
  if (typeof window === "undefined" || !(window.history.state && window.history.state[MARKER])) return;
  const done = new Promise<void>(resolve => {
    const finish = () => {
      window.removeEventListener("popstate", finish);
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, 400);
    window.addEventListener("popstate", finish);
  });
  pendingBack = done;
  void done.then(() => {
    if (pendingBack === done) pendingBack = null;
  });
  window.history.back();
}

function useHistoryEntry(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    let pushed = false;
    const onPop = () => {
      if (!live || !pushed) return;
      pushed = false;
      closeRef.current();
    };
    void (pendingBack ?? Promise.resolve()).then(() => {
      if (!live) return;
      window.history.pushState({ ...(window.history.state ?? {}), [MARKER]: true }, "");
      pushed = true;
      window.addEventListener("popstate", onPop);
    });
    return () => {
      live = false;
      window.removeEventListener("popstate", onPop);
      if (pushed) removeOwnEntry();
    };
  }, [open]);
}

/** The visible height above the on-screen keyboard (visualViewport), so the list is never hidden behind it. */
function useVisibleViewport(open: boolean) {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const viewport = typeof window === "undefined" ? undefined : window.visualViewport;
    if (!open || !viewport) return undefined;
    const update = () => setBox({ top: viewport.offsetTop, height: viewport.height });
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [open]);
  return box;
}

export function AirportPickerSheet({
  open, title, query, onQueryChange, sections, status, selectedCode, onSelect, onClose, placeholder = "City, airport or code",
}: AirportPickerSheetProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);
  const box = useVisibleViewport(open);
  useHistoryEntry(open, onClose);

  const flat = sections.flatMap(section => section.options.map(option => ({ section: section.id, option })));
  const optionId = (section: string, code: string) => `${listId}-${section}-${code}`;
  // No row is marked before typing (a tap list); typing marks the best match, which Enter picks.
  const activeItem = active >= 0 ? flat[Math.min(active, flat.length - 1)] : undefined;
  const typed = query.trim();

  useEffect(() => { setActive(typed ? 0 : -1); }, [typed, open]);
  useEffect(() => {
    if (!open || !activeItem) return;
    document.getElementById(optionId(activeItem.section, activeItem.option.code))?.scrollIntoView?.({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follow the active row only
  }, [active, open]);

  let index = -1;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={next => { if (!next) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          data-airport-picker=""
          onOpenAutoFocus={event => {
            event.preventDefault();
            inputRef.current?.focus({ preventScroll: true });
          }}
          style={{ top: box?.top ?? 0, height: box ? box.height : undefined }}
          className="fixed inset-x-0 top-0 z-[1130] flex h-[100dvh] flex-col bg-background text-foreground outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none"
        >
          <div className="shrink-0 border-b border-border bg-card px-2 pb-3 pt-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Back"
                onClick={onClose}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <DialogPrimitive.Title className="min-w-0 truncate font-display text-lg font-bold leading-tight">{title}</DialogPrimitive.Title>
            </div>
            <div className="relative mt-2 px-2">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                role="combobox"
                aria-label={title}
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeItem ? optionId(activeItem.section, activeItem.option.code) : undefined}
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={placeholder}
                value={query}
                onChange={event => onQueryChange(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    if (!flat.length) return;
                    setActive(current => Math.max(0, Math.min(flat.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))));
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    if (activeItem) onSelect(activeItem.option.code);
                  }
                }}
                // 16px text: phones don't zoom into the field when it takes the focus.
                className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
              />
            </div>
          </div>

          <div ref={listRef} id={listId} role="listbox" aria-label="Airports" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
            {sections.map(section => section.options.length > 0 && (
              <div key={section.id} role="group" aria-labelledby={`${listId}-${section.id}`} className="pt-3">
                <p id={`${listId}-${section.id}`} className="px-3 pb-1 text-xs font-semibold text-muted-foreground">{section.label}</p>
                {section.options.map(option => {
                  index += 1;
                  const position = index;
                  const isActive = activeItem?.section === section.id && activeItem.option.code === option.code;
                  return (
                    <div
                      key={option.code}
                      id={optionId(section.id, option.code)}
                      role="option"
                      aria-selected={selectedCode === option.code}
                      data-active={isActive || undefined}
                      onPointerMove={() => setActive(position)}
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => onSelect(option.code)}
                      className={cn(
                        "flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                        isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{option.city}</span>
                        <span className="block truncate text-xs text-muted-foreground" title={option.detail}>{option.detail}</span>
                      </span>
                      <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-bold tracking-wide text-foreground">{option.code}</span>
                    </div>
                  );
                })}
              </div>
            ))}
            {typed && flat.length === 0 && !status && (
              <div role="status" className="px-3 py-8 text-center">
                <p className="text-sm font-semibold text-foreground">No airports match "{typed}"</p>
                <p className="mt-1 text-sm text-muted-foreground">Try a city, airport name or 3-letter code.</p>
              </div>
            )}
            {status}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
