import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClinicalComponent } from './clinical.component';
import { PatientService, Patient } from '../../core/services/patient.service';
import { ClinicContextService } from '../../core/services/clinic-context.service';
import { ClinicalService, MedicalRecord, MedicalRecordContent } from '../../core/services/clinical.service';
import { IamService } from '../../core/services/iam.service';

const MOCK_CLINIC_ID = 'clinic-uuid-456';

const MOCK_PATIENTS: Patient[] = [
  {
    id: 'patient-1',
    clinic_id: MOCK_CLINIC_ID,
    name: 'João da Silva',
    cpf: '123.456.789-00',
    birth_date: '1990-05-15',
    gender: 'M',
    phone: '(11) 99999-9999',
  },
  {
    id: 'patient-2',
    clinic_id: MOCK_CLINIC_ID,
    name: 'Maria dos Santos',
    cpf: '987.654.321-00',
    birth_date: '1985-03-20',
    gender: 'F',
    phone: '(22) 88888-8888',
  },
];

const MOCK_RECORD_CONTENT: MedicalRecordContent = {
  chief_complaint: 'Dor de cabeça há 3 dias',
  observations: 'Paciente relata estresse',
  diagnosis: 'Cefaleia tensional',
  prescriptions: 'Dipirona 500mg',
};

const MOCK_RECORDS: MedicalRecord[] = [
  {
    id: 'record-1',
    clinic_id: MOCK_CLINIC_ID,
    patient_id: 'patient-1',
    doctor_id: 'doctor-1',
    content: MOCK_RECORD_CONTENT,
    type: 'EVOLUCAO',
    created_at: '2024-06-15T10:00:00.000Z',
  },
  {
    id: 'record-2',
    clinic_id: MOCK_CLINIC_ID,
    patient_id: 'patient-1',
    doctor_id: 'doctor-1',
    content: { ...MOCK_RECORD_CONTENT, chief_complaint: 'Retorno em 30 dias' },
    type: 'RECEITA',
    created_at: '2024-06-16T11:00:00.000Z',
  },
];

