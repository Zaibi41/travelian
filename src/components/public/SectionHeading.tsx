interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

export function SectionHeading({ eyebrow, title, description, align = "left" }: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div className={centered ? "text-center" : ""}>
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>}
      <h2 className="font-display text-xl font-black tracking-tight text-foreground md:text-2xl">{title}</h2>
      {description && (
        <p className={`mt-2 text-sm leading-6 text-muted-foreground ${centered ? "mx-auto max-w-2xl" : "max-w-3xl"}`}>{description}</p>
      )}
    </div>
  );
}
