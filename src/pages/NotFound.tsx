import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useSiteSwitches } from "@/lib/site-switches";

// Shown inside the public layout, so the visitor keeps the header, footer and a way on.
const NotFound = () => {
  const { umrah } = useSiteSwitches(); // D39: Umrah wording only when Umrah is switched on
  return (
    <section className="travelian-container flex min-h-[60vh] items-center justify-center py-12">
      <SEO title="Page not found | Travelian" description={`The requested page could not be found. Return to Travelian to search flights${umrah ? ", hotels and Umrah packages" : " and hotels"}.`} noIndex />
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-primary">Error 404</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">This link is broken or the page has moved. Search flights from the home page, or open one of these pages.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="min-h-11 rounded-xl px-5"><Link to="/">Go to home page</Link></Button>
          <Button asChild variant="outline" className="min-h-11 rounded-xl px-5"><Link to="/group-ticketing">Group Ticketing</Link></Button>
          <Button asChild variant="outline" className="min-h-11 rounded-xl px-5"><Link to="/contact">Contact us</Link></Button>
        </div>
      </div>
    </section>
  );
};

export default NotFound;
