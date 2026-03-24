import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { IamService } from './iam.service';
import { SupabaseService } from '../services/supabase.service';
import { AuthService } from '../services/auth.service';
import { ClinicContextService } from '../services/clinic-context.service';
import { IamRole, IamPermission } from '../models/iam.types';
import { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Mock Supabase Client factory
// ---------------------------------------------------------------------------
function createMockSupabaseClient() {
  const mockFrom = vi.fn();
  const mockClient = { from: mockFrom } as unknown as SupabaseClient;
  return { mockClient, mockFrom };
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------
const MOCK_USER_ID = 'user-uuid-123';
const MOCK_CLINIC_ID = 'clinic-uuid-456';

const MOCK_ROLE_DOCTOR: IamRole = {
  id: 'roles/doctor',
  name: 'Médico / Especialista',
  level: 20,
  default_grants: ['clinical.read', 'clinical.write', 'patient.view'],
  description: 'Role for doctors',
};

const MOCK_ROLE_ADMIN: IamRole = {
  id: 'roles/admin',
  name: 'Administrador',
  level: 10,
  default_grants: ['inventory.read', 'inventory.write', 'reception.read'],
  description: 'Role for admins',
};

const MOCK_PERMISSIONS: IamPermission[] = [
  { id: 'clinical.read', module: 'clinical', name: 'Ver atendimentos', description: '' },
  { id: 'clinical.write', module: 'clinical', name: 'Editar atendimentos', description: '' },
  { id: 'patient.view', module: 'patient', name: 'Ver pacientes', description: '' },
  { id: 'inventory.read', module: 'inventory', name: 'Ver inventário', description: '' },
  { id: 'inventory.write', module: 'inventory', name: 'Editar inventário', description: '' },
  { id: 'reception.read', module: 'reception', name: 'Ver recepção', description: '' },
];

// User bindings that grant doctor role at clinic level
const MOCK_BINDINGS_DOCTOR_CLINIC = {
  [MOCK_CLINIC_ID]: {
    roles: ['roles/doctor'],
    grants: [],
    blocks: [],
  },
};

// User bindings with explicit grant at clinic level
const MOCK_BINDINGS_EXPLICIT_GRANT = {
  [MOCK_CLINIC_ID]: {
    roles: [],
    grants: ['clinical.write'],
    blocks: [],
  },
};

// User bindings with explicit block at clinic level
const MOCK_BINDINGS_EXPLICIT_BLOCK = {
  [MOCK_CLINIC_ID]: {
    roles: ['roles/doctor'],
    grants: [],
    blocks: ['clinical.read'],
  },
};

// User bindings with global role
const MOCK_BINDINGS_GLOBAL = {
  global: {
    roles: ['roles/doctor'],
    grants: [],
    blocks: [],
  },
};

// Empty bindings (no access)
const MOCK_BINDINGS_EMPTY = {};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('IamService', () => {
  let service: IamService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let mockSupabaseService: Partial<SupabaseService>;
  let mockClinicContext: { selectedClinicId: ReturnType<typeof vi.fn> };
  let mockAuthService: { currentUser: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockClient = createMockSupabaseClient();

    mockSupabaseService = {
      clientInstance: mockClient.mockClient,
    };

    mockClinicContext = {
      selectedClinicId: vi.fn().mockReturnValue(MOCK_CLINIC_ID),
    };

    mockAuthService = {
      currentUser: vi.fn().mockReturnValue(null),
    };

    await TestBed.configureTestingModule({
      providers: [
        IamService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ClinicContextService, useValue: mockClinicContext },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    service = TestBed.inject(IamService);
  });

  // -------------------------------------------------------------------------
  // isInitialized signal
  // -------------------------------------------------------------------------
  describe('isInitialized signal', () => {
    it('should start as false when no user is authenticated', () => {
      expect(service.isInitialized()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // can() — Permission via Role
  // -------------------------------------------------------------------------
  describe('can() — Role-based permission', () => {
    it('should return true when user has permission via Role (local clinic)', async () => {
      mockAuthService.currentUser.mockReturnValue({ id: MOCK_USER_ID } as any);

      // Mock the three sequential .from() calls: iam_roles, iam_permissions, app_user
      let callIndex = 0;
      mockClient.mockFrom.mockImplementation((table: string) => {
        callIndex++;
        const query = {
          select: vi.fn().mockResolvedValue({
            data: table === 'iam_roles'
              ? [MOCK_ROLE_DOCTOR]
              : table === 'iam_permissions'
              ? MOCK_PERMISSIONS
              : { iam_bindings: MOCK_BINDINGS_DOCTOR_CLINIC },
            error: null,
          }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { iam_bindings: MOCK_BINDINGS_DOCTOR_CLINIC },
            error: null,
          }),
        };
        return query;
      });

      // Wait for the effect + async cache init
      await vi.waitFor(() => expect(service.isInitialized()).toBe(true), { timeout: 1000 });

      expect(service.can('clinical.read')).toBe(true);
    });

    it('should return true when user has permission via Role (global context)', async () => {
      mockAuthService.currentUser.mockReturnValue({ id: MOCK_USER_ID } as any);

      mockClient.mockFrom.mockImplementation((table: string) => {
        const query = {
          select: vi.fn().mockResolvedValue({
            data: table === 'iam_roles'
              ? [MOCK_ROLE_DOCTOR]
              : table === 'iam_permissions'
              ? MOCK_PERMISSIONS
              : null,
            error: null,
          }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { iam_bindings: MOCK_BINDINGS_GLOBAL },
            error: null,
          }),
        };
        return query;
      });

      await vi.waitFor(() => expect(service.isInitialized()).toBe(true), { timeout: 1000 });

      // Set clinic context to null so it falls back to global
      mockClinicContext.selectedClinicId.mockReturnValue(null);

      expect(service.can('clinical.read')).toBe(true);
    });

    it('should return false when permission not in any role and no explicit grant', async () => {
      mockAuthService.currentUser.mockReturnValue({ id: MOCK_USER_ID } as any);

      mockClient.mockFrom.mockImplementation((table: string) => {
        const query = {
          select: vi.fn().mockResolvedValue({
            data: table === 'iam_roles'
              ? [MOCK_ROLE_DOCTOR]
              : table === 'iam_permissions'
              ? MOCK_PERMISSIONS
              : null,
            error: null,
          }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { iam_bindings: MOCK_BINDINGS_DOCTOR_CLINIC },
            error: null,
          }),
        };
        return query;
      });

      await vi.waitFor(() => expect(service.isInitialized()).toBe(true), { timeout: 1000 });

      // Doctor role does not include inventory.read
      expect(service.can('inventory.read')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // can() — Explicit Block
  // -------------------------------------------------------------------------
  describe('can() — Explicit Block takes precedence', () => {
    it('should return false when user has Block on permission (local clinic)', async () => {
      mockAuthService.currentUser.mockReturnValue({ id: MOCK_USER_ID } as any);

      mockClient.mockFrom.mockImplementation((table: string) => {
        const query = {
          select: vi.fn().mockResolvedValue({
            data: table === 'iam_roles'
              ? [MOCK_ROLE_DOCTOR]
              : table === 'iam_permissions'
              ? MOCK_PERMISSIONS
              : null,
            error: null,
          }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { iam_bindings: MOCK_BINDINGS_EXPLICIT_BLOCK },
            error: null,
          }),
        };
        return query;
      });

      await vi.waitFor(() => expect(service.isInitialized()).toBe(true), { timeout: 1000 });

      // Even though doctor role grants clinical.read, the block overrides it
      expect(service.can('clinical.read')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // can() — Explicit Grant
  // -------------------------------------------------------------------------
  describe('can() — Explicit Grant', () => {
    it('should return true when user has explicit Grant (local clinic)', async () => {
      mockAuthService.currentUser.mockReturnValue({ id: MOCK_USER_ID } as any);

      mockClient.mockFrom.mockImplementation((table: string) => {
        const query = {
          select: vi.fn().mockResolvedValue({
            data: table === 'iam_roles'
              ? []
              : table === 'iam_permissions'
              ? MOCK_PERMISSIONS
              : null,
            error: null,
          }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { iam_bindings: MOCK_BINDINGS_EXPLICIT_GRANT },
            error: null,
          }),
        };
        return query;
      });

      await vi.waitFor(() => expect(service.isInitialized()).toBe(true), { timeout: 1000 });

      expect(service.can('clinical.write')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // can() — Not initialized
  // -------------------------------------------------------------------------
  describe('can() — Not initialized', () => {
    it('should return false when service is not initialized (no user)', () => {
      mockAuthService.currentUser.mockReturnValue(null);
      expect(service.can('clinical.read')).toBe(false);
    });

    it('should return false when userBindings are null', async () => {
      mockAuthService.currentUser.mockReturnValue({ id: MOCK_USER_ID } as any);

      mockClient.mockFrom.mockImplementation((table: string) => {
        const query = {
          select: vi.fn().mockResolvedValue({ data: null, error: null }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
        return query;
      });

      // Wait for init to complete with null bindings
      await vi.waitFor(() => expect(service.isInitialized()).toBe(true), { timeout: 1000 });

      expect(service.can('clinical.read')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // _userBindings signal updates on auth changes
  // -------------------------------------------------------------------------
  describe('_userBindings updates on auth changes', () => {
    it('should set userBindings to null when user logs out', async () => {
      mockAuthService.currentUser.mockReturnValue({ id: MOCK_USER_ID } as any);

      mockClient.mockFrom.mockImplementation((table: string) => {
        const query = {
          select: vi.fn().mockResolvedValue({
            data: table === 'iam_roles'
              ? [MOCK_ROLE_DOCTOR]
              : table === 'iam_permissions'
              ? MOCK_PERMISSIONS
              : null,
            error: null,
          }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { iam_bindings: MOCK_BINDINGS_DOCTOR_CLINIC },
            error: null,
          }),
        };
        return query;
      });

      await vi.waitFor(() => expect(service.isInitialized()).toBe(true), { timeout: 1000 });
      expect(service.userBindings()).not.toBeNull();

      // Simulate logout: currentUser becomes null
      // The effect in IamService constructor watches auth.currentUser()
      // Since we can't easily trigger the effect from outside, we verify
      // that when currentUser returns null, userBindings becomes null
      mockAuthService.currentUser.mockReturnValue(null);

      // The effect is tracked via auth.currentUser() — verify bindings are null
      expect(service.userBindings()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getAllRoles() / getAllPermissions()
  // -------------------------------------------------------------------------
  describe('getAllRoles() and getAllPermissions()', () => {
    it('should return all loaded roles', async () => {
      mockAuthService.currentUser.mockReturnValue({ id: MOCK_USER_ID } as any);

      mockClient.mockFrom.mockImplementation((table: string) => {
        const query = {
          select: vi.fn().mockResolvedValue({
            data: table === 'iam_roles'
              ? [MOCK_ROLE_DOCTOR, MOCK_ROLE_ADMIN]
              : table === 'iam_permissions'
              ? MOCK_PERMISSIONS
              : null,
            error: null,
          }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { iam_bindings: MOCK_BINDINGS_DOCTOR_CLINIC },
            error: null,
          }),
        };
        return query;
      });

      await vi.waitFor(() => expect(service.isInitialized()).toBe(true), { timeout: 1000 });

      const roles = service.getAllRoles();
      expect(roles).toHaveLength(2);
      expect(roles.map(r => r.id)).toContain('roles/doctor');
      expect(roles.map(r => r.id)).toContain('roles/admin');
    });

    it('should return all loaded permissions', async () => {
      mockAuthService.currentUser.mockReturnValue({ id: MOCK_USER_ID } as any);

      mockClient.mockFrom.mockImplementation((table: string) => {
        const query = {
          select: vi.fn().mockResolvedValue({
            data: table === 'iam_roles'
              ? [MOCK_ROLE_DOCTOR]
              : table === 'iam_permissions'
              ? MOCK_PERMISSIONS
              : null,
            error: null,
          }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { iam_bindings: MOCK_BINDINGS_DOCTOR_CLINIC },
            error: null,
          }),
        };
        return query;
      });

      await vi.waitFor(() => expect(service.isInitialized()).toBe(true), { timeout: 1000 });

      const perms = service.getAllPermissions();
      expect(perms).toHaveLength(MOCK_PERMISSIONS.length);
    });
  });
});
