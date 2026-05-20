import { requireAdmin } from "@/lib/admin";
import { listInvites, listUsers } from "./actions";
import { UsersPageClient } from "./users-page-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAdmin();
  const [users, invites] = await Promise.all([listUsers(), listInvites()]);
  return <UsersPageClient initialUsers={users} initialInvites={invites} />;
}
