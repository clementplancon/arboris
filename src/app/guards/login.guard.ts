// login.guard.ts
import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { skipWhile, take, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const loginGuard = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.user$.pipe(
    skipWhile(user => user === undefined),  // Attendre que l’état soit chargé
    take(1),
    map(user => {
      return user ? router.parseUrl('/') : true;
    })
  );
};
