import { useState, type FormEvent } from "react";
import { joinWaitlist } from "@/server/waitlist.functions";

/**
 * Free early-access signup — anniversary collection and general launches.
 * Consent for marketing updates is captured explicitly; registrations are
 * stored server-side and never counted as sales.
 */
export function WaitlistSignup({ source = "anniversary" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [interest, setInterest] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError("Please tick the box so we know we may write to you.");
      return;
    }
    setState("saving");
    setError("");
    try {
      await joinWaitlist({
        data: { email, name, interest, source, marketingConsent: true },
      });
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not join — please try again.");
    }
  };

  if (state === "done") {
    return (
      <div className="border border-ink/15 bg-ivory px-6 py-8 text-center" role="status">
        <p className="font-editorial text-xl mb-2">You're on the list ✓</p>
        <p className="text-sm text-stone">
          We'll write to {email} when the collection is unveiled. No payment
          was taken — joining is free.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          aria-label="Email address"
          className="input-lux flex-1"
        />
        <button type="submit" disabled={state === "saving"} className="btn-lux btn-lux-primary">
          {state === "saving" ? "Joining…" : "Join the List"}
        </button>
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (optional)"
        aria-label="Name"
        maxLength={120}
        className="input-lux"
      />
      <input
        type="text"
        value={interest}
        onChange={(e) => setInterest(e.target.value)}
        placeholder="What are you hoping to see? (optional)"
        aria-label="What you hope to see"
        maxLength={300}
        className="input-lux"
      />
      <label className="flex items-start gap-2 text-xs text-stone leading-relaxed">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I'm happy for DREAMZ to email me about the anniversary collection and
          new arrivals. You can unsubscribe at any time.
        </span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-oxblood">
          {error}
        </p>
      )}
    </form>
  );
}
