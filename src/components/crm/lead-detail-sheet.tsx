import { useState } from "react";

import { ChangeStatusDialog, type StatusMode } from "@/components/crm/change-status-dialog";
import { ConvertLeadDialog } from "@/components/crm/convert-lead-dialog";
import { LeadActivityTimeline } from "@/components/crm/lead-activity-timeline";
import { LeadFormDialog } from "@/components/crm/lead-form-dialog";
import { RegisterContactDialog } from "@/components/crm/register-contact-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { MemberOption } from "@/hooks/use-crm";
import { formatDateTime, isTerminal, LEAD_STATUS_LABELS, type Lead } from "@/lib/crm-data";

export function LeadDetailSheet({
  lead,
  members,
  clinicId,
  canForceNew,
  onOpenChange,
}: {
  lead: Lead | null;
  members: MemberOption[];
  clinicId: string;
  canForceNew: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [contact, setContact] = useState(false);
  const [statusMode, setStatusMode] = useState<StatusMode | null>(null);
  const [converting, setConverting] = useState(false);

  if (!lead) return null;
  const owner = members.find((member) => member.id === lead.assigned_member_id)?.name;
  const terminal = isTerminal(lead.status);

  return (
    <>
      <Sheet open onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="pr-8">{lead.name}</SheetTitle>
            <SheetDescription asChild>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={lead.status === "perdido" ? "destructive" : "secondary"}>
                  {LEAD_STATUS_LABELS[lead.status]}
                </Badge>
                {lead.source && <span className="text-xs">Origem: {lead.source}</span>}
              </div>
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-6">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Telefone" value={lead.phone} />
              <Field label="E-mail" value={lead.email} />
              <Field label="Interesse" value={lead.interest} />
              <Field label="Campanha" value={lead.campaign} />
              <Field label="Responsável" value={owner ?? null} />
              <Field label="Próximo follow-up" value={formatDateTime(lead.next_followup_at)} />
              <Field label="Último contato" value={formatDateTime(lead.last_contact_at)} />
              {lead.loss_reason && <Field label="Motivo da perda" value={lead.loss_reason} />}
            </dl>

            <div className="flex flex-wrap gap-2">
              {!terminal && (
                <Button size="sm" onClick={() => setContact(true)}>
                  Registrar contato
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Editar
              </Button>
              {!terminal && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setStatusMode("etapa")}>
                    Alterar etapa
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setStatusMode("perda")}>
                    Marcar perdido
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConverting(true)}>
                    Converter em paciente
                  </Button>
                </>
              )}
              {lead.status === "perdido" && (
                <Button size="sm" variant="outline" onClick={() => setStatusMode("reabertura")}>
                  Reabrir
                </Button>
              )}
            </div>

            <Separator />

            <div>
              <p className="mb-3 text-sm font-medium">Histórico</p>
              <LeadActivityTimeline leadId={lead.id} members={members} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <LeadFormDialog
        open={editing}
        onOpenChange={setEditing}
        clinicId={clinicId}
        members={members}
        lead={lead}
      />
      <RegisterContactDialog open={contact} onOpenChange={setContact} lead={lead} />
      {statusMode && (
        <ChangeStatusDialog
          open
          onOpenChange={(open) => !open && setStatusMode(null)}
          lead={lead}
          mode={statusMode}
        />
      )}
      <ConvertLeadDialog
        open={converting}
        onOpenChange={setConverting}
        lead={lead}
        canForceNew={canForceNew}
      />
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words">{value || "—"}</dd>
    </div>
  );
}
