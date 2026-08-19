import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/crm")({
  component: () => (
    <ModulePlaceholder
      title="CRM"
      description="Captação e acompanhamento de leads até virarem pacientes."
      nextStep="Na próxima fase você vai cadastrar leads, registrar contatos, agendar follow-ups e converter em paciente com um clique."
    />
  ),
});
