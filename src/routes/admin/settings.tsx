import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { adminGetSettings, adminSaveSettings } from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [form, setForm] = useState({
    announcementBar: "",
    heroEyebrow: "",
    heroTitle: "",
    heroSubtitle: "",
    heroBody: "",
    whatsappNumber: "",
    whatsappDisplayName: "",
    instagram: "",
    tiktok: "",
    facebook: "",
    contactEmail: "",
    contactPhone: "",
    defaultFee: "3500",
    freeThreshold: "150000",
    // Rewards (centralised — the single source of rewards logic)
    rewardsEnabled: false,
    pointsPerNaira: "0",
    pointsValueKobo: "0",
    expiryDays: "0",
    redemptionNote: "",
    // AI guardrails
    aiEnabled: true,
    dailyRequestCap: "200",
    conceptDailyCap: "25",
    // Deposit plans
    depositsEnabled: false,
    depositPercent: "50",
    depositBalanceDueDays: "14",
    depositTermsText: "",
    // Partner terms
    partnerCommissionBps: "0",
    partnerPayoutThreshold: "0",
    partnerAttributionWindowDays: "30",
    partnerTermsNote: "",
    partnerSelfBenefitBps: "0",
    partnerReturnWindowDays: "2",
    // Anniversary campaign
    anniversaryEnabled: true,
    anniversaryDate: "2027-06-12",
    anniversaryLabel: "The Fifth Anniversary Collection",
    // Integration status (read-only)
    paymentConfigured: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    adminCall(adminGetSettings)
      .then((s) => {
        const loaded = s as Record<string, unknown>;
        const str = (k: string, fallback = "") => {
          const v = loaded[k];
          return typeof v === "string" ? v : v == null ? fallback : String(v);
        };
        const num = (k: string, fallback: number) => {
          const v = loaded[k];
          return typeof v === "number" ? v : fallback;
        };
        const rewards = (loaded.rewards ?? {}) as Record<string, unknown>;
        const ai = (loaded.ai ?? {}) as Record<string, unknown>;
        const deposits = (loaded.deposits ?? {}) as Record<string, unknown>;
        const partners = (loaded.partners ?? {}) as Record<string, unknown>;
        const anniversary = (loaded.anniversary ?? {}) as Record<string, unknown>;
        setForm((f) => ({
          ...f,
          announcementBar: str("announcementBar"),
          heroEyebrow: str("heroEyebrow"),
          heroTitle: str("heroTitle"),
          heroSubtitle: str("heroSubtitle"),
          heroBody: str("heroBody"),
          whatsappNumber: str("whatsappNumber"),
          whatsappDisplayName: str("whatsappDisplayName"),
          instagram: str("instagram"),
          tiktok: str("tiktok"),
          facebook: str("facebook"),
          contactEmail: str("contactEmail"),
          contactPhone: str("contactPhone"),
          defaultFee: String(num("defaultFee", 3500)),
          freeThreshold: String(num("freeThreshold", 150000)),
          rewardsEnabled: typeof rewards.enabled === "boolean" ? rewards.enabled : false,
          pointsPerNaira: String(rewards.pointsPerNaira ?? 0),
          pointsValueKobo: String(rewards.pointsValueKobo ?? 0),
          expiryDays: String(rewards.expiryDays ?? 0),
          redemptionNote: String(rewards.redemptionNote ?? ""),
          aiEnabled: typeof ai.enabled === "boolean" ? ai.enabled : true,
          dailyRequestCap: String(ai.dailyRequestCap ?? 200),
          conceptDailyCap: String(ai.conceptDailyCap ?? 25),
          depositsEnabled: deposits.enabled === true,
          depositPercent: String(deposits.defaultPercent ?? 50),
          depositBalanceDueDays: String(deposits.balanceDueDays ?? 14),
          depositTermsText: String(deposits.termsText ?? ""),
          partnerCommissionBps: String(partners.commissionBps ?? 0),
          // Stored in kobo, edited in naira.
          partnerPayoutThreshold: String(Math.round(Number(partners.payoutThresholdKobo ?? 0) / 100)),
          partnerAttributionWindowDays: String(partners.attributionWindowDays ?? 30),
          partnerTermsNote: String(partners.termsNote ?? ""),
          partnerSelfBenefitBps: String(partners.selfPurchaseBenefitBps ?? 0),
          partnerReturnWindowDays: String(partners.returnWindowDays ?? 2),
          anniversaryEnabled: anniversary.enabled !== false,
          anniversaryDate: String(anniversary.date ?? "2027-06-12"),
          anniversaryLabel: String(anniversary.label ?? "The Fifth Anniversary Collection"),
          paymentConfigured: loaded.paymentConfigured === true,
        }));
      })
      .catch(() => setMessage("Could not load settings. Is ADMIN_SECRET configured?"));
  }, []);

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((v) => ({
      ...v,
      [key]:
        e.target instanceof HTMLInputElement && e.target.type === "checkbox"
          ? e.target.checked
          : e.target.value,
    }));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await adminCall(adminSaveSettings, {
        announcementBar: form.announcementBar,
        heroEyebrow: form.heroEyebrow,
        heroTitle: form.heroTitle,
        heroSubtitle: form.heroSubtitle,
        heroBody: form.heroBody,
        whatsappNumber: form.whatsappNumber,
        whatsappDisplayName: form.whatsappDisplayName,
        instagram: form.instagram,
        tiktok: form.tiktok,
        facebook: form.facebook,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        defaultFee: Number(form.defaultFee) || 0,
        freeThreshold: Number(form.freeThreshold) || 0,
        rewards: {
          enabled: form.rewardsEnabled,
          pointsPerNaira: Number(form.pointsPerNaira) || 0,
          pointsValueKobo: Number(form.pointsValueKobo) || 0,
          eligibleCategorySlugs: [],
          expiryDays: Number(form.expiryDays) || 0,
          redemptionNote: form.redemptionNote,
        },
        ai: {
          enabled: form.aiEnabled,
          dailyRequestCap: Number(form.dailyRequestCap) || 0,
          conceptDailyCap: Number(form.conceptDailyCap) || 0,
        },
        deposits: {
          enabled: form.depositsEnabled,
          defaultPercent: Math.min(90, Math.max(1, Number(form.depositPercent) || 50)),
          balanceDueDays: Number(form.depositBalanceDueDays) || 0,
          termsText: form.depositTermsText,
        },
        partners: {
          commissionBps: Number(form.partnerCommissionBps) || 0,
          payoutThresholdKobo: Math.round((Number(form.partnerPayoutThreshold) || 0) * 100),
          attributionWindowDays: Number(form.partnerAttributionWindowDays) || 30,
          termsNote: form.partnerTermsNote,
          selfPurchaseBenefitBps: Number(form.partnerSelfBenefitBps) || 0,
          returnWindowDays: Math.max(0, Number(form.partnerReturnWindowDays) || 0),
        },
        anniversary: {
          enabled: form.anniversaryEnabled,
          date: form.anniversaryDate,
          label: form.anniversaryLabel,
        },
      });
      setMessage("Settings saved. Changes are live on the site.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-8">Site Settings</h1>
      {message && <p className="mb-6 text-sm border border-ink/15 px-4 py-3">{message}</p>}

      <form onSubmit={handleSave} className="grid gap-5">
        <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone pt-2">Homepage</h2>
        <div>
          <label className="input-lux-label">Announcement Bar</label>
          <input className="input-lux" value={form.announcementBar} onChange={set("announcementBar")} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="input-lux-label">Hero Eyebrow</label>
            <input className="input-lux" value={form.heroEyebrow} onChange={set("heroEyebrow")} />
          </div>
          <div>
            <label className="input-lux-label">Hero Title</label>
            <input className="input-lux" value={form.heroTitle} onChange={set("heroTitle")} />
          </div>
          <div>
            <label className="input-lux-label">Hero Subtitle</label>
            <input className="input-lux" value={form.heroSubtitle} onChange={set("heroSubtitle")} />
          </div>
        </div>
        <div>
          <label className="input-lux-label">Hero Supporting Statement</label>
          <textarea rows={2} className="input-lux" value={form.heroBody} onChange={set("heroBody")} />
        </div>

        <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone pt-4">Contact & WhatsApp</h2>
        <p className="text-xs text-stone -mt-2">
          The WhatsApp number powers every “Chat with DREAMZ” button. Use
          international format without “+”, e.g. 2348030000000.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="input-lux-label">WhatsApp Number</label>
            <input className="input-lux" value={form.whatsappNumber} onChange={set("whatsappNumber")} placeholder="2348030000000" />
          </div>
          <div>
            <label className="input-lux-label">WhatsApp Display Name</label>
            <input className="input-lux" value={form.whatsappDisplayName} onChange={set("whatsappDisplayName")} placeholder="Dreamz.ng on WhatsApp" />
          </div>
          <div>
            <label className="input-lux-label">Contact Phone</label>
            <input className="input-lux" value={form.contactPhone} onChange={set("contactPhone")} />
          </div>
          <div>
            <label className="input-lux-label">Contact Email</label>
            <input className="input-lux" type="email" value={form.contactEmail} onChange={set("contactEmail")} />
          </div>
        </div>

        <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone pt-4">Social Links</h2>
        <p className="text-xs text-stone -mt-2">
          Full URLs. Leave empty to fall back to the official DREAMZ profiles.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="input-lux-label">Instagram URL</label>
            <input className="input-lux" value={form.instagram} onChange={set("instagram")} placeholder="https://www.instagram.com/…" />
          </div>
          <div>
            <label className="input-lux-label">TikTok URL</label>
            <input className="input-lux" value={form.tiktok} onChange={set("tiktok")} placeholder="https://www.tiktok.com/@…" />
          </div>
          <div>
            <label className="input-lux-label">Facebook URL</label>
            <input className="input-lux" value={form.facebook} onChange={set("facebook")} placeholder="https://www.facebook.com/…" />
          </div>
        </div>

        <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone pt-4">Rewards (Dreamz Points)</h2>
        <p className="text-xs text-stone -mt-2">
          One central configuration for the whole site. Points display stays
          hidden while disabled — no reward values are ever invented.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.rewardsEnabled} onChange={set("rewardsEnabled")} />
            Show Dreamz Points
          </label>
          <div>
            <label className="input-lux-label">Points Earned per ₦1,000</label>
            <input className="input-lux" type="number" min="0" step="0.1" value={form.pointsPerNaira} onChange={set("pointsPerNaira")} />
          </div>
          <div>
            <label className="input-lux-label">Point Value (kobo)</label>
            <input className="input-lux" type="number" min="0" value={form.pointsValueKobo} onChange={set("pointsValueKobo")} />
          </div>
          <div>
            <label className="input-lux-label">Expiry (days, 0 = never)</label>
            <input className="input-lux" type="number" min="0" value={form.expiryDays} onChange={set("expiryDays")} />
          </div>
          <div className="sm:col-span-2">
            <label className="input-lux-label">Redemption Rules Note</label>
            <textarea rows={2} className="input-lux" value={form.redemptionNote} onChange={set("redemptionNote")} />
          </div>
        </div>

        <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone pt-4">AI — Design Your Dream</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.aiEnabled} onChange={set("aiEnabled")} />
            AI Assistant Enabled
          </label>
          <div>
            <label className="input-lux-label">Daily Request Cap</label>
            <input className="input-lux" type="number" min="0" value={form.dailyRequestCap} onChange={set("dailyRequestCap")} />
          </div>
          <div>
            <label className="input-lux-label">Daily Image-Concept Cap</label>
            <input className="input-lux" type="number" min="0" value={form.conceptDailyCap} onChange={set("conceptDailyCap")} />
          </div>
        </div>

        <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone pt-4">Deposits (Made-to-Order)</h2>
        <p className="text-xs text-stone -mt-2">
          Let customers pay a deposit on deposit-eligible products, with the
          balance due before dispatch. Disabled until you configure the real
          terms — nothing is advertised while off.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.depositsEnabled} onChange={set("depositsEnabled")} />
            Enable Deposit Payments
          </label>
          <div>
            <label className="input-lux-label">Default Deposit %</label>
            <input className="input-lux" type="number" min="1" max="90" value={form.depositPercent} onChange={set("depositPercent")} />
          </div>
          <div>
            <label className="input-lux-label">Balance Due Within (days)</label>
            <input className="input-lux" type="number" min="0" max="120" value={form.depositBalanceDueDays} onChange={set("depositBalanceDueDays")} />
          </div>
          <div className="sm:col-span-2">
            <label className="input-lux-label">Deposit Terms (shown at checkout)</label>
            <textarea rows={3} className="input-lux" value={form.depositTermsText} onChange={set("depositTermsText")} placeholder="e.g. Deposits reserve your piece in production. The balance is due before dispatch. Cancellations after production begins forfeit the deposit." />
          </div>
        </div>

        <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone pt-4">Partner Commissions &amp; Terms</h2>
        <p className="text-xs text-stone -mt-2">
          The commission rate applies to creator and trade partners on the
          merchandise value of verified, fully paid orders (after discounts,
          excluding delivery). While it is zero the site shows “Rate confirmed
          on approval” and creators cannot be approved. Payouts always require
          your review and a recorded transfer reference.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="input-lux-label">Commission (basis points ×100 = %)</label>
            <input className="input-lux" type="number" min="0" max="10000" value={form.partnerCommissionBps} onChange={set("partnerCommissionBps")} placeholder="500 = 5%" />
          </div>
          <div>
            <label className="input-lux-label">Payout Threshold (₦)</label>
            <input className="input-lux" type="number" min="0" value={form.partnerPayoutThreshold} onChange={set("partnerPayoutThreshold")} />
          </div>
          <div>
            <label className="input-lux-label">Attribution Window (days)</label>
            <input className="input-lux" type="number" min="1" max="365" value={form.partnerAttributionWindowDays} onChange={set("partnerAttributionWindowDays")} />
          </div>
          <div>
            <label className="input-lux-label">Partner Terms Note</label>
            <input className="input-lux" value={form.partnerTermsNote} onChange={set("partnerTermsNote")} />
          </div>
          <div>
            <label className="input-lux-label">Return Window Before Eligible (days after delivery)</label>
            <input className="input-lux" type="number" min="0" max="120" value={form.partnerReturnWindowDays} onChange={set("partnerReturnWindowDays")} />
          </div>
          <div>
            <label className="input-lux-label">Creator Self-Purchase Benefit (basis points, 0 = none)</label>
            <input className="input-lux" type="number" min="0" max="5000" value={form.partnerSelfBenefitBps} onChange={set("partnerSelfBenefitBps")} placeholder="0 = no benefit" />
          </div>
        </div>

        <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone pt-4">Fifth Anniversary Collection</h2>
        <p className="text-xs text-stone -mt-2">
          Early-access waitlist signup for 12 June 2027. Waitlist registrations
          are counted separately from sales — joining is free.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.anniversaryEnabled} onChange={set("anniversaryEnabled")} />
            Show Anniversary Waitlist
          </label>
          <div>
            <label className="input-lux-label">Collection Date</label>
            <input className="input-lux" value={form.anniversaryDate} onChange={set("anniversaryDate")} placeholder="2027-06-12" />
          </div>
          <div className="sm:col-span-2">
            <label className="input-lux-label">Collection Label</label>
            <input className="input-lux" value={form.anniversaryLabel} onChange={set("anniversaryLabel")} />
          </div>
        </div>

        <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone pt-4">Payment Status</h2>
        <p className="text-xs text-stone -mt-2">
          Paystack:{" "}
          <span className={form.paymentConfigured ? "text-forest font-medium" : "text-oxblood font-medium"}>
            {form.paymentConfigured ? "Connected" : "Not Connected"}
          </span>
          {form.paymentConfigured
            ? " — live/test mode is whatever your Paystack dashboard keys control. Verify with a small real transaction before launch."
            : " — PAYSTACK_SECRET_KEY is missing from this deployment. Checkout shows an honest Order Request (nothing is charged); online payment switches on automatically once the key is added. No code change needed."}
        </p>

        <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone pt-4">Delivery</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="input-lux-label">Default Delivery Fee (₦)</label>
            <input className="input-lux" type="number" min="0" value={form.defaultFee} onChange={set("defaultFee")} />
          </div>
          <div>
            <label className="input-lux-label">Free Delivery Above (₦)</label>
            <input className="input-lux" type="number" min="0" value={form.freeThreshold} onChange={set("freeThreshold")} />
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-lux btn-lux-primary mt-4">
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
