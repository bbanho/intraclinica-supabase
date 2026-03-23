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
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'reception',
        loadComponent: () => import('./features/reception/reception.component').then(m => m.ReceptionComponent)
      },
      {
        path: 'admin',
        loadComponent: () => import('./features/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent)
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent)
      },
      {
        path: 'patients',
        loadComponent: () => import('./features/patients/patients.component').then(m => m.PatientsComponent)
      },
      {
        path: 'clinical',
        loadComponent: () => import('./features/clinical/clinical.component').then(m => m.ClinicalComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'social',
        loadComponent: () => import('./features/social/social.component').then(m => m.SocialComponent)
      },
      {
        path: 'wiki',
        loadComponent: () => import('./features/wiki/wiki.component').then(m => m.WikiComponent)
      }
    ]
  }
];
