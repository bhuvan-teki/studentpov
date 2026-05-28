import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ArrowRight, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TopNav, LiveCount } from "@/components/TopNav";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Enter Studentpov — Verified college student community" },
      {
        name: "description",
        content:
          "Anonymous, verified college reviews. Know the real college before paying lakhs.",
      },
    ],
  }),
  component: LoginPage,
});

type Mode = "login" | "signup" | "documents";
type Step = "form" | "otp";

const COLLEGE_DOMAIN = "@chaitanya.edu.in";
const COLLEGE_SLUG = "chaitanya-deemed";
const DOC_BUCKET = "verification-documents";

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
  const [step, setStep] = useState<Step>("form");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [proofType, setProofType] = useState("Student ID card");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const normalizedEmail = email.trim().toLowerCase();

  const getCollegeId = async () => {
    const { data, error } = await supabase
      .from("colleges")
      .select("id")
      .eq("slug", COLLEGE_SLUG)
      .maybeSingle();

    if (error || !data) throw new Error("College not found");
    return data.id as string;
  };

  const ensureProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) throw new Error("No logged in user found");

    const collegeId = await getCollegeId();

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, anonymous_username")
      .eq("id", user.id)
      .maybeSingle();

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
        avatar_seed: crypto.randomUUID(),
      })
      .eq("id", user.id);

    if (error) throw error;
  };

  const startLogin = async () => {
    if (!normalizedEmail.endsWith(COLLEGE_DOMAIN)) {
      toast.error("Use your Chaitanya student email or verify with documents.");
      setMode("documents");
      return;
    }

    if (!password) {
      toast.error("Enter your password");
      return;
    }

    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (loginError) {
      setLoading(false);
      toast.error("Wrong email or password. Try document verification.");
      setMode("documents");
      return;
    }

    await supabase.auth.signOut();

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    setLoading(false);

    if (otpError) {
      toast.error(otpError.message);
      return;
    }

    toast.success("6-digit verification code sent");
    setStep("otp");
  };

  const startSignup = async () => {
    if (!normalizedEmail.endsWith(COLLEGE_DOMAIN)) {
      toast.error("Only Chaitanya student emails are allowed.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!accept) {
      toast.error("Please accept Terms & Conditions");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
  email: normalizedEmail,
  options: {
    shouldCreateUser: false,
  },
});

    setLoading(false);

    if (otpError) {
      toast.error(otpError.message);
      return;
    }

    toast.success("Account created. Enter the 6-digit code.");
    setStep("otp");
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
  email: normalizedEmail,
  token: otp,
  type: "email",
});

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    try {
      await ensureProfile();
      toast.success("Welcome to Studentpov");
      navigate({ to: "/communities" });
    } catch (err: any) {
      toast.error(err.message || "Profile setup failed");
    } finally {
      setLoading(false);
    }
  };

  const submitDocument = async () => {
    if (!fullName.trim()) {
      toast.error("Enter your full name");
      return;
    }

    if (!file) {
      toast.error("Upload a valid document");
      return;
    }

    setLoading(true);

    const safeName = `${Date.now()}-${file.name.replaceAll(" ", "-")}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(DOC_BUCKET)
      .upload(safeName, file);

    if (uploadError) {
      setLoading(false);
      toast.error(uploadError.message);
      return;
    }

    const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  setLoading(false);
  toast.error("First create an account, then upload documents for manual verification.");
  setMode("signup");
  return;
}

    const { error } = await supabase.from("verification_documents").insert({
      user_id: user.id,
      file_url: uploadData.path,
      proof_type: proofType,
      full_name: fullName.trim(),
      college_email: docEmail.trim().toLowerCase() || null,
      note: note.trim() || null,
      status: "pending",
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Verification submitted. Admin will review soon.");
    navigate({ to: "/communities" });
  };

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

            <div className="grid grid-cols-3 gap-2 mb-6 text-[12px]">
              {(["login", "signup", "documents"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setStep("form");
                  }}
                  className={`rounded-xl py-2 border transition backdrop-blur-sm ${
  mode === m
    ? "bg-zinc-900/80 border-zinc-700 text-white shadow-[0_0_20px_rgba(255,255,255,0.03)]"
    : "bg-zinc-950/40 border-zinc-800 text-zinc-500 hover:bg-zinc-900/40"
}`}
                >
                  {m === "login" ? "Login" : m === "signup" ? "Create" : "Docs"}
                </button>
              ))}
            </div>

            {step === "otp" ? (
              <OtpStep
                email={email}
                otp={otp}
                setOtp={setOtp}
                loading={loading}
                verify={verifyOtp}
                back={() => setStep("form")}
              />
            ) : mode === "documents" ? (
              <div className="space-y-3">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="glass-input w-full rounded-xl pl-10 pr-3 py-3 text-sm bg-white/[0.03] text-foreground placeholder:text-muted-foreground/60"
                />

                <input
                  value={docEmail}
                  onChange={(e) => setDocEmail(e.target.value)}
                  placeholder="College email if available"
                  className="glass-input w-full rounded-xl pl-10 pr-3 py-3 text-sm bg-white/[0.03] text-foreground placeholder:text-muted-foreground/60"
                />

                <select
                  value={proofType}
                  onChange={(e) => setProofType(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-3 text-sm bg-background"
                >
                  <option>Student ID card</option>
                  <option>Fee receipt</option>
                  <option>Admission letter</option>
                  <option>Class timetable</option>
                  <option>Bonafide certificate</option>
                  <option>Enrollment proof</option>
                  <option>Hall ticket</option>
                  <option>Other college proof</option>
                </select>

                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="glass-input w-full rounded-xl px-3 py-3 text-sm"
                />

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Short note for admin"
                  className="glass-input w-full rounded-xl px-3 py-3 text-sm resize-none"
                  rows={3}
                />

                <button
                  disabled={loading}
                  onClick={submitDocument}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify with documents"}
                </button>
              </div>
            ) : (
              <>
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
                    className="glass-input w-full rounded-xl pl-10 pr-3 py-3 text-sm"
                  />
                </div>

                <div className="mt-3 relative">
  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <input
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Password"
    autoComplete="current-password"
    className="glass-input w-full rounded-xl pl-10 pr-11 py-3 text-sm bg-white/[0.03] text-foreground placeholder:text-muted-foreground/60"
  />
  <button
    type="button"
    onClick={() => setShowPassword((v) => !v)}
    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
  >
    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </button>
</div>

                {mode === "signup" && (
                  <>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="glass-input mt-3 w-full rounded-xl px-3 py-3 text-sm"
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
                  disabled={loading}
                  onClick={mode === "login" ? startLogin : startSignup}
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
              </>
            )}

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

function OtpStep({
  email,
  otp,
  setOtp,
  loading,
  verify,
  back,
}: {
  email: string;
  otp: string;
  setOtp: (v: string) => void;
  loading: boolean;
  verify: () => void;
  back: () => void;
}) {
  return (
    <div>
      <p className="text-[13px] text-muted-foreground text-center mb-5">
        Enter the 6-digit code sent to{" "}
        <span className="text-foreground">{email}</span>
      </p>

      <input
        inputMode="numeric"
        maxLength={6}
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        placeholder="• • • • • •"
        className="glass-input w-full rounded-xl py-4 text-center text-xl tracking-[0.5em] text-foreground font-medium"
      />

      <button
        disabled={loading}
        onClick={verify}
        className="mt-4 w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Enter"}
      </button>

      <button
        onClick={back}
        className="mt-4 text-[12px] text-muted-foreground hover:text-foreground transition"
      >
        ← Back
      </button>
    </div>
  );
}
