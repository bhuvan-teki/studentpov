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
    <main className="min-h-screen bg-background text-foreground flex justify-center">
      {/* max-w-5xl keeps it wide but prevents it from becoming too massive on large screens */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-10 md:py-16">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            College communities
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            Pick a campus. Read the unfiltered truth from verified students inside.
          </p>
        </div>

        {loading ? (
          <div className="h-24 w-full rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        ) : colleges.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-8 text-sm text-muted-foreground text-center">
            No verified college communities available yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            {colleges.map((college) => (
              <Link
                key={college.id}
                to="/college/$slug"
                params={{ slug: college.slug }}
                className="group relative w-full flex items-center gap-4 md:gap-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] px-4 md:px-6 py-4 hover:bg-white/[0.045] hover:border-white/[0.1] transition-all duration-300 overflow-hidden shadow-lg"
              >
                {/* Smaller Icon Container */}
                <div className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-xl bg-gradient-to-br from-white/12 to-white/[0.03] border border-white/10 grid place-items-center">
                  <Building2 className="h-6 w-6 md:h-7 md:w-7 text-white/55" />
                </div>

                {/* Smaller Text */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base md:text-lg font-semibold tracking-tight truncate group-hover:text-white transition-colors">
                    {college.name}
                  </h2>
                  <p className="mt-1 text-xs md:text-sm text-muted-foreground line-clamp-1">
                    {college.description || "Verified student community for real college experiences."}
                  </p>
                </div>

                {/* Desktop Stats */}
                <div className="hidden md:flex items-center gap-6 text-muted-foreground shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span className="text-sm tabular-nums text-foreground/85">
                      {college.total_verified_students.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-green-500/80" />
                    <span className="text-sm tabular-nums text-green-500/90">
                      {college.live_active_students.toLocaleString("en-IN")} active
                    </span>
                  </div>

                  <ChevronRight className="h-5 w-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>

                {/* Mobile Stats */}
                <div className="md:hidden flex flex-col items-end gap-1.5 text-xs text-muted-foreground shrink-0">
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>{college.total_verified_students.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-500/80">
                    <Activity className="h-3.5 w-3.5" />
                    <span>{college.live_active_students.toLocaleString("en-IN")}</span>
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
