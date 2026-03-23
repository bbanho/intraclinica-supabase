import { Component, inject, signal, computed, effect } from '@angular/core';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { LucideAngularModule, UserPlus, Users, Search, AlertCircle, Edit, Trash2 } from 'lucide-angular';
import { PatientService, Patient } from '../../core/services/patient.service';
import { ClinicContextService } from '../../core/services/clinic-context.service';
import { PatientModalComponent } from './patient-modal/patient-modal.component';

// Defined outside class so it's created once, not on every formatGender() call
const GENDER_MAP: Record<string, string> = { M: 'Masculino', F: 'Feminino', O: 'Outro' };

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [DialogModule, LucideAngularModule],
  template: `
    <div class="h-full flex flex-col p-6 bg-gray-50">
      <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p class="text-sm text-gray-500">Gerencie os pacientes da clínica</p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Search bar -->
          <div class="relative">
            <lucide-icon [img]="SearchIcon" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none"></lucide-icon>
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              (input)="onSearch($event)"
              class="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-56"
            />
          </div>
          <button
            (click)="openPatientModal()"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium outline-none whitespace-nowrap"
          >
            <lucide-icon [img]="UserPlusIcon" class="w-5 h-5"></lucide-icon>
            Novo Paciente
          </button>
        </div>
      </header>

      <main class="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        @if (error()) {
          <div class="p-8 flex flex-col items-center justify-center text-center flex-1">
            <lucide-icon [img]="AlertCircleIcon" class="w-12 h-12 text-red-500 mb-4"></lucide-icon>
            <h3 class="text-lg font-medium text-gray-900">Ocorreu um erro</h3>
            <p class="text-gray-500 mt-1 mb-4">{{ error() }}</p>
            <button (click)="loadPatients()" class="text-blue-600 font-medium hover:text-blue-700">Tentar novamente</button>
          </div>
        } @else if (loading()) {
          <div class="p-6 space-y-4 flex-1">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="h-16 bg-gray-100 animate-pulse rounded-lg"></div>
            }
          </div>
        } @else if (!filteredPatients().length) {
          <div class="p-12 flex flex-col items-center justify-center text-center flex-1">
            <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <lucide-icon [img]="UsersIcon" class="w-8 h-8 text-gray-400"></lucide-icon>
            </div>
            @if (searchTerm()) {
              <h3 class="text-lg font-medium text-gray-900">Nenhum resultado encontrado</h3>
              <p class="text-gray-500 mt-1">Nenhum paciente corresponde a "{{ searchTerm() }}".</p>
            } @else {
              <h3 class="text-lg font-medium text-gray-900">Nenhum paciente encontrado</h3>
              <p class="text-gray-500 mt-1 mb-6">Comece adicionando o primeiro paciente à clínica.</p>
              <button
                (click)="openPatientModal()"
                class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium outline-none"
              >
                Adicionar Paciente
              </button>
            }
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-600">
              <thead class="bg-gray-50 text-gray-700 border-b border-gray-200 font-medium">
                <tr>
                  <th class="px-6 py-4">Nome</th>
                  <th class="px-6 py-4">CPF</th>
                  <th class="px-6 py-4">Telefone</th>
                  <th class="px-6 py-4">Data de Nasc.</th>
                  <th class="px-6 py-4">Gênero</th>
                  <th class="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (patient of filteredPatients(); track patient.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 font-medium text-gray-900">{{ patient.name }}</td>
                    <td class="px-6 py-4">{{ patient.cpf || '-' }}</td>
                    <td class="px-6 py-4">{{ patient.phone || '-' }}</td>
                    <td class="px-6 py-4">{{ formatDate(patient.birth_date) }}</td>
                    <td class="px-6 py-4">{{ formatGender(patient.gender) }}</td>
                    <td class="px-6 py-4 text-right space-x-2">
                      <button (click)="openPatientModal(patient)" class="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50 outline-none">
                        <lucide-icon [img]="EditIcon" class="w-4 h-4"></lucide-icon>
                      </button>
                      <button (click)="deletePatient(patient)" class="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 outline-none">
                        <lucide-icon [img]="Trash2Icon" class="w-4 h-4"></lucide-icon>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
            {{ filteredPatients().length }} paciente(s) exibido(s)
          </div>
        }
      </main>

      <!-- Delete confirmation overlay -->
      @if (deleteTarget()) {
        <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Confirmar exclusão</h3>
            <p class="text-sm text-gray-500 mb-6">
              Tem certeza que deseja remover <span class="font-medium text-gray-800">{{ deleteTarget()?.name }}</span>? Esta ação não pode ser desfeita.
            </p>
            <div class="flex justify-end gap-3">
              <button
                (click)="deleteTarget.set(null)"
                [disabled]="deleting()"
                class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 outline-none"
              >
                Cancelar
              </button>
              <button
                (click)="confirmDelete()"
                [disabled]="deleting()"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 flex items-center gap-2 outline-none"
              >
                @if (deleting()) { Removendo... } @else { Remover }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class PatientsComponent {
  private patientService = inject(PatientService);
  private context = inject(ClinicContextService);
  private dialog = inject(Dialog);

  patients = signal<Patient[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  searchTerm = signal('');
  deleteTarget = signal<Patient | null>(null);
  deleting = signal(false);

  readonly UserPlusIcon = UserPlus;
  readonly UsersIcon = Users;
  readonly SearchIcon = Search;
  readonly AlertCircleIcon = AlertCircle;
  readonly EditIcon = Edit;
  readonly Trash2Icon = Trash2;

  filteredPatients = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.patients();
    return this.patients().filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.cpf && p.cpf.includes(term))
    );
  });

  constructor() {
    // Reacts to clinic context changes — replaces ngOnInit
    effect(() => {
      const clinicId = this.context.selectedClinicId();
      if (clinicId && clinicId !== 'all') {
        this.loadPatients();
      } else {
        this.patients.set([]);
      }
    });
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  async loadPatients() {
    try {
      this.loading.set(true);
      this.error.set(null);
      const data = await this.patientService.getPatients();
      this.patients.set(data);
    } catch (err: unknown) {
      console.error(err);
      this.error.set(err instanceof Error ? err.message : 'Falha ao carregar pacientes.');
    } finally {
      this.loading.set(false);
    }
  }

  openPatientModal(patient?: Patient) {
    const dialogRef = this.dialog.open(PatientModalComponent, {
      data: { patient },
      width: '100%',
      maxWidth: '500px',
      panelClass: ['bg-transparent'],
      hasBackdrop: true,
      backdropClass: 'bg-black/40'
    });

    dialogRef.closed.subscribe((result) => {
      if (result) {
        this.loadPatients();
      }
    });
  }

  deletePatient(patient: Patient) {
    this.deleteTarget.set(patient);
  }

  async confirmDelete() {
    const patient = this.deleteTarget();
    if (!patient) return;

    try {
      this.deleting.set(true);
      await this.patientService.deletePatient(patient.id);
      this.patients.update(list => list.filter(p => p.id !== patient.id));
      this.deleteTarget.set(null);
    } catch (err: unknown) {
      console.error(err);
      this.error.set(err instanceof Error ? err.message : 'Erro ao excluir paciente.');
    } finally {
      this.deleting.set(false);
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  formatGender(gender: string | null): string {
    return gender ? (GENDER_MAP[gender] ?? gender) : '-';
  }
}
