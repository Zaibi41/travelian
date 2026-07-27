import { PublicNavbar } from "./PublicNavbar";
import { PublicFooter } from "./PublicFooter";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { MoveToTopButton } from "@/components/MoveToTopButton";
import { whatsappUrl } from "@/lib/site-config";

export function PublicLayout({ children, showFooter = true }: { children: React.ReactNode; showFooter?: boolean }) {
  return (
    <div className={showFooter ? "min-h-screen overflow-x-hidden flex flex-col" : "h-dvh overflow-hidden flex flex-col"}>
      <PublicNavbar />
      <main className={showFooter ? "min-w-0 flex-1 overflow-x-hidden" : "flex-1 min-h-0 overflow-hidden"}>{children}</main>
      {showFooter && (
        <>
        <MoveToTopButton />
        <a
          href={whatsappUrl("Hi, I need help with a Travelian booking.")}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with Travelian on WhatsApp"
          className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-xl shadow-emerald-900/20 transition-transform hover:scale-105"
        >
          <WhatsAppIcon className="h-7 w-7" />
        </a>
        </>
      )}
      {showFooter && <PublicFooter />}
    </div>
  );
}


