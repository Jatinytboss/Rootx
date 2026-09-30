import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { signIn, signUp } from "@/lib/auth.functions";
import { isSignedIn, saveSession } from "@/lib/auth-client";
import { AuthAtmosphere, HeartbeatLogo } from "@/components/uptimer/AuthAtmosphere";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — rootX UPTIMER" },
      {
        name: "description",
        content: "Sign in to rootX UPTIMER for reliable, real-time website uptime monitoring.",
      },
      { property: "og:title", content: "Sign in — rootX UPTIMER" },
      {
        property: "og:description",
        content: "Sign in to rootX UPTIMER for reliable, real-time website uptime monitoring.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function Field({
  label,
  children,
  delay,
}: {
  label: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <div
      className="mb-[17px]"
      data-reveal
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      <label className="mb-2 block text-[11px] font-semibold text-[#c7cbd0]">{label}</label>
      <div className="relative">{children}</div>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  useReveal(mode);

  const doSignIn = useServerFn(signIn);
  const doSignUp = useServerFn(signUp);

  useEffect(() => {
    if (isSignedIn()) navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#signup") {
      setMode("signup");
    }
  }, []);

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    if (mode === "signup") {
      if (password !== confirm) {
        toast.error("Passwords do not match.");
        return;
      }
      if (!agreed) {
        toast.error("Please accept the Terms and Privacy Policy.");
        return;
      }
    }

    setBusy(true);
    try {
      const result =
        mode === "signup"
          ? await doSignUp({ data: { email, password, fullName } })
          : await doSignIn({ data: { email, password } });
      saveSession(result.token, result.user);
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <>
      <AuthAtmosphere />
      <main className="flex min-h-screen items-center justify-center px-[18px] py-[30px]">
        <div className="w-full max-w-[430px]">
          <div className="mb-[25px] text-center" data-reveal>
            <HeartbeatLogo />
            <h1 className="text-[20px] font-extrabold tracking-[-0.8px] text-white">
              rootX <span className="font-semibold text-[#7d838c]">UPTIMER</span>
            </h1>
            <p className="mt-[5px] text-[11px] text-[#686d75]">Reliable website monitoring</p>
          </div>

          <div
            className="auth-card"
            data-reveal
            style={{ "--reveal-delay": "80ms" } as React.CSSProperties}
          >
            <div
              className="mb-[25px]"
              data-reveal
              style={{ "--reveal-delay": "140ms" } as React.CSSProperties}
            >
              <h2 className="text-[29px] leading-[1.15] font-extrabold tracking-[-1.4px]">
                {isSignup ? "Create account." : "Welcome back."}
              </h2>
              <p className="mt-2 text-[12px] leading-[1.6] text-[#858a92]">
                {isSignup
                  ? "Start monitoring your websites with rootX."
                  : "Sign in to manage your monitors and account."}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {isSignup && (
                <Field label="Full name" delay={180}>
                  <input
                    className="auth-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    maxLength={80}
                    required
                  />
                </Field>
              )}

              <Field label="Email address" delay={220}>
                <input
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={255}
                  required
                />
              </Field>

              <Field label="Password" delay={260}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? "Create a password" : "Enter your password"}
                  minLength={6}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2 flex size-[34px] -translate-y-1/2 items-center justify-center rounded-lg text-[#70757d] transition hover:bg-[#15171b] hover:text-white"
                >
                  {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </Field>

              {isSignup && (
                <>
                  <div className="mb-[17px] flex gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="strength-seg" data-on={strength > i} />
                    ))}
                  </div>

                  <Field label="Confirm password" delay={300}>
                    <input
                      type={showConfirm ? "text" : "password"}
                      className="auth-input"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      minLength={6}
                      maxLength={72}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute top-1/2 right-2 flex size-[34px] -translate-y-1/2 items-center justify-center rounded-lg text-[#70757d] transition hover:bg-[#15171b] hover:text-white"
                    >
                      {showConfirm ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                    </button>
                  </Field>
                </>
              )}

              <div
                className="mt-[1px] mb-5 flex items-center justify-between gap-3"
                data-reveal
                style={{ "--reveal-delay": "340ms" } as React.CSSProperties}
              >
                {isSignup ? (
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[#777c84]">
                    <input
                      type="checkbox"
                      className="auth-check"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />
                    <span>
                      I agree to the <span className="text-white">Terms</span> and{" "}
                      <span className="text-white">Privacy Policy</span>
                    </span>
                  </label>
                ) : (
                  <>
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[#777c84]">
                      <input
                        type="checkbox"
                        className="auth-check"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      onClick={() => toast.info("Password reset link coming to your email soon.")}
                      className="text-[11px] text-[#969ba3] transition hover:text-white"
                    >
                      Forgot password?
                    </button>
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="auth-btn"
                data-reveal
                style={{ "--reveal-delay": "380ms" } as React.CSSProperties}
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {isSignup ? "Create Account" : "Sign In"}
              </button>
            </form>

          </div>

          <p
            className="mt-6 text-center text-[12px] text-[#6c717a]"
            data-reveal
            style={{ "--reveal-delay": "500ms" } as React.CSSProperties}
          >
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              className="font-bold text-white"
              onClick={() => setMode(isSignup ? "signin" : "signup")}
            >
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </main>
    </>
  );
}
