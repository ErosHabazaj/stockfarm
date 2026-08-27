import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  MatDialogRef, MAT_DIALOG_DATA, MatDialogModule
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { MarketService } from '../../services/market.service';
import { API_BASE } from '../../api';

// what the caller passes in
export interface OrderDialogData {
  symbol: string;
  name: string;
  type: 'Buy' | 'Sell';
}

// the trade form as a popup for one stock market priced order no history
@Component({
  selector: 'app-order-dialog',
  imports: [
    FormsModule, CurrencyPipe, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonToggleModule, MatButtonModule
  ],
  templateUrl: './order-dialog.html',
  styleUrl: './order-dialog.css'
})
export class OrderDialog {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  readonly market = inject(MarketService);
  readonly data = inject<OrderDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<OrderDialog>);

  type = signal<'Buy' | 'Sell'>(this.data.type);
  quantity = 1;
  error = signal<string | null>(null);
  submitting = signal(false);

  // live status decides if trading is on
  readonly canTrade = computed(
    () => (this.notifications.accountStatus() ?? this.auth.getStatus()) === 'Approved'
  );

  // same source as canTrade but kept raw so the template can word the block reason
  // pending vs restricted differently
  readonly status = computed(
    () => this.notifications.accountStatus() ?? this.auth.getStatus()
  );

  // live market price from the shared feed
  readonly price = computed(() => this.market.priceOf(this.data.symbol));

  placeOrder(): void {
    this.error.set(null);
    this.submitting.set(true);
    const side = this.type();
    const qty = this.quantity;

    this.http.post(`${API_BASE}/orders`, {
      symbol: this.data.symbol,
      quantity: qty,
      orderType: side
    }).subscribe({
      next: () => {
        this.notifications.push(`Order placed: ${side.toLowerCase()} ${qty} ${this.data.symbol}.`, 'info');
        this.ref.close(true); // tell the opener an order was placed
      },
      error: err => {
        this.submitting.set(false);
        if (err.status === 403) {
          this.error.set('Only approved customers can place orders.');
        } else if (err.status === 400 && typeof err.error === 'string') {
          this.error.set(err.error); // server sends a plain text reason
        } else {
          this.error.set('Could not place order. Check the values and try again.');
        }
      }
    });
  }

  close(): void {
    this.ref.close();
  }
}
