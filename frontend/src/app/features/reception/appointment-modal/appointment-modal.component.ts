import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { LucideAngularModule, X, User, Calendar, Clock, Stethoscope, ArrowRight, Search, Plus } from 'lucide-angular';
import { PatientService, Patient } from '../../../core/services/patient.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { IamService } from '../../../core/services/iam.service';
import { ProcedureService, ProcedureType } from '../../../core/services/procedure.service';

export interface AppointmentModalData {
  date?: string;
  doctorId?: string | null;
}

@Component({
  selector: 'app-appointment-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="p-6 md:p-8 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
      
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-6 border-b border-slate-100 mb-6 shrink-0">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-teal-50 text-teal-600 flex items-center justify-center rounded-2xl ring-1 ring-teal-100">
            <lucide-icon [img]="Calendar" [size]="24"></lucide-icon>
          </div>
          <div>
            <h2 class="text-xl font-black text-slate-800 tracking-tight">Novo Agendamento</h2>
            <p class="text-sm font-medium text-slate-500">Preencha os dados do agendamento</p>
          </div>
        </div>
        <button 
          (click)="close()" 
          class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors active:scale-95"
        >
          <lucide-icon [img]="X" [size]="24"></lucide-icon>
        </button>
      </div>

      <!-- Modal Body (Scrollable if needed) -->
      <div class="flex-1 overflow-y-auto pr-2 -mr-2">
        <form [formGroup]="appointmentForm" (ngSubmit)="save()" class="space-y-6">
          
          <!-- Patient Search -->
          <div class="space-y-2 relative">
            <label for="patientSearch" class="block text-sm font-bold text-slate-700">Paciente</label>
            <div class="relative group">
              <lucide-icon [img]="Search" class="absolute left-4 top-3.5 text-slate-400" [size]="20"></lucide-icon>
              <input 
                id="patientSearch"
                type="text"
                [value]="patientSearch()" 
                (input)="onSearchInput($any($event.target).value)"
                class="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border-0 text-slate-900 rounded-2xl ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm font-medium transition-all"
                placeholder="Buscar paciente por nome ou CPF..."
                [class.ring-red-300]="isFieldInvalid('patientId')"
              >
              
              <!-- Dropdown -->
              @if (patientSearch() && !selectedPatient()) {
                <div class="absolute top-full left-0 right-0 bg-white border border-slate-100 rounded-xl shadow-xl mt-2 z-50 max-h-48 overflow-y-auto">
                  @for (p of filteredPatients(); track p.id) {
                    <button type="button" (click)="selectPatient(p)" class="w-full text-left p-3 hover:bg-teal-50 flex items-center justify-between group">
                      <div>
                        <div class="font-bold text-slate-700">{{p.name}}</div>
                        <div class="text-[10px] text-slate-400">CPF: {{p.cpf || 'N/A'}}</div>
                      </div>
                      <lucide-icon [img]="Plus" [size]="16" class="text-slate-300 group-hover:text-teal-600"></lucide-icon>
                    </button>
                  }
                  @if (filteredPatients().length === 0) {
                    <div class="p-4 text-center text-sm font-medium text-slate-500">
                      Nenhum paciente encontrado
                    </div>
                  }
                </div>
              }
            </div>

            @if (selectedPatient()) {
              <div class="mt-2 bg-teal-50 border border-teal-100 p-3 rounded-xl flex justify-between items-center animate-in fade-in slide-in-from-top-1">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-teal-200 flex items-center justify-center text-teal-700 font-bold text-xs">
                    {{selectedPatient()?.name?.charAt(0)}}
                  </div>
                  <div>
                    <div class="font-bold text-sm text-teal-900">{{selectedPatient()?.name}}</div>
                    <div class="text-[10px] text-teal-600">CPF: {{selectedPatient()?.cpf || '---'}}</div>
                  </div>
                </div>
                <button type="button" (click)="clearPatient()" class="text-teal-400 hover:text-teal-700 p-1">
                  <lucide-icon [img]="X" [size]="16"></lucide-icon>
                </button>
              </div>
            }

            @if (isFieldInvalid('patientId')) {
              <p class="text-sm text-red-500 font-bold ml-1">A seleção do paciente é obrigatória.</p>
            }
          </div>

          <!-- Date and Time Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label for="date" class="block text-sm font-bold text-slate-700">Data</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <lucide-icon [img]="Calendar" [size]="20"></lucide-icon>
                </div>
                <input 
                  id="date" 
                  type="date" 
                  formControlName="date"
                  class="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border-0 text-slate-900 rounded-2xl ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm font-medium transition-all"
                  [class.ring-red-300]="isFieldInvalid('date')"
                >
              </div>
            </div>

            <div class="space-y-2">
              <label for="time" class="block text-sm font-bold text-slate-700">Horário</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <lucide-icon [img]="Clock" [size]="20"></lucide-icon>
                </div>
                <input 
                  id="time" 
                  type="time" 
                  formControlName="time"
                  class="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border-0 text-slate-900 rounded-2xl ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm font-medium transition-all"
                  [class.ring-red-300]="isFieldInvalid('time')"
                >
              </div>
            </div>
          </div>

          <!-- Doctor/Procedure Type -->
          <div class="space-y-2">
            <label for="doctorId" class="block text-sm font-bold text-slate-700">Médico Responsável</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <lucide-icon [img]="Stethoscope" [size]="20"></lucide-icon>
              </div>
              <select 
                id="doctorId" 
                formControlName="doctorId"
                class="block w-full pl-12 pr-10 py-3.5 bg-slate-50 border-0 text-slate-900 rounded-2xl ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm font-medium appearance-none transition-all cursor-pointer"
                [class.ring-red-300]="isFieldInvalid('doctorId')"
              >
                <option value="" disabled selected>Selecione um profissional</option>
                @for (doc of doctors(); track doc.id) {
                  <option [value]="doc.id">{{ doc.name }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Procedure type (optional) -->
          <div class="space-y-2">
            <label for="procedureTypeId" class="block text-sm font-bold text-slate-700">Procedimento Planejado</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <lucide-icon [img]="Stethoscope" [size]="20"></lucide-icon>
              </div>
              <select
                id="procedureTypeId"
                formControlName="procedureTypeId"
                class="block w-full pl-12 pr-10 py-3.5 bg-slate-50 border-0 text-slate-900 rounded-2xl ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm font-medium appearance-none transition-all cursor-pointer"
              >
                <option [value]="null">Nenhum</option>
                @for (proc of procedureTypes(); track proc.id) {
                  <option [value]="proc.id">{{ proc.name }}</option>
                }
              </select>
            </div>
          </div>

        </form>
      </div>

      <!-- Modal Footer -->
      <div class="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
        <button 
          type="button" 
          (click)="close()" 
          class="px-6 py-3.5 rounded-2xl text-slate-500 font-bold text-sm hover:bg-slate-100 transition-colors"
        >
          Cancelar
        </button>
        <button 
          (click)="save()"
          [disabled]="appointmentForm.invalid || isSaving() || isLoadingData()"
          class="bg-teal-600 text-white px-8 py-3.5 rounded-2xl font-bold text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          @if (isSaving()) {
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Agendando...
          } @else {
            <span>Confirmar</span>
            <lucide-icon [img]="ArrowRight" [size]="18"></lucide-icon>
          }
        </button>
      </div>

    </div>
  `
})
export class AppointmentModalComponent implements OnInit {
  readonly X = X;
  readonly User = User;
  readonly Calendar = Calendar;
  readonly Clock = Clock;
  readonly Stethoscope = Stethoscope;
  readonly ArrowRight = ArrowRight;
  readonly Search = Search;
  readonly Plus = Plus;

  private fb = inject(FormBuilder);
  private dialogRef = inject(DialogRef<any>);
  private patientService = inject(PatientService);
  private appointmentService = inject(AppointmentService);
  private iam = inject(IamService);
  private procedureService = inject(ProcedureService);
  public data = inject<AppointmentModalData>(DIALOG_DATA, { optional: true });

  isSaving = signal(false);
  isLoadingData = signal(true);
  error = signal<string | null>(null);

  patients = signal<Patient[]>([]);
  doctors = signal<{id: string, name: string}[]>([]);
  procedureTypes = signal<ProcedureType[]>([]);
  procedureTypesLoading = signal(false);

  patientSearch = signal('');
  selectedPatient = signal<Patient | null>(null);

  appointmentForm = this.fb.group({
    patientId: ['', [Validators.required]],
    date: ['', [Validators.required]],
    time: ['', [Validators.required]],
    doctorId: ['', [Validators.required]],
    procedureTypeId: this.fb.control<string | null>(null)
  });

  filteredPatients = computed(() => {
    const term = this.patientSearch().toLowerCase();
    if (!term) return [];
    return this.patients().filter(p => p.name.toLowerCase().includes(term) || (p.cpf && p.cpf.includes(term)));
  });

  async ngOnInit() {
    try {
      this.isLoadingData.set(true);
      const [patientsList, doctorsList, procedureTypesResult] = await Promise.all([
        this.patientService.getPatients(),
        this.appointmentService.getDoctors(),
        this.procedureService.getProcedureTypes().catch(() => [])
      ]);
      this.patients.set(patientsList);
      this.doctors.set(doctorsList);
      this.procedureTypes.set(procedureTypesResult.filter((p: ProcedureType) => p.active));

      // Pre-fill data if provided
      if (this.data?.date) {
        // Assume format YYYY-MM-DDTHH:MM:SS...
        const d = new Date(this.data.date);
        const dateStr = d.toISOString().split('T')[0];
        const timeStr = d.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
        
        this.appointmentForm.patchValue({
          date: dateStr,
          time: timeStr
        });
      }

      if (this.data?.doctorId) {
        this.appointmentForm.patchValue({ doctorId: this.data.doctorId });
      }

    } catch (err) {
      console.error('Failed to load modal data', err);
    } finally {
      this.isLoadingData.set(false);
    }
  }

  onSearchInput(val: string) {
    this.patientSearch.set(val);
    if (this.selectedPatient()) {
      this.selectedPatient.set(null);
      this.appointmentForm.patchValue({ patientId: '' });
    }
  }

  selectPatient(patient: Patient) {
    this.selectedPatient.set(patient);
    this.patientSearch.set(patient.name);
    this.appointmentForm.patchValue({ patientId: patient.id });
  }

  clearPatient() {
    this.selectedPatient.set(null);
    this.patientSearch.set('');
    this.appointmentForm.patchValue({ patientId: '' });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.appointmentForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  close() {
    this.dialogRef.close();
  }

  async save() {
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    if (!this.iam.can('appointments.write')) {
      this.error.set('Você não tem permissão para criar/editar agendamentos.');
      return;
    }

    this.isSaving.set(true);
    const formVals = this.appointmentForm.value;
    
    // Combine date and time
    const localDate = new Date(formVals.date + 'T' + formVals.time);
    
    const patient = this.selectedPatient();

    try {
      await this.appointmentService.createAppointment({
        patient_id: formVals.patientId!,
        patient_name: patient?.name || 'Unknown',
        appointment_date: localDate.toISOString(),
        doctor_id: formVals.doctorId!,
        duration_minutes: 60,
        procedure_type_id: formVals.procedureTypeId ?? undefined
      });
      
      this.dialogRef.close(true); // Signal success
    } catch (err) {
      console.error(err);
      alert('Erro ao criar o agendamento.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
