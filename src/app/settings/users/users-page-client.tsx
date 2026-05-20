"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Copy, Trash2, Link2, Mail, UserPlus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  createInvite,
  deleteUser,
  revokeInvite,
  type AdminUser,
  type Invite,
} from "./actions";

type Props = {
  initialUsers: AdminUser[];
  initialInvites: Invite[];
};

const EXPIRY_OPTIONS = [
  { label: "1 day", value: 1 },
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "Never", value: 0 },
];

function inviteUrl(token: string) {
  if (typeof window === "undefined") return `/signup/${token}`;
  return `${window.location.origin}/signup/${token}`;
}

function inviteStatus(invite: Invite): { label: string; tone: "active" | "used" | "expired" } {
  if (invite.used_at) return { label: "Used", tone: "used" };
  if (invite.expires_at && new Date(invite.expires_at) < new Date())
    return { label: "Expired", tone: "expired" };
  return { label: "Active", tone: "active" };
}

export function UsersPageClient({ initialUsers, initialInvites }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [invites, setInvites] = useState(initialInvites);
  const [isPending, startTransition] = useTransition();

  const [inviteMode, setInviteMode] = useState<"email" | "open">("email");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteExpiryDays, setInviteExpiryDays] = useState<number>(7);
  const [inviteNote, setInviteNote] = useState("");

  const handleCreateInvite = () => {
    if (inviteMode === "email" && !inviteEmail.trim()) {
      toast.error("Email required");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createInvite({
          email: inviteMode === "email" ? inviteEmail.trim() : null,
          expiresInDays: inviteExpiryDays === 0 ? null : inviteExpiryDays,
          note: inviteNote.trim() || null,
        });
        setInvites([created, ...invites]);
        setInviteEmail("");
        setInviteNote("");
        // Auto-copy the link for convenience
        const url = inviteUrl(created.token);
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Invite created and link copied", {
            description: url,
          });
        } catch {
          toast.success("Invite created", { description: url });
        }
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  };

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed — select and copy manually");
    }
  };

  const handleRevoke = (id: string) => {
    if (!confirm("Revoke this invite? The link will stop working.")) return;
    startTransition(async () => {
      try {
        await revokeInvite(id);
        setInvites(invites.filter((i) => i.id !== id));
        toast.success("Invite revoked");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  };

  const handleDeleteUser = (id: string, email: string | null) => {
    if (!confirm(`Delete ${email ?? "this user"}? Their data will be cascaded.`)) return;
    startTransition(async () => {
      try {
        await deleteUser(id);
        setUsers(users.filter((u) => u.id !== id));
        toast.success("User deleted");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Settings
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm">
          Manage who can sign in to Bible Tracker.
        </p>
      </div>

      {/* Create invite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5" /> Create invite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={inviteMode === "email" ? "default" : "outline"}
              onClick={() => setInviteMode("email")}
              type="button"
              size="sm"
            >
              <Mail className="w-4 h-4 mr-1.5" /> Bound to email
            </Button>
            <Button
              variant={inviteMode === "open" ? "default" : "outline"}
              onClick={() => setInviteMode("open")}
              type="button"
              size="sm"
            >
              <Link2 className="w-4 h-4 mr-1.5" /> Open link
            </Button>
          </div>

          {inviteMode === "email" ? (
            <div className="space-y-2">
              <Label htmlFor="invite-email">Recipient email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="person@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Only this address will be accepted at signup.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Anyone with this link can sign up with any email — single use.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="invite-expiry">Expires</Label>
              <Select
                value={String(inviteExpiryDays)}
                onValueChange={(v) => v && setInviteExpiryDays(Number(v))}
              >
                <SelectTrigger id="invite-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-note">Note (optional)</Label>
              <Input
                id="invite-note"
                placeholder="e.g. 'cousin sarah'"
                value={inviteNote}
                onChange={(e) => setInviteNote(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleCreateInvite} disabled={isPending}>
            {isPending ? "Creating…" : "Create invite"}
          </Button>
        </CardContent>
      </Card>

      {/* Invites list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invites</CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invites yet.</p>
          ) : (
            <ul className="divide-y">
              {invites.map((inv) => {
                const status = inviteStatus(inv);
                return (
                  <li key={inv.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {inv.email ?? "Open invite"}
                          </span>
                          <Badge
                            variant={
                              status.tone === "active"
                                ? "default"
                                : status.tone === "used"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {status.label}
                          </Badge>
                          {inv.note && (
                            <span className="text-muted-foreground text-xs">
                              {inv.note}
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          Created {format(parseISO(inv.created_at), "MMM d, h:mm a")}
                          {inv.expires_at &&
                            ` · Expires ${format(parseISO(inv.expires_at), "MMM d")}`}
                          {!inv.expires_at && " · Never expires"}
                          {inv.used_at &&
                            ` · Used by ${inv.used_email ?? "user"} ${format(parseISO(inv.used_at), "MMM d, h:mm a")}`}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {status.tone === "active" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy(inv.token)}
                              title="Copy invite link"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevoke(inv.id)}
                              disabled={isPending}
                              title="Revoke invite"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {status.tone !== "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevoke(inv.id)}
                            disabled={isPending}
                            title="Delete invite"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Users list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {users.map((u) => (
              <li key={u.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{u.email ?? "(no email)"}</div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    Joined {format(parseISO(u.created_at), "MMM d, yyyy")}
                    {u.last_sign_in_at &&
                      ` · Last seen ${format(parseISO(u.last_sign_in_at), "MMM d, h:mm a")}`}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteUser(u.id, u.email)}
                  disabled={isPending}
                  title="Delete user"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
