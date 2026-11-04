import { useEffect, useState } from "react";
import { getInspirationMessages, getMeaningPlacementPricing } from "@/server/meaning.functions";
import {
  INSPIRATION_CHOICES,
  PLACEMENT_LABELS,
  placementsForProduct,
  resolvePlacement,
  snapshotFromMessage,
  type MessagePlacement,
  type MessageSnapshot,
  type MessageSource,
} from "@/lib/meaning";

/**
 * MAKE IT MEANINGFUL — "Choose your design. Carry your meaning."
 *
 * Optional inspiration message on a product. Four equally treated choices
 * (Bible, Qur'an, DREAMZ Quote, No Message); the house never preselects a
 * religion, never infers one, and never uses an inspiration choice for
 * advertising. No scripture appears before a source is chosen. Customers can
 * always buy normally without any message.
 */

export type MeaningMessageRow = {
  messageId: string;
  version: number;
  theme: string;
  text: string;
  reference: string | null;
  translation: string | null;
  attribution: string | null;
  rtl: boolean;
};

type Step = "closed" | "source" | "message" | "placement" | "preview";

export function MakeItMeaningful({
  productTheme,
  inspirationEligible,
  allowedPlacements,
  onMessageChange,
}: {
  productTheme: string | null;
  inspirationEligible: boolean;
  allowedPlacements: string[] | null;
  onMessageChange: (message: MessageSnapshot | null, chargeKobo: number | null) => void;
}) {
  const [step, setStep] = useState<Step>("closed");
  const [source, setSource] = useState<MessageSource | null>(null);
  const [messages, setMessages] = useState<MeaningMessageRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<MeaningMessageRow | null>(null);
  const [placement, setPlacement] = useState<MessagePlacement | null>(null);
  const [proofConfirmed, setProofConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = placementsForProduct(allowedPlacements);

  // Placement pricing is admin-controlled and shown before Add to Bag.
  // The charge itself is always recomputed server-side at checkout.
  const [pricing, setPricing] = useState<Record<string, number | null> | null>(null);
  useEffect(() => {
    if (step === "closed" || pricing) return;
    getMeaningPlacementPricing()
      .then((res) => setPricing(res.placements))
      .catch(() => setPricing({}));
  }, [step, pricing]);

  if (!inspirationEligible) return null;

  const reset = () => {
    setStep("closed");
    setSource(null);
    setSelected(null);
    setPlacement(null);
    setProofConfirmed(false);
    setError(null);
    onMessageChange(null, null);
  };

  const chooseSource = async (choice: string) => {
    setError(null);
    if (choice === "none") {
      reset();
      return;
    }
    // Changing the source clears any incompatible earlier selection.
    setSelected(null);
    setPlacement(null);
    setProofConfirmed(false);
    const s = choice as MessageSource;
    setSource(s);
    setStep("message");
    setLoading(true);
    try {
      const res = await getInspirationMessages({ data: { source: s } });
      // The product's own theme leads; the rest follow in catalogue order.
      const rows = [...res.messages].sort((x, y) => {
        const xTheme = x.theme === productTheme ? 0 : 1;
        const yTheme = y.theme === productTheme ? 0 : 1;
        return xTheme - yTheme || x.theme.localeCompare(y.theme);
      });
      setMessages(rows);
      if (rows.length === 0) {
        setError("No approved messages are available for this source yet — please choose another source or continue without a message.");
      }
    } catch {
      setError("Messages could not be loaded just now. You can continue without a message.");
    } finally {
      setLoading(false);
    }
  };

  const confirmPlacement = (p: MessagePlacement) => {
    if (!source) return;
    // Sacred text falls back to the Message Card wherever the requested
    // placement is not appropriate for the piece.
    const resolved = resolvePlacement({ source, requested: p, allowed });
    if (!resolved || resolved !== p) {
      setError("That placement is not available for this piece — please choose another.");
      return;
    }
    setPlacement(resolved);
    setStep("preview");
  };

  const confirm = () => {
    if (!selected || !placement || !source) return;
    const snapshot = snapshotFromMessage({ ...selected, source }, placement);
    onMessageChange(snapshot, null); // the charge is recomputed server-side
    setStep("closed");
  };

  const chargeLabel = (p: MessagePlacement): string => {
    const v = pricing?.[p];
    if (v == null) return "Priced after review";
    if (v === 0) return "Complimentary";
    return `+₦${v.toLocaleString("en-NG")}`;
  };

  return (
    <div className="mt-8 border border-gold/40 bg-gold/5 px-5 py-5">
      <p className="overline-label !text-gold-soft mb-1">Make It Meaningful</p>
      <p className="text-xs text-stone mb-3">Choose your design. Carry your meaning.</p>

      {step === "closed" && (
        <button type="button" onClick={() => setStep("source")} className="btn-lux btn-lux-outline !py-2.5 !px-5">
          Choose Your Inspiration
        </button>
      )}

      {step === "source" && (
        <div>
          <p className="input-lux-label">Choose Your Inspiration</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {INSPIRATION_CHOICES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => chooseSource(c.key)}
                className={`border px-3 py-3 text-xs uppercase tracking-btn transition-colors text-center ${
                  c.key !== "none" && source === c.key
                    ? "border-ink bg-ink text-ivory"
                    : "border-ink/25 hover:border-ink bg-ivory"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[0.66rem] text-stone">
            Your selection is used only to prepare your order — never for
            advertising or profiling.
          </p>
        </div>
      )}

      {step === "message" && source && (
        <div>
          <div className="flex items-center justify-between">
            <p className="input-lux-label">Choose Your Message</p>
            <button type="button" onClick={() => setStep("source")} className="text-xs underline text-stone">
              Change source
            </button>
          </div>
          {loading && <p className="text-xs text-stone mt-2">Loading messages…</p>}
          {messages && messages.length > 0 && (
            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
              {messages.map((m) => (
                <button
                  key={`${m.messageId}-v${m.version}`}
                  type="button"
                  onClick={() => {
                    setSelected(m);
                    setPlacement(null);
                    setStep("placement");
                  }}
                  aria-pressed={selected?.messageId === m.messageId}
                  className={`w-full text-left border px-4 py-3 transition-colors ${
                    selected?.messageId === m.messageId ? "border-ink bg-ink/[0.03]" : "border-ink/20 hover:border-ink/50 bg-ivory"
                  }`}
                >
                  <span
                    className="block text-sm leading-relaxed"
                    dir={m.rtl ? "rtl" : "ltr"}
                    lang={m.rtl ? "ar" : "en"}
                    style={m.rtl ? { textAlign: "right" } : undefined}
                  >
                    {m.text}
                  </span>
                  <span className="block mt-1 text-[0.66rem] text-stone">
                    {m.theme}
                    {m.reference ? ` · ${m.reference}` : ""}
                    {m.translation ? ` · ${m.translation}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "placement" && selected && (
        <div>
          <p className="input-lux-label">Choose Placement</p>
          <p className="text-xs text-stone mt-1 mb-3">
            {PLACEMENT_LABELS.message_card} and {PLACEMENT_LABELS.gift_note} are
            always respectful options; other placements appear only where
            physically appropriate for this piece.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {allowed.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => confirmPlacement(p)}
                className="text-left border border-ink/20 hover:border-ink/50 px-4 py-3 bg-ivory transition-colors"
              >
                <span className="block text-[0.68rem] uppercase tracking-btn">{PLACEMENT_LABELS[p]}</span>
                <span className="block text-[0.66rem] text-stone mt-0.5">{chargeLabel(p)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "preview" && selected && placement && source && (
        <div>
          <p className="input-lux-label">Preview & Confirm</p>
          <div className="border border-ink/15 bg-ivory px-4 py-4 mt-2">
            <p
              className="text-sm leading-relaxed"
              dir={selected.rtl ? "rtl" : "ltr"}
              lang={selected.rtl ? "ar" : "en"}
              style={selected.rtl ? { textAlign: "right" } : undefined}
            >
              {selected.text}
            </p>
            <p className="mt-2 text-[0.66rem] text-stone">
              {sourceLabel(source)}
              {selected.reference ? ` · ${selected.reference}` : ""}
              {selected.translation ? ` · ${selected.translation}` : ""}
              {" · "}
              {PLACEMENT_LABELS[placement]}
            </p>
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs text-stone">
            <input
              type="checkbox"
              checked={proofConfirmed}
              onChange={(e) => setProofConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>I confirm the spelling and wording of my message — it is applied exactly as shown.</span>
          </label>
          <div className="mt-4 flex gap-3">
            <button type="button" disabled={!proofConfirmed} onClick={confirm} className="btn-lux btn-lux-primary !py-2.5 !px-5">
              Confirm Message
            </button>
            <button type="button" onClick={reset} className="text-xs underline text-stone py-2">
              Remove message
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-xs text-oxblood">{error}</p>}
    </div>
  );
}

function sourceLabel(source: MessageSource): string {
  return source === "bible" ? "Bible" : source === "quran" ? "Qur’an" : "DREAMZ Quote";
}
