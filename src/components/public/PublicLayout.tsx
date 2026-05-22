import { PublicNavbar } from "./PublicNavbar";
import { PublicFooter } from "./PublicFooter";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function PublicLayout({ children, showFooter = true }: { children: React.ReactNode; showFooter?: boolean }) {
  return (
    <div className={showFooter ? "min-h-screen flex flex-col" : "h-dvh overflow-hidden flex flex-col"}>
      <PublicNavbar />
      <main className={showFooter ? "flex-1" : "flex-1 min-h-0 overflow-hidden"}>{children}</main>
      {showFooter && (
        <a
          href="https://wa.me/923244440014?text=Hi%2C%20I%20need%20help%20with%20a%20Travelian%20booking."
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with Travelian on WhatsApp"
          className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-emerald-900/20 transition-transform hover:scale-105"
        >
          <WhatsAppIcon className="h-7 w-7" />
        </a>
      )}
      {showFooter && <PublicFooter />}
    </div>
  );
}
