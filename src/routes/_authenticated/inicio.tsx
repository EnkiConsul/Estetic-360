import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, CheckCircle2, PhoneOff } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinicContext } from "@/hooks/use-clinic-context";
import { useCrmPendings } from "@/hooks/use-crm";
import { formatDateTime, type Lead } from "@/lib/crm-data";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Central de ações | Estetic360º" },
      {
        name: "description",
        content:
          "Veja em um só lugar os leads sem primeiro contato e os follow-ups vencidos da sua clínica de estética.",
      },
      { property: "og:title", content: "Central de ações | Estetic360º" },
      {
        property: "og:description",
        content: "As pendências que precisam da sua atenção hoje, em uma única tela.",
      },
    ],
  }),
  component: InicioPage,
});

function InicioPage() {
  const { data: context } = useClinicContext();
  const clinicId = context?.activeClinic?.id;
  const pendings = useCrmPendings(clinicId);
  const firstName = (context?.profile?.full_name || "").split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{context?.activeClinic?.name}</p>
        <h1 className="font-display text-3xl font-semibold">
          {firstName ? `Olá, ${firstName}` : "Olá"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Central de ações: o que precisa da sua atenção agora.
        </p>
      </header>

      {pendings.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : pendings.error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Não conseguimos carregar suas pendências. Tente novamente.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <PendingCard
            title="Leads sem primeiro contato"
            icon={PhoneOff}
            leads={pendings.data?.withoutContact ?? []}
            to="sem_contato"
          />
          <PendingCard
            title="Follow-ups vencidos"
            icon={AlertTriangle}
            leads={pendings.data?.overdue ?? []}
            to="followup_vencido"
          />
          <PendingCard
            title="Follow-ups de hoje"
            icon={CalendarClock}
            leads={pendings.data?.today ?? []}
          />
        </div>
      )}
    </div>
  );
}

function PendingCard({
  title,
  icon: Icon,
  leads,
  to,
}: {
  title: string;
  icon: typeof PhoneOff;
  leads: Lead[];
  to?: "sem_contato" | "followup_vencido";
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <span className="text-sm font-semibold">{leads.length}</span>
      </CardHeader>
      <CardContent className="space-y-2">
        {leads.length === 0 ? (
          <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" /> Tudo em dia por aqui.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {leads.slice(0, 5).map((lead) => (
                <li
                  key={lead.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{lead.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.interest || lead.phone || lead.email || "Sem detalhes"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(lead.next_followup_at)}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              to="/crm"
              search={to ? { pendencia: to } : {}}
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Ver no CRM
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
