import { Component, inject, signal, effect, computed } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { LucideAngularModule, Plus, Calendar, Clock, CheckCircle, User, ArrowRight, ListChecks, Monitor } from 'lucide-angular';
import { AppointmentModalComponent, AppointmentModalData } from './appointment-modal/appointment-modal.component';
import { ClinicContextService } from '../../core/services/clinic-context.service';
import { AppointmentService, Appointment } from '../../core/services/appointment.service';
import { AgendaCalendarComponent } from './agenda-calendar.component';

@Component({
  selector: 'app-reception',
  standalone: true,
  imports: [DialogModule, LucideAngularModule, DatePipe, CommonModule, AgendaCalendarComponent],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8">
      
      <!-- MAIN HEADER -->
      <div class="flex flex-col md:flex-row justify-between md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-4">
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
          class="bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <lucide-icon [img]="Plus" [size]="18"></lucide-icon>
          Novo Agendamento
        </button>
      </div>

      <!-- DOCTOR STATUS / ROOMS (If valid context) -->
      @if (isValidContext() && doctors().length > 0) {
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          @for (doctor of doctors(); track doctor.id) {
            <div class="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-emerald-100 text-emerald-700">
                {{ doctor.name.charAt(0) }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[10px] font-bold text-slate-800 truncate">{{ doctor.name }}</div>
                <div class="text-[8px] font-black uppercase text-emerald-600">
                  Online
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- MODULE TABS -->
      <div class="flex gap-2 mb-6 border-b border-slate-200">
        <button 
          (click)="activeTab.set('fila')"
          class="flex items-center gap-2 px-6 py-3 font-bold text-sm uppercase tracking-wide transition-all border-b-2"
          [class.text-teal-600]="activeTab() === 'fila'"
          [class.border-teal-600]="activeTab() === 'fila'"
          [class.text-slate-400]="activeTab() !== 'fila'"
          [class.border-transparent]="activeTab() !== 'fila'"
          [class.hover:text-slate-600]="activeTab() !== 'fila'"
        >
          <lucide-icon [img]="ListChecks" [size]="18"></lucide-icon>
          Fila Hoje
        </button>
        <button 
          (click)="activeTab.set('agenda')"
          class="flex items-center gap-2 px-6 py-3 font-bold text-sm uppercase tracking-wide transition-all border-b-2"
          [class.text-teal-600]="activeTab() === 'agenda'"
          [class.border-teal-600]="activeTab() === 'agenda'"
          [class.text-slate-400]="activeTab() !== 'agenda'"
          [class.border-transparent]="activeTab() !== 'agenda'"
          [class.hover:text-slate-600]="activeTab() !== 'agenda'"
        >
          <lucide-icon [img]="Calendar" [size]="18"></lucide-icon>
          Agenda Semanal
        </button>
      </div>

      @if (activeTab() === 'fila') {
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
              <div class="flex flex-col items-center justify-center text-center h-48">
                <div class="w-16 h-16 bg-teal-50 text-teal-400 rounded-full flex items-center justify-center mb-4 ring-4 ring-teal-50">
                  <lucide-icon [img]="CheckCircle" [size]="32"></lucide-icon>
                </div>
                <h3 class="text-lg font-bold text-slate-700">Fila vazia para hoje</h3>
                <p class="text-sm font-medium text-slate-500 max-w-xs mt-1 mb-6">
                   Nenhum agendamento registrado ainda. Que tal criar o primeiro?
                </p>
                <button 
                  (click)="openNewAppointmentModal()" 
                  class="bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 active:scale-95 flex items-center gap-2 mx-auto"
                >
                  <lucide-icon [img]="Plus" [size]="16"></lucide-icon>
                  Criar Agendamento
                </button>
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
      } @else if (activeTab() === 'agenda') {
        <!-- AGENDA SEMANAL TAB -->
        <app-agenda-calendar (onNewAppointment)="handleNewAppointmentFromCalendar($event)"></app-agenda-calendar>
      }

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
  readonly ListChecks = ListChecks;
  readonly Monitor = Monitor;

  activeTab = signal<'fila' | 'agenda'>('fila');
  isLoading = signal(false);
  appointments = signal<Appointment[]>([]);
  doctors = signal<{id: string, name: string}[]>([]);

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
        this.loadDoctors();
      } else {
        this.appointments.set([]);
        this.doctors.set([]);
      }
    }, { allowSignalWrites: true });
  }

  async loadAppointments() {
    this.isLoading.set(true);
    try {
      const data = await this.appointmentService.getWaitlistForToday();
      this.appointments.set(data);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar fila de espera.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadDoctors() {
    try {
      const data = await this.appointmentService.getDoctors();
      this.doctors.set(data);
    } catch (err) {
      console.error(err);
    }
  }

  async updateStatus(appt: Appointment, newStatus: string) {
    try {
      await this.appointmentService.updateAppointmentStatus(appt.id, newStatus);
      this.loadAppointments();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status.');
    }
  }

  openNewAppointmentModal(prefillData?: AppointmentModalData) {
    if (!this.isValidContext()) return;

    const dialogRef = this.dialog.open(AppointmentModalComponent, {
      minWidth: '600px',
      panelClass: ['bg-transparent'],
      backdropClass: ['bg-slate-900/60', 'backdrop-blur-sm'],
      data: prefillData || undefined
    });

    dialogRef.closed.subscribe((result) => {
      if (result) {
        this.loadAppointments(); 
        // Note: The agenda calendar will also trigger its own reload via its effect on next tick or we might need a global signal.
        // For simplicity, we assume users switch tabs or the calendar does its own reload on component init.
      }
    });
  }

  handleNewAppointmentFromCalendar(event: {date: string, doctorId: string | null}) {
    this.openNewAppointmentModal({ date: event.date, doctorId: event.doctorId });
  }
}
