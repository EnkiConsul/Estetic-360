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
import { Textarea } from "@/components/ui/textarea";
import { useInvalidateCrm } from "@/hooks/use-crm";
import {
  changeLeadStatus,
  friendlyError,
  fromLocalInputValue,
  LEAD_STATUS_LABELS,
  SELECTABLE_STATUSES,
  type Lead,
  type LeadStatus,
} from "@/lib/crm-data";

export type StatusMode = "etapa" | "perda" | "reabertura";

const TITLES: Record<StatusMode, string> = {
  etapa: "Alterar etapa",
  perda: "Marcar como perdido",
  reabertura: "Reabrir lead",
};

export function ChangeStatusDialog({
  open,
  onOpenChange,
  lead,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  mode: StatusMode;
}) {
  const invalidate = useInvalidateCrm();
  const [status, setStatus] = useState<LeadStatus>("em_contato");
  const [note, setNote] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [followup, setFollowup] = useState("");

  useEffect(() => {
    if (!open) return;
    setStatus(mode === "perda" ? "perdido" : mode === "reabertura" ? "em_contato" : lead.status);
    setNote("");
    setLossReason("");
    setFollowup("");
  }, [open, mode, lead.status]);

  const save = useMutation({
    mutationFn: async () => {
      if (mode === "perda" && !lossReason.trim()) {
        throw new Error("Informe o motivo da perda.");
      }
      await changeLeadStatus({
        leadId: lead.id,
        newStatus: mode === "perda" ? "perdido" : status,
        note: note.trim(),
        lossReason: lossReason.trim(),
        nextFollowupAt: fromLocalInputValue(followup),
      });
    },
    onSuccess: () => {
      toast.success(
        mode === "perda"
          ? "Lead marcado como perdido."
          : mode === "reabertura"
            ? "Lead reaberto."
            : "Etapa atualizada.",
      );
      invalidate();
      onOpenChange(false);
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  const options = SELECTABLE_STATUSES.filter((item) => item !== "perdido");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{TITLES[mode]}</DialogTitle>
          <DialogDescription>
            {mode === "perda"
              ? "O motivo é obrigatório e fica registrado no histórico."
              : "Toda mudança de etapa é registrada no histórico do lead."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {mode !== "perda" && (
            <div className="grid gap-2">
              <Label>Etapa</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as LeadStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((item) => (
                    <SelectItem key={item} value={item}>
                      {LEAD_STATUS_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "perda" && (
            <div className="grid gap-2">
              <Label htmlFor="loss-reason">Motivo da perda</Label>
              <Input
                id="loss-reason"
                value={lossReason}
                onChange={(event) => setLossReason(event.target.value)}
                placeholder="Ex.: preço, sem retorno, escolheu outra clínica"
              />
            </div>
          )}

          {mode !== "perda" && (
            <div className="grid gap-2">
              <Label htmlFor="status-followup">Próximo follow-up</Label>
              <Input
                id="status-followup"
                type="datetime-local"
                value={followup}
                onChange={(event) => setFollowup(event.target.value)}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="status-note">Observação</Label>
            <Textarea
              id="status-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="Opcional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            variant={mode === "perda" ? "destructive" : "default"}
          >
            {save.isPending ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
