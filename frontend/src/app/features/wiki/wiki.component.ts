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

    const { data } = await this.db.from('app_user').select('role, iam_bindings').eq('id', user.id).single();
    
    // IAM Principle: 1. Role (Package) -> 2. Grants (Cherry-picked) -> 3. Blocks
    const isSuperAdmin = data?.role === 'SUPER_ADMIN';
    const hasSupportRole = data?.role === 'SUPPORT';
    // Access cherry-picked grant: {"global": ["VIEW_WIKI"]}
    const hasWikiGrant = data?.iam_bindings?.['global']?.includes('VIEW_WIKI');

    if (isSuperAdmin || hasSupportRole || hasWikiGrant) {
      window.location.href = '/wiki/';
    } else {
      this.error.set('Sua conta não possui privilégios de IAM para visualizar a documentação interna.');
    }
  }
}
