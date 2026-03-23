import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { LucideAngularModule, Plus, Package, Search, AlertCircle, TrendingDown, TrendingUp, RefreshCw } from 'lucide-angular';
import { InventoryService, Product } from '../../core/services/inventory.service';
import { ClinicContextService } from '../../core/services/clinic-context.service';
import { ProductModalComponent } from './product-modal/product-modal.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, DialogModule, LucideAngularModule],
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
            (click)="loadProducts()" 
            [disabled]="loading()"
            class="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
            title="Recarregar"
          >
            <lucide-icon [img]="RefreshIcon" size="20" [class.animate-spin]="loading()"></lucide-icon>
          </button>
          
          <button 
            (click)="openNewProductModal()"
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <lucide-icon [img]="PlusIcon" size="18"></lucide-icon>
            Novo Produto
          </button>
        </div>
      </div>

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
              [value]="selectedCategory()"
              (change)="selectedCategory.set($any($event.target).value)"
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
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Custo:</span>
                    <span class="font-medium">{{ product.cost | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
                  </div>
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
    </div>
  `
})
export class InventoryComponent {
  private inventoryService = inject(InventoryService);
  private clinicContext = inject(ClinicContextService);
  private dialog = inject(Dialog);

  readonly PlusIcon = Plus;
  readonly PackageIcon = Package;
  readonly SearchIcon = Search;
  readonly AlertCircleIcon = AlertCircle;
  readonly TrendingDownIcon = TrendingDown;
  readonly TrendingUpIcon = TrendingUp;
  readonly RefreshIcon = RefreshCw;

  products = signal<Product[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  selectedCategory = signal<string>('all');

  totalValue = computed(() => {
    return this.filteredProducts().reduce((total, p) => total + (p.cost * p.current_stock), 0);
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

  constructor() {
    effect(() => {
      const clinicId = this.clinicContext.selectedClinicId();
      if (clinicId && clinicId !== 'all') {
        this.loadProducts();
      } else {
        this.products.set([]);
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

  openNewProductModal() {
    const dialogRef = this.dialog.open(ProductModalComponent, {
      minWidth: '500px',
      panelClass: 'bg-transparent',
      backdropClass: 'bg-black/50'
    });

    dialogRef.closed.subscribe((newProduct: any) => {
      if (newProduct) {
        // Optimistic update
        this.products.update(curr => [...curr, newProduct].sort((a, b) => a.name.localeCompare(b.name)));
      }
    });
  }
}
