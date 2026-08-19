import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: () => (
    <ModulePlaceholder
      title="Relatórios"
      description="Indicadores simples para decidir o próximo passo."
      nextStep="Na próxima fase você verá conversão de leads, procedimentos mais vendidos e faturamento por período."
    />
  ),
});
