# Learnings

- Refactored `DatabaseService.saveUser` to use `rpc` for user management.
- Replaced direct `profiles` table manipulation with `create_user_with_actor` and `update_user_with_actor`.
- Ensured Auth User creation via `supabase.auth.signUp` before calling RPC for new users.
- Handled password updates separately via `supabase.auth.updateUser` for existing users.
- Verified parameter mapping between TypeScript `UserProfile` (camelCase) and Postgres RPC (snake_case).
- Successfully ran production build (`ng build --configuration=production`) in `frontend/` directory. No type errors found in `database.service.ts` after refactoring `saveUser` with `Partial<UserProfile>`.
- **Database Schema Fix**: Renamed table `"user"` to `app_user` to avoid `uuid = text` operator mismatch errors and potential keyword conflicts. Existing `user` table (if any) likely had `id` as text, whereas we require `uuid` referencing `auth.users`.
- Updated `20260215000000_add_user_actor_rpc.sql` migration to create `app_user` instead of `"user"`.
- Updated all RPCs (`create_user_with_actor`, `update_user_with_actor`) and RLS policies to use `app_user`.
- Updated `DatabaseService` in frontend to query `app_user` instead of `"user"`.
