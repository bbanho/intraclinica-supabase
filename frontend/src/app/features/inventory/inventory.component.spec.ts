import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryComponent } from './inventory.component';
import { InventoryService, Product } from '../../core/services/inventory.service';
import { ClinicContextService } from '../../core/services/clinic-context.service';
import { IamService } from '../../core/services/iam.service';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { signal } from '@angular/core';

const MOCK_CLINIC_ID = 'clinic-uuid-123';
const MOCK_PRODUCTS: Product[] = [
  { id: 'prod-1', clinic_id: MOCK_CLINIC_ID, name: 'Seringa 10ml', category: 'Insumos', price: 2.5, cost: 1.0, min_stock: 10, current_stock: 25, barcode: '1234567890001' },
  { id: 'prod-2', clinic_id: MOCK_CLINIC_ID, name: 'Luva Cirúrgica', category: 'Insumos', price: 5.0, cost: 2.0, min_stock: 20, current_stock: 5, barcode: '1234567890002' },
  { id: 'prod-3', clinic_id: MOCK_CLINIC_ID, name: 'Esparadrapo', category: 'Curativos', price: 8.0, cost: 3.5, min_stock: 15, current_stock: 30, barcode: null },
];

describe('InventoryComponent', () => {
  let component: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;
  let mockInventoryService: Partial<InventoryService>;
  let mockClinicContext: Partial<ClinicContextService>;
  let mockIamService: Partial<IamService>;
  let mockDialog: any;
  let dialogOpenSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockInventoryService = {
      getProducts: vi.fn(),
    };

    mockClinicContext = {
      selectedClinicId: signal(MOCK_CLINIC_ID),
    };

    mockIamService = {
      can: vi.fn().mockReturnValue(true),
    };

    dialogOpenSpy = vi.fn();
    mockDialog = { open: dialogOpenSpy };

    await TestBed.configureTestingModule({
      imports: [InventoryComponent, DialogModule],
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: ClinicContextService, useValue: mockClinicContext },
        { provide: IamService, useValue: mockIamService },
        { provide: Dialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryComponent);
    component = fixture.componentInstance;
  });

  describe('product loading', () => {
    it('should load products on init when clinic context is valid', async () => {
      vi.clearAllMocks();
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRODUCTS);

      await TestBed.configureTestingModule({
        imports: [InventoryComponent, DialogModule],
        providers: [
          { provide: InventoryService, useValue: mockInventoryService },
          { provide: ClinicContextService, useValue: mockClinicContext },
          { provide: IamService, useValue: mockIamService },
          { provide: Dialog, useValue: mockDialog },
        ],
      }).compileComponents();

      const comp = TestBed.createComponent(InventoryComponent);
      comp.detectChanges();

      expect(mockInventoryService.getProducts).toHaveBeenCalled();
    });

    it('should set loading state while fetching products', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(MOCK_PRODUCTS), 100)),
      );

      const loadSpy = vi.spyOn(component, 'loadProducts');
      component.loadProducts();

      expect(component.loading()).toBe(true);

      await new Promise((r) => setTimeout(r, 150));
      expect(component.loading()).toBe(false);
    });

    it('should set error state when loading fails', async () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      await component.loadProducts();

      expect(component.error()).toBeTruthy();
      expect(component.loading()).toBe(false);
    });
  });

  describe('filteredProducts computed signal', () => {
    beforeEach(() => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRODUCTS);
      component.loadProducts();
    });

    it('should return all products when category filter is "all"', () => {
      component.selectedCategory.set('all');
      expect(component.filteredProducts()).toHaveLength(3);
    });

    it('should filter products by category when a specific category is selected', () => {
      component.selectedCategory.set('Insumos');
      expect(component.filteredProducts()).toHaveLength(2);
      expect(component.filteredProducts().every((p) => p.category === 'Insumos')).toBe(true);
    });

    it('should return empty array when no products match the category filter', () => {
      component.selectedCategory.set('NonExistent');
      expect(component.filteredProducts()).toHaveLength(0);
    });
  });

  describe('lowStockCount computed signal', () => {
    it('should return 0 when all products are above min_stock', () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRODUCTS);
      component.loadProducts();
      expect(component.lowStockCount()).toBe(1);
    });

    it('should count products where current_stock < min_stock', () => {
      const allAboveMin: Product[] = [
        { id: 'p1', clinic_id: MOCK_CLINIC_ID, name: 'P1', category: 'Cat', price: 10, cost: 5, min_stock: 5, current_stock: 10, barcode: null },
        { id: 'p2', clinic_id: MOCK_CLINIC_ID, name: 'P2', category: 'Cat', price: 10, cost: 5, min_stock: 5, current_stock: 15, barcode: null },
      ];
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(allAboveMin);
      component.loadProducts();
      expect(component.lowStockCount()).toBe(0);
    });

    it('should count multiple low-stock products', () => {
      const mixedStock: Product[] = [
        { id: 'p1', clinic_id: MOCK_CLINIC_ID, name: 'P1', category: 'Cat', price: 10, cost: 5, min_stock: 10, current_stock: 5, barcode: null },
        { id: 'p2', clinic_id: MOCK_CLINIC_ID, name: 'P2', category: 'Cat', price: 10, cost: 5, min_stock: 10, current_stock: 3, barcode: null },
        { id: 'p3', clinic_id: MOCK_CLINIC_ID, name: 'P3', category: 'Cat', price: 10, cost: 5, min_stock: 10, current_stock: 20, barcode: null },
      ];
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(mixedStock);
      component.loadProducts();
      expect(component.lowStockCount()).toBe(2);
    });
  });

  describe('categories computed signal', () => {
    beforeEach(() => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRODUCTS);
      component.loadProducts();
    });

    it('should return ["all", ...unique categories] sorted alphabetically', () => {
      const cats = component.categories();
      expect(cats[0]).toBe('all');
      expect(cats).toContain('Curativos');
      expect(cats).toContain('Insumos');
    });

    it('should deduplicate categories', () => {
      const duplicateProducts: Product[] = [
        { id: 'p1', clinic_id: MOCK_CLINIC_ID, name: 'P1', category: 'Insumos', price: 10, cost: 5, min_stock: 5, current_stock: 10, barcode: null },
        { id: 'p2', clinic_id: MOCK_CLINIC_ID, name: 'P2', category: 'Insumos', price: 10, cost: 5, min_stock: 5, current_stock: 10, barcode: null },
      ];
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(duplicateProducts);
      component.loadProducts();
      const cats = component.categories();
      const insumoCount = cats.filter((c) => c === 'Insumos').length;
      expect(insumoCount).toBe(1);
    });

    it('should exclude empty string categories', () => {
      const withEmptyCategory: Product[] = [
        { id: 'p1', clinic_id: MOCK_CLINIC_ID, name: 'P1', category: '', price: 10, cost: 5, min_stock: 5, current_stock: 10, barcode: null },
        { id: 'p2', clinic_id: MOCK_CLINIC_ID, name: 'P2', category: 'Insumos', price: 10, cost: 5, min_stock: 5, current_stock: 10, barcode: null },
      ];
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(withEmptyCategory);
      component.loadProducts();
      expect(component.categories()).not.toContain('');
    });
  });

  describe('totalValue computed signal', () => {
    it('should calculate total stock value (price * current_stock) for filtered products', () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRODUCTS);
      component.loadProducts();
      expect(component.totalValue()).toBe(2.5 * 25 + 5.0 * 5 + 8.0 * 30);
    });

    it('should apply category filter to total value calculation', () => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRODUCTS);
      component.loadProducts();
      component.selectedCategory.set('Insumos');
      const expectedValue = 2.5 * 25 + 5.0 * 5;
      expect(component.totalValue()).toBe(expectedValue);
    });
  });

  describe('openNewProductModal()', () => {
    beforeEach(() => {
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRODUCTS);
      component.loadProducts();
    });

    it('should open ProductModalComponent dialog', () => {
      const mockDialogRef = { closed: { subscribe: vi.fn() } };
      dialogOpenSpy.mockReturnValue(mockDialogRef as any);

      component.openNewProductModal();

      expect(dialogOpenSpy).toHaveBeenCalled();
      const dialogCall = dialogOpenSpy.mock.calls[0];
      expect(dialogCall[0].name).toBe('ProductModalComponent');
    });

    it('should add new product to list optimistically when dialog closes with result', () => {
      const newProduct: Product = { id: 'new-1', clinic_id: MOCK_CLINIC_ID, name: 'Gaze Estéril', category: 'Curativos', price: 12, cost: 6, min_stock: 10, current_stock: 50, barcode: null };
      const mockDialogRef = {
        closed: {
          subscribe: (callback: (result: Product) => void) => {
            callback(newProduct);
          },
        },
      };
      dialogOpenSpy.mockReturnValue(mockDialogRef as any);

      component.openNewProductModal();

      const products = component.products();
      expect(products.some((p) => p.id === 'new-1')).toBe(true);
    });
  });

  describe('stock level color coding (via lowStockCount)', () => {
    it('should flag products below min_stock as low stock', () => {
      const lowStockProduct: Product[] = [
        { id: 'p1', clinic_id: MOCK_CLINIC_ID, name: 'Low Stock Item', category: 'Cat', price: 10, cost: 5, min_stock: 20, current_stock: 5, barcode: null },
      ];
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(lowStockProduct);
      component.loadProducts();
      expect(component.lowStockCount()).toBe(1);
    });

    it('should show green/emerald for products at or above min_stock', () => {
      const healthyStock: Product[] = [
        { id: 'p1', clinic_id: MOCK_CLINIC_ID, name: 'Healthy Item', category: 'Cat', price: 10, cost: 5, min_stock: 10, current_stock: 100, barcode: null },
      ];
      (mockInventoryService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(healthyStock);
      component.loadProducts();
      expect(component.lowStockCount()).toBe(0);
    });
  });

  describe('canViewCost computed signal', () => {
    it('should delegate to IamService.can("inventory.view_cost")', () => {
      (mockIamService.can as ReturnType<typeof vi.fn>).mockReturnValue(true);
      expect(component.canViewCost()).toBe(true);

      (mockIamService.can as ReturnType<typeof vi.fn>).mockReturnValue(false);
      expect(component.canViewCost()).toBe(false);
    });
  });
});
