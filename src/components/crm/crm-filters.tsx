import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MemberOption } from "@/hooks/use-crm";
import { LEAD_SOURCES, LEAD_STATUS_LABELS, LEAD_STATUSES, type LeadFilters } from "@/lib/crm-data";

export function CrmFilters({
  filters,
  members,
  onChange,
}: {
  filters: LeadFilters;
  members: MemberOption[];
  onChange: (next: Partial<LeadFilters>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative sm:col-span-2 lg:col-span-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search ?? ""}
          onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Buscar nome, telefone ou e-mail"
          className="pl-9"
          aria-label="Buscar leads"
        />
      </div>

      <Select
        value={filters.quick ?? "todos"}
        onValueChange={(value) => onChange({ quick: value as NonNullable<LeadFilters["quick"]> })}
      >
        <SelectTrigger aria-label="Pendências">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas as pendências</SelectItem>
          <SelectItem value="followup_vencido">Follow-up atrasado</SelectItem>
          <SelectItem value="sem_contato">Sem primeiro contato</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.assignedMemberId ?? "todos"}
        onValueChange={(value) => onChange({ assignedMemberId: value })}
      >
        <SelectTrigger aria-label="Responsável">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os responsáveis</SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.source ?? "todos"}
        onValueChange={(value) => onChange({ source: value })}
      >
        <SelectTrigger aria-label="Origem">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas as origens</SelectItem>
          {LEAD_SOURCES.map((source) => (
            <SelectItem key={source} value={source}>
              {source}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function StageSelect({
  value,
  onChange,
}: {
  value: LeadFilters["status"];
  onChange: (value: NonNullable<LeadFilters["status"]>) => void;
}) {
  return (
    <Select
      value={value ?? "todos"}
      onValueChange={(next) => onChange(next as NonNullable<LeadFilters["status"]>)}
    >
      <SelectTrigger aria-label="Etapa">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todas as etapas</SelectItem>
        {LEAD_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {LEAD_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
