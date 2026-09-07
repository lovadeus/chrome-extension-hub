import { createFileRoute } from "@tanstack/react-router";
import { json, requireApiKey, readBody } from "@/lib/license-api.server";

export const Route = createFileRoute("/api/public/license/deactivate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireApiKey(request);
        if (denied) return denied;

        const body = await readBody(request);
        const key = String(body["license_key"] ?? "").trim();
        const deviceId = String(body["device_id"] ?? "").trim();
        if (!key || !deviceId) return json({ ok: false, error: "missing_parameters" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: license } = await supabaseAdmin
          .from("licenses")
          .select("id")
          .eq("license_key", key)
          .maybeSingle();
        if (!license) return json({ ok: false, error: "license_not_found" }, 404);

        await supabaseAdmin
          .from("license_activations")
          .delete()
          .eq("license_id", license.id)
          .eq("device_id", deviceId);

        await supabaseAdmin.from("license_events").insert({
          license_id: license.id,
          event: "deactivate",
          detail: `Dispositivo ${deviceId}`,
        });

        return json({ ok: true });
      },
    },
  },
});
