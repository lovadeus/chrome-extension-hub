import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — LOVADEUS" },
      {
        name: "description",
        content:
          "Acesse sua área de cliente LOVADEUS para ver licenças, pedidos e baixar a extensão do Chrome.",
      },
      { property: "og:title", content: "Entrar — LOVADEUS" },
      { property: "og:description", content: "Área de cliente da extensão LOVADEUS." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) return toast.error("Não foi possível entrar: " + error.message);
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: String(form.get("email")),
      password: String(form.get("password")),
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: String(form.get("full_name") ?? ""),
          phone: String(form.get("phone") ?? ""),
        },
      },
    });
    setBusy(false);
    if (error) return toast.error("Não foi possível criar a conta: " + error.message);
    toast.success("Conta criada com sucesso!");
    navigate({ to: "/dashboard" });
  }

  async function recover(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(String(form.get("email")), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Enviamos um e-mail com o link para redefinir sua senha.");
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-3xl font-bold">Sua conta LOVADEUS</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Entre para ver suas licenças, pedidos e downloads.
      </p>

      <Tabs defaultValue="login" className="mt-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="login">Entrar</TabsTrigger>
          <TabsTrigger value="signup">Criar conta</TabsTrigger>
          <TabsTrigger value="recover">Esqueci</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <form onSubmit={signIn} className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="li-email">E-mail</Label>
              <Input id="li-email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="li-pass">Senha</Label>
              <Input
                id="li-pass"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              Entrar
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form onSubmit={signUp} className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="su-name">Nome completo</Label>
              <Input id="su-name" name="full_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-phone">WhatsApp</Label>
              <Input id="su-phone" name="phone" placeholder="(11) 90000-0000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-email">E-mail</Label>
              <Input id="su-email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-pass">Senha</Label>
              <Input
                id="su-pass"
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              Criar conta
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="recover">
          <form
            onSubmit={recover}
            className="space-y-4 rounded-2xl border border-border bg-card p-6"
          >
            <p className="text-sm text-muted-foreground">
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>
            <div className="space-y-2">
              <Label htmlFor="rc-email">E-mail</Label>
              <Input id="rc-email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              Enviar link
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
