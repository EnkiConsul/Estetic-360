# Estetic Flow

ESTETIC360º — PROJECT KNOWLEDGE

Produto

Estetic360º é um SaaS simples, intuitivo e especializado na gestão de profissionais autônomos e pequenas clínicas de estética, harmonização facial e corporal.

A jornada central do produto é:

Lead → Contato → Avaliação → Paciente → Protocolo → Procedimento → Atendimento → Evolução → Retorno → Financeiro.

O sistema deve substituir controles dispersos em WhatsApp, papel, planilhas, agenda e ferramentas isoladas.

Público

Usuários normalmente não técnicos:

profissionais autônomos;

biomédicos estetas;

dentistas que trabalham com harmonização;

enfermeiros estetas;

esteticistas;

pequenas clínicas de estética.

A experiência deve ser extremamente simples.

Objetivo de Produto

Não construir um ERP genérico.

O Estetic360º deve controlar principalmente:

leads;

pacientes;

agenda;

avaliações;

protocolos;

sessões;

atendimentos;

evoluções;

fotos;

documentos;

retornos;

vendas;

parcelas;

recebimentos;

indicadores.

O produto deve ajudar a clínica a:

não perder leads;

não perder histórico de pacientes;

acompanhar tratamentos e sessões;

acompanhar retornos;

controlar vendas e recebimentos;

reduzir tarefas administrativas.

Stack obrigatória

Lovable

React

TypeScript

Vite

Supabase

PostgreSQL

Supabase Auth

Supabase Storage

Row Level Security

PostgreSQL RPC quando necessário

Supabase Edge Functions quando necessário

Supabase Vault para segredos quando aplicável

GitHub

Não trocar a stack sem justificativa arquitetural forte.

Arquitetura

O sistema deve ser SaaS multiempresa desde o início.

Toda entidade operacional pertencente a uma clínica deve possuir associação segura com clinic_id.

Nunca confiar exclusivamente em clinic_id enviado pelo frontend.

Autorizações devem considerar:

usuário autenticado;

vínculo com a clínica;

papel;

permissões;

RLS;

validação backend quando necessária.

Usuário da Clínica A jamais pode consultar, alterar, excluir ou inferir dados da Clínica B.

Preparar arquitetura para múltiplas unidades futuras sem obrigar essa complexidade na UX do MVP.

Perfis

Prever:

Admin

Gestor

Recepção

Profissional

Financeiro

Ações críticas devem ser validadas no backend.

Arquitetura de Navegação

Menu principal preferencial:

Início

CRM

Pacientes

Agenda

Atendimentos

Financeiro

Relatórios

Configurações

Avaliações, protocolos, sessões, evoluções, fotos e documentos devem aparecer principalmente dentro do contexto do paciente, evitando excesso de módulos no menu.

Paciente 360º

A página do paciente é o centro funcional do produto.

Deve centralizar:

visão geral;

timeline;

avaliações;

protocolos;

sessões;

atendimentos;

evoluções;

fotos;

documentos;

agenda;

financeiro;

relacionamento.

Evitar obrigar o usuário a navegar por vários módulos para entender um paciente.

CRM

Pipeline padrão:

Novo → Em contato → Interessado → Avaliação agendada → Avaliação realizada → Proposta → Convertido / Perdido.

Campos essenciais:

nome;

telefone;

e-mail;

interesse/procedimento;

origem;

campanha;

responsável;

próximo follow-up;

status;

motivo de perda.

Preservar histórico das interações.

Conversão Lead → Paciente deve evitar duplicidade por CPF, telefone, e-mail e identificadores aprovados.

Preservar origem, campanha e histórico após conversão.

Procedimentos

Procedimentos devem ser cadastráveis pela clínica.

Nunca hardcode procedimentos específicos no frontend ou banco como única opção.

Protocolos

Diferenciar:

modelo de protocolo;

protocolo real do paciente.

Mudanças em modelos nunca podem alterar retrospectivamente protocolos existentes.

Protocolos podem possuir:

procedimentos;

sessões;

profissional;

datas;

valor;

status;

observações;

fotos;

documentos.

Agenda

Agendamento pode envolver paciente ou lead.

Campos principais:

paciente/lead;

profissional;

procedimento;

unidade quando aplicável;

início;

fim;

status.

Status:

Agendado

Confirmado

Em atendimento

Concluído

Cancelado

Não compareceu

Conflitos de agenda devem ser impedidos também no backend, não apenas pela interface.

Atendimentos

Atendimento deve preservar:

paciente;

profissional;

protocolo;

sessão;

procedimento;

evolução;

observações;

fotos;

orientações;

retorno.

Registros finalizados e históricos sensíveis não podem ser alterados silenciosamente.

Fotos

Fotos são dados sensíveis.

Utilizar Storage privado.

Nunca criar bucket público por conveniência.

Validar usuário, clínica e autorização.

Utilizar URLs temporárias/assinadas quando apropriado.

Documentos

Tipos previstos:

termos;

consentimentos;

propostas;

contratos;

orientações.

Documentos assinados devem preservar:

documento;

versão;

data;

assinatura;

evidências disponíveis.

Documento assinado deve ser imutável.

Alteração exige nova versão.

Financeiro

Separar conceitualmente:

Venda ≠ Parcela ≠ Recebimento ≠ Caixa.

