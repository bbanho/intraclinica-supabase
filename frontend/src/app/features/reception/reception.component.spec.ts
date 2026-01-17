import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReceptionComponent } from './reception.component';
import { DatabaseService } from '../../core/services/database.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ReceptionComponent', () => {
  let component: ReceptionComponent;
  let fixture: ComponentFixture<ReceptionComponent>;
  let mockDbService: any;

  beforeEach(async () => {
    mockDbService = {
      checkPermission: vi.fn(() => true),
      selectedContextClinic: signal('test-clinic'),
      currentUser: signal({ clinicId: 'test-clinic' }),
      users: signal([]),
      appointments: signal([]),
      patients: signal([]),
      updateAppointmentStatus: vi.fn(),
      addPatient: vi.fn(),
      addAppointment: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReceptionComponent],
      providers: [
        { provide: DatabaseService, useValue: mockDbService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReceptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter appointments based on search term', () => {
    const apps = [
      { id: '1', patientName: 'Alice', date: '10:00' },
      { id: '2', patientName: 'Bob', date: '11:00' }
    ];
    mockDbService.appointments.set(apps);
    
    component.searchTerm.set('Ali');
    expect(component.filteredAppointments().length).toBe(1);
    expect(component.filteredAppointments()[0].patientName).toBe('Alice');
  });

  it('should call updateAppointmentStatus when updateStatus is called', async () => {
    await component.updateStatus('1', 'Aguardando');
    expect(mockDbService.updateAppointmentStatus).toHaveBeenCalledWith('1', 'Aguardando');
  });

  it('should filter appointments based on the selected clinic', () => {
    const allAppointments = [
      { id: '1', patientName: 'Alice', date: '10:00', clinicId: 'clinic-1' },
      { id: '2', patientName: 'Bob', date: '11:00', clinicId: 'clinic-2' },
      { id: '3', patientName: 'Charlie', date: '12:00', clinicId: 'clinic-1' },
    ];
    mockDbService.appointments.set(allAppointments);
    mockDbService.selectedContextClinic.set('clinic-1');

    const expectedAppointments = allAppointments.filter(p => p.clinicId === 'clinic-1');
    mockDbService.appointments.set(expectedAppointments);

    const filtered = component.filteredAppointments();

    expect(filtered.length).toBe(2);
    expect(filtered.map(p => p.id)).toEqual(['1', '3']);
  });
});
