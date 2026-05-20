import { createAdminClient } from "@/lib/supabase/admin";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function SignupPage({ params }: Props) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invites")
    .select("token, email, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-2">
          <h1 className="text-2xl font-bold">Invalid invite</h1>
          <p className="text-muted-foreground text-sm">
            This invite link is not recognized. Ask the admin for a new one.
          </p>
        </div>
      </div>
    );
  }

  if (invite.used_at) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-2">
          <h1 className="text-2xl font-bold">Invite already used</h1>
          <p className="text-muted-foreground text-sm">
            This invite has already been redeemed. If you already have an
            account, sign in instead.
          </p>
        </div>
      </div>
    );
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-2">
          <h1 className="text-2xl font-bold">Invite expired</h1>
          <p className="text-muted-foreground text-sm">
            This invite has expired. Ask the admin for a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SignupForm
      token={token}
      lockedEmail={invite.email}
    />
  );
}
