"use server";

import { db } from "@/lib/db";
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
  const { rows } = await db.query<AdminUser>(
    "select id, email, created_at, last_sign_in_at from users order by created_at"
  );
  return rows;
}

export async function listInvites(): Promise<Invite[]> {
  await requireAdmin();
  const { rows } = await db.query<Invite>(
    `select id, token, email, created_at, expires_at, used_at, used_by, used_email, note
     from invites order by created_at desc`
  );
  return rows;
}

export async function createInvite(args: {
  email: string | null;
  expiresInDays: number | null;
  note: string | null;
}): Promise<Invite> {
  const user = await requireAdmin();

  const token = crypto.randomBytes(24).toString("base64url");
  const expires_at = args.expiresInDays
    ? new Date(Date.now() + args.expiresInDays * 86400_000).toISOString()
    : null;

  const { rows } = await db.query<Invite>(
    `insert into invites (token, email, expires_at, note, created_by)
     values ($1, $2, $3, $4, $5) returning *`,
    [token, args.email, expires_at, args.note, user.id]
  );

  revalidatePath("/settings/users");
  return rows[0];
}

export async function revokeInvite(id: string) {
  await requireAdmin();
  await db.query("delete from invites where id = $1", [id]);
  revalidatePath("/settings/users");
}

export async function deleteUser(id: string) {
  const me = await requireAdmin();
  if (me.id === id) throw new Error("Cannot delete yourself");
  // log_entries / user_settings / telegram_identities all cascade on delete.
  await db.query("delete from users where id = $1", [id]);
  revalidatePath("/settings/users");
}
