import { useState } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { EmptyState, LoadingCards, Notice, Panel, PanelHeader } from "@/components/admin/ui/feedback";
import { FieldShell, Input, Textarea } from "@/components/admin/ui/field";
import { Tag } from "@/components/admin/ui/StatusBadge";
import {
  ANNOUNCEMENT_MAX_LENGTH, localInputToIso, useAllAnnouncements, useAnnouncementActions, type ManagedAnnouncement,
} from "@/lib/admin-announcements";

// Website & CMS > Announcements (#92, Super Admin): post, end and delete the short messages every staff member sees in
// the admin top bar. Stored in the gateway; the gateway checks the role and the text.

const STATUS_LABEL: Record<ManagedAnnouncement["status"], string> = { active: "In top bar", scheduled: "Scheduled", ended: "Ended" };
const STATUS_TONE: Record<ManagedAnnouncement["status"], "teal" | "navy" | "neutral"> = { active: "teal", scheduled: "navy", ended: "neutral" };

const when = (value?: string | null) => (value ? new Date(value).toLocaleString() : null);

export default function AnnouncementsPage() {
  const list = useAllAnnouncements();
  const { create, end, remove } = useAnnouncementActions();
  const [message, setMessage] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ManagedAnnouncement | null>(null);
  const trimmed = message.trim();

  const post = () => {
    if (!trimmed) return;
    setFormError(null);
    create.mutate({ message: trimmed, starts_at: localInputToIso(startsAt), ends_at: localInputToIso(endsAt) }, {
      onSuccess: () => {
        setMessage("");
        setStartsAt("");
        setEndsAt("");
        toast.success("Announcement posted. Staff see it in the top bar within a minute.");
      },
      onError: problem => setFormError(problem.message),
    });
  };

  const endNow = (item: ManagedAnnouncement) => end.mutate(item.id, {
    onSuccess: () => toast.success("Announcement ended. It's no longer in the top bar."),
    onError: problem => toast.error(problem.message),
  });

  const deleteNow = (item: ManagedAnnouncement) => remove.mutate(item.id, {
    onSuccess: () => {
      setConfirmDelete(null);
      toast.success("Announcement deleted.");
    },
    onError: problem => toast.error(problem.message),
  });

  const items = list.data?.items ?? [];
  return (
    <div className="mx-auto flex max-w-3xl min-w-0 flex-col gap-section-gap">
      <div>
        <h1 className="flex items-center gap-2 font-display text-page-title font-bold text-foreground"><Megaphone aria-hidden="true" className="h-6 w-6 shrink-0 text-primary" /> Announcements</h1>
        <p className="mt-1 text-body text-muted-foreground">Short messages every staff member sees in the admin top bar, on any device.</p>
      </div>

      <Panel as="section" aria-labelledby="announcement-new" className="flex flex-col gap-3">
        <PanelHeader id="announcement-new" title="New announcement" />
        <FieldShell id="announcement-message" label="Announcement text" error={formError ?? undefined}
          hint={`${message.length}/${ANNOUNCEMENT_MAX_LENGTH} characters. Plain text only.`}>
          <Textarea id="announcement-message" value={message} maxLength={ANNOUNCEMENT_MAX_LENGTH} rows={3}
            aria-describedby={formError ? "announcement-message-error" : "announcement-message-hint"} aria-invalid={formError ? true : undefined}
            onChange={event => { setMessage(event.target.value); setFormError(null); }} placeholder="Airblue tickets are Rs 200 less today" />
        </FieldShell>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldShell id="announcement-start" label="Start (optional)" hint="Leave empty to show it now.">
            <Input id="announcement-start" type="datetime-local" value={startsAt} aria-describedby="announcement-start-hint"
              onChange={event => { setStartsAt(event.target.value); setFormError(null); }} />
          </FieldShell>
          <FieldShell id="announcement-end" label="End (optional)" hint="Leave empty to show it until you end it.">
            <Input id="announcement-end" type="datetime-local" value={endsAt} aria-describedby="announcement-end-hint"
              onChange={event => { setEndsAt(event.target.value); setFormError(null); }} />
          </FieldShell>
        </div>
        <div className="flex justify-end">
          <Button variant="primary" onClick={post} disabled={!trimmed || create.isPending} className="w-full sm:w-auto">
            {create.isPending ? "Posting…" : "Post announcement"}
          </Button>
        </div>
      </Panel>

      <section aria-labelledby="announcements-list" className="flex flex-col gap-3">
        <h2 id="announcements-list" className="text-section font-semibold text-foreground">Posted announcements</h2>
        {list.isLoading && <LoadingCards count={2} label="Loading announcements" />}
        {list.error && <Notice tone="critical" title="Announcements couldn't be loaded">{list.error.message}</Notice>}
        {list.isSuccess && items.length === 0 && (
          <EmptyState title="No announcements yet">Post one above. It shows in every staff member's top bar.</EmptyState>
        )}
        {items.map(item => (
          <Panel key={item.id} as="article" className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="break-words text-body font-medium text-foreground">{item.message}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-helper text-muted-foreground">
                <Tag tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Tag>
                <span>Posted {when(item.created_at)}</span>
                {item.starts_at && <span>Starts {when(item.starts_at)}</span>}
                {item.status === "ended" && (item.ended_at || item.ends_at)
                  ? <span>Ended {when(item.ended_at ?? item.ends_at)}</span>
                  : item.ends_at && <span>Ends {when(item.ends_at)}</span>}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {item.status !== "ended" && (
                <Button variant="outline" onClick={() => endNow(item)} disabled={end.isPending && end.variables === item.id}
                  aria-label={`End announcement: ${item.message}`} className="flex-1 sm:flex-none">End</Button>
              )}
              <Button variant="ghost" onClick={() => setConfirmDelete(item)} aria-label={`Delete announcement: ${item.message}`}
                className="flex-1 text-destructive sm:flex-none">Delete</Button>
            </div>
          </Panel>
        ))}
      </section>

      <Dialog open={!!confirmDelete} onOpenChange={open => { if (!open && !remove.isPending) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this announcement?</DialogTitle>
            <DialogDescription className="break-words">{confirmDelete?.message}</DialogDescription>
          </DialogHeader>
          <p className="text-body text-muted-foreground">It is removed from the top bar and from this list.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={remove.isPending}>Cancel</Button>
            <Button variant="danger" onClick={() => confirmDelete && deleteNow(confirmDelete)} disabled={remove.isPending}>
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
