import { getSessionUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export const ADMIN_EMAIL = "mncoleman003@gmail.com";

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.email !== ADMIN_EMAIL) redirect("/today");
  return user;
}

export function isAdminEmail(email: string | null | undefined) {
  return email === ADMIN_EMAIL;
}
