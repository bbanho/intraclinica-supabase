# Execution Log: Refatoração Front-End

## Sessão Atual: 2026-03-21

### Status do Plano
- [x] **Fase 1: Quick Wins & Cleanup**
  - [x] Remover duplicidade `InventoryService` (mantido `core/services`, apagado `features/inventory/data`)
  - [x] Remover rota morta `/clinical-execution`
  - [x] Adicionar links no sidebar para `/procedures` e `/patients` (e renomear `pacientes` -> `patients`, `consultas` -> `appointments` para padronizar idioma inglês)
  - [x] Criar `core/config/domain-constants.ts` e centralizar hardcoded strings em Reception, Admin e Social
- [ ] **Fase 2: Decomposição do `DatabaseService`**
- [ ] **Fase 3: Remoção do NgRx (Signals Migration)**
- [ ] **Fase 4: Config-driven UI via Supabase**

### Desafios Encontrados & Resoluções
- **Tipagem do InventoryEffects:** O serviço antigo retornava tipos customizados do NgRx (`Product`, `StockTransaction`), enquanto o serviço core retorna os formatos diretos do DB. Resolvido adicionando funções mapeadoras (`toProduct`, `toTransaction`) diretamente no `InventoryEffects` para manter o contrato do NgRx isolado até a Fase 3.
- **Mistura de Idiomas nas Rotas:** Decidimos padronizar as rotas para inglês, mudando `pacientes` para `patients` e `consultas` para `appointments`. Os arquivos lazy-loaded continuam intactos por enquanto.
- **Dependências no Lucide Angular:** O JIT compiler bloqueia compilação parcial. Foi necessário checar os `.d.ts` e `/icons/` para descobrir nomes válidos de ícones (`UserRound`, `ClipboardList`).

### Próximos Passos
- Iniciar a **Fase 2**: decomposição do `DatabaseService` que atualmente possui >700 linhas, movendo contexto para `ClinicContextService` e sessão para `AuthStateService`.
