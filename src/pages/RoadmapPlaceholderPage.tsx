import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";

interface RoadmapPlaceholderPageProps {
  /** Menu name from the spec. */
  title: string;
  /** The spec's wording for this screen. Omit when the spec has none: only the name is shown. */
  description?: string;
}

export function RoadmapPlaceholderPage({ title, description }: RoadmapPlaceholderPageProps) {
  const navigate = useNavigate();
  if (!description) {
    return <h1 className="text-2xl font-bold font-display">{title}</h1>;
  }
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <EmptyState
        icon={Sparkles}
        title={`${title} is on the roadmap`}
        description={description}
      />
      <div>
        <Button variant="outline" onClick={() => navigate("/admin")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

export default RoadmapPlaceholderPage;
