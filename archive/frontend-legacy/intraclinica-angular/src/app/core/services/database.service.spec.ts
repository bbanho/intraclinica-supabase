import { TestBed } from '@angular/core/testing';
import { DatabaseService } from './database.service';
import { UserProfile, Clinic } from '../models/types';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as firestore from 'firebase/firestore';

// Mock Firebase services
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApp: vi.fn(() => ({ options: {} })),
  deleteApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
  limit: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  doc: vi.fn(() => ({ path: 'dummy/path' })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
}));

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [DatabaseService],
    });
    service = TestBed.inject(DatabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('accessibleClinics', () => {
    const allClinics: Clinic[] = [
      { id: 'clinic-1', name: 'Clinic One', status: 'active', plan: 'Pro' },
      { id: 'clinic-2', name: 'Clinic Two', status: 'active', plan: 'Pro' },
      { id: 'clinic-3', name: 'Clinic Three', status: 'active', plan: 'Pro' },
    ];

    it('should return clinics based on IAM bindings for a CONSULTANT user', () => {
      const consultantUser: UserProfile = {
        id: 'consultant-id',
        name: 'Consultant User',
        role: 'CONSULTANT',
        email: 'consultant@test.com',
        iam: [
          { roleId: 'roles/consultant', resource: 'clinic-1' },
          { roleId: 'roles/consultant', resource: 'clinic-3' },
        ],
      };

      service.currentUser.set(consultantUser);
      service.clinics.set(allClinics);

      const accessible = service.accessibleClinics();
      expect(accessible.length).toBe(2);
      expect(accessible.map(c => c.id)).toEqual(['clinic-1', 'clinic-3']);
    });

    it('should return all clinics for SUPER_ADMIN', () => {
        service.currentUser.set({ id: 'dev', name: 'Dev', role: 'SUPER_ADMIN', email: 'dev@test.com' });
        service.clinics.set(allClinics);
        expect(service.accessibleClinics().length).toBe(3);
    });
  });

  describe('Context Selection Logic', () => {
    it('should auto-select the clinic if user has access to exactly one', async () => {
      const clinic = { id: 'c1', name: 'Only Clinic', status: 'active', plan: 'Pro' };
      service.clinics.set([clinic]);
      
      // User with access only to c1
      service.currentUser.set({ 
          id: 'u1', 
          name: 'Admin', 
          role: 'ADMIN', 
          clinicId: 'c1',
          email: 'admin@test.com' 
      });

      // Manually trigger the evaluation for the test
      service.evaluateAutoContextSelection();

      // We check the signal value
      expect(service.selectedContextClinic()).toBe('c1');
    });

    it('should not auto-select if user has access to multiple clinics', () => {
        service.clinics.set([
            { id: 'c1', name: 'C1', status: 'active', plan: 'Pro' },
            { id: 'c2', name: 'C2', status: 'active', plan: 'Pro' }
        ]);
        service.currentUser.set({ 
            id: 'u1', 
            name: 'Consultant', 
            role: 'CONSULTANT', 
            email: 'c@test.com',
            iam: [
                { roleId: 'roles/consultant', resource: 'c1' },
                { roleId: 'roles/consultant', resource: 'c2' }
            ]
        });

        expect(service.selectedContextClinic()).toBeNull();
    });
  });

  describe('Permission System', () => {
      it('should allow inventory.read for DOCTOR in their clinic via IAM binding', () => {
          service.currentUser.set({ 
              id: 'd1', role: 'DOCTOR', clinicId: 'c1', email: 'd@c1.com',
              iam: [{ roleId: 'roles/doctor', resource: 'c1' }] 
          });
          expect(service.checkPermission('inventory.read', 'c1')).toBe(true);
      });

      it('should deny clinical.write for RECEPTION via IAM binding', () => {
          service.currentUser.set({ 
              id: 'r1', role: 'RECEPTION', clinicId: 'c1', email: 'r@c1.com',
              iam: [{ roleId: 'roles/reception', resource: 'c1' }]
          });
          expect(service.checkPermission('clinical.write', 'c1')).toBe(false);
      });

      it('should allow all for SUPER_ADMIN regardless of bindings', () => {
          service.currentUser.set({ id: 's1', role: 'SUPER_ADMIN', email: 's@s.com' });
          expect(service.checkPermission('any.thing', 'any.resource')).toBe(true);
      });
  });

  describe('Product Management', () => {
      it('should soft delete product by setting deleted: true', async () => {
          const productId = 'prod-123';
          await service.deleteProduct(productId);
          expect(firestore.updateDoc).toHaveBeenCalledWith(
              expect.anything(), // Document reference (mocked)
              { deleted: true }
          );
      });
  });
});