# Documentação de Arquitetura: Módulo de Estoque (Inventory)

**Data:** 17/01/2026
**Responsável:** Bruno (Gemini Agent)
**Versão:** 1.0.0

## 1. Resumo Executivo
O módulo de Estoque foi o primeiro a ser migrado para o padrão **NgRx Feature State**, visando desacoplar a lógica de estado da UI. Atualmente, ele opera em um modelo híbrido avançado: a leitura e manipulação básica de produtos (CRUD) passam pela Store, mas transações de movimentação (entrada/saída) e controle de acesso ainda dependem do `DatabaseService` legado.

## 2. Entregáveis & DoD

### Entregues
- [x] Criação de `InventoryStore` (Actions, Reducers, Selectors).
- [x] Refatoração de `InventoryComponent` para uso de Signals (`selectSignal`).
- [x] Implementação de UI Reativa com TailwindCSS (Scanner, Abas, Listagem).
- [x] Integração com `CsvImportService` e `GeminiService` (IA).

### Pendências (Tech Debt)
- [ ] **Refatoração de Transações:** Migrar `db.addTransaction()` para uma Action `[Inventory] Add Transaction`.
- [ ] **Centralização de Permissões:** Migrar `db.checkPermission()` para seletores do `AuthStore`.
- [ ] **Testes Unitários:** Cobrir Reducers e Effects (atualmente apenas Componente possui spec básica).

## 3. Arquitetura Técnica

### 3.1 Diagrama de Fluxo de Dados
```mermaid
graph TD
    UI[InventoryComponent] -->|Dispatch| Store[Inventory Store]
    Store -->|Effect| Service[InventoryService]
    Service -->|Supabase Client| DB[(Supabase DB)]
    
    UI -->|Direct Call (Legacy)| Legacy[DatabaseService]
    Legacy -->|Insert Transaction| DB
```

### 3.2 Estrutura do Estado (Store)
```typescript
interface InventoryState {
  products: Product[];
  loading: boolean;
  error: string | null;
  filters: {
    category: string | null;
    onlyLowStock: boolean;
  };
}
```

### 3.3 Integrações Externas
- **Google Gemini:** Análise de risco de estoque baseada nos dados atuais.
- **CSV Service:** Importação em massa com detecção de conflitos.
- **Print Service:** Geração de etiquetas de código de barras.

## 4. Contratos de Dados (Supabase)

### Tabela: `inventory_items`
| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | uuid | Sim | PK, pode ser SKU externo. |
| `clinic_id` | uuid | Sim | FK -> clinics.id |
| `name` | text | Sim | Nome do produto. |
| `stock` | int | Sim | Quantidade atual. |
| `min_stock` | int | Sim | Ponto de pedido. |
| `price` | numeric | Não | Preço de venda. |
| `cost_price` | numeric | Não | Preço de custo (RLS restrito). |

> **Nota RLS:** Políticas de Row Level Security garantem que usuários só vejam itens de sua `clinic_id`. `cost_price` possui policy específica para roles `admin` ou `manager`.

## 5. Riscos e Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Inconsistência de Transação** | Médio | Alto | O uso direto do `DatabaseService` para transações não atualiza o estado local do produto imediatamente, dependendo de re-fetch ou update manual otimista. **Ação:** Migrar para Effect. |
| **Performance de Lista** | Baixo | Médio | Listas > 1000 itens podem travar o DOM. **Ação:** Paginação já implementada no frontend (client-side). Futuro: Server-side pagination. |

## 6. Checklist de Qualidade (QA)

- [ ] **Tipagem:** Não deve haver uso de `any` nos modelos de Produto.
- [ ] **Performance:** O Scanner de código de barras deve responder em < 200ms.
- [ ] **Segurança:** Usuários sem role `inventory.view_cost` recebem `null` no campo de custo (validado via RLS e UI).
- [ ] **UX:** Loading spinners devem aparecer em todas as operações assíncronas.
