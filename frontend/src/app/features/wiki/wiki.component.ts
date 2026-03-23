import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';

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
export class WikiComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private db = inject(SupabaseService).clientInstance;
  
  error = signal<string | null>(null);

  async ngOnInit() {
    const user = this.auth.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // Verifica a Role do usuário para liberar a documentação (Dev/Architecture)
    // Permite SUPER_ADMIN ou usuários com tag de suporte/dev (ajuste as roles conforme necessário)
    const { data } = await this.db.from('app_user').select('role').eq('id', user.id).single();
    
    if (data?.role === 'SUPER_ADMIN' || data?.role === 'SUPPORT') {
      window.location.href = '/wiki/';
    } else {
      this.error.set('Sua conta não possui privilégios de IAM (Super Admin, Suporte) para visualizar a documentação interna e de arquitetura do sistema.');
    }
  }
}
