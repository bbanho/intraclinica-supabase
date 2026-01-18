import { Component, computed, inject, signal, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { loadProducts, addProduct, deleteProduct, addTransaction } from './store/inventory.actions';
import { selectAllProducts, selectInventoryLoading } from './store/inventory.selectors';
import { DatabaseService } from '../../core/services/database.service';
import { GeminiService } from '../../core/services/gemini.service';
import { CsvImportService } from '../../core/services/csv-import.service';
import { PrintService } from '../../core/services/print.service';
import { BarcodeDirective } from '../../shared/directives/barcode.directive';
import { ImportConflictModalComponent } from './components/import-conflict-modal.component';
import { LucideAngularModule, Package, AlertTriangle, Activity, History, Plus, Minus, Search, Sparkles, ScanBarcode, Printer, XCircle, Settings, QrCode, PlusCircle, ListChecks, CheckCircle2, Scan, CalendarClock, AlertCircle, LayoutGrid, Edit3, Save, Upload, Download, ShieldAlert, Trash2 } from 'lucide-angular';
import { Product, LabelConfig } from '../../core/models/types';
import { IAM_PERMISSIONS } from '../../core/config/iam-roles';

interface ProductFormData {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  price: number;
  costPrice: number;
  minStock: number;
  supplier: string;
  expiryDate: string;
}

const DEFAULT_PRODUCT_FORM_DATA: ProductFormData = { 
  id: '', name: '', category: '', currentStock: 0, 
  price: 0, costPrice: 0, minStock: 10, supplier: '', expiryDate: '' 
};

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, BarcodeDirective, LucideAngularModule, ImportConflictModalComponent],
  template: `
    <div class="space-y-6 animate-fade-in relative">
      @if (loading()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }
      
      @if (!db.checkPermission('inventory.read', db.selectedContextClinic() || db.currentUser()?.clinicId)) {
        <div class="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-[40px] border border-slate-200 shadow-sm animate-scale-in">
            <div class="p-6 bg-rose-50 text-rose-600 rounded-3xl mb-6">
                <lucide-icon [img]="ShieldAlert" [size]="48"></lucide-icon>
            </div>
            <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Acesso Restrito</h2>
            <p class="text-slate-500 max-w-md mx-auto mb-8 font-medium">Você não possui permissão para visualizar o estoque desta clínica.</p>
        </div>
      } @else {
        <!-- SCANNER OVERLAY -->
        @if (scannerMode()) {
            <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 transition-colors duration-300 no-print"
                [class.bg-emerald-600/95]="lastScanStatus() === 'success'"
                [class.bg-red-600/95]="lastScanStatus() === 'error'"
                [class.bg-slate-900/95]="!lastScanStatus()"
                [class.backdrop-blur-md]="!lastScanStatus()">
            <div class="w-full max-w-lg text-center space-y-8 relative">
                <button (click)="scannerMode.set(false)" class="absolute -top-10 right-0 text-white/50 hover:text-white">
                    <lucide-icon [img]="XCircle" [size]="40"></lucide-icon>
                </button>
                <div class="relative w-64 h-48 border-4 border-indigo-500 rounded-3xl mx-auto overflow-hidden bg-black/20">
               <div class="absolute inset-0 flex items-center justify-center">
                   <lucide-icon [img]="Scan" [size]="60" class="text-indigo-500/20"></lucide-icon>
               </div>
               <div class="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_15px_red] animate-scan"></div>
                </div>
                <h2 class="text-3xl font-black text-white uppercase tracking-tighter">Scanner Hub</h2>
                <form (submit)="handleScanSubmit($event)">
                <input 
                    #scannerInput
                    autofocus
                    class="w-full bg-white border-none rounded-2xl py-6 px-4 text-4xl font-mono text-center outline-none text-slate-800"
                    placeholder="Aguardando Bip..."
                    [value]="scannedCode()"
                    (input)="scannedCode.set($any($event.target).value)"
                />
                </form>
            </div>
            </div>
        }

      <!-- HEADER -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <h1 class="text-3xl font-black text-slate-800 uppercase tracking-tighter">Inventário</h1>
            <p class="text-slate-500 font-medium">Controle de insumos e etiquetas.</p>
          </div>
          <div class="flex gap-2">
            <button (click)="activeTab.set('stock')" [class.bg-white]="activeTab() === 'stock'" [class.shadow-sm]="activeTab() === 'stock'" class="px-4 py-2 rounded-xl text-xs font-bold transition-all border border-transparent" [class.border-slate-200]="activeTab() === 'stock'">Estoque</button>
            <button (click)="activeTab.set('print')" [class.bg-white]="activeTab() === 'print'" [class.shadow-sm]="activeTab() === 'print'" class="px-4 py-2 rounded-xl text-xs font-bold transition-all border border-transparent" [class.border-slate-200]="activeTab() === 'print'">Etiquetas</button>
          </div>
          <div class="flex items-center gap-3">
            <button (click)="exportCsv()" class="p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Exportar CSV">
              <lucide-icon [img]="Download" [size]="20"></lucide-icon>
            </button>
            <label class="p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer" title="Importar CSV">
              <lucide-icon [img]="Upload" [size]="20"></lucide-icon>
              <input type="file" class="hidden" accept=".csv" (change)="handleFileImport($event)" />
            </label>
            <div class="w-px h-8 bg-slate-200 mx-2"></div>
            <button (click)="openNewProductForm()" class="px-5 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all">
              <lucide-icon [img]="Plus" [size]="18"></lucide-icon> Novo Item
            </button>
            <button (click)="scannerMode.set(true)" class="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
              <lucide-icon [img]="ScanBarcode" [size]="18"></lucide-icon> Scanner
            </button>
          </div>
      </div>

      <!-- TAB: ESTOQUE (LISTA) -->
      @if (activeTab() === 'stock') {
        <div class="no-print space-y-6">
          <div class="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 rounded-3xl text-white flex items-center justify-between shadow-xl">
             <div class="flex items-center gap-4">
               <div class="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                 <lucide-icon [img]="Sparkles" [size]="24"></lucide-icon>
               </div>
               <div>
                 <h3 class="text-lg font-bold">Auditoria Inteligente</h3>
                 <p class="text-indigo-100 text-sm">IA mapeando riscos e validades.</p>
               </div>
             </div>
             <button (click)="handleAiAnalysis()" [disabled]="isAnalyzing()" class="px-6 py-2 bg-white text-indigo-700 rounded-xl font-bold text-sm hover:scale-105 transition-all disabled:opacity-70">
               {{ isAnalyzing() ? 'Processando...' : 'Analisar Agora' }}
             </button>
          </div>

          @if (aiAnalysis()) {
            <div class="p-6 bg-white border border-indigo-100 rounded-3xl text-slate-700 text-sm leading-relaxed shadow-sm">
               {{ aiAnalysis() }}
            </div>
          }

          <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
             <div class="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
               <div class="flex items-center gap-3 flex-1">
                 <lucide-icon [img]="Search" class="text-slate-400" [size]="18"></lucide-icon>
                 <input type="text" placeholder="Filtrar estoque por nome ou código..." class="bg-transparent flex-1 outline-none text-slate-600 font-medium" [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)" />
               </div>
               <div class="flex gap-2">
                 <button (click)="viewFilter.set('all')" [class.bg-indigo-600]="viewFilter() === 'all'" [class.text-white]="viewFilter() === 'all'" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-slate-200">
                   <lucide-icon [img]="ListChecks" [size]="14"></lucide-icon> Todos
                 </button>
                 <button (click)="viewFilter.set('critical')" [class.bg-rose-500]="viewFilter() === 'critical'" [class.text-white]="viewFilter() === 'critical'" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-slate-200">
                   <lucide-icon [img]="AlertCircle" [size]="14"></lucide-icon> Alertas
                 </button>
               </div>
             </div>
             <table class="w-full text-left">
               <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                 <tr>
                   <th class="px-6 py-4">Produto</th>
                   @if (canViewInventoryCost()) {
                        <th class="px-6 py-4">Forn.</th>
                   }
                   <th class="px-6 py-4 text-right">Preço</th>
                   @if (canViewInventoryCost()) {
                        <th class="px-6 py-4 text-right">Custo</th>
                   }
                   <th class="px-6 py-4">Validade</th>
                   <th class="px-6 py-4 text-center">Saldo</th>
                   <th class="px-6 py-4 text-right">Ações</th>
                 </tr>
               </thead>
               <tbody class="divide-y divide-slate-50">
                 @for (p of paginatedProducts(); track p.id) {
                      <tr class="hover:bg-slate-50 transition-colors group" [class.bg-amber-50/50]="p.stock <= p.minStock">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-2">
                              <span class="font-bold text-slate-800">{{p.name}}</span>
                              @if (p.stock <= p.minStock) {
                                <span class="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse tracking-tighter">REPOSIÇÃO</span>
                              }
                            </div>
                            <div class="text-[10px] font-bold text-indigo-500 uppercase">{{p.category}}</div>
                        </td>
                        @if (canViewInventoryCost()) {
                            <td class="px-6 py-4 text-[10px] font-medium text-slate-500 truncate max-w-[100px]" title="{{p.supplier}}">
                                {{p.supplier || '-'}}
                            </td>
                        }
                        <td class="px-6 py-4 text-right text-xs font-bold text-slate-700">
                            {{p.price | currency:'BRL'}}
                        </td>
                        @if (canViewInventoryCost()) {
                            <td class="px-6 py-4 text-right text-xs font-medium text-slate-400">
                                {{p.costPrice | currency:'BRL'}}
                            </td>
                        }
                        <td class="px-6 py-4">
                            <div class="text-[10px] font-black flex items-center gap-1" [class.text-rose-500]="isNearExpiry(p.expiryDate!)">
                              <lucide-icon [img]="CalendarClock" [size]="12"></lucide-icon> 
                              {{ p.expiryDate | date:'shortDate' }}
                            </div>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div class="text-xl font-black" [class.text-rose-600]="p.stock <= p.minStock" [class.text-slate-700]="p.stock > p.minStock">{{p.stock}}</div>
                        </td>
                        <td class="px-6 py-4 text-right flex items-center justify-end gap-1">
                            <button (click)="addToQueue(p)" class="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Etiqueta"><lucide-icon [img]="Printer" [size]="16"></lucide-icon></button>
                            <button (click)="openEditForm(p)" class="p-2 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Editar"><lucide-icon [img]="Edit3" [size]="16"></lucide-icon></button>
                            <button (click)="selectedProduct.set(p); moveQuantity.set(1)" class="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Movimentar"><lucide-icon [img]="History" [size]="16"></lucide-icon></button>
                            <button (click)="handleDeleteProduct(p)" class="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Excluir"><lucide-icon [img]="Trash2" [size]="16"></lucide-icon></button>
                        </td>
                      </tr>
                 }
               </tbody>
             </table>
             
             <!-- Pagination -->
             <div class="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total: {{ totalItems() }} itens</span>
                <div class="flex items-center gap-2">
                    <button (click)="changePage(currentPage() - 1)" [disabled]="currentPage() === 1" class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">Anterior</button>
                    <span class="text-xs font-black text-indigo-600 px-2">{{ currentPage() }} / {{ totalPages() }}</span>
                    <button (click)="changePage(currentPage() + 1)" [disabled]="currentPage() >= totalPages()" class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">Próxima</button>
                </div>
             </div>
          </div>
        </div>
      }

      <!-- TAB: PRINT -->
      @if (activeTab() === 'print') {
        <div class="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)] overflow-hidden print-container-reset">
            <!-- Left Panel: Config & List (NO PRINT) -->
            <div class="w-full lg:w-1/3 flex flex-col gap-4 h-full no-print">
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden min-h-0">
                    <div class="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <div class="relative w-full">
                            <lucide-icon [img]="Search" class="absolute left-3 top-2.5 text-slate-400" [size]="16"></lucide-icon>
                            <input 
                            type="text" 
                            placeholder="Buscar para adicionar..." 
                            class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            [value]="searchTerm()"
                            (input)="searchTerm.set($any($event.target).value)"
                            />
                        </div>
                    </div>
                     <!-- Config -->
                    <div class="p-5 bg-white border-b border-slate-100">
                         <h3 class="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2 tracking-widest"><lucide-icon [img]="Settings" [size]="14"></lucide-icon> Layout da Etiqueta</h3>
                         <div class="space-y-4">
                            <div class="grid grid-cols-3 gap-2">
                                <button (click)="updateLabelConfig({cols: 2})" [class.bg-indigo-600]="labelConfig().cols === 2" [class.text-white]="labelConfig().cols === 2" class="p-2 rounded-lg border text-xs font-bold transition-all border-slate-200">2 Colunas</button>
                                <button (click)="updateLabelConfig({cols: 3})" [class.bg-indigo-600]="labelConfig().cols === 3" [class.text-white]="labelConfig().cols === 3" class="p-2 rounded-lg border text-xs font-bold transition-all border-slate-200">3 Colunas</button>
                                <button (click)="updateLabelConfig({cols: 4})" [class.bg-indigo-600]="labelConfig().cols === 4" [class.text-white]="labelConfig().cols === 4" class="p-2 rounded-lg border text-xs font-bold transition-all border-slate-200">4 Colunas</button>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <button (click)="updateLabelConfig({size: 'standard'})" [class.bg-indigo-600]="labelConfig().size === 'standard'" [class.text-white]="labelConfig().size === 'standard'" class="p-2 rounded-lg border text-xs font-bold transition-all border-slate-200">Padrão</button>
                                <button (click)="updateLabelConfig({size: 'compact'})" [class.bg-indigo-600]="labelConfig().size === 'compact'" [class.text-white]="labelConfig().size === 'compact'" class="p-2 rounded-lg border text-xs font-bold transition-all border-slate-200">Compacto</button>
                            </div>
                         </div>
                    </div>

                    <div class="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                        @for (p of filteredProducts(); track p.id) {
                            <button (click)="addToQueue(p)" class="w-full text-left p-3 rounded-xl hover:bg-indigo-50 group transition-all border border-transparent hover:border-indigo-100 flex items-center justify-between">
                                <div>
                                    <div class="font-bold text-slate-700 text-sm">{{p.name}}</div>
                                    <div class="text-[10px] text-slate-400 font-mono">{{p.id}}</div>
                                </div>
                                <lucide-icon [img]="PlusCircle" [size]="18" class="text-slate-300 group-hover:text-indigo-600"></lucide-icon>
                            </button>
                        }
                    </div>
                </div>
                
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex gap-2">
                     <button (click)="printQueue.set([])" class="flex-1 py-3 border border-rose-200 text-rose-600 rounded-xl font-bold text-xs uppercase hover:bg-rose-50">Limpar</button>
                     <button (click)="printService.printElement('print-preview-content')" [disabled]="printQueue().length === 0" class="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold text-xs uppercase hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50">
                        <lucide-icon [img]="Printer" [size]="16"></lucide-icon> Imprimir
                    </button>
                </div>
            </div>

            <!-- Preview (A4 Sheet) -->
            <div id="print-preview-content" class="w-full lg:w-2/3 bg-slate-100 rounded-2xl border border-slate-200 overflow-y-auto p-8 flex flex-col items-center gap-8 custom-scrollbar relative print-preview-container">
                 <div class="absolute top-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 shadow-sm border border-slate-200 pointer-events-none z-10 no-print">Pré-visualização A4</div>
                 
                 @if (printQueue().length === 0) {
                     <div class="flex flex-col items-center justify-center text-slate-300 mt-20 no-print border-2 border-dashed border-slate-200 rounded-3xl p-12">
                         <lucide-icon [img]="LayoutGrid" [size]="48" class="mb-4 opacity-50"></lucide-icon>
                         <p class="font-bold text-sm text-center">A fila de impressão está vazia</p>
                         <p class="text-xs text-center">Adicione produtos do painel esquerdo</p>
                     </div>
                 }
                 
                 @for (page of pages(); track $index) {
                     <!-- Content Page -->
                     <div class="bg-white shadow-xl transition-all duration-300 printable-page" 
                          [style.width]="'210mm'" [style.min-height]="'297mm'" [style.padding]="'10mm'" [style.display]="'grid'" [style.grid-template-columns]="'repeat(' + labelConfig().cols + ', 1fr)'" [style.align-content]="'start'" [style.gap]="'4mm'">
                         @for (p of page; track $index) {
                             <div class="border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center relative group page-break-avoid bg-white hover:border-indigo-300 transition-colors overflow-hidden box-border"
                                  [style.height.mm]="labelConfig().size === 'compact' ? 30 : 50">
                                 <button (click)="removeFromQueue(p)" class="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity no-print"><lucide-icon [img]="XCircle" [size]="12"></lucide-icon></button>
                                 <div class="w-full text-center">
                                    <div class="text-[10px] font-black uppercase truncate text-slate-800 leading-tight mb-1 px-1">{{p.name}}</div>
                                    <div class="flex items-center justify-center gap-2 w-full">
                                        <svg appBarcode [appBarcode]="p.id" [options]="barcodeOptions()" class="w-full h-auto"></svg>
                                    </div>
                                 </div>
                             </div>
                         }
                     </div>
                 }
            </div>
        </div>
      }

      <!-- MODALS -->
      @if (isFormOpen()) {
        <div class="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-scale-in max-h-[90vh] overflow-y-auto">
                <div class="bg-indigo-600 p-6 text-white flex justify-between items-center sticky top-0 z-10">
                    <h3 class="text-xl font-black uppercase tracking-tight">{{ editingId() ? 'Editar Insumo' : 'Cadastro de Insumo' }}</h3>
                    <button (click)="isFormOpen.set(false)" class="text-white/50 hover:text-white"><lucide-icon [img]="XCircle" [size]="24"></lucide-icon></button>
                </div>
                <div class="p-8 grid md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div>
                            <label class="text-[10px] font-black uppercase text-slate-400 mb-1 block">Código de Barras (SKU) <span class="text-rose-500">*</span></label>
                            <input [(ngModel)]="formData.id" [disabled]="!!editingId()" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-indigo-600 font-bold" placeholder="Bip do leitor ou manual..." />
                        </div>
                        <div>
                            <label class="text-[10px] font-black uppercase text-slate-400 mb-1 block">Nome Comercial <span class="text-rose-500">*</span></label>
                            <input [(ngModel)]="formData.name" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" placeholder="Ex: Toxina Botulínica" />
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black uppercase text-slate-400 mb-1 block">Categoria <span class="text-rose-500">*</span></label>
                                <input [(ngModel)]="formData.category" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" placeholder="Ex: Estética" />
                            </div>
                            <div>
                                <label class="text-[10px] font-black uppercase text-slate-400 mb-1 block">Marca / Fornecedor</label>
                                <input [(ngModel)]="formData.supplier" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" placeholder="Ex: Galderma" />
                            </div>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black uppercase text-slate-400 mb-1 block">Preço de Venda (R$)</label>
                                <input type="number" [(ngModel)]="formData.price" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                            </div>
                            @if (canViewInventoryCost()) {
                                <div>
                                    <label class="text-[10px] font-black uppercase text-slate-400 mb-1 block text-indigo-600">Preço de Custo (R$)</label>
                                    <input type="number" [(ngModel)]="formData.costPrice" class="w-full bg-indigo-50/30 border border-indigo-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700" />
                                </div>
                            }
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black uppercase text-slate-400 mb-1 block">Saldo {{editingId() ? 'Atual' : 'Inicial'}}</label>
                                <input type="number" [(ngModel)]="formData.currentStock" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                            </div>
                            <div>
                                <label class="text-[10px] font-black uppercase text-slate-400 mb-1 block">Vencimento</label>
                                <input type="date" [(ngModel)]="formData.expiryDate" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
                            </div>
                        </div>
                    </div>
                </div>
                <div class="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 z-10">
                    <button (click)="isFormOpen.set(false)" class="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors">DESCARTAR</button>
                    <button (click)="handleSaveProduct()" class="px-10 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2">
                        <lucide-icon [img]="Save" [size]="18"></lucide-icon> {{(editingId() ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR')}}
                    </button>
                </div>
            </div>
        </div>
      }

      @if (selectedProduct()) {
        <div class="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
             <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-in">
                <h3 class="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Movimentação</h3>
                <p class="text-slate-500 font-medium mb-6">Item: <span class="text-indigo-600 font-bold">{{selectedProduct()?.name}}</span></p>
                
                <div class="space-y-6">
                    <div>
                        <label class="text-xs font-bold text-slate-400 uppercase ml-1 block mb-2">Quantidade</label>
                        <div class="flex items-center justify-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                            <button (click)="moveQuantity.set(moveQuantity() > 1 ? moveQuantity() - 1 : 1)" class="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-slate-100 text-slate-400 transition-colors border border-slate-200"><lucide-icon [img]="Minus" [size]="20"></lucide-icon></button>
                            <input type="number" class="w-24 bg-transparent text-center text-3xl font-black text-slate-800 outline-none appearance-none" [value]="moveQuantity()" (input)="moveQuantity.set($any($event.target).valueAsNumber)" />
                            <button (click)="moveQuantity.set(moveQuantity() + 1)" class="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-slate-100 text-indigo-600 transition-colors border border-slate-200"><lucide-icon [img]="Plus" [size]="20"></lucide-icon></button>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 pt-4">
                        <button (click)="handleTransaction('IN')" class="bg-emerald-600 text-white py-4 rounded-2xl hover:bg-emerald-700 font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"><lucide-icon [img]="Plus" [size]="24"></lucide-icon> ENTRADA</button>
                        <button (click)="handleTransaction('OUT')" class="bg-rose-600 text-white py-4 rounded-2xl hover:bg-rose-700 font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-100"><lucide-icon [img]="Minus" [size]="24"></lucide-icon> SAÍDA</button>
                    </div>
                </div>
                <button (click)="selectedProduct.set(null)" class="w-full mt-6 text-slate-400 font-bold hover:text-slate-600 text-sm py-2">CANCELAR OPERAÇÃO</button>
             </div>
        </div>
      }

      @if (importConflicts().length > 0) {
        <app-import-conflict-modal 
          [conflicts]="importConflicts()"
          (resolved)="handleConflictResolution($event)"
          (completed)="importConflicts.set([])"
        ></app-import-conflict-modal>
      }
      }
    </div>
  `,
  styles: [
    `
    @keyframes scan { 0%, 100% { top: 10%; opacity: 0.5; } 50% { top: 90%; opacity: 1; } }
    .animate-scan { animation: scan 2s ease-in-out infinite; }
  `]
})
export class InventoryComponent {
  store = inject(Store);
  db = inject(DatabaseService);
  gemini = inject(GeminiService);
  csvService = inject(CsvImportService);
  printService = inject(PrintService);

