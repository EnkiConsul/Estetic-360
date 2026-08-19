import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/recuperar-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Recuperar senha — Estetic360º" },
      {
        name: "description",
        content:
          "Receba um link por e-mail para redefinir a senha da sua conta Estetic360º e voltar a acessar sua clínica.",
      },
      { property: "og:title", content: "Recuperar senha — Estetic360º" },
      {
        property: "og:description",
        content: "Enviamos um link seguro para você criar uma nova senha.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecuperarSenhaPage,
});

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setLoading(true);
    // Resposta sempre genérica: não revelamos se o e-mail existe (anti-enumeração).
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nova-senha`,
    });
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-semibold">Estetic360º</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recuperar senha</CardTitle>
            <CardDescription>
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sent ? (
              <p className="text-sm text-muted-foreground">
                Se existir uma conta com esse e-mail, o link de recuperação chegará em instantes.
                Verifique também a caixa de spam.
              </p>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="email-recuperar">E-mail</Label>
                  <Input
                    id="email-recuperar"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
              </form>
            )}
            <Button variant="ghost" className="w-full" asChild>
              <Link to="/auth">Voltar para o login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
