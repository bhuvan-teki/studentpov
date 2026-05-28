import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { UsernamePickerModal } from "@/components/UsernamePickerModal";
import { AvatarPickerModal } from "@/components/AvatarPickerModal";
import { useProfile } from "@/lib/useProfile";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BIO_MAX = 120;
const BIO_PLACEHOLDERS = [
  "surviving attendance pressure",
  "placements are fake bro",
  "hostel food victim",
  "ask me about cse reality",
];

export const Route = createFileRoute("/profile/edit")({
  head: () => ({ meta: [{ title: "Edit profile — Studentpov" }] }),
  component: EditProfilePage,
});

function EditProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading, refresh } = useProfile();
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile) setBio(profile.bio ?? "");
  }, [profile]);

  if (loading || !profile) {
    return (
      <main className="min-h-screen grid place-items-center text-muted-foreground text-sm">
        Loading…
      </main>
    );
  }

  const saveBio = async () => {
    const clean = bio.trim();
    if (clean.length > BIO_MAX) {
      toast.error(`Bio must be ${BIO_MAX} characters or less`);
      return;
    }
    setSavingBio(true);
    const { error } = await supabase
      .from("profiles")
      .update({ bio: clean.length ? clean : null })
      .eq("id", profile.id);
    setSavingBio(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bio updated");
    void refresh();
  };

  const placeholder = BIO_PLACEHOLDERS[Math.floor(Math.random() * BIO_PLACEHOLDERS.length)];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 md:px-6 py-6 md:py-10">
        <button
          onClick={() => navigate({ to: "/profile" })}
          className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to profile
        </button>

        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight">Edit profile</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Stay anonymous. Never put real personal info.
        </p>

        <div className="mt-8 space-y-5">
          {/* Avatar */}
          <Row label="Avatar" hint="Pick from generated avatars">
            <button
              onClick={() => setAvatarOpen(true)}
              className="group relative"
            >
              <Avatar
                url={profile.avatar_url}
                seed={profile.avatar_seed}
                name={profile.anonymous_username}
                size={64}
              />
              <span className="absolute inset-0 grid place-items-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition">
                <Pencil className="h-4 w-4" />
              </span>
            </button>
          </Row>

          {/* Username */}
          <Row label="Username" hint="Globally unique. Pick from available options.">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
              <span className="text-[13px] text-foreground/90 truncate">
                {profile.anonymous_username ?? "—"}
              </span>
              <button
                onClick={() => setUsernameOpen(true)}
                className="text-[12px] text-foreground/80 hover:text-foreground hover:underline"
              >
                Change
              </button>
            </div>
          </Row>

          {/* Bio */}
          <Row label="Bio" hint={`Max ${BIO_MAX} characters. No real identity.`}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              rows={3}
              placeholder={placeholder}
              className="glass-input w-full rounded-lg px-3 py-2.5 text-[13px] resize-none"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground/70">
                {bio.length}/{BIO_MAX}
              </span>
              <button
                onClick={saveBio}
                disabled={savingBio || bio === (profile.bio ?? "")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-[12px] font-medium hover:opacity-90 disabled:opacity-40 transition"
              >
                {savingBio && <Loader2 className="h-3 w-3 animate-spin" />}
                Save bio
              </button>
            </div>
          </Row>
        </div>
      </div>

      <UsernamePickerModal
        open={usernameOpen}
        userId={profile.id}
        current={profile.anonymous_username}
        onClose={() => setUsernameOpen(false)}
        onSaved={() => void refresh()}
      />

      <AvatarPickerModal
        open={avatarOpen}
        userId={profile.id}
        currentUrl={profile.avatar_url}
        onClose={() => setAvatarOpen(false)}
        onSaved={() => void refresh()}
      />
    </main>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2">
        <div className="text-[12px] font-medium text-foreground/85">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground/70 mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
