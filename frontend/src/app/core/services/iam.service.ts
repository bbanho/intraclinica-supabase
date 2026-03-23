import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { ClinicContextService } from './clinic-context.service';
import { IamRole, IamPermission, UserIamBindings, IamBindingContext } from '../models/iam.types';

@Injectable({
  providedIn: 'root'
})
export class IamService {
  private db = inject(SupabaseService).clientInstance;
  private auth = inject(AuthService);
  private clinicCtx = inject(ClinicContextService);

  // Dicionário Estático em Cache
  private _roles = signal<Map<string, IamRole>>(new Map());
  private _permissions = signal<Map<string, IamPermission>>(new Map());
  
  // O Estado de Segurança do Usuário Atual (JSONB Binding Matrix)
  private _userBindings = signal<UserIamBindings | null>(null);
  public userBindings = this._userBindings.asReadonly();
  
  // Status de carregamento do dicionário e permissões
  public isInitialized = signal<boolean>(false);

  constructor() {
    // Escuta mudanças de autenticação: quando loga, puxa o IAM. Quando desloga, limpa tudo.
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.initializeIamCache(user.id);
      } else {
        this._userBindings.set(null);
        this.isInitialized.set(false);
      }
    });
  }

  /**
   * Baixa as Tabelas de IAM e as Permissões do Usuário atual (Apenas uma vez)
   */
  private async initializeIamCache(userId: string) {
    try {
      // Usamos Promise.all para buscar os 3 dicionários vitalícios em paralelo
      const [rolesRes, permsRes, userRes] = await Promise.all([
        this.db.from('iam_roles').select('*'),
        this.db.from('iam_permissions').select('*'),
        this.db.from('app_user').select('iam_bindings').eq('id', userId).single()
      ]);

      if (rolesRes.data) {
        const roleMap = new Map<string, IamRole>();
        rolesRes.data.forEach((r: IamRole) => roleMap.set(r.id, r));
        this._roles.set(roleMap);
      }

      if (permsRes.data) {
        const permMap = new Map<string, IamPermission>();
        permsRes.data.forEach((p: IamPermission) => permMap.set(p.id, p));
        this._permissions.set(permMap);
      }

      if (userRes.data?.iam_bindings) {
        this._userBindings.set(userRes.data.iam_bindings as UserIamBindings);
      } else {
        this._userBindings.set({}); // Usuário sem nenhum acesso
      }

      this.isInitialized.set(true);
    } catch (err) {
      console.error('[IAM Engine] Falha ao carregar matriz de segurança', err);
      this.isInitialized.set(false);
    }
  }

  /**
   * O Motor de Validação Core (Padrão GCP).
   * Resolve a permissão em milissegundos localmente usando a Árvore de Bindings:
   * 1. Block Local explícito? -> NEGA
   * 2. Grant Local explícito? -> PERMITE
   * 3. A Role local contém o grant? -> PERMITE
   * 4. [Fallback para Escopo Global]
   */
  public can(permissionKey: string): boolean {
    if (!this.isInitialized()) return false;
    
    const bindings = this._userBindings();
    if (!bindings) return false;

    const currentClinicId = this.clinicCtx.selectedClinicId();

    // 1. Avalia o contexto local (Clínica)
    if (currentClinicId && currentClinicId !== 'all' && bindings[currentClinicId]) {
      const localResult = this.evaluateContextPermissions(bindings[currentClinicId], permissionKey);
      if (localResult !== null) return localResult;
    }

    // 2. Fallback para o contexto Global (SaaS)
    const globalResult = this.evaluateContextPermissions(bindings.global, permissionKey);
    if (globalResult !== null) return globalResult;

    // Default: Deny
    return false;
  }

  /**
   * Helper privado para evitar duplicação entre contexto local e global (Dica do Code Review)
   */
  private evaluateContextPermissions(context: IamBindingContext | undefined, permissionKey: string): boolean | null {
    if (!context) return null;

    // 1. Cherry-picked Block (Absolute Deny)
    if (context.blocks?.includes(permissionKey)) return false;

    // 2. Cherry-picked Grant (Permit)
    if (context.grants?.includes(permissionKey)) return true;

    // 3. Resolve Pacote de Roles
    if (context.roles && context.roles.length > 0) {
      for (const roleId of context.roles) {
        const roleDef = this._roles().get(roleId);
        if (roleDef && roleDef.default_grants.includes(permissionKey)) {
          return true;
        }
      }
    }

    return null;
  }

  /**
   * Helper para expor o dicionário de papéis disponíveis no UI (ex: Select Box de "Nova Função")
   */
  public getAllRoles(): IamRole[] {
    return Array.from(this._roles().values());
  }

  /**
   * Helper para expor todas as permissões atômicas fatiadas por Módulo (ex: Modal de "Grants")
   */
  public getAllPermissions(): IamPermission[] {
    return Array.from(this._permissions().values());
  }
}