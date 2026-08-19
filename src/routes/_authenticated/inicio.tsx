import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, Contact, Sparkles, Users, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useClinicContext } from "@/hooks/use-clinic-context";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: InicioPage,
});

const UPCOMING = [
  { title: "CRM e leads", text: "Captação e acompanhamento até virar paciente.", icon: Contact },
  { title: "Pacientes 360º", text: "Histórico completo em uma única tela.", icon: Users },
  { title: "Agenda", text: "Avaliações, sessões e retornos.", icon: CalendarDays },
  { title: "Atendimentos", text: "Protocolos, sessões e evolução.", icon: ClipboardList },
  { title: "Financeiro", text: "Vendas, recebimentos e parcelas.", icon: Wallet },
] as const;

function InicioPage() {
  const { data: context } = useClinicContext();
  const firstName = (context?.profile?.full_name || "").split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{context?.activeClinic?.name}</p>
        <h1 className="font-display text-3xl font-semibold">
          {firstName ? `Olá, ${firstName}` : "Olá"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua clínica está criada e o acesso está configurado. Os módulos de operação serão
          liberados nas próximas fases.
        </p>
      </header>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <p className="font-medium">Central de ações vazia</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Quando os módulos entrarem no ar, as pendências que precisam da sua atenção aparecem
            aqui: primeiros contatos, retornos, sessões e parcelas.
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {UPCOMING.map((item) => (
          <Card key={item.title} className="border-dashed">
            <CardContent className="space-y-1 py-5">
              <div className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{item.title}</p>
              </div>
              <p className="text-xs text-muted-foreground">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
