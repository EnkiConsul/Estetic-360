import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: () => (
    <ModulePlaceholder
      title="Agenda"
      description="Agendamentos por profissional, sala e procedimento."
      nextStep="Na próxima fase você vai marcar horários, confirmar presença e registrar faltas direto na agenda."
    />
  ),
});
