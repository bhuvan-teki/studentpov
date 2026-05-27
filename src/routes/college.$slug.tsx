import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Hash, ArrowLeft, Menu, X, Send, Image as ImageIcon, Video, Paperclip,
  MapPin, Flag, Trash2, Play, Pause, FileText, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { detectMediaKind, uploadMedia, type MediaKind } from "@/lib/media";
import { VoiceRecorder } from "@/components/VoiceRecorder";

type College = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type Channel = {
  id: string;
  category: string;
  name: string;
  slug: string;
  position: number;
};

type Post = {
  id: string;
  user_id: string;
  channel_slug: string;
  content: string;
  branch: string | null;
  year: string | null;
  media_url: string | null;
  media_type: string | null;
  voice_url: string | null;
  location: string | null;
  created_at: string;
};

const LOCATION_OPTIONS = ["", "Main Campus", "Boys Hostel", "Girls Hostel", "Library", "Hyderabad"];

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
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>("welcome");
  const [posts, setPosts] = useState<Post[]>([]);
  const [verified, setVerified] = useState(false);
  const [profile, setProfile] = useState<{ branch: string; year: string }>({
    branch: "CSE",
    year: "2nd Year",
  });
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: c } = await supabase
        .from("colleges").select("*").eq("slug", slug).maybeSingle();
      if (!alive) return;
      if (!c) { navigate({ to: "/communities" }); return; }
      setCollege(c as College);
      const { data: ch } = await supabase
        .from("channels").select("*").eq("college_id", (c as College).id).order("position");
      if (!alive) return;
      const list = (ch ?? []) as Channel[];
      setChannels(list);
      if (list.length) setActiveChannel(list[0].slug);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug, navigate]);

  useEffect(() => {
    if (!college) return;
    supabase
      .from("posts")
      .select("*")
      .eq("college_id", college.id)
      .eq("channel_slug", activeChannel)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setPosts((data ?? []) as Post[]));

    const channel = supabase
      .channel(`posts:${college.id}:${activeChannel}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `channel_slug=eq.${activeChannel}`,
        },
        (payload) => {
          const np = payload.new as Post;
          if (np.channel_slug === activeChannel) {
            setPosts((p) => (p.some((x) => x.id === np.id) ? p : [np, ...p]));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        (payload) => {
          const id = (payload.old as { id: string }).id;
          setPosts((p) => p.filter((x) => x.id !== id));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  const grouped = useMemo(() => {
    const map = new Map<string, Channel[]>();
    for (const c of channels) {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    }
    return Array.from(map.entries());
  }, [channels]);

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
        {grouped.map(([cat, list]) => (
          <div key={cat}>
            <div className="px-2 mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
              {cat}
            </div>
            <div>
              {list.map((ch) => {
                const active = ch.slug === activeChannel;
                return (
                  <button
                    key={ch.id}
                    onClick={() => selectChannel(ch.slug)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition ${
                      active
                        ? "bg-white/[0.06] text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                    }`}
                  >
                    <Hash className="h-3.5 w-3.5 opacity-70" />
                    <span className="truncate">{ch.slug}</span>
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

      <aside className="hidden md:flex w-[260px] shrink-0 border-r border-white/[0.04] flex-col">
        <button
          onClick={() => navigate({ to: "/communities" })}
          className="m-3 mb-0 h-9 px-3 rounded-lg flex items-center gap-2 text-[12px] text-foreground/85 hover:bg-white/[0.05] border border-white/[0.06] transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to communities
        </button>
        <div className="flex-1 min-h-0 mt-3">{Sidebar}</div>
      </aside>

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
          {posts.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center my-auto">
              <div className="text-[15px] font-medium text-foreground">No posts yet in #{activeChannel}</div>
              <div className="text-[13px] text-muted-foreground mt-1">
                Be the first verified student to share the truth.
              </div>
            </div>
          ) : (
            posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                currentUserId={user?.id}
                onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
              />
            ))
          )}
        </div>

        <Composer
          collegeId={college.id}
          channelSlug={activeChannel}
          verified={verified}
          userId={user?.id}
          profile={profile}
          setProfile={setProfile}
          onPosted={(p) => setPosts((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]))}
        />
      </main>
    </div>
  );
}

