---
title: "Incidente de Sessão: Cold Boot e Schema Drift"
description: "Relato técnico sobre a perda de estado do agente OpenCode e a fragilidade na tipagem da Clinic ID."
---

# Relato de Incidente: Cold Boot e Fragilidades de Sessão

Este documento registra o incidente ocorrido durante o desenvolvimento, onde a interrupção da sessão do agente resultou em perda de contexto crítico, além da identificação de uma incompatibilidade silenciosa entre as tipagens do frontend e o banco de dados.

## 1. O Problema do "Cold Boot" (Partida a Frio)

Durante a transição ou reinicialização das ferramentas de trabalho do agente (OpenCode), identificamos que o estado volátil não é persistido de forma resiliente.

### Impactos Observados
- **Perda do Banco Local SQLite**: O agente utiliza um banco de dados interno para gerenciar metadados e histórico de execução. Em falhas de sessão, este banco é resetado, eliminando o rastro de decisões anteriores.
- **Evaporação do Planejamento (`todowrite`)**: O progresso rastreado pela ferramenta `todowrite` foi completamente perdido. Sem um backup em disco, o agente perde a noção de quais etapas foram concluídas e quais restam.
- **Custo de Recuperação de Contexto**: A necessidade de re-explorar o repositório (`glob`, `grep`, `read`) para reconstruir o entendimento do projeto consome tempo e tokens desnecessários.

## 2. Descoberta de Schema Drift (Clinic ID)

Durante a depuração de falhas de rede (HTTP 400 Bad Request) em operações de escrita no Supabase, descobrimos uma discrepância crítica na representação da identidade da clínica.

### Cenário Identificado
- **Angular (Frontend)**: O código tratava `clinicId` como uma `string` genérica ou `text` (ex: no armazenamento de tokens ou parâmetros de URL).
- **Postgres (Produção)**: A coluna correspondente no banco de dados está tipada estritamente como `UUID`.

### Consequência
O Supabase rejeitava as requisições que enviavam strings não formatadas como UUIDs válidos ou que tentavam coerção implícita falha, resultando em erros 400 sem mensagens de erro claras na camada de interface, dificultando o diagnóstico inicial.

## 3. Políticas de Mitigação e Boas Práticas

Para evitar a recorrência desses problemas e fortalecer a resiliência do desenvolvimento assistido por IA, estabelecemos as seguintes diretrizes:

### Persistência e Documentação
- **Commits Frequentes**: O estado do trabalho deve ser enviado ao Git o mais rápido possível. Commits pequenos e descritivos servem como checkpoints de realidade.
- **Uso de Wiki Skills**: Avanços significativos, decisões arquiteturais e estados de tarefas complexas devem ser registrados imediatamente via `wiki-page-writer` ou `wiki-architect`.
- **Single Source of Truth (SSoT)**: A documentação no diretório `wiki-site/docs/` e arquivos de especificação em disco são as únicas fontes de verdade permanentes. O estado interno da ferramenta de IA deve ser tratado como efêmero.

### Integridade de Dados
- **Tipagem Estrita (Strong Typing)**: Revisar e sincronizar as interfaces TypeScript/Angular para usar tipos que reflitam exatamente o esquema do banco de dados (ex: usar tipos específicos para UUID em vez de `string`).
- **Validação Antecipada**: Implementar guardas e validadores que verifiquem o formato do `clinicId` antes de despachar chamadas para a `SupabaseService`.

---

**Citações e Referências:**
- Localização do Relato: `wiki-site/docs/raw-reports/session-cold-boot-incident.md`
- Contexto de Identificação: `AGENTS.md` (Diretivas de Multi-tenant e Segurança)
