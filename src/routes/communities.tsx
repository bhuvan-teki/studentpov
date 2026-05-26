import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Activity, LogOut, ArrowRight, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/lib/auth";

type College = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  total_verified_students: number;
  live_active_students: number;
};

export const Route = createFileRoute("/communities")({
  head: () => ({
    meta: [
      { title: "College Communities — Studentpov" },
      {
        name: "description",
        content: "Pick a verified college community and see the real story inside.",
      },
    ],
  }),
  component: CommunitiesPage,
});

function CommunitiesPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("colleges")
      .select("id,name,slug,description,total_verified_students,live_active_students")
      .order("total_verified_students", { ascending: false })
      .then(({ data }) => {
        setColleges(data ?? []);
        setLoading(false);
      });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <main className="min-h-screen">
      <TopNav
        rightSlot={
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-white/30 to-white/5 border border-white/10 grid place-items-center text-[11px] font-medium text-foreground/90">
                  {(user.email?.[0] ?? "U").toUpperCase()}
                </div>
                <button
                  onClick={signOut}
                  className="text-muted-foreground hover:text-foreground transition p-1.5 rounded-md"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-[12px] text-foreground/80 hover:text-foreground transition border border-white/10 rounded-full px-3 py-1.5"
              >
                Sign in
              </Link>
            )}
          </div>
        }
      />

      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-10 md:py-16">
        <div className="mb-10">
          <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-gradient">
            College communities
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg">
            Pick a campus. Read the unfiltered truth from verified students inside.
          </p>
        </div>

        {loading ? (
          <div className="glass-card rounded-2xl h-[160px] animate-pulse opacity-40" />
        ) : colleges.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">
            No college communities yet.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {colleges.map((c) => (
              <Link
                key={c.id}
                to="/college/$slug"
                params={{ slug: c.slug }}
                className="glass-card hover-lift rounded-2xl p-5 sm:p-7 group flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6"
              >
                <div className="flex-1 min-w-0 order-2 sm:order-1">
                  <h3 className="text-[18px] sm:text-[20px] font-semibold text-foreground tracking-tight">
                    {c.name}
                  </h3>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 mt-1">
                    Verified student community
                  </p>
                  {c.description && (
                    <p className="text-[13px] text-muted-foreground/90 mt-3 line-clamp-2">
                      {c.description}
                    </p>
                  )}

                  <div className="mt-5 flex items-center gap-6">
                    <Stat
                      icon={<Users className="h-3.5 w-3.5" />}
                      label="Verified students"
                      value={c.total_verified_students.toLocaleString("en-IN")}
                    />
                    <Stat
                      icon={<Activity className="h-3.5 w-3.5" />}
                      label="Live active"
                      value={c.live_active_students.toLocaleString("en-IN")}
                      live={c.live_active_students > 0}
                    />
                  </div>
                </div>

                <div className="order-1 sm:order-2 flex items-center justify-between sm:justify-end gap-3 sm:gap-5 sm:shrink-0">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-white/15 to-white/[0.02] border border-white/10 grid place-items-center text-foreground/90">
                    <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
  live,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  live?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {label}
        </div>
        <div className="text-[13px] font-medium text-foreground/95 tabular-nums flex items-center gap-1.5">
          {value}
          {live && <span className="pulse-dot !w-1.5 !h-1.5" />}
        </div>
      </div>
    </div>
  );
}
