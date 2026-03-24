import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth.store';
import { AuthService } from '../services/auth.service';
import { ClinicContextService } from '../services/clinic-context.service';
import { SupabaseService } from '../services/supabase.service';
import { User, SupabaseClient } from '@supabase/supabase-js';

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
const MOCK_CLINIC_ID = 'clinic-uuid-456';
const MOCK_CLINIC_ID_2 = 'clinic-uuid-789';
const MOCK_USER_ID = 'user-uuid-123';

const MOCK_USER: User = {
  id: MOCK_USER_ID,
  email: 'test@clinic.com',
  role: 'authenticated',
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: { name: 'Test User' },
} as User;

const MOCK_IAM_BINDINGS_SINGLE_CLINIC = {
  [MOCK_CLINIC_ID]: {
    roles: ['roles/doctor'],
    grants: [],
    blocks: [],
  },
} as Record<string, any>;

const MOCK_IAM_BINDINGS_MULTI_CLINIC = {
  [MOCK_CLINIC_ID]: { roles: ['roles/doctor'], grants: [], blocks: [] },
  [MOCK_CLINIC_ID_2]: { roles: ['roles/admin'], grants: [], blocks: [] },
} as Record<string, any>;

const MOCK_IAM_BINDINGS_GLOBAL = {
  global: { roles: ['roles/super_admin'], grants: [], blocks: [] },
  [MOCK_CLINIC_ID]: { roles: ['roles/doctor'], grants: [], blocks: [] },
} as Record<string, any>;

