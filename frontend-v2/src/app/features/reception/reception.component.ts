import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { LucideAngularModule, Plus, Calendar, Clock, CheckCircle } from 'lucide-angular';
import { AppointmentModalComponent } from './appointment-modal/appointment-modal.component';
import { ClinicContextService } from '../../core/services/clinic-context.service';

@Component({
  selector: 'app-reception',
  standalone: true,
  imports: [CommonModule, DialogModule, LucideAngularModule],
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
          class="bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 active:scale-95 flex items-center gap-2"
        >
          <lucide-icon [img]="Plus" [size]="18"></lucide-icon>
          Novo Agendamento
        </button>
      </div>

      <!-- WAITING LIST MOCK (Will connect to appointments DB later) -->
      <div class="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm min-h-[400px]">
         <div class="flex justify-between items-center mb-8">
           <h3 class="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
             <lucide-icon [img]="Clock" [size]="16"></lucide-icon> 
             Fila de Espera (Hoje)
           </h3>
           <div class="flex gap-2">
             <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase">Agendados: 0</span>
             <span class="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase">Aguardando: 0</span>
           </div>
         </div>
         
         @if (isLoading()) {
            <div class="animate-pulse space-y-4">
               <div class="h-20 w-full bg-slate-50 border border-slate-100 rounded-2xl"></div>
               <div class="h-20 w-full bg-slate-50 border border-slate-100 rounded-2xl"></div>
            </div>
         } @else {
            <div class="flex flex-col items-center justify-center text-center h-48 opacity-60">
              <lucide-icon [img]="CheckCircle" [size]="48" class="text-slate-300 mb-4"></lucide-icon>
              <h3 class="text-lg font-bold text-slate-700">Nenhum paciente na fila</h3>
              <p class="text-sm font-medium text-slate-500 max-w-sm mt-1">
                 Os pacientes com status "Aguardando" aparecerão aqui.
              </p>
            </div>
         }
      </div>

    </div>
  `
})
export class ReceptionComponent implements OnInit {
  private dialog = inject(Dialog);
  private context = inject(ClinicContextService);
  
  readonly Plus = Plus;
  readonly Calendar = Calendar;
  readonly Clock = Clock;
  readonly CheckCircle = CheckCircle;

  isLoading = signal(false);

  ngOnInit() {
    // Fica o stub preparatório para a query real usando This.context.selectedClinicId()
  }

  openNewAppointmentModal() {
    const dialogRef = this.dialog.open(AppointmentModalComponent, {
      minWidth: '600px',
      panelClass: ['bg-transparent'],
      backdropClass: ['bg-slate-900/60', 'backdrop-blur-sm'] 
    });
  }
}