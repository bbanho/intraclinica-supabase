import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminPanelComponent } from './admin-panel.component';
import { DatabaseService } from '../../core/services/database.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AdminPanelComponent', () => {
  let component: AdminPanelComponent;
  let fixture: ComponentFixture<AdminPanelComponent>;
  let mockDbService: any;

  beforeEach(async () => {
    mockDbService = {
      selectedContextClinic: signal(null),
      currentUser: signal(null),
      clinics: signal([]),
      users: signal([]),
      appointments: signal([]),
      patients: signal([]),
      accessRequests: signal([]),
      globalArr: signal(0),
      globalUptime: signal(0),
      addClinic: vi.fn(),
      deleteClinic: vi.fn(),
      saveUser: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AdminPanelComponent],
      providers: [{ provide: DatabaseService, useValue: mockDbService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Global SaaS View', () => {
    beforeEach(() => {
      mockDbService.selectedContextClinic.set('all');
      mockDbService.clinics.set([
        { id: 'c1', name: 'Clinic 1', status: 'active', plan: 'Pro' },
        { id: 'c2', name: 'Clinic 2', status: 'active', plan: 'Starter' },
      ]);
      component.activeTab.set('clinics');
      fixture.detectChanges();
    });

    it('should display global metrics', () => {
      mockDbService.globalArr.set(10000);
      mockDbService.globalUptime.set(99.9);
      component.activeTab.set('global');
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('R$10,000.00');
      expect(compiled.textContent).toContain('99.9%');
    });

    it('should display a list of clinics', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Clinic 1');
      expect(compiled.textContent).toContain('Clinic 2');
    });

    it('should call deleteClinic when delete button is clicked', () => {
      vi.spyOn(window, 'confirm').mockImplementation(() => true);
      component.onDeleteClinic('c1');
      expect(mockDbService.deleteClinic).toHaveBeenCalledWith('c1');
    });
  });

  describe('Clinic-Specific View', () => {
    beforeEach(() => {
      mockDbService.selectedContextClinic.set('c1');
      mockDbService.clinics.set([
        { id: 'c1', name: 'Clinic 1', status: 'active', plan: 'Pro' },
      ]);
      mockDbService.users.set([
        { id: 'u1', name: 'User 1', clinicId: 'c1', role: 'DOCTOR' },
        { id: 'u2', name: 'User 2', clinicId: 'c2', role: 'ADMIN' },
      ]);
      component.activeTab.set('clinic-staff');
      fixture.detectChanges();
    });

    it('should filter staff based on the selected clinic', () => {
      expect(component.filteredStaff().length).toBe(1);
      expect(component.filteredStaff()[0].name).toBe('User 1');
    });

    it('should open the user modal', () => {
      component.openUserModal();
      expect(component.isUserModalOpen()).toBe(true);
    });

    it('should call saveUser when a new user is added', () => {
      component.newUserData = { name: 'New User', email: 'test@test.com', role: 'roles/doctor', tempPassword: 'password' };
      component.onAddUser();
      expect(mockDbService.saveUser).toHaveBeenCalled();
    });

    it('should map roles/clinic_admin role to ADMIN in UserProfile', () => {
      component.newUserData = { name: 'Admin User', email: 'admin@test.com', role: 'roles/clinic_admin', tempPassword: 'password' };
      component.onAddUser();
      expect(mockDbService.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ADMIN',
          iam: expect.arrayContaining([
            expect.objectContaining({ roleId: 'roles/clinic_admin' })
          ])
        }),
        'password'
      );
    });

    it('should map roles/stock_manager role to STOCK in UserProfile', () => {
      component.newUserData = { name: 'Stock User', email: 'stock@test.com', role: 'roles/stock_manager', tempPassword: 'password' };
      component.onAddUser();
      expect(mockDbService.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'STOCK',
          iam: expect.arrayContaining([
            expect.objectContaining({ roleId: 'roles/stock_manager' })
          ])
        }),
        'password'
      );
    });
  });

  describe('Permissions Modal', () => {
    const mockUser = {
      id: 'u1',
      name: 'Test User',
      email: 'test@test.com',
      role: 'ADMIN',
      clinicId: 'c1',
      iam: [{ roleId: 'roles/clinic_admin', resource: 'c1' }],
    };

    beforeEach(() => {
      mockDbService.selectedContextClinic.set('c1');
    });

    it('should open the permissions modal with a deep copy of the user', () => {
      component.openPermissionsModal(mockUser);
      expect(component.editingPermissionsUser()).not.toBe(mockUser);
      expect(component.editingPermissionsUser()).toEqual(mockUser);
    });

    it('should update a users role', () => {
      component.openPermissionsModal(mockUser);
      component.updateRole(component.editingPermissionsUser()!, 'roles/doctor');
      expect(component.editingPermissionsUser()!.iam![0].roleId).toBe('roles/doctor');
    });

    it('should toggle a permission on and off', () => {
      component.openPermissionsModal(mockUser);
      const user = component.editingPermissionsUser()!;

      component.togglePermission(user, 'inventory.write', 'add');
      expect(user.iam![0].permissions).toContain('inventory.write');

      component.togglePermission(user, 'inventory.write', 'add');
      expect(user.iam![0].permissions).not.toContain('inventory.write');
    });
  });
});