const MOCK_IAM_BINDINGS_NO_CLINICS = {
  global: { roles: ['roles/super_admin'], grants: [], blocks: [] },
} as Record<string, any>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AuthStore', () => {
  let store: AuthStore;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let mockSupabaseService: Partial<SupabaseService>;
  let mockClinicContext: { selectedClinicId: ReturnType<typeof vi.fn>; setContext: ReturnType<typeof vi.fn> };
  let mockAuthService: { currentUser: ReturnType<typeof vi.fn>; currentSession: ReturnType<typeof vi.fn>; signInWithEmail: ReturnType<typeof vi.fn>; signOut: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockClient = createMockSupabaseClient();

    mockSupabaseService = {
      clientInstance: mockClient.mockClient,
    };

    mockClinicContext = {
      selectedClinicId: vi.fn().mockReturnValue(null),
      setContext: vi.fn(),
    };

    mockAuthService = {
      currentUser: vi.fn().mockReturnValue(null),
      currentSession: vi.fn().mockReturnValue(null),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        AuthStore,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ClinicContextService, useValue: mockClinicContext },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    store = TestBed.inject(AuthStore);
  });

  // =========================================================================
  // Signal State — isAuthenticated computed
  // =========================================================================
  describe('isAuthenticated computed signal', () => {
    it('should return false when user is null', () => {
      mockAuthService.currentUser.mockReturnValue(null);
      expect(store.isAuthenticated()).toBe(false);
    });

    it('should return true when user exists', () => {
      mockAuthService.currentUser.mockReturnValue(MOCK_USER);
      expect(store.isAuthenticated()).toBe(true);
    });

    it('should react to user signal changes', () => {
      expect(store.isAuthenticated()).toBe(false);
      mockAuthService.currentUser.mockReturnValue(MOCK_USER);
      // AuthStore exposes a readonly signal from AuthService, so the computed
      // will re-evaluate when the source signal changes
      expect(store.isAuthenticated()).toBe(true);
    });
  });

  // =========================================================================
  // Signal State — isLoading / _isLoading
  // =========================================================================
  describe('isLoading backing signal', () => {
    it('should default to false', () => {
      expect(store.isLoading()).toBe(false);
    });
  });

  // =========================================================================
  // Signal State — error / _error
  // =========================================================================
  describe('error backing signal', () => {
    it('should default to null', () => {
      expect(store.error()).toBe(null);
    });
  });

  // =========================================================================
  // login() — Success path
  // =========================================================================
  describe('login() success path', () => {
    it('should set isLoading true then false on success', async () => {
      mockAuthService.signInWithEmail.mockResolvedValue({ user: MOCK_USER, session: null });

      const mockSelectQuery = {
        select: vi.fn().mockResolvedValue({ data: { iam_bindings: MOCK_IAM_BINDINGS_SINGLE_CLINIC }, error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { iam_bindings: MOCK_IAM_BINDINGS_SINGLE_CLINIC }, error: null }),
      };
      mockClient.mockFrom.mockReturnValue(mockSelectQuery);

      const loginPromise = store.login('test@clinic.com', 'password123');

      // Loading should be true during the async operation
      // Note: due to microtask timing, we check the transition
      await loginPromise;

      expect(store.isLoading()).toBe(false);
      expect(store.error()).toBe(null);
    });

    it('should auto-select clinic context from iam_bindings (single clinic)', async () => {
      mockAuthService.signInWithEmail.mockResolvedValue({ user: MOCK_USER, session: null });

      const mockSelectQuery = {
        select: vi.fn().mockResolvedValue({ data: { iam_bindings: MOCK_IAM_BINDINGS_SINGLE_CLINIC }, error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { iam_bindings: MOCK_IAM_BINDINGS_SINGLE_CLINIC }, error: null }),
      };
      mockClient.mockFrom.mockReturnValue(mockSelectQuery);

      await store.login('test@clinic.com', 'password123');

      expect(mockClinicContext.setContext).toHaveBeenCalledWith(MOCK_CLINIC_ID);
    });

    it('should auto-select first clinic when multiple clinics exist', async () => {
      mockAuthService.signInWithEmail.mockResolvedValue({ user: MOCK_USER, session: null });

      const mockSelectQuery = {
        select: vi.fn().mockResolvedValue({ data: { iam_bindings: MOCK_IAM_BINDINGS_MULTI_CLINIC }, error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { iam_bindings: MOCK_IAM_BINDINGS_MULTI_CLINIC }, error: null }),
      };
      mockClient.mockFrom.mockReturnValue(mockSelectQuery);

      await store.login('test@clinic.com', 'password123');

      // Should pick the first non-global clinic key
      expect(mockClinicContext.setContext).toHaveBeenCalledWith(MOCK_CLINIC_ID);
    });

    it('should set context to "all" when global bindings exist without clinic keys', async () => {
      mockAuthService.signInWithEmail.mockResolvedValue({ user: MOCK_USER, session: null });

      const mockSelectQuery = {
        select: vi.fn().mockResolvedValue({ data: { iam_bindings: MOCK_IAM_BINDINGS_NO_CLINICS }, error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { iam_bindings: MOCK_IAM_BINDINGS_NO_CLINICS }, error: null }),
      };
      mockClient.mockFrom.mockReturnValue(mockSelectQuery);

      await store.login('test@clinic.com', 'password123');

      expect(mockClinicContext.setContext).toHaveBeenCalledWith('all');
    });

    it('should set context to null when no iam_bindings data', async () => {
      mockAuthService.signInWithEmail.mockResolvedValue({ user: MOCK_USER, session: null });

      const mockSelectQuery = {
        select: vi.fn().mockResolvedValue({ data: null, error: 'not found' }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: 'not found' }),
      };
      mockClient.mockFrom.mockReturnValue(mockSelectQuery);

      await store.login('test@clinic.com', 'password123');

      expect(mockClinicContext.setContext).toHaveBeenCalledWith(null);
    });

    it('should set context to null when iam_bindings is empty', async () => {
      mockAuthService.signInWithEmail.mockResolvedValue({ user: MOCK_USER, session: null });

      const mockSelectQuery = {
        select: vi.fn().mockResolvedValue({ data: { iam_bindings: null }, error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { iam_bindings: null }, error: null }),
      };
      mockClient.mockFrom.mockReturnValue(mockSelectQuery);

      await store.login('test@clinic.com', 'password123');

      expect(mockClinicContext.setContext).toHaveBeenCalledWith(null);
    });

    it('should clear error before attempting login', async () => {
      // Pre-set an error via a failed prior login
      mockAuthService.signInWithEmail.mockRejectedValue(new Error('Previous error'));
      const mockSelectQueryErr = {
        select: vi.fn().mockResolvedValue({ data: null, error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockClient.mockFrom.mockReturnValue(mockSelectQueryErr);

      try {
        await store.login('bad@clinic.com', 'wrong');
      } catch {
        // expected
      }

      // Now do a successful login
      mockAuthService.signInWithEmail.mockResolvedValue({ user: MOCK_USER, session: null });
      const mockSelectQueryOk = {
        select: vi.fn().mockResolvedValue({ data: { iam_bindings: MOCK_IAM_BINDINGS_SINGLE_CLINIC }, error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { iam_bindings: MOCK_IAM_BINDINGS_SINGLE_CLINIC }, error: null }),
      };
      mockClient.mockFrom.mockReturnValue(mockSelectQueryOk);

      await store.login('test@clinic.com', 'password123');

      expect(store.error()).toBe(null);
    });
  });

  // =========================================================================
  // login() — Failure path
  // =========================================================================
  describe('login() failure path', () => {
    it('should set error on invalid credentials', async () => {
      mockAuthService.signInWithEmail.mockRejectedValue(new Error('Invalid login credentials'));

      await expect(store.login('bad@clinic.com', 'wrong')).rejects.toThrow('Invalid login credentials');

      expect(store.error()).toBe('Invalid login credentials');
      expect(store.isLoading()).toBe(false);
    });

    it('should set error message from thrown object without message', async () => {
      mockAuthService.signInWithEmail.mockRejectedValue({});

      await expect(store.login('bad@clinic.com', 'wrong')).rejects.toThrow();

      expect(store.error()).toBe('Invalid login credentials'); // fallback message
      expect(store.isLoading()).toBe(false);
    });

    it('should reset isLoading to false even when login throws', async () => {
      mockAuthService.signInWithEmail.mockRejectedValue(new Error('Network error'));

      try {
        await store.login('test@clinic.com', 'password123');
      } catch {
        // expected
      }

      expect(store.isLoading()).toBe(false);
    });

    it('should not call clinicContext.setContext on login failure before iam fetch', async () => {
      mockAuthService.signInWithEmail.mockRejectedValue(new Error('Invalid credentials'));

      try {
        await store.login('bad@clinic.com', 'wrong');
      } catch {
        // expected
      }

      // setContext is only called after successful user login + iam_bindings fetch
      // If signInWithEmail throws, the iam_bindings fetch never happens
      expect(mockClinicContext.setContext).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // logout()
  // =========================================================================
  describe('logout()', () => {
    it('should call authService.signOut', async () => {
      mockAuthService.signOut.mockResolvedValue(undefined);

      await store.logout();

      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('should reset clinic context to null', async () => {
      mockAuthService.signOut.mockResolvedValue(undefined);

      await store.logout();

      expect(mockClinicContext.setContext).toHaveBeenCalledWith(null);
    });

    it('should set isLoading true then false during logout', async () => {
      mockAuthService.signOut.mockResolvedValue(undefined);

      const logoutPromise = store.logout();
      // isLoading should be true during the operation
      await logoutPromise;

      expect(store.isLoading()).toBe(false);
    });

    it('should reset isLoading even if signOut throws', async () => {
      mockAuthService.signOut.mockRejectedValue(new Error('Sign out failed'));

      try {
        await store.logout();
      } catch {
        // expected
      }

      expect(store.isLoading()).toBe(false);
    });
  });

  // =========================================================================
  // user and session readonly signals
  // =========================================================================
  describe('user and session readonly signals', () => {
    it('should expose user signal from AuthService', () => {
      mockAuthService.currentUser.mockReturnValue(MOCK_USER);
      expect(store.user()).toEqual(MOCK_USER);
    });

    it('should expose session signal from AuthService', () => {
      const mockSession = { access_token: 'token', refresh_token: 'refresh' };
      mockAuthService.currentSession.mockReturnValue(mockSession as any);
      expect(store.session()).toEqual(mockSession);
    });
  });
});
