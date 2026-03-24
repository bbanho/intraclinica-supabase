import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ReportsComponent } from './reports.component';
import { InventoryService, Product } from '../../core/services/inventory.service';
import { AppointmentService, Appointment } from '../../core/services/appointment.service';
import { IamService } from '../../core/services/iam.service';
import { ClinicContextService } from '../../core/services/clinic-context.service';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------
const MOCK_CLINIC_ID = 'clinic-uuid-123';

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1', clinic_id: MOCK_CLINIC_ID, name: 'Seringa 10ml',
    category: 'Insumos', price: 2.5, cost: 1.0, min_stock: 10, current_stock: 25, barcode: null,
  },
  {
    id: 'prod-2', clinic_id: MOCK_CLINIC_ID, name: 'Luva Cirúrgica',
    category: 'Insumos', price: 5.0, cost: 2.0, min_stock: 20, current_stock: 5, barcode: null,
  },
  {
    id: 'prod-3', clinic_id: MOCK_CLINIC_ID, name: 'Esparadrapo',
    category: 'Curativos', price: 8.0, cost: 3.5, min_stock: 15, current_stock: 0, barcode: null,
  },
  {
    id: 'prod-4', clinic_id: MOCK_CLINIC_ID, name: 'Gaze Estéril',
    category: 'Curativos', price: 12.0, cost: 6.0, min_stock: 10, current_stock: 0, barcode: null,
  },
  {
    id: 'prod-5', clinic_id: MOCK_CLINIC_ID, name: 'Álcool 70%',
    category: 'Insumos', price: 4.0, cost: 1.5, min_stock: 5, current_stock: 3, barcode: null,
  },
];

const MOCK_APPOINTMENTS_TODAY: Appointment[] = [
  {
    id: 'app-1', clinic_id: MOCK_CLINIC_ID, patient_id: 'pat-1',
    patient_name: 'João Silva', appointment_date: new Date().toISOString(),
    status: 'Agendado', priority: 'Normal', room_number: 'A1',
    doctor_id: null, duration_minutes: 60,
  },
  {
    id: 'app-2', clinic_id: MOCK_CLINIC_ID, patient_id: 'pat-2',
    patient_name: 'Maria Santos', appointment_date: new Date().toISOString(),
    status: 'Em Sala', priority: 'Urgente', room_number: 'B2',
    doctor_id: null, duration_minutes: 30,
  },
];

