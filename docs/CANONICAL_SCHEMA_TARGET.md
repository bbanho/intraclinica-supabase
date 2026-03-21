# Canonical Schema Target

## Purpose

Define the target data model that the repository should converge to before new feature work resumes.

This document is intentionally narrower than a full migration script. It fixes the canonical direction first, so migrations and frontend refactors can follow a stable contract.

## Decision Summary

The repository should converge on:

- `clinic`
- `actor`
- `app_user`
- `patient`
- `product`
- `stock_transaction`
- `appointment`
- `clinical_record`
- `access_request`

The repository should treat these as transitional or legacy:

- `public."user"`
- PascalCase duplicates such as `AccessRequest`, `Batch`, `StockTransaction`
- `inventory_item` and `inventory_movement` as a secondary procedural inventory track until explicitly merged or removed

## Why This Direction

### Identity

`app_user` is the correct identity anchor because:

- it uses `uuid`
- it already references `auth.users(id)`
- the active frontend auth flow already reads from `app_user`
- it aligns with social login and Supabase Auth lifecycle

`public."user"` is legacy because:

- it uses `text` ids
- appointments, clinical records, and access requests still depend on it
- it duplicates fields already present in `app_user`
- it keeps the system split between two identity models

### Inventory

`product` plus `stock_transaction` should be the canonical operational inventory for the current frontend because:

- the active `frontend/` inventory feature is already organized around that pair
- product listing, reporting, and stock history in the UI already assume that model
- this is the shortest path to a working and typed user-facing inventory module

`inventory_item` plus `inventory_movement` should remain transitional because:

- it contains useful procedural consumption concepts
- it already powers `procedure_type`, `procedure_recipe`, and `perform_procedure`
- but it introduces a second inventory model that the user-facing frontend does not currently consume coherently

The practical consequence is:

- keep `inventory_item` and related procedure tables alive during transition
- stop expanding both inventory models in parallel
- later either merge procedural consumption into `product` or isolate it as a distinct consumables subsystem with explicit naming

## Target Identity Model

### Canonical tables

- `actor`
- `app_user`
- `patient`

### Target relationships

- `app_user.id -> auth.users.id`
- `app_user.actor_id -> actor.id`
- `patient.id -> actor.id`
- `actor.clinic_id -> clinic.id`

### Target rule

No business table should depend on `public."user"` after consolidation.

## Target Scheduling And Clinical Model

### Canonical tables

- `appointment`
- `clinical_record`

### Required change

These tables must stop referencing `public."user"(id)` through `doctor_id text`.

### Preferred target

Use `doctor_actor_id uuid references actor(id)`.

Reason:

- `actor` is already the domain identity root
- patient records already use the actor-based pattern
- this avoids binding domain relationships directly to auth transport identities
- it supports future professional actors beyond direct auth users if needed

### Transitional compatibility

During migration, keep a derived display field such as:

- `doctor_name`

But make the relational key canonical and typed as `uuid`.

## Target Access Model

### Canonical table

- `access_request`

### Required change

`access_request.requester_id` must stop referencing `public."user"(id)`.

### Preferred target

Use `requester_user_id uuid references app_user(id)`.

Reason:

- access requests are application-user actions, not generic actor actions
- they originate from authenticated users
- they should align with Supabase Auth and `app_user`

## Target Inventory Model

### Canonical tables

- `product`
- `stock_transaction`

### Required change

All frontend inventory work should compile against the actual remote columns:

`product`

- `id`
- `clinic_id`
- `barcode`
- `name`
- `category`
- `avg_cost_price`
- `current_stock`
- `min_stock`
- `price`
- `deleted`

`stock_transaction`

- `id`
- `clinic_id`
- `product_id`
- `record_id`
- `type`
- `total_qty`
- `reason`
- `timestamp`

### Required operational rule

Stock mutation must not be implemented as client-side split writes.

Use one database boundary:

- RPC
- trigger-backed insert contract
- or another single-transaction write path

## Frontend Mismatches To Fix

The active frontend still contains hard mismatches against the remote schema.

### Inventory feature service

[inventory.service.ts](/var/home/bruno/Documentos/intraclinica-supabase/frontend/src/app/features/inventory/data/inventory.service.ts) assumes:

- `stock`
- `cost_price`
- `date`
- `quantity`
- `product_name`

But the remote schema currently exposes:

- `current_stock`
- `avg_cost_price`
- `timestamp`
- `total_qty`
- no `product_name` column on `stock_transaction`

### Legacy database service

[database.service.ts](/var/home/bruno/Documentos/intraclinica-supabase/frontend/src/app/core/services/database.service.ts) mixes table names and columns that do not match the remote schema, for example:

- `clinics` instead of `clinic`
- `appointments` instead of `appointment`
- `clinical_records` instead of `clinical_record`
- `social_posts` instead of `social_post`
- `stock_transaction.order('date')` even though the remote column is `timestamp`
- `product.stock` inserts even though the remote column is `current_stock`

This service should be treated as legacy compatibility code and should not define the future schema contract.

## Migration Order

1. Freeze this canonical model in docs.
2. Add a consolidation migration that introduces canonical foreign keys beside legacy ones where needed.
3. Backfill data from `public."user"` to canonical references.
4. Update frontend code to use generated types from the remote schema.
5. Remove legacy columns, FKs, functions, and duplicate table paths.

## Non-Goals For The First Migration

The first consolidation migration should not try to solve everything.

It should not:

- merge procedural inventory into product inventory immediately
- rewrite all RLS rules at once
- remove legacy tables before frontend code is moved

Its job is to create one safe forward path.
