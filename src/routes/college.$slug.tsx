import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Hash, Heart, MessageCircle, Bookmark, Share2, Send, Star, ArrowLeft,
  TrendingUp, Users, Activity, Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type College = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  total_verified_students: number;
  live_active_students: number;
};

type Review = {
  id: string;
  user_id: string;
  channel: string;
  content: string;
  branch: string | null;
  year: string | null;
  created_at: string;
};

const CHANNEL_GROUPS: { label: string; channels: string[] }[] = [
  { label: "Start Here", channels: ["welcome", "ask-seniors", "college-overview"] },
  { label: "Admissions", channels: ["admission-process", "fee-structure", "hidden-costs", "management-quota"] },
  { label: "Placements", channels: ["placement-reality", "internship-opportunities", "highest-packages", "placement-scams"] },
  { label: "Academics", channels: ["faculty-reviews", "attendance-pressure", "exam-difficulty", "lab-facilities"] },
  { label: "Campus Life", channels: ["hostel-life", "food-quality", "campus-environment", "strictness"] },
  { label: "Warnings & Truth", channels: ["reality-check", "expectations-vs-reality", "scams-and-fines", "mental-pressure"] },
  { label: "Branches", channels: ["cse", "ai-ml", "ece", "mechanical", "mba"] },
  { label: "Guidance", channels: ["roadmap-guidance", "internships", "gate-preparation", "higher-studies"] },
  { label: "Media", channels: ["placement-proof", "campus-photos", "hostel-photos"] },
  { label: "Free Talk", channels: ["general-chat", "memes", "random"] },
];

export const Route = createFileRoute("/college/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} community — Studentpov` },
      { name: "description", content: "Verified student discussions, anonymous and honest." },
    ],
  }),
  component: CollegeServer,
});

