import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  price_cents: number;
  duration_days: number;
  device_limit: number;
  features: string[];
  highlighted: boolean;
  active: boolean;
  sort_order: number;
};

export type BrandSettings = {
  name: string;
  tagline: string;
  support_email: string;
  whatsapp: string;
};

export type ExtensionSettings = {
  version: string;
  download_url: string;
  chrome_store_url: string;
  min_chrome: string;
  changelog: string;
};

export const plansQuery = queryOptions({
  queryKey: ["plans"],
  queryFn: async (): Promise<Plan[]> => {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as unknown as Plan[];
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) throw error;
    const map: Record<string, Record<string, unknown>> = {};
    for (const row of data ?? []) map[row.key] = (row.value ?? {}) as Record<string, unknown>;
    return {
      brand: (map["brand"] ?? {}) as unknown as BrandSettings,
      extension: (map["extension"] ?? {}) as unknown as ExtensionSettings,
      payments: (map["payments"] ?? {}) as Record<string, unknown>,
    };
  },
});

export const tutorialsQuery = queryOptions({
  queryKey: ["tutorials"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("tutorials")
      .select("*")
      .eq("published", true)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },
});
