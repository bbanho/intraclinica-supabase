import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { DatabaseService } from './database.service';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocks
const mockAuth = {
  // You can add properties here if your service uses them, e.g., currentUser
};
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
  limit: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let databaseServiceMock: Partial<DatabaseService>;
  let routerMock: Partial<Router>;
  let onAuthStateChangedCallback: (user: any) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();

    (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation((auth, callback) => {
      onAuthStateChangedCallback = callback;
      return vi.fn(); // Return a mock unsubscribe function
    });

    databaseServiceMock = {
      currentUser: {
        set: vi.fn(),
      } as any,
      initProtectedSync: vi.fn(),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: databaseServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login a Firebase user successfully', async () => {
      (signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { uid: 'test-uid' } });
      vi.spyOn(service as any, 'getUserProfile').mockResolvedValue({ id: 'test-uid', name: 'Test User' });

      const result = await service.login('test@test.com', 'password');

      expect(result).toBe(true);
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, 'test@test.com', 'password');
    });

    it('should return false for failed login', async () => {
      (signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockRejectedValue({ code: 'auth/wrong-password' });

      const result = await service.login('wrong@test.com', 'password');

      expect(result).toBe(false);
    });
  });

  describe('logout', () => {
    it('should sign out the user and navigate to login', async () => {
      await service.logout();
      expect(signOut).toHaveBeenCalledWith(mockAuth);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('onAuthStateChanged', () => {
    it('should set current user on auth state change', async () => {
      const mockUser = { uid: 'test-uid' };
      const mockUserProfile = { id: 'test-uid', name: 'Test User' };

      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        exists: () => true,
        data: () => ({ name: 'Test User' }),
      });

      // Call the callback
      await onAuthStateChangedCallback(mockUser);

      // Assertions
      expect(databaseServiceMock.currentUser.set).toHaveBeenCalledWith(mockUserProfile);
      expect(localStorage.getItem('sc_user')).toEqual(JSON.stringify(mockUserProfile));
    });

    it('should clear current user on auth state change to null', async () => {
      // Call the callback with null
      await onAuthStateChangedCallback(null);

      // Assertions
      expect(databaseServiceMock.currentUser.set).toHaveBeenCalledWith(null);
      expect(localStorage.getItem('sc_user')).toBeNull();
    });
  });
});
