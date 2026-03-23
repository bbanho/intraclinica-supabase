import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { LucideAngularModule, X } from 'lucide-angular';
import { InventoryService, CreateProductDto } from '../../../core/services/inventory.service';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-lg shadow-xl w-[500px] max-w-[90vw] overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h2 class="text-lg font-semibold text-gray-900">Novo Produto</h2>
        <button 
          (click)="close()" 
          class="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
          type="button"
        >
          <lucide-icon [img]="XIcon" size="20"></lucide-icon>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6">
        @if (error()) {
          <div class="mb-6 p-4 rounded-md bg-rose-50 text-rose-700 text-sm flex items-start gap-2 border border-rose-100">
            <div>
              <p class="font-medium">Erro ao salvar</p>
              <p class="opacity-90 mt-0.5">{{ error() }}</p>
            </div>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
            <input 
              id="name" 
              type="text" 
              formControlName="name"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
              [class.border-rose-300]="isFieldInvalid('name')"
              placeholder="Ex: Seringa 10ml"
            />
            @if (isFieldInvalid('name')) {
              <p class="mt-1 text-xs text-rose-600">O nome é obrigatório</p>
            }
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="category" class="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <input 
                id="category" 
                type="text" 
                formControlName="category"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                placeholder="Ex: Insumos"
              />
            </div>
            <div>
              <label for="barcode" class="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
              <input 
                id="barcode" 
                type="text" 
                formControlName="barcode"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                placeholder="0000000000000"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="cost" class="block text-sm font-medium text-gray-700 mb-1">Custo (R$)</label>
              <input 
                id="cost" 
                type="number" 
                step="0.01"
                min="0"
                formControlName="cost"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                [class.border-rose-300]="isFieldInvalid('cost')"
              />
            </div>
            <div>
              <label for="price" class="block text-sm font-medium text-gray-700 mb-1">Preço de Venda (R$)</label>
              <input 
                id="price" 
                type="number" 
                step="0.01"
                min="0"
                formControlName="price"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                [class.border-rose-300]="isFieldInvalid('price')"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="current_stock" class="block text-sm font-medium text-gray-700 mb-1">Estoque Inicial</label>
              <input 
                id="current_stock" 
                type="number"
                min="0" 
                formControlName="current_stock"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                [class.border-rose-300]="isFieldInvalid('current_stock')"
              />
            </div>
            <div>
              <label for="min_stock" class="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo</label>
              <input 
                id="min_stock" 
                type="number"
                min="0" 
                formControlName="min_stock"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                [class.border-rose-300]="isFieldInvalid('min_stock')"
              />
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="pt-6 mt-6 border-t border-gray-100 flex items-center justify-end gap-3">
            <button 
              type="button" 
              (click)="close()"
              [disabled]="submitting()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              [disabled]="form.invalid || submitting()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              @if (submitting()) {
                <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              } @else {
                Salvar Produto
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ProductModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(DialogRef<ProductModalComponent>);
  private inventoryService = inject(InventoryService);

  readonly XIcon = X;

  submitting = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    category: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    cost: [0, [Validators.required, Validators.min(0)]],
    current_stock: [0, [Validators.required, Validators.min(0)]],
    min_stock: [0, [Validators.required, Validators.min(0)]],
    barcode: ['']
  });

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return control ? control.invalid && control.touched : false;
  }

  close(result?: any) {
    this.dialogRef.close(result);
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      const dto: CreateProductDto = this.form.getRawValue();
      const newProduct = await this.inventoryService.createProduct(dto);
      this.close(newProduct);
    } catch (err: any) {
      console.error('Failed to create product:', err);
      this.error.set(err?.message || 'Ocorreu um erro ao salvar o produto.');
    } finally {
      this.submitting.set(false);
    }
  }
}
