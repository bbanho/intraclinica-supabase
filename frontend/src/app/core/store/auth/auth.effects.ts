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
