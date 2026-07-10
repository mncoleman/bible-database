"use server";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export async function redeemInvite(args: {
  token: string;
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (args.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }
  const submittedEmail = args.email.trim().toLowerCase();

  const client = await db.connect();
  try {
    await client.query("begin");

    const { rows } = await client.query<{
      id: string;
      email: string | null;
      expires_at: string | null;
      used_at: string | null;
    }>(
      "select id, email, expires_at, used_at from invites where token = $1 for update",
      [args.token]
    );
    const invite = rows[0];

    if (!invite) {
      await client.query("rollback");
      return { ok: false, error: "Invalid invite" };
    }
    if (invite.used_at) {
      await client.query("rollback");
      return { ok: false, error: "Invite already used" };
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await client.query("rollback");
      return { ok: false, error: "Invite expired" };
    }
    if (invite.email && invite.email.toLowerCase() !== submittedEmail) {
      await client.query("rollback");
      return { ok: false, error: "This invite is reserved for a different email" };
    }

    const { rows: existing } = await client.query(
      "select 1 from users where lower(email) = $1",
      [submittedEmail]
    );
    if (existing[0]) {
      await client.query("rollback");
      return { ok: false, error: "An account with this email already exists" };
    }

    const passwordHash = await hashPassword(args.password);
    const { rows: created } = await client.query<{ id: string }>(
      "insert into users (email, password_hash) values ($1, $2) returning id",
      [submittedEmail, passwordHash]
    );

    await client.query(
      `update invites
       set used_at = now(), used_by = $1, used_email = $2
       where id = $3`,
      [created[0].id, submittedEmail, invite.id]
    );

    await client.query("commit");
    return { ok: true };
  } catch (e) {
    await client.query("rollback");
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Signup failed",
    };
  } finally {
    client.release();
  }
}
