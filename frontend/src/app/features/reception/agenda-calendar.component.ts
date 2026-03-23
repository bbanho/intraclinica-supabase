import { Component, inject, computed, signal, Output, EventEmitter, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Plus } from 'lucide-angular';
import { AppointmentService, Appointment } from '../../core/services/appointment.service';
import { ClinicContextService } from '../../core/services/clinic-context.service';

@Component({
  selector: 'app-agenda-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[70vh] animate-fade-in">
      <!-- CALENDAR HEADER -->
      <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
        <div class="flex items-center gap-4">
          <div class="bg-teal-100 text-teal-700 p-2 rounded-xl">
            <lucide-icon [img]="CalendarIcon" [size]="20"></lucide-icon>
          </div>
          <div>
            <h3 class="font-black text-slate-800 uppercase tracking-tight">Agenda Semanal</h3>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ currentWeekLabel() }}</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- DOCTOR SELECTOR -->
          <div class="relative flex items-center">
            <lucide-icon [img]="User" [size]="16" class="absolute left-3 text-slate-400"></lucide-icon>
            <select 
              [ngModel]="selectedDoctor()" 
              (ngModelChange)="selectedDoctor.set($event)"
              class="pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-teal-500 font-bold text-slate-700 text-sm appearance-none shadow-sm"
            >
              <option [ngValue]="null">Todos os Médicos</option>
              @for (doc of doctors(); track doc.id) {
                <option [value]="doc.id">{{ doc.name }}</option>
              }
            </select>
          </div>

          <!-- WEEK NAVIGATION -->
          <div class="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm p-1">
            <button (click)="previousWeek()" class="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
              <lucide-icon [img]="ChevronLeft" [size]="18"></lucide-icon>
            </button>
            <button (click)="resetToToday()" class="px-3 text-xs font-black uppercase text-slate-600 hover:text-teal-600 transition-colors">Hoje</button>
            <button (click)="nextWeek()" class="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
              <lucide-icon [img]="ChevronRight" [size]="18"></lucide-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- CALENDAR GRID -->
      <div class="flex-1 overflow-auto custom-scrollbar flex">
        <!-- TIME COLUMN -->
        <div class="w-16 shrink-0 border-r border-slate-100 bg-white sticky left-0 z-10">
          <div class="h-12 border-b border-slate-100 bg-slate-50/80"></div>
          @for (hour of hours; track hour) {
            <div class="h-20 border-b border-slate-50 flex items-start justify-center pt-2">
              <span class="text-[10px] font-black text-slate-400">{{ hour }}:00</span>
            </div>
          }
        </div>

        <!-- DAYS COLUMNS -->
        <div class="flex-1 flex min-w-[800px]">
          @for (day of weekDays(); track day.date.toISOString()) {
            <div class="flex-1 border-r border-slate-100 min-w-[120px]">
              
              <!-- DAY HEADER -->
              <div class="h-12 border-b border-slate-100 bg-slate-50/80 flex flex-col items-center justify-center sticky top-0 z-10" [class.bg-teal-50]="day.isToday">
                <span class="text-[10px] font-black uppercase tracking-widest" [class.text-teal-600]="day.isToday" [class.text-slate-400]="!day.isToday">{{ day.name }}</span>
                <span class="text-sm font-bold" [class.text-teal-700]="day.isToday" [class.text-slate-700]="!day.isToday">{{ day.dayOfMonth }}</span>
              </div>

              <!-- TIME SLOTS -->
              @for (hour of hours; track hour) {
                <div class="h-20 border-b border-slate-50 p-1 relative group transition-colors hover:bg-slate-50/50">
                  
                  <button 
                    (click)="triggerNewAppointment(day.date, hour)"
                    class="absolute inset-0 w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-teal-50/50 text-teal-600 z-0"
                    title="Agendar horário"
                  >
                    <lucide-icon [img]="Plus" [size]="20"></lucide-icon>
                  </button>

                  <div class="relative z-10 w-full h-full flex flex-col gap-1 overflow-hidden pointer-events-none">
                    @for (app of getAppointmentsForSlot(day.date, hour); track app.id) {
                      <div 
                        class="text-[9px] leading-tight p-1.5 rounded-md border shadow-sm truncate font-medium pointer-events-auto cursor-pointer hover:shadow-md transition-shadow"
                        [class.bg-slate-100]="app.status === 'Agendado'" [class.border-slate-200]="app.status === 'Agendado'" [class.text-slate-700]="app.status === 'Agendado'"
                        [class.bg-amber-100]="app.status === 'Aguardando'" [class.border-amber-200]="app.status === 'Aguardando'" [class.text-amber-800]="app.status === 'Aguardando'"
                        [class.bg-indigo-100]="app.status === 'Em Consulta'" [class.border-indigo-200]="app.status === 'Em Consulta'" [class.text-indigo-800]="app.status === 'Em Consulta'"
                        [class.bg-blue-100]="app.status === 'Finalizado'" [class.border-blue-200]="app.status === 'Finalizado'" [class.text-blue-800]="app.status === 'Finalizado'"
                        [title]="app.patient_name + ' - ' + app.status"
                      >
                        <div class="font-bold truncate">{{ app.patient_name }}</div>
                        <div class="opacity-80 truncate">{{ app.status }}</div>
                      </div>
                    }
                  </div>

                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class AgendaCalendarComponent {
  private appointmentService = inject(AppointmentService);
  private context = inject(ClinicContextService);

  @Output() onNewAppointment = new EventEmitter<{date: string, doctorId: string | null}>();

  readonly CalendarIcon = CalendarIcon;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly User = User;
  readonly Plus = Plus;

  hours = Array.from({ length: 11 }, (_, i) => i + 8); // 08 to 18
  currentDate = signal(new Date());
  selectedDoctor = signal<string | null>(null);

  doctors = signal<{id: string, name: string}[]>([]);
  appointments = signal<Appointment[]>([]);

  constructor() {
    effect(() => {
      const clinicId = this.context.selectedClinicId();
      if (clinicId && clinicId !== 'all') {
        this.loadData();
      } else {
        this.doctors.set([]);
        this.appointments.set([]);
      }
    });
  }

  async loadData() {
    try {
      const [docs, apps] = await Promise.all([
        this.appointmentService.getDoctors(),
        this.appointmentService.getRecentAppointments() // In real app, we'd filter by current week
      ]);
      this.doctors.set(docs);
      this.appointments.set(apps);
    } catch (err) {
      console.error('Failed to load calendar data', err);
    }
  }

  weekDays = computed(() => {
    const days = [];
    const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const current = new Date(this.currentDate());
    
    const dayIndex = current.getDay();
    const diffToMonday = current.getDate() - dayIndex + (dayIndex === 0 ? -6 : 1);
    const monday = new Date(current.getFullYear(), current.getMonth(), diffToMonday);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday = new Date().toDateString() === d.toDateString();
      days.push({
        date: d,
        name: dayNames[i],
        dayOfMonth: d.getDate(),
        isToday
      });
    }
    return days;
  });

  currentWeekLabel = computed(() => {
    const days = this.weekDays();
    const first = days[0].date;
    const last = days[6].date;
    
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()} a ${last.getDate()} de ${monthNames[first.getMonth()]} ${first.getFullYear()}`;
    }
    return `${first.getDate()} ${monthNames[first.getMonth()]} a ${last.getDate()} ${monthNames[last.getMonth()]} ${last.getFullYear()}`;
  });

  getAppointmentsForSlot(date: Date, hour: number) {
    const dateStr = date.toISOString().split('T')[0];
    const hourStr = hour.toString().padStart(2, '0');
    const doctorFilter = this.selectedDoctor();

    return this.appointments().filter(app => {
      const appDate = new Date(app.appointment_date);
      const appDateStr = appDate.toISOString().split('T')[0];
      const appHourStr = appDate.getHours().toString().padStart(2, '0');
      
      const matchesDate = appDateStr === dateStr;
      const matchesTime = appHourStr === hourStr;
      const matchesDoctor = doctorFilter ? app.doctor_id === doctorFilter : true;

      return matchesDate && matchesTime && matchesDoctor;
    });
  }

  previousWeek() {
    const d = new Date(this.currentDate());
    d.setDate(d.getDate() - 7);
    this.currentDate.set(d);
  }

  nextWeek() {
    const d = new Date(this.currentDate());
    d.setDate(d.getDate() + 7);
    this.currentDate.set(d);
  }

  resetToToday() {
    this.currentDate.set(new Date());
  }

  triggerNewAppointment(date: Date, hour: number) {
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    
    this.onNewAppointment.emit({
      date: `${dateStr}T${timeStr}`,
      doctorId: this.selectedDoctor()
    });
  }
}
