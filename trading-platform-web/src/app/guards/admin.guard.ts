import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// role gate for admin routes ux only the api still enforces the role
// bounces non admins to the dashboard
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.getRole() === 'Administrator'
    ? true
    : router.createUrlTree(['/dashboard']);
};
