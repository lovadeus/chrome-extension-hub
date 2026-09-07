import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { tutorialsQuery, settingsQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const Route = createFileRoute("/tutoriais")({
  head: () => ({
    meta: [
      { title: "Tutoriais — como instalar e ativar a extensão LOVADEUS" },
      {
        name: "description",
        content:
          "Passo a passo para instalar a extensão LOVADEUS no Chrome, ativar sua licença e resolver problemas comuns.",
      },
      { property: "og:title", content: "Tutoriais — LOVADEUS" },
      {
        property: "og:description",
        content: "Instalação, ativação de licença e solução de problemas.",
      },
    ],
  }),
  component: TutorialsPage,
});

function TutorialsPage() {
  const { data: tutorials } = useQuery(tutorialsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const url = settings?.extension?.download_url;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-4xl font-bold">Tutoriais</h1>
      <p className="mt-3 text-muted-foreground">
        Conteúdo administrável pelo painel — versão atual da extensão:{" "}
        {settings?.extension?.version ?? "—"}
      </p>

      {url && (
        <Button asChild className="mt-6">
          <a href={url} target="_blank" rel="noreferrer">
            <Download className="mr-1 size-4" /> Baixar extensão
          </a>
        </Button>
      )}

      <div className="mt-10 space-y-5">
        {(tutorials ?? []).map((t) => (
          <article key={t.id} className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">{t.title}</h2>
            {t.summary && <p className="mt-1 text-sm text-muted-foreground">{t.summary}</p>}
            <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {t.content}
            </pre>
            {t.video_url && (
              <a
                className="mt-4 inline-block text-sm text-primary underline"
                href={t.video_url}
                target="_blank"
                rel="noreferrer"
              >
                Assistir ao vídeo
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
