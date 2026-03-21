import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClinicalComponent } from './clinical.component';
import { DatabaseService } from '../../core/services/database.service';
import { GeminiService } from '../../core/services/gemini.service';
import { LocalAiService } from '../../core/services/local-ai.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ClinicalComponent', () => {
  let component: ClinicalComponent;
  let fixture: ComponentFixture<ClinicalComponent>;
  let mockDbService: any;
  let mockGeminiService: any;
  let mockLocalAiService: any;

  beforeEach(async () => {
    mockDbService = {
      checkPermission: vi.fn(() => true),
      selectedContextClinic: signal('test-clinic'),
      currentUser: signal({ clinicId: 'test-clinic' }),
      users: signal([]),
      appointments: signal([]),
      clinicalRecords: signal([]),
      addClinicalRecord: vi.fn()
    };
    mockGeminiService = {
      connectLive: vi.fn()
    };
    mockLocalAiService = {
      availableModels: [],
      isLoaded: signal(false),
      status: signal(''),
      progress: signal(0)
    };

    await TestBed.configureTestingModule({
      imports: [ClinicalComponent],
      providers: [
        { provide: DatabaseService, useValue: mockDbService },
        { provide: GeminiService, useValue: mockGeminiService },
        { provide: LocalAiService, useValue: mockLocalAiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClinicalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should identify the current patient in treatment', () => {
    const patient = { id: '1', patientName: 'Carlos', status: 'Em Atendimento' };
    mockDbService.appointments.set([patient]);
    
    expect(component.currentPatient()).toEqual(patient);
  });

  it('should identify the current patient in treatment with a DOCTOR role', () => {
    const patient = { id: '1', patientName: 'Carlos', status: 'Em Atendimento', doctorName: 'Dr. House' };
    mockDbService.appointments.set([patient]);
    mockDbService.currentUser.set({ name: 'Dr. House', role: 'DOCTOR' });

    expect(component.currentPatient()).toEqual(patient);
  });

  it('should save notes and clear currentNotes', async () => {
    const patient = { id: '1', patientName: 'Carlos', status: 'Em Atendimento', doctorName: 'Dra', type: 'Cons' };
    mockDbService.appointments.set([patient]);
    mockDbService.currentUser.set({ name: 'Dra', role: 'DOCTOR' });
    component.currentNotes = 'Some patient notes';
    
    await component.saveNotes();
    
    expect(mockDbService.addClinicalRecord).toHaveBeenCalled();
    expect(component.currentNotes).toBe('');
  });

  it('should filter the waiting list based on the selected clinic', () => {
    const allAppointments = [
      { id: '1', patientName: 'Alice', status: 'Aguardando', clinicId: 'clinic-1' },
      { id: '2', patientName: 'Bob', status: 'Aguardando', clinicId: 'clinic-2' },
      { id: '3', patientName: 'Charlie', status: 'Chamado', clinicId: 'clinic-1' },
    ];
    mockDbService.appointments.set(allAppointments);
    mockDbService.selectedContextClinic.set('clinic-1');

    const expectedAppointments = allAppointments.filter(p => p.clinicId === 'clinic-1');
    mockDbService.appointments.set(expectedAppointments);

    const filtered = component.waitingList();

    expect(filtered.length).toBe(2);
    expect(filtered.map(p => p.id)).toEqual(['1', '3']);
  });

  it('should not save notes if there is no patient in treatment', async () => {
    mockDbService.appointments.set([]);
    component.currentNotes = 'Some patient notes';

    await component.saveNotes();

    expect(mockDbService.addClinicalRecord).not.toHaveBeenCalled();
  });

  it('should not identify a patient in treatment if the doctor does not match', () => {
    const patient = { id: '1', patientName: 'Carlos', status: 'Em Atendimento', doctorName: 'Dr. House' };
    mockDbService.appointments.set([patient]);
    mockDbService.currentUser.set({ name: 'Dr. Watson', role: 'DOCTOR' });

    expect(component.currentPatient()).toBeUndefined();
  });

  describe('Permissions', () => {
    it('should correctly reflect canViewClinicalRecords based on checkPermission', () => {
      mockDbService.checkPermission.mockReturnValue(true);
      mockDbService.selectedContextClinic.set('clinic-1');
      expect(component.canViewClinicalRecords()).toBe(true);

      mockDbService.checkPermission.mockReturnValue(false);
      mockDbService.selectedContextClinic.set('clinic-2');
      expect(component.canViewClinicalRecords()).toBe(false);
    });
  });
});
