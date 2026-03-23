/**
 * Definições de Tipos para o Motor IAM (Identity and Access Management)
 * O sistema utiliza o padrão Cloud Console: 1. Role Base -> 2. Grant (Cherry-pick) -> 3. Block
 */

/**
 * Representa uma Permissão Atômica do sistema (ex: 'inventory.view_cost').
 * As permissões reais são cadastradas na tabela \`iam_permissions\` do Supabase.
 */
export interface IamPermission {
  id: string;          // A chave única da permissão. Ex: 'clinical.write'
  module: string;      // Agrupador lógico. Ex: 'clinical', 'inventory'
  name: string;        // Nome amigável. Ex: 'Atendimento Clínico'
  description: string; // Detalhamento.
}

/**
 * Representa um Pacote de Permissões padrão.
 * Cadastrado na tabela \`iam_roles\` do Supabase.
 */
export interface IamRole {
  id: string;                 // A chave única do pacote. Ex: 'roles/doctor'
  name: string;               // Nome amigável. Ex: 'Médico / Especialista'
  level: number;              // O Peso hierárquico (0=Super, 10=Admin, 20=Doctor). Usado para impedir escalada de privilégios.
  default_grants: string[];   // Lista de IamPermission.id que este pacote contém de fábrica.
  description: string;
}

/**
 * O objeto JSONB armazenado na tabela \`app_user.iam_bindings\`.
 * Representa o vínculo entre a Identidade e os Acessos, fatiados por Contexto (SaaS Global ou ID da Clínica).
 */
export interface IamBindingContext {
  roles?: string[];  // Lista de IamRole.id (Pacotes base)
  grants?: string[]; // Lista de IamPermission.id concedidos excepcionalmente (Cherry-pick Permit)
  blocks?: string[]; // Lista de IamPermission.id bloqueados excepcionalmente (Cherry-pick Deny - Precedência Absoluta)
}

export interface UserIamBindings {
  global?: IamBindingContext;             // Acessos que valem para todo o SaaS
  [clinicId: string]: IamBindingContext | undefined; // Acessos restritos a um Tenant específico
}
