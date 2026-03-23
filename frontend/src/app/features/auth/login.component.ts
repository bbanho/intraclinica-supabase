import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Mail, Lock, LogIn, Hospital } from 'lucide-angular';
import { AuthStore } from '../../core/store/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex">
      <!-- Left Side (Form) -->
      <div class="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 bg-white relative z-10 shadow-2xl shadow-slate-200/50">
        <div class="w-full max-w-sm mx-auto">
          
          <div class="mb-10 flex items-center gap-3">
            <div class="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-200">
              <lucide-icon [img]="Hospital" [size]="24"></lucide-icon>
            </div>
            <div>
              <h1 class="text-2xl font-black text-slate-800 tracking-tight">IntraClinica</h1>
              <p class="text-xs font-bold text-teal-600 uppercase tracking-widest">Workspace v2</p>
            </div>
          </div>

          <h2 class="text-3xl font-extrabold text-slate-900 mb-2">Bem-vindo(a)</h2>
          <p class="text-slate-500 mb-8 font-medium">Faça login para gerenciar sua clínica.</p>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
            
            <!-- Error State -->
            @if (errorMessage()) {
              <div class="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                {{ errorMessage() }}
              </div>
            }

            <div class="space-y-2">
              <label for="email" class="block text-sm font-bold text-slate-700">Email</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <lucide-icon [img]="Mail" [size]="20"></lucide-icon>
                </div>
                <input 
                  id="email" 
                  type="email" 
                  formControlName="email"
                  placeholder="voce@clinica.com"
                  class="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border-0 text-slate-900 rounded-2xl ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm font-medium transition-all"
                  [class.ring-red-300]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                >
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label for="password" class="block text-sm font-bold text-slate-700">Senha</label>
                <a href="#" class="text-sm font-bold text-teal-600 hover:text-teal-500">Esqueceu?</a>
              </div>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <lucide-icon [img]="Lock" [size]="20"></lucide-icon>
                </div>
                <input 
                  id="password" 
                  type="password" 
                  formControlName="password"
                  placeholder="••••••••"
                  class="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border-0 text-slate-900 rounded-2xl ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm font-medium transition-all"
                  [class.ring-red-300]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                >
              </div>
            </div>

            <button 
              type="submit" 
              [disabled]="loginForm.invalid || isLoading()"
              class="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-2xl shadow-xl shadow-teal-600/20 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              @if (isLoading()) {
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Entrando...</span>
              } @else {
                <lucide-icon [img]="LogIn" [size]="20"></lucide-icon>
                <span>Entrar na Plataforma</span>
              }
            </button>
          </form>
        </div>
      </div>

      <!-- Right Side (Visual) -->
      <div class="hidden lg:flex flex-1 relative bg-slate-900 items-center justify-center overflow-hidden">
        <!-- Abstract Decoration -->
        <div class="absolute inset-0 bg-gradient-to-br from-teal-900 to-slate-900 opacity-90"></div>
        
        <div class="absolute -top-24 -right-24 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div class="relative z-10 p-12 max-w-lg text-center">
          <div class="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
            <lucide-icon [img]="Hospital" [size]="48" class="text-teal-400 mx-auto mb-6"></lucide-icon>
            <h3 class="text-3xl font-bold text-white mb-4">A evolução da gestão clínica</h3>
            <p class="text-teal-100/80 font-medium leading-relaxed">
              Sistema moderno, ultrarrápido e pensado para o conforto e eficiência dos profissionais de saúde.
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  readonly Mail = Mail;
  readonly Lock = Lock;
  readonly LogIn = LogIn;
  readonly Hospital = Hospital;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authStore = inject(AuthStore);

  isLoading = this.authStore.isLoading;
  errorMessage = this.authStore.error;

  loginForm = this.fb.group({
    email: ['bmbanho@gmail.com', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    try {
      const { email, password } = this.loginForm.value;
      if (!email || !password) return;

      await this.authStore.login(email, password);
      
      // Sucesso: Vai para a Recepção
      this.router.navigate(['/reception']);
    } catch (err: any) {
      console.error('Login error:', err);
    }
  }
}
