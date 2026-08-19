import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinicContext } from "@/hooks/use-clinic-context";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchMembers,
  fetchProcedures,
  isManager,
  ROLE_LABELS,
  type AppRole,
} from "@/lib/clinic-data";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
});

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ConfiguracoesPage() {
  const { data: context } = useClinicContext();
  const queryClient = useQueryClient();
  const manager = isManager(context?.roles ?? []);

  const [clinicName, setClinicName] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    setClinicName(context?.clinic?.name ?? "");
    setFullName(context?.profile?.full_name ?? "");
  }, [context?.clinic?.name, context?.profile?.full_name]);

  const members = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const procedures = useQuery({ queryKey: ["procedures"], queryFn: fetchProcedures });

  const saveClinic = useMutation({
    mutationFn: async () => {
      const name = clinicName.trim();
      if (!name) throw new Error("Informe o nome da clínica.");
      const { error } = await supabase
        .from("clinics")
        .update({ name })
        .eq("id", context!.clinic!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Dados da clínica atualizados.");
      void queryClient.invalidateQueries({ queryKey: ["clinic-context"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      const name = fullName.trim();
      if (!name) throw new Error("Informe seu nome.");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name })
        .eq("id", context!.userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Seu nome foi atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["clinic-context"] });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dados da clínica, sua conta e o que já está cadastrado.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sua clínica</CardTitle>
          <CardDescription>
            {manager
              ? "Só administradores e gestores podem alterar estes dados."
              : "Apenas administradores e gestores podem alterar estes dados."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clinic-name">Nome da clínica</Label>
            <Input
              id="clinic-name"
              value={clinicName}
              onChange={(event) => setClinicName(event.target.value)}
              disabled={!manager}
            />
          </div>
          {manager && (
            <Button onClick={() => saveClinic.mutate()} disabled={saveClinic.isPending}>
              {saveClinic.isPending ? "Salvando..." : "Salvar clínica"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sua conta</CardTitle>
          <CardDescription>{context?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Seu nome</Label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(context?.roles ?? []).map((role: AppRole) => (
              <Badge key={role} variant="secondary">
                {ROLE_LABELS[role]}
              </Badge>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending}
          >
            {saveProfile.isPending ? "Salvando..." : "Salvar meu nome"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipe</CardTitle>
          <CardDescription>Pessoas com acesso a esta clínica.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.isPending ? (
            <Skeleton className="h-12" />
          ) : (
            (members.data ?? []).map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <p className="truncate text-sm font-medium">{member.full_name || "Sem nome"}</p>
                <div className="flex flex-wrap justify-end gap-1">
                  {member.roles.length === 0 ? (
                    <Badge variant="outline">Sem papel</Badge>
                  ) : (
                    member.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {ROLE_LABELS[role]}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
          <p className="pt-1 text-xs text-muted-foreground">
            Convites por e-mail e troca de papéis entram na próxima fase.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Procedimentos</CardTitle>
          <CardDescription>Serviços cadastrados na sua clínica.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {procedures.isPending ? (
            <Skeleton className="h-12" />
          ) : (procedures.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum procedimento cadastrado ainda.</p>
          ) : (
            (procedures.data ?? []).map((procedure) => (
              <div
                key={procedure.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{procedure.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(procedure.default_price)}
                    {procedure.duration_minutes ? ` · ${procedure.duration_minutes} min` : ""}
                  </p>
                </div>
                {!procedure.is_active && <Badge variant="outline">Inativo</Badge>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
