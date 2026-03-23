import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AppointmentService, Appointment, AppointmentPayload } from './appointment.service';
import { SupabaseService } from './supabase.service';
import { ClinicContextService } from './clinic-context.service';

const createMockSupabaseClient = () => {
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        gte: vi.fn(() => ({
          lt: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        contains: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      limit: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  }));

  return { from: mockFrom };
};

const mockAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'appt-1',
  clinic_id: 'clinic-123',
  patient_id: 'patient-1',
  patient_name: 'João Silva',
  appointment_date: new Date().toISOString(),
  status: 'Agendado',
  priority: 'Normal',
  room_number: null,
  timestamp: new Date().toISOString(),
  doctor_id: 'doctor-1',
  duration_minutes: 60,
  ...overrides,
});

const mockDoctor = (overrides: Partial<{ id: string; name: string }> = {}): { id: string; name: string } => ({
  id: 'doctor-1',
  name: 'Dr. Carlos Santos',
  ...overrides,
});

describe('AppointmentService', () => {
  let service: AppointmentService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let mockSupabaseService: Partial<SupabaseService>;
  let mockClinicContext: ClinicContextService;

  const CLINIC_ID = 'clinic-123';

  beforeEach(async () => {
    vi.clearAllMocks();

    mockClient = createMockSupabaseClient();

    mockSupabaseService = {
      clientInstance: mockClient as any,
    };

    mockClinicContext = new ClinicContextService();
    mockClinicContext.setContext(CLINIC_ID);

    await TestBed.configureTestingModule({
      providers: [
        AppointmentService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ClinicContextService, useValue: mockClinicContext },
      ],
    }).compileComponents();

    service = TestBed.inject(AppointmentService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getWaitlistForToday', () => {
    it('should fetch appointments for the current clinic within today\'s date range', async () => {
      const mockAppointments = [
        mockAppointment({ id: 'appt-1', patient_name: 'João Silva' }),
        mockAppointment({ id: 'appt-2', patient_name: 'Maria Oliveira' }),
      ];

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lt: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockAppointments, error: null })),
            })),
          })),
        })),
      }));

      mockClient.from = vi.fn(() => ({ select: mockSelect })) as any;

      const result = await service.getWaitlistForToday();

      expect(mockClient.from).toHaveBeenCalledWith('appointment');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual(mockAppointments);
    });

    it('should throw error when Supabase returns an error', async () => {
      const mockError = { message: 'Failed to fetch', code: '500' };

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lt: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: null, error: mockError })),
            })),
          })),
        })),
      }));

      mockClient.from = vi.fn(() => ({ select: mockSelect })) as any;

      await expect(service.getWaitlistForToday()).rejects.toThrow();
    });

    it('should query with correct date range filters', async () => {
      const orderMock = vi.fn(() => Promise.resolve({ data: [], error: null }));
      const ltMock = vi.fn(() => ({ order: orderMock }));
      const gteMock = vi.fn(() => ({ lt: ltMock }));
      const eqMock = vi.fn(() => ({ gte: gteMock, order: vi.fn(() => Promise.resolve({ data: [], error: null })) }));
      const selectMock = vi.fn(() => ({ eq: eqMock }));

      mockClient.from = vi.fn(() => ({ select: selectMock })) as any;

      await service.getWaitlistForToday();

      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('clinic_id', CLINIC_ID);
    });
  });

  describe('getDoctors', () => {
    it('should fetch doctors filtered by IAM bindings for the clinic', async () => {
      const mockDoctors = [
        mockDoctor({ id: 'doctor-1', name: 'Dr. Carlos' }),
        mockDoctor({ id: 'doctor-2', name: 'Dr. Ana' }),
      ];

      const orderMock = vi.fn(() => Promise.resolve({ data: mockDoctors, error: null }));
      const containsMock = vi.fn(() => ({ order: orderMock }));
      const selectMock = vi.fn(() => ({ contains: containsMock }));

      mockClient.from = vi.fn(() => ({ select: selectMock })) as any;

      const result = await service.getDoctors();

      expect(mockClient.from).toHaveBeenCalledWith('app_user');
      expect(selectMock).toHaveBeenCalledWith('id, name');
      expect(containsMock).toHaveBeenCalledWith('iam_bindings', { [CLINIC_ID]: ['roles/doctor'] });
      expect(result).toEqual(mockDoctors);
    });

    it('should return empty array when no doctors found', async () => {
      const orderMock = vi.fn(() => Promise.resolve({ data: [], error: null }));
      const containsMock = vi.fn(() => ({ order: orderMock }));
      const selectMock = vi.fn(() => ({ contains: containsMock }));

      mockClient.from = vi.fn(() => ({ select: selectMock })) as any;

      const result = await service.getDoctors();

      expect(result).toEqual([]);
    });

    it('should throw error when Supabase returns an error', async () => {
      const mockError = { message: 'Failed to fetch doctors', code: '500' };

      const containsMock = vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: null, error: mockError })),
      }));
      const selectMock = vi.fn(() => ({ contains: containsMock }));

      mockClient.from = vi.fn(() => ({ select: selectMock })) as any;

      await expect(service.getDoctors()).rejects.toThrow();
    });
  });

  describe('getRecentAppointments', () => {
    it('should fetch latest 100 appointments for the clinic', async () => {
      const mockAppointments = Array.from({ length: 5 }, (_, i) =>
        mockAppointment({ id: `appt-${i}`, patient_name: `Patient ${i}` })
      );

      const orderMock = vi.fn(() => Promise.resolve({ data: mockAppointments, error: null }));
      const limitMock = vi.fn(() => ({ order: orderMock }));
      const eqMock = vi.fn(() => ({ order: vi.fn(() => ({ limit: limitMock })) }));
      const selectMock = vi.fn(() => ({ eq: eqMock }));

      mockClient.from = vi.fn(() => ({ select: selectMock })) as any;

      const result = await service.getRecentAppointments();

      expect(mockClient.from).toHaveBeenCalledWith('appointment');
      expect(result).toEqual(mockAppointments);
    });
  });

  describe('createAppointment', () => {
    it('should create an appointment with correct payload', async () => {
      const payload: AppointmentPayload = {
        patient_id: 'patient-1',
        patient_name: 'Novo Paciente',
        appointment_date: new Date().toISOString(),
        doctor_id: 'doctor-1',
        duration_minutes: 30,
      };

      const createdAppointment = mockAppointment({
        ...payload,
        status: 'Agendado',
        priority: 'Normal',
      });

      const singleMock = vi.fn(() => Promise.resolve({ data: createdAppointment, error: null }));
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const insertMock = vi.fn(() => ({ select: selectMock }));
      const eqMock = vi.fn(() => ({ insert: insertMock }));
      const selectRootMock = vi.fn(() => ({ eq: eqMock }));

      mockClient.from = vi.fn(() => ({ select: selectRootMock })) as any;

      const result = await service.createAppointment(payload);

      expect(mockClient.from).toHaveBeenCalledWith('appointment');
      expect(insertMock).toHaveBeenCalledWith({
        clinic_id: CLINIC_ID,
        patient_id: payload.patient_id,
        patient_name: payload.patient_name,
        appointment_date: payload.appointment_date,
        doctor_id: payload.doctor_id,
        duration_minutes: payload.duration_minutes,
        status: 'Agendado',
        priority: 'Normal',
      });
      expect(result).toEqual(createdAppointment);
    });

    it('should use default duration_minutes of 60 when not provided', async () => {
      const payload: AppointmentPayload = {
        patient_id: 'patient-1',
        patient_name: 'Novo Paciente',
        appointment_date: new Date().toISOString(),
      };

      const createdAppointment = mockAppointment({
        ...payload,
        duration_minutes: 60,
      });

      let capturedInsert: any;
      const singleMock = vi.fn(() => Promise.resolve({ data: createdAppointment, error: null }));
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const insertMock = vi.fn((data) => {
        capturedInsert = data;
        return { select: selectMock };
      });
      const eqMock = vi.fn(() => ({ insert: insertMock }));
      const selectRootMock = vi.fn(() => ({ eq: eqMock }));

      mockClient.from = vi.fn(() => ({ select: selectRootMock })) as any;

      await service.createAppointment(payload);

      expect(capturedInsert.duration_minutes).toBe(60);
    });

    it('should throw error when insert fails', async () => {
      const payload: AppointmentPayload = {
        patient_id: 'patient-1',
        patient_name: 'Novo Paciente',
        appointment_date: new Date().toISOString(),
      };

      const mockError = { message: 'Insert failed', code: '500' };

      const singleMock = vi.fn(() => Promise.resolve({ data: null, error: mockError }));
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const insertMock = vi.fn(() => ({ select: selectMock }));
      const eqMock = vi.fn(() => ({ insert: insertMock }));
      const selectRootMock = vi.fn(() => ({ eq: eqMock }));

      mockClient.from = vi.fn(() => ({ select: selectRootMock })) as any;

      await expect(service.createAppointment(payload)).rejects.toThrow();
    });
  });

  describe('updateAppointmentStatus', () => {
    it('should update appointment status correctly', async () => {
      const appointmentId = 'appt-1';
      const newStatus = 'Aguardando';

      const updatedAppointment = mockAppointment({ id: appointmentId, status: newStatus });

      const singleMock = vi.fn(() => Promise.resolve({ data: updatedAppointment, error: null }));
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const updateMock = vi.fn(() => ({ eq: vi.fn(() => ({ select: selectMock })) }));
      const eqClinicMock = vi.fn(() => ({ update: updateMock }));
      const eqIdMock = vi.fn(() => ({ eq: eqClinicMock }));
      const selectRootMock = vi.fn(() => ({ eq: eqIdMock }));

      mockClient.from = vi.fn(() => ({ select: selectRootMock })) as any;

      const result = await service.updateAppointmentStatus(appointmentId, newStatus);

      expect(updateMock).toHaveBeenCalledWith({ status: newStatus });
      expect(result).toEqual(updatedAppointment);
    });

    it('should include clinic_id in update filter for security', async () => {
      const appointmentId = 'appt-1';
      const newStatus = 'Em Consulta';

      let capturedEqCalls: string[] = [];
      const singleMock = vi.fn(() => Promise.resolve({ data: mockAppointment(), error: null }));
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const updateMock = vi.fn(() => ({
        eq: vi.fn((col: string) => {
          capturedEqCalls.push(col);
          return {
            eq: vi.fn(() => ({ select: selectMock })),
          };
        }),
      }));
      const eqClinicMock = vi.fn(() => ({ update: updateMock }));
      const eqIdMock = vi.fn(() => ({ eq: eqClinicMock }));
      const selectRootMock = vi.fn(() => ({ eq: eqIdMock }));

      mockClient.from = vi.fn(() => ({ select: selectRootMock })) as any;

      await service.updateAppointmentStatus(appointmentId, newStatus);

      expect(capturedEqCalls).toContain('clinic_id');
      expect(capturedEqCalls).toContain('id');
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Update failed', code: '500' };

      const singleMock = vi.fn(() => Promise.resolve({ data: null, error: mockError }));
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ select: selectMock })),
        })),
      }));
      const eqClinicMock = vi.fn(() => ({ update: updateMock }));
      const eqIdMock = vi.fn(() => ({ eq: eqClinicMock }));
      const selectRootMock = vi.fn(() => ({ eq: eqIdMock }));

      mockClient.from = vi.fn(() => ({ select: selectRootMock })) as any;

      await expect(service.updateAppointmentStatus('appt-1', 'Aguardando')).rejects.toThrow();
    });
  });

  describe('clinic context validation', () => {
    it('should throw error when clinicId is null', async () => {
      mockClinicContext.setContext(null);

      await TestBed.configureTestingModule({
        providers: [
          AppointmentService,
          { provide: SupabaseService, useValue: mockSupabaseService },
          { provide: ClinicContextService, useValue: mockClinicContext },
        ],
      }).compileComponents();

      service = TestBed.inject(AppointmentService);

      await expect(service.getWaitlistForToday()).rejects.toThrow('Invalid Clinic Context');
    });

    it('should throw error when clinicId is "all"', async () => {
      mockClinicContext.setContext('all');

      await TestBed.configureTestingModule({
        providers: [
          AppointmentService,
          { provide: SupabaseService, useValue: mockSupabaseService },
          { provide: ClinicContextService, useValue: mockClinicContext },
        ],
      }).compileComponents();

      service = TestBed.inject(AppointmentService);

      await expect(service.getDoctors()).rejects.toThrow('Invalid Clinic Context');
    });
  });
});
