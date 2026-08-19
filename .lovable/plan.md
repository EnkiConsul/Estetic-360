# Estetic360º — Fase 1: Fundação, Acesso e Multiempresa

Escopo desta fase: base do sistema (login, clínica, papéis, isolamento de dados e navegação). Nenhum módulo operacional (CRM, agenda, financeiro) será implementado agora.

## O que será entregue

1. **Backend Lovable Cloud ativado** (banco, autenticação, armazenamento privado).
2. **Login e cadastro** em português, com e-mail/senha, mensagens de erro claras e recuperação de sessão.
3. **Criação/entrada em clínica**: ao se cadastrar, o usuário cria sua clínica e vira Admin dela.
4. **Perfis de acesso**: Admin, Gestor, Recepção, Profissional, Financeiro (armazenados em tabela própria, validados no backend).
5. **Isolamento por clínica**: todo dado nasce vinculado à clínica do usuário; usuário de uma clínica não vê nem infere dados de outra.
6. **Layout base e menu**: Início, CRM, Pacientes, Agenda, Atendimentos, Financeiro, Relatórios, Configurações. Nesta fase, apenas Início e Configurações têm conteúdo; os demais mostram uma tela "em construção" consistente.
7. **Início (Central de Ações) — estrutura**: cabeçalho com nome da clínica, blocos de ação preparados (leads sem contato, follow-ups, retornos, parcelas vencidas, agenda do dia) exibindo os dados de demonstração da fase.
8. **Configurações**: dados da clínica, lista de usuários e papéis, cadastro de procedimentos da clínica (nada hardcoded).
9. **Dados de demonstração**: uma clínica exemplo com alguns usuários, procedimentos, leads e pacientes fictícios criados via migração, para o produto já aparecer funcionando.
10. **Identidade visual**: direção clean e profissional para estética/saúde — tons neutros quentes (areia/off-white) com acento em verde-oliva sofisticado e detalhes em bronze, tipografia elegante mas legível, cantos suaves, ótima experiência no celular. Tudo em tokens de tema, sem cores fixas nos componentes.

## Detalhes técnicos

- **Tabelas**: `clinics`, `profiles` (usuário ↔ clínica), `user_roles` (enum `app_role`, tabela separada — nunca papel no perfil), `procedures`, além de `leads` e `patients` mínimos apenas para popular a demonstração e provar o isolamento.
- **Segurança**: RLS habilitada em todas as tabelas, com função `security definer` `has_role()` e `current_clinic_id()`; políticas sempre escopadas pela clínica do usuário autenticado; `GRANT` explícito por tabela; `clinic_id` nunca aceito do frontend — derivado do usuário no backend.
- **Fluxo de cadastro**: criação de clínica + perfil + papel Admin em uma única operação atômica e idempotente (RPC), evitando duplicidade em reenvio.
- **Rotas**: área autenticada sob layout protegido; `/auth` pública. Leituras de dados via server functions do TanStack Start (sem edge functions nesta fase).
- **Armazenamento**: bucket privado criado já configurado para fotos/documentos das fases seguintes; nenhum bucket público.
- **Índices, checks, FKs e `updated_at`** em todas as tabelas; migração versionada única para a fase.

## Fora desta fase

CRM completo, avaliações, protocolos, sessões, atendimentos, evoluções, fotos, documentos, agenda, financeiro, relatórios e IA. Serão fases seguintes, uma por vez.

## Evidências ao final

Arquivos criados/alterados, migração aplicada, tabelas/índices/constraints, políticas RLS, RPCs, TypeScript, lint, build, teste do fluxo de cadastro/login e teste de isolamento entre duas clínicas, além de pendências e riscos.