Controlar:

vendas;

itens;

descontos;

parcelas;

contas a receber;

recebimentos;

inadimplência;

estornos;

cancelamentos.

Pagamento confirmado nunca deve ser simplesmente excluído.

Usar cancelamento/estorno auditável.

Operações financeiras compostas devem ser atômicas e idempotentes quando necessário.

IA — Estetic Intelligence

IA deve gerar produtividade e inteligência.

Casos desejados:

resumo do histórico do paciente;

organização de observações;

estruturação de evolução ditada;

identificação de leads sem follow-up;

pacientes sem retorno;

protocolos sem próxima sessão;

resumo diário da clínica;

insights comerciais;

insights financeiros;

análise de funil.

IA não pode autonomamente:

diagnosticar;

prescrever;

escolher tratamento;

alterar histórico confirmado;

modificar financeiro confirmado;

acessar outra clínica.

Conteúdo clínico gerado por IA deve exigir revisão humana antes de integrar histórico definitivo.

Central de Ações

O Dashboard deve priorizar ações, não somente gráficos.

Exemplos:

leads sem contato;

follow-ups vencidos;

avaliações sem continuidade;

retornos pendentes;

protocolos sem próxima sessão;

parcelas vencidas;

agenda do dia.

Cada informação deve permitir chegar rapidamente à ação correspondente.

Segurança

Aplicar:

least privilege;

fail closed;

autenticação;

autorização;

RLS;

validação de entrada;

proteção multiempresa;

auditoria;

logs sanitizados;

Storage privado;

idempotência;

atomicidade;

tratamento de concorrência.

Dados de saúde, fotos e históricos são dados sensíveis.

Minimizar coleta e exposição.

LGPD, consentimento e retenção devem ser considerados antes de produção.

Segredos

Nunca salvar segredos em:

frontend;

VITE_*;

localStorage;

sessionStorage;

query string;

logs;

analytics;

GitHub.

Segredos de serviços externos pertencem somente ao backend/Vault/Secrets apropriados.

service_role nunca deve ser utilizado no frontend.

Banco

Antes de criar nova estrutura:

auditar schema existente;

procurar tabelas equivalentes;

evitar redundância;

criar FKs;

constraints;

checks;

índices;

updated_at;

RLS;

grants adequados.

Todas as mudanças estruturais devem possuir migration versionada.

Nunca apagar dados sem inventário, justificativa e rollback.

Edge Functions

Devem validar:

método;

autenticação;

usuário;

clínica;

papel/permissão;

payload.

Nunca retornar stack trace ou segredo.

Utilizar timeout em serviços externos.

Aplicar idempotência quando necessário.

Idempotência e Atomicidade

Especial atenção para:

conversão Lead → Paciente;

criação de vendas e parcelas;

recebimentos;

pagamentos;

webhooks;

assinatura digital;

integrações;

agendamento concorrente.

Repetir uma mesma operação não pode gerar registros duplicados.

Operações compostas críticas devem ser transacionais.

UX

Usuário não é técnico.

Priorizar:

poucos passos;

linguagem simples;

formulários curtos;

campos obrigatórios somente quando necessários;

loading;

empty states;

feedback claro;

erros compreensíveis;

confirmação para ações destrutivas;

responsividade;

excelente operação no celular.

Não expor termos técnicos como RLS, RPC, migration, worker, webhook ou service_role na interface do usuário.

Desenvolvimento no Lovable

Nunca implementar grandes módulos de uma vez.

Dividir desenvolvimento em fases pequenas.

Para cada fase:

diagnosticar primeiro;

identificar estruturas existentes;

planejar;

implementar somente o escopo solicitado;

testar;

apresentar evidências;

parar.

Não iniciar a fase seguinte automaticamente.

Qualidade

Antes de declarar funcionalidade concluída:

TypeScript deve passar;

lint deve passar;

build deve passar;

Edge Functions devem passar em verificação Deno quando aplicável;

migrations devem ser revisadas;

RLS deve ser revisada;

fluxo funcional deve ser testado;

isolamento multiempresa deve ser testado.

Não considerar concluído apenas porque arquivos ou telas foram criados.

Evidências obrigatórias

Ao finalizar uma fase informar:

arquivos criados;

arquivos alterados;

migrations;

tabelas;

índices;

constraints;

RLS/policies;

RPCs;

Edge Functions;

testes executados;

TypeScript;

lint;

build;

pendências;

riscos;

rollback.

Prioridades

P0:

vazamento entre clínicas;

perda/exposição de dados;

corrupção financeira;

acesso indevido;

segredo exposto.

P1:

jornada central quebrada;

agenda inconsistente;

duplicidade;

histórico incorreto;

protocolo incorreto;

financeiro inconsistente.

P2:

melhorias de UX;

performance;

observabilidade;

manutenção.

Fora do MVP

Não transformar o Estetic360º em:

ERP hospitalar;

sistema contábil;

fiscal completo;

folha de pagamento;

telemedicina;

marketplace;

CRM enterprise;

sistema de diagnóstico;

sistema autônomo de prescrição.

Regra central

Toda decisão deve preservar:

Simplicidade + Segurança + Especialização + Escalabilidade.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/659af765-a064-43f1-aa1f-2dd14ae02ddc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
