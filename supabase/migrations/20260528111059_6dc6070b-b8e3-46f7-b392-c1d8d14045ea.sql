
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_college_created_idx ON public.messages (college_id, created_at);

GRANT SELECT ON public.messages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages public read"
  ON public.messages FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Verified can insert messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = profile_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.verification_status = 'verified'
        AND p.college_id = messages.college_id
    )
  );

CREATE POLICY "Owner can update messages"
  ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = profile_id);

CREATE POLICY "Owner can delete messages"
  ON public.messages FOR DELETE TO authenticated USING (auth.uid() = profile_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
