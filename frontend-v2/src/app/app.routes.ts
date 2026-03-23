import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'reception',
    canActivate: [authGuard],
    loadComponent: () => import('./features/reception/reception.component').then(m => m.ReceptionComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent)
  }
];
