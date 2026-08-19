import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, PhoneCall, Sparkles, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinicContext } from "@/hooks/use-clinic-context";
import { fetchDashboard, LEAD_STATUS_LABELS, type Lead } from "@/lib/clinic-data";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: InicioPage,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function InicioPage() {
  const { data: context } = useClinicContext();
  const { data, isPending } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });

  const firstName = (context?.profile?.full_name || "").split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Central de ações</p>
        <h1 className="font-display text-3xl font-semibold">
          {firstName ? `Olá, ${firstName}` : "Olá"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui ficam as pendências que precisam da sua atenção hoje.
        </p>
      </header>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            icon={<PhoneCall className="h-4 w-4" />}
            label="Leads em aberto"
            value={data?.openLeads ?? 0}
          />
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            label="Pacientes"
            value={data?.patientCount ?? 0}
          />
          <MetricCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Procedimentos ativos"
            value={data?.procedureCount ?? 0}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ActionList
          title="Leads sem contato"
          description="Ninguém falou com estas pessoas ainda."
          leads={data?.leadsWithoutContact ?? []}
          loading={isPending}
          emptyText="Nenhum lead esperando o primeiro contato."
        />
        <ActionList
          title="Follow-ups vencidos"
          description="O retorno combinado já passou da data."
          leads={data?.overdueFollowups ?? []}
          loading={isPending}
          emptyText="Nenhum follow-up atrasado."
          showDate
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PendingCard
          title="Retornos de pacientes"
          text="Chega junto com o módulo de atendimentos."
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <PendingCard
          title="Protocolos sem próxima sessão"
          text="Chega junto com protocolos e sessões."
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <PendingCard
          title="Parcelas vencidas"
          text="Chega junto com o módulo financeiro."
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-2xl leading-none font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionList({
  title,
  description,
  leads,
  loading,
  emptyText,
  showDate,
}: {
  title: string;
  description: string;
  leads: Lead[];
  loading: boolean;
  emptyText: string;
  showDate?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="secondary">{leads.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <>
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </>
        ) : leads.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{lead.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {lead.interest ?? "Sem interesse informado"} ·{" "}
                  {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                  {showDate ? ` · ${formatDate(lead.next_followup_at)}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/crm">Ver</Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PendingCard({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="space-y-1 py-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <p className="text-sm font-medium text-foreground">{title}</p>
        </div>
        <p className="text-xs text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
