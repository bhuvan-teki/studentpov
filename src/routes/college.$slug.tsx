import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Hash, Heart, MessageCircle, Bookmark, Share2, Send, ArrowLeft, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type College = { id: string; name: string; slug: string; description: string | null; };
type Review = { id: string; user_id: string; channel: string; content: string; branch: string | null; year: string | null; created_at: string; };
type Channel = { id: string; category: string; name: string; sort_order: number; };

export const Route = createFileRoute("/college/$slug")({
  component: CollegeServer,
});

function CollegeServer() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [college, setCollege] = useState<College | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  
  const [verified, setVerified] = useState(false);
  const [composer, setComposer] = useState("");
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  // Fetch College
  useEffect(() => {
    let alive = true;
    supabase.from("colleges").select("*").eq("slug", slug).maybeSingle().then(({ data }) => {
      if (!alive) return;
      if (!data) { navigate({ to: "/communities" }); return; }
      setCollege(data as College);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [slug, navigate]);

  // Fetch Channels
  useEffect(() => {
    supabase.from("channels").select("*").order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setChannels(data as Channel[]);
          setActiveChannel(data[0].name); 
        }
      });
  }, []);

  const groupedChannels = useMemo(() => {
    return channels.reduce((acc, channel) => {
      if (!acc[channel.category]) acc[channel.category] = [];
      acc[channel.category].push(channel.name);
      return acc;
    }, {} as Record<string, string[]>);
  }, [channels]);

  // Fetch Posts for Active Channel
  useEffect(() => {
    if (!college || !activeChannel) return;
    const fetchPosts = async () => {
      const { data } = await supabase.from("reviews")
        .select("*").eq("college_id", college.id).eq("channel", activeChannel)
        .order("created_at", { ascending: false }).limit(50);
      setReviews((data ?? []) as Review[]);
    };
    fetchPosts();
    
    // Optional: Realtime subscription here if desired in the future
  }, [college, activeChannel]);

  // Verify User Status
  useEffect(() => {
    if (!user) { setVerified(false); return; }
    supabase.from("profiles").select("verification_status").eq("id", user.id).maybeSingle()
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
        branch: "Anonymous", 
        year: "Student",
      })
      .select()
      .single();
      
    if (error) { toast.error(error.message); return; }
    setReviews((r) => [data as Review, ...r]);
    setComposer("");
  };

  const initials = useMemo(() => college?.name.split(" ").slice(0, 2).map((s) => s[0]).join("") ?? "", [college]);

  if (loading || !college) {
    return <div className="min-h-screen bg-background grid place-items-center text-muted-foreground text-sm">Loading community…</div>;
  }

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
        <button onClick={() => setNavOpen(false)} className="md:hidden h-8 w-8 grid place-items-center text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {Object.entries(groupedChannels).map(([category, channelList]) => (
          <div key={category}>
            <div className="px-2 mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
              {category}
            </div>
            <div>
              {channelList.map((ch) => {
                const active = ch === activeChannel;
                return (
                  <button
                    key={ch}
                    onClick={() => { setActiveChannel(ch); setNavOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition ${
                      active ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
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
        <button onClick={() => navigate({ to: "/communities" })} className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-[13px] text-foreground/90 hover:bg-white/[0.05] transition">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex-1 min-w-0 text-center">
          <div className="text-[13px] font-semibold truncate">{college.name}</div>
        </div>
        <button onClick={() => setNavOpen(true)} className="h-9 w-9 grid place-items-center rounded-lg text-foreground/90 hover:bg-white/[0.05] transition">
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
          <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setNavOpen(false)} />
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

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 md:py-6 flex flex-col-reverse space-y-reverse space-y-3">
          {reviews.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-10 text-center my-auto">
              <div className="text-[15px] font-medium text-foreground">No posts yet in #{activeChannel}</div>
              <div className="text-[13px] text-muted-foreground mt-1">
                Be the first verified student to share the truth.
              </div>
            </div>
          ) : (
            reviews.map((r) => <PostCard key={r.id} review={r} />)
          )}
        </div>

        {/* Composer - Read-Only for Anonymous/Unverified */}
        <div className="px-4 md:px-6 pb-4 md:pb-6">
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-3 flex items-end gap-2 focus-within:border-white/10 transition-colors">
            <textarea
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              rows={1}
              placeholder={
                verified
                  ? `Share your real take on #${activeChannel}…`
                  : user 
                    ? "Your college verification is pending."
                    : "You are browsing anonymously. Sign in to post."
              }
              disabled={!verified}
              className="flex-1 bg-transparent outline-none resize-none text-[14px] py-2 px-2 placeholder:text-muted-foreground/70 disabled:cursor-not-allowed"
            />
            <button
              onClick={post}
              disabled={!verified || !composer.trim()}
              className="h-9 w-9 grid place-items-center rounded-lg bg-white/10 text-white disabled:opacity-30 hover:bg-white/20 transition"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function PostCard({ review }: { review: Review }) {
  return (
    <article className="bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.03] transition-colors rounded-2xl p-5">
      <header className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 grid place-items-center text-[11px] font-medium">
          A
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium">anonymous student</div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            <span className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06]">{review.branch ?? "Branch"}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06]">{review.year ?? "Year"}</span>
            <span>· {new Date(review.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </header>
      <p className="mt-3 text-[14px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
        {review.content}
      </p>
      <footer className="mt-4 flex items-center gap-1 text-muted-foreground">
        <button className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md hover:bg-white/[0.05] hover:text-foreground transition"><Heart className="h-3.5 w-3.5" /> Like</button>
        <button className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md hover:bg-white/[0.05] hover:text-foreground transition"><MessageCircle className="h-3.5 w-3.5" /> Reply</button>
        <button className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md hover:bg-white/[0.05] hover:text-foreground transition"><Bookmark className="h-3.5 w-3.5" /> Save</button>
      </footer>
    </article>
  );
}