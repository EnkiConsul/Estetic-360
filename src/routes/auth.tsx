import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no Estetic360º" },
      {
        name: "description",
        content:
          "Acesse sua conta do Estetic360º para gerenciar leads, pacientes, agenda e financeiro da sua clínica de estética.",
      },
      { property: "og:title", content: "Entrar no Estetic360º" },
      {
        property: "og:description",
        content: "Acesse sua clínica no Estetic360º e organize a rotina em um só lugar.",
      },
    ],
  }),
  component: AuthPage,
});

function friendlyError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (normalized.includes("already registered") || normalized.includes("already been registered"))
    return "Este e-mail já tem uma conta. Use a aba Entrar.";
  if (normalized.includes("password")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (normalized.includes("email")) return "Verifique o e-mail informado.";
  return "Não foi possível concluir. Tente novamente.";
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/inicio" });
    });
  }, [navigate]);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error(friendlyError(error.message));
      return;
    }
    navigate({ to: "/inicio" });
  };

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/inicio`,
        data: { full_name: fullName.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(friendlyError(error.message));
      return;
    }
    toast.success("Conta criada! Vamos configurar sua clínica.");
    navigate({ to: "/inicio" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-semibold">Estetic360º</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A rotina da sua clínica organizada em um só lugar.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acesse sua clínica</CardTitle>
            <CardDescription>Use seu e-mail e senha para entrar ou criar sua conta.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="entrar">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="criar">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="entrar" className="mt-4">
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void signIn();
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="email-entrar">E-mail</Label>
                    <Input
                      id="email-entrar"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha-entrar">Senha</Label>
                    <Input
                      id="senha-entrar"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="criar" className="mt-4">
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void signUp();
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="nome-criar">Seu nome</Label>
                    <Input
                      id="nome-criar"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      autoComplete="name"
                      placeholder="Ex.: Dra. Camila Ribeiro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-criar">E-mail</Label>
                    <Input
                      id="email-criar"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha-criar">Senha</Label>
                    <Input
                      id="senha-criar"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Use pelo menos 6 caracteres.</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Criando conta..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
