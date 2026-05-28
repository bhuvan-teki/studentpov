import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Copy, Calendar, MessageSquare, Sparkles, Pencil, Building2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useProfile } from "@/lib/useProfile";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/")({
  head: () => ({ meta: [{ title: "Your profile — Studentpov" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading } = useProfile();
  const navigate = useNavigate();
  const [collegeName, setCollegeName] = useState<string | null>(null);
  const [stats, setStats] = useState({ posts: 0, messages: 0 });

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      if (profile.college_id) {
        const { data } = await supabase
          .from("colleges").select("name").eq("id", profile.college_id).maybeSingle();
        setCollegeName(data?.name ?? null);
      }
      const [reviews, messages] = await Promise.all([
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("profile_id", profile.id),
      ]);
      setStats({ posts: reviews.count ?? 0, messages: messages.count ?? 0 });
    })();
  }, [profile]);

  if (loading || !profile) {
    return (
      <main className="min-h-screen grid place-items-center text-muted-foreground text-sm">
        Loading profile…
      </main>
    );
  }

  const copyId = async () => {
    await navigator.clipboard.writeText(profile.id);
    toast.success("Profile ID copied");
  };

  const joined = new Date(profile.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 md:px-6 py-6 md:py-10">
        <button
          onClick={() => history.back()}
          className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-white/[0.05]">
          <div className="relative">
            <Avatar
              url={profile.avatar_url}
              seed={profile.avatar_seed}
              name={profile.anonymous_username}
              size={96}
              className="ring-1 ring-white/10"
            />
            <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] md:text-[26px] font-semibold tracking-tight truncate">
                {profile.anonymous_username ?? "anonymous"}
              </h1>
              {profile.verification_status === "verified" && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                  <BadgeCheck className="h-3 w-3" /> verified
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] text-muted-foreground line-clamp-2 max-w-xl">
              {profile.bio || "No bio yet. Add one from Edit Profile."}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                to="/profile/edit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-3 py-1.5 text-[12px] text-foreground/90 transition"
              >
                <Pencil className="h-3 w-3" /> Edit profile
              </Link>
              <button
                onClick={copyId}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-transparent hover:bg-white/[0.04] px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground transition"
              >
                <Copy className="h-3 w-3" /> Copy ID
              </button>
            </div>
          </div>
        </div>

        {/* Meta grid */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.05]">
          <Stat icon={<Building2 className="h-3.5 w-3.5" />} label="College" value={collegeName ?? "—"} />
          <Stat icon={<Calendar className="h-3.5 w-3.5" />} label="Joined" value={joined} />
          <Stat icon={<MessageSquare className="h-3.5 w-3.5" />} label="Posts" value={String(stats.posts + stats.messages)} />
          <Stat icon={<Sparkles className="h-3.5 w-3.5" />} label="Reputation" value={String(profile.reputation_score)} />
        </div>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-background px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
        {icon} {label}
      </div>
      <div className="mt-1.5 text-[14px] font-medium text-foreground truncate">{value}</div>
    </div>
  );
}
