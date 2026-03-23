import { Component, inject, signal, effect, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, Search, User, FileText, Activity, Heart, Pill, AlertCircle, ChevronLeft, ChevronRight, Maximize2, Minimize2, Bot, Loader2, History, ChevronDown, ChevronUp } from 'lucide-angular';
import { ClinicContextService } from '../../core/services/clinic-context.service';
import { PatientService, Patient } from '../../core/services/patient.service';
import { ClinicalService, MedicalRecord, MedicalRecordContent, MedicalRecordType } from '../../core/services/clinical.service';
import { IamService } from '../../core/services/iam.service';

@Component({
  selector: 'app-clinical',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, DatePipe],
  template: `
    @if (!selectedClinicId() || selectedClinicId() === 'all') {
      <div class="h-full flex items-center justify-center p-8">
        <div class="text-center max-w-md">
          <div class="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <lucide-icon [img]="AlertCircleIcon" class="text-amber-600 w-8 h-8"></lucide-icon>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Selecione uma clínica</h2>
          <p class="text-sm text-gray-500">O módulo de prontuário requer que uma clínica seja selecionada no contexto acima.</p>
        </div>
      </div>
    } @else {
      <div class="h-full flex bg-slate-900 text-slate-100">
        <!-- LEFT SIDEBAR: Patient List -->
        <aside class="w-80 flex flex-col border-r border-slate-700 bg-slate-800/50">
          <div class="p-4 border-b border-slate-700">
            <h2 class="text-lg font-bold text-white mb-1">Prontuário</h2>
            <p class="text-xs text-slate-400">Modo Foco - Clínica selecionada</p>
            
            <!-- Search patients -->
            <div class="mt-4 relative">
              <lucide-icon [img]="SearchIcon" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"></lucide-icon>
              <input
                type="text"
                placeholder="Buscar paciente..."
                [value]="searchTerm()"
                (input)="onPatientSearch($event)"
                class="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          <div class="flex-1 overflow-y-auto">
            @if (filteredPatients().length === 0) {
              <div class="p-4 text-center text-slate-400 text-sm">
                Nenhum paciente encontrado
              </div>
            } @else {
              @for (patient of filteredPatients(); track patient.id) {
                <button
                  (click)="selectPatient(patient)"
                  class="w-full p-4 text-left border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  [class.bg-teal-600]="selectedPatient()?.id === patient.id"
                  [class.bg-opacity-20]="selectedPatient()?.id === patient.id"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-sm font-medium">
                      {{ patient.name.charAt(0).toUpperCase() }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-white truncate">{{ patient.name }}</p>
                      <p class="text-xs text-slate-400">{{ patient.cpf || 'Sem CPF' }}</p>
                    </div>
                  </div>
                </button>
              }
            }
          </div>

          <!-- HISTORY: Patient Records -->
          @if (selectedPatient() && records().length > 0) {
            <div class="border-t border-slate-700 flex-shrink-0">
              <button
                (click)="toggleRecords()"
                class="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
              >
                <div class="flex items-center gap-2">
                  <lucide-icon [img]="HistoryIcon" class="w-4 h-4 text-teal-400"></lucide-icon>
                  <span class="text-sm font-medium text-slate-300">Histórico</span>
                  <span class="text-xs text-slate-500">({{ records().length }})</span>
                </div>
                <lucide-icon [img]="recordsOpen() ? ChevronUpIcon : ChevronDownIcon" class="w-4 h-4 text-slate-400"></lucide-icon>
              </button>

              @if (recordsOpen()) {
                @if (recordsError()) {
                  <div class="px-4 py-2 flex items-center gap-2 text-red-400 text-xs">
                    <lucide-icon [img]="AlertCircleIcon" class="w-3 h-3 shrink-0"></lucide-icon>
                    {{ recordsError() }}
                  </div>
                } @else {
                <div class="max-h-64 overflow-y-auto">
                  @for (rec of records(); track rec.id) {
                    <div class="px-4 py-3 border-t border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <div class="flex items-start justify-between gap-2 mb-1">
                        <span class="text-xs font-medium text-teal-400 uppercase">{{ rec.type }}</span>
                        <span class="text-xs text-slate-500">{{ rec.created_at | date:'dd/MM/y' }}</span>
                      </div>
                      <p class="text-sm text-slate-300 line-clamp-2">{{ rec.content.chief_complaint || '—' }}</p>
                      @if (rec.content?.diagnosis) {
                        <p class="text-xs text-slate-500 mt-1 truncate">
                          <span class="text-emerald-400">Dx:</span> {{ rec.content.diagnosis }}
                        </p>
                      }
                    </div>
                  }
                </div>
                }
              }
            </div>
          }
        </aside>

        <!-- MAIN AREA: Medical Record -->
        <main class="flex-1 flex flex-col">
          @if (!selectedPatient()) {
            <div class="flex-1 flex items-center justify-center">
              <div class="text-center text-slate-500">
                <lucide-icon [img]="FileTextIcon" class="w-16 h-16 mx-auto mb-4 opacity-50"></lucide-icon>
                <p class="text-lg font-medium">Selecione um paciente</p>
                <p class="text-sm mt-1">para visualizar o prontuário</p>
              </div>
            </div>
          } @else {
            <!-- HEADER: Patient Info + Focus Mode Toggle -->
            <header class="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/30">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-lg">
                  {{ selectedPatient()!.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <h2 class="text-xl font-bold text-white">{{ selectedPatient()!.name }}</h2>
                  <p class="text-sm text-slate-400">
                    {{ selectedPatient()!.cpf || 'Sem CPF' }} • 
                    {{ selectedPatient()!.birth_date ? calculateAge(selectedPatient()!.birth_date!) + ' anos' : 'Sem data de nasc.' }}
                  </p>
                </div>
              </div>
              
              <button
                (click)="toggleFocusMode()"
                class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                [title]="focusMode() ? 'Sair do modo foco' : 'Modo Foco'"
              >
                <lucide-icon [img]="focusMode() ? Minimize2Icon : Maximize2Icon" class="w-5 h-5"></lucide-icon>
              </button>
            </header>

            <!-- MEDICAL RECORD FORM -->
            <div class="flex-1 overflow-y-auto p-6 space-y-6">
              <!-- Record Type -->
              <div class="space-y-2">
                <label class="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <lucide-icon [img]="FileTextIcon" class="w-4 h-4 text-teal-400"></lucide-icon>
                  Tipo de Registro
                </label>
                <select
                  [(ngModel)]="record.type"
                  class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none"
                >
                  @for (rt of recordTypes; track rt.value) {
                    <option [value]="rt.value">{{ rt.label }}</option>
                  }
                </select>
              </div>

              <!-- Chief Complaint -->
              <div class="space-y-2">
                <label class="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <lucide-icon [img]="AlertCircleIcon" class="w-4 h-4 text-amber-400"></lucide-icon>
                  Queixa Principal <span class="text-red-400">*</span>
                </label>
                <textarea
                  [(ngModel)]="record.chief_complaint"
                  rows="3"
                  class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none resize-none"
                  placeholder="Descreva a queixa principal do paciente..."
                ></textarea>
              </div>

              <!-- Observations -->
              <div class="space-y-2">
                <label class="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <lucide-icon [img]="ActivityIcon" class="w-4 h-4 text-blue-400"></lucide-icon>
                  Observações
                </label>
                <textarea
                  [(ngModel)]="record.observations"
                  rows="4"
                  class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none resize-none"
                  placeholder="Histórico, exames, condições..."
                ></textarea>
              </div>

              <!-- Diagnosis -->
              <div class="space-y-2">
                <label class="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <lucide-icon [img]="FileTextIcon" class="w-4 h-4 text-emerald-400"></lucide-icon>
                  Diagnóstico
                </label>
                <input
                  type="text"
                  [(ngModel)]="record.diagnosis"
                  class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none"
                  placeholder="Diagnóstico hipotético ou confirmado..."
                />
              </div>

              <!-- Prescriptions -->
              <div class="space-y-2">
                <label class="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <lucide-icon [img]="PillIcon" class="w-4 h-4 text-purple-400"></lucide-icon>
                  Prescrições
                </label>
                <textarea
                  [(ngModel)]="record.prescriptions"
                  rows="4"
                  class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none resize-none"
                  placeholder="Medicamentos, posologia, orientações..."
                ></textarea>
              </div>

              <!-- AI Assist Button (Placeholder for WebLLM) -->
              <div class="pt-4 border-t border-slate-700">
                <button
                  (click)="assistWithAI()"
                  [disabled]="aiLoading()"
                  class="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                >
                  @if (aiLoading()) {
                    <lucide-icon [img]="Loader2Icon" class="w-5 h-5 animate-spin"></lucide-icon>
                    Processando IA...
                  } @else {
                    <lucide-icon [img]="BotIcon" class="w-5 h-5"></lucide-icon>
                    Assistir com IA Local (WebLLM)
                  }
                </button>
                <p class="text-xs text-slate-500 text-center mt-2">
                  🤖 Integração com WebLLM coming soon — requisitos: GPU compatível
                </p>
              </div>
            </div>

            <!-- FOOTER: Actions -->
            <footer class="px-6 py-4 border-t border-slate-700 bg-slate-800/30 flex flex-col gap-3">
              @if (saveError()) {
                <div class="flex items-center gap-2 px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                  <lucide-icon [img]="AlertCircleIcon" class="w-4 h-4 shrink-0"></lucide-icon>
                  {{ saveError() }}
                </div>
              }
              <div class="flex justify-end gap-3">
                <button
                  (click)="clearRecord()"
                  class="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-medium"
                >
                  Limpar
                </button>
                <button
                  (click)="saveRecord()"
                  [disabled]="saving() || !record.chief_complaint"
                  class="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  @if (saving()) {
                    <lucide-icon [img]="Loader2Icon" class="w-4 h-4 animate-spin"></lucide-icon>
                    Salvando...
                  } @else {
                    Salvar Prontuário
                  }
                </button>
              </div>
            </footer>
          }
        </main>
      </div>
    }
  `
})
export class ClinicalComponent {
  private clinicContext = inject(ClinicContextService);
  private patientService = inject(PatientService);
  private clinicalService = inject(ClinicalService);
  private iam = inject(IamService);

