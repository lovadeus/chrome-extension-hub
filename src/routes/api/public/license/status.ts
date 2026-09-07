import { createFileRoute } from "@tanstack/react-router";
import { json, requireApiKey } from "@/lib/license-api.server";

export const Route = createFileRoute("/api/public/license/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = requireApiKey(request);
        if (denied) return denied;

        const key = new URL(request.url).searchParams.get("license_key")?.trim();
        if (!key) return json({ error: "missing_parameters" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { licenseIsUsable } = await import("@/lib/licensing.server");

        const { data: license } = await supabaseAdmin
          .from("licenses")
          .select("id, status, expires_at, device_limit, plans(name, type)")
          .eq("license_key", key)
          .maybeSingle();
        if (!license) return json({ error: "license_not_found" }, 404);

        const { count } = await supabaseAdmin
          .from("license_activations")
          .select("id", { count: "exact", head: true })
          .eq("license_id", license.id)
          .eq("active", true);

        const usable = licenseIsUsable(license as { status: string; expires_at: string | null });

        return json({
          valid: usable.valid,
          status: usable.valid ? "active" : (usable.reason ?? license.status),
          expires_at: license.expires_at,
          device_limit: license.device_limit,
          devices_in_use: count ?? 0,
          plan: license.plans ?? null,
        });
      },
    },
  },
});
