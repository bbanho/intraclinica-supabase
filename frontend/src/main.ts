import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app/app.routes';
import { importProvidersFrom, provideZonelessChangeDetection, isDevMode } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { MarkdownModule } from 'ngx-markdown';
import { Buffer } from 'buffer';

// NgRx
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { authReducer } from './app/core/store/auth/auth.reducer';
import { AuthEffects } from './app/core/store/auth/auth.effects';
import { patientReducer, PATIENT_FEATURE_KEY } from './app/core/store/patient/patient.reducer';
import { PatientEffects } from './app/core/store/patient/patient.effects';

// Polyfill Buffer
(window as any).Buffer = Buffer;

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
    importProvidersFrom(MarkdownModule.forRoot()),
    // NgRx Store Setup
    provideStore({ 
      auth: authReducer,
      [PATIENT_FEATURE_KEY]: patientReducer 
    }),
    provideEffects([AuthEffects, PatientEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() })
  ]
}).catch(err => console.error(err));