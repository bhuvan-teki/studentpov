import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

import { TopNav, LiveCount } from "@/components/TopNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Mode = "login" | "signup";

const COLLEGE_DOMAIN = "@chaitanya.edu.in";
const COLLEGE_SLUG = "chaitanya-deemed";

const inputClass =
  "w-full rounded-2xl bg-zinc-950/80 border border-white/[0.06] text-white placeholder:text-zinc-500 px-4 py-3 outline-none transition focus:border-white/[0.12] focus:bg-zinc-950 shadow-none";

const adjectives = ["silent", "hidden", "rapid", "midnight", "shadow", "bright"];
const animals = ["tiger", "eagle", "fox", "wolf", "panther", "falcon"];

function makeAnonName() {
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}_${
    animals[Math.floor(Math.random() * animals.length)]
  }_${Math.floor(100 + Math.random() * 900)}`;
}

function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  async function getCollegeId() {
    const { data, error } = await supabase
      .from("colleges")
      .select("id")
      .eq("slug", COLLEGE_SLUG)
      .single();

    if (error || !data) {
      throw new Error("College not found in database.");
    }

    return data.id;
  }

  async function createOrUpdateProfile(user: {
    id: string;
    email?: string | null;
  }) {
    if (!user?.id || !user?.email) {
      throw new Error("No authenticated user found.");
    }

    const collegeId = await getCollegeId();

    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, anonymous_username")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existingProfile) {
      const { error } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email.toLowerCase(),
        college_id: collegeId,
        verification_status: "verified",
        anonymous_username: makeAnonName(),
        avatar_seed: crypto.randomUUID(),
        bio: "",
      });

      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        college_id: collegeId,
        verification_status: "verified",
        anonymous_username: existingProfile.anonymous_username || makeAnonName(),
      })
      .eq("id", user.id);

    if (error) throw error;
  }

  async function handleLogin() {
    if (!normalizedEmail.endsWith(COLLEGE_DOMAIN)) {
      toast.error("Use your official Chaitanya student email.");
      return;
    }

    if (!password) {
      toast.error("Enter your password.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      setLoading(false);
      toast.error("Wrong email or password.");
      return;
    }

    try {
      await createOrUpdateProfile(data.user);
      toast.success("Welcome back to Studentpov.");
      navigate({ to: "/communities" });
    } catch (err: any) {
      console.error("Profile setup failed:", err);
      toast.error(err.message || "Profile setup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (!normalizedEmail.endsWith(COLLEGE_DOMAIN)) {
      toast.error("Only Chaitanya student emails are allowed.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!accept) {
      toast.error("Please accept Terms & Conditions.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      setLoading(false);

      const msg = error?.message?.toLowerCase() || "";

      if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("user already")
      ) {
        toast.error("User already registered. Try logging in.");
        setMode("login");
        return;
      }

      toast.error(error?.message || "Account creation failed.");
      return;
    }

    try {
      await createOrUpdateProfile(data.user);
      toast.success("Account created. Welcome to Studentpov.");
      navigate({ to: "/communities" });
    } catch (err: any) {
      console.error("Profile setup failed:", err);
      toast.error(err.message || "Profile setup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <TopNav rightSlot={<LiveCount />} />

      <section className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-[460px]">
          <div className="glass-card rounded-2xl p-7 md:p-9">
            <div className="text-center mb-7">
              <h1 className="text-[28px] md:text-[32px] font-semibold tracking-tight text-gradient">
                Enter Studentpov
              </h1>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Know the real college before paying lakhs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6 text-[12px]">
              {(["login", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-xl py-2 border transition backdrop-blur-sm ${
                    mode === m
                      ? "bg-zinc-900/80 border-zinc-700 text-white"
                      : "bg-zinc-950/40 border-zinc-800 text-zinc-500 hover:bg-zinc-900/40"
                  }`}
                >
                  {m === "login" ? "Login" : "Create"}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                mode === "login" ? handleLogin() : handleSignup();
              }}
            >
              <label className="text-[12px] font-medium text-foreground/70">
                College email address
              </label>

              <div className="mt-2 relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@chaitanya.edu.in"
                  autoComplete="email"
                  className={`${inputClass} pl-10`}
                />
              </div>

              <div className="mt-3 relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  className={`${inputClass} pl-10 pr-11`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {mode === "signup" && (
                <>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    className={`mt-3 ${inputClass}`}
                  />

                  <label className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={accept}
                      onChange={(e) => setAccept(e.target.checked)}
                      className="accent-white/80 h-3.5 w-3.5"
                    />
                    I accept Terms & Conditions
                  </label>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => navigate({ to: "/communities" })}
              className="mt-4 w-full rounded-xl border border-white/[0.08] bg-transparent py-3 text-sm text-foreground/85 hover:bg-white/[0.03] transition"
            >
              Continue as Anonymous Viewer
            </button>

            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Anonymous viewers can read but cannot post or chat.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
