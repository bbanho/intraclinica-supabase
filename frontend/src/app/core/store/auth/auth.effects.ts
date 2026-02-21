import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { SupabaseService } from '../../services/supabase.service';
import { DatabaseService } from '../../services/database.service'; // Temporário até migrarmos tudo
import * as AuthActions from './auth.actions';
import { catchError, map, switchMap, tap, from, of } from 'rxjs';
import { Router } from '@angular/router';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  
  // Efeito temporário que delega para o DatabaseService existente para manter compatibilidade
  // durante a migração, mas estrutura o fluxo via NgRx
  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ email, password }) =>
        from(this.supabase.auth.signInWithPassword({ email, password })).pipe(
          map(({ data, error }) => {
            if (error) return AuthActions.loginFailure({ error: error.message });
            // Aqui deveríamos carregar o perfil completo
            return AuthActions.loadSession(); 
          }),
          catchError((error) => of(AuthActions.loginFailure({ error: error.message })))
        )
      )
    )
  );

  loadSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loadSession),
      switchMap(() =>
        from(this.supabase.auth.getUser()).pipe(
          map(({ data: { user }, error }) => {
            if (error || !user) {
              return AuthActions.loginFailure({ error: error?.message || 'No user found' });
            }
            // Mapear User do Supabase para UserProfile da aplicação
            const profile = { 
              id: user.id, 
              email: user.email!, 
              name: user.user_metadata['name'] || 'User',
              role: user.app_metadata['role'] || 'user',
              avatar: null,
              clinicId: user.user_metadata['clinic_id'] || 'default' // Fallback para passar no build
            };
            return AuthActions.loginSuccess({ user: profile });
          }),
          catchError((error) => of(AuthActions.loginFailure({ error: error.message })))
        )
      )
    )
  );

  loginSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSuccess),
      tap(() => this.router.navigate(['/']))
    ),
    { dispatch: false }
  );
  
  logout$ = createEffect(() => 
    this.actions$.pipe(
        ofType(AuthActions.logout),
        tap(() => {
            this.supabase.auth.signOut();
            this.router.navigate(['/login']);
        })
    ),
    { dispatch: false }
  );
}
