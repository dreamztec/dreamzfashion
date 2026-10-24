import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-client";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/account/login")({
  validateSearch: (search: Record<string, unknown>): { reset?: boolean } => ({ reset: search.reset === true || search.reset === "true" || search.reset === "1" }),
  head: () => ({
    meta: [
      { title: `Sign In — ${BRAND.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, login, signup, recover, error, clearError, notice, passwordAction, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [recoverNotice, setRecoverNotice] = useState(false);

  // Signed-in users land on the dashboard.
  useEffect(() => {
    if (!loading && user && !passwordAction) void navigate({ to: "/account", replace: true });
  }, [user, loading, navigate, passwordAction]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLocalError(null);
    clearError();
    try {
      if (mode === "signup" && password !== confirmPassword) {
        setLocalError("Your passwords do not match.");
        return;
      }
      if (mode === "signup" && (fullName.trim().length < 2 || !/^[+\d\s()-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15)) {
        setLocalError("Please enter your full name and a valid phone number.");
        return;
      }
      const err =
        mode === "login" ? await login(email.trim(), password) : await signup(email.trim(), password, fullName, phone);
      if (err) {
        setLocalError(err);
      } else {
        try {
          void fetch("/api/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: mode === "login" ? "login" : "account_created" }),
            keepalive: true,
          }).catch(() => undefined);
        } catch {
          /* analytics never blocks auth */
        }
        setPassword("");
        setConfirmPassword("");
        if (mode === "login") void navigate({ to: "/account" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function onRecover(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLocalError(null);
    clearError();
    try {
      const err = await recover(email.trim());
      if (err) setLocalError(err);
      else setRecoverNotice(true);
    } finally {
      setBusy(false);
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    clearError();
    if (password !== confirmPassword) {
      setLocalError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const err = await resetPassword(password);
      if (err) setLocalError(err);
      else { setPassword(""); setConfirmPassword(""); }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-md px-5 pt-36 pb-24" role="status"><p className="text-center text-stone">Loading your account…</p></div>;

  if (passwordAction) {
    return (
      <div className="mx-auto max-w-md px-5 pt-36 pb-24">
        <h1 className="font-editorial text-3xl mb-6 text-center">{passwordAction === "invite" ? "Set your DREAMZ password" : "Choose a new password"}</h1>
        {(localError || error) && <p className="border border-brand-red/40 bg-brand-red/5 px-4 py-3 text-sm mb-6" role="alert">{localError ?? error}</p>}
        <form onSubmit={onReset} className="grid gap-4" aria-busy={busy}>
          <div>
            <label htmlFor="reset-pass" className="input-lux-label">New password</label>
            <input id="reset-pass" type="password" className="input-lux" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
          </div>
          <div>
            <label htmlFor="reset-confirm" className="input-lux-label">Confirm password</label>
            <input id="reset-confirm" type="password" className="input-lux" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
          </div>
          <button type="submit" className="btn-lux btn-lux-primary" disabled={busy}>{busy ? "Updating…" : "Save new password"}</button>
        </form>
      </div>
    );
  }

  if (recovering) {
    return (
      <div className="mx-auto max-w-md px-5 pt-36 pb-24">
        <h1 className="font-editorial text-3xl mb-6 text-center">Reset your password</h1>
        {(localError || error) && <p className="border border-brand-red/40 bg-brand-red/5 px-4 py-3 text-sm mb-6" role="alert">{localError ?? error}</p>}
        {recoverNotice ? (
          <p className="text-center text-stone" role="status">Check your email for a password reset link.</p>
        ) : (
          <form onSubmit={onRecover} className="grid gap-4" aria-busy={busy}>
            <div>
              <label htmlFor="rec-email" className="input-lux-label">Email</label>
              <input id="rec-email" type="email" required className="input-lux" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <button type="submit" className="btn-lux btn-lux-primary" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
            <button type="button" disabled={busy} className="nav-link text-[0.7rem] uppercase tracking-btn" onClick={() => { setRecovering(false); setLocalError(null); }}>
              Back to sign in
            </button>
          </form>
        )}
        {recoverNotice && <button type="button" className="nav-link text-[0.7rem] uppercase tracking-btn mt-6" onClick={() => { setRecovering(false); setRecoverNotice(false); setLocalError(null); }}>Back to sign in</button>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-32 pb-24">
      <div className="text-center mb-10">
        <p className="overline-label mb-3">DREAMZ</p>
        <h1 className="font-editorial text-4xl">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <div className="rule-gold mx-auto mt-5" />
      </div>

      {(localError || error) && (
        <div className="border border-brand-red/40 bg-brand-red/5 px-4 py-3 text-sm mb-6" role="alert">
          {localError ?? error}
        </div>
      )}
      {notice && <div className="border border-gold/50 bg-gold/5 px-4 py-3 text-sm mb-6" role="status">{notice}</div>}
      {notice === "Check your email to verify your DREAMZ account." && <p className="text-sm text-stone mb-6">For an existing unverified account, use the newest verification email. If you already verified your account, sign in or reset your password.</p>}

      <form onSubmit={onSubmit} className="grid gap-4" aria-busy={busy}>
        {mode === "signup" && (
          <div>
            <label htmlFor="auth-name" className="input-lux-label">Full name</label>
            <input id="auth-name" className="input-lux" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required minLength={2} maxLength={120} />
          </div>
        )}
        <div>
          <label htmlFor="auth-email" className="input-lux-label">Email</label>
          <input id="auth-email" type="email" className="input-lux" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        {mode === "signup" && <div>
          <label htmlFor="auth-phone" className="input-lux-label">Phone number</label>
          <input id="auth-phone" type="tel" className="input-lux" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required maxLength={20} />
        </div>}
        <div>
          <label htmlFor="auth-pass" className="input-lux-label">Password</label>
          <input id="auth-pass" type="password" className="input-lux" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : undefined} />
          {mode === "login" && (
            <button type="button" disabled={busy} onClick={() => { setRecovering(true); setLocalError(null); clearError(); }} className="mt-2 text-xs text-stone underline">
              Forgot your password?
            </button>
          )}
        </div>
        {mode === "signup" && <div>
          <label htmlFor="auth-confirm" className="input-lux-label">Confirm password</label>
          <input id="auth-confirm" type="password" className="input-lux" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
        </div>}
        <button type="submit" className="btn-lux btn-lux-primary" disabled={busy}>
          {busy ? "One moment…" : mode === "login" ? "Sign In" : "Create My DREAMZ Account"}
        </button>
      </form>

      <p className="text-center text-sm text-stone mt-8">
        {mode === "login" ? (
          <>
            New to DREAMZ?{" "}
            <button type="button" disabled={busy} className="underline" onClick={() => { setMode("signup"); setLocalError(null); clearError(); setPassword(""); }}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button type="button" disabled={busy} className="underline" onClick={() => { setMode("login"); setLocalError(null); clearError(); setPassword(""); setConfirmPassword(""); }}>
              Sign in
            </button>
          </>
        )}
      </p>
      <p className="text-center text-xs text-stone mt-6 leading-relaxed">
        Your password is verified by Netlify Identity — DREAMZ never stores or
        sees it. Creating an account unlocks rewards, vouchers, referrals and
        your order history.
      </p>
    </div>
  );
}
