import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientStore } from '../../core/store/patient.store';
import { DatabaseService } from '../../core/services/database.service';
import { LucideAngularModule, Users, UserPlus, Search, Loader2 } from 'lucide-angular';

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="p-6 space-y-6 animate-fade-in">
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <lucide-icon [img]="Users" [size]="24" class="text-indigo-600"></lucide-icon>
          Pacientes
        </h2>
        <button (click)="showAddModal.set(true)" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100">
          <lucide-icon [img]="UserPlus" [size]="16"></lucide-icon> Novo Paciente
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="flex gap-4">
        <div class="flex-1 bg-white border border-slate-200 rounded-xl flex items-center px-4 py-2 shadow-sm">
          <lucide-icon [img]="Search" [size]="16" class="text-slate-400 mr-2"></lucide-icon>
          <input type="text" placeholder="Buscar por nome, CPF ou telefone..." class="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700 placeholder-slate-400">
        </div>
      </div>

      <!-- List -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        @if (store.loading() && store.patientCount() === 0) {
          <div class="p-12 flex justify-center items-center text-indigo-600">
            <lucide-icon [img]="Loader2" [size]="32" class="animate-spin"></lucide-icon>
          </div>
        } @else {
          <table class="w-full text-left">
            <thead class="bg-slate-50 border-b border-slate-100">
              <tr>
                <th class="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome</th>
                <th class="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Contato</th>
                <th class="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cadastro</th>
                <th class="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (patient of store.patients(); track patient.id) {
                <tr class="hover:bg-slate-50/50 transition-colors group">
                  <td class="p-4">
                    <div class="font-bold text-slate-700 text-sm">{{patient.name}}</div>
                    <div class="text-xs text-slate-400 font-medium">CPF: {{patient.cpf || 'N/D'}}</div>
                  </td>
                  <td class="p-4">
                    <div class="text-xs font-bold text-slate-600">{{patient.phone || 'N/D'}}</div>
                    <div class="text-[10px] text-slate-400 font-medium">{{patient.email}}</div>
                  </td>
                  <td class="p-4 text-xs font-medium text-slate-500">
                    {{patient.createdAt | date:'shortDate'}}
                  </td>
                  <td class="p-4 text-right">
                    <button class="text-indigo-600 font-bold text-xs uppercase hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Ver Prontuário</button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Nenhum paciente cadastrado nesta unidade.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    <!-- Simple Add Modal (Inline for now) -->
    @if (showAddModal()) {
      <div class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div class="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 class="font-black text-slate-800 uppercase tracking-tight">Novo Paciente</h3>
            <button (click)="showAddModal.set(false)" class="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Nome Completo</label>
              <input [(ngModel)]="newPatient.name" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">CPF</label>
                <input [(ngModel)]="newPatient.cpf" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors">
              </div>
              <div>
                <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Telefone</label>
                <input [(ngModel)]="newPatient.phone" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors">
              </div>
            </div>
          </div>
          <div class="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button (click)="showAddModal.set(false)" class="px-4 py-2 text-slate-500 font-bold text-xs uppercase hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button (click)="savePatient()" [disabled]="!newPatient.name || isSaving()" class="px-6 py-2 bg-indigo-600 text-white font-black text-xs uppercase rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2">
              @if (isSaving()) { <lucide-icon [img]="Loader2" [size]="14" class="animate-spin"></lucide-icon> }
              Salvar
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    .animate-scale-in { animation: scaleIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class PatientsListComponent {
  store = inject(PatientStore);
  db = inject(DatabaseService);

  // Icons
  Users = Users; UserPlus = UserPlus; Search = Search; Loader2 = Loader2;

  showAddModal = signal(false);
  isSaving = signal(false);
  
  newPatient = {
    name: '',
    cpf: '',
    phone: '',
    email: ''
  };

  constructor() {
    effect(() => {
      const clinicId = this.db.selectedContextClinic();
      // 'all' is SUPER_ADMIN global sentinel — not a valid clinic UUID
      if (clinicId && clinicId !== 'all') {
        this.store.loadPatients(clinicId);
      }
    });
  }

  savePatient() {
    if (!this.newPatient.name) return;
    
    const clinicId = this.db.selectedContextClinic();
    if (!clinicId || clinicId === 'all') return;

    this.isSaving.set(true);
    this.store.createPatient({
      ...this.newPatient,
      clinicId
    });
    
    // Optimistic close (store handles errors via toast ideally, here simple)
    setTimeout(() => {
        this.isSaving.set(false);
        this.showAddModal.set(false);
        this.newPatient = { name: '', cpf: '', phone: '', email: '' };
    }, 1000); // Fake delay for UX, store is async
  }
}