describe('ClinicalComponent', () => {
  let component: ClinicalComponent;
  let fixture: ComponentFixture<ClinicalComponent>;
  let mockPatientService: ReturnType<typeof createMockPatientService>;
  let mockClinicalService: ReturnType<typeof createMockClinicalService>;
  let mockClinicContext: ReturnType<typeof createMockClinicContext>;
  let mockIamService: ReturnType<typeof createMockIamService>;

  function createMockPatientService() {
    const getPatients = vi.fn().mockResolvedValue(MOCK_PATIENTS);
    return { getPatients };
  }

  function createMockClinicalService() {
    const getRecordsByPatient = vi.fn().mockResolvedValue(MOCK_RECORDS);
    const createRecord = vi.fn().mockResolvedValue(MOCK_RECORDS[0]);
    return { getRecordsByPatient, createRecord };
  }

  function createMockClinicContext() {
    return { selectedClinicId: vi.fn().mockReturnValue(MOCK_CLINIC_ID) };
  }

  function createMockIamService() {
    return { can: vi.fn().mockReturnValue(true) };
  }

  beforeEach(async () => {
    mockPatientService = createMockPatientService();
    mockClinicalService = createMockClinicalService();
    mockClinicContext = createMockClinicContext();
    mockIamService = createMockIamService();

    await TestBed.configureTestingModule({
      imports: [ClinicalComponent],
      providers: [
        { provide: PatientService, useValue: mockPatientService },
        { provide: ClinicalService, useValue: mockClinicalService },
        { provide: ClinicContextService, useValue: mockClinicContext },
        { provide: IamService, useValue: mockIamService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClinicalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component signals', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have all required signal properties', () => {
      expect(component.patients).toBeDefined();
      expect(component.selectedPatient).toBeDefined();
      expect(component.searchTerm).toBeDefined();
      expect(component.focusMode).toBeDefined();
      expect(component.saving).toBeDefined();
      expect(component.aiLoading).toBeDefined();
      expect(component.records).toBeDefined();
      expect(component.saveError).toBeDefined();
      expect(component.recordsOpen).toBeDefined();
      expect(component.recordsError).toBeDefined();
    });

    it('should have recordTypes with all four types', () => {
      expect(component.recordTypes).toHaveLength(4);
      expect(component.recordTypes.map(r => r.value)).toEqual(['EVOLUCAO', 'RECEITA', 'EXAME', 'TRIAGEM']);
    });

    it('should have Lucide icon references', () => {
      expect(component.SearchIcon).toBeDefined();
      expect(component.FileTextIcon).toBeDefined();
      expect(component.AlertCircleIcon).toBeDefined();
      expect(component.BotIcon).toBeDefined();
      expect(component.Loader2Icon).toBeDefined();
      expect(component.HistoryIcon).toBeDefined();
    });
  });

  describe('Patient search', () => {
    it('should filter patients by name', () => {
      component.searchTerm.set('joão');
      component.patients.set(MOCK_PATIENTS);

      const filtered = component.filteredPatients();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('João da Silva');
    });

    it('should filter patients by CPF', () => {
      component.searchTerm.set('123.456.789');
      component.patients.set(MOCK_PATIENTS);

      const filtered = component.filteredPatients();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].cpf).toBe('123.456.789-00');
    });

    it('should return all patients when search term is empty', () => {
      component.searchTerm.set('');
      component.patients.set(MOCK_PATIENTS);

      const filtered = component.filteredPatients();
      expect(filtered).toHaveLength(2);
    });

    it('should trim search term before filtering', () => {
      component.searchTerm.set('  maria  ');
      component.patients.set(MOCK_PATIENTS);

      const filtered = component.filteredPatients();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Maria dos Santos');
    });

    it('should update searchTerm signal on input event', () => {
      const event = { target: { value: 'test search' } } as unknown as Event;
      component.onPatientSearch(event);

      expect(component.searchTerm()).toBe('test search');
    });
  });

  describe('Patient selection', () => {
    it('should set selectedPatient when selectPatient is called', () => {
      component.selectPatient(MOCK_PATIENTS[0]);

      expect(component.selectedPatient()).toEqual(MOCK_PATIENTS[0]);
    });

    it('should call loadRecords after selecting patient', async () => {
      const loadRecordsSpy = vi.spyOn(component, 'loadRecords' as any);
      component.selectPatient(MOCK_PATIENTS[0]);

      expect(loadRecordsSpy).toHaveBeenCalledWith('patient-1');
    });

    it('should clear record form when selecting a new patient', () => {
      component.record.chief_complaint = 'existing data';
      component.record.diagnosis = 'existing diagnosis';

      component.selectPatient(MOCK_PATIENTS[0]);

      expect(component.record.chief_complaint).toBe('');
      expect(component.record.diagnosis).toBe('');
    });
  });

  describe('Record form', () => {
    it('should reset record form with clearRecord', () => {
      component.record = {
        type: 'RECEITA',
        chief_complaint: 'some complaint',
        observations: 'some observations',
        diagnosis: 'some diagnosis',
        prescriptions: 'some prescriptions',
      };

      component.clearRecord();

      expect(component.record.type).toBe('EVOLUCAO');
      expect(component.record.chief_complaint).toBe('');
      expect(component.record.observations).toBe('');
      expect(component.record.diagnosis).toBe('');
      expect(component.record.prescriptions).toBe('');
    });

    it('should load records for selected patient via loadRecords', async () => {
      await component.loadRecords('patient-1');

      expect(mockClinicalService.getRecordsByPatient).toHaveBeenCalledWith('patient-1');
      expect(component.records()).toEqual(MOCK_RECORDS);
    });

    it('should set recordsError on load failure', async () => {
      mockClinicalService.getRecordsByPatient.mockRejectedValueOnce(new Error('Load failed'));

      await component.loadRecords('patient-1');

      expect(component.recordsError()).toBe('Load failed');
      expect(component.records()).toHaveLength(0);
    });
  });

  describe('saveRecord', () => {
    it('should set saveError when canWrite is false', async () => {
      mockIamService.can = vi.fn().mockReturnValue(false);
      component.selectedPatient.set(MOCK_PATIENTS[0]);

      await component.saveRecord();

      expect(component.saveError()).toBe('Sem permissão para criar prontuário');
    });

    it('should call clinicalService.createRecord with form data', async () => {
      component.selectedPatient.set(MOCK_PATIENTS[0]);
      component.record = {
        type: 'EVOLUCAO',
        chief_complaint: 'Nova queixa',
        observations: 'Observações',
        diagnosis: 'Diagnóstico',
        prescriptions: 'Prescrição',
      };

      await component.saveRecord();

      expect(mockClinicalService.createRecord).toHaveBeenCalledWith(
        'patient-1',
        {
          chief_complaint: 'Nova queixa',
          observations: 'Observações',
          diagnosis: 'Diagnóstico',
          prescriptions: 'Prescrição',
        },
        'EVOLUCAO'
      );
    });

    it('should clear form and reload records on success', async () => {
      component.selectedPatient.set(MOCK_PATIENTS[0]);
      component.record.chief_complaint = 'Test';

      await component.saveRecord();

      expect(component.record.chief_complaint).toBe('');
      expect(mockClinicalService.getRecordsByPatient).toHaveBeenCalled();
    });

    it('should set saveError on failure', async () => {
      mockClinicalService.createRecord.mockRejectedValueOnce(new Error('Save failed'));
      component.selectedPatient.set(MOCK_PATIENTS[0]);

      await component.saveRecord();

      expect(component.saveError()).toBe('Save failed');
      expect(component.saving()).toBe(false);
    });

    it('should set saving signal during save operation', async () => {
      mockClinicalService.createRecord.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(MOCK_RECORDS[0]), 50))
      );
      component.selectedPatient.set(MOCK_PATIENTS[0]);
      component.record.chief_complaint = 'Test';

      const savePromise = component.saveRecord();
      expect(component.saving()).toBe(true);

      await savePromise;
      expect(component.saving()).toBe(false);
    });
  });

  describe('AI assist button', () => {
    it('should set aiLoading when assistWithAI is called', () => {
      vi.useFakeTimers();
      component.assistWithAI();

      expect(component.aiLoading()).toBe(true);

      vi.advanceTimersByTime(1500);
      expect(component.aiLoading()).toBe(false);
      vi.useRealTimers();
    });

    it('should be disabled when aiLoading is true', () => {
      component.aiLoading.set(true);
      fixture.detectChanges();

      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button:has(.lucide-icon)');
      expect(button.disabled).toBe(true);
    });
  });

  describe('Record list rendering', () => {
    it('should display records when patient is selected and records exist', () => {
      component.selectedPatient.set(MOCK_PATIENTS[0]);
      component.records.set(MOCK_RECORDS);
      component.recordsOpen.set(true);
      fixture.detectChanges();

      const recordElements = fixture.nativeElement.querySelectorAll('[class*="border-t border-slate-700/50"]');
      expect(recordElements.length).toBeGreaterThan(0);
    });

    it('should show empty state when no records exist', () => {
      component.selectedPatient.set(MOCK_PATIENTS[0]);
      component.records.set([]);
      component.recordsOpen.set(true);
      fixture.detectChanges();

      expect(component.records().length).toBe(0);
    });

    it('should toggle recordsOpen on toggleRecords', () => {
      component.recordsOpen.set(true);

      component.toggleRecords();

      expect(component.recordsOpen()).toBe(false);
    });
  });

  describe('calculateAge', () => {
    it('should calculate age from birth_date string', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 30);

      const age = component.calculateAge(birthDate.toISOString().split('T')[0]);
      expect(age).toBe(30);
    });

    it('should return 0 for future birth dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 5);

      const age = component.calculateAge(futureDate.toISOString().split('T')[0]);
      expect(age).toBe(0);
    });
  });

  describe('Focus mode', () => {
    it('should toggle focusMode signal', () => {
      component.focusMode.set(true);

      component.toggleFocusMode();

      expect(component.focusMode()).toBe(false);
    });
  });
});
