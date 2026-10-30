import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { useRole } from "@/contexts/RoleContext";
import { getSession } from "@/lib/auth-session";
import { changeAccountPassword, updateAccountName } from "@/lib/cognito-auth";
import { roleLabel } from "@/lib/admin-navigation";

export type ProfileAction = "view" | "edit" | "password";

export function AdminProfileDialog({ action, onClose, onEdit, onRestoreFocus }: { action: ProfileAction; onClose: () => void; onEdit: () => void; onRestoreFocus: () => void }) {
  const { currentUser, currentRole } = useRole();
  const [name, setName] = useState(currentUser.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const session = getSession();
  const canUpdate = session?.provider === "Cognito" && !!session.accessToken;
  const title = action === "view" ? "View profile" : action === "edit" ? "Edit profile" : "Change password";
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    if (action === "password" && newPassword !== confirmation) { setError("New passwords do not match."); return; }
    if (action === "password" && currentPassword === newPassword) { setError("Choose a different new password."); return; }
    submitting.current = true;
    setBusy(true);
    try {
      if (action === "edit") await updateAccountName(name);
      else await changeAccountPassword(currentPassword, newPassword);
      if (!active.current) return;
      toast.success(action === "edit" ? "Profile updated" : "Password changed", { id: "account-update" });
      onClose();
    } catch (failure) {
      if (active.current) setError(failure instanceof Error ? failure.message : "Your account could not be updated. Please try again.");
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  };
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }} className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 motion-reduce:!animate-none sm:max-w-md">
      <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14 text-left">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{action === "password" ? "Enter your current password and choose a new one." : "Your Travelian account details."}</DialogDescription>
      </DialogHeader>
      {action === "view" ? <>
        <dl className="min-h-0 space-y-4 overflow-y-auto p-6 text-sm">
          {[['Full name', currentUser.name], ['Email', currentUser.email], ['Account role', roleLabel(currentRole)]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
        </dl>
        <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4"><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={onEdit}>Edit profile</Button></div>
      </> : <form onSubmit={submit} className="flex min-h-0 flex-col">
        <div className="min-h-0 space-y-4 overflow-y-auto p-6">
          {!canUpdate && <p role="alert" className="text-sm text-destructive">Please sign in with your Travelian account to update these details.</p>}
          {action === "edit" ? <>
            <div className="space-y-2"><Label htmlFor="profile-name">Full name</Label><Input id="profile-name" name="name" autoComplete="name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} disabled={busy} /></div>
            <div className="space-y-2"><Label htmlFor="profile-email">Email</Label><Input id="profile-email" value={currentUser.email} readOnly autoComplete="email" /><p className="text-xs text-muted-foreground">Your sign-in email stays the same.</p></div>
          </> : <>
            <div className="space-y-2"><Label htmlFor="current-password">Current password</Label><PasswordInput id="current-password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} disabled={busy} /></div>
            <div className="space-y-2"><Label htmlFor="new-password">New password</Label><PasswordInput id="new-password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} disabled={busy} /></div>
            <div className="space-y-2"><Label htmlFor="confirm-new-password">Confirm new password</Label><PasswordInput id="confirm-new-password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} /></div>
          </>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || !canUpdate}>{busy && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}{action === "edit" ? "Save changes" : "Change password"}</Button></div>
      </form>}
    </DialogContent>
  </Dialog>;
}
