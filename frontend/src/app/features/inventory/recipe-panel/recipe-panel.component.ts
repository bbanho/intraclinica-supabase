import { Component, inject, input, signal, output, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Trash2, Pill, Stethoscope } from 'lucide-angular';
import { CurrencyPipe } from '@angular/common';
import { ProcedureService, ProcedureRecipe, ProcedureType, AddRecipeItemDto } from '../../../core/services/procedure.service';
import { Product } from '../../../core/services/inventory.service';

@Component({
  selector: 'app-recipe-panel',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, CurrencyPipe],
  template: `
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      @if (procedure(); as proc) {
        <!-- Header -->
        <div class="p-4 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h2 class="text-lg font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
              <lucide-icon [img]="StethoscopeIcon" size="20" class="text-indigo-600"></lucide-icon>
              {{ proc.name }}
            </h2>
            <p class="text-xs text-gray-500 font-medium">Configuração de consumo automático</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-indigo-600">{{ proc.price | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
            @if (!proc.active) {
              <span class="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">INATIVO</span>
            }
          </div>
        </div>

        <!-- Add Item Form -->
        <div class="p-4 border-b border-gray-100 bg-indigo-50/30">
          <h3 class="text-xs font-bold uppercase text-indigo-400 mb-3 flex items-center gap-2">
            <lucide-icon [img]="PlusIcon" [size]="14"></lucide-icon> Adicionar Insumo à Receita
          </h3>
          <div class="flex gap-3 items-end">
            <div class="flex-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Insumo</label>
              <select 
                [(ngModel)]="newItemId"
                class="w-full bg-white border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-gray-700"
                data-testid="recipe-item-select"
              >
                <option value="" disabled>Selecione um item...</option>
                @for (item of inventoryItems(); track item.id) {
                  <option [value]="item.id">{{ item.name }}</option>
                }
              </select>
            </div>
            <div class="w-20">
              <label class="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Qtd</label>
              <input 
                type="number" 
                [(ngModel)]="newItemQty"
                min="0.01"
                step="0.01"
                class="w-full bg-white border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-gray-700 text-center"
                data-testid="recipe-quantity-input"
              />
            </div>
            <button 
              (click)="addRecipeItem()"
              [disabled]="!newItemId || newItemQty <= 0"
              class="bg-indigo-600 text-white p-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100"
              data-testid="recipe-add-item-button"
            >
              <lucide-icon [img]="PlusIcon" size="20"></lucide-icon>
            </button>
          </div>
        </div>

        <!-- Recipe List -->
        <div class="flex-1 overflow-y-auto p-4">
          @if (loading()) {
            <div class="space-y-3">
              @for (i of [1,2,3]; track i) {
                <div class="animate-pulse flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div>
                      <div class="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                      <div class="h-3 bg-gray-100 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else if (recipes().length === 0) {
            <div class="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl" data-testid="recipe-empty-state">
              <lucide-icon [img]="PillIcon" size="48" class="mx-auto mb-3 opacity-50"></lucide-icon>
              <p class="font-medium text-sm">Nenhum insumo configurado para este procedimento.</p>
            </div>
          } @else {
            <div class="space-y-3" data-testid="recipe-items-list">
              @for (recipe of recipes(); track recipe.id) {
                <div class="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm group hover:border-indigo-100 transition-all">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs" data-testid="recipe-item-quantity">
                      {{ recipe.quantity }}
                    </div>
                    <div>
                      <div class="font-bold text-gray-700 text-sm" data-testid="recipe-item-name">{{ recipe.item_name || 'Item Removido' }}</div>
                      <div class="text-[10px] text-gray-400 font-mono uppercase" data-testid="recipe-item-unit">{{ recipe.unit }}</div>
                    </div>
                  </div>
                  <button 
                    (click)="removeRecipeItem(recipe.id)"
                    class="text-gray-300 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-all"
                    data-testid="recipe-remove-item-button"
                    title="Remover item"
                  >
                    <lucide-icon [img]="Trash2Icon" size="18"></lucide-icon>
                  </button>
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <!-- No Procedure Selected -->
        <div class="flex flex-col items-center justify-center h-full text-gray-400 bg-slate-50/50 p-6">
          <lucide-icon [img]="StethoscopeIcon" size="64" class="mb-4 opacity-20"></lucide-icon>
          <p class="font-medium text-center">Selecione um procedimento para configurar a receita</p>
        </div>
      }
    </div>
  `
})
export class RecipePanelComponent {
  private procedureService = inject(ProcedureService);

  procedure = input<ProcedureType | null>(null);
  inventoryItems = input<Product[]>([]);
  
  recipeChange = output<void>();

  readonly PlusIcon = Plus;
  readonly Trash2Icon = Trash2;
  readonly PillIcon = Pill;
  readonly StethoscopeIcon = Stethoscope;

  recipes = signal<ProcedureRecipe[]>([]);
  loading = signal(false);
  
  newItemId = '';
  newItemQty = 1;

  constructor() {
    effect(() => {
      const proc = this.procedure();
      if (proc) {
        this.loadRecipes();
      } else {
        this.recipes.set([]);
      }
    });
  }

  async loadRecipes() {
    const proc = this.procedure();
    if (!proc) {
      this.recipes.set([]);
      return;
    }

    this.loading.set(true);
    try {
      const data = await this.procedureService.getRecipeForProcedure(proc.id);
      this.recipes.set(data);
    } catch (err) {
      console.error('Failed to load recipes:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async addRecipeItem() {
    const proc = this.procedure();
    if (!proc || !this.newItemId) return;

    try {
      const dto: AddRecipeItemDto = {
        procedure_type_id: proc.id,
        item_id: this.newItemId,
        quantity: this.newItemQty
      };
      await this.procedureService.addRecipeItem(dto);
      await this.loadRecipes();
      this.newItemId = '';
      this.newItemQty = 1;
      this.recipeChange.emit();
    } catch (err) {
      console.error('Failed to add recipe item:', err);
    }
  }

  async removeRecipeItem(recipeId: string) {
    if (!confirm('Remover este item da receita?')) return;

    try {
      await this.procedureService.removeRecipeItem(recipeId);
      await this.loadRecipes();
      this.recipeChange.emit();
    } catch (err) {
      console.error('Failed to remove recipe item:', err);
    }
  }
}
