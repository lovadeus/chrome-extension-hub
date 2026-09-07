import { Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import type { Plan } from "@/lib/data";
import { formatBRL, planTypeLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlanCard({ plan }: { plan: Plan }) {
  const features = Array.isArray(plan.features) ? plan.features : [];
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border border-border bg-card p-6",
        plan.highlighted && "glow-ring border-primary/50",
      )}
    >
      {plan.highlighted && (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          <Sparkles className="size-3" /> Mais popular
        </span>
      )}
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {planTypeLabel[plan.type] ?? plan.type}
      </p>
      <h3 className="mt-2 text-xl font-semibold">{plan.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
      <p className="mt-5 font-display text-4xl font-bold">{formatBRL(plan.price_cents)}</p>
      <p className="text-sm text-muted-foreground">
        por {plan.duration_days} {plan.duration_days === 1 ? "dia" : "dias"} · até {plan.device_limit}{" "}
        {plan.device_limit === 1 ? "dispositivo" : "dispositivos"}
      </p>
      <ul className="mt-5 flex-1 space-y-2 text-sm">
        {features.map((f) => (
          <li key={String(f)} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{String(f)}</span>
          </li>
        ))}
      </ul>
      <Button asChild className="mt-6" variant={plan.highlighted ? "default" : "secondary"}>
        <Link to="/checkout" search={{ plan: plan.slug }}>
          Assinar {plan.name}
        </Link>
      </Button>
    </div>
  );
}
