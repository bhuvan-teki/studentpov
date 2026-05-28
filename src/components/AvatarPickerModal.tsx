import { useMemo, useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { generateAvatarOptions, avatarUrl, type AvatarStyle } from "@/lib/avatars";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  userId: string;
  currentUrl: string | null;
  onClose: () => void;
  onSaved: (url: string, seed: string) => void;
}

export function AvatarPickerModal({ open, userId, currentUrl, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState<string | null>(null);
  const options = useMemo(() => generateAvatarOptions(userId), [userId]);

  if (!open) return null;

  const pick = async (url: string, seed: string, style: AvatarStyle) => {
    setSaving(url);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url, avatar_seed: `${seed}|${style}` })
      .eq("id", userId);
    setSaving(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Avatar updated");
    onSaved(url, seed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-[#0d0d0d] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Pick an avatar</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Only generated avatars — keeps you anonymous.
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {options.map((o) => {
              const isCurrent = currentUrl === o.url;
              return (
                <button
                  key={o.url}
                  onClick={() => pick(o.url, o.seed, o.style)}
                  disabled={saving !== null}
                  className={`group relative aspect-square rounded-xl overflow-hidden border transition ${
                    isCurrent
                      ? "border-white/40 ring-2 ring-white/20"
                      : "border-white/[0.06] hover:border-white/20"
                  }`}
                  title={`${o.style} · ${o.seed}`}
                >
                  <img
                    src={o.url}
                    alt={o.seed}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                  />
                  {saving === o.url && (
                    <div className="absolute inset-0 grid place-items-center bg-black/60">
                      <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-white text-black grid place-items-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export { avatarUrl };
