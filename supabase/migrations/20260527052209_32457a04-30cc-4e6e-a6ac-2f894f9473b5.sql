
-- CHANNELS
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  category text NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, slug)
);
GRANT SELECT ON public.channels TO anon, authenticated;
GRANT ALL ON public.channels TO service_role;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Channels public read" ON public.channels FOR SELECT USING (true);

-- POSTS
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  channel_slug text NOT NULL,
  content text NOT NULL,
  branch text,
  year text,
  media_url text,
  media_type text,
  voice_url text,
  location text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_college_channel ON public.posts (college_id, channel_slug, created_at DESC);
GRANT SELECT ON public.posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts public read" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Verified students can insert posts" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.verification_status = 'verified'
    )
  );
CREATE POLICY "Owner can update posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REPORTS
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporter can insert reports" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporter can view own reports" ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES
  ('studentpov-images', 'studentpov-images', true),
  ('studentpov-videos', 'studentpov-videos', true),
  ('studentpov-voice', 'studentpov-voice', true),
  ('studentpov-documents', 'studentpov-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Studentpov media public read"
ON storage.objects FOR SELECT
USING (bucket_id IN ('studentpov-images','studentpov-videos','studentpov-voice','studentpov-documents'));

CREATE POLICY "Verified students can upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('studentpov-images','studentpov-videos','studentpov-voice','studentpov-documents')
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.verification_status = 'verified'
  )
);

CREATE POLICY "Owner can delete own media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('studentpov-images','studentpov-videos','studentpov-voice','studentpov-documents')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- SEED CHANNELS for Chaitanya
INSERT INTO public.channels (college_id, category, name, slug, position)
SELECT c.id, x.category, x.name, x.slug, x.position
FROM public.colleges c
CROSS JOIN (VALUES
  ('Start Here','welcome','welcome',1),
  ('Start Here','ask seniors','ask-seniors',2),
  ('Start Here','college overview','college-overview',3),
  ('Admissions','admission process','admission-process',10),
  ('Admissions','fee structure','fee-structure',11),
  ('Admissions','hidden costs','hidden-costs',12),
  ('Placements','placement reality','placement-reality',20),
  ('Placements','internships','internships',21),
  ('Academics','faculty reviews','faculty-reviews',30),
  ('Academics','exam difficulty','exam-difficulty',31),
  ('Campus Life','hostel life','hostel-life',40),
  ('Campus Life','food quality','food-quality',41),
  ('Warnings & Truth','reality check','reality-check',50),
  ('Media','placement proof','placement-proof',60),
  ('Media','campus photos','campus-photos',61),
  ('Free Talk','general chat','general-chat',70)
) AS x(category, name, slug, position)
WHERE c.slug = 'chaitanya-deemed'
ON CONFLICT DO NOTHING;
