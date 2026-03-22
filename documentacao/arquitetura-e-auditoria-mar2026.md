# IntraClinica — Complete Codebase Audit (Mar 2026)

## DATABASE SCHEMA (from migrations)
**Tables (canonical state after all migrations applied)**

* **clinic**: id UUID PK, name, email, plan, status, created_at
* **actor**: universal identity node — id UUID PK, clinic_id, name, type (patient|user|clinic|system), created_at
* **app_user**: auth identity (1:1 with auth.users) — id UUID PK, actor_id, email, role, iam_bindings JSONB, assigned_room
* **patient**: id UUID PK (= actor.id), clinic_id, cpf, birth_date, gender
* **appointment**: id UUID PK, clinic_id, patient_id, patient_name, doctor_actor_id, appointment_date, status, room_number, priority, timestamp
* **clinical_record**: id UUID PK, clinic_id, patient_id, doctor_actor_id, content, type (EVOLUCAO|RECEITA|ATESTADO|EXAME), timestamp
* **product**: id UUID PK, clinic_id, name, description, unit, current_stock, min_stock, avg_cost_price, price, barcode, category, deleted
* **stock_transaction**: id UUID PK, clinic_id, product_id, type (IN|OUT), total_qty, reason, record_id, actor_id, notes, timestamp. *Trigger syncs product.current_stock*.
* **procedure_type**: id UUID PK, clinic_id, name, code, price, active, created_at
* **procedure_recipe**: id UUID PK, procedure_type_id, item_id, quantity, created_at
* **social_post**: id UUID PK, clinic_id, title, content, platform, status, image_url, scheduled_at, created_at
* **access_request**: id UUID PK, clinic_id, clinic_name, reason, status, requested_role_id, requester_user_id, created_at
* **ui_module**: id UUID PK, key UNIQUE, label, icon, route, description, created_at
* **clinic_module**: id UUID PK, clinic_id, module_key, enabled, sort_order
* **clinic_config**: id UUID PK, clinic_id, key, value JSONB

## CORE SERVICES
* **SupabaseService**: Wrapper around @supabase/supabase-js.
* **AuthService**: `login`, `logout`
* **AuthStateService**: `currentUser`, `initSession`, `loadUserProfile`, `checkPermission`
* **ClinicContextService**: `selectedClinic`, `clinicId()`
* **PatientService**: Auto-syncs patients, appointments, clinicalRecords. Handles transitions and creations via RPCs.
* **PatientStore**: Facade over PatientService. Exposes computed signals + loading/error states.
* **InventoryService**: Promise-based CRUD for inventory, movements, procedure types, and recipes.
* **InventoryStore**: Exposes products and transactions signals from DatabaseService.
* **DatabaseService**: Central facade aggregating sub-services. Handles `syncDataForClinic` (fetches app_user, clinic, social_post, access_request, products, transactions).
* **UiConfigService**: Manages `ui_module` and `clinic_module` configuration.
* **GeminiService**: Wraps @google/genai for AI operations.
* **LocalAiService**: Wraps WebLLM for local in-browser AI.

## COMPONENT ANALYSIS SUMMARY
* **ReceptionComponent**: Fila em tempo real, botões de status (Agendado -> Aguardando). Usa IAM incorreto (`reception.read`).
* **AppointmentsListComponent**: STUB vazio.
* **PatientsListComponent**: Lista pacientes, mas busca não funciona.
* **ClinicalComponent**: Prontuário IA. Lê do `patientStore.appointments` e `patientStore.records`. "Histórico Recente" mostra todos os registros da clínica, não filtra por paciente.
* **ClinicalExecutionComponent**: Executa procedimentos. Não é reativo ao store de pacientes.
* **InventoryComponent**: Estoque. Problema de dupla fonte da verdade (signal local vs InventoryStore). Código de barras quebrado.
* **ReportsComponent**: Dashboard. `todayAppointmentsCount` conta tudo, não filtra por hoje.
* **SocialComponent**: Posts sociais IA. Sem geração real de imagem e sem seletor de rede.
* **AdminPanelComponent**: Configurações SaaS e controle de IAM (Role based).

## ROADMAP DE REFATORAÇÃO (Próximos Passos)
1. Consolidar `AppointmentsListComponent` dentro de `ReceptionComponent` usando um sistema de ABAS (Fila / Agenda semanal).
2. Garantir que a Agenda consiga criar consultas que alimentem a fila (status 'Aguardando').
3. Refatorar `ClinicalComponent` para carregar dados corretos do paciente ativo na consulta.
