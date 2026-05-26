import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Users, Activity, LogOut } from "lucide-react";
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
  const [q, setQ] = useState("");
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

  const filtered = colleges.filter((c) =>
    c.name.toLowerCase().includes(q.toLowerCase()),
  );

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <main className="min-h-screen">
      <TopNav
        centerSlot={
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search colleges..."
              className="glass-input w-full rounded-full pl-9 pr-4 py-2 text-sm"
            />
          </div>
        }
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

      <section className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="mb-10">
          <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-gradient">
            College communities
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg">
            Pick a campus. Read the unfiltered truth from verified students inside.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="glass-card rounded-2xl h-[200px] animate-pulse opacity-40"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to="/college/$slug"
                params={{ slug: c.slug }}
                className="glass-card hover-lift rounded-2xl p-6 flex flex-col gap-5 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-semibold text-foreground tracking-tight truncate">
                      {c.name}
                    </h3>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 mt-1">
                      Verified student community
                    </p>
                  </div>
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-white/15 to-white/5 border border-white/10 grid place-items-center text-sm font-semibold text-foreground/90">
                    {c.name
                      .split(" ")
                      .slice(0, 2)
                      .map((s) => s[0])
                      .join("")}
                  </div>
                </div>

                <p className="text-[13px] text-muted-foreground/90 line-clamp-2">
                  {c.description}
                </p>

                <div className="mt-auto pt-4 border-t border-white/[0.05] flex items-center justify-between">
                  <Stat
                    icon={<Users className="h-3.5 w-3.5" />}
                    label="Verified"
                    value={c.total_verified_students.toLocaleString("en-IN")}
                  />
                  <Stat
                    icon={<Activity className="h-3.5 w-3.5" />}
                    label="Live now"
                    value={c.live_active_students.toLocaleString("en-IN")}
                    live
                  />
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
