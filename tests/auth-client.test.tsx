import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode, useEffect, type ComponentType, type ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  login: vi.fn(), signup: vi.fn(), logout: vi.fn(), getUser: vi.fn(),
  handleAuthCallback: vi.fn(), requestPasswordRecovery: vi.fn(), updateUser: vi.fn(),
  hydrateSession: vi.fn(), acceptInvite: vi.fn(), verifyEmailChange: vi.fn(),
  profile: vi.fn(), navigate: vi.fn(), outletMounted: vi.fn(), pathname: "/account/login",
  listeners: new Set<(event: string, user: unknown) => void>(),
}));

vi.mock("@netlify/identity", async (original) => ({
  ...await original<typeof import("@netlify/identity")>(), ...mocks,
  onAuthChange: (listener: (event: string, user: unknown) => void) => {
    mocks.listeners.add(listener);
    return () => { mocks.listeners.delete(listener); };
  },
}));
vi.mock("@/server/customer.functions", () => ({ ensureMyCustomerProfile: mocks.profile }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => mocks.pathname,
  createFileRoute: () => (options: unknown) => ({ options }),
  Outlet: () => {
    useEffect(() => { mocks.outletMounted(); }, []);
    return <div data-testid="public-outlet">Authentication route content</div>;
  },
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

import { AuthError } from "@netlify/identity";
import { AuthProvider, useAuth } from "../src/lib/auth-client";
import { Route as LoginRoute } from "../src/routes/account/login";
import { Route as AccountRoute } from "../src/routes/account";

const LoginPage = LoginRoute.options.component as ComponentType;
const AccountLayout = AccountRoute.options.component as ComponentType;
const confirmedUser = { id: "identity-customer", email: "customer@example.com", confirmedAt: "2026-10-05T00:00:00Z", userMetadata: { full_name: "DREAMZ Test" } };

function SessionProbe() {
  const auth = useAuth();
  return <><p data-testid="session">{auth.loading ? "loading" : auth.user?.id ?? "signed-out"}</p><button onClick={() => void auth.logout()}>Log out</button></>;
}

async function openLogin() {
  render(<AuthProvider><LoginPage /><SessionProbe /></AuthProvider>);
  await screen.findByLabelText("Email");
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listeners.clear();
  mocks.pathname = "/account/login";
  window.history.replaceState({}, "", "/account/login");
  mocks.getUser.mockResolvedValue(null);
  mocks.hydrateSession.mockResolvedValue(null);
  mocks.handleAuthCallback.mockResolvedValue(null);
  mocks.profile.mockResolvedValue({ ok: true });
  mocks.navigate.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null)));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Customer authentication UI and SDK integration", () => {
  it("renders the public login child for signed-out customers without a redirect loop", async () => {
    render(<AuthProvider><AccountLayout /></AuthProvider>);
    expect(screen.getByTestId("public-outlet")).toBeTruthy();
    await waitFor(() => expect(mocks.getUser).toHaveBeenCalled());
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("redirects signed-out customers away from private account pages", async () => {
    mocks.pathname = "/account/orders";
    render(<AuthProvider><AccountLayout /></AuthProvider>);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/account/login", search: { reset: false }, replace: true }));
    expect(screen.queryByTestId("public-outlet")).toBeNull();
  });
  it("calls Identity signup with name and phone and stays on the verification notice", async () => {
    mocks.signup.mockResolvedValue({ ...confirmedUser, confirmedAt: undefined });
    await openLogin();
    fireEvent.click(screen.getByText("Create an account"));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "DREAMZ Test" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "customer@example.com" } });
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "08031234567" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-input-only" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "test-input-only" } });
    fireEvent.click(screen.getByText("Create My DREAMZ Account"));
    await screen.findByText("Check your email to verify your DREAMZ account.");
    expect(mocks.signup).toHaveBeenCalledWith("customer@example.com", "test-input-only", { full_name: "DREAMZ Test", phone: "08031234567" });
    expect(screen.getByTestId("session").textContent).toBe("signed-out");
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it("rejects mismatching passwords before calling signup", async () => {
    await openLogin();
    fireEvent.click(screen.getByText("Create an account"));
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-input-only" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "different-test-input" } });
    fireEvent.submit(screen.getByText("Create My DREAMZ Account").closest("form")!);
    await screen.findByText("Your passwords do not match.");
    expect(mocks.signup).not.toHaveBeenCalled();
  });
  it("logs in through Identity and ensures a database profile", async () => {
    mocks.login.mockResolvedValue(confirmedUser);
    await openLogin();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "customer@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-input-only" } });
    fireEvent.click(screen.getByText("Sign In"));
    await waitFor(() => expect(screen.getByTestId("session").textContent).toBe(confirmedUser.id));
    expect(mocks.login).toHaveBeenCalledWith("customer@example.com", "test-input-only");
    expect(mocks.profile).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/account" });
  });
  it("shows a useful wrong-password error instead of raw API output", async () => {
    mocks.login.mockRejectedValue(new AuthError("Invalid login credentials", 400));
    await openLogin();
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);
    await screen.findByText("Email or password is incorrect.");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("restores an existing SDK session on page refresh", async () => {
    mocks.getUser.mockResolvedValue(confirmedUser);
    render(<AuthProvider><SessionProbe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("session").textContent).toBe(confirmedUser.id));
    expect(mocks.hydrateSession).toHaveBeenCalledOnce();
    expect(mocks.profile).toHaveBeenCalled();
  });
  it.each(["confirmation", "oauth", "email_change"])("processes a %s callback and redirects to the dashboard", async (type) => {
    mocks.handleAuthCallback.mockResolvedValue({ type, user: confirmedUser });
    mocks.getUser.mockResolvedValue(confirmedUser);
    render(<AuthProvider><SessionProbe /></AuthProvider>);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/account", replace: true }));
    expect(screen.getByTestId("session").textContent).toBe(confirmedUser.id);
  });
  it("requires a new password after a recovery link before dashboard navigation", async () => {
    mocks.handleAuthCallback.mockResolvedValue({ type: "recovery", user: confirmedUser });
    mocks.getUser.mockResolvedValue(confirmedUser);
    mocks.updateUser.mockResolvedValue(confirmedUser);
    render(<AuthProvider><LoginPage /></AuthProvider>);
    await screen.findByText("Choose a new password");
    expect(mocks.navigate).not.toHaveBeenCalledWith({ to: "/account", replace: true });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "updated-test-input" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "updated-test-input" } });
    fireEvent.click(screen.getByText("Save new password"));
    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({ password: "updated-test-input" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/account", replace: true }));
  });
  it("preserves the password form after a recovery-session refresh", async () => {
    window.history.replaceState({}, "", "/account/login?reset=true");
    mocks.getUser.mockResolvedValue(confirmedUser);
    render(<AuthProvider><LoginPage /></AuthProvider>);
    await screen.findByText("Choose a new password");
  });
  it("accepts invitations by setting a password with the SDK", async () => {
    mocks.handleAuthCallback.mockResolvedValue({ type: "invite", user: null, token: "test-invite-fixture" });
    mocks.acceptInvite.mockResolvedValue(confirmedUser);
    render(<AuthProvider><LoginPage /></AuthProvider>);
    await screen.findByText("Set your DREAMZ password");
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "test-input-only" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "test-input-only" } });
    fireEvent.click(screen.getByText("Save new password"));
    await waitFor(() => expect(mocks.acceptInvite).toHaveBeenCalledWith("test-invite-fixture", "test-input-only"));
  });
  it("displays expired-callback errors instead of silently swallowing them", async () => {
    mocks.handleAuthCallback.mockRejectedValue(new AuthError("Expired confirmation"));
    render(<AuthProvider><LoginPage /></AuthProvider>);
    await screen.findByText(/This account link is invalid or expired/);
  });
  it("consumes one-time callbacks only once under React Strict Mode", async () => {
    mocks.handleAuthCallback.mockResolvedValue({ type: "confirmation", user: confirmedUser });
    mocks.getUser.mockResolvedValue(confirmedUser);
    render(<StrictMode><AuthProvider><SessionProbe /></AuthProvider></StrictMode>);
    await waitFor(() => expect(screen.getByTestId("session").textContent).toBe(confirmedUser.id));
    expect(mocks.handleAuthCallback).toHaveBeenCalledOnce();
    expect(mocks.hydrateSession).toHaveBeenCalledOnce();
  });
  it("keeps Identity login independent of profile or rewards outages", async () => {
    mocks.login.mockResolvedValue(confirmedUser);
    mocks.profile.mockRejectedValue(new Error("Customer profile unavailable"));
    await openLogin();
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);
    await waitFor(() => expect(screen.getByTestId("session").textContent).toBe(confirmedUser.id));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/account" });
  });
  it("reports an expired recovery session", async () => {
    window.history.replaceState({}, "", "/account/login?reset=true");
    render(<AuthProvider><LoginPage /></AuthProvider>);
    await screen.findByText("Your password reset session has expired. Request a new reset link.");
  });
  it("shows OAuth cancellation without exposing provider error text", async () => {
    window.history.replaceState({}, "", "/account/login#error=access_denied&error_description=provider-diagnostic");
    render(<AuthProvider><LoginPage /></AuthProvider>);
    await screen.findByText(/This account link is invalid or expired/);
    expect(screen.queryByText("provider-diagnostic")).toBeNull();
  });
  it("sends recovery email and displays network errors on the recovery form", async () => {
    mocks.requestPasswordRecovery.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(undefined);
    await openLogin();
    fireEvent.click(screen.getByText("Forgot your password?"));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "customer@example.com" } });
    fireEvent.click(screen.getByText("Send reset link"));
    await screen.findByText("Unable to connect. Check your connection and try again.");
    fireEvent.click(screen.getByText("Send reset link"));
    await screen.findByText("Check your email for a password reset link.");
    expect(mocks.requestPasswordRecovery).toHaveBeenCalledWith("customer@example.com");
    expect(screen.getByText("Back to sign in")).toBeTruthy();
  });
  it("logs out through Identity and updates the customer UI", async () => {
    mocks.getUser.mockResolvedValueOnce(confirmedUser).mockResolvedValue(null);
    mocks.logout.mockResolvedValue(undefined);
    render(<AuthProvider><SessionProbe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("session").textContent).toBe(confirmedUser.id));
    fireEvent.click(screen.getByText("Log out"));
    await waitFor(() => expect(screen.getByTestId("session").textContent).toBe("signed-out"));
    expect(mocks.logout).toHaveBeenCalledOnce();
  });
  it("updates the UI on auth changes from another browser tab", async () => {
    render(<AuthProvider><SessionProbe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("session").textContent).toBe("signed-out"));
    act(() => { for (const listener of mocks.listeners) listener("login", confirmedUser); });
    expect(screen.getByTestId("session").textContent).toBe(confirmedUser.id);
    act(() => { for (const listener of mocks.listeners) listener("logout", null); });
    expect(screen.getByTestId("session").textContent).toBe("signed-out");
  });
  it("discards private page state when the authenticated Identity user changes", async () => {
    mocks.pathname = "/account/orders";
    mocks.getUser.mockResolvedValue(confirmedUser);
    render(<AuthProvider><AccountLayout /></AuthProvider>);
    await waitFor(() => expect(mocks.outletMounted).toHaveBeenCalledTimes(1));
    act(() => { for (const listener of mocks.listeners) listener("login", { ...confirmedUser, id: "different-identity-user" }); });
    await waitFor(() => expect(mocks.outletMounted).toHaveBeenCalledTimes(2));
  });
});