  readonly IAM_PERMISSIONS = IAM_PERMISSIONS;

  readonly canViewInventoryCost = computed(() => 
    this.db.checkPermission(
      this.IAM_PERMISSIONS.INVENTORY_VIEW_COST, 
      this.db.selectedContextClinic() || this.db.currentUser()?.clinicId
    )
  );

  @ViewChild('scannerInput') scannerInput?: ElementRef<HTMLInputElement>;

  scannerMode = signal(false);
  lastScanStatus = signal<'success' | 'error' | null>(null);
  scannedCode = signal('');
  activeTab = signal<'stock' | 'print'>('stock');
  isAnalyzing = signal(false);
  aiAnalysis = signal('');
  searchTerm = signal('');
  viewFilter = signal<'all' | 'critical'>('all');
  selectedProduct = signal<Product | null>(null);
  moveQuantity = signal(1);
  printQueue = signal<Product[]>([]);
  isFormOpen = signal(false);
  editingId = signal<string | null>(null);
  importConflicts = signal<any[]>([]);
  
  labelConfig = signal<LabelConfig>({ cols: 3, size: 'standard', showPrice: false });

  // Store
  products = this.store.selectSignal(selectAllProducts);
  loading = this.store.selectSignal(selectInventoryLoading);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  constructor() {
    effect(() => {
        const clinicId = this.db.selectedContextClinic();
        if (clinicId) {
            this.store.dispatch(loadProducts({ clinicId }));
        }
    });

    effect(() => {
      if (this.scannerMode()) {
        setTimeout(() => {
          this.scannerInput?.nativeElement.focus();
        }, 100);
      }
    });

    effect(() => {
      // Reset pagination when filters change
      this.searchTerm();
      this.viewFilter();
      this.currentPage.set(1);
    }, { allowSignalWrites: true });
  }

