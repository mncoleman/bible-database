import "server-only";
import { db } from "@/lib/db";

export type DbUser = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  last_sign_in_at: string | null;
};

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const { rows } = await db.query<DbUser>(
    "select * from users where lower(email) = lower($1)",
    [email.trim()]
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const { rows } = await db.query<DbUser>("select * from users where id = $1", [
    id,
  ]);
  return rows[0] ?? null;
}

export async function touchLastSignIn(id: string): Promise<void> {
  await db.query("update users set last_sign_in_at = now() where id = $1", [id]);
}
