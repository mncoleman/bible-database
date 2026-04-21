import crypto from "crypto";

export type TelegramAuthData = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

// https://core.telegram.org/widgets/login#checking-authorization
export function verifyTelegramAuth(data: TelegramAuthData, botToken: string): boolean {
  if (!data?.hash || !data?.auth_date || !data?.id) return false;

  const { hash, ...fields } = data;

  const checkString = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const computed = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");

  if (!timingSafeEqualHex(computed, hash)) return false;

  const age = Math.floor(Date.now() / 1000) - data.auth_date;
  if (age < 0 || age > MAX_AUTH_AGE_SECONDS) return false;

  return true;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export function parseTelegramAuthData(raw: unknown): TelegramAuthData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === "number" ? r.id : Number(r.id);
  const auth_date = typeof r.auth_date === "number" ? r.auth_date : Number(r.auth_date);

  if (!Number.isFinite(id) || !Number.isFinite(auth_date)) return null;
  if (typeof r.hash !== "string" || typeof r.first_name !== "string") return null;

  return {
    id,
    auth_date,
    hash: r.hash,
    first_name: r.first_name,
    last_name: typeof r.last_name === "string" ? r.last_name : undefined,
    username: typeof r.username === "string" ? r.username : undefined,
    photo_url: typeof r.photo_url === "string" ? r.photo_url : undefined,
  };
}
