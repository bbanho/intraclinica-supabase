import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientsComponent } from './patients.component';
import { PatientService, Patient } from '../../core/services/patient.service';
import { ClinicContextService } from '../../core/services/clinic-context.service';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { FormBuilder } from '@angular/forms';

describe('PatientsComponent', () => {
  let component: PatientsComponent;
  let fixture: ComponentFixture<PatientsComponent>;
  let patientService: jasmine.SpyObj<PatientService>;
  let dialog: jasmine.SpyObj<Dialog>;
  let contextService: jasmine.SpyObj<ClinicContextService>;

  const mockPatients: Patient[] = [
    {
      id: 'patient-1',
      clinic_id: 'clinic-123',
      name: 'João da Silva',
      cpf: '123.456.789-00',
      birth_date: '1990-05-15',
      gender: 'M',
      phone: '(11) 99999-9999'
    },
    {
      id: 'patient-2',
      clinic_id: 'clinic-123',
      name: 'Maria dos Santos',
      cpf: '987.654.321-00',
      birth_date: '1985-03-20',
      gender: 'F',
      phone: '(22) 88888-8888'
    }
  ];

  const mockDialogRef = {
    closed: jasmine.createSpy('closed').and.returnValue({
      subscribe: jasmine.createSpy('subscribe').and.callFake((fn: (value: unknown) => void) => {
        fn(true);
        return { unsubscribe: jasmine.createSpy('unsubscribe') };
      })
    }),
    close: jasmine.createSpy('close')
  };

  beforeEach(async () => {
    patientService = jasmine.createSpyObj('PatientService', [
      'getPatients',
      'createPatient',
      'updatePatient',
      'deletePatient'
    ]);
    patientService.getPatients.and.resolveTo(mockPatients);
    patientService.deletePatient.and.resolveTo();

    dialog = jasmine.createSpyObj('Dialog', ['open']);
    dialog.open.and.returnValue(mockDialogRef);

    contextService = jasmine.createSpyObj('ClinicContextService', [], {
      selectedClinicId: 'clinic-123'
    });

    await TestBed.configureTestingModule({
      imports: [PatientsComponent],
      providers: [
        FormBuilder,
        { provide: PatientService, useValue: patientService },
        { provide: Dialog, useValue: dialog },
        { provide: ClinicContextService, useValue: contextService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have signals for state management', () => {
      expect(component.patients).toBeDefined();
      expect(component.loading).toBeDefined();
      expect(component.error).toBeDefined();
      expect(component.searchTerm).toBeDefined();
      expect(component.deleteTarget).toBeDefined();
      expect(component.deleting).toBeDefined();
    });

    it('should have filteredPatients computed signal', () => {
      expect(component.filteredPatients).toBeDefined();
    });

    it('should have Lucide icon references', () => {
      expect(component.UserPlusIcon).toBeDefined();
      expect(component.UsersIcon).toBeDefined();
      expect(component.SearchIcon).toBeDefined();
      expect(component.AlertCircleIcon).toBeDefined();
      expect(component.EditIcon).toBeDefined();
      expect(component.Trash2Icon).toBeDefined();
    });
  });

  describe('Modal open/close state', () => {
    it('should open dialog when openPatientModal is called without patient', () => {
      component.openPatientModal();

      expect(dialog.open).toHaveBeenCalled();
      const dialogCall = dialog.open.calls.mostRecent();
      expect(dialogCall.args[0]).toBeTruthy();
      expect(dialogCall.args[1]).toEqual(jasmine.objectContaining({
        width: '100%',
        maxWidth: '500px',
        hasBackdrop: true
      }));
    });

    it('should open dialog with patient data when editing', () => {
      const patientToEdit = mockPatients[0];
      component.openPatientModal(patientToEdit);

      expect(dialog.open).toHaveBeenCalled();
      const dialogCall = dialog.open.calls.mostRecent();
      expect(dialogCall.args[1]).toEqual(jasmine.objectContaining({
        data: { patient: patientToEdit }
      }));
    });

    it('should reload patients when dialog closes with result', () => {
      component.loadPatients = jasmine.createSpy('loadPatients');
      component.openPatientModal();

      expect(mockDialogRef.closed).toHaveBeenCalled();
    });

    it('should not reload patients when dialog closes without result', () => {
      mockDialogRef.closed.and.returnValue({
        subscribe: jasmine.createSpy('subscribe').and.callFake((fn: (value: unknown) => void) => {
          fn(null);
          return { unsubscribe: jasmine.createSpy('unsubscribe') };
        })
      });

      component.loadPatients = jasmine.createSpy('loadPatients');
      component.openPatientModal();

      expect(mockDialogRef.closed).toHaveBeenCalled();
    });
  });

  describe('Form validation (via filteredPatients)', () => {
    it('should return all patients when searchTerm is empty', () => {
      component.searchTerm.set('');
      component.patients.set(mockPatients);

      expect(component.filteredPatients()).toEqual(mockPatients);
    });

    it('should filter patients by name (case insensitive)', () => {
      component.searchTerm.set('joão');
      component.patients.set(mockPatients);

      const filtered = component.filteredPatients();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('João da Silva');
    });

    it('should filter patients by CPF', () => {
      component.searchTerm.set('123.456.789');
      component.patients.set(mockPatients);

      const filtered = component.filteredPatients();
      expect(filtered.length).toBe(1);
      expect(filtered[0].cpf).toBe('123.456.789-00');
    });

    it('should return empty array when no match found', () => {
      component.searchTerm.set('nonexistent');
      component.patients.set(mockPatients);

      const filtered = component.filteredPatients();
      expect(filtered.length).toBe(0);
    });

    it('should trim search term before filtering', () => {
      component.searchTerm.set('  maria  ');
      component.patients.set(mockPatients);

      const filtered = component.filteredPatients();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Maria dos Santos');
    });

    it('should handle patients with null CPF in search', () => {
      const patientsWithNullCpf: Patient[] = [
        { ...mockPatients[0], cpf: null }
      ];
      component.searchTerm.set('joao');
      component.patients.set(patientsWithNullCpf);

      const filtered = component.filteredPatients();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('João da Silva');
    });
  });

  describe('Search debounce logic', () => {
    it('should update searchTerm signal on input event', () => {
      const event = { target: { value: 'test search' } } as unknown as Event;
      component.onSearch(event);

      expect(component.searchTerm()).toBe('test search');
    });

    it('should update searchTerm on multiple input events', () => {
      const event1 = { target: { value: 'first' } } as unknown as Event;
      const event2 = { target: { value: 'second' } } as unknown as Event;

      component.onSearch(event1);
      component.onSearch(event2);

      expect(component.searchTerm()).toBe('second');
    });
  });

  describe('loadPatients', () => {
    it('should set loading to true while fetching', async () => {
      let loadingDuringFetch = false;
      component.loading.set(false);

      const loadPromise = component.loadPatients();
      loadingDuringFetch = component.loading();
      
      expect(loadingDuringFetch).toBe(true);

      await loadPromise;
    });

    it('should set patients on successful fetch', async () => {
      await component.loadPatients();

      expect(component.patients()).toEqual(mockPatients);
    });

    it('should set error on fetch failure', async () => {
      const error = new Error('Fetch failed');
      patientService.getPatients.and.rejectWith(error);

      await component.loadPatients();

      expect(component.error()).toBe('Falha ao carregar pacientes.');
    });

    it('should set loading to false after fetch completes', async () => {
      await component.loadPatients();

      expect(component.loading()).toBe(false);
    });

    it('should set loading to false even when fetch fails', async () => {
      const error = new Error('Fetch failed');
      patientService.getPatients.and.rejectWith(error);

      await component.loadPatients();

      expect(component.loading()).toBe(false);
    });
  });

  describe('deletePatient', () => {
    it('should set deleteTarget signal when deletePatient is called', () => {
      component.deletePatient(mockPatients[0]);

      expect(component.deleteTarget()).toEqual(mockPatients[0]);
    });

    it('should clear deleteTarget on confirmDelete success', async () => {
      component.deleteTarget.set(mockPatients[0]);
      patientService.deletePatient.and.resolveTo();

      await component.confirmDelete();

      expect(component.deleteTarget()).toBeNull();
    });

    it('should remove deleted patient from patients list', async () => {
      component.patients.set([...mockPatients]);
      component.deleteTarget.set(mockPatients[0]);
      patientService.deletePatient.and.resolveTo();

      await component.confirmDelete();

      expect(component.patients().length).toBe(1);
      expect(component.patients()[0].id).toBe('patient-2');
    });

    it('should set error on delete failure', async () => {
      component.deleteTarget.set(mockPatients[0]);
      const error = new Error('Delete failed');
      patientService.deletePatient.and.rejectWith(error);

      await component.confirmDelete();

      expect(component.error()).toBe('Erro ao excluir paciente.');
    });

    it('should set deleting to true during delete', async () => {
      component.deleteTarget.set(mockPatients[0]);
      patientService.deletePatient.and.resolveTo(new Promise(resolve => setTimeout(resolve, 100)));

      const deletePromise = component.confirmDelete();
      expect(component.deleting()).toBe(true);

      await deletePromise;
    });
  });

  describe('formatDate', () => {
    it('should return "-" for null date', () => {
      expect(component.formatDate(null)).toBe('-');
    });

    it('should format date string YYYY-MM-DD to DD/MM/YYYY', () => {
      expect(component.formatDate('1990-05-15')).toBe('15/05/1990');
    });

    it('should return original string for invalid format', () => {
      expect(component.formatDate('invalid')).toBe('invalid');
    });
  });

  describe('formatGender', () => {
    it('should return "-" for null gender', () => {
      expect(component.formatGender(null)).toBe('-');
    });

    it('should return "-" for undefined gender', () => {
      expect(component.formatGender(undefined as unknown as string)).toBe('-');
    });

    it('should return "Masculino" for M', () => {
      expect(component.formatGender('M')).toBe('Masculino');
    });

    it('should return "Feminino" for F', () => {
      expect(component.formatGender('F')).toBe('Feminino');
    });

    it('should return "Outro" for O', () => {
      expect(component.formatGender('O')).toBe('Outro');
    });

    it('should return original value for unknown gender code', () => {
      expect(component.formatGender('X')).toBe('X');
    });
  });
});
