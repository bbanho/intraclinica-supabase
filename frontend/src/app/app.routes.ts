import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout.component';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
// Imports removed as NgRx is not used for Inventory anymore

export const routes: Routes = [
  { 
    path: 'login', 
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) 
  },
  { 
    path: '', 
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'inventory', pathMatch: 'full' },
      { 
        path: 'inventory', 
        loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent)
      },
      {
        path: 'procedures',
        loadComponent: () => import('./features/procedures/procedure-recipe.component').then(m => m.ProcedureRecipeComponent)
      },
      {
        path: 'pacientes',
        loadChildren: () => import('./features/patients/patients.routes').then(r => r.PATIENT_ROUTES)
      },
      {
        path: 'consultas',
        loadChildren: () => import('./features/appointments/appointments.routes').then(r => r.APPOINTMENT_ROUTES)
      },
      { 
        path: 'reception', 
        loadComponent: () => import('./features/reception/reception.component').then(m => m.ReceptionComponent) 
      },
      { 
        path: 'clinical', 
        loadComponent: () => import('./features/clinical/clinical-execution.component').then(m => m.ClinicalExecutionComponent) 
      },
      { 
        path: 'clinical-execution', 
        loadComponent: () => import('./features/clinical/clinical-execution.component').then(m => m.ClinicalExecutionComponent) 
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
        path: 'admin', 
        loadComponent: () => import('./features/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent) 
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
