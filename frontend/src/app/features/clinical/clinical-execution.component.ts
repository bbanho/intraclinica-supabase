import { Component, OnInit, OnChanges, SimpleChanges, inject, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../core/services/inventory.service';
import { PatientService } from '../../core/services/patient.service';
import { DatabaseService } from '../../core/services/database.service';
import { ProcedureType, InventoryMovement } from '../../core/models/inventory.types';
import { Patient } from '../../core/models/types';
import { LucideAngularModule, FlaskConical, AlertTriangle, User, FileText, Activity, Save, Loader2, CheckCircle2 } from 'lucide-angular';

@Component({
  selector: 'app-clinical-execution',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="grid lg:grid-cols-3 gap-6 animate-fade-in">
      <!-- FORM COLUMN -->
      <div class="lg:col-span-1 space-y-6">
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div class="flex items-center gap-3 mb-6">
            <div class="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
              <lucide-icon [img]="FlaskConical" [size]="20"></lucide-icon>
            </div>
            <div>
              <h3 class="font-black text-slate-800 uppercase tracking-tight">Executar Procedimento</h3>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gasto Automático de Insumos</p>
            </div>
          </div>

          <div class="space-y-5 flex-1">
            <!-- PATIENT SELECTOR -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Paciente</label>
              <div class="relative">
                <lucide-icon [img]="User" class="absolute left-3 top-3 text-slate-400" [size]="16"></lucide-icon>
                <select 
                  [(ngModel)]="selectedPatientId" 
                  [disabled]="!!activePatientId"
                  class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700 appearance-none cursor-pointer disabled:opacity-70"
                >
                  <option value="" disabled>Selecione um Paciente...</option>
                  @for (p of patients(); track p.id) {
                    <option [value]="p.id">{{ p.name }} ({{ p.cpf || 'Sem CPF' }})</option>
                  }
                </select>
                @if (activePatientId) {
                  <p class="text-[9px] font-bold text-indigo-600 mt-1 ml-1 flex items-center gap-1">
                    <lucide-icon [img]="CheckCircle2" [size]="10"></lucide-icon> Vinculado à consulta atual
                  </p>
                }
              </div>
            </div>

            <!-- PROCEDURE SELECTOR -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Procedimento (TUSS)</label>
              <div class="relative">
                <lucide-icon [img]="Activity" class="absolute left-3 top-3 text-slate-400" [size]="16"></lucide-icon>
                <select 
                  [(ngModel)]="selectedProcedureId" 
                  class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700 appearance-none cursor-pointer"
                >
                  <option value="" disabled>Selecione o Procedimento...</option>
                  @for (pt of procedureTypes(); track pt.id) {
                    <option [value]="pt.id">{{ pt.name }} ({{ pt.code || 'N/A' }})</option>
                  }
                </select>
              </div>
            </div>

            <!-- NOTES -->
            <div class="space-y-1.5 flex-1 flex flex-col">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Observações Clínicas</label>
              <div class="relative flex-1">
                <lucide-icon [img]="FileText" class="absolute left-3 top-3 text-slate-400" [size]="16"></lucide-icon>
                <textarea 
                  [(ngModel)]="notes" 
                  class="w-full h-full min-h-[100px] pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700 resize-none custom-scrollbar"
                  placeholder="Detalhes adicionais da execução (opcional)..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- FEEDBACK & ACTIONS -->
          <div class="pt-5 mt-5 border-t border-slate-100 space-y-4">
            @if (message()) {
              <div class="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-scale-in">
                <lucide-icon [img]="CheckCircle2" [size]="16"></lucide-icon> {{ message() }}
              </div>
            }
            @if (error()) {
              <div class="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-scale-in">
                <lucide-icon [img]="AlertTriangle" [size]="16"></lucide-icon> {{ error() }}
              </div>
            }

            <button 
              (click)="perform()" 
              [disabled]="isLoading() || !selectedProcedureId || !selectedPatientId"
              class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 text-xs"
            >
              @if (isLoading()) {
                <lucide-icon [img]="Loader2" [size]="16" class="animate-spin"></lucide-icon> Registrando...
              } @else {
                <lucide-icon [img]="Save" [size]="16"></lucide-icon> Realizar Procedimento
              }
            </button>
          </div>
        </div>
      </div>

      <!-- AUDIT LOG COLUMN -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[500px]">
          <div class="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 class="font-black text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-2">
              <lucide-icon [img]="Activity" [size]="14"></lucide-icon> Histórico de Procedimentos (Audit Log)
            </h3>
            <span class="text-[9px] font-bold bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded-lg uppercase">
              Últimas Execuções
            </span>
          </div>

          <div class="p-0 overflow-x-auto custom-scrollbar flex-1">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400">
                  <th class="p-4 font-black">Data/Hora</th>
                  <th class="p-4 font-black">Profissional</th>
                  <th class="p-4 font-black">Detalhes (Insumo / Qtd)</th>
                </tr>
              </thead>
              <tbody class="text-sm font-medium text-slate-600">
                @for (log of auditLog(); track log.id) {
                  <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                    <td class="p-4 font-bold text-slate-800 text-xs whitespace-nowrap">
                      {{ log.timestamp | date:'dd/MM/yyyy HH:mm' }}
                    </td>
                    <td class="p-4 text-xs whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <div class="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[9px]">
                          {{ log.actor?.name?.charAt(0) || 'D' }}
                        </div>
                        {{ log.actor?.name || 'Desconhecido' }}
                      </div>
                    </td>
                    <td class="p-4 text-xs max-w-[300px] truncate" [title]="log.notes || 'Procedimento realizado'">
                      <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 text-rose-600 font-bold text-[10px] mr-2">
                        <lucide-icon [img]="Activity" [size]="10"></lucide-icon>
                        {{ log.total_qty }} un
                      </span>
                      <span class="opacity-80">{{ log.notes || 'Registro de sistema' }}</span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="3" class="p-12 text-center text-slate-400">
                      <lucide-icon [img]="FileText" [size]="32" class="mx-auto opacity-20 mb-3"></lucide-icon>
                      <p class="text-xs font-bold uppercase tracking-widest">Nenhum procedimento registrado recente.</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    .animate-scale-in { animation: scaleIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-corner { background: transparent; }
  `]
})
export class ClinicalExecutionComponent implements OnInit, OnChanges {
  private inventoryService = inject(InventoryService);
  private patientService = inject(PatientService);
  private dbService = inject(DatabaseService);

  @Input() activePatientId: string = '';

  procedureTypes = signal<ProcedureType[]>([]);
  auditLog = signal<(InventoryMovement & { actor?: { name: string } })[]>([]);
  
  // Expose patients signal directly from service
  patients = computed(() => this.patientService.patients());

  selectedProcedureId: string = '';
  selectedPatientId: string = '';
  notes: string = '';
  
  isLoading = signal(false);
  message = signal('');
  error = signal('');

  readonly FlaskConical = FlaskConical;
  readonly AlertTriangle = AlertTriangle;
  readonly User = User;
  readonly FileText = FileText;
  readonly Activity = Activity;
  readonly Save = Save;
  readonly Loader2 = Loader2;
  readonly CheckCircle2 = CheckCircle2;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activePatientId']) {
      const pid = changes['activePatientId'].currentValue;
      if (pid) {
        this.selectedPatientId = pid;
      } else if (!this.selectedPatientId || this.selectedPatientId === changes['activePatientId'].previousValue) {
        // If the context patient changes to none, and we were previously locked to them, clear it.
        this.selectedPatientId = '';
      }
    }
  }

  async ngOnInit() {
    await this.loadProcedureTypes();
    await this.loadAuditLog();
    if (this.activePatientId) {
      this.selectedPatientId = this.activePatientId;
    }
  }

  get clinicId() {
    const ctx = this.dbService.selectedContextClinic();
    return ctx === 'all' ? null : ctx;
  }

  async loadProcedureTypes() {
    try {
      const types = await this.inventoryService.getProcedureTypes();
      this.procedureTypes.set(types);
    } catch (err: any) {
      this.error.set('Falha ao carregar procedimentos: ' + (err.message || err));
    }
  }

  async loadAuditLog() {
    try {
      const logs = await this.inventoryService.getProcedureAuditLog();
      this.auditLog.set(logs);
    } catch (err: any) {
      console.error('Failed to load audit log', err);
    }
  }

  async perform() {
    this.message.set('');
    this.error.set('');

    if (!this.selectedProcedureId) {
      this.error.set('Por favor, selecione um procedimento (TUSS).');
      return;
    }
    if (!this.selectedPatientId) {
       this.error.set('Por favor, selecione um paciente.');
       return;
    }

    this.isLoading.set(true);

    try {
      await this.inventoryService.performProcedure(
        this.selectedProcedureId,
        this.selectedPatientId,
        this.notes
      );
      this.message.set('Procedimento registrado com sucesso! Insumos deduzidos do estoque.');
      this.notes = '';
      this.selectedProcedureId = '';
      if (!this.activePatientId) {
        this.selectedPatientId = '';
      }
      await this.loadAuditLog(); // Refresh log
    } catch (err: any) {
      this.error.set('Erro ao registrar procedimento: ' + (err.message || err));
    } finally {
      this.isLoading.set(false);
    }
  }
}