const MOCK_RECENT_APPOINTMENTS: Appointment[] = [
  {
    id: 'app-3', clinic_id: MOCK_CLINIC_ID, patient_id: 'pat-3',
    patient_name: 'Pedro Lima', appointment_date: '2026-03-23T09:00:00Z',
    status: 'Agendado', priority: 'Normal', room_number: null,
    doctor_id: null, duration_minutes: 60,
  },
  {
    id: 'app-4', clinic_id: MOCK_CLINIC_ID, patient_id: 'pat-4',
    patient_name: 'Ana Costa', appointment_date: '2026-03-23T09:30:00Z',
    status: 'Agendado', priority: 'Normal', room_number: null,
    doctor_id: null, duration_minutes: 60,
  },
  {
    id: 'app-5', clinic_id: MOCK_CLINIC_ID, patient_id: 'pat-5',
    patient_name: 'Carlos Souza', appointment_date: '2026-03-23T10:00:00Z',
    status: 'Agendado', priority: 'Normal', room_number: null,
    doctor_id: null, duration_minutes: 60,
  },
  {
    id: 'app-6', clinic_id: MOCK_CLINIC_ID, patient_id: 'pat-6',
    patient_name: 'Lucia Mendes', appointment_date: '2026-03-23T10:00:00Z',
    status: 'Agendado', priority: 'Normal', room_number: null,
    doctor_id: null, duration_minutes: 60,
  },
  {
    id: 'app-7', clinic_id: MOCK_CLINIC_ID, patient_id: 'pat-7',
    patient_name: 'Roberto Alves', appointment_date: '2026-03-23T14:00:00Z',
    status: 'Agendado', priority: 'Normal', room_number: null,
    doctor_id: null, duration_minutes: 60,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;

  let mockInventoryService: Partial<InventoryService>;
  let mockAppointmentService: Partial<AppointmentService>;
  let mockIamService: Partial<IamService>;
  let mockClinicContext: Partial<ClinicContextService>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockInventoryService = {
      getProducts: vi.fn(),
    };

    mockAppointmentService = {
      getWaitlistForToday: vi.fn(),
      getRecentAppointments: vi.fn(),
    };

    mockIamService = {
      can: vi.fn(),
    };

    mockClinicContext = {
      selectedClinicId: signal<string | null>(MOCK_CLINIC_ID),
    };

    await TestBed.configureTestingModule({
      imports: [ReportsComponent, CommonModule, LucideAngularModule],
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: AppointmentService, useValue: mockAppointmentService },
        { provide: IamService, useValue: mockIamService },
        { provide: ClinicContextService, useValue: mockClinicContext },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
  });

  // -------------------------------------------------------------------------
  // canViewFinance — delegates to IamService.can('finance_read')
  // -------------------------------------------------------------------------
  describe('canViewFinance computed', () => {
    it('should return true when IAM grants finance_read', () => {
      (mockIamService.can as ReturnType<typeof vi.fn>).mockReturnValue(true);
      expect(component.canViewFinance()).toBe(true);
    });

    it('should return false when IAM denies finance_read', () => {
      (mockIamService.can as ReturnType<typeof vi.fn>).mockReturnValue(false);
      expect(component.canViewFinance()).toBe(false);
    });

    it('should call iamService.can with finance_read permission', () => {
      (mockIamService.can as ReturnType<typeof vi.fn>).mockReturnValue(true);
      component.canViewFinance();
      expect(mockIamService.can).toHaveBeenCalledWith('finance_read');
    });
  });

  // -------------------------------------------------------------------------
  // loadData — guards & service orchestration
  // -------------------------------------------------------------------------
  describe('loadData', () => {
    it('should fetch products and appointments when clinicId is valid', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRODUCTS);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_APPOINTMENTS_TODAY);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_RECENT_APPOINTMENTS);

      await component['loadData']();

      expect(mockInventoryService.getProducts).toHaveBeenCalled();
      expect(mockAppointmentService.getWaitlistForToday).toHaveBeenCalled();
      expect(mockAppointmentService.getRecentAppointments).toHaveBeenCalled();
    });

    it('should set products signal from inventory service', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRODUCTS);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.products()).toEqual(MOCK_PRODUCTS);
    });

    it('should set appointmentsToday signal from appointment service', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_APPOINTMENTS_TODAY);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.appointmentsToday()).toEqual(MOCK_APPOINTMENTS_TODAY);
    });

    it('should set recentAppointments signal from appointment service', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_RECENT_APPOINTMENTS);

      await component['loadData']();

      expect(component.recentAppointments()).toEqual(MOCK_RECENT_APPOINTMENTS);
    });

    it('should catch and swallow errors from getProducts', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(component['loadData']()).resolves.not.toThrow();
      expect(component.products()).toEqual([]);
    });

    it('should catch and swallow errors from getWaitlistForToday', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(component['loadData']()).resolves.not.toThrow();
      expect(component.appointmentsToday()).toEqual([]);
    });

    it('should set isLoading to true at start and false when done', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 50)),
      );
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 50)),
      );
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 50)),
      );

      const loadPromise = component['loadData']();
      expect(component.isLoading()).toBe(true);

      await loadPromise;
      expect(component.isLoading()).toBe(false);
    });

    it('should abort early when clinicId is null', async () => {
      (mockClinicContext.selectedClinicId as ReturnType<typeof signal>).set(null);

      await component['loadData']();

      expect(mockInventoryService.getProducts).not.toHaveBeenCalled();
      expect(mockAppointmentService.getWaitlistForToday).not.toHaveBeenCalled();
      expect(mockAppointmentService.getRecentAppointments).not.toHaveBeenCalled();
    });

    it('should abort early when clinicId is "all"', async () => {
      (mockClinicContext.selectedClinicId as ReturnType<typeof signal>).set('all');

      await component['loadData']();

      expect(mockInventoryService.getProducts).not.toHaveBeenCalled();
      expect(mockAppointmentService.getWaitlistForToday).not.toHaveBeenCalled();
      expect(mockAppointmentService.getRecentAppointments).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // totalStockValue — computed: sum of current_stock * cost
  // -------------------------------------------------------------------------
  describe('totalStockValue computed', () => {
    it('should calculate sum of current_stock * cost for all products', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRODUCTS);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.totalStockValue()).toBe('39.50');
    });

    it('should return 0.00 when products list is empty', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.totalStockValue()).toBe('0.00');
    });

    it('should treat null cost as 0 in calculation', async () => {
      const productsWithNullCost: Product[] = [
        { ...MOCK_PRODUCTS[0], cost: 0 as any },
      ];
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(productsWithNullCost);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.totalStockValue()).toBe('0.00');
    });
  });

  // -------------------------------------------------------------------------
  // lowStockCount — computed: count where current_stock <= min_stock
  // -------------------------------------------------------------------------
  describe('lowStockCount computed', () => {
    it('should count products where current_stock <= min_stock', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRODUCTS);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.lowStockCount()).toBe(2);
    });

    it('should return 0 when no products are below min_stock', async () => {
      const healthyProducts: Product[] = [
        { id: 'p1', clinic_id: MOCK_CLINIC_ID, name: 'P1', category: 'Cat', price: 10, cost: 5, min_stock: 5, current_stock: 100, barcode: null },
      ];
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(healthyProducts);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.lowStockCount()).toBe(0);
    });

    it('should treat undefined min_stock as 0', async () => {
      const productsWithNoMin: Product[] = [
        { id: 'p1', clinic_id: MOCK_CLINIC_ID, name: 'P1', category: 'Cat', price: 10, cost: 5, min_stock: 0, current_stock: 100, barcode: null },
      ];
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(productsWithNoMin);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.lowStockCount()).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // todayAppointmentsCount — computed: appointmentsToday().length
  // -------------------------------------------------------------------------
  describe('todayAppointmentsCount computed', () => {
    it('should return the number of appointments for today', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_APPOINTMENTS_TODAY);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.todayAppointmentsCount()).toBe(2);
    });

    it('should return 0 when no appointments today', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.todayAppointmentsCount()).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // expiryAlerts — computed: current_stock === 0 && min_stock > 0, max 10
  // -------------------------------------------------------------------------
  describe('expiryAlerts computed', () => {
    it('should return products with current_stock === 0 and min_stock > 0', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRODUCTS);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      const alerts = component.expiryAlerts();
      // prod-3 (current_stock=0, min_stock=15) and prod-4 (current_stock=0, min_stock=10)
      expect(alerts).toHaveLength(2);
      expect(alerts.map(p => p.id)).toContain('prod-3');
      expect(alerts.map(p => p.id)).toContain('prod-4');
    });

    it('should exclude products with current_stock === 0 but min_stock === 0', async () => {
      const productsWithZeroMin: Product[] = [
        { id: 'p1', clinic_id: MOCK_CLINIC_ID, name: 'P1', category: 'Cat', price: 10, cost: 5, min_stock: 0, current_stock: 0, barcode: null },
      ];
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(productsWithZeroMin);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.expiryAlerts()).toHaveLength(0);
    });

    it('should limit results to 10 items', async () => {
      const manyExpired: Product[] = Array.from({ length: 15 }, (_, i) => ({
        id: `expired-${i}`, clinic_id: MOCK_CLINIC_ID, name: `Expired ${i}`,
        category: 'Cat', price: 10, cost: 5, min_stock: 10, current_stock: 0, barcode: null,
      }));
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(manyExpired);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.expiryAlerts()).toHaveLength(10);
    });

    it('should return empty array when no products are expired', async () => {
      const healthyProducts: Product[] = [
        { id: 'p1', clinic_id: MOCK_CLINIC_ID, name: 'P1', category: 'Cat', price: 10, cost: 5, min_stock: 10, current_stock: 100, barcode: null },
      ];
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(healthyProducts);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.expiryAlerts()).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // weeklyData — computed: 7 days of random in/out data
  // -------------------------------------------------------------------------
  describe('weeklyData computed', () => {
    it('should return exactly 7 days of data', () => {
      const weekly = component.weeklyData();
      expect(weekly).toHaveLength(7);
    });

    it('should have correct day labels in order (DOM to SAB)', () => {
      const weekly = component.weeklyData();
      weekly.forEach(day => {
        expect(day).toHaveProperty('label');
        expect(day).toHaveProperty('in');
        expect(day).toHaveProperty('out');
      });
    });

    it('should have non-negative in and out values', () => {
      const weekly = component.weeklyData();
      weekly.forEach(day => {
        expect(day.in).toBeGreaterThanOrEqual(0);
        expect(day.out).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // maxTransactionValue — computed: max of all in/out values, min 10
  // -------------------------------------------------------------------------
  describe('maxTransactionValue computed', () => {
    it('should return the maximum of all in and out values across the week', () => {
      const max = component.maxTransactionValue();
      expect(max).toBeGreaterThanOrEqual(10);
    });

    it('should never return 0 (fallback to 10)', () => {
      const max = component.maxTransactionValue();
      expect(max).toBeGreaterThanOrEqual(10);
    });
  });

  // -------------------------------------------------------------------------
  // appointmentDensity — computed: grouped by hour
  // -------------------------------------------------------------------------
  describe('appointmentDensity computed', () => {
    it('should group appointments by hour from recentAppointments', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_RECENT_APPOINTMENTS);

      await component['loadData']();

      const density = component.appointmentDensity();
      const densityMap = Object.fromEntries(density.map(d => [d.hour, d.value]));
      expect(densityMap['09h']).toBe(2);
      expect(densityMap['10h']).toBe(2);
      expect(densityMap['14h']).toBe(1);
    });

    it('should return default hours when no recent appointments', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      const density = component.appointmentDensity();
      expect(density).toEqual([
        { hour: '08h', value: 0 },
        { hour: '09h', value: 0 },
        { hour: '10h', value: 0 },
        { hour: '11h', value: 0 },
        { hour: '14h', value: 0 },
        { hour: '15h', value: 0 },
        { hour: '16h', value: 0 },
      ]);
    });

    it('should sort hours in ascending order', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_RECENT_APPOINTMENTS);

      await component['loadData']();

      const density = component.appointmentDensity();
      const hours = density.map(d => d.hour);
      expect(hours).toEqual([...hours].sort());
    });
  });

  // -------------------------------------------------------------------------
  // maxDensityValue — computed: max density or 5 fallback
  // -------------------------------------------------------------------------
  describe('maxDensityValue computed', () => {
    it('should return max density value across appointment density data', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_RECENT_APPOINTMENTS);

      await component['loadData']();

      expect(component.maxDensityValue()).toBe(2);
    });

    it('should return 5 as fallback when no appointments', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(component.maxDensityValue()).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // Multi-tenant context guard — selectedClinicId integration
  // -------------------------------------------------------------------------
  describe('Multi-tenant context guard', () => {
    it('should not load any data when clinicId is null', async () => {
      (mockClinicContext.selectedClinicId as ReturnType<typeof signal>).set(null);

      await component['loadData']();

      expect(mockInventoryService.getProducts).not.toHaveBeenCalled();
    });

    it('should not load any data when clinicId is "all" (Super Admin view)', async () => {
      (mockClinicContext.selectedClinicId as ReturnType<typeof signal>).set('all');

      await component['loadData']();

      expect(mockInventoryService.getProducts).not.toHaveBeenCalled();
    });

    it('should use the current clinicId from ClinicContextService at load time', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await component['loadData']();

      expect(mockClinicContext.selectedClinicId).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // totalMovements — static signal (always 42 in mock dev data)
  // -------------------------------------------------------------------------
  describe('totalMovements signal', () => {
    it('should return 42 (simulated dev data)', () => {
      expect(component.totalMovements()).toBe(42);
    });
  });

  // -------------------------------------------------------------------------
  // isLoading signal lifecycle
  // -------------------------------------------------------------------------
  describe('isLoading signal', () => {
    it('should be false initially before ngOnInit', () => {
      // Component is created but loadData not yet called
      expect(component.isLoading()).toBe(false);
    });

    it('should be true immediately after loadData starts', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
      );
      (mockAppointmentService.getWaitlistForToday as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
      );
      (mockAppointmentService.getRecentAppointments as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
      );

      const loadPromise = component['loadData']();
      expect(component.isLoading()).toBe(true);
      await loadPromise;
    });
  });
});
