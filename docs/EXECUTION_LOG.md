# Execution Log: Refatoração Front-End

## Sessão Atual: 2026-03-21

### Status do Plano
- [x] **Fase 1: Quick Wins & Cleanup**
  - [x] Remover duplicidade `InventoryService` (mantido `core/services`, apagado `features/inventory/data`)
  - [x] Remover rota morta `/clinical-execution`
  - [x] Adicionar links no sidebar para `/procedures` e `/patients` (e renomear `pacientes` -> `patients`, `consultas` -> `appointments` para padronizar idioma inglês)
  - [x] Criar `core/config/domain-constants.ts` e centralizar hardcoded strings em Reception, Admin e Social
- [x] **Fase 2: Decomposição do `DatabaseService`**
  - [x] Criar `AuthStateService` para sessão, auth e roles.
  - [x] Criar `ClinicContextService` para gerenciar o signal do tenant atual (selecionado).
  - [x] Unificar operações de Patients, Appointments e Records no `PatientService`.
  - [x] Transformar `DatabaseService` em facade delegando chamadas (~150 linhas).
- [x] **Fase 3: Remoção do NgRx (Signals Migration) (Parcial)**
  - [x] Módulo `Patient` migrado para Signals e removido o diretório `store/patient`.
  - [x] `PatientStore` transformado em fachada reativa a Signals.
  - [ ] Módulo `Auth` a migrar
  - [ ] Módulo `Inventory` a migrar
- [ ] **Fase 4: Config-driven UI via Supabase**

### Próximos Passos
- Concluir a Fase 3 (remover diretórios NgRx restantes).
- Iniciar a **Fase 4**: Criar tabelas Postgres e integrar UI Config.

### Fase 3 Concluída
- [x] **Fase 3: Remoção do NgRx (Signals Migration)**
  - [x] Refatorado `LoginComponent` para usar `AuthService` em vez do store e disparado o cleanup do módulo `Auth`.
  - [x] Refatorado `InventoryStore` para uma facade magra sobre `DatabaseService` e deletado o módulo `Inventory` do NgRx.
  - [x] Removido NgRx completamente de `main.ts`.
  - [x] Desinstalado `@ngrx/store`, `@ngrx/effects`, e `@ngrx/store-devtools` do `package.json`.