  readonly SearchIcon = Search;
  readonly UserIcon = User;
  readonly FileTextIcon = FileText;
  readonly ActivityIcon = Activity;
  readonly HeartIcon = Heart;
  readonly PillIcon = Pill;
  readonly AlertCircleIcon = AlertCircle;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly Maximize2Icon = Maximize2;
  readonly Minimize2Icon = Minimize2;
  readonly BotIcon = Bot;
  readonly Loader2Icon = Loader2;
  readonly HistoryIcon = History;
  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronUpIcon = ChevronUp;

  patients = signal<Patient[]>([]);
  selectedPatient = signal<Patient | null>(null);
  searchTerm = signal('');
  focusMode = signal(true);
  saving = signal(false);
  aiLoading = signal(false);
  records = signal<MedicalRecord[]>([]);
  saveError = signal<string | null>(null);
  recordsOpen = signal(true);
  recordsError = signal<string | null>(null);

  selectedClinicId = this.clinicContext.selectedClinicId;
  canWrite = computed(() => this.iam.can('clinical.write'));

  readonly recordTypes: { value: MedicalRecordType; label: string }[] = [
    { value: 'EVOLUCAO', label: 'Evolução' },
    { value: 'RECEITA', label: 'Receita' },
    { value: 'EXAME', label: 'Exame' },
    { value: 'TRIAGEM', label: 'Triagem' }
  ];

