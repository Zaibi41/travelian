import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PRERENDERED_PAGE_PRELOADS } from "@/pages/public/prerendered-pages";

const container = document.getElementById("root")!;
// A prerendered page (scripts/prerender.mjs) is already on screen. Load its code first, so React
// replaces it with the same page and not with the "Loading page…" line. (On any other URL the
// page's guard script has already emptied #root.)
const path = window.location.pathname.replace(/\/+$/, "") || "/";
const preload = container.dataset.prerendered === path ? PRERENDERED_PAGE_PRELOADS[path] : undefined;

Promise.resolve(preload?.())
  .catch(() => undefined)
  .then(() => createRoot(container).render(<App />));
