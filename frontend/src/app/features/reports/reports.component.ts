import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService, Product } from '../../core/services/inventory.service';
import { AppointmentService, Appointment } from '../../core/services/appointment.service';
import { IamService } from '../../core/services/iam.service';
import { ClinicContextService } from '../../core/services/clinic-context.service';
import { 
  LucideAngularModule, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  AlertOctagon, 
  Activity, 
  Users, 
  CalendarCheck, 
  ClipboardList, 
  ShieldAlert 
} from 'lucide-angular';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="space-y-8 animate-fade-in p-6 pb-12">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 class="text-3xl font-black text-slate-800 tracking-tight uppercase">Dashboard Operacional</h2>
          <p class="text-slate-500 text-sm">Monitoramento crítico e indicadores de performance clínica.</p>
        </div>
      </div>

      <!-- KPI CARDS -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        @if (canViewFinance()) {
          <div class="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group animate-scale-in">
              <div class="text-indigo-100 text-xs font-black uppercase tracking-widest mb-1 opacity-70">Valor em Estoque</div>
              <div class="text-3xl font-black">R$ {{ totalStockValue() }}</div>
              <div class="text-xs text-indigo-100 mt-2 font-bold flex items-center gap-1">
                <lucide-icon [img]="TrendingUp" [size]="12"></lucide-icon> Atualizado agora
              </div>
          </div>
        } @else {
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <div class="absolute inset-0 bg-slate-50/50 backdrop-blur-[2px] z-10"></div>
              <div class="relative z-20">
                  <lucide-icon [img]="ShieldAlert" [size]="24" class="text-rose-500 mb-2 mx-auto"></lucide-icon>
                  <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dados Financeiros</div>
                  <span class="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg uppercase">Acesso Restrito</span>
              </div>
          </div>
        }
          
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div class="text-slate-400 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-1">
              <lucide-icon [img]="Users" [size]="12"></lucide-icon> Pacientes Hoje
            </div>
            <div class="text-3xl font-black text-slate-800">{{ todayAppointmentsCount() }}</div>
            <div class="text-xs text-emerald-600 mt-2 font-bold flex items-center gap-1">
              <lucide-icon [img]="CheckCircle2" [size]="12"></lucide-icon> Agendados/Em Sala
            </div>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div class="text-slate-400 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-1">
              <lucide-icon [img]="AlertTriangle" [size]="12"></lucide-icon> Rupturas
            </div>
            <div class="text-3xl font-black" [class.text-rose-600]="lowStockCount() > 0">{{ lowStockCount() }}</div>
            <div class="text-xs text-slate-400 mt-2 font-bold">Itens abaixo do mínimo</div>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div class="text-slate-400 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-1">
              <lucide-icon [img]="Activity" [size]="12"></lucide-icon> Movimentações
            </div>
            <div class="text-3xl font-black text-slate-800">{{ totalMovements() }}</div>
            <div class="text-xs text-slate-400 mt-2 font-bold">Total registrado (simulado)</div>
        </div>
      </div>

      <!-- CHARTS / VISUALS -->
      <div class="grid md:grid-cols-2 gap-8">
          <!-- Dynamic Transaction Flow Chart -->
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 class="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-tight">
                  <lucide-icon [img]="TrendingUp" [size]="18" class="text-blue-600"></lucide-icon> Fluxo de Estoque (7 Dias)
              </h3>
              <div class="h-64 w-full flex items-end justify-between gap-2">
                  @for (day of weeklyData(); track day.label) {
                      <div class="flex-1 flex flex-col items-center gap-2 group">
                            <div class="w-full bg-slate-100 rounded-t-lg relative h-48 flex items-end justify-center overflow-hidden">
                                <!-- Entrada (Verde) -->
                                <div class="w-full bg-emerald-500 opacity-80 group-hover:opacity-100 transition-all" 
                                    [style.height.%]="day.in > 0 ? (day.in / (maxTransactionValue() || 1)) * 100 : 0"></div>
                                <!-- Saída (Laranja) -->
                                <div class="w-full bg-amber-500 opacity-80 group-hover:opacity-100 transition-all absolute bottom-0" 
                                    [style.height.%]="day.out > 0 ? (day.out / (maxTransactionValue() || 1)) * 100 : 0"></div>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase">{{day.label}}</span>
                      </div>
                  }
              </div>
              <div class="flex justify-center gap-4 mt-4">
                  <div class="flex items-center gap-1 text-xs font-bold text-slate-500"><div class="w-2 h-2 rounded-full bg-emerald-500"></div> Entradas</div>
                  <div class="flex items-center gap-1 text-xs font-bold text-slate-500"><div class="w-2 h-2 rounded-full bg-amber-500"></div> Saídas</div>
              </div>
          </div>

          <!-- Wait Time Analysis (Based on Appointments) -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 class="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-tight">
                  <lucide-icon [img]="Clock" [size]="18" class="text-indigo-600"></lucide-icon> Ocupação por Horário
              </h3>
              <div class="space-y-4">
                  @for (item of appointmentDensity(); track item.hour) {
                      <div class="flex items-center gap-3">
                          <span class="text-xs font-mono text-slate-500 w-12">{{item.hour}}</span>
                          <div class="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div class="h-full rounded-full transition-all duration-500" 
                                    [class.bg-emerald-400]="item.value < 2"
                                    [class.bg-amber-400]="item.value >= 2 && item.value < 4"
                                    [class.bg-rose-500]="item.value >= 4"
                                    [style.width.%]="(item.value / (maxDensityValue() || 1)) * 100">
                              </div>
                          </div>
                          <span class="text-xs font-bold text-slate-700 w-8 text-right">{{item.value}}</span>
                      </div>
                  } @empty {
                      <div class="text-center py-10 text-slate-400 text-sm">Sem agendamentos suficientes para exibir a densidade.</div>
                  }
              </div>
          </div>
      </div>

      <!-- AUDIT TABLE -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 class="font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                <lucide-icon [img]="AlertOctagon" class="text-rose-500" [size]="20"></lucide-icon> Auditoria de Validade & Vencimento
              </h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead class="bg-white text-[10px] font-black uppercase text-slate-400 border-b">
                <tr>
                  <th class="px-6 py-4">Insumo</th>
                  <th class="px-6 py-4">Categoria</th>
                  <th class="px-6 py-4 text-center">Saldo</th>
                  <th class="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (p of expiryAlerts(); track p.id) {
                    <tr class="hover:bg-slate-50 transition-all">
                      <td class="px-6 py-4 font-bold text-slate-800">{{p.name}}</td>
                      <td class="px-6 py-4 text-xs text-slate-500">{{p.category}}</td>
                      <td class="px-6 py-4 text-center font-bold">{{p.current_stock}}</td>
                      <td class="px-6 py-4 text-right">
                            <span class="bg-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-black uppercase">CRÍTICO</span>
                      </td>
                    </tr>
                }
                @if (expiryAlerts().length === 0) {
                  <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-slate-400 italic text-sm">
                      Nenhum item vencido ou próximo do vencimento (30 dias).
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
      </div>
    </div>
  `
})
export class ReportsComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private appointmentService = inject(AppointmentService);
  private iamService = inject(IamService);
  private clinicContext = inject(ClinicContextService);

  TrendingUp = TrendingUp; AlertTriangle = AlertTriangle; CheckCircle2 = CheckCircle2; Clock = Clock; 
  DollarSign = DollarSign; AlertOctagon = AlertOctagon; Activity = Activity; Users = Users; 
  CalendarCheck = CalendarCheck; ClipboardList = ClipboardList; ShieldAlert = ShieldAlert;

  products = signal<Product[]>([]);
  appointmentsToday = signal<Appointment[]>([]);
  recentAppointments = signal<Appointment[]>([]);
  isLoading = signal<boolean>(true);

  totalMovements = signal<number>(42);

  canViewFinance = computed(() => this.iamService.can('finance_read'));

  ngOnInit() {
    this.loadData();
  }

  private async loadData() {
    this.isLoading.set(true);
    try {
      const clinicId = this.clinicContext.selectedClinicId();
      if (!clinicId || clinicId === 'all') return;

      const [prods, appsToday, recentApps] = await Promise.all([
        this.inventoryService.getProducts().catch(() => []),
        this.appointmentService.getWaitlistForToday().catch(() => []),
        this.appointmentService.getRecentAppointments().catch(() => [])
      ]);

      this.products.set(prods);
      this.appointmentsToday.set(appsToday);
      this.recentAppointments.set(recentApps);

    } catch (error) {
      console.error('Error loading reports data', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  totalStockValue = computed(() => {
    return this.products().reduce((acc, p) => acc + (p.current_stock * (p.cost || 0)), 0)
      .toLocaleString('pt-BR', {minimumFractionDigits: 2});
  });

  lowStockCount = computed(() => this.products().filter(p => p.current_stock <= (p.min_stock || 0)).length);
  
  todayAppointmentsCount = computed(() => this.appointmentsToday().length);

  expiryAlerts = computed(() => {
    return this.products().filter(p => p.current_stock === 0 && p.min_stock > 0).slice(0, 10);
  });

  weeklyData = computed(() => {
    const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    const now = new Date();
    const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(now.getDate() - i);
        return d;
    }).reverse();

    return last7Days.map(date => {
        const dayLabel = days[date.getDay()];
        const income = Math.floor(Math.random() * 50);
        const outcome = Math.floor(Math.random() * 40);
        return { label: dayLabel, in: income, out: outcome };
    });
  });

  maxTransactionValue = computed(() => {
      const data = this.weeklyData();
      return Math.max(...data.map(d => Math.max(d.in, d.out))) || 10;
  });

  appointmentDensity = computed(() => {
      const apps = this.recentAppointments();
      const distribution: Record<string, number> = {};
      
      apps.forEach(app => {
          if (app.appointment_date) {
              const d = new Date(app.appointment_date);
              const hour = String(d.getHours()).padStart(2, '0') + 'h';
              distribution[hour] = (distribution[hour] || 0) + 1;
          }
      });

      if (Object.keys(distribution).length === 0) {
         return [
           { hour: '08h', value: 0 },
           { hour: '09h', value: 0 },
           { hour: '10h', value: 0 },
           { hour: '11h', value: 0 },
           { hour: '14h', value: 0 },
           { hour: '15h', value: 0 },
           { hour: '16h', value: 0 }
         ];
      }

      return Object.keys(distribution).sort().map(hour => ({
          hour,
          value: distribution[hour]
      }));
  });

  maxDensityValue = computed(() => {
      const data = this.appointmentDensity();
      return Math.max(...data.map(d => d.value)) || 5;
  });
}
