interface RoadmapPlaceholderPageProps {
  /** Menu name from the spec. */
  title: string;
  /** The spec's wording for this screen (docs/spec-v3.md). Omit when the spec has none. */
  description?: string;
}

/** Placeholder for a spec menu without a built screen: the menu name and the spec's text only. */
export function RoadmapPlaceholderPage({ title, description }: RoadmapPlaceholderPageProps) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold font-display">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export default RoadmapPlaceholderPage;
