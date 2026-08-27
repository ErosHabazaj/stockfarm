import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatBadgeModule, MatMenuModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css'
})
export class NotificationBell {
  // public so the template can read the list and call clear
  readonly notifications = inject(NotificationService);

  // opening the panel clears the unread badge
  onOpened(): void {
    this.notifications.markAllRead();
  }

  // panel lives in an overlay stop the click so the menu doesnt close
  clear(event: Event): void {
    event.stopPropagation();
    this.notifications.clear();
  }
}
