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
import { fetchClinicTeam, isManager, ROLE_LABELS } from "@/lib/clinic-data";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { data: context } = useClinicContext();
  const queryClient = useQueryClient();
  const manager = isManager(context?.activeRole ?? null);
  const clinicId = context?.activeClinic?.id;

  const [clinicName, setClinicName] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    setClinicName(context?.activeClinic?.name ?? "");
    setFullName(context?.profile?.full_name ?? "");
  }, [context?.activeClinic?.name, context?.profile?.full_name]);

  const team = useQuery({
    queryKey: ["clinic-team", clinicId],
    queryFn: () => fetchClinicTeam(clinicId!),
    enabled: Boolean(clinicId),
  });

  const saveClinic = useMutation({
    mutationFn: async () => {
      const name = clinicName.trim();
      if (!name) throw new Error("Informe o nome da clínica.");
      if (!clinicId) throw new Error("Nenhuma clínica ativa.");
      const { error } = await supabase.from("clinics").update({ name }).eq("id", clinicId);
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
      void queryClient.invalidateQueries({ queryKey: ["clinic-team"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dados da clínica, sua conta e a equipe.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sua clínica</CardTitle>
          <CardDescription>
            Apenas administradores e gestores podem alterar estes dados.
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
            {context?.activeRole ? (
              <Badge variant="secondary">{ROLE_LABELS[context.activeRole]}</Badge>
            ) : (
              <Badge variant="outline">Sem papel</Badge>
            )}
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
          <CardDescription>Pessoas com vínculo nesta clínica.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {team.isPending ? (
            <Skeleton className="h-12" />
          ) : (
            (team.data ?? []).map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <p className="truncate text-sm font-medium">
                  {member.profile?.full_name || member.profile?.email || "Sem nome"}
                </p>
                <div className="flex flex-wrap justify-end gap-1">
                  <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                  {!member.is_active && <Badge variant="outline">Inativo</Badge>}
                </div>
              </div>
            ))
          )}
          <p className="pt-1 text-xs text-muted-foreground">
            Convites por e-mail e troca de papéis entram em uma fase futura.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
