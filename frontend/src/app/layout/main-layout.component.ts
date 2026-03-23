import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ClinicContextService } from '../core/services/clinic-context.service';
import { SupabaseService } from '../core/services/supabase.service';
import { IamService } from '../core/services/iam.service';
import { LucideAngularModule, LayoutDashboard, Users, Calendar, Box, LogOut, Building2, ShieldAlert, Menu, X, Stethoscope, BookOpen } from 'lucide-angular';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <div class="h-screen w-full flex bg-slate-50 overflow-hidden text-slate-800 relative">
      
      <!-- MOBILE OVERLAY BACKDROP -->
      @if (isMobileMenuOpen()) {
        <div 
          (click)="isMobileMenuOpen.set(false)" 
          class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
        ></div>
      }

      <!-- SIDEBAR (Collapsible on Mobile/Tablet) -->
      <aside 
        class="fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out z-50 flex flex-col h-full bg-slate-900 text-white w-72 lg:w-64 lg:static lg:translate-x-0 shadow-2xl lg:shadow-none"
        [class.-translate-x-full]="!isMobileMenuOpen()"
        [class.translate-x-0]="isMobileMenuOpen()"
      >
        
        <!-- Brand & Close Button (Mobile) -->
        <div class="p-6 shrink-0 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <lucide-icon [img]="Building2" [size]="20" class="text-white"></lucide-icon>
            </div>
            <div>
              <h2 class="text-xl font-black tracking-tight">IntraClinica</h2>
              <p class="text-[10px] font-bold text-teal-400 tracking-widest uppercase">Workspace</p>
            </div>
          </div>
          <!-- Close button only visible on mobile -->
          <button (click)="isMobileMenuOpen.set(false)" class="lg:hidden text-slate-400 hover:text-white p-2 -mr-2">
            <lucide-icon [img]="X" [size]="24"></lucide-icon>
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          
          <!-- SUPER ADMIN / CLOUD CONSOLE EXCLUSIVE MENU -->
          @if (iam.can('clinics.manage') || iam.can('users.manage')) {
            <div class="mb-6">
              <p class="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Painel Global</p>
              <a routerLink="/admin" routerLinkActive="bg-teal-600 text-white" (click)="closeMobileMenu()" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium group">
                <lucide-icon [img]="ShieldAlert" [size]="20" class="text-slate-400 group-hover:text-white transition-colors"></lucide-icon>
                Governança IAM
              </a>
            </div>
          }

          <p class="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Módulos da Clínica</p>
          
          @if (iam.can('appointments.read')) {
            <a routerLink="/reception" routerLinkActive="bg-teal-600 text-white" (click)="closeMobileMenu()" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium group">
              <lucide-icon [img]="Calendar" [size]="20" class="text-slate-400 group-[.bg-teal-600]:text-white transition-colors"></lucide-icon>
              Recepção
            </a>
          }
          
          @if (iam.can('patients.read_demographics')) {
            <a routerLink="/patients" routerLinkActive="bg-teal-600 text-white" (click)="closeMobileMenu()" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium group">
              <lucide-icon [img]="Users" [size]="20" class="text-slate-400 group-[.bg-teal-600]:text-white transition-colors"></lucide-icon>
              Pacientes
            </a>
          }
          
          @if (iam.can('inventory.read')) {
            <a routerLink="/inventory" routerLinkActive="bg-teal-600 text-white" (click)="closeMobileMenu()" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium group">
              <lucide-icon [img]="Box" [size]="20" class="text-slate-400 group-[.bg-teal-600]:text-white transition-colors"></lucide-icon>
              Estoque
            </a>
          }
          
          @if (iam.can('clinical.read_records')) {
            <a routerLink="/clinical" routerLinkActive="bg-teal-600 text-white" (click)="closeMobileMenu()" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium group">
              <lucide-icon [img]="Stethoscope" [size]="20" class="text-slate-400 group-[.bg-teal-600]:text-white transition-colors"></lucide-icon>
              Prontuário
            </a>
          }

          @if (iam.can('ai.use')) {
            <a routerLink="/wiki" routerLinkActive="bg-teal-600 text-white" (click)="closeMobileMenu()" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium group">
              <lucide-icon [img]="BookOpen" [size]="20" class="text-slate-400 group-[.bg-teal-600]:text-white transition-colors"></lucide-icon>
              Wiki
            </a>
          }

        </nav>

        <!-- User Footer -->
        <div class="p-4 shrink-0 border-t border-slate-800">
          <div class="bg-white/5 rounded-2xl p-4 flex items-center justify-between">
            <div class="truncate pr-2">
              <p class="text-xs font-bold text-white truncate">{{ auth.currentUser()?.email }}</p>
              <p class="text-[10px] text-slate-400 truncate">
                @if (iam.can('clinics.manage')) { <span class="text-teal-400">ADMIN</span> } @else { Membro }
              </p>
            </div>
            <button (click)="logout()" class="p-3 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors" title="Sair do sistema">
              <lucide-icon [img]="LogOut" [size]="20"></lucide-icon>
            </button>
          </div>
        </div>
        
      </aside>

      <!-- MAIN CONTENT AREA -->
      <main class="flex-1 flex flex-col h-full min-w-0 relative">
        
        <!-- RESPONSIVE HEADER -->
        <header class="h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 shadow-sm lg:shadow-none">
           <div class="flex items-center gap-3">
             <!-- Hamburger Menu (Mobile/Tablet) -->
             <button (click)="isMobileMenuOpen.set(true)" class="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
               <lucide-icon [img]="Menu" [size]="24"></lucide-icon>
             </button>
             <h2 class="text-lg lg:text-xl font-bold text-slate-800 hidden sm:block">Workspace</h2>
           </div>
           
           <div class="flex items-center gap-2 lg:gap-4 flex-1 sm:flex-none justify-end">
             <label class="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:block">Contexto Atual:</label>
             <select 
                class="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 py-2.5 px-3 lg:px-4 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-64"
                [disabled]="!iam.can('clinics.manage') && !iam.can('users.manage')"
                (change)="onContextChange($any($event.target).value)"
             >
                 @if (iam.can('clinics.manage')) { <option value="all">[ Global SaaS View ]</option> }
                <!-- Loop real coming from Supabase -->
                @for (clinic of myClinics(); track clinic.id) {
                  <option [value]="clinic.id" [selected]="context.selectedClinicId() === clinic.id">{{ clinic.name }}</option>
                }
             </select>
           </div>
        </header>

        <!-- ROUTER OUTLET (The Views) -->
        <div class="flex-1 overflow-y-auto relative bg-slate-50">
           <router-outlet></router-outlet>
        </div>
      </main>

    </div>
  `
})
export class MainLayoutComponent implements OnInit {
  auth = inject(AuthService);
  context = inject(ClinicContextService);
  iam = inject(IamService);
  private db = inject(SupabaseService).clientInstance;

  myClinics = signal<any[]>([]);
  isMobileMenuOpen = signal(false);

  // Icons
  readonly LayoutDashboard = LayoutDashboard;
  readonly Users = Users;
  readonly Calendar = Calendar;
  readonly Box = Box;
  readonly LogOut = LogOut;
  readonly Building2 = Building2;
  readonly ShieldAlert = ShieldAlert;
  readonly Menu = Menu;
  readonly X = X;
  readonly Stethoscope = Stethoscope;
  readonly BookOpen = BookOpen;

  ngOnInit() {
    this.loadClinics();
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  async loadClinics() {
    const user = this.auth.currentUser();
    if (!user) return;

    // Busca quais clínicas o usuário tem acesso lendo as chaves do iam_bindings
    const { data: userData } = await this.db.from('app_user').select('iam_bindings').eq('id', user.id).single();
    if (userData?.iam_bindings) {
      const allowedClinicIds = Object.keys(userData.iam_bindings).filter(k => k !== 'global');
      
      if (allowedClinicIds.length > 0) {
        const { data } = await this.db.from('clinic').select('id, name').in('id', allowedClinicIds);
        if (data) {
          this.myClinics.set(data);
          // Auto-select a primeira clínica se não tiver contexto global
          if (!this.context.selectedClinicId() && !userData.iam_bindings['global']) {
            this.context.setContext(data[0].id);
          }
        }
      }
      
      // Se for super admin, seta o contexto pra all por default
      if (userData.iam_bindings['global'] && !this.context.selectedClinicId()) {
         this.context.setContext('all');
      }
    }
  }

  onContextChange(id: string) {
    this.context.setContext(id);
  }

  logout() {
    this.auth.signOut().then(() => {
      window.location.href = '/login';
    });
  }
}