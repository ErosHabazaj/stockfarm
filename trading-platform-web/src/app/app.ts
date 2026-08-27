import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';
import { ThemeToggle } from './shared/theme-toggle/theme-toggle';
import { NotificationBell } from './shared/notification-bell/notification-bell';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, ThemeToggle, NotificationBell
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // public so the template can toggle the toolbar
  readonly auth = inject(AuthService);
  // injected here so the singleton and its poller live for the whole app
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  get isAdmin(): boolean {
    return this.auth.getRole() === 'Administrator';
  }

  logout(): void {
    this.auth.logout();          // clears the token
    this.notifications.reset();  // drop this users notifications and baselines
    this.router.navigate(['/login']);
  }
}
