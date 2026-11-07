/**
 * Payment provider abstraction.
 *
 * The active gateway is chosen by configuration: PAYMENT_PROVIDER
 * ("flutterwave" | "paystack"). Paystack remains fully implemented and
 * selectable, but is inactive unless configured as the active provider.
 * CredPal (BNPL) is architecturally prepared but must never present itself
 * as available until its credentials exist.
 * A provider is "configured" only when its secret key is present in the
 * server environment — the frontend reflects this honestly.
 */

export interface InitializePaymentInput {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
  /** Optional customer display name (Flutterwave customer.name). */
  name?: string;
  /** Optional customer phone (Flutterwave customer.phonenumber). */
  phone?: string;
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
  /** Prefix used on DREAMZ payment-ledger references (PSK-, FLW-…). */
  readonly refPrefix: string;
  initialize(input: InitializePaymentInput): Promise<InitializePaymentResult>;
  /** Verify a payment by its DREAMZ ledger reference (tx_ref). */
  verify(reference: string): Promise<VerifyPaymentResult>;
  /**
   * Verify a gateway transaction by its own transaction id, confirming the
   * transaction actually belongs to the expected DREAMZ reference. Optional:
   * only gateways with a transaction-id verification endpoint implement it.
   */
  verifyById?(transactionId: string, expectedReference: string): Promise<VerifyPaymentResult>;
}

// ── Paystack ─────────────────────────────────────────────────────────

class PaystackProvider implements PaymentProvider {
  readonly id = "paystack";
  readonly label = "Paystack";
  readonly refPrefix = "PSK";
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

// ── Flutterwave (Standard hosted checkout) ───────────────────────────

/**
 * Naira↔kobo conversion for the Flutterwave API. DREAMZ stores every amount
 * as integer kobo; Flutterwave's `amount` is in the currency's major units
 * (naira, decimals allowed). Rounding guards against float drift.
 */
export function koboToNaira(amountKobo: number): number {
  return Math.round(amountKobo) / 100;
}

export function nairaToKobo(amountNaira: number | string): number {
  return Math.round(Number(amountNaira) * 100);
}

/** Shape of Flutterwave's verification / transaction payloads we rely on. */
interface FlwTxData {
  status?: string;
  tx_ref?: string;
  amount?: number | string;
  currency?: string;
  payment_type?: string;
  id?: number | string;
}

interface FlwApiResponse {
  status?: string;
  message?: string;
  data?: FlwTxData;
}

class FlutterwaveProvider implements PaymentProvider {
  readonly id = "flutterwave";
  readonly label = "Flutterwave";
  readonly refPrefix = "FLW";
  readonly configured = !!process.env.FLW_SECRET_KEY;

  private baseUrl = "https://api.flutterwave.com/v3";

  private headers() {
    return {
      Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Map a verified Flutterwave transaction to the DREAMZ verification
   * contract. `success` is true ONLY for the exact gateway status
   * "successful" AND a tx_ref that matches the expected DREAMZ ledger
   * reference — the browser's `status=successful` redirect parameter is
   * never trusted on its own.
   */
  private mapVerification(data: FlwTxData | undefined, expectedReference: string): VerifyPaymentResult {
    const txRefMatches = data?.tx_ref === expectedReference;
    return {
      success: data?.status === "successful" && txRefMatches,
      amountKobo: data?.amount != null ? nairaToKobo(data.amount) : 0,
      currency: data?.currency ?? "NGN",
      reference: data?.tx_ref ?? expectedReference,
      channel: data?.payment_type ?? null,
      rawStatus: data?.status ?? "unknown",
    };
  }

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const res = await fetch(`${this.baseUrl}/payments`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: koboToNaira(input.amountKobo),
        currency: "NGN",
        redirect_url: input.callbackUrl,
        customer: {
          email: input.email,
          ...(input.name ? { name: input.name } : {}),
          ...(input.phone ? { phonenumber: input.phone } : {}),
        },
        customizations: {
          title: "DREAMZ Fashion Konceptz",
          description: "DREAMZ order payment",
        },
        meta: input.metadata,
      }),
    });
    const body = (await res.json()) as FlwApiResponse & { data?: { link?: string } };
    if (body.status !== "success" || !body.data?.link) {
      throw new Error(body.message || "Payment could not be initialized");
    }
    return { authorizationUrl: body.data.link, reference: input.reference };
  }

  /** Verify by DREAMZ reference (Flutterwave: verify_by_reference). */
  async verify(reference: string): Promise<VerifyPaymentResult> {
    const res = await fetch(
      `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      { headers: this.headers() },
    );
    const body = (await res.json()) as FlwApiResponse;
    return this.mapVerification(body.data, reference);
  }

  /** Verify by the gateway's own transaction id (must match the reference). */
  async verifyById(transactionId: string, expectedReference: string): Promise<VerifyPaymentResult> {
    const res = await fetch(
      `${this.baseUrl}/transactions/${encodeURIComponent(transactionId)}/verify`,
      { headers: this.headers() },
    );
    const body = (await res.json()) as FlwApiResponse;
    return this.mapVerification(body.data, expectedReference);
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
  readonly refPrefix = "CPL";
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
  flutterwave: new FlutterwaveProvider(),
  credpal: new CredPalProvider(),
};

export function getPaymentProvider(id: string): PaymentProvider | null {
  const provider = providers[id];
  return provider?.configured ? provider : null;
}

/**
 * The active gateway id, chosen by configuration — never by the browser.
 * Defaults to "paystack" so existing deployments keep their behaviour until
 * PAYMENT_PROVIDER is explicitly set.
 */
export function getActivePaymentProviderId(): string {
  return (process.env.PAYMENT_PROVIDER || "paystack").trim().toLowerCase();
}

/** The active provider, or null while its credentials are missing. */
export function getActivePaymentProvider(): PaymentProvider | null {
  return getPaymentProvider(getActivePaymentProviderId());
}