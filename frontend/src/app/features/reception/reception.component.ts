import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { LucideAngularModule, Plus, Calendar, Clock, CheckCircle, User, ArrowRight } from 'lucide-angular';
import { AppointmentModalComponent } from './appointment-modal/appointment-modal.component';
import { ClinicContextService } from '../../core/services/clinic-context.service';
import { AppointmentService, Appointment } from '../../core/services/appointment.service';

@Component({
  selector: 'app-reception',
  standalone: true,
  imports: [CommonModule, DialogModule, LucideAngularModule],
  providers: [DatePipe],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8">
      
      <!-- MAIN HEADER -->
      <div class="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <lucide-icon [img]="Calendar" [size]="28"></lucide-icon>
          </div>
          <div>
            <h1 class="text-2xl font-black text-slate-800 tracking-tight uppercase">Recepção</h1>
            <p class="text-sm font-medium text-slate-500">Gestão de fluxo e agendamentos diários</p>
          </div>
        </div>

        <button 
          (click)="openNewAppointmentModal()" 
          [disabled]="!isValidContext()"
          class="bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <lucide-icon [img]="Plus" [size]="18"></lucide-icon>
          Novo Agendamento
        </button>
      </div>

      <!-- WAITING LIST -->
      <div class="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm min-h-[400px]">
         <div class="flex justify-between items-center mb-8">
           <h3 class="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
             <lucide-icon [img]="Clock" [size]="16"></lucide-icon> 
             Fila de Espera (Hoje)
           </h3>
           <div class="flex gap-2">
             <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase">Agendados: {{ appointments().length }}</span>
             <span class="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase">Aguardando: {{ waitingCount() }}</span>
           </div>
         </div>
         
         @if (!isValidContext()) {
            <div class="flex flex-col items-center justify-center text-center h-48 opacity-60">
              <lucide-icon [img]="Calendar" [size]="48" class="text-slate-300 mb-4"></lucide-icon>
              <h3 class="text-lg font-bold text-slate-700">Clínica não selecionada</h3>
              <p class="text-sm font-medium text-slate-500 max-w-sm mt-1">
                 Selecione uma clínica específica para ver a fila de espera.
              </p>
            </div>
         } @else if (isLoading()) {
            <div class="animate-pulse space-y-4">
               <div class="h-20 w-full bg-slate-50 border border-slate-100 rounded-2xl"></div>
               <div class="h-20 w-full bg-slate-50 border border-slate-100 rounded-2xl"></div>
            </div>
         } @else if (appointments().length === 0) {
            <div class="flex flex-col items-center justify-center text-center h-48 opacity-60">
              <lucide-icon [img]="CheckCircle" [size]="48" class="text-slate-300 mb-4"></lucide-icon>
              <h3 class="text-lg font-bold text-slate-700">Nenhum agendamento para hoje</h3>
              <p class="text-sm font-medium text-slate-500 max-w-sm mt-1">
                 A fila está vazia no momento.
              </p>
            </div>
         } @else {
            <div class="space-y-4">
              @for (appt of appointments(); track appt.id) {
                <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-teal-200 transition-colors">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                      <lucide-icon [img]="User" [size]="24"></lucide-icon>
                    </div>
                    <div>
                      <h4 class="font-bold text-slate-800">{{ appt.patient_name }}</h4>
                      <p class="text-sm text-slate-500 font-medium">
                        {{ appt.appointment_date | date:'HH:mm' }} • {{ appt.status }}
                      </p>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <!-- Status Actions based on current status -->
                    @if (appt.status === 'Agendado') {
                      <button (click)="updateStatus(appt, 'Aguardando')" class="px-4 py-2 bg-amber-50 text-amber-700 text-xs font-bold uppercase rounded-xl hover:bg-amber-100 transition-colors">
                        Marcar Chegada
                      </button>
                    }
                    @if (appt.status === 'Aguardando') {
                      <button (click)="updateStatus(appt, 'Em Consulta')" class="px-4 py-2 bg-teal-50 text-teal-700 text-xs font-bold uppercase rounded-xl hover:bg-teal-100 transition-colors flex items-center gap-1">
                        Chamar <lucide-icon [img]="ArrowRight" [size]="14"></lucide-icon>
                      </button>
                    }
                    @if (appt.status === 'Em Consulta') {
                      <button (click)="updateStatus(appt, 'Finalizado')" class="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-xl hover:bg-slate-300 transition-colors">
                        Finalizar
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
         }
      </div>

    </div>
  `
})
export class ReceptionComponent {
  private dialog = inject(Dialog);
  private context = inject(ClinicContextService);
  private appointmentService = inject(AppointmentService);
  
  readonly Plus = Plus;
  readonly Calendar = Calendar;
  readonly Clock = Clock;
  readonly CheckCircle = CheckCircle;
  readonly User = User;
  readonly ArrowRight = ArrowRight;

  isLoading = signal(false);
  appointments = signal<Appointment[]>([]);

  isValidContext = computed(() => {
    const id = this.context.selectedClinicId();
    return id !== null && id !== 'all';
  });

  waitingCount = computed(() => {
    return this.appointments().filter(a => a.status === 'Aguardando').length;
  });

  constructor() {
    effect(() => {
      const clinicId = this.context.selectedClinicId();
      if (clinicId && clinicId !== 'all') {
        this.loadAppointments();
      } else {
        this.appointments.set([]);
      }
    });
  }

  async loadAppointments() {
    this.isLoading.set(true);
    try {
      const data = await this.appointmentService.getWaitlistForToday();
      this.appointments.set(data);
    } catch (err) {
      console.error(err);
      // TODO: Replace with Toast later
      alert('Erro ao carregar fila de espera.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateStatus(appt: Appointment, newStatus: string) {
    try {
      await this.appointmentService.updateAppointmentStatus(appt.id, newStatus);
      // Fail-loud: only update local state after successful DB update
      this.loadAppointments();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status.');
    }
  }

  openNewAppointmentModal() {
    if (!this.isValidContext()) return;

    const dialogRef = this.dialog.open(AppointmentModalComponent, {
      minWidth: '600px',
      panelClass: ['bg-transparent'],
      backdropClass: ['bg-slate-900/60', 'backdrop-blur-sm'] 
    });

    dialogRef.closed.subscribe((result) => {
      if (result) {
        this.loadAppointments(); // Refresh list after new appointment
      }
    });
  }
}