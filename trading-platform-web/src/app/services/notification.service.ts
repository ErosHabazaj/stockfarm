import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, startWith } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE } from '../api';

export type NotifKind = 'success' | 'info' | 'warning' | 'error';

export interface AppNotification {
  id: number;
  message: string;
  kind: NotifKind;
  at: number; // epoch ms
  read: boolean;
}

// only the fields we read off each endpoint
interface OrderLite {
  id: number;
  symbol: string;
  quantity: number;
  type: 'Buy' | 'Sell';
  status: 'Pending' | 'Completed' | 'Rejected';
}
interface MeLite {
  status: string;
}

// app wide notification hub
// keeps the list the bell shows and polls for changes a customer cant see on
// their own screen account status and order status both changed by an admin
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _items = signal<AppNotification[]>([]);
  readonly items = this._items.asReadonly();
  readonly unread = computed(() => this._items().filter(n => !n.read).length);

  // live account status seeded from the jwt kept fresh by polling users/me
  // the dashboard and trade page read this so approval takes effect without a relogin
  readonly accountStatus = signal<string | null>(this.auth.getStatus());

  private nextId = 1;
  // baselines the first poll just records ready flips true after that
  private lastOrderStatus = new Map<number, string>();
  private ordersReady = false;
  private accountReady = false;

  constructor() {
    // one heartbeat drives both watchers guarded so it stays quiet when logged out
    interval(8000).pipe(startWith(0)).subscribe(() => this.poll());
  }

  // add a notification to the top of the log
  push(message: string, kind: NotifKind = 'info'): void {
    this._items.update(list =>
      [{ id: this.nextId++, message, kind, at: Date.now(), read: false }, ...list].slice(0, 30)
    );
  }

  // opening the bell clears the badge
  markAllRead(): void {
    this._items.update(list => list.map(n => (n.read ? n : { ...n, read: true })));
  }

  clear(): void {
    this._items.set([]);
  }

  // wipe everything on logout so the next user starts clean
  reset(): void {
    this._items.set([]);
    this.lastOrderStatus.clear();
    this.ordersReady = false;
    this.accountReady = false;
    this.accountStatus.set(null);
  }

  private poll(): void {
    if (!this.auth.isLoggedIn()) return;
    // these are phrased for the customer and the admin watches everyone elsewhere
    if (this.auth.getRole() === 'Administrator') return;
    this.pollAccount();
    this.pollOrders();
  }

  private pollAccount(): void {
    this.http.get<MeLite>(`${API_BASE}/users/me`).subscribe({
      next: me => {
        const prev = this.accountStatus();
        if (this.accountReady && prev && me.status !== prev) {
          if (me.status === 'Approved') {
            this.push('Your account has been approved — you can now place trades.', 'success');
          } else if (me.status === 'Restricted') {
            this.push('Your account has been restricted. You can no longer trade.', 'warning');
          } else {
            this.push(`Your account status changed to ${me.status}.`, 'info');
          }
        }
        this.accountStatus.set(me.status);
        this.accountReady = true;
      },
      error: () => {} // a failed poll just skips this tick
    });
  }

  private pollOrders(): void {
    this.http.get<OrderLite[]>(`${API_BASE}/orders`).subscribe({
      next: orders => {
        for (const o of orders) {
          const prev = this.lastOrderStatus.get(o.id);
          // only announce a transition we saw the before of and only to a settled state
          // the placed event is reported by the trade flow itself
          if (this.ordersReady && prev && prev !== o.status && o.status !== 'Pending') {
            const approved = o.status === 'Completed';
            this.push(
              `Your ${o.type.toLowerCase()} order for ${o.quantity} ${o.symbol} was ${approved ? 'approved' : 'denied'}.`,
              approved ? 'success' : 'error'
            );
          }
          this.lastOrderStatus.set(o.id, o.status);
        }
        this.ordersReady = true;
      },
      error: () => {}
    });
  }
}
