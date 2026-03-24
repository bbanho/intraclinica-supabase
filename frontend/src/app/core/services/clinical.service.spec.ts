import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  ClinicalService,
  MedicalRecord,
  MedicalRecordContent,
  MedicalRecordType,
} from './clinical.service';
import { SupabaseService } from './supabase.service';
import { ClinicContextService } from './clinic-context.service';
import { AuthService } from './auth.service';

function createMockSupabaseClient() {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const mockClient = { from: mockFrom, rpc: mockRpc };
  return { mockClient, mockFrom, mockRpc };
}

const MOCK_CLINIC_ID = 'clinic-uuid-456';

const MOCK_USER = { id: 'doctor-uuid-789', email: 'dr@clinic.com' } as any;

const MOCK_RECORD_CONTENT: MedicalRecordContent = {
  chief_complaint: 'Dor de cabeça há 3 dias',
  observations: 'Paciente relata estresse no trabalho',
  diagnosis: 'Cefaleia tensional',
  prescriptions: 'Dipirona 500mg 8/8h por 5 dias',
};

const MOCK_DB_RECORD = {
  id: 'record-1',
  clinic_id: MOCK_CLINIC_ID,
  patient_id: 'patient-uuid-1',
  doctor_id: MOCK_USER.id,
  content: JSON.stringify(MOCK_RECORD_CONTENT),
  type: 'EVOLUCAO' as MedicalRecordType,
  created_at: '2024-06-15T10:00:00.000Z',
};

const MOCK_DB_RECORD_ALREADY_PARSED = {
  id: 'record-2',
  clinic_id: MOCK_CLINIC_ID,
  patient_id: 'patient-uuid-1',
  doctor_id: MOCK_USER.id,
  content: MOCK_RECORD_CONTENT,
  type: 'RECEITA' as MedicalRecordType,
  created_at: '2024-06-16T11:00:00.000Z',
};

const MOCK_DB_RECORD_MALFORMED = {
  id: 'record-3',
  clinic_id: MOCK_CLINIC_ID,
  patient_id: 'patient-uuid-1',
  doctor_id: MOCK_USER.id,
  content: 'not-valid-json{',
  type: 'EXAME' as MedicalRecordType,
  created_at: '2024-06-17T12:00:00.000Z',
};

