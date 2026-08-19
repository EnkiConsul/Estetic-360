import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clinicContextKey } from "@/hooks/use-clinic-context";
import { createClinicWithAdmin } from "@/lib/clinic-data";

export function ClinicSetup({ defaultName }: { defaultName?: string }) {
  const [clinicName, setClinicName] = useState("");
  const [fullName, setFullName] = useState(defaultName ?? "");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createClinicWithAdmin(clinicName.trim(), fullName.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clinicContextKey });
      toast.success("Clínica criada. Bem-vindo ao Estetic360º!");
    },
    onError: () => toast.error("Não foi possível criar a clínica. Tente novamente."),
  });

  const canSubmit = clinicName.trim().length >= 2 && !mutation.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-2xl">Vamos criar sua clínica</CardTitle>
          <CardDescription>
            Só precisamos de dois dados para começar. Você poderá completar o restante depois em
            Configurações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) mutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="clinicName">Nome da clínica ou do seu atendimento</Label>
              <Input
                id="clinicName"
                value={clinicName}
                onChange={(event) => setClinicName(event.target.value)}
                placeholder="Ex.: Studio Bella Estética"
                autoComplete="organization"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Seu nome</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ex.: Dra. Camila Ribeiro"
                autoComplete="name"
              />
            </div>
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {mutation.isPending ? "Criando..." : "Criar minha clínica"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
