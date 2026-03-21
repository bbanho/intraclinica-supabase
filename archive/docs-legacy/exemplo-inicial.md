Aqui está **um único arquivo Markdown (`ALL_CODES.md`)** contendo **todos os blocos de código sugeridos** para o CRM Médico, organizados por áreas (Angular, Supabase, NestJS, CI/CD, Tests, etc.). Você pode copiar e colar diretamente no seu repositório.

---

# 📦 CRM Médico — Todos os Blocos de Código

---

## 🧾 1) README.md

```md
# CRM Médico - Monorepo

Estrutura inicial de código para CRM Médico usando **Angular + Supabase** e **NestJS (opcional)**.

## Pastas

- `angular/` → Frontend Angular
- `supabase/` → Scripts SQL / Supabase migrations
- `nestjs-api/` → API opcional com NestJS + Prisma
- `.github/workflows/ci.yml` → CI básica Angular

## Scripts úteis

No Angular:
```

cd angular/crm-medico
npm install
npm start

```

Supabase:
```

supabase login
supabase db reset
supabase db push

```

NestJS:
```

cd nestjs-api
npm install
npm run start:dev

```

## Deploy
- Angular → Vercel/Netlify
- Supabase → deploy pelo CLI
- NestJS → server ou serverless
```

---

## 📁 2) Angular — Angular CLI Project

### 2.1) package.json

```json
{
  "name": "crm-medico",
  "version": "0.0.1",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "test": "ng test",
    "lint": "ng lint"
  },
  "dependencies": {
    "@angular/animations": "~15.0.0",
    "@angular/common": "~15.0.0",
    "@angular/core": "~15.0.0",
    "@supabase/supabase-js": "^2.0.0"
  }
}
```

---

### 2.2) app-routing.module.ts

```ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'pacientes',
    loadChildren: () =>
      import('./features/pacientes/pacientes.module').then(m => m.PacientesModule)
  },
  {
    path: 'consultas',
    loadChildren: () =>
      import('./features/consultas/consultas.module').then(m => m.ConsultasModule)
  },
  { path: '', redirectTo: 'pacientes', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
```

---

### 2.3) supabase.service.ts

```ts
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async getPacientes() {
    return this.supabase.from('pacientes').select('*');
  }
}
```

---

### 2.4) Realtime Subscription

```ts
import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  subscribeConsultas(cb: any) {
    return this.supabase
      .channel('public:consultas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultas' },
         payload => cb(payload))
      .subscribe();
  }
}
```

---

## 🗄️ 3) Supabase — SQL Migration

```sql
create table pacientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_nascimento date,
  telefone text,
  email text,
  created_at timestamptz default now()
);

create table usuarios (
  id uuid references auth.users on delete cascade,
  nome text not null,
  papel text not null,
  created_at timestamptz default now(),
  primary key (id)
);

create table consultas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id),
  medico_id uuid references usuarios(id),
  data_hora timestamptz not null,
  status text not null default 'AGENDADA',
  created_at timestamptz default now()
);
```

---

### RLS (Row-Level Security)

```sql
alter table pacientes enable row level security;
```

---

## 🛠 4) NestJS API

### 4.1) package.json

```json
{
  "name": "nestjs-api",
  "version": "1.0.0",
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0"
  },
  "scripts": {
    "start:dev": "nest start --watch"
  }
}
```

---

### 4.2) app.module.ts

```ts
import { Module } from '@nestjs/common';
import { PacientesModule } from './pacientes/pacientes.module';

@Module({
  imports: [PacientesModule]
})
export class AppModule {}
```

---

### 4.3) pacientes.controller.ts

```ts
import { Controller, Get } from '@nestjs/common';
import { PacientesService } from './pacientes.service';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  @Get()
  findAll() {
    return this.pacientesService.findAll();
  }
}
```

---

### 4.4) pacientes.service.ts

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PacientesService {
  findAll() {
    return [{ id: 1, nome: 'João Silva' }];
  }
}
```

---

### 4.5) Prisma schema.prisma

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Paciente {
  id    String @id @default(uuid())
  nome  String
}
```

---

## 📂 5) CI/CD — GitHub Actions

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install Angular
      run: |
        cd angular/crm-medico
        npm install

    - name: Lint
      run: |
        cd angular/crm-medico
        npm run lint

    - name: Test
      run: |
        cd angular/crm-medico
        npm test

    - name: Build
      run: |
        cd angular/crm-medico
        npm run build -- --prod
```

---

## 🧪 6) Angular — Unit Test

```ts
import { TestBed } from '@angular/core/testing';
import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

---

## 🔁 7) Cypress — E2E Test

```js
describe('Agenda', () => {
  it('deve mostrar lista de consultas', () => {
    cy.visit('/consultas');
    cy.contains('Consultas');
  });
});
```

---

### 🧠 8) Observability — Sentry (Angular)

```ts
import * as Sentry from "@sentry/angular";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: environment.sentryDsn,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

---

## 📌 Final

Este arquivo contém **todos os códigos sugeridos** para você iniciar o CRM Médico completo.
Se quiser gerar **variantes específicas por domínio** (ex.: agenda, prontuário, relatórios, notificação) ou **deploy automático pronto**, posso gerar o MD expandido com scripts de deploy e ações CI/CD adicionais.

