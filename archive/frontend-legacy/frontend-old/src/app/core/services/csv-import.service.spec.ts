import { TestBed } from '@angular/core/testing';
import { CsvImportService } from './csv-import.service';
import { Product } from '../models/types';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

describe('CsvImportService', () => {
  let service: CsvImportService;

  beforeAll(() => {
    if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
      Blob.prototype.text = function() {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(this);
        });
      };
    }
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CsvImportService],
    });
    service = TestBed.inject(CsvImportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('CSV Parsing', () => {
    it('should parse a simple CSV file', async () => {
      const csvContent = 'header1,header2\nvalue1,value2';
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const result = await service.parseCsv(blob);
      expect(result).toEqual([{ header1: 'value1', header2: 'value2' }]);
    });

    it('should handle quoted values in CSV', async () => {
      const csvContent = 'header1,header2\n"value,1",value2';
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const result = await service.parseCsv(blob);
      expect(result).toEqual([{ header1: 'value,1', header2: 'value2' }]);
    });
  });

  describe('Product Mapping', () => {
    it('should map a CSV row to a Product object', () => {
      const row = {
        'Código de barras': '12345',
        'Produto': 'Test Product',
        'Valor de venda': '10,50',
        'Grupo': 'Test Category',
        'Estoque atualizado': '100',
        'Valor de custo': '5,25',
        'Validade': '12/25',
        'Observações': 'Test Note',
      };
      const product = service.mapToProduct(row, 'clinic-1');
      expect(product).toEqual({
        id: '12345',
        clinicId: 'clinic-1',
        name: 'Test Product',
        price: 10.5,
        category: 'Test Category',
        stock: 100,
        costPrice: 5.25,
        expiryDate: '2025-12-31',
        notes: 'Test Note',
        minStock: 5,
        supplier: 'CSV Import',
      });
    });
  });

  describe('Conflict Detection', () => {
    it('should detect a new product', () => {
      const importedProducts: Product[] = [
        { id: 'p1', name: 'New Product', stock: 10, clinicId: 'c1', price: 0, category: '', costPrice: 0, minStock: 0, supplier: '' },
      ];
      const existingProducts: Product[] = [];
      const conflicts = service.detectConflicts(importedProducts, existingProducts);
      expect(conflicts).toEqual([{ type: 'NEW', product: importedProducts[0] }]);
    });

    it('should detect an updated product based on SKU', () => {
      const importedProducts: Product[] = [
        { id: 'p1', name: 'Product 1', stock: 15, clinicId: 'c1', price: 0, category: '', costPrice: 0, minStock: 0, supplier: '' },
      ];
      const existingProducts: Product[] = [
        { id: 'p1', name: 'Product 1', stock: 10, clinicId: 'c1', price: 0, category: '', costPrice: 0, minStock: 0, supplier: '' },
      ];
      const conflicts = service.detectConflicts(importedProducts, existingProducts);
      expect(conflicts[0].type).toBe('UPDATE');
      expect(conflicts[0].matchType).toBe('SKU');
      expect(conflicts[0].diffs.stock.new).toBe(15);
    });

    it('should detect an updated product based on name', () => {
      const importedProducts: Product[] = [
        { id: 'p2', name: 'Product 2', stock: 20, clinicId: 'c1', price: 0, category: '', costPrice: 0, minStock: 0, supplier: '' },
      ];
      const existingProducts: Product[] = [
        { id: 'p1', name: 'Product 2', stock: 10, clinicId: 'c1', price: 0, category: '', costPrice: 0, minStock: 0, supplier: '' },
      ];
      const conflicts = service.detectConflicts(importedProducts, existingProducts);
      expect(conflicts[0].type).toBe('UPDATE');
      expect(conflicts[0].matchType).toBe('NAME');
      expect(conflicts[0].diffs.stock.new).toBe(20);
    });
  });
});
