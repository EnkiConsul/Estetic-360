import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInvalidateCrm, type MemberOption } from "@/hooks/use-crm";
import {
  createLead,
  friendlyError,
  fromLocalInputValue,
  LEAD_SOURCES,
  toLocalInputValue,
  updateLead,
  type Lead,
  type LeadInput,
} from "@/lib/crm-data";

const EMPTY: LeadInput = {
  name: "",
  phone: "",
  email: "",
  interest: "",
  source: "",
  campaign: "",
  assignedMemberId: null,
  nextFollowupAt: null,
};

const NONE = "__none__";

export function LeadFormDialog({
  open,
  onOpenChange,
  clinicId,
  members,
  lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  members: MemberOption[];
  lead?: Lead | null;
}) {
  const invalidate = useInvalidateCrm();
  const [form, setForm] = useState<LeadInput>(EMPTY);
  const [followup, setFollowup] = useState("");

  useEffect(() => {
    if (!open) return;
    if (lead) {
      setForm({
        name: lead.name,
        phone: lead.phone ?? "",
        email: lead.email ?? "",
        interest: lead.interest ?? "",
        source: lead.source ?? "",
        campaign: lead.campaign ?? "",
        assignedMemberId: lead.assigned_member_id,
        nextFollowupAt: lead.next_followup_at,
      });
      setFollowup(toLocalInputValue(lead.next_followup_at));
    } else {
      setForm(EMPTY);
      setFollowup("");
    }
  }, [open, lead]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: LeadInput = {
        ...form,
        name: form.name.trim(),
        nextFollowupAt: fromLocalInputValue(followup),
      };
      if (!payload.name) throw new Error("Informe o nome do lead.");
      if (!payload.phone.trim() && !payload.email.trim()) {
        throw new Error("Informe telefone ou e-mail.");
      }
      if (lead) await updateLead(lead.id, payload);
      else await createLead(clinicId, payload);
    },
    onSuccess: () => {
      toast.success(lead ? "Lead atualizado." : "Lead criado.");
      invalidate();
      onOpenChange(false);
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  const set = <K extends keyof LeadInput>(key: K, value: LeadInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar lead" : "Novo lead"}</DialogTitle>
          <DialogDescription>
            Nome é obrigatório. Informe pelo menos telefone ou e-mail.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="lead-name">Nome</Label>
            <Input
              id="lead-name"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Nome do lead"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="lead-phone">Telefone</Label>
              <Input
                id="lead-phone"
                value={form.phone}
                onChange={(event) => set("phone", event.target.value)}
                placeholder="(62) 99999-9999"
                inputMode="tel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-email">E-mail</Label>
              <Input
                id="lead-email"
                type="email"
                value={form.email}
                onChange={(event) => set("email", event.target.value)}
                placeholder="nome@email.com"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lead-interest">Interesse</Label>
            <Input
              id="lead-interest"
              value={form.interest}
              onChange={(event) => set("interest", event.target.value)}
              placeholder="Ex.: harmonização facial"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Origem</Label>
              <Select
                value={form.source || NONE}
                onValueChange={(value) => set("source", value === NONE ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não informada</SelectItem>
                  {LEAD_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-campaign">Campanha</Label>
              <Input
                id="lead-campaign"
                value={form.campaign}
                onChange={(event) => set("campaign", event.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Responsável</Label>
              <Select
                value={form.assignedMemberId ?? NONE}
                onValueChange={(value) => set("assignedMemberId", value === NONE ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem responsável</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-followup">Próximo follow-up</Label>
              <Input
                id="lead-followup"
                type="datetime-local"
                value={followup}
                onChange={(event) => setFollowup(event.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando..." : lead ? "Salvar" : "Criar lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
