import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, LogOut, ChevronRight, UserCog, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Studentpov" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return toast.error(error.message);
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 md:px-6 py-6 md:py-10">
        <button
          onClick={() => history.back()}
          className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Manage your anonymous identity and account.
        </p>

        <section className="mt-8 rounded-xl border border-white/[0.05] overflow-hidden divide-y divide-white/[0.04]">
          <Link
            to="/profile/edit"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition"
          >
            <UserCog className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-[13px] font-medium">Edit profile</div>
              <div className="text-[11px] text-muted-foreground">Avatar, username, bio</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </Link>

          <div className="flex items-center gap-3 px-4 py-3.5">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-[13px] font-medium">Verification</div>
              <div className="text-[11px] text-muted-foreground">
                {profile?.verification_status === "verified" ? "Verified student" : "Pending"}
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground/60">
              {profile?.email ? maskEmail(profile.email) : ""}
            </span>
          </div>
        </section>

        <section className="mt-6">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/[0.05] hover:bg-white/[0.03] hover:border-red-500/20 hover:text-red-400 text-left transition"
          >
            <LogOut className="h-4 w-4" />
            <div className="flex-1 text-[13px] font-medium">Log out</div>
          </button>
        </section>
      </div>
    </main>
  );
}

function maskEmail(e: string) {
  const [name, domain] = e.split("@");
  if (!domain) return e;
  const masked = name.length <= 2 ? "•".repeat(name.length) : name[0] + "•".repeat(name.length - 2) + name.slice(-1);
  return `${masked}@${domain}`;
}
