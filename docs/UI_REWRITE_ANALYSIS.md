# Análise de Arquitetura: Rewrite da Interface de Usuário (UI)

## Contexto
O frontend atual do IntraClinica (Angular 17+ e Tailwind) apresenta dívidas técnicas severas na camada de apresentação (View). Componentes complexos como Modais, Dropdowns e Overlays foram construídos "do zero" manipulando classes DOM diretamente. 

**Sintomas Atuais:**
- Conflitos de Z-Index e "Stacking Context".
- Elementos `fixed` restritos por divs pais com `overflow-auto` ou animações.
- Componentes monolíticos (ex: `reception.component.ts` misturando lógica de negócios, chamadas de Supabase, e HTML denso de formulários).

## A Falácia do "Rewrite Assustador"
Reescrever um sistema inteiro (Front + Back) é perigoso. No entanto, a arquitetura do IntraClinica é **Backend-as-a-Service (Supabase)**. 
- O Supabase (PostgreSQL, RLS, RPCs) contém 100% da verdade e das regras de negócio (ex: `appointment_conflict_guard`).
- O Frontend é apenas uma "Dumb UI" (Interface burra). 

Nesse paradigma, jogar a UI fora e reescrevê-la com IA é significativamente mais rápido e barato do que debugar e refatorar CSS/HTML estruturalmente falhos.

## Caminhos de Solução (Headless UI)

A filosofia "Headless" ou "Unstyled" separa a lógica de comportamento (acessibilidade, focus trap, portais de renderização fora da árvore DOM) da estilização (Tailwind).

### Opção 1: Modern Angular com Spartan (O caminho seguro)
O mantenedor tem preferência por Angular.
- **Ferramenta:** `spartan/ui` (O equivalente do shadcn/ui para Angular) ou Angular CDK.
- **Vantagem:** Mantém a stack atual (Typescript, Angular Signals, Services). Curva de aprendizado zero para a linguagem. O CDK resolve nativamente todos os bugs de overlay e z-index.
- **Custo com IA:** Médio/Baixo. A IA precisará do Context7 para acessar a documentação recente do Spartan, mas o Angular 17+ já é bem suportado.

### Opção 2: React + Next.js + shadcn/ui (O caminho rápido para IA)
- **Ferramenta:** React, Next.js App Router, Radix UI, shadcn/ui.
- **Vantagem:** É a stack nativa de 90% dos LLMs. A IA consegue gerar telas inteiras, modais e formulários com precisão absoluta, quase sem alucinações, pois o volume de dados de treinamento em React/Tailwind é massivo.
- **Custo com IA:** Baixíssimo (Velocidade máxima de geração).
- **Risco:** O mantenedor precisa se adaptar ao ecossistema React.

## Plano de Ação Recomendado (Experimento Isolado)

1. **Não apagar o legado:** Manter a pasta `frontend` atual operando.
2. **Prova de Conceito (PoC):** Iniciar um repositório paralelo ou pasta `frontend-v2`.
3. **Escopo Mínimo:** Recriar **apenas** o fluxo problemático (Login -> Recepção -> Modal de Agendamento) usando a nova stack Headless escolhida.
4. **Critério de Sucesso:** Se a PoC comprovar que a UI Headless é livre de bugs de CSS, 100% acessível e consome o Supabase sem esforço, inicia-se o estrangulamento da V1. Caso contrário, a V2 é descartada sem impacto no produto em produção.
