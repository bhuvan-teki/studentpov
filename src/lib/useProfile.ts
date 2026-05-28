import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Profile = {
  id: string;
  email?: string | null;
  anonymous_username: string | null;
  avatar_seed: string | null;
  avatar_url: string | null;
  bio: string | null;
  reputation_score: number;
  college_id: string | null;
  verification_status: string;
  created_at: string;
};

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, email, anonymous_username, avatar_seed, avatar_url, bio, reputation_score, college_id, verification_status, created_at",
      )
      .eq("id", user.id)
      .maybeSingle();
    setProfile((data ?? null) as Profile | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void refresh();
  }, [authLoading, refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => setProfile((p) => (p ? { ...p, ...(payload.new as Profile) } : p)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  return { profile, loading: authLoading || loading, refresh };
}
