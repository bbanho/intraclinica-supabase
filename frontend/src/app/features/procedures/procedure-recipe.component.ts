import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../core/services/inventory.service';
import { ProcedureType, ProcedureRecipe, InventoryItem } from '../../core/models/inventory.types';
import { LucideAngularModule, Plus, Trash2, Edit3, Save, XCircle, Search, Pill, Stethoscope, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'app-procedure-recipe',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-6 animate-fade-in p-6 bg-slate-50 min-h-screen">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-black text-slate-800 uppercase tracking-tighter">Procedimentos & Receitas</h1>
          <p class="text-slate-500 font-medium">Configure os insumos consumidos em cada procedimento.</p>
        </div>
        <button (click)="openProcedureForm()" class="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
          <lucide-icon [img]="Plus" [size]="18"></lucide-icon> Novo Procedimento
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- List of Procedures -->
        <div class="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          <div class="p-4 border-b border-slate-100 bg-slate-50">
            <div class="relative">
              <lucide-icon [img]="Search" class="absolute left-3 top-3 text-slate-400" [size]="18"></lucide-icon>
              <input 
                type="text" 
                placeholder="Buscar procedimentos..." 
                class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                [value]="searchTerm()"
                (input)="searchTerm.set($any($event.target).value)"
              />
            </div>
          </div>
          
          <div class="overflow-y-auto flex-1 p-2 space-y-2">
            @for (proc of filteredProcedures(); track proc.id) {
              <div 
                (click)="selectProcedure(proc)"
                [class.bg-indigo-50]="selectedProcedure()?.id === proc.id"
                [class.border-indigo-200]="selectedProcedure()?.id === proc.id"
                class="p-4 rounded-2xl border border-transparent hover:bg-slate-50 cursor-pointer transition-all group relative"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-bold text-slate-800 text-sm">{{ proc.name }}</h3>
                    <span class="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{{ proc.code || 'SEM CÓDIGO' }}</span>
                  </div>
                  <lucide-icon [img]="ChevronRight" [size]="16" class="text-slate-300 group-hover:text-indigo-500 transition-colors"></lucide-icon>
                </div>
                <div class="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span class="text-emerald-600 font-bold">{{ proc.price | currency:'BRL' }}</span>
                  <span *ngIf="!proc.active" class="text-rose-500 bg-rose-50 px-1.5 rounded text-[10px] font-bold">INATIVO</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Recipe Details -->
        <div class="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-200px)] relative">
          @if (selectedProcedure(); as proc) {
            <div class="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 class="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <lucide-icon [img]="Stethoscope" [size]="24" class="text-indigo-600"></lucide-icon>
                  {{ proc.name }}
                </h2>
                <p class="text-slate-500 text-sm font-medium">Configuração de consumo automático</p>
              </div>
              <div class="flex gap-2">
                 <button (click)="openProcedureForm(proc)" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Editar">
                    <lucide-icon [img]="Edit3" [size]="20"></lucide-icon>
                 </button>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto p-6">
              <!-- Add Item Form -->
              <div class="bg-indigo-50/50 rounded-2xl p-4 mb-6 border border-indigo-100">
                <h3 class="text-xs font-black uppercase text-indigo-400 mb-3 flex items-center gap-2">
                  <lucide-icon [img]="Plus" [size]="14"></lucide-icon> Adicionar Insumo à Receita
                </h3>
                <div class="flex gap-3 items-end">
                  <div class="flex-1">
                    <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Insumo</label>
                    <select 
                      [ngModel]="newItemId()" 
                      (ngModelChange)="newItemId.set($event)"
                      class="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700"
                    >
                      <option value="" disabled>Selecione um item...</option>
                      @for (item of inventoryItems(); track item.id) {
                        <option [value]="item.id">{{ item.name }} ({{ item.unit }})</option>
                      }
                    </select>
                  </div>
                  <div class="w-24">
                    <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Qtd</label>
                    <input 
                      type="number" 
                      [ngModel]="newItemQty()" 
                      (ngModelChange)="newItemQty.set($event)"
                      class="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700 text-center"
                    />
                  </div>
                  <button 
                    (click)="addRecipeItem()"
                    [disabled]="!newItemId() || newItemQty() <= 0"
                    class="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100"
                  >
                    <lucide-icon [img]="Plus" [size]="20"></lucide-icon>
                  </button>
                </div>
              </div>

              <!-- Recipe List -->
              <div class="space-y-3">
                @if (recipes().length === 0) {
                  <div class="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                    <lucide-icon [img]="Pill" [size]="48" class="mx-auto mb-3 opacity-50"></lucide-icon>
                    <p class="font-medium text-sm">Nenhum insumo configurado para este procedimento.</p>
                  </div>
                }

                @for (recipe of recipes(); track recipe.id) {
                  <div class="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm group hover:border-indigo-100 transition-all">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {{ recipe.quantity }}
                      </div>
                      <div>
                         <div class="font-bold text-slate-700 text-sm">{{ recipe.item_name || 'Item Removido' }}</div>
                         <div class="text-[10px] text-slate-400 font-mono uppercase">{{ recipe.unit }}</div>
                      </div>
                    </div>
                    <button (click)="removeRecipeItem(recipe.id)" class="text-slate-300 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-all">
                      <lucide-icon [img]="Trash2" [size]="18"></lucide-icon>
                    </button>
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50">
              <lucide-icon [img]="Stethoscope" [size]="64" class="mb-4 opacity-20"></lucide-icon>
              <p class="font-medium">Selecione um procedimento para configurar a receita</p>
            </div>
          }
        </div>
      </div>

      <!-- Procedure Form Modal -->
      @if (isFormOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-scale-in">
                <div class="bg-indigo-600 p-6 text-white flex justify-between items-center">
                    <h3 class="text-xl font-black uppercase tracking-tight">{{ editingId() ? 'Editar Procedimento' : 'Novo Procedimento' }}</h3>
                    <button (click)="isFormOpen.set(false)" class="text-white/50 hover:text-white"><lucide-icon [img]="XCircle" [size]="24"></lucide-icon></button>
                </div>
                <div class="p-8 space-y-4">
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-1 block">Nome do Procedimento <span class="text-rose-500">*</span></label>
                        <input [(ngModel)]="formData.name" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" placeholder="Ex: Toxina Botulínica" />
                    </div>
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-1 block">Código (TUSS/Interno)</label>
                        <input [(ngModel)]="formData.code" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-indigo-600 font-bold" placeholder="Ex: 10101010" />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-[10px] font-black uppercase text-slate-400 mb-1 block">Preço (R$)</label>
                            <input type="number" [(ngModel)]="formData.price" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                        </div>
                        <div class="flex items-center pt-6">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" [(ngModel)]="formData.active" class="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                                <span class="text-sm font-bold text-slate-600">Ativo</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button (click)="isFormOpen.set(false)" class="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors">CANCELAR</button>
                    <button (click)="handleSaveProcedure()" class="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2">
                        <lucide-icon [img]="Save" [size]="18"></lucide-icon> SALVAR
                    </button>
                </div>
            </div>
        </div>
      }
    </div>
  `
})
export class ProcedureRecipeComponent {
  private inventoryService = inject(InventoryService);

  // Signals
  procedures = signal<ProcedureType[]>([]);
  inventoryItems = signal<InventoryItem[]>([]);
  recipes = signal<ProcedureRecipe[]>([]);
  
  selectedProcedure = signal<ProcedureType | null>(null);
  searchTerm = signal('');
  
  // Recipe form
  newItemId = signal('');
  newItemQty = signal(1);

  // Procedure form
  isFormOpen = signal(false);
  editingId = signal<string | null>(null);
  formData = { name: '', code: '', price: 0, active: true };

  // Computed
  filteredProcedures = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.procedures().filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.code && p.code.toLowerCase().includes(term))
    );
  });

  // Effects & Constructor
  constructor() {
    this.loadProcedures();
    this.loadInventoryItems();
  }

  async loadProcedures() {
    const data = await this.inventoryService.getProcedureTypes();
    this.procedures.set(data);
  }

  async loadInventoryItems() {
    const data = await this.inventoryService.getItems();
    this.inventoryItems.set(data);
  }

  async selectProcedure(proc: ProcedureType) {
    this.selectedProcedure.set(proc);
    this.recipes.set([]); // Clear while loading
    const recipes = await this.inventoryService.getRecipes(proc.id);
    this.recipes.set(recipes);
  }

  // Procedure CRUD
  openProcedureForm(proc?: ProcedureType) {
    if (proc) {
      this.editingId.set(proc.id);
      this.formData = { 
        name: proc.name, 
        code: proc.code || '', 
        price: proc.price, 
        active: proc.active 
      };
    } else {
      this.editingId.set(null);
      this.formData = { name: '', code: '', price: 0, active: true };
    }
    this.isFormOpen.set(true);
  }

  async handleSaveProcedure() {
    if (this.editingId()) {
      await this.inventoryService.updateProcedureType(this.editingId()!, this.formData);
    } else {
      await this.inventoryService.createProcedureType(this.formData);
    }
    await this.loadProcedures();
    this.isFormOpen.set(false);
  }

  // Recipe CRUD
  async addRecipeItem() {
    const proc = this.selectedProcedure();
    const itemId = this.newItemId();
    if (!proc || !itemId) return;

    await this.inventoryService.addRecipeItem({
      procedure_type_id: proc.id,
      item_id: itemId,
      quantity: this.newItemQty()
    });

    // Refresh recipes
    const recipes = await this.inventoryService.getRecipes(proc.id);
    this.recipes.set(recipes);
    
    // Reset form
    this.newItemId.set('');
    this.newItemQty.set(1);
  }

  async removeRecipeItem(id: string) {
    if (!confirm('Remover este item da receita?')) return;
    
    await this.inventoryService.removeRecipeItem(id);
    
    const proc = this.selectedProcedure();
    if (proc) {
      const recipes = await this.inventoryService.getRecipes(proc.id);
      this.recipes.set(recipes);
    }
  }

  // Icons
  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly Edit3 = Edit3;
  readonly Save = Save;
  readonly XCircle = XCircle;
  readonly Search = Search;
  readonly Pill = Pill;
  readonly Stethoscope = Stethoscope;
  readonly ChevronRight = ChevronRight;
}
