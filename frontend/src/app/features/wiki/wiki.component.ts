import { Component, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { IamService } from '../../core/services/iam.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-wiki',
  standalone: true,
  template: `
    <div class="h-full flex items-center justify-center p-8 text-center">
      @if (error()) {
        <div class="bg-rose-50 border border-rose-200 text-rose-600 p-6 rounded-xl shadow-sm max-w-md w-full">
          <h2 class="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p class="text-sm">{{ error() }}</p>
        </div>
      } @else {
        <div class="text-slate-500 font-medium">Autenticando acesso à Wiki de Desenvolvimento...</div>
      }
    </div>
  `
})
export class WikiComponent {
  private router = inject(Router);
  private iam = inject(IamService);
  private auth = inject(AuthService);
  
  error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      const initialized = this.iam.isInitialized();

      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      if (!initialized) return;

      if (this.iam.can('clinics.manage') || this.iam.can('ai.use')) {
        window.location.replace('/wiki/');
      } else {
        this.error.set('Sua conta não possui privilégios arquiteturais ou autorização para visualizar a documentação interna.');
      }
    }, { allowSignalWrites: true });
  }
}
