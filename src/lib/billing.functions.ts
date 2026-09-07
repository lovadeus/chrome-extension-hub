import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const checkoutSchema = z.object({
  planSlug: z.string().min(1),
  paymentMethod: z.enum(["pix", "card"]),
  couponCode: z.string().trim().optional(),
});

/**
 * Creates a pending order. Payment is NEVER confirmed here —
 * only the gateway webhook (/api/public/webhooks/mercadopago) can mark it paid.
 */
export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, name, price_cents, active")
      .eq("slug", data.planSlug)
      .maybeSingle();
    if (planError) throw new Error(planError.message);
    if (!plan || !plan.active) throw new Error("Plano indisponível");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let discountCents = 0;
    let couponId: string | null = null;
    if (data.couponCode) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("id, discount_percent, active, expires_at, max_uses, used_count")
        .eq("code", data.couponCode.toUpperCase())
        .maybeSingle();
      const usable =
        coupon &&
        coupon.active &&
        (!coupon.expires_at || new Date(coupon.expires_at).getTime() > Date.now()) &&
        (coupon.max_uses == null || coupon.used_count < coupon.max_uses);
      if (!usable) throw new Error("Cupom inválido ou expirado");
      couponId = coupon!.id as string;
      discountCents = Math.round((plan.price_cents * (coupon!.discount_percent as number)) / 100);
    }

    const amount = Math.max(0, plan.price_cents - discountCents);

    // Demo PIX payload. With real Mercado Pago credentials configured
    // (MERCADOPAGO_ACCESS_TOKEN), replace this with the gateway response.
    const pixCode =
      data.paymentMethod === "pix"
        ? `00020126DEMO-LOVADEUS-${Math.random().toString(36).slice(2, 10).toUpperCase()}5204000053039865802BR`
        : null;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        plan_id: plan.id,
        coupon_id: couponId,
        amount_cents: amount,
        discount_cents: discountCents,
        status: "pending",
        payment_method: data.paymentMethod,
        provider: "mercadopago",
        pix_code: pixCode,
      })
      .select("id, amount_cents, payment_method, pix_code")
      .single();
    if (error) throw new Error(error.message);

    return {
      orderId: order.id as string,
      amountCents: order.amount_cents as number,
      discountCents,
      paymentMethod: order.payment_method as string,
      pixCode: order.pix_code as string | null,
      planName: plan.name as string,
    };
  });

/** Admin-only: confirms an order manually (used for demo/manual PIX conciliation). */
export const adminConfirmOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { confirmPaidOrder } = await import("@/lib/licensing.server");
    const result = await confirmPaidOrder(supabaseAdmin, data.orderId, "manual-admin");
    if (!result.ok) throw new Error(result.error);

    await supabaseAdmin.from("admin_logs").insert({
      actor_id: context.userId,
      action: "order.confirm_manual",
      entity: `order:${data.orderId}`,
      meta: { license_id: result.licenseId },
    });
    return { ok: true };
  });
