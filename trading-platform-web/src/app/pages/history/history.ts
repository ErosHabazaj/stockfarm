import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap, catchError, of, map } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { API_BASE } from '../../api';

interface Order {
  id: number;
  symbol: string;
  quantity: number;
  price: number;
  type: 'Buy' | 'Sell';
  status: 'Pending' | 'Completed' | 'Rejected';
  createdAt: string;
}

// order history on its own tab polls every 4s so admin changes show up
@Component({
  selector: 'app-history',
  imports: [CurrencyPipe, DatePipe, MatCardModule],
  templateUrl: './history.html',
  styleUrl: './history.css'
})
export class History {
  private readonly http = inject(HttpClient);

  readonly orders = toSignal(
    interval(4000).pipe(
      startWith(0),
      switchMap(() =>
        this.http.get<Order[]>(`${API_BASE}/orders`).pipe(
          map(o => [...o].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
          catchError(() => of([] as Order[]))
        )
      )
    ),
    { initialValue: [] as Order[] }
  );
}
