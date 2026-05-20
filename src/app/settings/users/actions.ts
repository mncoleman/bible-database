"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

export type Invite = {
  id: string;
  token: string;
  email: string | null;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_by: string | null;
  used_email: string | null;
  note: string | null;
};

export async function listUsers(): Promise<AdminUser[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw new Error(error.message);
  return data.users.map((u) => ({
    id: u.id,
    email: u.email ?? null,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }));
}

export async function listInvites(): Promise<Invite[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invites")
    .select("id, token, email, created_at, expires_at, used_at, used_by, used_email, note")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Invite[];
}

export async function createInvite(args: {
  email: string | null;
  expiresInDays: number | null;
  note: string | null;
}): Promise<Invite> {
  const user = await requireAdmin();
  const admin = createAdminClient();

  const token = crypto.randomBytes(24).toString("base64url");
  const expires_at = args.expiresInDays
    ? new Date(Date.now() + args.expiresInDays * 86400_000).toISOString()
    : null;

  const { data, error } = await admin
    .from("invites")
    .insert({
      token,
      email: args.email,
      expires_at,
      note: args.note,
      created_by: user.id,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/settings/users");
  return data as Invite;
}

export async function revokeInvite(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("invites").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
}

export async function deleteUser(id: string) {
  const me = await requireAdmin();
  if (me.id === id) throw new Error("Cannot delete yourself");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
}
