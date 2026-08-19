import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/atendimentos")({
  component: () => (
    <ModulePlaceholder
      title="Atendimentos"
      description="Registro clínico de cada sessão realizada."
      nextStep="Na próxima fase você vai registrar evolução, produtos usados, fotos antes/depois e a próxima sessão do protocolo."
    />
  ),
});
