import { SEO } from "@/components/SEO";
import { useSiteSwitches } from "@/lib/site-switches";

const NotFound = () => {
  const { umrah } = useSiteSwitches(); // D39: Umrah wording only when Umrah is switched on
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SEO title="Page not found | Travelian" description={`The requested page could not be found. Return to Travelian to search flights${umrah ? ", hotels and Umrah packages" : " and hotels"}.`} noIndex />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
