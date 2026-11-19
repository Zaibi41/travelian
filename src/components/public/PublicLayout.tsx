import { PublicNavbar } from "./PublicNavbar";
import { Navigate, useLocation } from "react-router-dom";
import { isPublicPathVisible } from "@/lib/public-services";
import { PublicFooter } from "./PublicFooter";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { MoveToTopButton } from "@/components/MoveToTopButton";
import { whatsappUrl } from "@/lib/site-config";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { isUmrahPath, useSiteSwitches } from "@/lib/site-switches";
import NotFound from "@/pages/NotFound";

export function PublicLayout({ children, showFooter = true }: { children: React.ReactNode; showFooter?: boolean }) {
  const { pathname, search } = useLocation();
  const { loaded, umrah } = useSiteSwitches();
  if (!isPublicPathVisible(pathname + search)) return <Navigate to="/" replace />;
  // D39: with Umrah switched off, its URLs show the normal "page not found" state, never a working page.
  const hidden = isUmrahPath(pathname + search) && !umrah;
  const page = hidden ? (loaded ? <NotFound /> : null) : children;
  return (
    <div className={showFooter ? "min-h-screen overflow-x-hidden flex flex-col" : "h-dvh overflow-hidden flex flex-col"}>
      <PublicNavbar />
      <main className={showFooter ? "min-w-0 flex-1 overflow-x-hidden" : "flex-1 min-h-0 overflow-hidden"}><PageErrorBoundary key={pathname}>{page}</PageErrorBoundary></main>
      {showFooter && (
        <>
        <MoveToTopButton />
        <a
          href={whatsappUrl("Assalam o Alaikum Travelian, I need help with a booking.")}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with Travelian on WhatsApp"
          // Checkout has its own WhatsApp Help button in its action row; on phones the floating one would cover those buttons.
          className={`group fixed bottom-5 right-5 z-50 ${pathname === "/booking" ? "hidden md:flex" : "flex"} items-center gap-3 rounded-full bg-primary/95 p-1.5 pr-1.5 sm:pr-5 text-primary-foreground shadow-xl ring-1 ring-white/15 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary hover:shadow-2xl`}
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-md transition-transform duration-300 group-hover:scale-105">
            <span className="absolute inset-0 rounded-full bg-whatsapp/50 animate-ping opacity-40" aria-hidden="true" />
            <WhatsAppIcon className="relative h-6 w-6" />
          </span>
          <span className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-bold">Chat with Travelian</span>
            <span className="text-[11px] font-medium text-gold">Online support</span>
          </span>
        </a>

        </>
      )}
      {showFooter && <PublicFooter />}
    </div>
  );
}


