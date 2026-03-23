---
title: Clinical Module
description: Patient records, medical history, and clinical workflow in IntraClinica.
---

# Clinical Module

The Clinical module (`features/clinical/`) manages patient records — the most security-sensitive data in a medical SaaS. All clinical data is strictly scoped to the active `clinicId`.

## Data Model

### `patient`

Stores demographic and administrative patient data. Does **not** contain clinical notes — those live in `medical_record`.

```sql
patient {
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  clinic_id     uuid NOT NULL REFERENCES clinic(id)
  name          text NOT NULL
  birth_date    date
  gender        text
  phone         text
  email         text
  document_id   text  -- CPF/RG/etc.
  address       jsonb
  created_at    timestamptz DEFAULT now()
  updated_at    timestamptz DEFAULT now()
}
```

### `medical_record`

The clinical encounter — a note attached to a patient at a point in time.

```sql
medical_record {
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  clinic_id     uuid NOT NULL REFERENCES clinic(id)
  patient_id    uuid NOT NULL REFERENCES patient(id)
  author_id     uuid NOT NULL REFERENCES app_user(id)  -- doctor who wrote it
  record_date   date NOT NULL
  content       jsonb NOT NULL  -- structured JSON: sections, diagnoses, prescriptions
  created_at    timestamptz DEFAULT now()
  updated_at    timestamptz DEFAULT now()
}
```

::: tip Why `content` is JSONB
Medical records are semi-structured: each specialty (dermatology, cardiology) uses different section layouts. Storing as JSONB lets each specialty evolve its own template without schema migrations.
:::

## IAM Binding Requirement

To view or write clinical records, the `app_user` must have the `DOCTOR` role in `iam_bindings` for the active `clinicId`:

```typescript
const bindings = user.iam_bindings
if (!bindings?.[clinicId]?.includes('DOCTOR')) {
  throw new Error('Access denied: DOCTOR role required')
}
```

## Signal Architecture

The `ClinicalStore` exposes reactive state to components via signals:

```typescript
@Injectable({ providedIn: 'root' })
export class ClinicalStore {
  private svc = inject(ClinicalService)
  private ctx = inject(ClinicContext)

  // Read-only computed signals — never assign .value in ngOnInit
  readonly patients   = computed(() => this.svc.patients())
  readonly records    = computed(() => this.svc.records())
  readonly selectedPatient = computed(() => this.svc.selectedPatient())
}
```

## Routing

The clinical module uses Angular's new standalone routing with a lazy-loaded bundle:

```typescript
export const CLINICAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./clinical-shell.component')
  },
  {
    path: 'patient/:id',
    loadComponent: () => import('./patient-detail.component')
  }
]
```

## RPC Operations

Creating a medical record and updating stock (for prescriptions that dispense medication) must be atomic:

```sql
-- intra-clinic.create_medical_record_with_dispense
CREATE OR REPLACE FUNCTION create_medical_record_with_dispense(
  p_clinic_id    UUID,
  p_patient_id   UUID,
  p_author_id    UUID,
  p_record_date  DATE,
  p_content      JSONB,
  p_dispense_items JSONB  -- [{inventory_id, quantity}]
) RETURNS medical_record AS $$
DECLARE
  v_record medical_record;
BEGIN
  -- Insert the record
  INSERT INTO medical_record (clinic_id, patient_id, author_id, record_date, content)
  VALUES (p_clinic_id, p_patient_id, p_author_id, p_record_date, p_content)
  RETURNING * INTO v_record;

  -- Deduct inventory (if dispense_items provided)
  IF p_dispense_items IS NOT NULL THEN
    FOR i IN 1..jsonb_array_length(p_dispense_items) LOOP
      UPDATE inventory_stock
      SET quantity = quantity - (p_dispense_items->>(i-1)->>'quantity')::INT
      WHERE clinic_id = p_clinic_id
        AND inventory_id = (p_dispense_items->>(i-1)->>'inventory_id')::UUID;
    END LOOP;
  END IF;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql;
```

## Related Pages

- [Multi-Tenant Security](../core-architecture/multi-tenant-security) — IAM bindings
- [Database Schema](../core-architecture/database) — RPC functions
