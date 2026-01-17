import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { login } from '../../core/store/auth/auth.actions';
import { selectAuthLoading, selectAuthError } from '../../core/store/auth/auth.selectors';
import { UserProfile } from '../../core/models/types';
import {
  LucideAngularModule,
  Stethoscope,
  Lock,
  ShieldCheck,
  ClipboardList,
  Truck,
  Palette,
  Cpu,
  User,
  ArrowRight,
  AlertCircle,
  Loader2,
  Mail,
  History,
  Trash2,
  Briefcase,
  BookUser
} from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div
        class="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row border border-slate-200 animate-scale-in"
      >
        <!-- Lado Institucional -->
        <div
          class="bg-teal-600 md:w-2/5 p-12 flex flex-col justify-center text-white relative overflow-hidden"
        >
          <div
            class="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/medical-icons.png')]"
          ></div>
          <div class="relative z-10">
            <div
              class="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mb-8 shadow-inner animate-pulse"
            >
              <lucide-icon
                [img]="Stethoscope"
                [size]="48"
                class="text-white"
              ></lucide-icon>
            </div>
            <h1 class="text-4xl font-extrabold mb-3 tracking-tight">
              IntraClinica
            </h1>
            <p class="text-teal-100 mb-10 text-lg opacity-90">
              Sistema Integrado de Gestão Médica
            </p>

            <div class="space-y-4">
              <div
                class="flex items-center gap-3 text-sm text-teal-100 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/5"
              >
                <lucide-icon
                  [img]="Lock"
                  [size]="18"
                  class="text-teal-300"
                ></lucide-icon>
                <span>Supabase Authentication</span>
              </div>
              <div
                class="flex items-center gap-3 text-sm text-teal-100 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/5"
              >
                <lucide-icon
                  [img]="ShieldCheck"
                  [size]="18"
                  class="text-teal-300"
                ></lucide-icon>
                <span>Sessão Segura (RLS)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Lado do Login -->
        <div
          class="p-10 md:p-16 md:w-3/5 flex flex-col justify-center bg-white min-h-[600px]"
        >
          <div class="animate-fade-in">
            <!-- Usuários Recentes (Shortcut) -->
            @if (recentUsers().length > 0) {
            <div class="mb-10">
              <div class="flex items-center justify-between mb-4">
                <h3
                  class="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2"
                >
                  <lucide-icon [img]="History" [size]="12"></lucide-icon>
                  Acessos Recentes
                </h3>
                <button
                  (click)="clearRecent()"
                  class="text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <lucide-icon [img]="Trash2" [size]="14"></lucide-icon>
                </button>
              </div>
              <div class="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                @for (user of recentUsers(); track user.id) {
                <button
                  (click)="selectedUser.set(user)"
                  class="flex-shrink-0 group"
                >
                  <div
                    class="w-14 h-14 rounded-2xl bg-teal-50 border-2 border-teal-100 flex items-center justify-center text-teal-600 font-black text-xl group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600 transition-all shadow-sm"
                  >
                    {{ user.avatar || user.name.charAt(0) }}
                  </div>
                  <div
                    class="text-[10px] font-bold text-slate-500 mt-2 text-center group-hover:text-teal-700"
                  >
                    {{user.name.split(' ')[0]}}
                  </div>
                </button>
                }
              </div>
            </div>
            } @if (selectedUser()) {
            <div
              class="mb-8 p-4 bg-teal-50 rounded-2xl border border-teal-100 flex items-center justify-between animate-scale-in"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm"
                >
                  {{selectedUser()?.avatar || selectedUser()?.name?.charAt(0)}}
                </div>
                <div>
                  <p class="text-xs font-bold text-teal-900">
                    {{selectedUser()?.name}}
                  </p>
                  <p class="text-[10px] text-teal-600 font-medium">
                    {{selectedUser()?.email}}
                  </p>
                </div>
              </div>
              <button
                (click)="selectedUser.set(null);"
                class="text-teal-400 hover:text-teal-600"
              >
                <lucide-icon [img]="Trash2" [size]="16"></lucide-icon>
              </button>
            </div>
            }

            <h2 class="text-3xl font-bold text-slate-800 mb-2">
              Portal de Acesso
            </h2>
            <p class="text-slate-500 mb-8 font-medium">
              Identifique-se para entrar no sistema.
            </p>

            <form (submit)="onSubmit($event)" class="space-y-6">
              @if (!selectedUser()) {
              <div>
                <label
                  class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1"
                  >E-mail Profissional</label
                >
                <div class="relative group">
                  <lucide-icon
                    [img]="Mail"
                    class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors"
                    [size]="20"
                  ></lucide-icon>
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white transition-all text-slate-700"
                    [(ngModel)]="email"
                    name="email"
                  />
                </div>
              </div>
              }

              <div>
                <label
                  class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1"
                  >Senha de Acesso</label
                >
                <div class="relative group">
                  <lucide-icon
                    [img]="Lock"
                    class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors"
                    [size]="20"
                  ></lucide-icon>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white transition-all text-slate-700 tracking-widest"
                    [(ngModel)]="password"
                    name="password"
                  />
                </div>
                @if (error()) {
                <div
                  class="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm font-bold animate-shake"
                >
                  <lucide-icon [img]="AlertCircle" [size]="18"></lucide-icon>
                  {{ error() }}
                </div>
                }
              </div>

              <div class="space-y-3">
                  <button 
                    type="submit"
                    [disabled]="loading() || (!selectedUser() && !email.trim()) || !password.trim()"
                    class="w-full bg-teal-600 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-teal-700 transition-all shadow-xl shadow-teal-100 disabled:opacity-50 disabled:shadow-none active:scale-[0.98]"
                  >
                    @if (loading()) {
                      <lucide-icon [img]="Loader2" [size]="24" class="animate-spin"></lucide-icon> Autenticando...
                    } @else {
                      Acessar Sistema <lucide-icon [img]="ArrowRight" [size]="24"></lucide-icon>
                    }
                  </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .animate-scale-in { animation: scaleIn 0.3s ease-out; }
      .animate-fade-in { animation: fadeIn 0.4s ease-out; }
      @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      .animate-shake { animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
      @keyframes shake {
        10%, 90% { transform: translate3d(-1px, 0, 0); }
        20%, 80% { transform: translate3d(2px, 0, 0); }
        30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
        40%, 60% { transform: translate3d(4px, 0, 0); }
      }
    `,
  ],
})
export class LoginComponent implements OnInit {
  private store = inject(Store);
  
  selectedUser = signal<UserProfile | null>(null);
  recentUsers = signal<UserProfile[]>([]);

  email = '';
  password = '';

  // NgRx Signals
  loading = this.store.selectSignal(selectAuthLoading);
  error = this.store.selectSignal(selectAuthError);

  // Icons
  readonly Stethoscope = Stethoscope;
  readonly Lock = Lock;
  readonly ShieldCheck = ShieldCheck;
  readonly ClipboardList = ClipboardList;
  readonly Truck = Truck;
  readonly Palette = Palette;
  readonly Cpu = Cpu;
  readonly User = User;
  readonly ArrowRight = ArrowRight;
  readonly AlertCircle = AlertCircle;
  readonly Loader2 = Loader2;
  readonly Mail = Mail;
  readonly History = History;
  readonly Trash2 = Trash2;
  readonly Briefcase = Briefcase;
  readonly BookUser = BookUser;

  constructor() {
    effect(() => {
      const user = this.selectedUser();
      if (user) {
        this.email = user.email;
      } else {
        this.email = '';
      }
    });
  }

  ngOnInit() {
    this.loadRecentUsers();
  }

  loadRecentUsers() {
    const saved = localStorage.getItem('sc_recent_users');
    if (saved) {
      this.recentUsers.set(JSON.parse(saved));
    }
  }

  saveToRecent(user: UserProfile) {
    const current = this.recentUsers();
    // Avoid duplicates, limit to 5
    const updated = [user, ...current.filter((u) => u.id !== user.id)].slice(
      0,
      5
    );
    this.recentUsers.set(updated);
    localStorage.setItem('sc_recent_users', JSON.stringify(updated));
  }

  clearRecent() {
    this.recentUsers.set([]);
    localStorage.removeItem('sc_recent_users');
  }

  onSubmit(event: Event) {
    event.preventDefault();
    if (!this.email || !this.password) return;
    this.store.dispatch(login({ email: this.email, password: this.password }));
  }

  // Google login temporariamente desabilitado até implementação no NgRx/Supabase
  async onGoogleLogin() {
    alert("Login social em manutenção. Use e-mail e senha.");
  }
}
