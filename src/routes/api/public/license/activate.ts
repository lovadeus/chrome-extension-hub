import { createFileRoute } from "@tanstack/react-router";
import { json, requireApiKey, readBody } from "@/lib/license-api.server";

export const Route = createFileRoute("/api/public/license/activate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireApiKey(request);
        if (denied) return denied;

        const body = await readBody(request);
        const key = String(body["license_key"] ?? "").trim();
        const deviceId = String(body["device_id"] ?? "").trim();
        const deviceLabel = body["device_label"] ? String(body["device_label"]) : null;
        if (!key || !deviceId) return json({ valid: false, error: "missing_parameters" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { licenseIsUsable } = await import("@/lib/licensing.server");

        const { data: license } = await supabaseAdmin
          .from("licenses")
          .select("id, status, expires_at, device_limit, plan_id")
          .eq("license_key", key)
          .maybeSingle();
        if (!license) return json({ valid: false, error: "license_not_found" }, 404);

        const usable = licenseIsUsable(license as { status: string; expires_at: string | null });
        if (!usable.valid) return json({ valid: false, error: usable.reason }, 403);

        const { data: existing } = await supabaseAdmin
          .from("license_activations")
          .select("id")
          .eq("license_id", license.id)
          .eq("device_id", deviceId)
          .maybeSingle();

        if (!existing) {
          const { count } = await supabaseAdmin
            .from("license_activations")
            .select("id", { count: "exact", head: true })
            .eq("license_id", license.id)
            .eq("active", true);
          if ((count ?? 0) >= (license.device_limit as number)) {
            return json({ valid: false, error: "device_limit_reached" }, 409);
          }
          await supabaseAdmin.from("license_activations").insert({
            license_id: license.id,
            device_id: deviceId,
            device_label: deviceLabel,
          });
        } else {
          await supabaseAdmin
            .from("license_activations")
            .update({ active: true, last_seen_at: new Date().toISOString() })
            .eq("id", existing.id);
        }

        await supabaseAdmin
          .from("licenses")
          .update({ activated_at: new Date().toISOString() })
          .eq("id", license.id)
          .is("activated_at", null);

        await supabaseAdmin.from("license_events").insert({
          license_id: license.id,
          event: "activate",
          detail: `Dispositivo ${deviceId}`,
        });

        return json({
          valid: true,
          status: "active",
          expires_at: license.expires_at,
          device_limit: license.device_limit,
        });
      },
    },
  },
});
