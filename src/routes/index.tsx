import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Chrome,
  Gauge,
  KeyRound,
  LifeBuoy,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { plansQuery, settingsQuery } from "@/lib/data";
import { PlanCard } from "@/components/plan-card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LOVADEUS — Extensão do Chrome com licença e planos flexíveis" },
      {
        name: "description",
        content:
          "Assine a extensão LOVADEUS por dia, mês ou ano. Licença automática, ativação em segundos e painel completo para gerenciar seus dispositivos.",
      },
      { property: "og:title", content: "LOVADEUS — Extensão do Chrome" },
      {
        property: "og:description",
        content: "Planos diário, mensal e anual com licença emitida automaticamente.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: KeyRound,
    title: "Licença automática",
    text: "Assim que o pagamento é confirmado pelo gateway, a chave é gerada e aparece na sua conta.",
  },
  {
    icon: ShieldCheck,
    title: "Controle de dispositivos",
    text: "Cada plano define quantos computadores podem usar a mesma licença ao mesmo tempo.",
  },
  {
    icon: RefreshCw,
    title: "Atualizações contínuas",
    text: "Novas versões da extensão ficam disponíveis para download na área do cliente.",
  },
  {
    icon: Gauge,
    title: "Painel em tempo real",
    text: "Status da licença, validade, dispositivos ativos e histórico de pedidos em um só lugar.",
  },
  {
    icon: Lock,
    title: "Pagamento seguro",
    text: "PIX e cartão pelo gateway. A liberação só acontece via confirmação do servidor.",
  },
  {
    icon: LifeBuoy,
    title: "Suporte humano",
    text: "Abra um chamado direto pela plataforma e acompanhe a resposta da equipe.",
  },
];

function Landing() {
  const { data: plans } = useQuery(plansQuery);
  const { data: settings } = useQuery(settingsQuery);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0 opacity-70" aria-hidden />
        <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--glow),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Chrome className="size-3.5 text-primary" /> Extensão oficial para Google Chrome ·
            conteúdo de demonstração
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            <span className="text-gradient">{settings?.brand?.name ?? "LOVADEUS"}</span> — a extensão
            que trabalha por você no Chrome
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            {settings?.brand?.tagline ??
              "Automatize tarefas repetitivas, ganhe horas por semana e gerencie tudo em um painel profissional."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/planos">
                Ver planos e assinar <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/tutoriais">Como funciona</Link>
            </Button>
          </div>
          <dl className="mt-14 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              ["+12.400", "instalações (demo)"],
              ["4,9/5", "avaliação média"],
              ["< 60s", "para ativar"],
              ["99,9%", "disponibilidade"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-display text-2xl font-bold">{value}</dt>
                <dd className="text-xs text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold">Tudo que você precisa para vender e controlar acessos</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Da venda ao suporte: planos, licenças, dispositivos e atualizações num fluxo só.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
              <f.icon className="size-5 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold">Em 3 passos você está usando</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ["Escolha o plano", "Diário para testar, mensal para o dia a dia ou anual para economizar."],
              ["Pague com PIX ou cartão", "A confirmação chega automaticamente pelo gateway de pagamento."],
              ["Ative e use", "Baixe a extensão, cole a chave e comece a trabalhar."],
            ].map(([title, text], i) => (
              <li key={title} className="rounded-2xl border border-border bg-background p-6">
                <span className="font-display text-3xl font-bold text-primary">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold">Planos para todo tipo de uso</h2>
        <p className="mt-2 text-muted-foreground">Cancele quando quiser. Sem fidelidade.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {(plans ?? []).map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="text-3xl font-bold">Perguntas frequentes</h2>
        <Accordion type="single" collapsible className="mt-6">
          {[
            [
              "Como recebo minha licença?",
              "Depois que o pagamento é confirmado pelo gateway, a chave aparece automaticamente na sua área de cliente.",
            ],
            [
              "Posso usar em mais de um computador?",
              "Sim, dentro do limite de dispositivos do seu plano. Você pode remover um dispositivo antigo a qualquer momento.",
            ],
            [
              "Funciona em outros navegadores?",
              "A extensão foi feita para o Google Chrome e navegadores baseados em Chromium, como Edge e Brave.",
            ],
            [
              "Posso pedir reembolso?",
              "Este é um texto de demonstração: defina aqui a sua política de reembolso real antes de publicar.",
            ],
          ].map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