function CollegeServer() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [college, setCollege] = useState<College | null>(null);
  const [activeChannel, setActiveChannel] = useState("welcome");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [verified, setVerified] = useState(false);
  const [composer, setComposer] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: c } = await supabase
        .from("colleges").select("*").eq("slug", slug).maybeSingle();
      if (!alive) return;
      if (!c) { navigate({ to: "/communities" }); return; }
      setCollege(c as College);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug, navigate]);

  useEffect(() => {
    if (!college) return;
    supabase
      .from("reviews")
      .select("*")
      .eq("college_id", college.id)
      .eq("channel", activeChannel)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setReviews((data ?? []) as Review[]));
  }, [college, activeChannel]);

  useEffect(() => {
    if (!user) { setVerified(false); return; }
    supabase
      .from("profiles")
      .select("verification_status")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setVerified(data?.verification_status === "verified"));
  }, [user]);

  const post = async () => {
    if (!user) { toast.error("Sign in to post"); return; }
    if (!verified) { toast.error("Only verified students can post"); return; }
    if (composer.trim().length < 2) return;
    if (!college) return;
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: user.id,
        college_id: college.id,
        channel: activeChannel,
        content: composer.trim(),
        branch: "CSE",
        year: "3rd Year",
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setReviews((r) => [data as Review, ...r]);
    setComposer("");
  };

  const initials = useMemo(
    () => college?.name.split(" ").slice(0, 2).map((s) => s[0]).join("") ?? "",
    [college],
  );

  if (loading || !college) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">Loading community…</div>;
  }

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      {/* LEFT SIDEBAR */}
      <aside className="w-[260px] shrink-0 border-r border-white/[0.04] flex flex-col bg-black/40">
        <div className="px-4 py-4 border-b border-white/[0.04] flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-white/20 to-white/5 border border-white/10 grid place-items-center text-[12px] font-semibold">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate">{college.name}</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">Server</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
          {CHANNEL_GROUPS.map((g) => (
            <div key={g.label}>
              <div className="px-2 mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
                {g.label}
              </div>
              <div>
                {g.channels.map((ch) => {
                  const active = ch === activeChannel;
                  return (
                    <button
                      key={ch}
                      onClick={() => setActiveChannel(ch)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition ${
                        active
                          ? "bg-white/[0.06] text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                      }`}
                    >
                      <Hash className="h-3.5 w-3.5 opacity-70" />
                      <span className="truncate">{ch}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Link
          to="/communities"
          className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.04] text-[12px] text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All communities
        </Link>
      </aside>

      {/* CENTER FEED */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="h-14 px-6 border-b border-white/[0.04] flex items-center gap-3">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[14px] font-semibold">{activeChannel}</h2>
          <span className="text-[12px] text-muted-foreground/70">· anonymous & verified</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
          {reviews.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <div className="text-[15px] font-medium text-foreground">No posts yet</div>
              <div className="text-[13px] text-muted-foreground mt-1">
                Be the first verified student to share the truth.
              </div>
            </div>
          ) : (
            reviews.map((r) => <PostCard key={r.id} review={r} />)
          )}
        </div>

        {/* Composer */}
        <div className="px-6 pb-6">
          <div className="glass-card rounded-2xl p-3 flex items-end gap-2">
            <textarea
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              rows={1}
              placeholder={
                verified
                  ? `Share your real take on #${activeChannel}…`
                  : "You can browse anonymously — sign in with college email to post."
              }
              disabled={!verified}
              className="flex-1 bg-transparent outline-none resize-none text-[14px] py-2 px-2 placeholder:text-muted-foreground/70 disabled:cursor-not-allowed"
            />
            <button
              onClick={post}
              disabled={!verified || !composer.trim()}
              className="h-9 w-9 grid place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-[300px] shrink-0 border-l border-white/[0.04] hidden lg:flex flex-col overflow-y-auto bg-black/30">
        <div className="px-5 py-5 space-y-5">
          <Panel title="Community insights">
            <RatingRow label="Overall" value={4.2} />
            <RatingRow label="Placements" value={3.8} />
            <RatingRow label="Faculty" value={4.0} />
            <RatingRow label="Hostel" value={3.5} />
          </Panel>

          <Panel title="Activity">
            <InsightRow icon={<Users className="h-3.5 w-3.5" />} label="Verified students" value={college.total_verified_students.toLocaleString("en-IN")} />
            <InsightRow icon={<Activity className="h-3.5 w-3.5" />} label="Active right now" value={college.live_active_students.toLocaleString("en-IN")} live />
            <InsightRow icon={<TrendingUp className="h-3.5 w-3.5" />} label="Posts this week" value="218" />
          </Panel>

          <Panel title="Top contributors">
            {["anon_owl_204", "silent_dev_88", "campus_truth", "fresher_2024"].map((u, i) => (
              <div key={u} className="flex items-center gap-3 py-1.5">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 grid place-items-center text-[10px]">
                  {u[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] truncate">{u}</div>
                  <div className="text-[10px] text-muted-foreground">{120 - i * 18} contributions</div>
                </div>
                <Award className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            ))}
          </Panel>
        </div>
      </aside>
    </div>
  );
}

function PostCard({ review }: { review: Review }) {
  return (
    <article className="glass-card hover-lift rounded-2xl p-5">
      <header className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-white/25 to-white/5 border border-white/10 grid place-items-center text-[11px] font-medium">
          A
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium">anonymous student</div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Badge>{review.branch ?? "Branch"}</Badge>
            <Badge>{review.year ?? "Year"}</Badge>
            <span>· {new Date(review.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </header>
      <p className="mt-3 text-[14px] leading-relaxed text-foreground/95 whitespace-pre-wrap">
        {review.content}
      </p>
      <footer className="mt-4 flex items-center gap-1 text-muted-foreground">
        <Reaction icon={<Heart className="h-3.5 w-3.5" />} label="Like" />
        <Reaction icon={<MessageCircle className="h-3.5 w-3.5" />} label="Reply" />
        <Reaction icon={<Bookmark className="h-3.5 w-3.5" />} label="Save" />
        <Reaction icon={<Share2 className="h-3.5 w-3.5" />} label="Share" />
      </footer>
    </article>
  );
}

function Reaction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] hover:text-foreground transition">
      {icon}
      {label}
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06] text-foreground/80 text-[10px]">
      {children}
    </span>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-3">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RatingRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1 text-foreground">
        <Star className="h-3 w-3 fill-foreground/80 text-foreground/80" />
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function InsightRow({
  icon, label, value, live,
}: { icon: React.ReactNode; label: string; value: string; live?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
      <span className="text-foreground tabular-nums flex items-center gap-1.5">
        {value}
        {live && <span className="pulse-dot !w-1.5 !h-1.5" />}
      </span>
    </div>
  );
}
