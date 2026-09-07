import { createFileRoute } from "@tanstack/react-router";
import { json } from "@/lib/license-api.server";

/**
 * Mercado Pago payment webhook — the ONLY path that confirms a payment.
 *
 * Pending environment configuration (backend secrets):
 *  - MERCADOPAGO_ACCESS_TOKEN: used to re-check the payment with the gateway.
 *  - MERCADOPAGO_WEBHOOK_SECRET: shared secret; sent by Mercado Pago as
 *    `x-webhook-secret` (or configured signature) and validated below.
 */
export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["MERCADOPAGO_WEBHOOK_SECRET"];
        if (!secret) return json({ error: "webhook_not_configured" }, 503);

        const provided =
          request.headers.get("x-webhook-secret") ?? request.headers.get("x-signature") ?? "";
        if (provided !== secret) return json({ error: "invalid_signature" }, 401);

        const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const data = (payload["data"] ?? {}) as Record<string, unknown>;
        const externalReference = String(
          payload["external_reference"] ?? data["external_reference"] ?? "",
        ).trim();
        const paymentId = String(payload["id"] ?? data["id"] ?? "").trim();
        const status = String(payload["status"] ?? data["status"] ?? "").trim();

        if (!externalReference) return json({ error: "missing_external_reference" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (status && status !== "approved" && status !== "paid") {
          await supabaseAdmin
            .from("orders")
            .update({
              status: status === "refunded" ? "refunded" : "failed",
              provider_payment_id: paymentId || null,
            })
            .eq("id", externalReference);
          return json({ ok: true, applied: "not_approved" });
        }

        const { confirmPaidOrder } = await import("@/lib/licensing.server");
        const result = await confirmPaidOrder(supabaseAdmin, externalReference, paymentId);
        if (!result.ok) return json({ ok: false, error: result.error }, 400);

        return json({ ok: true, license_id: result.licenseId });
      },
    },
  },
});