describe('ClinicalService', () => {
  let service: ClinicalService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let mockSupabaseService: Partial<SupabaseService>;
  let mockClinicContext: Partial<ClinicContextService>;
  let mockAuthService: Partial<AuthService>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockClient = createMockSupabaseClient();

    mockSupabaseService = {
      clientInstance: mockClient.mockClient,
    };

    mockClinicContext = {
      selectedClinicId: vi.fn().mockReturnValue(MOCK_CLINIC_ID),
    };

    mockAuthService = {
      currentUser: vi.fn().mockReturnValue(MOCK_USER),
    };

    await TestBed.configureTestingModule({
      providers: [
        ClinicalService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ClinicContextService, useValue: mockClinicContext },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    service = TestBed.inject(ClinicalService);
  });

  describe('getRecordsByPatient()', () => {
    it('should return clinical records for the given patient', async () => {
      const mockQuery = {
        select: vi.fn().mockResolvedValue({ data: [MOCK_DB_RECORD], error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      mockClient.mockFrom.mockReturnValue(mockQuery);

      const result = await service.getRecordsByPatient('patient-uuid-1');

      expect(mockClient.mockFrom).toHaveBeenCalledWith('clinical_record');
      expect(mockQuery.eq).toHaveBeenCalledWith('clinic_id', MOCK_CLINIC_ID);
      expect(mockQuery.eq).toHaveBeenCalledWith('patient_id', 'patient-uuid-1');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toHaveLength(1);
      expect(result[0].content.chief_complaint).toBe('Dor de cabeça há 3 dias');
    });

    it('should parse content JSONB column when stored as string', async () => {
      const mockQuery = {
        select: vi.fn().mockResolvedValue({ data: [MOCK_DB_RECORD], error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      mockClient.mockFrom.mockReturnValue(mockQuery);

      const [record] = await service.getRecordsByPatient('patient-uuid-1');

      expect(record.content).toEqual(MOCK_RECORD_CONTENT);
      expect(typeof record.content).toBe('object');
    });

    it('should keep content as object when already parsed', async () => {
      const mockQuery = {
        select: vi.fn().mockResolvedValue({ data: [MOCK_DB_RECORD_ALREADY_PARSED], error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      mockClient.mockFrom.mockReturnValue(mockQuery);

      const [record] = await service.getRecordsByPatient('patient-uuid-1');

      expect(record.content).toEqual(MOCK_RECORD_CONTENT);
      expect(record.type).toBe('RECEITA');
    });

    it('should return empty defaults when content JSONB is malformed', async () => {
      const mockQuery = {
        select: vi.fn().mockResolvedValue({ data: [MOCK_DB_RECORD_MALFORMED], error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      mockClient.mockFrom.mockReturnValue(mockQuery);

      const [record] = await service.getRecordsByPatient('patient-uuid-1');

      expect(record.content.chief_complaint).toBe('');
      expect(record.content.observations).toBe('');
      expect(record.content.diagnosis).toBe('');
      expect(record.content.prescriptions).toBe('');
    });

    it('should throw when Supabase returns an error', async () => {
      const mockQuery = {
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Permission denied' } }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      mockClient.mockFrom.mockReturnValue(mockQuery);

      await expect(service.getRecordsByPatient('patient-uuid-1')).rejects.toThrow('Permission denied');
    });

    it('should throw when clinic context is "all" (no clinic selected)', async () => {
      mockClinicContext.selectedClinicId = vi.fn().mockReturnValue('all');

      await TestBed.configureTestingModule({
        providers: [
          ClinicalService,
          { provide: SupabaseService, useValue: mockSupabaseService },
          { provide: ClinicContextService, useValue: mockClinicContext },
          { provide: AuthService, useValue: mockAuthService },
        ],
      }).compileComponents();

      const svc = TestBed.inject(ClinicalService);

      await expect(svc.getRecordsByPatient('patient-uuid-1')).rejects.toThrow('Invalid Clinic Context');
    });

    it('should throw when clinic context is null', async () => {
      mockClinicContext.selectedClinicId = vi.fn().mockReturnValue(null);

      await TestBed.configureTestingModule({
        providers: [
          ClinicalService,
          { provide: SupabaseService, useValue: mockSupabaseService },
          { provide: ClinicContextService, useValue: mockClinicContext },
          { provide: AuthService, useValue: mockAuthService },
        ],
      }).compileComponents();

      const svc = TestBed.inject(ClinicalService);

      await expect(svc.getRecordsByPatient('patient-uuid-1')).rejects.toThrow('Invalid Clinic Context');
    });
  });

  describe('createRecord()', () => {
    it('should call RPC create_medical_record with correct parameters', async () => {
      const createdRecord: MedicalRecord = {
        ...MOCK_DB_RECORD,
        content: MOCK_RECORD_CONTENT,
      };
      mockClient.mockRpc.mockResolvedValue({ data: [createdRecord], error: null });

      const result = await service.createRecord(
        'patient-uuid-1',
        MOCK_RECORD_CONTENT,
        'EVOLUCAO'
      );

      expect(mockClient.mockRpc).toHaveBeenCalledWith('create_medical_record', {
        p_clinic_id: MOCK_CLINIC_ID,
        p_patient_id: 'patient-uuid-1',
        p_doctor_id: MOCK_USER.id,
        p_content: MOCK_RECORD_CONTENT as unknown as Record<string, unknown>,
        p_type: 'EVOLUCAO',
      });
      expect(result.content.chief_complaint).toBe('Dor de cabeça há 3 dias');
    });

    it('should default type to EVOLUCAO when not provided', async () => {
      mockClient.mockRpc.mockResolvedValue({ data: [MOCK_DB_RECORD], error: null });

      await service.createRecord('patient-uuid-1', MOCK_RECORD_CONTENT);

      const callArgs = mockClient.mockRpc.mock.calls[0][1];
      expect(callArgs.p_type).toBe('EVOLUCAO');
    });

    it('should use doctor_id from authenticated user', async () => {
      mockClient.mockRpc.mockResolvedValue({ data: [MOCK_DB_RECORD], error: null });

      await service.createRecord('patient-uuid-1', MOCK_RECORD_CONTENT, 'RECEITA');

      const callArgs = mockClient.mockRpc.mock.calls[0][1];
      expect(callArgs.p_doctor_id).toBe(MOCK_USER.id);
    });

    it('should throw when no authenticated user', async () => {
      mockAuthService.currentUser = vi.fn().mockReturnValue(null);

      await TestBed.configureTestingModule({
        providers: [
          ClinicalService,
          { provide: SupabaseService, useValue: mockSupabaseService },
          { provide: ClinicContextService, useValue: mockClinicContext },
          { provide: AuthService, useValue: mockAuthService },
        ],
      }).compileComponents();

      const svc = TestBed.inject(ClinicalService);

      await expect(svc.createRecord('patient-uuid-1', MOCK_RECORD_CONTENT)).rejects.toThrow(
        'No authenticated user'
      );
    });

    it('should throw when RPC returns an error', async () => {
      mockClient.mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed: constraint violation' },
      });

      await expect(
        service.createRecord('patient-uuid-1', MOCK_RECORD_CONTENT)
      ).rejects.toThrow('RPC failed: constraint violation');
    });

    it('should throw when RPC returns empty data', async () => {
      mockClient.mockRpc.mockResolvedValue({ data: [], error: null });

      await expect(
        service.createRecord('patient-uuid-1', MOCK_RECORD_CONTENT)
      ).rejects.toThrow('Failed to create medical record');
    });

    it('should throw when clinic context is invalid', async () => {
      mockClinicContext.selectedClinicId = vi.fn().mockReturnValue('all');

      await TestBed.configureTestingModule({
        providers: [
          ClinicalService,
          { provide: SupabaseService, useValue: mockSupabaseService },
          { provide: ClinicContextService, useValue: mockClinicContext },
          { provide: AuthService, useValue: mockAuthService },
        ],
      }).compileComponents();

      const svc = TestBed.inject(ClinicalService);

      await expect(svc.createRecord('patient-uuid-1', MOCK_RECORD_CONTENT)).rejects.toThrow(
        'Invalid Clinic Context'
      );
    });
  });
});
