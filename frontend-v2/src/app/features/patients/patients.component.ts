import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { LucideAngularModule, UserPlus, Users, Search, AlertCircle, Edit, Trash2 } from 'lucide-angular';
import { PatientService, Patient } from '../../core/services/patient.service';
import { PatientModalComponent } from './patient-modal/patient-modal.component';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, DialogModule, LucideAngularModule],
  template: `
    <div class="h-full flex flex-col p-6 bg-gray-50">
      <header class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p class="text-sm text-gray-500">Gerencie os pacientes da clínica</p>
        </div>
        <button 
          (click)="openPatientModal()"
          class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium outline-none"
        >
          <lucide-icon [img]="UserPlusIcon" class="w-5 h-5"></lucide-icon>
          Novo Paciente
        </button>
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
        } @else if (!patients().length) {
          <div class="p-12 flex flex-col items-center justify-center text-center flex-1">
            <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <lucide-icon [img]="UsersIcon" class="w-8 h-8 text-gray-400"></lucide-icon>
            </div>
            <h3 class="text-lg font-medium text-gray-900">Nenhum paciente encontrado</h3>
            <p class="text-gray-500 mt-1 mb-6">Comece adicionando o primeiro paciente à clínica.</p>
            <button 
              (click)="openPatientModal()"
              class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium outline-none"
            >
              Adicionar Paciente
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-600">
              <thead class="bg-gray-50 text-gray-700 border-b border-gray-200 font-medium">
                <tr>
                  <th class="px-6 py-4">Nome</th>
                  <th class="px-6 py-4">CPF</th>
                  <th class="px-6 py-4">Data de Nasc.</th>
                  <th class="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (patient of patients(); track patient.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 font-medium text-gray-900">{{ patient.name }}</td>
                    <td class="px-6 py-4">{{ patient.cpf || '-' }}</td>
                    <td class="px-6 py-4">{{ formatDate(patient.birth_date) }}</td>
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
        }
      </main>
    </div>
  `
})
export class PatientsComponent implements OnInit {
  private patientService = inject(PatientService);
  private dialog = inject(Dialog);

  patients = signal<Patient[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  readonly UserPlusIcon = UserPlus;
  readonly UsersIcon = Users;
  readonly SearchIcon = Search;
  readonly AlertCircleIcon = AlertCircle;
  readonly EditIcon = Edit;
  readonly Trash2Icon = Trash2;

  ngOnInit() {
    this.loadPatients();
  }

  async loadPatients() {
    try {
      this.loading.set(true);
      this.error.set(null);
      const data = await this.patientService.getPatients();
      this.patients.set(data);
    } catch (err: any) {
      console.error(err);
      this.error.set(err.message || 'Falha ao carregar pacientes.');
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
    // We wrap panel inner div with rounded-xl, etc. so we use bg-transparent

    dialogRef.closed.subscribe((result) => {
      if (result) {
        this.loadPatients();
      }
    });
  }

  async deletePatient(patient: Patient) {
    if (!confirm(`Tem certeza que deseja remover ${patient.name}?`)) return;

    try {
      await this.patientService.deletePatient(patient.id);
      this.patients.update(list => list.filter(p => p.id !== patient.id));
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir paciente: ' + (err.message || ''));
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
}
