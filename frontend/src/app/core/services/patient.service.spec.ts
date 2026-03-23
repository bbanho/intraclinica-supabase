import { TestBed } from '@angular/core/testing';
import { PatientService, Patient, PatientFormDto } from './patient.service';
import { SupabaseService } from './supabase.service';
import { ClinicContextService } from './clinic-context.service';

describe('PatientService', () => {
  let service: PatientService;
  let supabaseService: jasmine.SpyObj<SupabaseService>;
  let contextService: jasmine.SpyObj<ClinicContextService>;

  const mockClinicId = 'clinic-123';

  const mockPatient: Patient = {
    id: 'patient-1',
    clinic_id: mockClinicId,
    name: 'João da Silva',
    cpf: '123.456.789-00',
    birth_date: '1990-05-15',
    gender: 'M',
    phone: '(11) 99999-9999'
  };

  const mockPatientForm: PatientFormDto = {
    name: 'João da Silva',
    cpf: '123.456.789-00',
    birth_date: '1990-05-15',
    gender: 'M',
    phone: '(11) 99999-9999'
  };

  const mockClientInstance = {
    from: jasmine.createSpy('from').and.returnValue({
      select: jasmine.createSpy('select').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          order: jasmine.createSpy('order').and.returnValue(Promise.resolve({ data: [mockPatient], error: null })),
          single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: mockPatient, error: null }))
        }),
        insert: jasmine.createSpy('insert').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue({
            single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: mockPatient, error: null }))
          })
        }),
        update: jasmine.createSpy('update').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            select: jasmine.createSpy('select').and.returnValue({
              single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: mockPatient, error: null }))
            })
          })
        }),
        delete: jasmine.createSpy('delete').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ error: null }))
        })
      })
    })
  };

  beforeEach(async () => {
    supabaseService = jasmine.createSpyObj('SupabaseService', [], {
      clientInstance: mockClientInstance
    });

    contextService = jasmine.createSpyObj('ClinicContextService', [], {
      selectedClinicId: mockClinicId
    });

    await TestBed.configureTestingModule({
      providers: [
        PatientService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: ClinicContextService, useValue: contextService }
      ]
    }).compileComponents();

    service = TestBed.inject(PatientService);
  });

  describe('getPatients', () => {
    it('should return array of patients for the current clinic', async () => {
      const result = await service.getPatients();

      expect(result).toEqual([mockPatient]);
      expect(mockClientInstance.from).toHaveBeenCalledWith('patient');
    });

    it('should filter by clinic_id via RLS', async () => {
      await service.getPatients();

      const fromSpy = mockClientInstance.from;
      expect(fromSpy).toHaveBeenCalledWith('patient');
    });

    it('should order by updated_at descending', async () => {
      await service.getPatients();

      const fromChain = mockClientInstance.from('patient').select('*').eq('clinic_id', mockClinicId);
      expect(fromChain.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    });

    it('should throw error when Supabase returns an error', async () => {
      const error = { message: 'Failed to fetch' };
      mockClientInstance.from('patient').select('*').eq('clinic_id', mockClinicId).order.and.returnValue(
        Promise.resolve({ data: null, error })
      );

      await expectAsync(service.getPatients()).toBeRejectedWith(error);
    });
  });

  describe('getPatientById', () => {
    it('should return a single patient by id', async () => {
      const result = await service.getPatientById('patient-1');

      expect(result).toEqual(mockPatient);
    });

    it('should filter by clinic_id and id', async () => {
      await service.getPatientById('patient-1');

      const fromChain = mockClientInstance.from('patient').select('*').eq('clinic_id', mockClinicId);
      expect(fromChain.eq).toHaveBeenCalledWith('id', 'patient-1');
    });

    it('should throw error when patient not found', async () => {
      const error = { message: 'Patient not found' };
      mockClientInstance.from('patient').select('*').eq('clinic_id', mockClinicId).eq.and.returnValue(
        Promise.resolve({ data: null, error })
      );

      await expectAsync(service.getPatientById('invalid-id')).toBeRejectedWith(error);
    });
  });

  describe('createPatient', () => {
    it('should create a new patient with generated UUID', async () => {
      spyOn(crypto, 'randomUUID').and.returnValue('generated-uuid');

      const result = await service.createPatient(mockPatientForm);

      expect(result).toEqual(mockPatient);
      expect(crypto.randomUUID).toHaveBeenCalled();
    });

    it('should include clinic_id in the insert payload', async () => {
      await service.createPatient(mockPatientForm);

      const fromChain = mockClientInstance.from('patient').select('*');
      expect(fromChain.insert).toHaveBeenCalledWith(
        jasmine.objectContaining({
          clinic_id: mockClinicId,
          name: mockPatientForm.name
        })
      );
    });

    it('should return created patient with all fields', async () => {
      const result = await service.createPatient(mockPatientForm);

      expect(result).toEqual(mockPatient);
      expect(result.name).toBe(mockPatientForm.name);
      expect(result.cpf).toBe(mockPatientForm.cpf);
    });

    it('should throw error when insert fails', async () => {
      const error = { message: 'Insert failed' };
      mockClientInstance.from('patient').select('*').insert.and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error }))
        })
      });

      await expectAsync(service.createPatient(mockPatientForm)).toBeRejectedWith(error);
    });
  });

  describe('updatePatient', () => {
    it('should update patient with correct clinic_id filter', async () => {
      await service.updatePatient('patient-1', mockPatientForm);

      const fromChain = mockClientInstance.from('patient').select('*');
      const updateChain = fromChain.update(jasmine.any(Object));
      expect(updateChain.eq).toHaveBeenCalledWith('clinic_id', mockClinicId);
    });

    it('should include updated_at in the update payload', async () => {
      await service.updatePatient('patient-1', mockPatientForm);

      const fromChain = mockClientInstance.from('patient').select('*');
      const updateCall = fromChain.update.calls.argsFor(0)[0];
      expect(updateCall.updated_at).toBeDefined();
    });

    it('should return updated patient', async () => {
      const result = await service.updatePatient('patient-1', mockPatientForm);

      expect(result).toEqual(mockPatient);
      expect(result.name).toBe(mockPatientForm.name);
    });

    it('should throw error when update fails', async () => {
      const error = { message: 'Update failed' };
      mockClientInstance.from('patient').select('*').update.and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue({
            single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error }))
          })
        })
      });

      await expectAsync(service.updatePatient('patient-1', mockPatientForm)).toBeRejectedWith(error);
    });
  });

  describe('deletePatient', () => {
    it('should delete patient with correct clinic_id filter', async () => {
      await service.deletePatient('patient-1');

      const fromChain = mockClientInstance.from('patient').select('*');
      const deleteChain = fromChain.delete();
      expect(deleteChain.eq).toHaveBeenCalledWith('clinic_id', mockClinicId);
    });

    it('should not throw when delete succeeds', async () => {
      await expectAsync(service.deletePatient('patient-1')).toBeResolved();
    });

    it('should throw error when delete fails', async () => {
      const error = { message: 'Delete failed' };
      mockClientInstance.from('patient').select('*').delete.and.returnValue(
        Promise.resolve({ error })
      );

      await expectAsync(service.deletePatient('patient-1')).toBeRejectedWith(error);
    });
  });

  describe('clinic context validation', () => {
    it('should throw "Invalid Clinic Context" when clinicId is null', async () => {
      contextService = jasmine.createSpyObj('ClinicContextService', [], {
        selectedClinicId: null
      });

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        providers: [
          PatientService,
          { provide: SupabaseService, useValue: supabaseService },
          { provide: ClinicContextService, useValue: contextService }
        ]
      }).compileComponents();

      service = TestBed.inject(PatientService);

      await expectAsync(service.getPatients()).toBeRejectedWithError('Invalid Clinic Context');
    });

    it('should throw "Invalid Clinic Context" when clinicId is "all"', async () => {
      contextService = jasmine.createSpyObj('ClinicContextService', [], {
        selectedClinicId: 'all'
      });

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        providers: [
          PatientService,
          { provide: SupabaseService, useValue: supabaseService },
          { provide: ClinicContextService, useValue: contextService }
        ]
      }).compileComponents();

      service = TestBed.inject(PatientService);

      await expectAsync(service.getPatients()).toBeRejectedWithError('Invalid Clinic Context');
    });
  });
});
