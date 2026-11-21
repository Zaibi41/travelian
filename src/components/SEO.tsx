import { SITE_URL } from "@/lib/site-config";
import { Helmet } from "react-helmet-async";
import { isPrivatePath } from "@/lib/private-paths";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article";
  jsonLd?: object | object[];
  noIndex?: boolean;
  /** Trail after Home, e.g. [{ name: "FAQ", path: "/faq" }]: emits a BreadcrumbList. */
  breadcrumbs?: { name: string; path: string }[];
}

const SITE_NAME = "Travelian";
const DEFAULT_IMAGE = "/og-image.png";

export function SEO({ title, description, canonical, image = DEFAULT_IMAGE, type = "website", jsonLd, noIndex: noIndexProp = false, breadcrumbs }: SEOProps) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const noIndex = noIndexProp || isPrivatePath(pathname);
  const fullTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;
  const desc = description.length > 160 ? description.slice(0, 157) + "..." : description;
  const url = canonical || new URL(pathname, SITE_URL).href;
  const imageUrl = new URL(image, SITE_URL).href;
  const isDefaultImage = image === DEFAULT_IMAGE;
  const blocks: object[] = jsonLd ? (Array.isArray(jsonLd) ? [...jsonLd] : [jsonLd]) : [];
  if (breadcrumbs?.length) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [{ name: "Home", path: "/" }, ...breadcrumbs].map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: new URL(crumb.path, SITE_URL).href,
      })),
    });
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      <meta name="description" content={desc} />
      {!noIndex && url && <link rel="canonical" href={url} />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      {!noIndex && url && <meta property="og:url" content={url} />}
      <meta property="og:image" content={imageUrl} />
      {isDefaultImage && <meta property="og:image:width" content="1200" />}
      {isDefaultImage && <meta property="og:image:height" content="630" />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={imageUrl} />
      {blocks.map((b, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(b)}</script>
      ))}
    </Helmet>
  );
}
