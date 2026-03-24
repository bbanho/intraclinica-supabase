import { Component, inject, signal, computed, effect } from '@angular/core';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { LucideAngularModule, Plus, Package, Search, AlertCircle, TrendingDown, TrendingUp, RefreshCw, Stethoscope, ChevronRight } from 'lucide-angular';
import { CurrencyPipe } from '@angular/common';
import { InventoryService, Product } from '../../core/services/inventory.service';
import { ProcedureService, ProcedureType } from '../../core/services/procedure.service';
import { ClinicContextService } from '../../core/services/clinic-context.service';
import { IamService } from '../../core/services/iam.service';
import { ProductModalComponent } from './product-modal/product-modal.component';
import { ProcedureModalComponent } from './procedure-modal/procedure-modal.component';
import { RecipePanelComponent } from './recipe-panel/recipe-panel.component';

type TabType = 'products' | 'procedures';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [DialogModule, LucideAngularModule, CurrencyPipe, RecipePanelComponent],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <lucide-icon [img]="PackageIcon" class="text-blue-600" size="24"></lucide-icon>
            Gestão de Estoque
          </h1>
          <p class="text-sm text-gray-500 mt-1">Gerencie seus produtos, insumos e movimentações</p>
        </div>
        
        <div class="flex items-center gap-3">
          <button 
            (click)="activeTab() === 'products' ? loadProducts() : loadProcedures()" 
            [disabled]="loading()"
            class="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
            title="Recarregar"
          >
            <lucide-icon [img]="RefreshIcon" size="20" [class.animate-spin]="loading()"></lucide-icon>
          </button>
          
          @if (activeTab() === 'products') {
            <button 
              (click)="openNewProductModal()"
              class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              data-testid="new-product-button"
            >
              <lucide-icon [img]="PlusIcon" size="18"></lucide-icon>
              Novo Produto
            </button>
          } @else {
            <button 
              (click)="openNewProcedureModal()"
              class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              data-testid="new-procedure-button"
            >
              <lucide-icon [img]="PlusIcon" size="18"></lucide-icon>
              Novo Procedimento
            </button>
          }
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="mb-6 border-b border-gray-200">
        <nav class="flex gap-8" aria-label="Tabs">
          <button
            (click)="activeTab.set('products')"
            class="pb-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none"
            [class.border-blue-600]="activeTab() === 'products'"
            [class.text-blue-600]="activeTab() === 'products'"
            [class.border-transparent]="activeTab() !== 'products'"
            [class.text-gray-500]="activeTab() !== 'products'"
            [class.hover:text-gray-700]="activeTab() !== 'products'"
            data-testid="products-tab"
          >
            Produtos
          </button>
          <button
            (click)="activeTab.set('procedures')"
            class="pb-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none"
            [class.border-indigo-600]="activeTab() === 'procedures'"
            [class.text-indigo-600]="activeTab() === 'procedures'"
            [class.border-transparent]="activeTab() !== 'procedures'"
            [class.text-gray-500]="activeTab() !== 'procedures'"
            [class.hover:text-gray-700]="activeTab() !== 'procedures'"
            data-testid="procedures-tab"
          >
            Procedimentos
          </button>
        </nav>
      </div>

      <!-- Products Tab Content -->
      @if (activeTab() === 'products') {
        <!-- State Handling -->
        @if (error()) {
          <div class="p-6 bg-rose-50 border border-rose-100 rounded-lg flex flex-col items-center justify-center text-center">
            <lucide-icon [img]="AlertCircleIcon" class="text-rose-500 mb-3" size="32"></lucide-icon>
            <h3 class="text-lg font-medium text-rose-800">Falha ao carregar estoque</h3>
            <p class="text-sm text-rose-600 mt-1 mb-4">{{ error() }}</p>
            <button (click)="loadProducts()" class="px-4 py-2 bg-white text-rose-700 text-sm font-medium rounded-md shadow-sm border border-rose-200 hover:bg-rose-50 transition-colors">
              Tentar novamente
            </button>
          </div>
        } @else if (loading() && !products().length) {
          <!-- Skeleton -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            @for (i of [1,2,3,4,5,6,7,8]; track i) {
              <div class="bg-white p-5 rounded-lg border border-gray-100 shadow-sm animate-pulse">
                <div class="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div class="space-y-2">
                  <div class="h-3 bg-gray-100 rounded w-1/2"></div>
                  <div class="h-3 bg-gray-100 rounded w-5/6"></div>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                  <div class="h-6 bg-gray-200 rounded-full w-16"></div>
                  <div class="h-4 bg-gray-100 rounded w-12"></div>
                </div>
              </div>
            }
          </div>
        } @else if (!products().length) {
          <!-- Empty State -->
          <div class="p-12 bg-white border border-gray-100 rounded-lg flex flex-col items-center justify-center text-center shadow-sm">
            <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600">
              <lucide-icon [img]="PackageIcon" size="32"></lucide-icon>
            </div>
            <h3 class="text-lg font-medium text-gray-900">Nenhum produto cadastrado</h3>
            <p class="text-sm text-gray-500 mt-1 max-w-sm">Comece adicionando produtos e insumos ao seu estoque para gerenciá-los.</p>
            <button (click)="openNewProductModal()" class="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors">
              Cadastrar Primeiro Produto
            </button>
          </div>
        } @else {
          <!-- Stats Summary -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                <lucide-icon [img]="PackageIcon" size="24"></lucide-icon>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500">Total de Produtos</p>
                <p class="text-2xl font-bold text-gray-900">{{ filteredProducts().length }}</p>
              </div>
            </div>
            
            <div class="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex items-center gap-4">
              <div class="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                <lucide-icon [img]="TrendingUpIcon" size="24"></lucide-icon>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500">Valor em Estoque</p>
                <p class="text-2xl font-bold text-gray-900">{{ totalValue() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</p>
              </div>
            </div>

            <div class="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex items-center gap-4" [class.bg-rose-50]="lowStockCount() > 0" [class.border-rose-100]="lowStockCount() > 0">
              <div class="w-12 h-12 rounded-full flex items-center justify-center" [class.bg-rose-100]="lowStockCount() > 0" [class.text-rose-600]="lowStockCount() > 0" [class.bg-orange-50]="lowStockCount() === 0" [class.text-orange-600]="lowStockCount() === 0">
                <lucide-icon [img]="TrendingDownIcon" size="24"></lucide-icon>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500" [class.text-rose-600]="lowStockCount() > 0">Estoque Baixo</p>
                <p class="text-2xl font-bold text-gray-900" [class.text-rose-700]="lowStockCount() > 0">{{ lowStockCount() }} <span class="text-sm font-normal text-gray-500">itens</span></p>
              </div>
            </div>
          </div>

          <!-- Category Filter -->
          @if (categories().length > 2) {
            <div class="mb-4 flex items-center gap-3">
              <label class="text-sm font-medium text-gray-600">Filtrar por categoria:</label>
              <select 
                #categorySelect
                [value]="selectedCategory()"
                (change)="selectedCategory.set(categorySelect.value)"
                class="px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                @for (cat of categories(); track cat) {
                  <option [value]="cat">{{ cat === 'all' ? 'Todas as categorias' : cat }}</option>
                }
              </select>
              @if (selectedCategory() !== 'all') {
                <button 
                  (click)="selectedCategory.set('all')"
                  class="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Limpar filtro
                </button>
              }
            </div>
          }

          <!-- Product Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            @for (product of filteredProducts(); track product.id) {
              <div 
                class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-gray-300 flex flex-col h-full"
                [class.border-rose-200]="product.current_stock < product.min_stock"
                [class.bg-rose-50]="product.current_stock < product.min_stock"
              >
                <div class="p-5 flex-1">
                  <div class="flex justify-between items-start mb-2 gap-2">
                    <h3 class="font-semibold text-gray-900 line-clamp-2" [class.text-rose-900]="product.current_stock < product.min_stock">{{ product.name }}</h3>
                    
                    @if (product.current_stock < product.min_stock) {
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 whitespace-nowrap">
                        Abaixo do Mín.
                      </span>
                    }
                  </div>
                  
                  @if (product.category) {
                    <p class="text-xs text-gray-500 mb-4 inline-flex items-center px-2 py-1 bg-gray-100 rounded-md">
                      {{ product.category }}
                    </p>
                  }
                  
                  <div class="space-y-1 mt-auto">
                    @if (canViewCost()) {
                      <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Custo:</span>
                        <span class="font-medium">{{ product.cost | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
                      </div>
                    }
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-500">Preço:</span>
                      <span class="font-medium">{{ product.price | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between" [class.bg-rose-100]="product.current_stock < product.min_stock" [class.border-rose-200]="product.current_stock < product.min_stock">
                  <div class="text-sm text-gray-500" [class.text-rose-700]="product.current_stock < product.min_stock">
                    Min: {{ product.min_stock }}
                  </div>
                  <div class="font-semibold" [class.text-rose-600]="product.current_stock < product.min_stock" [class.text-emerald-600]="product.current_stock >= product.min_stock">
                    {{ product.current_stock }} em estoque
                  </div>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Procedures Tab Content -->
      @if (activeTab() === 'procedures') {
        @if (procedureError()) {
          <div class="p-6 bg-rose-50 border border-rose-100 rounded-lg flex flex-col items-center justify-center text-center">
            <lucide-icon [img]="AlertCircleIcon" class="text-rose-500 mb-3" size="32"></lucide-icon>
            <h3 class="text-lg font-medium text-rose-800">Falha ao carregar procedimentos</h3>
            <p class="text-sm text-rose-600 mt-1 mb-4">{{ procedureError() }}</p>
            <button (click)="loadProcedures()" class="px-4 py-2 bg-white text-rose-700 text-sm font-medium rounded-md shadow-sm border border-rose-200 hover:bg-rose-50 transition-colors">
              Tentar novamente
            </button>
          </div>
        } @else if (proceduresLoading() && !procedures().length) {
          <!-- Skeleton -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div class="p-4 border-b border-gray-100 bg-slate-50 animate-pulse">
                <div class="h-10 bg-gray-200 rounded-xl w-full"></div>
              </div>
              <div class="p-4 space-y-3">
                @for (i of [1,2,3,4]; track i) {
                  <div class="p-4 rounded-xl border border-gray-100">
                    <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div class="h-3 bg-gray-100 rounded w-1/2"></div>
                  </div>
                }
              </div>
            </div>
            <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 h-96 animate-pulse">
              <div class="h-full bg-gray-100"></div>
            </div>
          </div>
        } @else if (!procedures().length) {
          <!-- Empty State -->
          <div class="p-12 bg-white border border-gray-100 rounded-lg flex flex-col items-center justify-center text-center shadow-sm">
            <div class="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 text-indigo-600">
              <lucide-icon [img]="StethoscopeIcon" size="32"></lucide-icon>
            </div>
            <h3 class="text-lg font-medium text-gray-900">Nenhum procedimento cadastrado</h3>
            <p class="text-sm text-gray-500 mt-1 max-w-sm">Adicione procedimentos para gerenciar o consumo de insumos.</p>
            <button (click)="openNewProcedureModal()" class="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors">
              Cadastrar Primeiro Procedimento
            </button>
          </div>
        } @else {
          <!-- Procedure List + Recipe Panel -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Procedure List -->
            <div class="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-280px)]">
              <div class="p-4 border-b border-gray-100 bg-slate-50">
                <div class="relative">
                  <lucide-icon [img]="SearchIcon" class="absolute left-3 top-3 text-gray-400" [size]="18"></lucide-icon>
                  <input 
                    type="text" 
                    placeholder="Buscar procedimentos..." 
                    class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700"
                    [value]="procedureSearchTerm()"
                    (input)="procedureSearchTerm.set($any($event.target).value)"
                    data-testid="procedure-search-input"
                  />
                </div>
              </div>
              
              <div class="overflow-y-auto flex-1 p-2 space-y-2">
                @for (proc of filteredProcedures(); track proc.id) {
                  <div 
                    (click)="selectProcedure(proc)"
                    [class.bg-indigo-50]="selectedProcedure()?.id === proc.id"
                    [class.border-indigo-200]="selectedProcedure()?.id === proc.id"
                    class="p-4 rounded-xl border border-transparent hover:bg-slate-50 cursor-pointer transition-all group relative"
                    data-testid="procedure-list-item"
                  >
                    <div class="flex justify-between items-start">
                      <div>
                        <h3 class="font-bold text-gray-800 text-sm" data-testid="procedure-item-name">{{ proc.name }}</h3>
                        <span class="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded" data-testid="procedure-item-code">{{ proc.code || 'SEM CÓDIGO' }}</span>
                      </div>
                      <lucide-icon [img]="ChevronRightIcon" [size]="16" class="text-gray-300 group-hover:text-indigo-500 transition-colors"></lucide-icon>
                    </div>
                    <div class="mt-2 flex items-center gap-2 text-xs font-medium text-gray-500">
                      <span class="text-emerald-600 font-bold" data-testid="procedure-item-price">{{ proc.price | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
                      @if (!proc.active) {
                        <span class="text-rose-500 bg-rose-50 px-1.5 rounded text-[10px] font-bold">INATIVO</span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Recipe Panel -->
            <div class="lg:col-span-2">
              <app-recipe-panel
                [procedure]="selectedProcedure()"
                [inventoryItems]="products()"
                (recipeChange)="onRecipeChange()"
              ></app-recipe-panel>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class InventoryComponent {
  private inventoryService = inject(InventoryService);
  private procedureService = inject(ProcedureService);
  private clinicContext = inject(ClinicContextService);
  private iam = inject(IamService);
  private dialog = inject(Dialog);

  canViewCost = computed(() => this.iam.can('inventory.view_cost'));

  readonly PlusIcon = Plus;
  readonly PackageIcon = Package;
  readonly SearchIcon = Search;
  readonly AlertCircleIcon = AlertCircle;
  readonly TrendingDownIcon = TrendingDown;
  readonly TrendingUpIcon = TrendingUp;
  readonly RefreshIcon = RefreshCw;
  readonly StethoscopeIcon = Stethoscope;
  readonly ChevronRightIcon = ChevronRight;

  activeTab = signal<TabType>('products');

  products = signal<Product[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  selectedCategory = signal<string>('all');

  procedures = signal<ProcedureType[]>([]);
  proceduresLoading = signal(false);
  procedureError = signal<string | null>(null);
  selectedProcedure = signal<ProcedureType | null>(null);
  procedureSearchTerm = signal('');

  totalValue = computed(() => {
    return this.filteredProducts().reduce((total, p) => total + (p.price * p.current_stock), 0);
  });

  lowStockCount = computed(() => {
    return this.filteredProducts().filter(p => p.current_stock < p.min_stock).length;
  });

  categories = computed(() => {
    const cats = this.products()
      .map(p => p.category)
      .filter(c => c && c.trim() !== '');
    return ['all', ...new Set(cats)];
  });

  filteredProducts = computed(() => {
    const cat = this.selectedCategory();
    const list = this.products();
    if (cat === 'all') return list;
    return list.filter(p => p.category === cat);
  });

  filteredProcedures = computed(() => {
    const term = this.procedureSearchTerm().toLowerCase();
    return this.procedures().filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.code && p.code.toLowerCase().includes(term))
    );
  });

  constructor() {
    effect(() => {
      const clinicId = this.clinicContext.selectedClinicId();
      if (clinicId && clinicId !== 'all') {
        if (this.activeTab() === 'products') {
          this.loadProducts();
        } else {
          this.loadProcedures();
        }
      } else {
        this.products.set([]);
        this.procedures.set([]);
        this.selectedProcedure.set(null);
      }
    });
  }

  async loadProducts() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.inventoryService.getProducts();
      this.products.set(data);
    } catch (err: any) {
      console.error('Error loading products:', err);
      this.error.set(err?.message || 'Ocorreu um erro ao carregar os produtos. Tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadProcedures() {
    this.proceduresLoading.set(true);
    this.procedureError.set(null);
    try {
      const data = await this.procedureService.getProcedureTypes();
      this.procedures.set(data);
    } catch (err: any) {
      console.error('Error loading procedures:', err);
      this.procedureError.set(err?.message || 'Ocorreu um erro ao carregar os procedimentos. Tente novamente.');
    } finally {
      this.proceduresLoading.set(false);
    }
  }

  selectProcedure(proc: ProcedureType) {
    this.selectedProcedure.set(proc);
  }

  onRecipeChange() {
    this.loadProcedures();
  }

  openNewProductModal() {
    const dialogRef = this.dialog.open(ProductModalComponent, {
      minWidth: '500px',
      panelClass: 'bg-transparent',
      backdropClass: 'bg-black/50'
    });

    dialogRef.closed.subscribe((newProduct: any) => {
      if (newProduct) {
        this.products.update(curr => [...curr, newProduct].sort((a, b) => a.name.localeCompare(b.name)));
      }
    });
  }

  openNewProcedureModal(proc?: ProcedureType) {
    const dialogRef = this.dialog.open(ProcedureModalComponent, {
      minWidth: '500px',
      panelClass: 'bg-transparent',
      backdropClass: 'bg-black/50',
      data: { procedure: proc, clinicId: this.clinicContext.selectedClinicId() }
    });

    dialogRef.closed.subscribe((result: any) => {
      if (result) {
        if (proc) {
          this.procedures.update(list => 
            list.map(p => p.id === result.id ? result : p)
          );
        } else {
          this.procedures.update(curr => [...curr, result].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
    });
  }
}
