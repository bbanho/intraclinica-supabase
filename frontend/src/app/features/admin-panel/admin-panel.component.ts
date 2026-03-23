import { Component, inject, signal, OnInit } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import { LucideAngularModule, Settings, Building, Power, LayoutDashboard } from 'lucide-angular';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-50 p-8">
      <div class="max-w-6xl mx-auto space-y-8">
        
        <!-- HEADER SAAS -->
        <div class="flex justify-between items-center bg-slate-900 text-white p-6 rounded-3xl shadow-2xl">
          <div class="flex items-center gap-4">
             <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <lucide-icon [img]="Settings" [size]="24" class="text-teal-400"></lucide-icon>
             </div>
             <div>
                <h1 class="text-2xl font-black uppercase tracking-tight">Painel SaaS Global</h1>
                <p class="text-xs font-bold text-slate-400 tracking-widest">Configuração Multi-Tenant & Módulos</p>
             </div>
          </div>
          <div class="text-right">
             <p class="text-[10px] font-black uppercase text-teal-400 tracking-widest mb-1">Logado como</p>
             <p class="font-bold text-sm">{{ auth.currentUser()?.email }}</p>
             <p class="text-[10px] font-bold text-slate-400">Contexto Global (all)</p>
          </div>
        </div>

        @if (isLoading()) {
          <div class="flex items-center justify-center h-64">
             <div class="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
          </div>
        } @else {
          
          <div class="grid grid-cols-1 gap-6">
            @for (clinic of clinics(); track clinic.id) {
              <!-- CLINIC CARD -->
              <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 overflow-hidden">
                <div class="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
                  <div class="flex gap-4 items-center">
                     <div class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                        <lucide-icon [img]="Building" [size]="24"></lucide-icon>
                     </div>
                     <div>
                       <h2 class="text-xl font-bold text-slate-800">{{ clinic.name }}</h2>
                       <p class="text-xs text-slate-400 font-mono mt-1">ID: {{ clinic.id }}</p>
                     </div>
                  </div>
                  <span class="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest"
                        [class.bg-emerald-100]="clinic.status === 'active'"
                        [class.text-emerald-700]="clinic.status === 'active'"
                        [class.bg-rose-100]="clinic.status !== 'active'"
                        [class.text-rose-700]="clinic.status !== 'active'">
                    {{ clinic.status }}
                  </span>
                </div>

                <div>
                   <h3 class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                     <lucide-icon [img]="LayoutDashboard" [size]="14"></lucide-icon>
                     Módulos Contratados (UI Config)
                   </h3>
                   
                   <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                     @for (mod of getClinicModules(clinic.id); track mod.id) {
                         <!-- MODULE TOGGLE CARD -->
                         <div class="p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group"
                              [class.bg-teal-50]="mod.enabled"
                              [class.border-teal-200]="mod.enabled"
                              [class.bg-slate-50]="!mod.enabled"
                              [class.border-slate-200]="!mod.enabled"
                              [class.opacity-60]="!mod.enabled"
                              (click)="toggleModule(clinic.id, mod.module_key, !mod.enabled)">
                             
                            <!-- Status indicator light -->
                            <div class="absolute top-4 right-4 w-2 h-2 rounded-full"
                                 [class.bg-teal-500]="mod.enabled"
                                 [class.shadow-[0_0_8px_rgba(20,184,166,0.6)]="mod.enabled"
                                 [class.bg-slate-300]="!mod.enabled"></div>
                            
                            <lucide-icon [img]="Power" [size]="20" 
                                         [class.text-teal-600]="mod.enabled"
                                         [class.text-slate-400]="!mod.enabled" class="mb-3 block"></lucide-icon>
                           
                           <p class="font-bold text-sm text-slate-800">{{ mod.module_key }}</p>
                           <p class="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                              {{ mod.enabled ? 'Ativado' : 'Desativado' }}
                           </p>

                           <!-- Loading overlay during save -->
                           @if (isSaving() === clinic.id + mod.module_key) {
                              <div class="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center z-10">
                                 <div class="w-4 h-4 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
                              </div>
                           }
                        </div>
                     }
                   </div>
                </div>
              </div>
            } @empty {
              <div class="text-center p-12 bg-white rounded-3xl border border-slate-200">
                 <p class="text-slate-500 font-bold">Nenhuma clínica encontrada no sistema.</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class AdminPanelComponent implements OnInit {
  private db = inject(SupabaseService).clientInstance;
  public auth = inject(AuthService);

  // Icons
  readonly Settings = Settings;
  readonly Building = Building;
  readonly Power = Power;
  readonly LayoutDashboard = LayoutDashboard;

  // Signals for state
  clinics = signal<any[]>([]);
  availableUiModules = signal<any[]>([]);
  clinicModules = signal<any[]>([]); // Flat array of all module settings
  
  isLoading = signal(true);
  isSaving = signal<string | null>(null); // ID do card sendo salvo para spin inline

  ngOnInit() {
    this.loadSaaSData();
  }

  async loadSaaSData() {
    this.isLoading.set(true);
    try {
      // Carrega as clínicas do sistema
      const { data: clinicsData, error: errC } = await this.db.from('clinic').select('*');
      if (errC) throw errC;

      // Carrega o catálogo global de módulos
      const { data: uiModules, error: errM } = await this.db.from('ui_module').select('*');
      if (errM) throw errM;

      // Carrega o status dos módulos por clínica
      const { data: cmData, error: errCM } = await this.db.from('clinic_module').select('*');
      if (errCM) throw errCM;

      this.clinics.set(clinicsData || []);
      this.availableUiModules.set(uiModules || []);
      this.clinicModules.set(cmData || []);

    } catch (e) {
      console.error('Erro ao carregar dados do Painel SaaS:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  getClinicModules(clinicId: string) {
    const modules = this.availableUiModules();
    const settings = this.clinicModules();

    // Map global modules to this clinic's state
    return modules.map(m => {
      const setting = settings.find(s => s.clinic_id === clinicId && s.module_key === m.key);
      return {
        id: m.id,
        module_key: m.key,
        label: m.label,
        enabled: setting ? setting.enabled : false // default off se não tiver linha no banco
      };
    });
  }

  async toggleModule(clinicId: string, moduleKey: string, newValue: boolean) {
    // Evita duplo clique
    if (this.isSaving()) return;
    
    const cardId = clinicId + moduleKey;
    this.isSaving.set(cardId);

    try {
      const existing = this.clinicModules().find(s => s.clinic_id === clinicId && s.module_key === moduleKey);

      if (existing) {
        const { error } = await this.db.from('clinic_module')
          .update({ enabled: newValue })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await this.db.from('clinic_module')
          .insert({ clinic_id: clinicId, module_key: moduleKey, enabled: newValue, sort_order: 99 });
        if (error) throw error;
      }

      await this.loadSaaSData(); 

    } catch (e: any) {
      console.error('Erro ao salvar módulo:', e);
      alert(`Erro ao salvar módulo: ${e.message || e.details || 'Desconhecido'}`);
    } finally {
      this.isSaving.set(null);
    }
  }
}
