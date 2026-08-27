import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { Dither } from '../../shared/dither/dither';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-register',
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
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);

  name = '';
  email = '';
  password = '';

  error = signal<string | null>(null);
  // true once register succeeds swaps the form for a check your email message
  // no auto-login anymore the account must verify via email first
  submitted = signal(false);
  // true while a request is in flight guards against a double click firing two posts
  submitting = signal(false);

  onSubmit(): void {
    // ignore extra clicks while one request is already running
    if (this.submitting()) return;

    this.error.set(null);
    this.submitting.set(true);

    // register only the response is the same whether or not the email exists
    // so we never branch on it the truth goes to the mailbox not the browser
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: () => this.submitted.set(true),
      // re-enable so they can retry only on failure success swaps the form away
      error: () => {
        this.submitting.set(false);
        this.error.set('Something went wrong. Please try again.');
      }
    });
  }
}