  changePage(page: number) {
    this.currentPage.set(page);
  }
  
  filteredProducts = computed(() => {
    let products = this.products();
    
    if (this.viewFilter() === 'critical') {
      products = products.filter(p => p.stock <= p.minStock);
    }
    const term = this.searchTerm().toLowerCase();
    if (term) {
        products = products.filter(p => p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term));
    }
    return products;
  });

  paginatedProducts = computed(() => {
      const products = this.filteredProducts();
      const start = (this.currentPage() - 1) * this.pageSize();
      return products.slice(start, start + this.pageSize());
  });

  totalItems = computed(() => this.filteredProducts().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  barcodeOptions = computed(() => {
    const config = this.labelConfig();
    const isCompact = config.size === 'compact';
    const isNarrow = config.cols >= 4;
    return {
      height: isCompact ? 25 : 35,
      fontSize: 10,
      width: isNarrow ? 1.0 : 1.5,
      displayValue: true
    };
  });

  updateLabelConfig(update: Partial<LabelConfig>) {
    this.labelConfig.update(current => ({ ...current, ...update }));
  }

  formData: ProductFormData = { ...DEFAULT_PRODUCT_FORM_DATA };
  
  window = window;

  // Icons
  readonly Package = Package;
  readonly AlertTriangle = AlertTriangle;
  readonly Activity = Activity;
  readonly History = History;
  readonly Plus = Plus;
  readonly Minus = Minus;
  readonly Search = Search;
  readonly Sparkles = Sparkles;
  readonly ScanBarcode = ScanBarcode;
  readonly Printer = Printer;
  readonly XCircle = XCircle;
  readonly Settings = Settings;
  readonly QrCode = QrCode;
  readonly PlusCircle = PlusCircle;
  readonly ListChecks = ListChecks;
  readonly CheckCircle2 = CheckCircle2;
  readonly Scan = Scan;
  readonly CalendarClock = CalendarClock;
  readonly AlertCircle = AlertCircle;
  readonly LayoutGrid = LayoutGrid;
  readonly Edit3 = Edit3;
  readonly Save = Save;
  readonly Upload = Upload;
  readonly Download = Download;
  readonly ShieldAlert = ShieldAlert;
  readonly Trash2 = Trash2;

  handleDeleteProduct(p: Product) {
      if (confirm(`Tem certeza que deseja excluir "${p.name}"? Esta ação não pode ser desfeita.`)) {
          this.store.dispatch(deleteProduct({ id: p.id }));
      }
  }

  async handleRequestClinicAccess() {
    const clinicId = this.db.selectedContextClinic() || this.db.currentUser()?.clinicId;
    if (!clinicId || clinicId === 'all') return;
    
    const clinic = this.db.clinics().find(c => c.id === clinicId);
    const reason = prompt("Informe o motivo da solicitação de acesso:");
    if (reason) {
        await this.db.requestAccess(clinicId, clinic?.name || 'Unidade', reason);
        alert("Solicitação enviada com sucesso! Aguarde a aprovação do administrador local.");
    }
  }

  pages = computed(() => {
    const queue = this.printQueue();
    const config = this.labelConfig();
    const cols = config.cols || 3;
    const size = config.size;
    
    const rows = size === 'compact' ? 8 : 5;
    const itemsPerPage = cols * rows; 
    
    const chunks = [];
    for (let i = 0; i < queue.length; i += itemsPerPage) {
      chunks.push(queue.slice(i, i + itemsPerPage));
    }
    return chunks;
  });

  handleScanSubmit(event: Event) {
    event.preventDefault();
    const code = this.scannedCode();
    const product = this.products().find(p => p.id === code);
    
    if (product) {
        this.lastScanStatus.set('success');
        this.selectedProduct.set(product);
        this.moveQuantity.set(1);
        setTimeout(() => this.scannerMode.set(false), 500);
    } else {
        this.lastScanStatus.set('error');
        setTimeout(() => {
            this.scannerMode.set(false);
            this.openNewProductForm();
            this.formData.id = code; 
        }, 800);
    }
    setTimeout(() => this.lastScanStatus.set(null), 2000);
    this.scannedCode.set('');
  }

  async handleAiAnalysis() {
    this.isAnalyzing.set(true);
    const result = await this.gemini.analyzeInventoryRisks(this.products());
    this.aiAnalysis.set(result);
    this.isAnalyzing.set(false);
  }

  isNearExpiry(dateStr: string) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    return diff < (1000 * 60 * 60 * 24 * 90); // 90 days
  }

  addToQueue(p: Product) {
    this.printQueue.update(prev => [...prev, p]);
  }

  removeFromQueue(p: Product) {
    this.printQueue.update(prev => {
        const idx = prev.indexOf(p);
        if (idx > -1) {
            const n = [...prev];
            n.splice(idx, 1);
            return n;
        }
        return prev;
    });
  }

  openNewProductForm() {
    this.formData = { ...DEFAULT_PRODUCT_FORM_DATA };
    this.editingId.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(p: Product) {
    this.formData = { 
        id: p.id,
        name: p.name, 
        category: p.category, 
        currentStock: p.stock, 
        price: p.price,
        costPrice: p.costPrice || 0,
        minStock: p.minStock,
        supplier: p.supplier || '',
        expiryDate: p.expiryDate ? p.expiryDate.split('T')[0] : ''
    };
    this.editingId.set(p.id);
    this.isFormOpen.set(true);
  }

  handleSaveProduct() {
    const p: Product = {
        id: this.editingId() || this.formData.id || crypto.randomUUID(),
        clinicId: this.db.selectedContextClinic()!,
        name: this.formData.name,
        category: this.formData.category,
        stock: this.formData.currentStock,
        minStock: this.formData.minStock,
        price: this.formData.price,
        costPrice: this.formData.costPrice,
        supplier: this.formData.supplier,
        expiryDate: this.formData.expiryDate,
        batchNumber: 'GEN-' + Date.now()
    };
    this.store.dispatch(addProduct({ product: p }));
    this.isFormOpen.set(false);
  }

  handleTransaction(type: 'IN' | 'OUT') {
    const p = this.selectedProduct();
    if (p) {
        this.store.dispatch(addTransaction({
            transaction: {
                productId: p.id,
                clinicId: p.clinicId,
                productName: p.name,
                type: type,
                quantity: this.moveQuantity()
            }
        }));
        this.selectedProduct.set(null);
    }
  }

  async handleFileImport(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const rawData = await this.csvService.parseCsv(file);
    const clinicId = this.db.selectedContextClinic() || 'default';
    const parsedProducts = rawData.map(row => this.csvService.mapToProduct(row, clinicId));
    
    const conflicts = this.csvService.detectConflicts(parsedProducts, this.products());
    
    const conflictingIds = new Set(conflicts.map(c => c.product.id));
    const cleanItems = parsedProducts.filter(p => p.id && !conflictingIds.has(p.id));
    
    for (const item of cleanItems) {
      if (item.id && item.name) {
        this.store.dispatch(addProduct({ product: item as Product }));
      }
    }

    if (conflicts.length > 0) {
      this.importConflicts.set(conflicts);
    } else {
      alert(`${cleanItems.length} itens importados com sucesso!`);
    }
    
    input.value = ''; 
  }

  async handleConflictResolution(event: { conflict: any, product: Product, action: 'CREATE' | 'UPDATE' | 'KEEP_EXISTING' }) {
    const { conflict, product, action } = event;
    
    if (action === 'CREATE') {
      if (conflict.type === 'NEW') {
          this.store.dispatch(addProduct({ product: product }));
      }
    } else if (action === 'UPDATE') {
      const merged: Product = { 
          ...conflict.existing, 
          ...product,
          id: conflict.existing.id
      };
      this.store.dispatch(addProduct({ product: merged }));
    }
  }

  exportCsv() {
    const products = this.products();
    if (products.length === 0) return;

    const headers = ['ID/Código', 'Nome', 'Categoria', 'Estoque', 'Mínimo', 'Preço Venda', 'Preço Custo', 'Validade', 'Fornecedor', 'Notas'];
    const csvContent = [
      headers.join(','),
      ...products.map(p => [
        p.id,
        `"${p.name}"`, 
        `"${p.category}"`, 
        p.stock,
        p.minStock,
        `"${p.price.toFixed(2).replace('.', ',')}"`, 
        `"${(p.costPrice || 0).toFixed(2).replace('.', ',')}"`, 
        p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('pt-BR') : '',
        `"${p.supplier}"`, 
        `"${p.notes || ''}"` 
      ].join(','))
    ].join('\n'); 

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `estoque_intraclinica_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}