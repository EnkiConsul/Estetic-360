import { AlertTriangle, CalendarClock, PhoneOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MemberOption } from "@/hooks/use-crm";
import { followupState, formatDateTime, needsFirstContact, type Lead } from "@/lib/crm-data";

export function LeadCard({
  lead,
  members,
  onOpen,
}: {
  lead: Lead;
  members: MemberOption[];
  onOpen: (lead: Lead) => void;
}) {
  const state = followupState(lead);
  const owner = members.find((member) => member.id === lead.assigned_member_id)?.name;

  return (
    <button
      type="button"
      onClick={() => onOpen(lead)}
      className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium">{lead.name}</p>
        {state === "atrasado" && (
          <Badge variant="destructive" className="shrink-0 gap-1">
            <AlertTriangle className="h-3 w-3" /> Atrasado
          </Badge>
        )}
        {state === "hoje" && (
          <Badge variant="secondary" className="shrink-0">
            Hoje
          </Badge>
        )}
      </div>

      {lead.interest && (
        <p className="mt-1 truncate text-xs text-muted-foreground">{lead.interest}</p>
      )}

      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {owner && <p className="truncate">Responsável: {owner}</p>}
        {lead.source && <p className="truncate">Origem: {lead.source}</p>}
        {lead.next_followup_at && (
          <p className="flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            {formatDateTime(lead.next_followup_at)}
          </p>
        )}
        {needsFirstContact(lead) && (
          <p className="flex items-center gap-1">
            <PhoneOff className="h-3 w-3" /> Sem primeiro contato
          </p>
        )}
      </div>
    </button>
  );
}
