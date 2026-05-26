import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Upload, ArrowRight, Loader2 } from "lucide-react";
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

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [accept, setAccept] = useState(false);

  const sendOtp = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) {
      toast.error("Enter a valid college email");
      return;
    }
    if (!normalized.endsWith("@chaitanya.edu.in")) {
      toast.error(
        "Only Chaitanya Deemed to be University emails are supported in this MVP. Upload college proof if you do not have access to your college email.",
        { duration: 7000 },
      );
      return;
    }
    if (!accept) {
      toast.error("Please accept Terms & Conditions");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Verification code sent to " + normalized);
    setStep("otp");
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome to Studentpov");
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

            {step === "email" ? (
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
                    className="glass-input w-full rounded-xl pl-10 pr-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/70"
                  />
                </div>

                <button
                  disabled={loading}
                  onClick={sendOtp}
                  className="mt-4 w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Send Verification Code <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <Divider />

                <button
                  type="button"
                  className="w-full rounded-xl border border-white/[0.07] bg-white/[0.02] hover-lift py-4 px-4 flex items-center gap-3 text-left"
                  onClick={() => toast.info("Document upload coming soon")}
                >
                  <div className="h-9 w-9 grid place-items-center rounded-lg bg-white/[0.04] border border-white/[0.05]">
                    <Upload className="h-4 w-4 text-foreground/80" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-foreground">
                      Upload College Proof
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      ID card, fee receipt, schedule, enrollment proof
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate({ to: "/communities" })}
                  className="mt-3 w-full rounded-xl border border-white/[0.08] bg-transparent py-3 text-sm text-foreground/85 hover:bg-white/[0.03] transition"
                >
                  Continue as Anonymous Viewer
                </button>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  You can browse anonymously but cannot post reviews.
                </p>

                <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="accent-white/80 h-3.5 w-3.5"
                    />
                    Remember me
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={accept}
                      onChange={(e) => setAccept(e.target.checked)}
                      className="accent-white/80 h-3.5 w-3.5"
                    />
                    I accept Terms & Conditions
                  </label>
                </div>
              </>
            ) : (
              <OtpStep
                email={email}
                otp={otp}
                setOtp={setOtp}
                loading={loading}
                verify={verifyOtp}
                resend={sendOtp}
                back={() => setStep("email")}
              />
            )}
          </div>

          <div className="mt-6 flex justify-center gap-6 text-[11px] text-muted-foreground">
            <a className="hover:text-foreground transition" href="#">
              Terms of Service
            </a>
            <a className="hover:text-foreground transition" href="#">
              Privacy Policy
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
      <div className="h-px flex-1 bg-white/[0.06]" />
      OR
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}

function OtpStep({
  email,
  otp,
  setOtp,
  loading,
  verify,
  resend,
  back,
}: {
  email: string;
  otp: string;
  setOtp: (v: string) => void;
  loading: boolean;
  verify: () => void;
  resend: () => void;
  back: () => void;
}) {
  return (
    <div>
      <p className="text-[13px] text-muted-foreground text-center mb-5">
        We sent a 6-digit code to{" "}
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

      <div className="mt-4 flex justify-between text-[12px] text-muted-foreground">
        <button onClick={back} className="hover:text-foreground transition">
          ← Use a different email
        </button>
        <button onClick={resend} className="hover:text-foreground transition">
          Resend code
        </button>
      </div>
    </div>
  );
}
