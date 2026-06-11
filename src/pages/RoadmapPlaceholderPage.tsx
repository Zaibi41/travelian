import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";

interface RoadmapPlaceholderPageProps {
  title: string;
  description?: string;
  eta?: string;
}

export function RoadmapPlaceholderPage({ title, description, eta }: RoadmapPlaceholderPageProps) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {description || "This module is on the Travelian roadmap and will be built in an upcoming sprint."}
        </p>
      </div>
      <EmptyState
        icon={Sparkles}
        title={`${title} is on the roadmap`}
        description={`${description || "This admin module has not been built yet."}${eta ? ` Planned: ${eta}.` : ""} Until then, we kept the link visible so the navigation reflects the real product map.`}
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
