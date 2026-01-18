# Guia de Arquitetura e Documentação Doc7 - Intraclinica

Este documento estabelece os padrões técnicos para a migração da arquitetura para **NgRx + Supabase + Clean Architecture**, baseado nas melhores práticas do Doc7.

## 1. Princípios de Clean Architecture
- **Camada de Dados (Data):** Serviços isolados (ex: `InventoryService`) que se comunicam com o Supabase. Eles não guardam estado, apenas retornam Observables.
- **Camada de Domínio (Store):** Gerenciamento de estado reativo com NgRx.
  - **Actions:** Eventos únicos que descrevem "o que aconteceu".
  - **Reducers:** Funções puras que transformam o estado baseado nas ações.
  - **Effects:** Gerenciamento de efeitos colaterais (chamadas de API, logs).
- **Camada de Apresentação (UI):** Componentes Angular que usam `Store` para selecionar dados e disparar ações.

## 2. Padrão NgRx (Exemplos Práticos)

### 2.1. Actions (Action Groups)
Sempre utilize `createActionGroup` para agrupar ações relacionadas a uma feature.

```typescript
export const InventoryActions = createActionGroup({
  source: 'Inventory API',
  events: {
    'Load Items': emptyProps(),
    'Load Items Success': props<{ items: InventoryItem[] }>(),
    'Load Items Failure': props<{ error: string }>(),
    'Add Item': props<{ item: Partial<InventoryItem> }>(),
  },
});
```

### 2.2. Effects com `tapResponse`
Utilize `tapResponse` do `@ngrx/operators` para garantir o tratamento correto de sucesso e erro.

```typescript
loadItems$ = createEffect(() =>
  this.actions$.pipe(
    ofType(InventoryActions.loadItems),
    exhaustMap(() =>
      this.inventoryService.getAll().pipe(
        map((items) => InventoryActions.loadItemsSuccess({ items })),
        catchError((error) => of(InventoryActions.loadItemsFailure({ error: error.message })))
      )
    )
  )
);
```

## 3. Integração Supabase
- Use o `SupabaseService` global apenas para autenticação e configurações básicas.
- Crie serviços específicos por feature para operações de CRUD.
- Implemente RLS (Row Level Security) diretamente no banco de dados.

## 4. Checklist de Qualidade
- [ ] Actions seguem o padrão `[Source] Event`.
- [ ] Effects usam `exhaustMap` para queries e `concatMap` para mutações.
- [ ] Componentes não injetam `HttpClient` ou serviços de dados diretamente (usam a Store).
- [ ] Tipagem rigorosa: evite `any` e use interfaces do `core/models`.

## 5. Próximos Passos
Consultar o [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) para verificar os módulos pendentes.
