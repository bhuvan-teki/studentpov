
-- COLLEGES
CREATE TABLE public.colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email_domain TEXT UNIQUE,
  logo_url TEXT,
  description TEXT,
  total_verified_students INT NOT NULL DEFAULT 0,
  live_active_students INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.colleges TO anon, authenticated;
GRANT ALL ON public.colleges TO service_role;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Colleges are public" ON public.colleges FOR SELECT TO anon, authenticated USING (true);

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL,
  content TEXT NOT NULL,
  branch TEXT,
  year TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Verified can insert reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.verification_status = 'verified'));
CREATE POLICY "Owner can update reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- VERIFICATION DOCUMENTS
CREATE TABLE public.verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.verification_documents TO authenticated;
GRANT ALL ON public.verification_documents TO service_role;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can view docs" ON public.verification_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert docs" ON public.verification_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup, match college by email domain
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain TEXT;
  v_college_id UUID;
BEGIN
  v_domain := lower(split_part(NEW.email, '@', 2));
  SELECT id INTO v_college_id FROM public.colleges WHERE lower(email_domain) = v_domain;
  INSERT INTO public.profiles (id, email, college_id, verification_status)
  VALUES (
    NEW.id,
    NEW.email,
    v_college_id,
    CASE WHEN v_college_id IS NOT NULL THEN 'verified' ELSE 'pending' END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed colleges
INSERT INTO public.colleges (name, slug, email_domain, description, total_verified_students, live_active_students) VALUES
('Chaitanya Deemed to be University', 'chaitanya-deemed', 'chaitanya.edu.in', 'Real student reviews, placement reality, campus life, and guidance.', 4821, 312),
('Indian Institute of Technology Bombay', 'iit-bombay', 'iitb.ac.in', 'Verified IIT-B community — placements, research, hostel life.', 12430, 1284),
('VIT Vellore', 'vit-vellore', 'vitstudent.ac.in', 'The unfiltered student perspective on VIT campus life.', 9120, 678),
('BITS Pilani', 'bits-pilani', 'pilani.bits-pilani.ac.in', 'Honest takes on academics, fests, and placements.', 6740, 489),
('Manipal Institute of Technology', 'manipal-mit', 'learner.manipal.edu', 'What Manipal really feels like, from the people living it.', 5120, 401),
('SRM Institute of Science and Technology', 'srm-ist', 'srmist.edu.in', 'The reality of SRM — beyond brochures.', 7890, 562);
