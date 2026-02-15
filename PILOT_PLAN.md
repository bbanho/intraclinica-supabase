# 🏥 Plano de Voo: IntraClinica "Gold Standard" v2.0

Este documento é a bússola para a transformação dos Stubs em realidade técnica e soberana no repositório `intraclinica-supabase`.

## 🎯 Objetivos Centrais
1.  **Morte aos Stubs:** Substituir todos os `console.log` por chamadas reais via Supabase SDK.
2.  **Fidelidade ao Schema Actor:** Garantir que todos os serviços respeitem a herança `Actor -> (User | Patient)`.
3.  **Build Verde Permanente:** Manter o projeto compilável a cada commit (DevOps estrito).
4.  **Soberania de Dados:** Validar que o RLS (Row Level Security) está isolando as clínicas corretamente.

---

## 🏗️ Arquitetura de Código (Decisões)

### 1. Camada de Serviço (The Muscles)
*   **Padrão:** Services isolados em `core/services/`.
*   **Responsabilidade:** Tradução de `snake_case` (DB) para `camelCase` (UI) e orquestração de joins manuais para o padrão Actor.
*   **Exemplo:** `PatientService` busca dados de `patient` + `actor`.

### 2. Camada de Estado (The Brain)
*   **Padrão:** NgRx Store (Feature-based).
*   **Fluxo:** `Component -> Action -> Effect -> Service -> Reducer -> Signal`.

---

## 📝 Backlog de Implementação (TODO)

### Fase 1: Saneamento e Core (ATUAL)
- [x] Refatorar `types.ts` com hierarquia `Actor`.
- [x] Criar `rpc` helper no `SupabaseService`.
- [x] Implementar `PatientService` com JOIN manual em `Actor`.
- [x] Implementar `saveUser` real (Criação de Auth + Actor + User).
- [ ] Implementar `addClinic` e `deleteClinic`.

### Fase 2: Operação Clínica
- [ ] Migrar `ClinicalRecord` (Evoluções médicas) para escrita real.
- [ ] Migrar `Appointment` (Agendamentos) para escrita real.
- [ ] Implementar troca de status de agendamento (Aguardando -> Em Atendimento).

### Fase 3: Inteligência e Marketing
- [ ] Conectar `GeminiService` e `LocalAiService` aos botões de "Padronizar Documento".
- [ ] Ativar persistência real de `SocialPost` em `social_post`.

---

## 🧪 Plano de Testes
1.  **Integridade de Ator:** Ao criar um paciente, verificar se um ID correspondente foi gerado na tabela `actor`.
2.  **Build Check:** Rodar `ng build` após cada implementação de módulo.
3.  **Multi-tenancy:** Logar com usuário da Clínica A e garantir que não consegue ver pacientes da Clínica B via URL direta.

---

## 🛠️ Comando de Verificação Permanente
```bash
# Rodar na pasta frontend/
ng build --configuration=production && echo "BUILD_GREEN"
```
