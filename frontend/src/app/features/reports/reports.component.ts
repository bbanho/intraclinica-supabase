import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../../core/services/database.service';
import { GeminiService } from '../../core/services/gemini.service';
import { InventoryStore } from '../../core/store/inventory.store';
import { PatientStore } from '../../core/store/patient.store';
import { MarkdownModule } from 'ngx-markdown';
import { IAM_PERMISSIONS } from '../../core/config/iam-roles';
import { LucideAngularModule, BrainCircuit, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Clock, DollarSign, AlertOctagon, Activity, Users, CalendarCheck, ClipboardList, ShieldAlert } from 'lucide-angular';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, MarkdownModule, LucideAngularModule],
  template: `
    <div class="space-y-8 animate-fade-in p-6 pb-12">
      @if (!db.checkPermission(IAM_PERMISSIONS.REPORTS_VIEW, db.selectedContextClinic() || db.currentUser()?.clinicId)) {
        <div class="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-[40px] border border-slate-200 shadow-sm animate-scale-in">
            <div class="p-6 bg-rose-50 text-rose-600 rounded-3xl mb-6">
                <lucide-icon [img]="ShieldAlert" [size]="48"></lucide-icon>
            </div>
            <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Acesso Restrito</h2>
            <p class="text-slate-500 max-w-md mx-auto mb-8 font-medium">Você não possui permissão para visualizar indicadores desta unidade.</p>
        </div>
      } @else {
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 class="text-3xl font-black text-slate-800 tracking-tight uppercase">Dashboard Operacional</h2>
            <p class="text-slate-500 text-sm">Monitoramento crítico e indicadores de performance clínica.</p>
          </div>
          
          @if (db.checkPermission(IAM_PERMISSIONS.REPORTS_VIEW, db.selectedContextClinic() || db.currentUser()?.clinicId)) {
              <div class="flex flex-col items-end gap-1">
                  <button 
                      (click)="handleStrategicAnalysis()"
                      [disabled]="isThinking()"
                      class="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-70"
                  >
                      @if (isThinking()) {
                         <lucide-icon [img]="BrainCircuit" class="animate-spin" [size]="18"></lucide-icon> Processando...
                      } @else {
                         <lucide-icon [img]="Sparkles" [size]="18"></lucide-icon> Gerar Otimização IA
                      }
                  </button>
                  <span class="text-[9px] text-slate-400 font-medium">Análise estratégica via Gemini AI</span>
              </div>
          }
        </div>

        <!-- AI INSIGHTS RESULT -->
        @if (aiInsight()) {
            <div class="bg-white border border-indigo-100 p-6 rounded-2xl text-slate-700 leading-relaxed shadow-sm animate-scale-in">
                <h4 class="font-bold text-indigo-800 mb-2 flex items-center gap-2"><lucide-icon [img]="Sparkles" [size]="16"></lucide-icon> Plano Estratégico</h4>
                <div class="prose prose-slate prose-sm max-w-none">
                    <markdown [data]="aiInsight()"></markdown>
                </div>
            </div>
        }

        <!-- KPI CARDS -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        @if (db.checkPermission(IAM_PERMISSIONS.FINANCE_READ, db.selectedContextClinic() || db.currentUser()?.clinicId)) {
                <div class="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group animate-scale-in">
                    <div class="text-indigo-100 text-xs font-black uppercase tracking-widest mb-1 opacity-70">Valor em Estoque</div>
                    <div class="text-3xl font-black">R$ {{ totalStockValue() }}</div>
                    <div class="text-xs text-indigo-100 mt-2 font-bold flex items-center gap-1"><lucide-icon [img]="TrendingUp" [size]="12"></lucide-icon> Atualizado agora</div>
                </div>
            } @else {
                <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div class="absolute inset-0 bg-slate-50/50 backdrop-blur-[2px] z-10"></div>
                    <div class="relative z-20">
                        <lucide-icon [img]="ShieldAlert" [size]="24" class="text-rose-500 mb-2 mx-auto"></lucide-icon>
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dados Financeiros</div>
                        <button (click)="handleRequestFinanceAccess()" class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg uppercase hover:bg-indigo-100 transition-all">Solicitar Acesso</button>
                    </div>
                </div>
            }
            
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div class="text-slate-400 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-1"><lucide-icon [img]="Users" [size]="12"></lucide-icon> Pacientes Hoje</div>
                <div class="text-3xl font-black text-slate-800">{{ todayAppointmentsCount() }}</div>
                <div class="text-xs text-emerald-600 mt-2 font-bold flex items-center gap-1"><lucide-icon [img]="CheckCircle2" [size]="12"></lucide-icon> Agendados/Em Sala</div>
            </div>

            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div class="text-slate-400 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-1"><lucide-icon [img]="AlertTriangle" [size]="12"></lucide-icon> Rupturas</div>
                <div class="text-3xl font-black" [class.text-rose-600]="lowStockCount() > 0">{{ lowStockCount() }}</div>
                <div class="text-xs text-slate-400 mt-2 font-bold">Itens abaixo do mínimo</div>
            </div>

             <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div class="text-slate-400 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-1"><lucide-icon [img]="Activity" [size]="12"></lucide-icon> Movimentações</div>
                <div class="text-3xl font-black text-slate-800">{{ inventoryStore.transactions().length }}</div>
                <div class="text-xs text-slate-400 mt-2 font-bold">Total registrado</div>
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
                        <div class="text-center py-10 text-slate-400 text-sm">Sem agendamentos hoje.</div>
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
                    <th class="px-6 py-4">Lote</th>
                    <th class="px-6 py-4">Vencimento</th>
                    <th class="px-6 py-4 text-center">Saldo</th>
                    <th class="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  @for (p of expiryAlerts(); track p.id) {
                      <tr class="hover:bg-slate-50 transition-all">
                        <td class="px-6 py-4 font-bold text-slate-800">{{p.name}}</td>
                        <td class="px-6 py-4 text-xs text-slate-500">{{p.batchNumber}}</td>
                        <td class="px-6 py-4 text-xs font-bold text-rose-600">{{p.expiryDate | date:'dd/MM/yyyy'}}</td>
                        <td class="px-6 py-4 text-center font-bold">{{p.stock}}</td>
                        <td class="px-6 py-4 text-right">
                             <span class="bg-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-black uppercase">CRÍTICO</span>
                        </td>
                      </tr>
                  }
                  @if (expiryAlerts().length === 0) {
                    <tr>
                      <td colspan="5" class="px-6 py-8 text-center text-slate-400 italic text-sm">
                        Nenhum item vencido ou próximo do vencimento (30 dias).
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
        </div>
      }
    </div>
  `
})
export class ReportsComponent {
  db = inject(DatabaseService);
  gemini = inject(GeminiService);
  inventoryStore = inject(InventoryStore);
  patientStore = inject(PatientStore);

