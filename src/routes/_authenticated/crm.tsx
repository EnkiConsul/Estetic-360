import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { CrmFilters, StageSelect } from "@/components/crm/crm-filters";
import { LeadCard } from "@/components/crm/lead-card";
import { LeadDetailSheet } from "@/components/crm/lead-detail-sheet";
import { LeadFormDialog } from "@/components/crm/lead-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinicContext } from "@/hooks/use-clinic-context";
import { useClinicTeamOptions, useLeads } from "@/hooks/use-crm";
import { isManager } from "@/lib/clinic-data";
import {
  followupState,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  needsFirstContact,
  type Lead,
  type LeadFilters,
} from "@/lib/crm-data";

type CrmSearch = { pendencia?: "followup_vencido" | "sem_contato" };

export const Route = createFileRoute("/_authenticated/crm")({
  validateSearch: (search: Record<string, unknown>): CrmSearch => {
    const value = search["pendencia"];
    return value === "followup_vencido" || value === "sem_contato" ? { pendencia: value } : {};
  },
  head: () => ({
    meta: [
      { title: "CRM e leads | Estetic360º" },
      {
        name: "description",
        content:
          "Acompanhe leads da sua clínica de estética pelo pipeline, registre contatos, agende follow-ups e converta em paciente.",
      },
      { property: "og:title", content: "CRM e leads | Estetic360º" },
      {
        property: "og:description",
        content: "Nenhum lead esquecido: pipeline, follow-ups e conversão em paciente.",
      },
    ],
  }),
  component: CrmPage,
});

function CrmPage() {
  const search = Route.useSearch();
  const { data: context } = useClinicContext();
  const clinicId = context?.activeClinic?.id;
  const canForceNew = isManager(context?.activeRole ?? null);

  const [filters, setFilters] = useState<LeadFilters>({
    search: "",
    status: "todos",
    assignedMemberId: "todos",
    source: "todos",
    quick: search.pendencia ?? "todos",
  });
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const members = useClinicTeamOptions(clinicId);
  const leads = useLeads(clinicId, filters);
  const memberOptions = members.data ?? [];

  const selected = useMemo(
    () => (leads.data ?? []).find((lead) => lead.id === selectedId) ?? null,
    [leads.data, selectedId],
  );

  const indicators = useMemo(() => {
    const list = leads.data ?? [];
    return {
      novos: list.filter((lead) => lead.status === "novo").length,
      semContato: list.filter(needsFirstContact).length,
      atrasados: list.filter((lead) => followupState(lead) === "atrasado").length,
      propostas: list.filter((lead) => lead.status === "proposta").length,
    };
  }, [leads.data]);

  const update = (next: Partial<LeadFilters>) => setFilters((prev) => ({ ...prev, ...next }));

  if (!clinicId) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">CRM</h1>
          <p className="text-sm text-muted-foreground">
            Nenhum lead deve entrar na clínica e ser esquecido.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo lead
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicator label="Novos" value={indicators.novos} />
        <Indicator label="Sem contato" value={indicators.semContato} />
        <Indicator label="Follow-ups vencidos" value={indicators.atrasados} />
        <Indicator label="Propostas abertas" value={indicators.propostas} />
      </section>

      <CrmFilters filters={filters} members={memberOptions} onChange={update} />

      {/* Mobile: lista vertical com filtro por etapa */}
      <div className="lg:hidden">
        <StageSelect value={filters.status} onChange={(status) => update({ status })} />
      </div>

      {leads.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : leads.error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Não conseguimos carregar os leads. Tente novamente.
          </CardContent>
        </Card>
      ) : (leads.data ?? []).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum lead ainda. Adicione seu primeiro contato para começar o acompanhamento.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {(leads.data ?? []).map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                members={memberOptions}
                onOpen={(item) => setSelectedId(item.id)}
              />
            ))}
          </div>

          <div className="hidden gap-4 overflow-x-auto pb-2 lg:flex">
            {LEAD_STATUSES.filter(
              (status) => filters.status === "todos" || filters.status === status,
            ).map((status) => (
              <Column
                key={status}
                title={LEAD_STATUS_LABELS[status]}
                leads={(leads.data ?? []).filter((lead) => lead.status === status)}
                members={memberOptions}
                onOpen={(lead) => setSelectedId(lead.id)}
              />
            ))}
          </div>
        </>
      )}

      <LeadFormDialog
        open={creating}
        onOpenChange={setCreating}
        clinicId={clinicId}
        members={memberOptions}
      />
      <LeadDetailSheet
        lead={selected}
        members={memberOptions}
        clinicId={clinicId}
        canForceNew={canForceNew}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}

function Indicator({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Column({
  title,
  leads,
  members,
  onOpen,
}: {
  title: string;
  leads: Lead[];
  members: { id: string; name: string; role: string }[];
  onOpen: (lead: Lead) => void;
}) {
  return (
    <div className="w-64 shrink-0">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-sm font-medium">{title}</p>
        <span className="text-xs text-muted-foreground">{leads.length}</span>
      </div>
      <div className="space-y-2 rounded-lg bg-muted/40 p-2">
        {leads.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">Vazio</p>
        ) : (
          leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} members={members} onOpen={onOpen} />
          ))
        )}
      </div>
    </div>
  );
}
