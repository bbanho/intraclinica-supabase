import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  // getSession() reads from localStorage — no network round-trip.
  // This is reliable even right after signInWithPassword resolves,
  // avoiding the race condition with onAuthStateChange.
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
