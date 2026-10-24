import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { saveMyProfile } from "@/server/account.functions";
import { getMyCustomerProfile } from "@/server/customer.functions";
import { useAuth } from "@/lib/auth-client";
import { NIGERIAN_STATES } from "@/lib/format";

export const Route = createFileRoute("/account/profile")({
  component: MyProfile,
});

function MyProfile() {
  const { user, saveProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    if (loaded) return;
    if (user) {
      setFullName(user.fullName);
      setLoaded(true);
      void getMyCustomerProfile().then((profile) => {
        setFullName(profile.fullName);
        setPhone(profile.phone ?? "");
        setCity(profile.city ?? "");
        setState(profile.state ?? "");
        setProfileReady(true);
      }).catch(() => setError("We couldn't load your profile. Please refresh before editing."));
    }
  }, [user, loaded]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const err = await saveProfile(fullName);
    // Phone/city/state are stored on the DREAMZ customer row server-side.
    try {
      await saveMyProfile({ data: { fullName, phone, city, state } });
    } catch {
      setError("We couldn't save your profile right now. Please try again.");
      setBusy(false);
      return;
    }
    if (err) setError(err);
    else setSaved(true);
    setBusy(false);
  }

  return (
    <div>
      <h1 className="font-editorial text-3xl mb-2">Profile</h1>
      <p className="text-sm text-stone mb-8">{user?.email}</p>

      {saved && (
        <div className="border border-forest/40 bg-forest/5 px-4 py-3 text-sm mb-6" role="status">
          Profile saved.
        </div>
      )}
      {error && (
        <div className="border border-brand-red/40 bg-brand-red/5 px-4 py-3 text-sm mb-6" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="max-w-lg grid gap-4">
        <div>
          <label htmlFor="p-name" className="input-lux-label">Full name</label>
          <input id="p-name" className="input-lux" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" maxLength={120} />
        </div>
        <div>
          <label htmlFor="p-phone" className="input-lux-label">Phone</label>
          <input id="p-phone" className="input-lux" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" maxLength={20} placeholder="0803 000 0000" />
        </div>
        <div>
          <label htmlFor="p-state" className="input-lux-label">State</label>
          <select id="p-state" className="input-lux" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">Select a state</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-city" className="input-lux-label">City</label>
          <input id="p-city" className="input-lux" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
        </div>
        <div className="mt-2">
          <button type="submit" className="btn-lux btn-lux-primary" disabled={busy || !profileReady}>
            {busy ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </form>

      <div className="mt-10 border-t border-ink/10 pt-6">
        <h2 className="font-editorial text-xl mb-3">Support</h2>
        <p className="text-sm text-stone mb-4">
          Our client team is available on WhatsApp and by email at
          contact.dreamzgroup@gmail.com, or by phone at +234 903 856 0517.
        </p>
        <a href="https://wa.me/2349038560517" target="_blank" rel="noopener noreferrer" className="nav-link text-[0.7rem] uppercase tracking-btn">
          Message client care on WhatsApp →
        </a>
      </div>
    </div>
  );
}
