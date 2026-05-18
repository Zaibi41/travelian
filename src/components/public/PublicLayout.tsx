import { PublicNavbar } from "./PublicNavbar";
import { PublicFooter } from "./PublicFooter";

export function PublicLayout({ children, showFooter = true }: { children: React.ReactNode; showFooter?: boolean }) {
  return (
    <div className={showFooter ? "min-h-screen flex flex-col" : "h-dvh overflow-hidden flex flex-col"}>
      <PublicNavbar />
      <main className={showFooter ? "flex-1" : "flex-1 min-h-0 overflow-hidden"}>{children}</main>
      {showFooter && <PublicFooter />}
    </div>
  );
}
