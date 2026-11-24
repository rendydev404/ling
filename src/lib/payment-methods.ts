// Shared (client + server) catalogue of payment methods charged through Midtrans Core API.
// Kept free of server-only imports so the checkout UI can render the same list.

export const PAYMENT_METHOD_CODES = [
  "qris",
  "gopay",
  "shopeepay",
  "bca_va",
  "bni_va",
  "bri_va",
  "mandiri_bill",
  "permata_va",
  "cimb_va",
] as const;

export type PaymentMethodCode = (typeof PAYMENT_METHOD_CODES)[number];

export type PaymentMethodGroup = "qris" | "ewallet" | "va";

export interface PaymentMethodMeta {
  code: PaymentMethodCode;
  group: PaymentMethodGroup;
  label: string;
  shortLabel: string;
  description: string;
  /** Tailwind classes for the small brand chip shown next to the label */
  chipClass: string;
}

export const PAYMENT_METHODS: Record<PaymentMethodCode, PaymentMethodMeta> = {
  qris: {
    code: "qris",
    group: "qris",
    label: "QRIS",
    shortLabel: "QRIS",
    description: "Scan pakai m-banking atau e-wallet apa pun",
    chipClass: "bg-[#0f172a] text-white",
  },
  gopay: {
    code: "gopay",
    group: "ewallet",
    label: "GoPay",
    shortLabel: "GoPay",
    description: "Bayar langsung di aplikasi Gojek / GoPay",
    chipClass: "bg-[#00aed6] text-white",
  },
  shopeepay: {
    code: "shopeepay",
    group: "ewallet",
    label: "ShopeePay",
    shortLabel: "SPay",
    description: "Dibuka di aplikasi Shopee (di HP)",
    chipClass: "bg-[#ee4d2d] text-white",
  },
  bca_va: {
    code: "bca_va",
    group: "va",
    label: "BCA Virtual Account",
    shortLabel: "BCA",
    description: "Transfer via m-BCA, KlikBCA, atau ATM",
    chipClass: "bg-[#0060af] text-white",
  },
  bni_va: {
    code: "bni_va",
    group: "va",
    label: "BNI Virtual Account",
    shortLabel: "BNI",
    description: "Transfer via BNI Mobile, ATM, atau bank lain",
    chipClass: "bg-[#f15a23] text-white",
  },
  bri_va: {
    code: "bri_va",
    group: "va",
    label: "BRI Virtual Account",
    shortLabel: "BRI",
    description: "Transfer via BRImo, ATM, atau bank lain",
    chipClass: "bg-[#00529c] text-white",
  },
  mandiri_bill: {
    code: "mandiri_bill",
    group: "va",
    label: "Mandiri Bill Payment",
    shortLabel: "Mandiri",
    description: "Bayar via Livin' by Mandiri atau ATM Mandiri",
    chipClass: "bg-[#003d79] text-[#ffc20e]",
  },
  permata_va: {
    code: "permata_va",
    group: "va",
    label: "Permata Virtual Account",
    shortLabel: "Permata",
    description: "Transfer via PermataMobile X atau bank lain",
    chipClass: "bg-[#00843d] text-white",
  },
  cimb_va: {
    code: "cimb_va",
    group: "va",
    label: "CIMB Niaga Virtual Account",
    shortLabel: "CIMB",
    description: "Transfer via OCTO Mobile atau bank lain",
    chipClass: "bg-[#7a0019] text-white",
  },
};

export const PAYMENT_GROUP_LABELS: Record<PaymentMethodGroup, string> = {
  qris: "QRIS",
  ewallet: "E-Wallet",
  va: "Transfer Virtual Account",
};

export function isPaymentMethodCode(value: unknown): value is PaymentMethodCode {
  return typeof value === "string" && (PAYMENT_METHOD_CODES as readonly string[]).includes(value);
}

/** Normalized payment instructions saved on the order and rendered by our own payment UI. */
export interface PaymentInstructions {
  method: PaymentMethodCode;
  group: PaymentMethodGroup;
  transactionId: string | null;
  /** ISO timestamp, null when Midtrans did not return an expiry */
  expiresAt: string | null;
  vaNumber?: string;
  bank?: string;
  billerCode?: string;
  billKey?: string;
  qrString?: string;
  qrImageUrl?: string;
  deeplinkUrl?: string;
  isSimulated?: boolean;
}
