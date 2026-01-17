import { createReducer, on } from '@ngrx/store';
import { UserProfile } from '../../models/types';
import * as AuthActions from './auth.actions';

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

export const authReducer = createReducer(
  initialState,
  on(AuthActions.login, (state) => ({ ...state, loading: true, error: null })),
  on(AuthActions.loginSuccess, (state, { user }) => ({ ...state, user, loading: false })),
  on(AuthActions.loginFailure, (state, { error }) => ({ ...state, error, loading: false })),
  on(AuthActions.logout, (state) => ({ ...state, user: null })),
  on(AuthActions.loadSession, (state) => ({ ...state, loading: true }))
);
