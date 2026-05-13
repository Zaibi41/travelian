import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article";
  jsonLd?: object | object[];
}

const SITE_NAME = "Travelian";
const DEFAULT_IMAGE = "/placeholder.svg";

export function SEO({ title, description, canonical, image = DEFAULT_IMAGE, type = "website", jsonLd }: SEOProps) {
  const fullTitle = title.length > 60 ? title.slice(0, 57) + "…" : title;
  const desc = description.length > 160 ? description.slice(0, 157) + "…" : description;
  const url = canonical || (typeof window !== "undefined" ? window.location.href : "");
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {url && <link rel="canonical" href={url} />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={image} />
      {blocks.map((b, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(b)}</script>
      ))}
    </Helmet>
  );
}
