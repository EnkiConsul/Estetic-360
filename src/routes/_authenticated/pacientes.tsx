import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/pacientes")({
  component: () => (
    <ModulePlaceholder
      title="Pacientes"
      description="A base do Paciente 360º: dados, histórico e documentos em um só lugar."
      nextStep="Na próxima fase você verá a ficha completa do paciente, com anamnese, fotos, protocolos e histórico financeiro."
    />
  ),
});
