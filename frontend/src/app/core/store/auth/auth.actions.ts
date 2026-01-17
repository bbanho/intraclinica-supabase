import { createAction, props } from '@ngrx/store';
import { UserProfile } from '../../models/types';

export const login = createAction('[Auth] Login', props<{ email: string; password: string }>());
export const loginSuccess = createAction('[Auth] Login Success', props<{ user: UserProfile }>());
export const loginFailure = createAction('[Auth] Login Failure', props<{ error: string }>());
export const logout = createAction('[Auth] Logout');
export const loadSession = createAction('[Auth] Load Session');
