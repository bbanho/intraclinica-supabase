import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app/app.routes';
import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { MarkdownModule } from 'ngx-markdown';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './environments/firebase-config';
import { Buffer } from 'buffer';

// Polyfill Buffer
(window as any).Buffer = Buffer;

// Initialize Firebase
initializeApp(firebaseConfig);

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
    importProvidersFrom(MarkdownModule.forRoot())
  ]
}).catch(err => console.error(err));