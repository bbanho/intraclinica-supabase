import { Component, inject, computed, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../core/services/database.service';
import { UiConfigService } from '../core/services/ui-config.service';
import { IAM_PERMISSIONS } from '../core/config/iam-roles';
import { LucideAngularModule, LayoutDashboard, Stethoscope, LogOut, Package, Users, BarChart3, Share2, ShieldCheck, Bell, ShieldAlert, Check, X, Globe, ClipboardList, UserRound, Calendar } from 'lucide-angular';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div class="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden print:h-auto print:overflow-visible print:block">
      <!-- Sidebar -->
      <aside class="w-64 bg-white border-r border-slate-200 flex flex-col z-20 transition-all duration-300 no-print">
        <div class="h-16 flex items-center justify-center bg-teal-600 text-white shadow-sm transition-colors duration-500 shrink-0">
          <div class="flex items-center gap-2 font-bold text-lg">
            <lucide-icon [img]="Stethoscope" [size]="20"></lucide-icon>
            <span class="truncate tracking-tight uppercase">IntraClinica</span>
          </div>
        </div>

        <!-- CONTEXT SELECTOR (SUPER ADMIN & CONSULTANT) -->
        @if (db.currentUser()?.role === 'SUPER_ADMIN' || db.currentUser()?.role === 'CONSULTANT') {
            <div class="p-4 bg-slate-50 border-b border-slate-200">
                <label class="text-[9px] font-black uppercase text-slate-400 block tracking-widest mb-1.5 flex items-center gap-1">
                    <lucide-icon [img]="Globe" [size]="10"></lucide-icon> Contexto Operacional
                </label>
                <select 
                    [ngModel]="db.selectedContextClinic()" 
                    (ngModelChange)="updateContext($event)"
                    class="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer"
                >
                    <option [ngValue]="null" disabled>Selecione...</option>
                    @if (db.currentUser()?.role === 'SUPER_ADMIN') {
                        <option value="all">☁️ Visão Global (SaaS)</option>
                    }
                    <option disabled>----------------</option>
                    @for (clinic of db.accessibleClinics(); track clinic.id) {
                        <option [value]="clinic.id">🏥 {{ clinic.name }}</option>
                    }
                </select>
            </div>
        }
        
        <nav class="flex-1 py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
          
          <!-- CLINIC MODULES (Only if Context is a Clinic) -->
          @if (db.selectedContextClinic() && db.selectedContextClinic() !== 'all') {
              <div class="px-3 mb-2 text-[10px] font-black uppercase text-teal-600 tracking-widest animate-fade-in">
                Operação Clínica
              </div>
              
              @for (mod of uiConfig.enabledModules(); track mod.key) {
                <a [routerLink]="mod.route" routerLinkActive="bg-teal-50 text-teal-700 font-semibold shadow-sm" class="flex items-center gap-3 px-3 py-3 rounded-xl transition-all group text-slate-400 hover:bg-slate-50 hover:text-slate-700 animate-scale-in">
                  <lucide-icon [img]="getIcon(mod.icon)" [size]="20"></lucide-icon>
                  <span class="text-sm">{{mod.label}}</span>
                </a>
              }
              
              @if (uiConfig.enabledModules().length === 0) {
                 <div class="px-3 py-4 text-xs text-slate-400 text-center italic">
                   Carregando módulos...
                 </div>
              }
          }

          @if (db.currentUser()?.role === 'ADMIN' || db.currentUser()?.role === 'IT' || db.currentUser()?.role === 'SUPER_ADMIN' || db.currentUser()?.role === 'CONSULTANT') {
            <div class="pt-4 mt-4 border-t border-slate-100">
              <p class="px-3 mb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                {{ db.selectedContextClinic() === 'all' ? 'Governança Global' : 'Gestão da Unidade' }}
              </p>
              <a routerLink="/admin" routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold shadow-sm" class="flex items-center gap-3 px-3 py-3 rounded-xl transition-all group text-slate-400 hover:bg-slate-50 hover:text-indigo-700">
                <lucide-icon [img]="ShieldCheck" [size]="20"></lucide-icon>
                <span class="text-sm">{{ db.selectedContextClinic() === 'all' ? 'Painel SaaS' : 'Configurações' }}</span>
              </a>
            </div>
          }
        </nav>

        <div class="p-4 border-t border-slate-100 bg-slate-50/50">
          <button (click)="logout()" class="w-full flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all mb-4">
            <lucide-icon [img]="LogOut" [size]="20"></lucide-icon>
            <span class="text-sm font-bold">Encerrar Sessão</span>
          </button>
          <div class="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm bg-teal-500 shadow-md">
              {{db.currentUser()?.avatar || db.currentUser()?.name?.charAt(0)}}
            </div>
            <div class="overflow-hidden">
              <p class="text-xs font-bold text-slate-800 truncate">{{db.currentUser()?.name}}</p>
              <p class="text-[10px] text-slate-400 truncate uppercase font-bold tracking-tighter">{{db.currentUser()?.role}}</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col overflow-hidden relative">
        <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 no-print">
          <div class="flex items-center gap-4">
             @if (db.selectedContextClinic() && db.selectedContextClinic() !== 'all') {
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                    <span class="text-xs font-black uppercase text-slate-700 tracking-wider">
                        {{ getClinicName(db.selectedContextClinic()) }}
                    </span>
                </div>
             }
             @if (db.selectedContextClinic() === 'all') {
                 <div class="flex items-center gap-2">
                    <span class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                    <span class="text-xs font-black uppercase text-slate-700 tracking-wider">
                        Visão Global SaaS
                    </span>
                    @if (db.currentUser()?.role === 'SUPPORT' || db.currentUser()?.role === 'ANALYST') {
                        <button (click)="openRequestAccessModal()" class="ml-4 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100">
                           <lucide-icon [img]="ShieldAlert" [size]="12"></lucide-icon> Solicitar Acesso
                        </button>
                    }
                </div>
             }
             <div class="flex items-center gap-1.5 text-teal-600 text-[10px] font-bold bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-full shadow-sm">
                AMBIENTE SEGURO
             </div>
          </div>

          <!-- Notification Center -->
          <div class="relative flex items-center gap-2">
             <button (click)="showNotifications.set(!showNotifications())" class="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all relative">
                <lucide-icon [img]="Bell" [size]="20"></lucide-icon>
                @if (pendingAccessRequests().length > 0) {
                    <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                }
             </button>

             @if (showNotifications()) {
                <div class="absolute right-0 mt-16 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-scale-in">
                    <div class="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Notificações</span>
                        <span class="text-[10px] font-bold text-teal-600">{{pendingAccessRequests().length}} Pendentes</span>
                    </div>
                    <div class="max-h-96 overflow-y-auto">
                        @if (pendingAccessRequests().length === 0) {
                            <div class="p-8 text-center text-slate-300">
                                <lucide-icon [img]="ShieldCheck" [size]="32" class="mx-auto mb-2 opacity-20"></lucide-icon>
                                <p class="text-xs font-medium">Nenhuma solicitação de acesso.</p>
                            </div>
                        }
                        @for (req of pendingAccessRequests(); track req.id) {
                            <div class="p-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <div class="flex gap-3 items-start mb-3">
                                    <div class="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <lucide-icon [img]="ShieldAlert" [size]="16"></lucide-icon>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-xs font-bold text-slate-800">Solicitação de Suporte</p>
                                        <p class="text-[10px] text-slate-500 line-clamp-2 mt-0.5"><span class="font-bold text-indigo-600">{{req.requesterName}}</span> deseja acesso aos dados da clínica <span class="font-bold text-slate-700">{{req.clinicName}}</span>.</p>
                                        <p class="text-[9px] italic text-slate-400 mt-1">"{{req.reason}}"</p>
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <button (click)="approve(req.id)" class="flex-1 py-1.5 bg-teal-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-teal-700 transition-all flex items-center justify-center gap-1">
                                        <lucide-icon [img]="Check" [size]="12"></lucide-icon> Aprovar
                                    </button>
                                    <button class="px-3 py-1.5 border border-slate-200 text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-all">
                                        <lucide-icon [img]="X" [size]="12"></lucide-icon>
                                    </button>
                                </div>
                            </div>
                        }
                    </div>
                </div>
             }
          </div>
        </header>

        <!-- ACCESS REQUEST MODAL -->
        @if (showRequestAccessModal()) {
            <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div class="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-scale-in">
                    <div class="bg-indigo-600 p-8 text-white flex justify-between items-center">
                        <div>
                            <h3 class="text-xl font-black uppercase tracking-tight">Solicitar Acesso Temporário</h3>
                            <p class="text-[10px] text-indigo-200 uppercase font-bold tracking-widest mt-1">Conformidade e Auditoria IntraClinica</p>
                        </div>
                        <button (click)="showRequestAccessModal.set(false)" class="text-white/50 hover:text-white"><lucide-icon [img]="X" [size]="24"></lucide-icon></button>
                    </div>
                    <div class="p-10 space-y-6">
                        <div>
                            <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Unidade Alvo</label>
                            <select [(ngModel)]="requestAccessData.clinicId" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none font-bold appearance-none">
                                <option value="" disabled>Selecione uma Clínica...</option>
                                @for (clinic of db.clinics(); track clinic.id) {
                                    <option [value]="clinic.id">{{ clinic.name }}</option>
                                }
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Role Desejada</label>
                            <select [(ngModel)]="requestAccessData.roleId" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none font-bold appearance-none">
                                <option value="roles/saas_support">SaaS Support (Suporte Técnico)</option>
                                <option value="roles/saas_analyst">SaaS Analyst (Auditoria / BI)</option>
                                <option value="roles/finance_viewer">Finance Viewer (Faturamento)</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Justificativa da Solicitação</label>
                            <textarea [(ngModel)]="requestAccessData.reason" rows="3" class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm" placeholder="Descreva brevemente o motivo do acesso..."></textarea>
                        </div>
                        <div class="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
                            <lucide-icon [img]="ShieldAlert" [size]="20" class="text-amber-600 shrink-0"></lucide-icon>
                            <p class="text-[10px] font-medium text-amber-700 leading-relaxed">
                                Esta solicitação será enviada ao administrador da unidade. O acesso é temporário e todas as ações serão logadas para auditoria.
                            </p>
                        </div>
                    </div>
                    <div class="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                        <button (click)="onSubmitRequest()" [disabled]="!requestAccessData.clinicId || !requestAccessData.reason" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:shadow-none">Enviar Solicitação</button>
                    </div>
                </div>
            </div>
        }

        <div class="flex-1 overflow-auto p-6 scroll-smooth bg-slate-50 print:overflow-visible print:h-auto print:block">
          <div class="max-w-7xl mx-auto">
            <router-outlet></router-outlet>
          </div>
        </div>
      </main>
    </div>
  `
})
export class MainLayoutComponent {
  db = inject(DatabaseService);
  uiConfig = inject(UiConfigService);
  showNotifications = signal(false);
  showRequestAccessModal = signal(false);
  requestAccessData = { clinicId: '', reason: '', roleId: 'roles/saas_support' };

  pendingAccessRequests = computed(() => {
    const user = this.db.currentUser();
    if (!user) return [];
    
    // Check if user has global approval permission
    const hasGlobalApproval = this.db.checkPermission(IAM_PERMISSIONS.ACCESS_APPROVE, '*');
    
    return this.db.accessRequests().filter(r => {
      if (r.status !== 'pending') return false;
      if (hasGlobalApproval) return true;
      
      // Local approval: User must belong to the clinic AND have approve permission for it
      return r.clinicId === user.clinicId && this.db.checkPermission(IAM_PERMISSIONS.ACCESS_APPROVE, user.clinicId);
    });
  });
  
  // Icons
  LayoutDashboard = LayoutDashboard; Stethoscope = Stethoscope; LogOut = LogOut; 
  Package = Package; Users = Users; BarChart3 = BarChart3; Share2 = Share2; ShieldCheck = ShieldCheck;
  Bell = Bell; ShieldAlert = ShieldAlert; Check = Check; X = X; Globe = Globe;
  ClipboardList = ClipboardList; UserRound = UserRound; Calendar = Calendar;

  iconMap: Record<string, any> = {
    'Package': Package,
    'Users': Users,
    'UserRound': UserRound,
    'ClipboardList': ClipboardList,
    'Stethoscope': Stethoscope,
    'BarChart3': BarChart3,
    'Share2': Share2,
    'Calendar': Calendar
  };

  getIcon(iconName: string) {
    return this.iconMap[iconName] || LayoutDashboard;
  }

  updateContext(val: string) {
      this.db.selectedContextClinic.set(val);
  }

  getClinicName(id: string | null) {
      if (!id || id === 'all') return 'Global';
      return this.db.clinics().find(c => c.id === id)?.name || 'Unidade Desconhecida';
  }

  openRequestAccessModal() {
      const user = this.db.currentUser();
      this.requestAccessData = { 
          clinicId: '', 
          reason: '', 
          roleId: user?.role === 'ANALYST' ? 'roles/saas_analyst' : 'roles/saas_support' 
      };
      this.showRequestAccessModal.set(true);
  }

  async onSubmitRequest() {
      if (!this.requestAccessData.clinicId || !this.requestAccessData.reason) return;
      
      const clinic = this.db.clinics().find(c => c.id === this.requestAccessData.clinicId);
      const clinicName = clinic?.name || 'Unidade';
      
      await this.db.requestAccess(
          this.requestAccessData.clinicId,
          clinicName,
          this.requestAccessData.reason,
          this.requestAccessData.roleId
      );
      
      this.showRequestAccessModal.set(false);
      alert('Solicitação enviada com sucesso ao administrador da clínica.');
  }

  async approve(requestId: string) {
    await this.db.approveAccess(requestId);
    this.showNotifications.set(false);
  }

  logout() {
    this.db.logout();
    location.reload(); 
  }
}
