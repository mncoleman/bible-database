-- Invite system: admin creates invite links, recipients redeem to create account.
-- An invite is either bound to a specific email or open (any email may use it).
-- All invites are single-use.

CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  email text,                                                -- NULL = open invite
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,                                    -- NULL = never expires
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_email text,
  note text
);

CREATE INDEX IF NOT EXISTS invites_token_idx ON public.invites(token);
CREATE INDEX IF NOT EXISTS invites_created_by_idx ON public.invites(created_by);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Hardcoded admin policy. To add more admins, change the literal or migrate
-- to a user_roles table later.
CREATE POLICY "Admin can read invites" ON public.invites FOR SELECT
  USING ((auth.jwt() ->> 'email') = 'mncoleman003@gmail.com');

CREATE POLICY "Admin can insert invites" ON public.invites FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'email') = 'mncoleman003@gmail.com');

CREATE POLICY "Admin can update invites" ON public.invites FOR UPDATE
  USING ((auth.jwt() ->> 'email') = 'mncoleman003@gmail.com');

CREATE POLICY "Admin can delete invites" ON public.invites FOR DELETE
  USING ((auth.jwt() ->> 'email') = 'mncoleman003@gmail.com');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO anon, authenticated, service_role;
