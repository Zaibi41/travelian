import { lazy, useState, type ComponentType } from "react";

/**
 * React.lazy with a preload(). Once the page's code is loaded it renders straight away, without
 * the Suspense "Loading page…" fallback, so a prerendered page is not swapped for a loading line.
 */
export function lazyPage<P extends object>(load: () => Promise<{ default: ComponentType<P> }>) {
  let loaded: ComponentType<P> | undefined;
  const preload = () => load().then(module => { loaded = module.default; return module; });
  const Lazy = lazy(preload);
  function Page(props: P) {
    // Decided once per mount, so a re-render after loading never remounts the page.
    const [Component] = useState(() => (loaded ?? Lazy) as ComponentType<P>);
    return <Component {...props} />;
  }
  return Object.assign(Page, { preload });
}
