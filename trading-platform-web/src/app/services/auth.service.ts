import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE } from '../api';

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const EMAIL_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';

// shape of the apis loginresponse
interface LoginResponse {
  token: string;
}

// shape of the apis userresponse register returns this
interface UserResponse {
  id: number;
  name: string;
  email: string;
  status: string;
}

// providedIn root one shared singleton for the app
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_BASE;
  // localstorage key for the jwt
  private readonly tokenKey = 'auth_token';

  // observable runs on subscribe tap stores the token as it passes through
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/users/login`, { email, password })
      .pipe(tap(res => localStorage.setItem(this.tokenKey, res.token)));
  }

  // register returns no token accounts start pending
  register(name: string, email: string, password: string): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/users`, { name, email, password });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  // read claims from the token payload is base64 json
  // display only the server reverifies the signature every request
  private decodeToken(): Record<string, unknown> | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null; // malformed token treat as no claims
    }
  }

  getStatus(): string | null {
    return (this.decodeToken()?.['status'] as string) ?? null;
  }

  getRole(): string | null {
    return (this.decodeToken()?.[ROLE_CLAIM] as string) ?? null;
  }

  getEmail(): string | null {
    return (this.decodeToken()?.[EMAIL_CLAIM] as string) ?? null;
  }
}
