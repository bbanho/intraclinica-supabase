import { Injectable } from '@angular/core';
import { Product } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class CsvImportService {

  constructor() { }

  async parseCsv(file: File | Blob): Promise<any[]> {
    const text = await file.text();
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Handle quoted values (e.g., "41,35")
      const values = [];
      let currentVal = '';
      let insideQuote = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          values.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim());

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
    return data;
  }

  mapToProduct(row: any, clinicId: string): Product {
    // Helper to parse currency robustly:
    // "41,35" -> 41.35
    // "125.8" -> 125.8
    // "690"   -> 690.0
    // 690     -> 690.0
    const parseCurrency = (val: any) => {
      if (val === undefined || val === null || val === '') return 0;
      if (typeof val === 'number') return val;
      
      const strVal = String(val).trim();
      
      // If it contains a comma, replace it with a dot
      // Use logic to handle thousands separators if necessary, 
      // but for this simple CSV, assuming comma is decimal separator if present.
      let normalized = strVal.replace(',', '.');
      
      const num = parseFloat(normalized);
      return isNaN(num) ? 0 : num;
    };

    // Helper to parse date "07/26" -> "2026-07-31" (End of month)
    const parseDate = (val: string) => {
      if (!val) return undefined;
      
      const parts = val.split('/');
      
      // Format MM/YY
      if (parts.length === 2) {
        const month = parseInt(parts[0], 10);
        const year = 2000 + parseInt(parts[1], 10);
        // Get last day of month
        const date = new Date(year, month, 0); 
        return date.toISOString().split('T')[0];
      }
      
      // Format DD/MM/YYYY
      if (parts.length === 3) {
         const day = parts[0].padStart(2, '0');
         const month = parts[1].padStart(2, '0');
         const year = parts[2];
         return `${year}-${month}-${day}`;
      }

      return undefined; 
    };

    return {
      id: row['Código de barras'] || row['Código de barras (repetido)'] || crypto.randomUUID(),
      clinicId,
      name: row['Produto'] || 'Produto Sem Nome',
      price: parseCurrency(row['Valor de venda']),
      category: row['Grupo'] || 'Geral',
      stock: parseInt(row['Estoque atualizado']) || 0,
      costPrice: parseCurrency(row['Valor de custo']),
      expiryDate: parseDate(row['Validade']),
      notes: row['Observações'] || '',
      minStock: 5, // Default
      supplier: 'CSV Import' // Default
    };
  }

  detectConflicts(importedProducts: Product[], existingProducts: Product[]): any[] {
    const conflicts = [];

    for (const imp of importedProducts) {
      // 1. Try Match by SKU (ID)
      let existing = null;
      let matchType = '';

      if (imp.id) {
        existing = existingProducts.find(p => p.id === imp.id);
        if (existing) matchType = 'SKU';
      }

      // 2. If no SKU match, Try Match by Name (Normalized)
      if (!existing && imp.name) {
        const impName = imp.name.trim().toLowerCase();
        existing = existingProducts.find(p => p.name.trim().toLowerCase() === impName);
        if (existing) matchType = 'NAME';
      }
      
      if (existing) {
        // Check for differences
        const diffs: any = {};
        let hasDiff = false;

        // Compare Stock
        if (existing.stock !== imp.stock) { 
            diffs.stock = { current: existing.stock, new: imp.stock }; 
            hasDiff = true; 
        }
        
        // Compare Prices
        if (imp.price && existing.price !== imp.price) { 
            diffs.price = { current: existing.price, new: imp.price }; 
            hasDiff = true; 
        }
        
        // Compare Cost
        if (imp.costPrice && existing.costPrice !== imp.costPrice) { 
            diffs.costPrice = { current: existing.costPrice, new: imp.costPrice }; 
            hasDiff = true; 
        }

        // If matched by NAME but IDs are different/missing in one, we might want to alert
        if (matchType === 'NAME' && imp.id && imp.id !== existing.id) {
             diffs.id = { current: existing.id, new: imp.id };
             hasDiff = true;
        }

        if (hasDiff) {
          conflicts.push({
            type: 'UPDATE',
            matchType,
            product: imp,
            existing: existing,
            diffs: diffs
          });
        }
      } else {
        // Truly New Item
        conflicts.push({
          type: 'NEW',
          product: imp
        });
      }
    }
    return conflicts;
  }
}
