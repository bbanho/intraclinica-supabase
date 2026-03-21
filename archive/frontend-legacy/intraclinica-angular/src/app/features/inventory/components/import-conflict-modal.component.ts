import { Component, EventEmitter, Input, Output, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../core/models/types';
import { LucideAngularModule, AlertTriangle, ArrowRight, CheckCircle, XCircle, Save, Edit2 } from 'lucide-angular';

@Component({
  selector: 'app-import-conflict-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        
        <!-- Header -->
        <div class="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 class="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <lucide-icon [img]="AlertTriangle" [size]="24"></lucide-icon> 
              Conflitos de Importação
            </h3>
            <p class="text-indigo-100 text-sm mt-1">Verifique e ajuste os dados antes de importar.</p>
          </div>
          <div class="text-right">
             <div class="text-2xl font-black">{{ currentIndex + 1 }} / {{ conflicts.length }}</div>
             <div class="text-xs font-bold text-indigo-200 uppercase">Itens Pendentes</div>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-8 bg-slate-50">
           @if (currentConflict) {
             <div class="grid md:grid-cols-2 gap-8 items-start">
                
                <!-- Existing Product -->
                <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                   <div class="absolute top-0 left-0 right-0 h-1 bg-slate-200"></div>
                   <div class="flex justify-between items-start mb-4">
                      <span class="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded">Atual no Sistema</span>
                   </div>
                   
                   @if (currentConflict.type === 'NEW') {
                      <div class="h-40 flex items-center justify-center text-slate-300 flex-col gap-2">
                         <lucide-icon [img]="XCircle" [size]="48"></lucide-icon>
                         <span class="font-bold text-sm">Produto não existe</span>
                      </div>
                   } @else {
                      <h4 class="text-lg font-bold text-slate-800 mb-1">{{ currentConflict.existing.name }}</h4>
                      <p class="text-xs font-mono text-slate-400 mb-4">{{ currentConflict.existing.id }}</p>

                      <div class="space-y-3">
                         <div class="flex justify-between text-sm border-b border-slate-50 pb-2" [class.bg-rose-50]="hasDiff('stock')">
                            <span class="text-slate-500">Estoque</span>
                            <span class="font-bold text-slate-800">{{ currentConflict.existing.stock }}</span>
                         </div>
                         <div class="flex justify-between text-sm border-b border-slate-50 pb-2" [class.bg-rose-50]="hasDiff('price')">
                            <span class="text-slate-500">Preço Venda</span>
                            <span class="font-bold text-slate-800">{{ currentConflict.existing.price | currency:'BRL' }}</span>
                         </div>
                         <div class="flex justify-between text-sm border-b border-slate-50 pb-2" [class.bg-rose-50]="hasDiff('costPrice')">
                            <span class="text-slate-500">Preço Custo</span>
                            <span class="font-bold text-slate-800">{{ currentConflict.existing.costPrice | currency:'BRL' }}</span>
                         </div>
                         <div class="flex justify-between text-sm border-b border-slate-50 pb-2">
                            <span class="text-slate-500">Categoria</span>
                            <span class="font-bold text-slate-800">{{ currentConflict.existing.category }}</span>
                         </div>
                      </div>
                   }
                </div>

                <!-- New Data (Import) -->
                 <div class="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-md relative overflow-hidden transition-all" [class.ring-2]="isEditing" [class.ring-indigo-300]="isEditing">
                   <div class="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
                   <div class="flex justify-between items-start mb-4">
                      <span class="text-[10px] font-black uppercase text-white bg-indigo-500 px-2 py-1 rounded">Dados do CSV</span>
                      <button (click)="toggleEdit()" class="text-indigo-500 hover:text-indigo-700 transition-colors" title="Editar dados">
                          <lucide-icon [img]="Edit2" [size]="16"></lucide-icon>
                      </button>
                   </div>

                   @if (isEditing && editedProduct) {
                       <div class="space-y-3">
                           <div>
                               <label class="text-[10px] font-bold text-slate-400 uppercase">Nome</label>
                               <input [(ngModel)]="editedProduct.name" class="w-full text-sm font-bold text-slate-800 border-b border-indigo-200 focus:border-indigo-500 outline-none py-1" />
                           </div>
                           
                           <div class="grid grid-cols-2 gap-3">
                               <div>
                                   <label class="text-[10px] font-bold text-slate-400 uppercase">Estoque</label>
                                   <input type="number" [(ngModel)]="editedProduct.stock" class="w-full text-sm font-bold text-indigo-700 border-b border-indigo-200 focus:border-indigo-500 outline-none py-1" />
                               </div>
                               <div>
                                   <label class="text-[10px] font-bold text-slate-400 uppercase">Categoria</label>
                                   <input [(ngModel)]="editedProduct.category" class="w-full text-sm font-bold text-slate-800 border-b border-indigo-200 focus:border-indigo-500 outline-none py-1" />
                               </div>
                           </div>

                           <div class="grid grid-cols-2 gap-3">
                               <div>
                                   <label class="text-[10px] font-bold text-slate-400 uppercase">Preço Venda</label>
                                   <input type="number" [(ngModel)]="editedProduct.price" class="w-full text-sm font-bold text-indigo-700 border-b border-indigo-200 focus:border-indigo-500 outline-none py-1" />
                               </div>
                               <div>
                                   <label class="text-[10px] font-bold text-slate-400 uppercase">Preço Custo</label>
                                   <input type="number" [(ngModel)]="editedProduct.costPrice" class="w-full text-sm font-bold text-indigo-700 border-b border-indigo-200 focus:border-indigo-500 outline-none py-1" />
                               </div>
                           </div>
                           
                           <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase">Validade</label>
                                <input type="date" [(ngModel)]="editedProduct.expiryDate" class="w-full text-sm font-bold text-slate-800 border-b border-indigo-200 focus:border-indigo-500 outline-none py-1" />
                           </div>
                       </div>
                   } @else {
                       <h4 class="text-lg font-bold text-slate-800 mb-1">{{ currentConflict.product.name }}</h4>
                       <p class="text-xs font-mono text-slate-400 mb-4">{{ currentConflict.product.id }}</p>

                       <div class="space-y-3">
                          <div class="flex justify-between text-sm border-b border-slate-50 pb-2">
                             <span class="text-slate-500">Estoque</span>
                             <span class="font-bold text-indigo-700">{{ currentConflict.product.stock }}</span>
                          </div>
                          <div class="flex justify-between text-sm border-b border-slate-50 pb-2">
                             <span class="text-slate-500">Preço Venda</span>
                             <span class="font-bold text-indigo-700">{{ currentConflict.product.price | currency:'BRL' }}</span>
                          </div>
                          <div class="flex justify-between text-sm border-b border-slate-50 pb-2">
                             <span class="text-slate-500">Preço Custo</span>
                             <span class="font-bold text-indigo-700">{{ currentConflict.product.costPrice | currency:'BRL' }}</span>
                          </div>
                          <div class="flex justify-between text-sm border-b border-slate-50 pb-2">
                             <span class="text-slate-500">Categoria</span>
                             <span class="font-bold text-slate-800">{{ currentConflict.product.category }}</span>
                          </div>
                          @if (currentConflict.product.expiryDate) {
                              <div class="flex justify-between text-sm border-b border-slate-50 pb-2">
                                 <span class="text-slate-500">Validade</span>
                                 <span class="font-bold text-slate-800">{{ currentConflict.product.expiryDate | date:'shortDate' }}</span>
                              </div>
                          }
                       </div>
                   }
                </div>

             </div>
           }
        </div>

        <!-- Actions -->
        <div class="p-6 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
           <button (click)="skip()" class="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors uppercase text-xs tracking-wider">
             Ignorar este item
           </button>
           
           <div class="flex gap-3">
             @if (currentConflict.type === 'NEW') {
                <button (click)="resolve('CREATE')" class="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-2 uppercase text-xs tracking-wider">
                  <lucide-icon [img]="CheckCircle" [size]="18"></lucide-icon> Criar Novo
                </button>
             } @else {
                <button (click)="resolve('KEEP_EXISTING')" class="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors uppercase text-xs tracking-wider">
                   Manter Atual
                </button>
                <button (click)="resolve('UPDATE')" class="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 uppercase text-xs tracking-wider">
                  <lucide-icon [img]="Save" [size]="18"></lucide-icon> Atualizar
                </button>
             }
           </div>
        </div>

      </div>
    </div>
  `
})
export class ImportConflictModalComponent implements OnChanges {
  @Input() conflicts: any[] = [];
  @Output() resolved = new EventEmitter<any>();
  @Output() completed = new EventEmitter<void>();

  currentIndex = 0;
  isEditing = false;
  editedProduct: Product | null = null; // Local copy for editing
  
  // Icons
  readonly AlertTriangle = AlertTriangle;
  readonly ArrowRight = ArrowRight;
  readonly CheckCircle = CheckCircle;
  readonly XCircle = XCircle;
  readonly Save = Save;
  readonly Edit2 = Edit2;

  get currentConflict() {
    return this.conflicts[this.currentIndex];
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['conflicts']) {
      this.currentIndex = 0;
      this.resetEditState();
    }
  }

  resetEditState() {
    this.isEditing = false;
    if (this.currentConflict) {
        this.editedProduct = { ...this.currentConflict.product };
    }
  }

  hasDiff(field: string) {
    return this.currentConflict?.diffs && this.currentConflict.diffs[field];
  }

  toggleEdit() {
      this.isEditing = !this.isEditing;
  }

  resolve(action: 'CREATE' | 'UPDATE' | 'KEEP_EXISTING') {
    // Use the edited product if available
    const finalProduct = this.editedProduct ?? this.currentConflict.product;
    
    this.resolved.emit({ 
      conflict: this.currentConflict, 
      product: finalProduct, 
      action 
    });
    this.next();
  }

  skip() {
    this.next();
  }

  next() {
    if (this.currentIndex < this.conflicts.length - 1) {
      this.currentIndex++;
      this.resetEditState();
    } else {
      this.completed.emit();
    }
  }
}
