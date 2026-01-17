import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { DatabaseService } from '../services/database.service';

export const authGuard: CanActivateFn = (route, state) => {
  const db = inject(DatabaseService);
  const router: Router = inject(Router);

  if (db.currentUser()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};