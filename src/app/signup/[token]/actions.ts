"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function redeemInvite(args: {
  token: string;
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invites")
    .select("id, email, expires_at, used_at")
    .eq("token", args.token)
    .maybeSingle();

  if (!invite) return { ok: false, error: "Invalid invite" };
  if (invite.used_at) return { ok: false, error: "Invite already used" };
  if (invite.expires_at && new Date(invite.expires_at) < new Date())
    return { ok: false, error: "Invite expired" };

  const submittedEmail = args.email.trim().toLowerCase();
  if (invite.email && invite.email.toLowerCase() !== submittedEmail) {
    return { ok: false, error: "This invite is reserved for a different email" };
  }

  if (args.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: submittedEmail,
    password: args.password,
    email_confirm: true,
  });
  if (error) return { ok: false, error: error.message };

  await admin
    .from("invites")
    .update({
      used_at: new Date().toISOString(),
      used_by: created.user.id,
      used_email: submittedEmail,
    })
    .eq("id", invite.id);

  return { ok: true };
}
