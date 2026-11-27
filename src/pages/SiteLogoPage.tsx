import { PageHeading } from "@/components/admin/TabbedAdminPage";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/ui/input";
import { uploadImage } from "@/lib/admin-uploads";
import { gatewayPut } from "@/lib/gateway/client";
import { getPaymentMethods } from "@/lib/public-booking";

const FALLBACK = "/travelian-logo-wordmark.png";

// Website & CMS > Site logo (B13, D38): the logo is uploaded to S3 from here and the public site reads it from the
// gateway, so changing it needs no code change or redeploy. The database keeps only the S3 key and URL.
export default function SiteLogoPage() {
  const queryClient = useQueryClient();
  const current = useQuery({ queryKey: ["site-logo"], queryFn: ({ signal }) => getPaymentMethods(signal) });
  const [preview, setPreview] = useState<{ key: string; url?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const save = useMutation({
    mutationFn: () => gatewayPut("/v1/admin/site-assets/{slot}", { asset_key: preview!.key }, {
      pathParams: { slot: "site_logo" }, unavailableMessage: "The logo couldn't be saved right now. Nothing was changed.",
    }),
    onSuccess: () => {
      toast.success("Site logo updated. The public site shows it on the next page load.");
      setPreview(null);
      void queryClient.invalidateQueries({ queryKey: ["site-logo"] });
    },
    onError: (problem) => setError(problem.message),
  });
  const pick = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadImage("site_logo", file);
      setPreview({ key: uploaded.assetKey, url: uploaded.publicUrl });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The image couldn't be uploaded.");
    } finally {
      setUploading(false);
    }
  };
  const live = current.data?.logo_url || FALLBACK;
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <div>
        <PageHeading className="font-display text-page-title font-bold text-foreground">Site logo</PageHeading>
        <p className="text-body text-muted-foreground">The logo in the public site's header. PNG, JPEG or WebP, up to 2 MB; stored in S3.</p>
      </div>
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-card shadow-card">
        <div className="flex flex-wrap items-center gap-6">
          <figure className="flex flex-col gap-1">
            <figcaption className="text-label text-muted-foreground">On the site now{current.data?.logo_url ? "" : " (built-in)"}</figcaption>
            <img src={live} alt="Current site logo" className="h-12 w-auto max-w-[14rem] rounded border bg-white object-contain p-1" />
          </figure>
          {preview?.url && (
            <figure className="flex flex-col gap-1">
              <figcaption className="text-label text-muted-foreground">New (not saved yet)</figcaption>
              <img src={preview.url} alt="New site logo" className="h-12 w-auto max-w-[14rem] rounded border bg-white object-contain p-1" />
            </figure>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Choose a new logo" disabled={uploading || save.isPending}
            className="max-w-xs" onChange={(event) => void pick(event.target.files?.[0])} />
          <Button variant="primary" disabled={!preview || uploading || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save logo"}
          </Button>
          {uploading && <span className="text-label text-muted-foreground">Uploading…</span>}
        </div>
        {error && <p role="alert" className="text-body text-status-critical-text">{error}</p>}
      </section>
    </div>
  );
}
