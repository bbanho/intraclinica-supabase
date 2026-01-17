import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseService } from './database.service';
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { EnvironmentInjector } from '@angular/core';

// Mock Supabase Client
const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn(),
    signOut: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        data: []
      }))
    })),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
  })),
  channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
  })),
  removeChannel: vi.fn()
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase
}));

describe('DatabaseService (Supabase)', () => {
  let service: DatabaseService;
  let routerMock: any;

  beforeEach(() => {
    routerMock = { navigate: vi.fn() };
    
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock }
      ]
    });
    
    const injector = TestBed.inject(EnvironmentInjector);
    
    injector.runInContext(() => {
        service = new DatabaseService(routerMock);
    });
  });

  it('should initialize with null user', () => {
    expect(service.currentUser()).toBeNull();
  });

  it('checkPermission should return true for SUPER_ADMIN', () => {
    service.currentUser.set({ role: 'SUPER_ADMIN', id: '1', name: 'Admin', email: 'admin@test.com', clinicId: '' });
    expect(service.checkPermission('any.permission')).toBe(true);
  });

  it('checkPermission should respect IAM bindings', () => {
    service.currentUser.set({ 
        role: 'DOCTOR', 
        id: '2', 
        name: 'Doc', 
        email: 'doc@test.com', 
        clinicId: 'clinic-alpha',
        iam: [{ roleId: 'roles/doctor', resource: 'clinic-alpha' }]
    });
    service.selectedContextClinic.set('clinic-alpha');

    // Assuming roles/doctor has 'clinical.read_records'
    expect(service.checkPermission('clinical.read_records')).toBe(true);
    // Assuming roles/doctor does NOT have 'finance.write'
    expect(service.checkPermission('finance.write')).toBe(false);
  });
});
