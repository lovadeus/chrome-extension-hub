import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { plansQuery } from "@/lib/data";
import { PlanCard } from "@/components/plan-card";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos e preços — LOVADEUS" },
      {
        name: "description",
        content:
          "Compare os planos diário, mensal e anual da extensão LOVADEUS: preços, validade, limite de dispositivos e benefícios.",
      },
      { property: "og:title", content: "Planos e preços — LOVADEUS" },
      {
        property: "og:description",
        content: "Escolha entre plano diário, mensal ou anual e ative sua licença na hora.",
      },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { data: plans, isLoading } = useQuery(plansQuery);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-bold">Escolha o seu plano</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Todos os planos incluem atualizações automáticas e acesso aos tutoriais. Preços de
        demonstração.
      </p>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Carregando planos…</p>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {(plans ?? []).map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}

      <div className="mt-14 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Pagamento</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Aceitamos PIX e cartão de crédito pelo Mercado Pago. A liberação da licença acontece
          somente após a confirmação oficial do pagamento enviada pelo gateway ao nosso servidor.
        </p>
      </div>
    </div>
  );
}
