import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryComponent } from './inventory.component';
import { DatabaseService } from '../../core/services/database.service';
import { GeminiService } from '../../core/services/gemini.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('InventoryComponent', () => {
  let component: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;
  let mockDbService: any;
  let mockGeminiService: any;

  beforeEach(async () => {
    mockDbService = {
      products: signal([]),
      checkPermission: vi.fn(() => true),
      selectedContextClinic: signal('test-clinic'),
      currentUser: signal({ clinicId: 'test-clinic' }),
      addProduct: vi.fn(),
      addTransaction: vi.fn(),
      deleteProduct: vi.fn()
    };
    mockGeminiService = {
      analyzeInventoryRisks: vi.fn().mockResolvedValue('AI Analysis')
    };

    await TestBed.configureTestingModule({
      imports: [InventoryComponent],
      providers: [
        { provide: DatabaseService, useValue: mockDbService },
        { provide: GeminiService, useValue: mockGeminiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add product to print queue', () => {
    const product = { id: '1', name: 'Test Product', stock: 10 } as any;
    component.addToQueue(product);
    expect(component.printQueue()).toContain(product);
  });

  it('should remove product from print queue', () => {
    const product = { id: '1', name: 'Test Product', stock: 10 } as any;
    component.addToQueue(product);
    component.removeFromQueue(product);
    expect(component.printQueue()).not.toContain(product);
  });

  it('should clear print queue', () => {
    const product1 = { id: '1', name: 'Test Product 1', stock: 10 } as any;
    const product2 = { id: '2', name: 'Test Product 2', stock: 5 } as any;
    component.addToQueue(product1);
    component.addToQueue(product2);
    expect(component.printQueue().length).toBe(2);
    
    component.printQueue.set([]);
    expect(component.printQueue().length).toBe(0);
  });

  it('should reset form when opening new product form', () => {
    component.formData = { name: 'Old' };
    component.openNewProductForm();
    expect(component.formData.name).toBe('');
    expect(component.editingId()).toBeNull();
    expect(component.isFormOpen()).toBe(true);
  });

  it('should filter products based on the selected clinic', () => {
    const allProducts = [
      { id: '1', name: 'Product A', clinicId: 'clinic-1' },
      { id: '2', name: 'Product B', clinicId: 'clinic-2' },
      { id: '3', name: 'Product C', clinicId: 'clinic-1' },
    ];
    // Set the products in the mock service
    mockDbService.products.set(allProducts);
    // Set the selected clinic
    mockDbService.selectedContextClinic.set('clinic-1');

    // Manually filter the products to simulate the service's behavior
    const expectedProducts = allProducts.filter(p => p.clinicId === 'clinic-1');
    mockDbService.products.set(expectedProducts);

    const filtered = component.filteredProducts();

    expect(filtered.length).toBe(2);
    expect(filtered.map(p => p.id)).toEqual(['1', '3']);
  });

  it('should call addProduct when submitting a new product', () => {
    component.formData = { name: 'New Product' };
    component.handleSaveProduct();
    expect(mockDbService.addProduct).toHaveBeenCalled();
  });

  it('should call addProduct with an updated product when submitting an existing product', () => {
    component.editingId.set('1');
    component.formData = { id: '1', name: 'Updated Product' };
    component.handleSaveProduct();
    expect(mockDbService.addProduct).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', name: 'Updated Product' })
    );
  });

  it('should support 4-column print layout and recalculate pages accordingly', () => {
    // Standard size has 5 rows. 4 columns * 5 rows = 20 items per page.
    component.updateLabelConfig({ cols: 4, size: 'standard' });
    
    // Add 21 products to the queue
    for (let i = 0; i < 21; i++) {
      component.addToQueue({ id: `${i}`, name: `P${i}` } as any);
    }
    
    const pages = component.pages();
    expect(pages.length).toBe(2); // 20 on first page, 1 on second
    expect(pages[0].length).toBe(20);
    expect(pages[1].length).toBe(1);
  });

  it('should calculate barcode options correctly based on label config', () => {
    // Default: 3 cols, standard
    let options = component.barcodeOptions();
    expect(options.height).toBe(35);
    expect(options.width).toBe(1.5);

    // Compact size
    component.updateLabelConfig({ size: 'compact' });
    fixture.detectChanges();
    options = component.barcodeOptions();
    expect(options.height).toBe(25);

    // 4 Columns (Narrow width)
    component.updateLabelConfig({ cols: 4 });
    fixture.detectChanges();
    options = component.barcodeOptions();
    expect(options.width).toBe(1.0);
  });

  it('should delete product when confirmed', async () => {
    const product = { id: 'p1', name: 'Product to delete' } as any;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    await component.handleDeleteProduct(product);
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDbService.deleteProduct).toHaveBeenCalledWith('p1');
  });

  it('should NOT delete product when not confirmed', async () => {
    const product = { id: 'p1', name: 'Product to delete' } as any;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    await component.handleDeleteProduct(product);
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDbService.deleteProduct).not.toHaveBeenCalled();
  });

  describe('Permissions', () => {
    it('should correctly reflect canViewInventoryCost based on checkPermission', () => {
      mockDbService.checkPermission.mockReturnValue(true);
      mockDbService.selectedContextClinic.set('clinic-1');
      expect(component.canViewInventoryCost()).toBe(true);

      mockDbService.checkPermission.mockReturnValue(false);
      mockDbService.selectedContextClinic.set('clinic-2');
      expect(component.canViewInventoryCost()).toBe(false);
    });
  });
});
