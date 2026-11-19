// D41: a page that fails to load or crashes never leaves a blank screen. The layout (menu, header) stays and the page
// area says what happened, with a Reload button. A page whose code file can't be fetched (a deploy replaced it, or the
// dev server's dependency cache went stale) reloads once by itself, which fetches the current files.
import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

const RELOADED_KEY = "travelian.page-reload";

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(message);
}

function reloadOnce(): boolean {
  try {
    const here = window.location.pathname + window.location.search;
    if (sessionStorage.getItem(RELOADED_KEY) === here) return false;
    sessionStorage.setItem(RELOADED_KEY, here);
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

interface State { error: unknown }

export class PageErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown) {
    console.error("Page failed", error);
    if (isChunkLoadError(error)) reloadOnce();
  }

  render() {
    if (!this.state.error) return this.props.children;
    const loading = isChunkLoadError(this.state.error);
    return (
      <section role="alert" className="mx-auto mt-6 flex max-w-xl flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
        <span className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
          <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
          This page couldn't load
        </span>
        <p className="text-sm text-muted-foreground">
          {loading
            ? "The page's files couldn't be downloaded, usually because the site was just updated. Reload to get the latest version."
            : "Something went wrong while showing this page. Reload to try again; if it keeps happening, tell the Travelian team."}
        </p>
        <button type="button" onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Reload
        </button>
      </section>
    );
  }
}
