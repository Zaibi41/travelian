import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

type PackageImageProps = {
  src?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
};

export function PackageImage({ src, alt, className, imageClassName }: PackageImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  return (
    <div className={cn("flex items-center justify-center overflow-hidden bg-primary/10", className)}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          className={cn("h-full w-full object-cover", imageClassName)}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <Package className="h-14 w-14 text-primary" aria-label="Travelian package image placeholder" />
      )}
    </div>
  );
}