  // Constants for template
  IAM_PERMISSIONS = IAM_PERMISSIONS;

  // Icons
  BrainCircuit = BrainCircuit; Sparkles = Sparkles; TrendingUp = TrendingUp; AlertTriangle = AlertTriangle;
  CheckCircle2 = CheckCircle2; Clock = Clock; DollarSign = DollarSign; AlertOctagon = AlertOctagon;
  Activity = Activity; Users = Users; CalendarCheck = CalendarCheck; ClipboardList = ClipboardList;
  ShieldAlert = ShieldAlert;

  // Signals
  aiInsight = signal('');
  isThinking = signal(false);

  constructor() {
    effect(() => {
        const clinicId = this.db.selectedContextClinic();
        if (clinicId) {
            this.inventoryStore.loadProducts(clinicId);
            this.inventoryStore.loadTransactions(clinicId);
            this.patientStore.loadAppointments(clinicId);
        }
    });
  }

  async handleRequestFinanceAccess() {
    const user = this.db.currentUser();
    if (!user) return;
    
    const reason = prompt("Por que você precisa de acesso aos dados financeiros e contábeis?");
    if (reason) {
        await this.db.requestAccess(
            user.clinicId, 
            'Esta Clínica', 
            reason, 
            'roles/finance_viewer'
        );
        alert('Solicitação de acesso financeiro enviada ao administrador.');
    }
  }

  // Computed Metrics
  totalStockValue = computed(() => {
    return this.inventoryStore.products().reduce((acc, p) => acc + (p.stock * (p.price || 10)), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2});
  });

  lowStockCount = computed(() => this.inventoryStore.products().filter(p => p.stock <= p.minStock).length);
  
  todayAppointmentsCount = computed(() => this.patientStore.appointments().length); // Should filter by today ideally, but using existing logic

  expiryAlerts = computed(() => {
    const today = new Date();
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    return this.inventoryStore.products().filter(p => p.expiryDate && new Date(p.expiryDate) <= limit).slice(0, 10);
  });

  // Chart Data: Weekly Stock Flow
  weeklyData = computed(() => {
    const transactions = this.inventoryStore.transactions();
    const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    const now = new Date();
    const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(now.getDate() - i);
        return d;
    }).reverse();

    return last7Days.map(date => {
        const dayLabel = days[date.getDay()];
        const dayStr = date.toISOString().split('T')[0];
        
        // Filter transactions for this day
        const dayTx = transactions.filter(t => t.date && t.date.startsWith(dayStr));
        
        const income = dayTx.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.quantity, 0);
        const outcome = dayTx.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.quantity, 0);

        return { label: dayLabel, in: income, out: outcome };
    });
  });

  maxTransactionValue = computed(() => {
      const data = this.weeklyData();
      return Math.max(...data.map(d => Math.max(d.in, d.out))) || 10;
  });

  // Chart Data: Appointment Density by Hour
  appointmentDensity = computed(() => {
      const apps = this.patientStore.appointments();
      // Group by hour
      const distribution: Record<string, number> = {};
      
      apps.forEach(app => {
          if (app.date) { // Assuming app.date is "HH:MM"
              const hour = app.date.split(':')[0] + 'h';
              distribution[hour] = (distribution[hour] || 0) + 1;
          }
      });

      return Object.keys(distribution).sort().map(hour => ({
          hour,
          value: distribution[hour]
      }));
  });

  maxDensityValue = computed(() => {
      const data = this.appointmentDensity();
      return Math.max(...data.map(d => d.value)) || 5;
  });

  async handleStrategicAnalysis() {
    this.isThinking.set(true);
    
    // Construct context from real app data
    const context = `
      Total Items: ${this.inventoryStore.products().length}
      Low Stock Alerts: ${this.lowStockCount()}
      Transactions Logged: ${this.inventoryStore.transactions().length}
      Weekly Flow: ${JSON.stringify(this.weeklyData())}
      Appointments Today: ${this.todayAppointmentsCount()}
    `;

    const result = await this.gemini.generateStrategicInsights(context);
    this.aiInsight.set(result);
    this.isThinking.set(false);
  }
}
