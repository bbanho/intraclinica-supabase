import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { LucideAngularModule, Plus, Calendar, User, Building } from 'lucide-angular';
import { AppointmentModalComponent } from './appointment-modal/appointment-modal.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reception',
  standalone: true,
  imports: [CommonModule, DialogModule, LucideAngularModule],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8">
      
      <!-- GLOBAL HEADER (User Context from Backend) -->
      <div class="flex justify-between items-center bg-slate-900 text-white p-4 rounded-3xl shadow-sm mb-8">
        <div class="flex items-center gap-3">
           <div class="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
              <lucide-icon [img]="User" [size]="20"></lucide-icon>
           </div>
           <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-teal-400">Usuário Autenticado</p>
              <p class="font-bold text-sm">{{ userEmail() }}</p>
           </div>
        </div>
        <button (click)="logout()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">
          Sair
        </button>
      </div>

      <!-- MAIN CARD -->
      <div class="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <lucide-icon [img]="Calendar" [size]="28"></lucide-icon>
          </div>
          <div>
            <h1 class="text-2xl font-black text-slate-800 tracking-tight uppercase">Recepção</h1>
            <p class="text-sm font-medium text-slate-500">Gestão de fluxo e agendamentos</p>
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

      <!-- DATABASE CONSUMPTION MOCK (Clinics) -->
      <div class="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
         <h3 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
           <lucide-icon [img]="Building" [size]="16"></lucide-icon> 
           Clínicas Disponíveis (Teste de Banco de Dados)
         </h3>
         
         @if (isLoadingData()) {
            <div class="animate-pulse flex gap-4">
               <div class="h-12 w-full bg-slate-100 rounded-xl"></div>
            </div>
         } @else {
            <div class="grid gap-4">
              @for (clinic of clinics(); track clinic.id) {
                 <div class="p-4 border border-slate-100 rounded-2xl flex justify-between items-center bg-slate-50">
                    <div>
                      <p class="font-bold text-slate-800">{{ clinic.name }}</p>
                      <p class="text-xs text-slate-400">ID: {{ clinic.id }}</p>
                    </div>
                    <span class="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-bold uppercase">Ativa</span>
                 </div>
              } @empty {
                 <p class="text-slate-500 text-sm font-medium">Nenhuma clínica retornada pelo banco. (RLS bloqueando ou vazio)</p>
              }
            </div>
         }
      </div>

    </div>
  `
})
export class ReceptionComponent implements OnInit {
  private dialog = inject(Dialog);
  private authService = inject(AuthService);
  
  readonly Plus = Plus;
  readonly Calendar = Calendar;
  readonly User = User;
  readonly Building = Building;

  // Expondo os dados da auth de verdade
  userEmail = computed(() => this.authService.currentUser()?.email || 'Desconhecido');
  
  // Estado pra testarmos a consulta
  clinics = signal<any[]>([]);
  isLoadingData = signal(true);

  ngOnInit() {
    this.fetchData();
  }

  async fetchData() {
    this.isLoadingData.set(true);
    try {
       // Consumindo o banco REAL do Supabase para provar que o login com RLS tá on
       const { data, error } = await this.authService.supabaseClient.from('clinic').select('*');
       if (error) throw error;
       this.clinics.set(data || []);
    } catch (e) {
       console.error("Erro consultando Supabase:", e);
    } finally {
       this.isLoadingData.set(false);
    }
  }

  logout() {
    this.authService.signOut();
    window.location.href = '/login'; // hard redirect limpa a memoria e garante estado isolado
  }

  openNewAppointmentModal() {
    const dialogRef = this.dialog.open(AppointmentModalComponent, {
      minWidth: '600px',
      panelClass: ['bg-transparent'],
      backdropClass: ['bg-slate-900/60', 'backdrop-blur-sm'] 
    });
  }
}
