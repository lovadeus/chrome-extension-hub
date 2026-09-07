import { createFileRoute } from "@tanstack/react-router";
import { json, requireApiKey, readBody } from "@/lib/license-api.server";

export const Route = createFileRoute("/api/public/license/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireApiKey(request);
        if (denied) return denied;

        const body = await readBody(request);
        const key = String(body["license_key"] ?? "").trim();
        const deviceId = String(body["device_id"] ?? "").trim();
        if (!key || !deviceId) return json({ valid: false, error: "missing_parameters" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { licenseIsUsable } = await import("@/lib/licensing.server");

        const { data: license } = await supabaseAdmin
          .from("licenses")
          .select("id, status, expires_at, device_limit")
          .eq("license_key", key)
          .maybeSingle();
        if (!license) return json({ valid: false, error: "license_not_found" }, 404);

        const usable = licenseIsUsable(license as { status: string; expires_at: string | null });
        if (!usable.valid) return json({ valid: false, error: usable.reason }, 403);

        const { data: activation } = await supabaseAdmin
          .from("license_activations")
          .select("id, active")
          .eq("license_id", license.id)
          .eq("device_id", deviceId)
          .maybeSingle();
        if (!activation || !activation.active)
          return json({ valid: false, error: "device_not_activated" }, 403);

        await supabaseAdmin
          .from("license_activations")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", activation.id);

        return json({ valid: true, status: "active", expires_at: license.expires_at });
      },
    },
  },
});
