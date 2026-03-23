import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  // Garantimos que pegamos a sessão atual direto do Supabase pra evitar bugs de F5
  const { data: { session } } = await auth.supabaseClient.auth.getSession();

  if (!session) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};