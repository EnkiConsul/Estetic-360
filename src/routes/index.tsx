import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Estetic360º — Gestão para clínicas de estética" },
      {
        name: "description",
        content:
          "Estetic360º organiza leads, pacientes, agenda, atendimentos e financeiro da sua clínica de estética em um só lugar.",
      },
      { property: "og:title", content: "Estetic360º — Gestão para clínicas de estética" },
      {
        property: "og:description",
        content: "Leads, pacientes, agenda e financeiro da sua clínica em um só lugar.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/inicio" });
  },
  component: () => null,
});
