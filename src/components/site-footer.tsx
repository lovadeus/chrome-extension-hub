import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/data";

export function SiteFooter() {
  const { data } = useQuery(settingsQuery);
  const brand = data?.brand;

  return (
    <footer className="border-t border-border/70 bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-bold">LOVADEUS</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {brand?.tagline ?? "Extensão do Chrome para produtividade."}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Conteúdo de demonstração — substitua antes de vender de verdade.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-medium">Produto</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link to="/planos">Planos e preços</Link>
            </li>
            <li>
              <Link to="/tutoriais">Tutoriais</Link>
            </li>
            <li>
              <Link to="/dashboard">Área do cliente</Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-medium">Conta</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link to="/auth">Entrar</Link>
            </li>
            <li>
              <Link to="/auth">Criar conta</Link>
            </li>
            <li>
              <Link to="/suporte">Suporte</Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-medium">Contato</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>{brand?.support_email ?? "suporte@lovadeus.demo"}</li>
            <li>{brand?.whatsapp ?? "+55 11 90000-0000"}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LOVADEUS. Todos os direitos reservados.
      </div>
    </footer>
  );
}
