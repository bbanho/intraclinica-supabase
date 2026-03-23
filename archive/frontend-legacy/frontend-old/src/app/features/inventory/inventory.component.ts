import { Component, computed, inject, signal, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../core/services/inventory.service';
import { DatabaseService } from '../../core/services/database.service';
import { InventoryItem, InventoryMovement } from '../../core/models/inventory.types';
import { LabelConfig } from '../../core/models/types';
import { LucideAngularModule, Package, AlertTriangle, Activity, History, Plus, Minus, Search, Sparkles, ScanBarcode, Printer, XCircle, Settings, QrCode, PlusCircle, ListChecks, CheckCircle2, Scan, CalendarClock, AlertCircle, LayoutGrid, Edit3, Save, Upload, Download, ShieldAlert, Trash2 } from 'lucide-angular';
import { PrintService } from '../../core/services/print.service';
import { BarcodeDirective } from '../../shared/directives/barcode.directive';

interface ItemFormData {
  id: string; // SKU/Barcode
  name: string;
  description: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  avg_cost_price: number;
}

const DEFAULT_FORM_DATA: ItemFormData = { 
  id: '', name: '', description: '', unit: 'un', current_stock: 0, min_stock: 10, avg_cost_price: 0 
};

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, BarcodeDirective],
  templateUrl: './inventory.component.html',
  styles: [`
    @keyframes scan { 0%, 100% { top: 10%; opacity: 0.5; } 50% { top: 90%; opacity: 1; } }
    .animate-scan { animation: scan 2s ease-in-out infinite; }
  `]
})
export class InventoryComponent {
  private inventoryService = inject(InventoryService);
  private db = inject(DatabaseService);
  printService = inject(PrintService);

  // Signals
  items = signal<InventoryItem[]>([]);
  loading = signal(false);
  
  // UI State
  scannerMode = signal(false);
  lastScanStatus = signal<'success' | 'error' | null>(null);
  scannedCode = signal('');
  activeTab = signal<'stock' | 'print'>('stock');
  searchTerm = signal('');
  viewFilter = signal<'all' | 'critical'>('all');
  selectedItem = signal<InventoryItem | null>(null);
  moveQuantity = signal(1);
  printQueue = signal<InventoryItem[]>([]);
  
