interface Props {
  title: string;
  tagline: string;
}

export function PageHeader({ title, tagline }: Props) {
  return (
    <section className="gradient-hero py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold font-display text-primary-foreground tracking-tight">{title}</h1>
        <p className="text-primary-foreground/80 text-sm md:text-base mt-1.5">{tagline}</p>
      </div>
    </section>
  );
}
