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
      
      if (!error && data) {
        setColleges(data as College[]);
      }
      setLoading(false);
    };

    fetchColleges();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verified Communities</h1>
          <p className="text-muted-foreground mt-2">Select your college to join the anonymous discussion.</p>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm">Loading communities...</div>
        ) : (
          <div className="flex flex-col gap-4">
            {colleges.map((college) => (
              <Link
                key={college.id}
                to="/college/$slug"
                params={{ slug: college.slug }}
                className="group relative flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all overflow-hidden"
              >
                <div className="h-16 w-16 shrink-0 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 grid place-items-center">
                  <Building2 className="h-7 w-7 text-white/50" />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate group-hover:text-white transition-colors">
                    {college.name}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                    {college.description || "Join the discussion for verified students."}
                  </p>
                </div>

                <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2 md:mt-0">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{college.total_verified_students.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-green-500/70" />
                    <span className="text-green-500/70">{college.live_active_students.toLocaleString()} active</span>
                  </div>
                  <ChevronRight className="h-5 w-5 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