  // Form State
  isFormOpen = signal(false);
  editingId = signal<string | null>(null);
  formData = { ...DEFAULT_FORM_DATA };

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);
  
  // Label Config
  labelConfig = signal<LabelConfig>({ cols: 3, size: 'standard', showPrice: false });

  @ViewChild('scannerInput') scannerInput?: ElementRef<HTMLInputElement>;

  // Computed
  filteredItems = computed(() => {
    let list = this.items();
    if (this.viewFilter() === 'critical') {
      list = list.filter(i => i.current_stock <= i.min_stock);
    }
    const term = this.searchTerm().toLowerCase();
    if (term) {
      list = list.filter(i => i.name.toLowerCase().includes(term) || i.id.toLowerCase().includes(term));
    }
    return list;
  });

  paginatedItems = computed(() => {
    const list = this.filteredItems();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  totalItems = computed(() => this.filteredItems().length);
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
  
  printPages = computed(() => {
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

  constructor() {
    effect(() => {
      const clinicId = this.db.selectedContextClinic();
      // 'all' is SUPER_ADMIN global sentinel — not a valid clinic UUID for inventory queries
      if (clinicId && clinicId !== 'all') {
        this.loadItems();
      }
    });

    effect(() => {
      if (this.scannerMode()) {
        setTimeout(() => this.scannerInput?.nativeElement.focus(), 100);
      }
    });
  }

  async loadItems() {
    try {
      this.loading.set(true);
      const data = await this.inventoryService.getItems();
      this.items.set(data);
    } catch (e) {
      console.error('Error loading inventory:', e);
    } finally {
      this.loading.set(false);
    }
  }

  // Actions
  openNewItemForm() {
    this.formData = { ...DEFAULT_FORM_DATA };
    this.editingId.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(item: InventoryItem) {
    this.formData = {
      id: item.id,
      name: item.name,
      description: item.description || '',
      unit: item.unit,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      avg_cost_price: item.avg_cost_price
    };
    this.editingId.set(item.id);
    this.isFormOpen.set(true);
  }

  async handleSaveItem() {
    try {
      const payload = {
        name: this.formData.name,
        description: this.formData.description,
        unit: this.formData.unit,
        current_stock: this.formData.current_stock,
        min_stock: this.formData.min_stock,
        avg_cost_price: this.formData.avg_cost_price
      };

      if (this.editingId()) {
        await this.inventoryService.updateItem(this.editingId()!, payload);
      } else {
        // ID is auto-generated by DB if not provided, but here we might want to use barcode as ID?
        // The DB schema says id uuid default gen_random_uuid().
        // If we want to support custom barcodes, we might need to store them in a separate field or assume ID is the barcode (which must be UUID).
        // Since the schema defines ID as UUID, we CANNOT use arbitrary barcodes as ID.
        // We probably need a 'barcode' field in the schema, but I cannot change schema.
        // I will assume ID is internal UUID and barcode is... missing? 
        // Or maybe 'code' in procedure_type? 
        // Wait, inventory_item has NO barcode field. 
        // I'll use 'description' or just rely on Name search for now. 
        // Or strictly follow the schema: ID is UUID. Barcode scanning will likely fail unless we scan UUIDs.
        // I'll proceed with UUIDs.
        await this.inventoryService.createItem(payload);
      }
      await this.loadItems();
      this.isFormOpen.set(false);
    } catch (e) {
      console.error('Error saving item:', e);
      alert('Erro ao salvar item.');
    }
  }

  async handleDeleteItem(item: InventoryItem) {
    if (!confirm(`Excluir "${item.name}"?`)) return;
    try {
      await this.inventoryService.deleteItem(item.id);
      await this.loadItems();
    } catch (e) {
      console.error('Error deleting item:', e);
      alert('Erro ao excluir item.');
    }
  }

  async handleTransaction(type: 'IN' | 'OUT') {
    const item = this.selectedItem();
    if (!item) return;

    try {
      const qty = type === 'IN' ? this.moveQuantity() : -this.moveQuantity();
      await this.inventoryService.recordMovement({
        item_id: item.id,
        qty_change: qty,
        reason: type === 'IN' ? 'PURCHASE' : 'PROCEDURE', // simplified
        notes: 'Manual movement'
      });
      
      await this.loadItems(); // Refresh stock
      this.selectedItem.set(null);
    } catch (e) {
      console.error('Error moving stock:', e);
      alert('Erro ao movimentar estoque.');
    }
  }

  // Scanner
  handleScanSubmit(event: Event) {
    event.preventDefault();
    const code = this.scannedCode();
    // Assuming we scan UUIDs for now as schema forces it
    const item = this.items().find(i => i.id === code);
    
    if (item) {
      this.lastScanStatus.set('success');
      this.selectedItem.set(item);
      this.moveQuantity.set(1);
      setTimeout(() => this.scannerMode.set(false), 500);
    } else {
      this.lastScanStatus.set('error');
    }
    setTimeout(() => this.lastScanStatus.set(null), 2000);
    this.scannedCode.set('');
  }

  // Queue
  addToQueue(item: InventoryItem) {
    this.printQueue.update(q => [...q, item]);
  }
  
  removeFromQueue(item: InventoryItem) {
    this.printQueue.update(q => {
      const idx = q.indexOf(item);
      if (idx > -1) {
        const n = [...q];
        n.splice(idx, 1);
        return n;
      }
      return q;
    });
  }
  
  updateLabelConfig(c: Partial<LabelConfig>) {
    this.labelConfig.update(prev => ({...prev, ...c}));
  }
  
  changePage(p: number) { this.currentPage.set(p); }

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
}
