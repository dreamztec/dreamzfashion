/**
 * Payment provider abstraction.
 *
 * Paystack is the primary gateway. CredPal (BNPL) is architecturally prepared
 * but must never present itself as available until its credentials exist.
 * A provider is "configured" only when its secret key is present in the
 * server environment — the frontend reflects this honestly.
 */

export interface InitializePaymentInput {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  amountKobo: number;
  currency: string;
  reference: string;
  channel: string | null;
  rawStatus: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly label: string;
  readonly configured: boolean;
  initialize(input: InitializePaymentInput): Promise<InitializePaymentResult>;
  verify(reference: string): Promise<VerifyPaymentResult>;
}

// ── Paystack ─────────────────────────────────────────────────────────

class PaystackProvider implements PaymentProvider {
  readonly id = "paystack";
  readonly label = "Paystack";
  readonly configured = !!process.env.PAYSTACK_SECRET_KEY;

  private baseUrl = "https://api.paystack.co";

  private headers() {
    return {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    };
  }

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        email: input.email,
        amount: input.amountKobo,
        reference: input.reference,
        callback_url: input.callbackUrl,
        currency: "NGN",
        metadata: input.metadata,
      }),
    });
    const body = (await res.json()) as {
      status: boolean;
      message?: string;
      data?: { authorization_url: string; reference: string };
    };
    if (!body.status || !body.data) {
      throw new Error(body.message || "Payment could not be initialized");
    }
    return { authorizationUrl: body.data.authorization_url, reference: body.data.reference };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    const res = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: this.headers() },
    );
    const body = (await res.json()) as {
      status: boolean;
      data?: { status: string; amount: number; currency?: string; channel: string };
    };
    const data = body.data;
    return {
      success: body.status && data?.status === "success",
      amountKobo: data?.amount ?? 0,
      currency: data?.currency ?? "NGN",
      reference,
      channel: data?.channel ?? null,
      rawStatus: data?.status ?? "unknown",
    };
  }
}

// ── BNPL (Buy Now, Pay Later) — architecture only, inactive without a ─
// ── configured provider. DREAMZ is not a lender and never pretends. ───

export interface BnplStatus {
  available: boolean;
  providerId: string | null;
  label: string | null;
}

/**
 * BNPL surfaces in checkout only when a real provider is configured AND the
 * admin flag is on. Without credentials this reports honestly unavailable —
 * no fake installment option is ever rendered.
 */
export function getBnplStatus(): BnplStatus {
  const credpalReady = Boolean(process.env.CREDPAL_API_KEY && process.env.CREDPAL_SECRET);
  const flagOn = String(process.env.BNPL_ENABLED ?? "").toLowerCase() === "true";
  return credpalReady && flagOn
    ? { available: true, providerId: "credpal", label: "CredPal — Buy Now, Pay Later" }
    : { available: false, providerId: null, label: null };
}

class CredPalProvider implements PaymentProvider {
  readonly id = "credpal";
  readonly label = "CredPal — Buy Now, Pay Later";
  readonly configured = Boolean(process.env.CREDPAL_API_KEY && process.env.CREDPAL_SECRET);

  async initialize(): Promise<InitializePaymentResult> {
    // Real CredPal API integration requires their official merchant
    // documentation/credentials. Until then the provider stays dormant —
    // checkout will never render a BNPL option while this throws.
    throw new Error("BNPL provider is not configured");
  }
  async verify(): Promise<VerifyPaymentResult> {
    throw new Error("BNPL provider is not configured");
  }
}

// ── Registry ─────────────────────────────────────────────────────────

const providers: Record<string, PaymentProvider> = {
  paystack: new PaystackProvider(),
  credpal: new CredPalProvider(),
};

export function getPaymentProvider(id: string): PaymentProvider | null {
  const provider = providers[id];
  return provider?.configured ? provider : null;
}