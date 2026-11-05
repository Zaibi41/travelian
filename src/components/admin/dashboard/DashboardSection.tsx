interface DashboardSectionProps {
  id: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}

export function DashboardSection({ id, title, hint, children }: DashboardSectionProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <h2 id={id} className="text-section font-semibold text-foreground">{title}</h2>
        {hint && <p className="text-label text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