function Composer({
  collegeId,
  channelSlug,
  verified,
  userId,
  profile,
  setProfile,
  onPosted,
}: {
  collegeId: string;
  channelSlug: string;
  verified: boolean;
  userId: string | undefined;
  profile: { branch: string; year: string };
  setProfile: (p: { branch: string; year: string }) => void;
  onPosted: (p: Post) => void;
}) {
  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [location, setLocation] = useState("");
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const pickMedia = (accept: string) => {
    if (fileRef.current) {
      fileRef.current.accept = accept;
      fileRef.current.click();
    }
  };

  const reset = () => {
    setText("");
    setMediaFile(null);
    setVoiceBlob(null);
    setLocation("");
  };

  const submit = async () => {
    if (!userId) { toast.error("Sign in to post"); return; }
    if (!verified) { toast.error("Only verified students can post"); return; }
    if (!text.trim() && !mediaFile && !voiceBlob) return;
    setPosting(true);
    try {
      let media_url: string | null = null;
      let media_type: MediaKind | null = null;
      let voice_url: string | null = null;
      if (mediaFile) {
        media_type = detectMediaKind(mediaFile);
        media_url = await uploadMedia({ userId, file: mediaFile, kind: media_type });
      }
      if (voiceBlob) {
        voice_url = await uploadMedia({ userId, file: voiceBlob, kind: "voice", ext: "webm" });
      }
      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          college_id: collegeId,
          channel_slug: channelSlug,
          content: text.trim(),
          branch: profile.branch || null,
          year: profile.year || null,
          media_url,
          media_type,
          voice_url,
          location: location || null,
        })
        .select()
        .single();
      if (error) throw error;
      onPosted(data as Post);
      reset();
    } catch (e) {
      toast.error((e as Error).message || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  if (!verified) {
    return (
      <div className="px-4 md:px-6 pb-4 md:pb-6">
        <div className="glass-card rounded-2xl p-4 text-center text-[13px] text-muted-foreground">
          {userId
            ? "Your college verification is pending — you can read freely."
            : "You're browsing anonymously. Sign in with a college email to post."}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 pb-4 md:pb-6">
      <div className="glass-card rounded-2xl p-3 space-y-3 focus-within:border-white/10 transition-colors">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <select
            value={profile.branch}
            onChange={(e) => setProfile({ ...profile, branch: e.target.value })}
            className="bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-1 text-foreground/85"
          >
            {["CSE","AI-ML","ECE","EEE","Mechanical","Civil","MBA","Other"].map((b)=>(
              <option key={b} value={b} className="bg-background">{b}</option>
            ))}
          </select>
          <select
            value={profile.year}
            onChange={(e) => setProfile({ ...profile, year: e.target.value })}
            className="bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-1 text-foreground/85"
          >
            {["1st Year","2nd Year","3rd Year","4th Year","Alumni"].map((y)=>(
              <option key={y} value={y} className="bg-background">{y}</option>
            ))}
          </select>
          <span className="text-muted-foreground/60">· posted anonymously</span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={`Share your real take on #${channelSlug}…`}
          className="w-full bg-transparent outline-none resize-none text-[14px] py-1 placeholder:text-muted-foreground/70"
        />

        {(mediaFile || voiceBlob || location) && (
          <div className="flex flex-wrap gap-2 text-[11px]">
            {mediaFile && (
              <Chip onClear={() => setMediaFile(null)}>
                {detectMediaKind(mediaFile)} · {mediaFile.name.slice(0, 24)}
              </Chip>
            )}
            {voiceBlob && <Chip onClear={() => setVoiceBlob(null)}>voice attached</Chip>}
            {location && <Chip onClear={() => setLocation("")}>📍 {location}</Chip>}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setMediaFile(f);
            e.target.value = "";
          }}
        />
        <input
          ref={docRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setMediaFile(f);
            e.target.value = "";
          }}
        />

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <IconBtn onClick={() => pickMedia("image/*")} label="Image"><ImageIcon className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn onClick={() => pickMedia("video/*")} label="Video"><Video className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn onClick={() => docRef.current?.click()} label="Doc"><Paperclip className="h-3.5 w-3.5" /></IconBtn>
            <VoiceRecorder
              hasClip={!!voiceBlob}
              onRecorded={setVoiceBlob}
              onClear={() => setVoiceBlob(null)}
            />
            <div className="flex items-center gap-1 ml-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-1 text-[11px] text-foreground/80"
              >
                {LOCATION_OPTIONS.map((l) => (
                  <option key={l} value={l} className="bg-background">{l || "No location"}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={submit}
            disabled={posting || (!text.trim() && !mediaFile && !voiceBlob)}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium disabled:opacity-30 hover:opacity-90 transition flex items-center gap-2"
          >
            {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="h-8 px-2.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-foreground/80 hover:bg-white/[0.06] flex items-center gap-1.5 text-[11px] transition"
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.05] border border-white/[0.06] text-foreground/85">
      {children}
      <button onClick={onClear} className="text-muted-foreground hover:text-foreground">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function PostCard({
  post,
  currentUserId,
  onDelete,
}: {
  post: Post;
  currentUserId: string | undefined;
  onDelete: (id: string) => void;
}) {
  const isOwner = currentUserId && currentUserId === post.user_id;

  const report = async () => {
    if (!currentUserId) { toast.error("Sign in to report"); return; }
    const { error } = await supabase
      .from("reports")
      .insert({ post_id: post.id, reporter_id: currentUserId, reason: "user_reported" });
    if (error) toast.error(error.message);
    else toast.success("Reported — thank you. Our team will review.");
  };

  const remove = async () => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) toast.error(error.message);
    else onDelete(post.id);
  };

  return (
    <article className="glass-card rounded-2xl p-5">
      <header className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-white/25 to-white/5 border border-white/10 grid place-items-center text-[11px] font-medium">
          A
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium">Anonymous {post.branch ?? ""} Student</div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            {post.year && <Badge>{post.year}</Badge>}
            {post.branch && <Badge>{post.branch}</Badge>}
            <span>· {new Date(post.created_at).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={report}
            title="Report"
            className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
          {isOwner && (
            <button
              onClick={remove}
              title="Delete"
              className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-white/[0.04] transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      {post.content && (
        <p className="mt-3 text-[14px] leading-relaxed text-foreground/95 whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {post.media_url && post.media_type === "image" && (
        <img
          src={post.media_url}
          alt=""
          loading="lazy"
          className="mt-3 rounded-xl border border-white/[0.06] max-h-[480px] object-cover w-full"
        />
      )}
      {post.media_url && post.media_type === "video" && (
        <video
          src={post.media_url}
          controls
          className="mt-3 rounded-xl border border-white/[0.06] max-h-[480px] w-full bg-black"
        />
      )}
      {post.media_url && post.media_type === "document" && (
        <a
          href={post.media_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] text-[12px] text-foreground/90"
        >
          <FileText className="h-3.5 w-3.5" /> Open attachment
        </a>
      )}

      {post.voice_url && <VoicePlayer url={post.voice_url} />}

      {post.location && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" /> {post.location}
        </div>
      )}
    </article>
  );
}

function VoicePlayer({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
  };

  return (
    <div className="mt-3 inline-flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
      <button
        onClick={toggle}
        className="h-7 w-7 grid place-items-center rounded-full bg-white text-black hover:opacity-90 transition"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <span className="text-[11px] text-muted-foreground">Voice message</span>
      <audio
        ref={ref}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06] text-foreground/80 text-[10px]">
      {children}
    </span>
  );
}
