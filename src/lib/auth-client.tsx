import {
  login as identityLogin,
  signup as identitySignup,
  logout as identityLogout,
  getUser,
  handleAuthCallback,
  requestPasswordRecovery,
  updateUser,
  hydrateSession,
  onAuthChange,
  acceptInvite,
  verifyEmailChange,
  type CallbackResult,
} from "@netlify/identity";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ensureMyCustomerProfile } from "@/server/customer.functions";
import { humanizeAuthError } from "./auth-errors";

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string;
  emailVerified: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  notice: string | null;
  clearNotice: () => void;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (email: string, password: string, fullName: string, phone: string) => Promise<string | null>;
  logout: () => Promise<void>;
  recover: (email: string) => Promise<string | null>;
  saveProfile: (fullName: string) => Promise<string | null>;
  error: string | null;
  clearError: () => void;
  passwordAction: "recovery" | "invite" | null;
  resetPassword: (password: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(user: Awaited<ReturnType<typeof getUser>>): AuthUser | null {
  if (!user) return null;
  return { id: user.id, email: user.email ?? null,
    fullName: String(user.userMetadata?.full_name ?? user.userMetadata?.name ?? ""),
    emailVerified: Boolean(user.confirmedAt) };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [passwordAction, setPasswordAction] = useState<"recovery" | "invite" | null>(null);
  const callbackPromise = useRef<Promise<CallbackResult | null> | null>(null);
  const inviteToken = useRef<string | null>(null);
  const emailChangeToken = useRef<string | null>(null);
  const navigate = useNavigate();

  async function syncProfile() {
    try {
      await ensureMyCustomerProfile();
    } catch {
      setNotice("You are signed in, but your customer profile could not load. Please refresh to try again.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthChange((_event, current) => {
      if (!cancelled) {
        setUser(toAuthUser(current));
        if (!current) setPasswordAction(null);
      }
    });
    (async () => {
      try {
        if (!callbackPromise.current) {
          const parameters = new URLSearchParams(window.location.hash.slice(1));
          if (parameters.has("error") || parameters.has("error_description")) throw new Error("Authentication callback failed");
          emailChangeToken.current = parameters.get("email_change_token");
          callbackPromise.current = hydrateSession().then(() => handleAuthCallback());
        }
        const callback = await callbackPromise.current;
        const current = await getUser();
        if (cancelled) return;
        setUser(toAuthUser(current));
        if (current) void syncProfile();
        const resetting = ["1", "true"].includes(new URLSearchParams(window.location.search).get("reset") ?? "");
        if (resetting && !current) setError("Your password reset session has expired. Request a new reset link.");
        if (callback?.type === "recovery" || current && resetting) {
          setPasswordAction("recovery");
          void navigate({ to: "/account/login", search: { reset: true }, replace: true });
        } else if (callback?.type === "invite") {
          inviteToken.current = callback.token ?? null;
          setPasswordAction("invite");
          void navigate({ to: "/account/login", replace: true });
        } else if (callback) {
          emailChangeToken.current = null;
          setNotice(callback.type === "confirmation" ? "Your DREAMZ email is verified. Welcome to your account." : callback.type === "email_change" ? "Your email address is updated." : "Welcome to your DREAMZ account.");
          void navigate({ to: "/account", replace: true });
        }
      } catch {
        if (!cancelled) {
          setError(emailChangeToken.current ? "Sign in to confirm your email change." : "This account link is invalid or expired. Please sign in or request a new password reset link.");
          window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
          void navigate({ to: "/account/login", replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; unsubscribe(); };
  }, [navigate]);

  const login: AuthContextValue["login"] = async (email, password) => {
    setError(null);
    setNotice(null);
    try {
      setUser(toAuthUser(await identityLogin(email, password)));
      if (emailChangeToken.current) {
        try {
          setUser(toAuthUser(await verifyEmailChange(emailChangeToken.current)));
          setNotice("Your email address is updated.");
        } catch {
          setNotice("You are signed in, but your email change could not be verified. Please contact DREAMZ support.");
        }
        emailChangeToken.current = null;
      }
      await syncProfile();
      return null;
    } catch (err) {
      return humanizeAuthError(err);
    }
  };

  const signup: AuthContextValue["signup"] = async (email, password, fullName, phone) => {
    setError(null);
    setNotice(null);
    try {
      const current = await identitySignup(email, password, { full_name: fullName.trim(), phone: phone.trim() });
      if (!current.confirmedAt) {
        setUser(null);
        setNotice("Check your email to verify your DREAMZ account.");
        return null;
      }
      setUser(toAuthUser(await getUser()));
      await syncProfile();
      return null;
    } catch (err) {
      return humanizeAuthError(err, "signup");
    }
  };

  const logout: AuthContextValue["logout"] = async () => {
    try {
      await identityLogout();
    } catch {
      setNotice("You are signed out on this device. We could not reach the server; sign out on other devices separately.");
    } finally {
      setUser(null);
      setPasswordAction(null);
      inviteToken.current = null;
      emailChangeToken.current = null;
      for (const name of ["nf_jwt", "nf_refresh"]) document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax; secure`;
      await getUser();
    }
  };

  const recover: AuthContextValue["recover"] = async (email) => {
    setError(null);
    try {
      await requestPasswordRecovery(email);
      setNotice("Check your email for a password reset link.");
      return null;
    } catch (err) {
      return humanizeAuthError(err, "recovery");
    }
  };

  const saveProfile: AuthContextValue["saveProfile"] = async (fullName) => {
    setError(null);
    try {
      setUser(toAuthUser(await updateUser({ data: { full_name: fullName } })));
      return null;
    } catch (err) {
      return humanizeAuthError(err, "update");
    }
  };

  const resetPassword: AuthContextValue["resetPassword"] = async (password) => {
    try {
      if (passwordAction === "invite" && inviteToken.current) {
        setUser(toAuthUser(await acceptInvite(inviteToken.current, password)));
        inviteToken.current = null;
      } else if (passwordAction === "recovery") {
        setUser(toAuthUser(await updateUser({ password })));
      } else return "Open a valid password reset or invitation link from your email.";
      setPasswordAction(null);
      setNotice("Your password is updated. Welcome to your DREAMZ account.");
      await syncProfile();
      await navigate({ to: "/account", replace: true });
      return null;
    } catch (err) {
      return humanizeAuthError(err, "update");
    }
  };

  return <AuthContext.Provider value={{ user, loading, notice, clearNotice: () => setNotice(null),
    login, signup, logout, recover, saveProfile, error, clearError: () => setError(null),
    passwordAction, resetPassword }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
