import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { Dither } from '../../shared/dither/dither';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-login',
  // a standalone component lists every module its template uses
  imports: [
    FormsModule,
    RouterLink,
    Dither,
    ThemeToggle,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly theme = inject(ThemeService); // template binds the background color to it

  email = '';
  password = '';

  error = signal<string | null>(null);
  notice = signal<string | null>(null); // green confirmation eg after verifying

  constructor() {
    // the verify endpoint redirects here with ?verified=1 on success or 0 on a dead link
    const verified = this.route.snapshot.queryParamMap.get('verified');
    if (verified === '1') {
      this.notice.set('Email verified — you can now log in.');
    } else if (verified === '0') {
      this.error.set('That verification link is invalid or has expired.');
    }
  }

  onSubmit(): void {
    this.error.set(null);
    this.notice.set(null);

    this.auth.login(this.email, this.password).subscribe({
      // token already stored go to the dashboard
      next: () => this.router.navigate(['/dashboard']),
      // surface the servers reason when it sends a plain one eg email not verified
      // otherwise stay generic so bad credentials dont leak which half was wrong
      error: err => this.error.set(
        typeof err.error === 'string' ? err.error : 'Invalid email or password.'
      )
    });
  }
}
