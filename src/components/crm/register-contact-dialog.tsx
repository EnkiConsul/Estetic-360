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
  ACTIVITY_KIND_LABELS,
  CONTACT_KINDS,
  friendlyError,
  fromLocalInputValue,
  LEAD_STATUS_LABELS,
  registerLeadContact,
  SELECTABLE_STATUSES,
  type Lead,
  type LeadActivityKind,
  type LeadStatus,
} from "@/lib/crm-data";

const KEEP = "__keep__";

export function RegisterContactDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}) {
  const invalidate = useInvalidateCrm();
  const [kind, setKind] = useState<LeadActivityKind>("ligacao");
  const [note, setNote] = useState("");
  const [followup, setFollowup] = useState("");
  const [status, setStatus] = useState<string>(KEEP);

  useEffect(() => {
    if (!open) return;
    setKind("ligacao");
    setNote("");
    setFollowup("");
    setStatus(KEEP);
  }, [open]);

  const save = useMutation({
    mutationFn: () =>
      registerLeadContact({
        leadId: lead.id,
        kind,
        note,
        nextFollowupAt: fromLocalInputValue(followup),
        newStatus: status === KEEP ? null : (status as LeadStatus),
      }),
    onSuccess: () => {
      toast.success("Contato registrado.");
      invalidate();
      onOpenChange(false);
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar contato</DialogTitle>
          <DialogDescription>
            O histórico do lead e a data do último contato são atualizados juntos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as LeadActivityKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_KINDS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {ACTIVITY_KIND_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact-note">Observação</Label>
            <Textarea
              id="contact-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="O que foi conversado?"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact-followup">Próximo follow-up</Label>
            <Input
              id="contact-followup"
              type="datetime-local"
              value={followup}
              onChange={(event) => setFollowup(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Nova etapa</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={KEEP}>Manter {LEAD_STATUS_LABELS[lead.status]}</SelectItem>
                {SELECTABLE_STATUSES.filter((item) => item !== "perdido").map((item) => (
                  <SelectItem key={item} value={item}>
                    {LEAD_STATUS_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Registrando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
