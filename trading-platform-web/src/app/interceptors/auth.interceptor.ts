import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// runs for every outgoing request next forwards it down the chain
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // inject works here interceptors run in di context
  const token = inject(AuthService).getToken();

  // no token yet on login register so pass through untouched
  if (!token) {
    return next(req);
  }

  // requests are immutable so clone with the auth header and send the copy
  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });

  return next(authReq);
};
