import { PublicNavbar } from "./PublicNavbar";
import { Navigate, useLocation } from "react-router-dom";
import { isPublicPathVisible } from "@/lib/public-services";
import { PublicFooter } from "./PublicFooter";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { MoveToTopButton } from "@/components/MoveToTopButton";
import { whatsappUrl } from "@/lib/site-config";

export function PublicLayout({ children, showFooter = true }: { children: React.ReactNode; showFooter?: boolean }) {
  const { pathname, search } = useLocation();
  if (!isPublicPathVisible(pathname + search)) return <Navigate to="/" replace />;
  return (
    <div className={showFooter ? "min-h-screen overflow-x-hidden flex flex-col" : "h-dvh overflow-hidden flex flex-col"}>
      <PublicNavbar />
      <main className={showFooter ? "min-w-0 flex-1 overflow-x-hidden pt-16 xl:pt-24" : "flex-1 min-h-0 overflow-hidden pt-16 xl:pt-24"}>{children}</main>
      {showFooter && (
        <>
        <MoveToTopButton />
        <a
          href={whatsappUrl("Assalam o Alaikum Travelian, I need help with a booking.")}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with Travelian on WhatsApp"
          className="group fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full bg-primary/95 p-1.5 pr-1.5 sm:pr-5 text-primary-foreground shadow-xl ring-1 ring-white/15 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary hover:shadow-2xl"
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


