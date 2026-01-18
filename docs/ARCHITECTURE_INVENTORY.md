# Documentação de Arquitetura Doc7: Módulo de Estoque (Inventory)

**Data:** 17/01/2026
**Responsável:** Bruno (Gemini Agent)
**Padrão:** [Doc7 Architecture Guide](./DOC7_ARCHITECTURE_GUIDE.md)

## 1. Visão Geral (Clean Architecture)
Este módulo segue estritamente os princípios de Clean Architecture definidos para o projeto, separando responsabilidades em três camadas distintas.

- **Data Layer:** `InventoryService` (Isolado, comunicação direta com Supabase).
- **Domain Layer:** `InventoryStore` (NgRx Feature State).
- **Presentation Layer:** `InventoryComponent` (Reactive UI com Signals).

## 2. Camada de Domínio (NgRx Store)

### 2.1. Actions (Action Group)
Utilizamos `createActionGroup` para definir eventos tipados e centralizados.

```typescript
export const InventoryActions = createActionGroup({
  source: 'Inventory Page',
  events: {
    'Enter': emptyProps(),
    'Load Items Success': props<{ items: InventoryItem[] }>(),
    'Load Items Failure': props<{ error: string }>(),
    'Update Stock': props<{ itemId: string, quantity: number }>(),
    'Update Stock Success': props<{ item: InventoryItem }>(),
    'Transaction Created': props<{ transaction: InventoryTransaction }>()
  },
});
```

### 2.2. Effects (Side Effects)
Gerenciamento de efeitos colaterais utilizando `@ngrx/operators` para segurança de fluxo.

```typescript
loadItems$ = createEffect(() =>
  this.actions$.pipe(
    ofType(InventoryActions.enter),
    exhaustMap(() =>
      this.inventoryService.getAll().pipe(
        mapResponse({
          next: (items) => InventoryActions.loadItemsSuccess({ items }),
          error: (error) => InventoryActions.loadItemsFailure({ error: error.message })
        })
      )
    )
  )
);
```

### 2.3. State Model
```typescript
interface InventoryState {
  items: EntityState<InventoryItem>; // Uso de @ngrx/entity para performance
  loading: boolean;
  filters: InventoryFilters;
  error: string | null;
}
```

## 3. Camada de Dados (Service)

O `InventoryService` deve retornar estritamente `Observables` e não deve manter estado.

```typescript
@Injectable({ providedIn: 'root' })
export class InventoryService {
  private supabase = inject(SupabaseClient);

  getAll(): Observable<InventoryItem[]> {
    return from(
      this.supabase.from('inventory_items').select('*')
    ).pipe(map(({ data, error }) => {
      if (error) throw error;
      return data as InventoryItem[];
    }));
  }
}
```

## 4. Contratos de Dados (Supabase)

### Tabela: `inventory_items`
| Coluna | Tipo | RLS Policy |
|--------|------|------------|
| `id` | uuid | Public Read |
| `clinic_id` | uuid | Tenant Isolation (`auth.uid() = clinic_id`) |
| `stock` | int | Public Read, Admin Write |
| `cost_price` | numeric | Role `manager` only |

## 5. Status da Migração (DoD)

### ✅ Entregue
- [x] Implementação de `InventoryActions` e `InventoryReducer`.
- [x] UI reativa consumindo `Store.selectSignal`.

### 🚧 Em Refatoração (Tech Debt)
- [ ] **Transações:** Migrar lógica de `DatabaseService.addTransaction` para `InventoryEffects`.
- [ ] **Otimização:** Implementar `Adapter` do `@ngrx/entity` para gerenciar coleções.
