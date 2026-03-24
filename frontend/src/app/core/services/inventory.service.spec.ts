import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { InventoryService, Product, CreateProductDto } from './inventory.service';
import { SupabaseService } from './supabase.service';
import { ClinicContextService } from './clinic-context.service';

// --- Mock Supabase Client ---
function createMockSupabaseClient() {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const mockClient = {
    from: mockFrom,
    rpc: mockRpc,
  };
  return { mockClient, mockFrom, mockRpc };
}

// --- Mock Data ---
const MOCK_CLINIC_ID = 'clinic-uuid-123';
const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    clinic_id: MOCK_CLINIC_ID,
    name: 'Seringa 10ml',
    category: 'Insumos',
    price: 2.5,
    cost: 1.0,
    min_stock: 10,
    current_stock: 25,
    barcode: '1234567890001',
  },
  {
    id: 'prod-2',
    clinic_id: MOCK_CLINIC_ID,
    name: 'Luva Cirúrgica',
    category: 'Insumos',
    price: 5.0,
    cost: 2.0,
    min_stock: 20,
    current_stock: 5, // below min_stock — low stock alert
    barcode: '1234567890002',
  },
  {
    id: 'prod-3',
    clinic_id: MOCK_CLINIC_ID,
    name: 'Esparadrapo',
    category: 'Curativos',
    price: 8.0,
    cost: 3.5,
    min_stock: 15,
    current_stock: 30,
    barcode: null,
  },
];

describe('InventoryService', () => {
  let service: InventoryService;
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;
  let mockSupabaseService: Partial<SupabaseService>;
  let mockClinicContext: Partial<ClinicContextService>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockSupabaseClient = createMockSupabaseClient();

    mockSupabaseService = {
      clientInstance: mockSupabaseClient.mockClient,
    };

    mockClinicContext = {
      selectedClinicId: vi.fn().mockReturnValue(MOCK_CLINIC_ID),
    };

    await TestBed.configureTestingModule({
      providers: [
        InventoryService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ClinicContextService, useValue: mockClinicContext },
      ],
    }).compileComponents();

    service = TestBed.inject(InventoryService);
  });

  // =========================================================================
  // getProducts()
  // =========================================================================
  describe('getProducts()', () => {
    it('should return products filtered by clinic_id ordered by name', async () => {
      const mockQuery = {
        select: vi.fn().mockResolvedValue({ data: MOCK_PRODUCTS, error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      mockSupabaseClient.mockFrom.mockReturnValue(mockQuery);

      const result = await service.getProducts();

      expect(mockSupabaseClient.mockFrom).toHaveBeenCalledWith('product');
      expect(mockQuery.eq).toHaveBeenCalledWith('clinic_id', MOCK_CLINIC_ID);
      expect(mockQuery.order).toHaveBeenCalledWith('name');
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Esparadrapo'); // alphabetical order
    });

    it('should map avg_cost_price DB column to cost property', async () => {
      const dbRow = {
        id: 'prod-x',
        clinic_id: MOCK_CLINIC_ID,
        name: 'Test Product',
        category: 'Test',
        price: 10,
        avg_cost_price: 4.5, // DB column name
        min_stock: 5,
        current_stock: 10,
        barcode: null,
      };
      const mockQuery = {
        select: vi.fn().mockResolvedValue({ data: [dbRow], error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      mockSupabaseClient.mockFrom.mockReturnValue(mockQuery);

      const [result] = await service.getProducts();

      expect(result.cost).toBe(4.5);
      expect((result as any).avg_cost_price).toBeUndefined();
    });

    it('should throw when Supabase returns an error', async () => {
      const mockQuery = {
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      mockSupabaseClient.mockFrom.mockReturnValue(mockQuery);

      await expect(service.getProducts()).rejects.toThrow('Database error');
    });

    it('should throw when clinic context is "all" (Super Admin global view)', async () => {
      mockClinicContext.selectedClinicId = vi.fn().mockReturnValue('all');

      await TestBed.configureTestingModule({
        providers: [
          InventoryService,
          { provide: SupabaseService, useValue: mockSupabaseService },
          { provide: ClinicContextService, useValue: mockClinicContext },
        ],
      }).compileComponents();

      const svc = TestBed.inject(InventoryService);

      await expect(svc.getProducts()).rejects.toThrow(
        'Invalid or missing Clinic Context for Inventory feature.',
      );
    });

    it('should throw when clinic context is null (no clinic selected)', async () => {
      mockClinicContext.selectedClinicId = vi.fn().mockReturnValue(null);

      await TestBed.configureTestingModule({
        providers: [
          InventoryService,
          { provide: SupabaseService, useValue: mockSupabaseService },
          { provide: ClinicContextService, useValue: mockClinicContext },
        ],
      }).compileComponents();

      const svc = TestBed.inject(InventoryService);

      await expect(svc.getProducts()).rejects.toThrow(
        'Invalid or missing Clinic Context for Inventory feature.',
      );
    });
  });

  // =========================================================================
  // createProduct()
  // =========================================================================
  describe('createProduct()', () => {
    const mockDto: CreateProductDto = {
      name: 'Gaze Estéril',
      category: 'Curativos',
      price: 12.0,
      cost: 6.0,
      min_stock: 10,
      current_stock: 50,
      barcode: '9998887776665',
    };

    it('should call RPC create_product_with_stock with correct parameters', async () => {
      const createdProduct: Product = { ...mockDto, id: 'new-prod-id', clinic_id: MOCK_CLINIC_ID };
      mockSupabaseClient.mockRpc.mockResolvedValue({ data: createdProduct, error: null });

      const result = await service.createProduct(mockDto);

      expect(mockSupabaseClient.mockRpc).toHaveBeenCalledWith('create_product_with_stock', {
        p_clinic_id: MOCK_CLINIC_ID,
        p_name: mockDto.name,
        p_category: mockDto.category,
        p_price: mockDto.price,
        p_cost: mockDto.cost,
        p_min_stock: mockDto.min_stock,
        p_current_stock: mockDto.current_stock,
        p_barcode: mockDto.barcode,
      });
      expect(result).toEqual(createdProduct);
    });

    it('should default cost to 0 when falsy', async () => {
      const dtoWithoutCost: CreateProductDto = { ...mockDto, cost: 0 as any };
      mockSupabaseClient.mockRpc.mockResolvedValue({ data: null, error: null });

      await service.createProduct(dtoWithoutCost);

      expect(mockSupabaseClient.mockRpc).toHaveBeenCalledWith('create_product_with_stock', {
        p_clinic_id: MOCK_CLINIC_ID,
        p_name: mockDto.name,
        p_category: mockDto.category,
        p_price: mockDto.price,
        p_cost: 0,
        p_min_stock: mockDto.min_stock,
        p_current_stock: mockDto.current_stock,
        p_barcode: mockDto.barcode,
      });
    });

    it('should default min_stock and current_stock to 0 when falsy', async () => {
      const dtoWithDefaults: CreateProductDto = {
        ...mockDto,
        min_stock: 0 as any,
        current_stock: 0 as any,
      };
      mockSupabaseClient.mockRpc.mockResolvedValue({ data: null, error: null });

      await service.createProduct(dtoWithDefaults);

      const callArgs = mockSupabaseClient.mockRpc.mock.calls[0][1];
      expect(callArgs.p_min_stock).toBe(0);
      expect(callArgs.p_current_stock).toBe(0);
    });

    it('should throw when RPC returns an error', async () => {
      mockSupabaseClient.mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      await expect(service.createProduct(mockDto)).rejects.toThrow('RPC failed');
    });
  });
});