  record: { type: MedicalRecordType; chief_complaint: string; observations: string; diagnosis: string; prescriptions: string } = {
    type: 'EVOLUCAO',
    chief_complaint: '',
    observations: '',
    diagnosis: '',
    prescriptions: ''
  };

  filteredPatients = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.patients();
    return this.patients().filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.cpf && p.cpf.includes(term))
    );
  });

  constructor() {
    effect(() => {
      const clinicId = this.clinicContext.selectedClinicId();
      if (clinicId && clinicId !== 'all') {
        this.loadPatients();
      } else {
        this.patients.set([]);
      }
    });
  }

  async loadPatients() {
    try {
      const data = await this.patientService.getPatients();
      this.patients.set(data);
    } catch (err) {
      console.error('Error loading patients:', err);
    }
  }

  onPatientSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  selectPatient(patient: Patient) {
    this.selectedPatient.set(patient);
    this.clearRecord();
    this.loadRecords(patient.id);
  }

  toggleFocusMode() {
    this.focusMode.update(v => !v);
  }

  toggleRecords() {
    this.recordsOpen.update(v => !v);
  }

  clearRecord() {
    this.record = {
      type: 'EVOLUCAO',
      chief_complaint: '',
      observations: '',
      diagnosis: '',
      prescriptions: ''
    };
  }

  async saveRecord() {
    if (!this.canWrite()) {
      this.saveError.set('Sem permissão para criar prontuário');
      return;
    }
    const patient = this.selectedPatient();
    if (!patient) return;

    this.saveError.set(null);
    this.saving.set(true);
    try {
      const content: MedicalRecordContent = {
        chief_complaint: this.record.chief_complaint,
        observations: this.record.observations,
        diagnosis: this.record.diagnosis,
        prescriptions: this.record.prescriptions
      };
      await this.clinicalService.createRecord(patient.id, content, this.record.type);
      this.clearRecord();
      await this.loadRecords(patient.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar prontuário';
      this.saveError.set(message);
    } finally {
      this.saving.set(false);
    }
  }

  async loadRecords(patientId: string) {
    this.recordsError.set(null);
    try {
      const data = await this.clinicalService.getRecordsByPatient(patientId);
      this.records.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar histórico';
      this.recordsError.set(message);
    }
  }

  assistWithAI() {
    this.aiLoading.set(true);
    // TODO: Implement WebLLM integration with dynamic import
    setTimeout(() => {
      this.aiLoading.set(false);
      alert('🤖 IA Local em desenvolvimento. Requer WebGPU e ~4GB de VRAM.');
    }, 1500);
  }

  calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  }
}