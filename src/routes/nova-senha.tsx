import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/nova-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Definir nova senha — Estetic360º" },
      {
        name: "description",
        content:
          "Crie uma nova senha para sua conta Estetic360º usando o link de recuperação recebido por e-mail.",
      },
      { property: "og:title", content: "Definir nova senha — Estetic360º" },
      {
        property: "og:description",
        content: "Escolha uma nova senha e volte a acessar sua clínica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NovaSenhaPage,
});

type Status = "checking" | "ready" | "invalid";

function NovaSenhaPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let settled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        settled = true;
        setStatus("ready");
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true;
        setStatus("ready");
      } else {
        // Link inválido ou expirado: o Supabase não cria sessão de recuperação.
        setTimeout(() => {
          if (!settled) setStatus("invalid");
        }, 1200);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não são iguais.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível alterar a senha. Solicite um novo link.");
      setStatus("invalid");
      return;
    }
    toast.success("Senha alterada com sucesso.");
    navigate({ to: "/inicio" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-semibold">Estetic360º</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Definir nova senha</CardTitle>
            <CardDescription>Escolha uma senha com pelo menos 6 caracteres.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "checking" && (
              <p className="text-sm text-muted-foreground">Validando seu link...</p>
            )}

            {status === "invalid" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Este link de recuperação é inválido ou já expirou. Solicite um novo.
                </p>
                <Button className="w-full" asChild>
                  <Link to="/recuperar-senha">Pedir novo link</Link>
                </Button>
              </>
            )}

            {status === "ready" && (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="nova-senha">Nova senha</Label>
                  <Input
                    id="nova-senha"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
                  <Input
                    id="confirmar-senha"
                    type="password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar nova senha"}
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
