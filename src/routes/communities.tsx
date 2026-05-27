import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Activity, Building2, ChevronRight } from "lucide-react";

type College = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  total_verified_students: number;
  live_active_students: number;
};

export const Route = createFileRoute("/communities")({
  component: CommunitiesPage,
});

function CommunitiesPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchColleges = async () => {
      const { data, error } = await supabase
        .from("colleges")
        .select("*")
        .order("total_verified_students", { ascending: false });

      if (!error && data) setColleges(data as College[]);
      setLoading(false);
    };

    fetchColleges();
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 pt-24 md:pt-32">
        <div className="mb-12 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            College communities
          </h1>
          <p className="mt-5 text-base md:text-lg text-muted-foreground">
            Pick a campus. Read the unfiltered truth from verified students inside.
          </p>
        </div>

        {loading ? (
          <div className="h-36 w-full rounded-3xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        ) : colleges.length === 0 ? (
          <div className="rounded-3xl bg-white/[0.02] border border-white/[0.06] p-10 text-sm text-muted-foreground">
            No verified college communities available yet.
          </div>
        ) : (
          <div className="flex flex-col gap-5 w-full">
            {colleges.map((college) => (
              <Link
                key={college.id}
                to="/college/$slug"
                params={{ slug: college.slug }}
                className="group relative w-full min-h-[150px] flex items-center gap-6 rounded-3xl bg-white/[0.025] border border-white/[0.06] px-7 md:px-9 py-7 hover:bg-white/[0.045] hover:border-white/[0.1] transition-all duration-300 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
              >
                <div className="h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br from-white/12 to-white/[0.03] border border-white/10 grid place-items-center">
                  <Building2 className="h-9 w-9 text-white/55" />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-xl md:text-2xl font-semibold tracking-tight truncate">
                    {college.name}
                  </h2>
                  <p className="mt-2 text-sm md:text-base text-muted-foreground line-clamp-1">
                    {college.description || "Verified student community for real college experiences."}
                  </p>
                </div>

                <div className="hidden md:flex items-center gap-8 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span className="text-base tabular-nums text-foreground/85">
                      {college.total_verified_students.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500/80" />
                    <span className="text-base tabular-nums text-green-500/90">
                      {college.live_active_students.toLocaleString("en-IN")} active
                    </span>
                  </div>

                  <ChevronRight className="h-6 w-6 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>

                <div className="md:hidden flex flex-col items-end gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{college.total_verified_students.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-green-500/80">
                    <Activity className="h-4 w-4" />
                    <span>{college.live_active_students.toLocaleString("en-IN")} active</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
