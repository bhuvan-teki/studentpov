import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { TopNav, LiveCount } from "@/components/TopNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: AuthPage,
});

type Mode = "login" | "create";

const COLLEGE_DOMAIN = "@chaitanya.edu.in";
const COLLEGE_SLUG = "chaitanya-deemed";

const inputClass =
  "w-full rounded-2xl bg-zinc-950/80 border border-white/[0.06] text-white placeholder:text-zinc-500 px-4 py-3 outline-none transition focus:border-white/[0.12] focus:bg-zinc-950 shadow-none";

function AuthPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [assignedIdentity, setAssignedIdentity] = useState<string | null>(null);
  const [identitySetupUserId, setIdentitySetupUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  async function getCollegeId() {
    const { data, error } = await supabase
      .from("colleges")
      .select("id")
      .eq("slug", COLLEGE_SLUG)
      .single();

    if (error || !data) {
      throw new Error("College not found.");
    }

    return data.id;
  }

  async function assignAndActivateIdentity(userId: string) {
    const collegeId = await getCollegeId();

    const { data: assignedUsername, error: usernameError } = await (supabase.rpc as any)(
      "assign_anonymous_username",
      {
        p_user_id: userId,
        p_prefix: "auto",
      }
    );

    if (usernameError || !assignedUsername) {
      console.error("USERNAME ASSIGNMENT ERROR:", usernameError);
      throw usernameError || new Error("Could not assign anonymous identity.");
    }

    const finalUsername = assignedUsername as string;

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: normalizedEmail,
          college_id: collegeId,
          verification_status: "verified",
          anonymous_username: finalUsername,
          avatar_seed: "anonymous-default",
          bio: "",
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("PROFILE UPDATE ERROR:", profileError);
      throw profileError;
    }

    setIdentitySetupUserId(null);
    setAssignedIdentity(finalUsername);
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

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error || !data.user) {
        console.error("LOGIN AUTH ERROR:", error);
        toast.error(error?.message || "Login failed.");
        return;
      }

      const collegeId = await getCollegeId();

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("anonymous_username, verification_status, college_id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("PROFILE FETCH ERROR:", profileError);
        throw profileError;
      }

      const missingUsername = !profile?.anonymous_username;
      const oldUsername = profile?.anonymous_username?.startsWith("anonymous_");
      const notVerified = profile?.verification_status !== "verified";
      const wrongCollege = profile?.college_id !== collegeId;

      if (missingUsername || oldUsername || notVerified || wrongCollege) {
        setIdentitySetupUserId(data.user.id);
        toast.info("Set your anonymous identity to continue.");
        return;
      }

      toast.success("Welcome back to Studentpov.");
      navigate({ to: "/communities" });
    } catch (err: any) {
      console.error("LOGIN ERROR:", err);
      toast.error(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAccount() {
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

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            anonymous_prefix: "auto",
            college_slug: COLLEGE_SLUG,
          },
        },
      });

      if (authError || !authData.user) {
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

        throw authError || new Error("Account creation failed.");
      }

      if (!authData.session) {
        toast.error(
          "Account created. Confirm Email is still enabled, so instant entry is blocked."
        );
        setMode("login");
        return;
      }

      const { data: createdProfile, error: profileError } = await supabase
        .from("profiles")
        .select("anonymous_username, verification_status, college_id")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !createdProfile?.anonymous_username) {
        console.error("CREATED PROFILE FETCH ERROR:", profileError);
        throw profileError || new Error("Profile identity was not created.");
      }

      if (createdProfile.verification_status !== "verified") {
        throw new Error("Profile was created but is not verified.");
      }

      setAssignedIdentity(createdProfile.anonymous_username);
      toast.success("Your anonymous identity is ready.");
    } catch (err: any) {
      console.error("ACCOUNT SETUP ERROR:", err);
      toast.error(err?.message || "Profile setup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExistingIdentitySetup() {
    if (!identitySetupUserId) return;

    setLoading(true);

    try {
      await assignAndActivateIdentity(identitySetupUserId);
      toast.success("Your anonymous identity is ready.");
    } catch (err: any) {
      console.error("IDENTITY SETUP ERROR:", err);
      toast.error(err?.message || "Could not activate your identity.");
    } finally {
      setLoading(false);
    }
  }

  function chooseMode(nextMode: Mode) {
    setMode(nextMode);
    setIdentitySetupUserId(null);
    setAssignedIdentity(null);
    setConfirmPassword("");
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

            {!assignedIdentity && !identitySetupUserId && (
              <div className="grid grid-cols-2 gap-2 mb-6 text-[12px]">
                <button
                  type="button"
                  onClick={() => chooseMode("login")}
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
                  onClick={() => chooseMode("create")}
                  className={`rounded-xl py-2 border transition ${
                    mode === "create"
                      ? "bg-zinc-900/80 border-zinc-700 text-white"
                      : "bg-zinc-950/40 border-zinc-800 text-zinc-500"
                  }`}
                >
                  Create
                </button>
              </div>
            )}

            {assignedIdentity ? (
              <div className="space-y-4 text-center">
                <p className="text-[12px] text-muted-foreground">
                  Your anonymous identity
                </p>

                <div className="rounded-2xl bg-zinc-950/80 border border-white/[0.06] px-4 py-4 text-[18px] font-medium text-white">
                  {assignedIdentity}
                </div>

                <p className="text-[12px] text-muted-foreground">
                  Other students will see this name when you post.
                </p>

                <button
                  type="button"
                  onClick={() => navigate({ to: "/communities" })}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  Enter Community <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : identitySetupUserId ? (
              <div className="space-y-4">
                <div className="text-center mb-5">
  <h2 className="text-[18px] font-medium text-white">
    Activate your anonymous identity
  </h2>
  <p className="mt-2 text-[12px] text-muted-foreground">
    Your anonymous name will be assigned automatically.
  </p>
</div>

                <button
                  type="button"
                  onClick={handleExistingIdentitySetup}
                  disabled={loading}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Activate Identity <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => chooseMode("login")}
                  className="w-full rounded-xl border border-white/[0.08] bg-transparent py-3 text-sm text-foreground/85 hover:bg-white/[0.03] transition"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form
                className="space-y-3"
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  mode === "login" ? handleLogin() : handleCreateAccount();
                }}
              >
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
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {mode === "create" && (
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
      onClick={() => setShowConfirmPassword((value) => !value)}
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    >
      {showConfirmPassword ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
    </button>
  </div>
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
                  Your college email stays private. Other students see only your anonymous identity.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
