import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    isAdmin: isAdminEmail(user.email),
  });
}
