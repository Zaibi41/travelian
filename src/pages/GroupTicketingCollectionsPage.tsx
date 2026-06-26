import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, KeyRound, Loader2, Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  deleteGroupTicketingCollection,
  listGroupTicketingCollections,
  saveGroupTicketingCollection,
  type GroupTicketingCollectionInput,
  type GroupTicketingCollectionRecord,
} from "@/lib/group-ticketing-collections-api";
import { setGroupTicketCollectionMaps } from "@/lib/group-ticketing";

const INTEGRATION_PROVIDERS = [
  { value: "alhaider", label: "Al Haider API" },
  { value: "dhilluandsahi", label: "Dhillon & Sahi API" },
  { value: "skypass", label: "Skypass API" },
  { value: "travelntours", label: "Travel n Tours API" },
] as const;

const emptyForm: GroupTicketingCollectionInput = {
  slug: "",
  publicLabel: "",
  supplierName: "",
  providerId: "",
  integrationProvider: "alhaider",
  secretId: "",
  sortOrder: 0,
  enabled: true,
};

export default function GroupTicketingCollectionsPage() {
  const [collections, setCollections] = useState<GroupTicketingCollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<GroupTicketingCollectionInput>(emptyForm);
  const [originalSlug, setOriginalSlug] = useState<string | undefined>();

  const load = () => {
    setLoading(true);
    listGroupTicketingCollections()
      .then((items) => {
        setCollections(items);
        setGroupTicketCollectionMaps(items);
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setOriginalSlug(undefined);
    setForm({ ...emptyForm, sortOrder: collections.length + 1 });
    setDialogOpen(true);
  };

  const openEdit = (collection: GroupTicketingCollectionRecord) => {
    setOriginalSlug(collection.slug);
    setForm({
      slug: collection.slug,
      publicLabel: collection.publicLabel,
      supplierName: collection.supplierName,
      providerId: collection.providerId,
      integrationProvider: collection.integrationProvider || "alhaider",
      secretId: collection.secretId,
      sortOrder: collection.sortOrder ?? 0,
      enabled: collection.enabled !== false,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveGroupTicketingCollection({
        ...form,
        originalSlug,
      });
      toast.success(originalSlug ? "Collection updated" : "Collection created");
      setDialogOpen(false);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save collection");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (slug: string) => {
    if (!window.confirm(`Disable collection "${slug}"?`)) return;
    try {
      await deleteGroupTicketingCollection(slug);
      toast.success("Collection disabled");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete collection");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Group Ticketing Collections</h1>
          <p className="text-sm text-muted-foreground">
            Manage public collection names, category slugs, and supplier mappings. Changes are saved to the database and used on the website.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/group-ticketing" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> View public page
            </Link>
          </Button>
          <Button className="gap-2 gradient-primary text-primary-foreground" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add collection
          </Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <Ticket className="h-5 w-5 text-primary" />
            Collection mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Public label</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Integration</TableHead>
                  <TableHead>Supplier code</TableHead>
                  <TableHead>Category slug</TableHead>
                  <TableHead>Secret</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((collection) => (
                  <TableRow key={collection.slug}>
                    <TableCell className="font-medium">{collection.publicLabel}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{collection.supplierName}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{collection.integrationProvider || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{collection.providerId || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{collection.slug}</TableCell>
                    <TableCell>
                      <Link
                        to="/admin/secrets"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {collection.secretId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={collection.enabled !== false && !collection.deletedAt ? "default" : "outline"}>
                        {collection.enabled !== false && !collection.deletedAt ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEdit(collection)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => remove(collection.slug)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(90vh,100dvh)] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
            <DialogTitle>{originalSlug ? "Edit collection" : "Add collection"}</DialogTitle>
            <DialogDescription>
              The public label is shown on the website. The category slug is used in URLs like `/group-ticketing/collection-1`.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="publicLabel">Public label (frontend text)</Label>
                <Input
                  id="publicLabel"
                  value={form.publicLabel}
                  onChange={(event) => setForm((current) => ({ ...current, publicLabel: event.target.value }))}
                  placeholder="Group Collection 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Category slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="collection-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierName">Supplier name</Label>
                <Input
                  id="supplierName"
                  value={form.supplierName}
                  onChange={(event) => setForm((current) => ({ ...current, supplierName: event.target.value }))}
                  placeholder="AH"
                />
                <p className="text-xs text-muted-foreground">Shown in View Details, resolved by category slug.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="integrationProvider">API integration</Label>
                <Select
                  value={form.integrationProvider || "alhaider"}
                  onValueChange={(value) => setForm((current) => ({ ...current, integrationProvider: value }))}
                >
                  <SelectTrigger id="integrationProvider">
                    <SelectValue placeholder="Select integration" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEGRATION_PROVIDERS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Controls which supplier API fetches tickets. Safe to rename supplier code separately.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="providerId">Supplier code (optional)</Label>
                  <Input
                    id="providerId"
                    value={form.providerId}
                    onChange={(event) => setForm((current) => ({ ...current, providerId: event.target.value }))}
                    placeholder="ah"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={form.sortOrder ?? 0}
                    onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secretId">Secrets Manager path</Label>
                <Input
                  id="secretId"
                  value={form.secretId}
                  onChange={(event) => setForm((current) => ({ ...current, secretId: event.target.value }))}
                  placeholder="travelian/providers/alhaider"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <p className="text-sm font-medium">Active on website</p>
                  <p className="text-xs text-muted-foreground">Disabled collections are hidden from public listings.</p>
                </div>
                <Switch
                  checked={form.enabled !== false}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, enabled: checked }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
