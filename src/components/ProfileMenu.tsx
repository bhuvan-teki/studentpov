import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { User, Settings, LogOut, UserCog, Circle } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useProfile } from "@/lib/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ProfileMenu() {
  const { profile, loading } = useProfile();
  const navigate = useNavigate();
  const route = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => setOpen(false), [route]);

  // Hidden on login page; nothing to show if not signed in.
  if (route === "/login" || route === "/") return null;
  if (loading || !profile) return null;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  return (
    <div ref={ref} className="fixed top-3 right-3 z-50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-2 rounded-full border border-white/[0.06] bg-black/40 backdrop-blur-xl pl-1 pr-3 py-1 hover:bg-black/60 hover:border-white/[0.12] transition"
      >
        <div className="relative">
          <Avatar
            url={profile.avatar_url}
            seed={profile.avatar_seed}
            name={profile.anonymous_username}
            size={28}
          />
          <Circle className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
        </div>
        <span className="hidden sm:block text-[12px] text-foreground/85 max-w-[140px] truncate">
          {profile.anonymous_username ?? "anonymous"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/[0.06] bg-[#0d0d0d]/95 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-4 border-b border-white/[0.05] flex items-center gap-3">
            <Avatar
              url={profile.avatar_url}
              seed={profile.avatar_seed}
              name={profile.anonymous_username}
              size={40}
            />
            <div className="min-w-0">
              <div className="text-[13px] font-medium truncate">
                {profile.anonymous_username ?? "anonymous"}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Online
              </div>
            </div>
          </div>

          <nav className="py-1.5">
            <MenuLink to="/profile" icon={<User className="h-3.5 w-3.5" />} label="My Profile" />
            <MenuLink to="/profile/edit" icon={<UserCog className="h-3.5 w-3.5" />} label="Edit Profile" />
            <MenuLink to="/settings" icon={<Settings className="h-3.5 w-3.5" />} label="Settings" />
          </nav>

          <div className="border-t border-white/[0.05] py-1.5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-foreground/85 hover:bg-white/[0.04] hover:text-red-400 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-foreground/85 hover:bg-white/[0.04] hover:text-foreground transition"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </Link>
  );
}
