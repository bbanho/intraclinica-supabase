# PR #1 Inventory Assessment

## Scope

PR analyzed:

- `#1` `refactor(inventory): migração para NgRx e Supabase`

Reference:

- `https://github.com/bbanho/intraclinica-supabase/pull/1`

## Current Verdict

PR #1 should not be merged in its current form.

Reason:

- it is in `CONFLICTING` state against `main`
- it targets an inventory table contract that does not match the remote schema now in production
- it implements stock mutation as a client-side sequence instead of an atomic database operation
- it was built before the current repository and schema consolidation findings

## What The PR Gets Right

The PR still contains useful direction:

- inventory state belongs in NgRx rather than ad hoc component state
- inventory side effects should be isolated in feature effects and services
- inventory documentation deserves its own architectural note
- product and stock mutation concerns should be explicit in the frontend contract

These ideas remain valid and should be preserved in a replacement implementation.

## What Is Obsolete

The following assumptions are no longer safe:

- use of `inventory_items`
- use of `inventory_transactions`
- client-side read-modify-write stock updates
- documentation that treats that table model as canonical

The remote database inspected from Supabase currently exposes a different application reality, centered around entities such as:

- `product`
- `stock_transaction`
- `inventory_item`
- `inventory_movement`

Additionally, the live schema still carries overlapping identity models:

- `app_user` with `uuid`
- `user` with `text`

This means PR #1 is not only stale at the feature level. It also sits on top of a database contract that is already under consolidation pressure.

## Replacement Decision

PR #1 should be superseded, not revived.

Recommended path:

1. Preserve the architectural intent from the PR.
2. Discard the direct table contract used by the PR.
3. Rebuild inventory persistence against the canonical schema selected in the consolidation track.
4. Move stock-changing operations into RPC or another atomic database boundary.

## Salvageable Parts

These parts are worth reusing conceptually or by selective cherry-pick:

- NgRx inventory action and effect structure
- separation between feature store and data service
- inventory-focused architecture documentation

These parts should not be reused as-is:

- direct Supabase calls to pluralized inventory tables
- reducer logic built around provisional or placeholder stock values
- partial object reconstruction after `upsert`
- documentation claiming migration completion under the wrong schema

## Required Success Criteria For The Replacement

Any replacement for PR #1 should satisfy all items below:

- use the canonical frontend under `frontend/`
- target the remote schema that actually exists today
- avoid client-side split writes for stock mutation
- compile against generated types from the remote schema
- make it obvious whether inventory is based on `product` and `stock_transaction` or on another final canonical pair

## Immediate Conclusion

PR #1 remains useful as historical design intent, but not as a merge candidate.

The correct next step is to replace it with inventory work derived from the schema consolidation track, not to resolve its conflicts and merge it forward.
