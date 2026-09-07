// Server-only helpers for orders and licenses. Never imported by client code.
import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient<any, any, any>;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateLicenseKey(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  const blocks: string[] = [];
  for (let i = 0; i < 4; i++) blocks.push(chars.slice(i * 5, i * 5 + 5).join(""));
  return `LVD-${blocks.join("-")}`;
}

/**
 * Marks an order as paid and issues (or extends) the customer's license.
 * Only called from trusted server paths: the payment webhook and admin actions.
 */
export async function confirmPaidOrder(
  admin: AnyClient,
  orderId: string,
  providerPaymentId?: string,
): Promise<{ ok: true; licenseId: string } | { ok: false; error: string }> {
  const { data: order, error } = await admin
    .from("orders")
    .select("id, user_id, plan_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!order) return { ok: false, error: "Pedido não encontrado" };

  if (order.status === "paid") {
    const { data: existing } = await admin
      .from("licenses")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (existing) return { ok: true, licenseId: existing.id as string };
  }

  const { data: plan } = await admin
    .from("plans")
    .select("id, duration_days, device_limit")
    .eq("id", order.plan_id)
    .maybeSingle();

  const durationDays = (plan?.duration_days as number | undefined) ?? 30;
  const deviceLimit = (plan?.device_limit as number | undefined) ?? 1;
  const expiresAt = new Date(Date.now() + durationDays * 86_400_000).toISOString();

  await admin
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      ...(providerPaymentId ? { provider_payment_id: providerPaymentId } : {}),
    })
    .eq("id", orderId);

  const { data: license, error: licenseError } = await admin
    .from("licenses")
    .insert({
      license_key: generateLicenseKey(),
      user_id: order.user_id,
      plan_id: order.plan_id,
      order_id: order.id,
      status: "active",
      device_limit: deviceLimit,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (licenseError) return { ok: false, error: licenseError.message };

  await admin.from("license_events").insert({
    license_id: license.id,
    event: "issued",
    detail: "Licença emitida após confirmação de pagamento",
    meta: { order_id: orderId, provider_payment_id: providerPaymentId ?? null },
  });

  return { ok: true, licenseId: license.id as string };
}

export function licenseIsUsable(license: {
  status: string;
  expires_at: string | null;
}): { valid: boolean; reason?: string } {
  if (license.status === "blocked") return { valid: false, reason: "blocked" };
  if (license.status === "inactive") return { valid: false, reason: "inactive" };
  if (license.expires_at && new Date(license.expires_at).getTime() < Date.now())
    return { valid: false, reason: "expired" };
  if (license.status !== "active") return { valid: false, reason: license.status };
  return { valid: true };
}
