import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: () => (
    <ModulePlaceholder
      title="Financeiro"
      description="Vendas, formas de pagamento e parcelas da clínica."
      nextStep="Na próxima fase você vai lançar vendas, controlar parcelas em aberto e ver o que entrou no mês."
    />
  ),
});
