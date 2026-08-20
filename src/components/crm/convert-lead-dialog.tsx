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
import { useInvalidateCrm } from "@/hooks/use-crm";
import {
  convertLeadToPatient,
  friendlyError,
  type Lead,
  type PatientCandidate,
} from "@/lib/crm-data";

export function ConvertLeadDialog({
  open,
  onOpenChange,
  lead,
  canForceNew,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  canForceNew: boolean;
}) {
  const invalidate = useInvalidateCrm();
  const [candidates, setCandidates] = useState<PatientCandidate[] | null>(null);

  useEffect(() => {
    if (open) setCandidates(null);
  }, [open]);

  const convert = useMutation({
    mutationFn: (params: { patientId?: string; forceNew?: boolean }) =>
      convertLeadToPatient({
        leadId: lead.id,
        patientId: params.patientId ?? null,
        forceNew: params.forceNew ?? false,
      }),
    onSuccess: (result) => {
      if (result.status === "duplicates") {
        setCandidates(result.candidates);
        return;
      }
      toast.success(
        result.status === "already_converted"
          ? "Este lead já estava convertido — nenhum paciente duplicado foi criado."
          : "Lead convertido em paciente.",
      );
      invalidate();
      onOpenChange(false);
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Converter em paciente</DialogTitle>
          <DialogDescription>
            {candidates
              ? "Encontramos um possível paciente já cadastrado."
              : `O lead ${lead.name} será transformado em paciente, mantendo origem e campanha.`}
          </DialogDescription>
        </DialogHeader>

        {candidates && (
          <ul className="space-y-2">
            {candidates.map((candidate) => (
              <li
                key={candidate.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{candidate.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {candidate.phone || candidate.email} · igual por {candidate.match_reason}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => convert.mutate({ patientId: candidate.id })}
                  disabled={convert.isPending}
                >
                  Vincular
                </Button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {candidates ? (
            canForceNew && (
              <Button
                variant="outline"
                onClick={() => convert.mutate({ forceNew: true })}
                disabled={convert.isPending}
              >
                Criar novo mesmo assim
              </Button>
            )
          ) : (
            <Button onClick={() => convert.mutate({})} disabled={convert.isPending}>
              {convert.isPending ? "Convertendo..." : "Converter"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
