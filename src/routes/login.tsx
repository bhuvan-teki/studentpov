import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2, Lock, Mail, User, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { TopNav, LiveCount } from "@/components/TopNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: AuthPage,
});

type Mode = "login" | "create";

const COLLEGE_DOMAIN = "@chaitanya.edu.in";
const COLLEGE_SLUG = "chaitanya-deemed";

const avatars = ["🦊", "🐺", "🐯", "🦅", "🐼", "🤖", "👾", "🦉"];

const inputClass =
  "w-full rounded-2xl bg-zinc-950/80 border border-white/[0.06] text-white placeholder:text-zinc-500 px-4 py-3 outline-none transition focus:border-white/[0.12] focus:bg-zinc-950 shadow-none";

function AuthPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  async function getCollegeId() {
    const { data, error } = await supabase
      .from("colleges")
      .select("id")
      .eq("slug", COLLEGE_SLUG)
      .single();

    if (error || !data) throw new Error("College not found.");
    return data.id;
  }

  async function getNextAnonymousUsername() {
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (error) throw error;
    return `anonymous_${(count || 0) + 1}`;
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

    toast.success("Welcome back to Studentpov.");
    setLoading(false);
    navigate({ to: "/communities" });
  }

  async function handleCreateAccount() {
    if (!firstName.trim()) {
      toast.error("Enter your first name.");
      return;
    }

    if (!lastName.trim()) {
      toast.error("Enter your last name.");
      return;
    }

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

    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (authError || !authData.user) {
      setLoading(false);

      const msg = authError?.message?.toLowerCase() || "";

      if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("user already")
      ) {
        toast.error("User already registered. Try logging in.");
        setMode("login");
        return;
      }

      toast.error(authError?.message || "Account creation failed.");
      return;
    }

    try {
  const collegeId = await getCollegeId();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("anonymous_username, avatar_seed, first_name, last_name")
    .eq("id", data.user.id)
    .maybeSingle();

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: data.user.id,
      email: data.user.email?.toLowerCase(),
      college_id: collegeId,
      verification_status: "verified",
      anonymous_username: existingProfile?.anonymous_username || await getNextAnonymousUsername(),
      avatar_seed: existingProfile?.avatar_seed || "🦊",
      first_name: existingProfile?.first_name || "",
      last_name: existingProfile?.last_name || "",
      bio: "",
    },
    { onConflict: "id" }
  );

  if (profileError) throw profileError;

  toast.success("Welcome back to Studentpov.");
  navigate({ to: "/communities" });
} catch (err: any) {
  toast.error(err.message || "Profile repair failed.");
} finally {
  setLoading(false);
}

  return (
    <main className="min-h-screen flex flex-col">
      <TopNav rightSlot={<LiveCount />} />

      <section className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-[520px]">
          <div className="glass-card rounded-2xl p-7 md:p-9">
            <div className="text-center mb-7">
              <h1 className="text-[28px] md:text-[32px] font-semibold tracking-tight text-gradient">
                Enter Studentpov
              </h1>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Verified student access. Anonymous public identity.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6 text-[12px]">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-xl py-2 border transition ${
                  mode === "login"
                    ? "bg-zinc-900/80 border-zinc-700 text-white"
                    : "bg-zinc-950/40 border-zinc-800 text-zinc-500"
                }`}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => setMode("create")}
                className={`rounded-xl py-2 border transition ${
                  mode === "create"
                    ? "bg-zinc-900/80 border-zinc-700 text-white"
                    : "bg-zinc-950/40 border-zinc-800 text-zinc-500"
                }`}
              >
                Create
              </button>
            </div>

            <form
              className="space-y-3"
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                mode === "login" ? handleLogin() : handleCreateAccount();
              }}
            >
              {mode === "create" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      autoComplete="off"
                      name="studentpov_first_name"
                      className={`${inputClass} pl-10`}
                    />
                  </div>

                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    autoComplete="off"
                    name="studentpov_last_name"
                    className={inputClass}
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@chaitanya.edu.in"
                  autoComplete="off"
                  name="studentpov_college_email"
                  className={`${inputClass} pl-10`}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "login" ? "Password" : "Create password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  name="studentpov_password"
                  className={`${inputClass} pl-10 pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {mode === "create" && (
                <>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      name="studentpov_confirm_password"
                      className={`${inputClass} pl-10 pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div>
                    <p className="mb-2 text-[12px] text-muted-foreground">
                      Pick avatar
                    </p>

                    <div className="grid grid-cols-8 gap-2">
                      {avatars.map((avatar) => (
                        <button
                          key={avatar}
                          type="button"
                          onClick={() => setSelectedAvatar(avatar)}
                          className={`h-10 rounded-xl border text-xl transition ${
                            selectedAvatar === avatar
                              ? "border-zinc-500 bg-zinc-900"
                              : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/40"
                          }`}
                        >
                          {avatar}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: "/communities" })}
                className="w-full rounded-xl border border-white/[0.08] bg-transparent py-3 text-sm text-foreground/85 hover:bg-white/[0.03] transition"
              >
                Continue as Anonymous Viewer
              </button>

              <p className="text-center text-[11px] text-muted-foreground">
                Your real name is private. Public identity uses only username and avatar.
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
