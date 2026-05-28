import { useEffect, useState } from "react";
import { X, RefreshCw, Loader2, Check } from "lucide-react";
import { generateAvailableUsernames } from "@/lib/usernames";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  userId: string;
  current: string | null;
  onClose: () => void;
  onSaved: (newName: string) => void;
}

export function UsernamePickerModal({ open, userId, current, onClose, onSaved }: Props) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await generateAvailableUsernames(20);
      setOptions(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  if (!open) return null;

  const pick = async (name: string) => {
    setSaving(name);
    const { error } = await supabase
      .from("profiles")
      .update({ anonymous_username: name })
      .eq("id", userId);
    setSaving(null);
    if (error) {
      if (error.code === "23505") {
        toast.error("That name was just taken — pick another");
        void load();
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Username updated");
    onSaved(name);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0d0d0d] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Choose anonymous username</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Pick one. Only available names are shown.
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
              {options.length} available
            </span>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
              {options.map((u) => {
                const isCurrent = current === u;
                return (
                  <button
                    key={u}
                    disabled={saving !== null || isCurrent}
                    onClick={() => pick(u)}
                    className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.12] text-[13px] text-foreground/90 transition disabled:opacity-50"
                  >
                    <span className="truncate">{u}</span>
                    {saving === u ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : isCurrent ? (
                      <Check className="h-3.5 w-3.5 text-foreground/60" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition">
                        select
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
