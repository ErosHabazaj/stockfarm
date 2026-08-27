import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NotificationService } from '../../services/notification.service';
import { API_BASE } from '../../api';

interface User {
  id: number;
  name: string;
  email: string;
  status: 'Pending' | 'Approved' | 'Restricted';
  role: 'Customer' | 'Administrator';
}

interface Order {
  id: number;
  userId: number;
  symbol: string;
  quantity: number;
  price: number;
  type: 'Buy' | 'Sell';
  status: 'Pending' | 'Completed' | 'Rejected';
  createdAt: string;
}

@Component({
  selector: 'app-admin',
  imports: [CurrencyPipe, DatePipe, MatCardModule, MatButtonModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);

  users = signal<User[]>([]);
  orders = signal<Order[]>([]);

  ngOnInit(): void {
    this.loadUsers();
    this.loadOrders();
  }

  loadUsers(): void {
    this.http.get<User[]>(`${API_BASE}/users`).subscribe(u => this.users.set(u));
  }

  loadOrders(): void {
    // as an admin get /api/orders returns every users orders
    this.http.get<Order[]>(`${API_BASE}/orders`).subscribe(o =>
      this.orders.set([...o].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    );
  }

  setUserStatus(u: User, status: 'Approved' | 'Restricted'): void {
    // refetch after the server confirms and drop a confirmation in the bell
    this.http.put(`${API_BASE}/users/${u.id}/status`, { status }).subscribe(() => {
      this.loadUsers();
      this.notifications.push(
        `${u.name} ${status === 'Approved' ? 'approved' : 'restricted'}.`,
        status === 'Approved' ? 'success' : 'warning'
      );
    });
  }

  setOrderStatus(o: Order, status: 'Completed' | 'Rejected'): void {
    this.http.put(`${API_BASE}/orders/${o.id}/status`, { status }).subscribe(() => {
      this.loadOrders();
      this.notifications.push(
        `Order #${o.id} marked ${status.toLowerCase()}.`,
        status === 'Completed' ? 'success' : 'info'
      );
    });
  }
}
