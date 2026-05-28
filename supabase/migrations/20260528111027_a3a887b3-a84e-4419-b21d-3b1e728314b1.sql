
-- 1. Add columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anonymous_username text,
  ADD COLUMN IF NOT EXISTS avatar_seed text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS reputation_score integer NOT NULL DEFAULT 0;

-- 2. Unique case-insensitive index for usernames
CREATE UNIQUE INDEX IF NOT EXISTS profiles_anonymous_username_unique
  ON public.profiles (lower(anonymous_username))
  WHERE anonymous_username IS NOT NULL;

-- 3. Bio length constraint
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_bio_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 120);

-- 4. Public read of anonymous profile fields (email column protected via column grants below)
DROP POLICY IF EXISTS "Profiles viewable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;
CREATE POLICY "Profiles public read"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Column-level grants: revoke wide SELECT, then grant only safe columns
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT
  (id, anonymous_username, avatar_seed, avatar_url, bio, reputation_score,
   college_id, verification_status, display_name, created_at)
  ON public.profiles TO anon, authenticated;

-- Owner needs to read own email (for settings page)
GRANT SELECT (email) ON public.profiles TO authenticated;

-- Make sure update/insert still work for owner
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 6. Update handle_new_user trigger to also seed an anonymous_username + avatar_seed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_domain TEXT;
  v_college_id UUID;
  v_username TEXT;
  v_adjectives TEXT[] := ARRAY['silent','hidden','rapid','midnight','shadow','bright','quiet','vivid','crimson','frost','lone','wild','swift','calm','noble'];
  v_animals TEXT[] := ARRAY['tiger','eagle','fox','wolf','panther','falcon','otter','raven','lynx','heron','bison','koala','viper','hawk','owl'];
  v_attempts INT := 0;
BEGIN
  v_domain := lower(split_part(NEW.email, '@', 2));
  SELECT id INTO v_college_id FROM public.colleges WHERE lower(email_domain) = v_domain;

  LOOP
    v_username := v_adjectives[1 + floor(random()*array_length(v_adjectives,1))::int]
                  || '_' || v_animals[1 + floor(random()*array_length(v_animals,1))::int]
                  || '_' || (100 + floor(random()*900))::int;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(anonymous_username) = lower(v_username));
    v_attempts := v_attempts + 1;
    EXIT WHEN v_attempts > 8;
  END LOOP;

  INSERT INTO public.profiles (id, email, college_id, verification_status, anonymous_username, avatar_seed)
  VALUES (
    NEW.id,
    NEW.email,
    v_college_id,
    CASE WHEN v_college_id IS NOT NULL THEN 'verified' ELSE 'pending' END,
    v_username,
    gen_random_uuid()::text
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
