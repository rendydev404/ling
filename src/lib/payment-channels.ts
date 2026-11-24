import { cache } from "react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  getEnabledPaymentMethods,
  isMidtransConfigured,
  probeMidtransChannel,
} from "@/lib/midtrans";
import { isPaymentMethodCode, type PaymentMethodCode } from "@/lib/payment-methods";

export interface ChannelState {
  active: boolean;
  checked_at: string;
  reason?: string;
}

export interface PaymentChannelMap {
  channels: Partial<Record<PaymentMethodCode, ChannelState>>;
  /** ISO time of the last full detection run (or its start, while running) */
  detectedAt: string | null;
  detectingSince: string | null;
}

const DETECT_LOCK_MS = 10 * 60_000;

function parseMap(raw: unknown): PaymentChannelMap {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const channels: PaymentChannelMap["channels"] = {};
  for (const [key, val] of Object.entries(obj)) {
    if (isPaymentMethodCode(key) && val && typeof val === "object") {
      const v = val as Partial<ChannelState>;
      if (typeof v.active === "boolean") {
        channels[key] = {
          active: v.active,
          checked_at: String(v.checked_at ?? ""),
          reason: v.reason,
        };
      }
    }
  }
  const meta = (obj._meta ?? {}) as { detected_at?: string; detecting_since?: string };
  return {
    channels,
    detectedAt: meta.detected_at ?? null,
    detectingSince: meta.detecting_since ?? null,
  };
}

function serialize(map: PaymentChannelMap): Record<string, unknown> {
  return {
    ...map.channels,
    _meta: { detected_at: map.detectedAt, detecting_since: map.detectingSince },
  };
}

/** One small single-column read, deduped per request. null = column/DB unavailable. */
export const getPaymentChannelMap = cache(async (): Promise<PaymentChannelMap | null> => {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("store_settings")
    .select("payment_channels")
    .eq("singleton_key", "primary")
    .maybeSingle();
  if (error) return null;
  return parseMap(data?.payment_channels);
});

async function writeMap(map: PaymentChannelMap) {
  const supabase = createServiceRoleClient();
  if (!supabase) return;
  await supabase
    .from("store_settings")
    .update({ payment_channels: serialize(map) })
    .eq("singleton_key", "primary");
}

/** Methods to offer at checkout: env allow-list minus channels Midtrans reported as inactive. */
export async function getActivePaymentMethods(): Promise<PaymentMethodCode[]> {
  const configured = getEnabledPaymentMethods();
  const map = await getPaymentChannelMap();
  if (!map) return configured;
  return configured.filter((m) => map.channels[m]?.active !== false);
}

/** True when no detection ran yet (or the last one is stale) and none is in progress. */
export async function shouldAutoDetectChannels(): Promise<boolean> {
  if (!isMidtransConfigured()) return false;
  const map = await getPaymentChannelMap();
  if (!map) return false;
  if (map.detectingSince && Date.now() - Date.parse(map.detectingSince) < DETECT_LOCK_MS) {
    return false;
  }
  return !map.detectedAt;
}

/** Reactive learning: a real checkout was refused because the channel is not activated. */
export async function markChannelInactive(method: PaymentMethodCode, reason: string) {
  const supabase = createServiceRoleClient();
  if (!supabase) return;
  const { data, error } = await supabase
    .from("store_settings")
    .select("payment_channels")
    .eq("singleton_key", "primary")
    .maybeSingle();
  if (error) return;
  const map = parseMap(data?.payment_channels);
  map.channels[method] = {
    active: false,
    checked_at: new Date().toISOString(),
    reason: reason.slice(0, 160),
  };
  await writeMap(map);
}

/** Probes every allowed method against Midtrans and stores the result. */
export async function detectPaymentChannels(): Promise<PaymentChannelMap | null> {
  if (!isMidtransConfigured()) return null;
  const current = await getPaymentChannelMap();
  if (!current) return null;

  const startedAt = new Date().toISOString();
  await writeMap({ ...current, detectingSince: startedAt });

  const methods = getEnabledPaymentMethods();
  const results: Array<readonly [PaymentMethodCode, Awaited<ReturnType<typeof probeMidtransChannel>>]> =
    [];
  // Small batches keep us well under Midtrans rate limits while finishing in a few seconds
  for (let i = 0; i < methods.length; i += 3) {
    const batch = methods.slice(i, i + 3);
    const out = await Promise.all(batch.map(async (m) => [m, await probeMidtransChannel(m)] as const));
    results.push(...out);
  }

  const now = new Date().toISOString();
  const next: PaymentChannelMap = {
    channels: { ...current.channels },
    detectedAt: now,
    detectingSince: null,
  };
  for (const [method, res] of results) {
    if (res.active === null) continue; // keep previous knowledge on uncertain results
    next.channels[method] = { active: res.active, checked_at: now, reason: res.reason };
  }
  await writeMap(next);
  return next;
}
