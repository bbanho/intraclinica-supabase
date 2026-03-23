import { Component, inject, signal, computed } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ClinicContextService } from '../core/services/clinic-context.service';
import { SupabaseService } from '../core/services/supabase.service';
import { IamService } from '../core/services/iam.service';
import { NotificationService } from '../core/services/notification.service';
import { UserIamBindings } from '../core/models/iam.types';
import { LucideAngularModule, LayoutDashboard, Users, Calendar, Box, LogOut, Building2, ShieldAlert, Menu, X, Stethoscope, BookOpen, Bell, Check, BarChart3 } from 'lucide-angular';
import { switchMap, from, of, tap } from 'rxjs';

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

          @if (iam.can('appointments.read')) {
            <a routerLink="/reports" routerLinkActive="bg-teal-600 text-white" (click)="closeMobileMenu()" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium group">
              <lucide-icon [img]="BarChart3" [size]="20" class="text-slate-400 group-[.bg-teal-600]:text-white transition-colors"></lucide-icon>
              Relatórios
            </a>
          }

          @if (iam.can('ai.use')) {
            <a routerLink="/wiki" routerLinkActive="bg-teal-600 text-white" (click)="closeMobileMenu()" class="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium group">
              <lucide-icon [img]="BookOpen" [size]="20" class="text-slate-400 group-[.bg-teal-600]:text-white transition-colors"></lucide-icon>
              Wiki
            </a>
          }

          @if (!hasAnyModuleAccess()) {
            <div class="mt-4 p-5 rounded-2xl border-2 border-dashed border-slate-700/50 bg-slate-800/20 flex flex-col items-center justify-center text-center gap-3">
              <div class="p-3 bg-slate-800/80 rounded-full shadow-inner">
                <lucide-icon [img]="ShieldAlert" [size]="24" class="text-slate-500"></lucide-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-300">Acesso Restrito</h3>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">Você ainda não possui módulos habilitados.</p>
              </div>
            </div>
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
             
             <!-- NOTIFICATION CENTER -->
             <div class="relative flex items-center">
               <button 
                 (click)="showNotifications.set(!showNotifications())" 
                 class="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all relative"
               >
                 <lucide-icon [img]="Bell" [size]="20"></lucide-icon>
                 @if (notifications.pendingRequests().length > 0) {
                   <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                 }
               </button>

               @if (showNotifications()) {
                 <div class="absolute right-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                   <div class="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                     <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Notificações</span>
                     <span class="text-[10px] font-bold text-teal-600">{{ notifications.pendingRequests().length }} Pendentes</span>
                   </div>
                   <div class="max-h-96 overflow-y-auto">
                     @if (notifications.pendingRequests().length === 0) {
                       <div class="p-8 text-center text-slate-300">
                         <p class="text-xs font-medium">Nenhuma notificação.</p>
                       </div>
                     }
                     @for (req of notifications.pendingRequests(); track req.id) {
                       <div class="p-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                         <div class="flex gap-3 items-start mb-3">
                           <div class="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                             <lucide-icon [img]="ShieldAlert" [size]="16"></lucide-icon>
                           </div>
                           <div class="flex-1 min-w-0">
                             <p class="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                               <span class="font-bold text-indigo-600">{{req.requesterName}}</span> solicitou acesso a <span class="font-bold text-slate-700">{{req.clinicName}}</span>.
                             </p>
                             <p class="text-[9px] italic text-slate-400 mt-1">"{{req.reason}}"</p>
                           </div>
                         </div>
                         <div class="flex gap-2">
                           <button (click)="approveAccess(req.id)" class="flex-1 py-1.5 bg-teal-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-teal-700 transition-all flex items-center justify-center gap-1">
                             <lucide-icon [img]="Check" [size]="12"></lucide-icon> Aprovar
                           </button>
                           <button (click)="denyAccess(req.id)" class="px-3 py-1.5 border border-slate-200 text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center">
                             <lucide-icon [img]="X" [size]="12"></lucide-icon>
                           </button>
                         </div>
                       </div>
                     }
                   </div>
                 </div>
               }
             </div>

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
export class MainLayoutComponent {
  auth = inject(AuthService);
  context = inject(ClinicContextService);
  iam = inject(IamService);
  notifications = inject(NotificationService);
  private db = inject(SupabaseService).clientInstance;

  isMobileMenuOpen = signal(false);
  showNotifications = signal(false);

  hasAnyModuleAccess = computed(() => Object.keys(this.iam.userBindings() || {}).length > 0);

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
  readonly Bell = Bell;
  readonly Check = Check;
  readonly BarChart3 = BarChart3;

  // Race-condition safe (RxJS SwitchMap cancels outdated pending async queries)
  myClinics = toSignal(
    toObservable(this.iam.userBindings).pipe(
      switchMap(bindings => {
        if (!bindings) return of([]);

        const allowedClinicIds = Object.keys(bindings).filter(k => k !== 'global' && k !== 'all');
        
        if (allowedClinicIds.length > 0) {
          return from(
            this.db.from('clinic').select('id, name').in('id', allowedClinicIds)
          ).pipe(
            switchMap(({ data, error }) => {
               if (error) {
                 console.error('[MainLayout] Falha ao carregar clínicas:', error);
                 return of([]);
               }

               // Auto-select a primeira clínica se não tiver contexto global
               if (data && data.length > 0 && !this.context.selectedClinicId() && !bindings['global']) {
                 this.context.setContext(data[0].id);
               }

               // Se tiver poderes globais, seta o contexto para 'all' por default
               if (bindings['global'] && !this.context.selectedClinicId()) {
                 this.context.setContext('all');
               }

               return of(data || []);
            })
          );
        }
        
        return of([]);
      })
    ),
    { initialValue: [] as {id: string, name: string}[] }
  );

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  approveAccess(id: string) {
    this.notifications.approveRequest(id);
    this.showNotifications.set(false);
  }

  denyAccess(id: string) {
    this.notifications.denyRequest(id);
    this.showNotifications.set(false);
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