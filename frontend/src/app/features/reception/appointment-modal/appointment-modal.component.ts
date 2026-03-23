import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { LucideAngularModule, X, User, Calendar, Clock, Stethoscope, ArrowRight } from 'lucide-angular';
import { PatientService, Patient } from '../../../core/services/patient.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { IamService } from '../../../core/services/iam.service';
import { ClinicContextService } from '../../../core/services/clinic-context.service';

@Component({
  selector: 'app-appointment-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  template: `
    <!-- Overlay/Wrapper -> Managed by CDK, but we can set internal padding -->
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
          
          <!-- Patient Field -->
          <div class="space-y-2">
            <label for="patientId" class="block text-sm font-bold text-slate-700">Paciente</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <lucide-icon [img]="User" [size]="20"></lucide-icon>
              </div>
              <select 
                id="patientId" 
                formControlName="patientId"
                class="block w-full pl-12 pr-10 py-3.5 bg-slate-50 border-0 text-slate-900 rounded-2xl ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm font-medium appearance-none transition-all cursor-pointer"
                [class.ring-red-300]="isFieldInvalid('patientId')"
              >
                <option value="" disabled selected>Selecione um paciente...</option>
                @for (patient of patients(); track patient.id) {
                  <option [value]="patient.id">{{ patient.name }} (CPF: {{ patient.cpf || 'N/A' }})</option>
                }
              </select>
            </div>
            @if (isFieldInvalid('patientId')) {
              <p class="text-sm text-red-500 font-bold ml-1 animate-in fade-in slide-in-from-top-1">A seleção do paciente é obrigatória.</p>
            }
          </div>

          <!-- Date and Time Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Date Field -->
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

            <!-- Time Field -->
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

  private fb = inject(FormBuilder);
  private dialogRef = inject(DialogRef<any>);
  private patientService = inject(PatientService);
  private appointmentService = inject(AppointmentService);
  private iam = inject(IamService);
  private context = inject(ClinicContextService);

  isSaving = signal(false);
  isLoadingData = signal(true);
  error = signal<string | null>(null);

  patients = signal<Patient[]>([]);
  doctors = signal<{id: string, name: string}[]>([]);

  appointmentForm = this.fb.group({
    patientId: ['', [Validators.required]],
    date: ['', [Validators.required]],
    time: ['', [Validators.required]],
    doctorId: ['', [Validators.required]]
  });

  async ngOnInit() {
    try {
      this.isLoadingData.set(true);
      const [patientsList, doctorsList] = await Promise.all([
        this.patientService.getPatients(),
        this.appointmentService.getDoctors()
      ]);
      this.patients.set(patientsList);
      this.doctors.set(doctorsList);
    } catch (err) {
      console.error('Failed to load modal data', err);
    } finally {
      this.isLoadingData.set(false);
    }
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
    // Actually we should handle local timezone, but appending 'T' + time + ':00' and parsing with new Date() is safer for local.
    const localDate = new Date(formVals.date + 'T' + formVals.time);
    
    const selectedPatient = this.patients().find(p => p.id === formVals.patientId);

    try {
      await this.appointmentService.createAppointment({
        patient_id: formVals.patientId!,
        patient_name: selectedPatient?.name || 'Unknown',
        appointment_date: localDate.toISOString(),
        doctor_id: formVals.doctorId!,
        duration_minutes: 60
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