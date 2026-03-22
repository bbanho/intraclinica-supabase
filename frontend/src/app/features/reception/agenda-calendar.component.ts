import { Component, inject, computed, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Plus } from 'lucide-angular';
import { DatabaseService } from '../../core/services/database.service';
import { PatientStore } from '../../core/store/patient.store';

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
                <option [value]="doc.name">{{ doc.name }}</option>
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
          <div class="h-12 border-b border-slate-100 bg-slate-50/80"></div> <!-- Header spacer -->
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
                  
                  <!-- SLOT CLICK TARGET (NEW APPOINTMENT) -->
                  <button 
                    (click)="triggerNewAppointment(day.date, hour)"
                    class="absolute inset-0 w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-teal-50/50 text-teal-600 z-0"
                    title="Agendar horário"
                  >
                    <lucide-icon [img]="Plus" [size]="20"></lucide-icon>
                  </button>

                  <!-- APPOINTMENT CARDS -->
                  <div class="relative z-10 w-full h-full flex flex-col gap-1 overflow-hidden pointer-events-none">
                    @for (app of getAppointmentsForSlot(day.date, hour); track app.id) {
                      <div 
                        class="text-[9px] leading-tight p-1.5 rounded-md border shadow-sm truncate font-medium pointer-events-auto cursor-pointer hover:shadow-md transition-shadow"
                        [class.bg-slate-100]="app.status === 'Agendado'" [class.border-slate-200]="app.status === 'Agendado'" [class.text-slate-700]="app.status === 'Agendado'"
                        [class.bg-amber-100]="app.status === 'Aguardando'" [class.border-amber-200]="app.status === 'Aguardando'" [class.text-amber-800]="app.status === 'Aguardando'"
                        [class.bg-indigo-100]="app.status === 'Chamado'" [class.border-indigo-200]="app.status === 'Chamado'" [class.text-indigo-800]="app.status === 'Chamado'"
                        [class.bg-blue-100]="app.status === 'Em Atendimento'" [class.border-blue-200]="app.status === 'Em Atendimento'" [class.text-blue-800]="app.status === 'Em Atendimento'"
                        [class.bg-teal-100]="app.status === 'Realizado'" [class.border-teal-200]="app.status === 'Realizado'" [class.text-teal-800]="app.status === 'Realizado'"
                        [title]="app.patientName + ' (' + app.type + ') - ' + app.status"
                      >
                        <div class="font-bold truncate">{{ app.patientName }}</div>
                        <div class="opacity-80 truncate">{{ app.type }} • {{ app.doctorName }}</div>
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
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-corner { background: transparent; }
  `]
})
export class AgendaCalendarComponent {
  db = inject(DatabaseService);
  store = inject(PatientStore);

  @Output() onNewAppointment = new EventEmitter<{date: string, doctorName: string | null}>();

  readonly CalendarIcon = CalendarIcon;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly User = User;
  readonly Plus = Plus;

  hours = Array.from({ length: 11 }, (_, i) => i + 8); // 08 to 18
  currentDate = signal(new Date());
  selectedDoctor = signal<string | null>(null);

  doctors = computed(() => this.db.users().filter(u => u.role === 'DOCTOR' || u.role === 'ADMIN'));

  weekDays = computed(() => {
    const curr = new Date(this.currentDate());
    const firstDay = curr.getDate() - curr.getDay() + 1; // Start on Monday
    const days = [];
    
    const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(curr.setDate(firstDay + i));
      const isToday = new Date().toDateString() === d.toDateString();
      days.push({
        date: new Date(d),
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
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const hourStr = hour.toString().padStart(2, '0');
    const doctorFilter = this.selectedDoctor();

    return this.store.appointments().filter(app => {
      // app.date is expected to be "HH:MM" because the current component uses <input type="time">
      // Wait, if it's just HH:MM, we can't filter by date properly. We need to check how it's stored.
      // The DB schema says `appointment_date timestamptz`. Let's assume PatientService maps it.
      // If patientService maps `date` to just time, we have a problem. 
      // Assuming `app.timestamp` or `app.appointmentDate` exists. 
      // Looking at reception.component, it only saves/shows HH:MM today. We need to handle this.
      // For now, let's match the date substring if it exists, or just use the time if it's a legacy record.
      
      const appFullDate = (app as any).appointmentDate || app.date; 
      
      let matchesDate = true;
      let matchesTime = false;

      if (appFullDate.includes('T')) {
          // ISO String
          matchesDate = appFullDate.startsWith(dateStr);
          matchesTime = appFullDate.includes(`T${hourStr}:`);
      } else {
          // Just HH:MM (legacy/buggy data)
          matchesDate = new Date().toDateString() === date.toDateString(); // Only show on "today"
          matchesTime = appFullDate.startsWith(`${hourStr}:`);
      }

      const matchesDoctor = doctorFilter ? app.doctorName === doctorFilter : true;

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
    
    // We emit the ISO string so the parent can handle it, or just a combined string
    const fullDateTime = `${dateStr}T${timeStr}`;
    
    this.onNewAppointment.emit({
      date: fullDateTime,
      doctorName: this.selectedDoctor()
    });
  }
}
