import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Hash, Send, ArrowLeft, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ChatRoom } from "@/components/ChatRoom";

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
  profiles?: {
    anonymous_username?: string | null;
  } | null;
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
  const [navOpen, setNavOpen] = useState(false);

  // Fetch College Details
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

  // REAL-TIME POST FETCHING
  useEffect(() => {
    if (!college) return;

    // 1. Initial Data Fetch
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("reviews")
.select(`
  *,
  profiles (
    anonymous_username
  )
`)
        .eq("college_id", college.id)
        .eq("channel", activeChannel)
        .order("created_at", { ascending: true })
        .limit(50);
      setReviews((data ?? []) as Review[]);
    };

    fetchReviews();

    // 2. Real-Time WebSocket Subscription
    const channelSubscription = supabase
      .channel(`public:reviews:${college.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reviews",
          filter: `college_id=eq.${college.id}`,
        },
        (payload) => {
          const newReview = payload.new as Review;
          
          if (newReview.channel === activeChannel) {
            setReviews((current) => {
              if (current.some((r) => r.id === newReview.id)) return current;
              return [...current, newReview];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [college, activeChannel]);

  // SECURE: Check Verification Status AND Correct College Match
  useEffect(() => {
    if (!user || !college) { 
      setVerified(false); 
      return; 
    }
    
    supabase
      .from("profiles")
      .select("verification_status, college_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setVerified(
          data?.verification_status === "verified" && 
          data?.college_id === college.id
        );
      });
  }, [user, college]);

  const post = async () => {
    if (!user) { toast.error("Sign in to post"); return; }
    if (!verified) { toast.error("Only verified students of this college can post"); return; }
    if (composer.trim().length < 2) return;
    if (!college) return;
    
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: user.id,
        college_id: college.id,
        channel: activeChannel,
        content: composer.trim(),
        branch: "Anonymous",
        year: "Student",
      })
      .select()
      .single();
      
    if (error) { toast.error(error.message); return; }
    
    setReviews((r) => [...r, data as Review]);
    setComposer("");
  };

  const initials = useMemo(
    () => college?.name.split(" ").slice(0, 2).map((s) => s[0]).join("") ?? "",
    [college],
  );

  if (loading || !college) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">Loading community…</div>;
  }

  const selectChannel = (ch: string) => {
    setActiveChannel(ch);
    setNavOpen(false);
  };

  const Sidebar = (
    <div className="h-full flex flex-col bg-black/60 md:bg-black/40">
      <div className="px-4 py-4 border-b border-white/[0.04] flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-white/20 to-white/5 border border-white/10 grid place-items-center text-[12px] font-semibold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold truncate">{college.name}</div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">Server</div>
        </div>
        <button
          onClick={() => setNavOpen(false)}
          className="md:hidden h-8 w-8 grid place-items-center text-muted-foreground hover:text-foreground"
          aria-label="Close channels"
        >
          <X className="h-4 w-4" />
        </button>
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
                    onClick={() => selectChannel(ch)}
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
    </div>
  );

  return (
    <div className="h-screen flex flex-col md:flex-row bg-background text-foreground overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden h-14 shrink-0 px-3 border-b border-white/[0.04] flex items-center gap-2 bg-black/40 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/communities" })}
          className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-[13px] text-foreground/90 hover:bg-white/[0.05] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex-1 min-w-0 text-center">
          <div className="text-[13px] font-semibold truncate">{college.name}</div>
        </div>
        <button
          onClick={() => setNavOpen(true)}
          className="h-9 w-9 grid place-items-center rounded-lg text-foreground/90 hover:bg-white/[0.05] transition"
          aria-label="Open channels"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-[260px] shrink-0 border-r border-white/[0.04] flex-col">
        <button
          onClick={() => navigate({ to: "/communities" })}
          className="m-3 mb-0 h-9 px-3 rounded-lg flex items-center gap-2 text-[12px] text-foreground/85 hover:bg-white/[0.05] border border-white/[0.06] transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to communities
        </button>
        <div className="flex-1 min-h-0 mt-3">{Sidebar}</div>
      </aside>

      {/* MOBILE SIDEBAR (drawer) */}
      {navOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setNavOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 w-[280px] z-50 border-r border-white/[0.06] bg-background">
            {Sidebar}
          </aside>
        </>
      )}

      {/* CENTER FEED */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="hidden md:flex h-14 px-6 border-b border-white/[0.04] items-center gap-3">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[14px] font-semibold">{activeChannel}</h2>
          <span className="text-[12px] text-muted-foreground/70">· anonymous & verified</span>
        </div>

        <div className="md:hidden px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold">{activeChannel}</h2>
        </div>

        {activeChannel === "general-chat" ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <ChatRoom collegeId={college.id} verified={verified} />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 flex flex-col">
              {reviews.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <div className="text-[15px] font-medium text-foreground">No posts yet in #{activeChannel}</div>
                  <div className="text-[13px] text-muted-foreground mt-1">
                    Be the first verified student to share the truth.
                  </div>
                </div>
              ) : (
                // Added a flex container to keep the flow correct with the new flat cards
                <div className="flex flex-col gap-1">
                  {reviews.map((r) => <PostCard key={r.id} review={r} />)}
                </div>
              )}
            </div>

            <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2">
              <div className="bg-white/[0.06] rounded-xl p-1.5 pl-4 flex items-center gap-2 focus-within:bg-white/[0.08] transition-colors border border-white/[0.08]">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  rows={1}
                  placeholder={
                    verified
                      ? `Message #${activeChannel}…`
                      : user 
                        ? "Your college verification is pending, or you belong to a different college."
                        : "You can browse anonymously — sign in with college email to post."
                  }
                  disabled={!verified}
                  className="flex-1 bg-transparent outline-none resize-none text-[15px] py-1.5 placeholder:text-muted-foreground/50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={post}
                  disabled={!verified || !composer.trim()}
                  className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary disabled:opacity-30 hover:bg-primary/20 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function PostCard({ review }: { review: Review }) {
  return (
    <article className="group flex gap-3 px-4 md:px-6 py-2 hover:bg-white/[0.035] transition">
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 grid place-items-center text-[12px] font-semibold shrink-0 mt-0.5">
        A
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-medium text-foreground hover:underline cursor-pointer">
            {review.profiles?.anonymous_username || "anonymous"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {new Date(review.created_at).toLocaleString("en-IN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <p className="mt-0.5 text-[15px] leading-[1.375rem] text-foreground/90 whitespace-pre-wrap break-words">
          {review.content}
        </p>
      </div>
    </article>
  );
}
