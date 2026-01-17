import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout.component';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { inventoryReducer } from './features/inventory/store/inventory.reducer';
import { InventoryEffects } from './features/inventory/store/inventory.effects';

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
        loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent),
        providers: [
          provideState({ name: 'inventory', reducer: inventoryReducer }),
          provideEffects([InventoryEffects])
        ]
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
        path: 'admin', 
        loadComponent: () => import('./features/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent) 
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
