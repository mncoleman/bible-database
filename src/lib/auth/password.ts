import "server-only";
import bcrypt from "bcryptjs";

// GoTrue stored bcrypt $2a$10 hashes; bcryptjs verifies those directly, so
// existing passwords survived the Supabase removal without a reset.
const COST = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
