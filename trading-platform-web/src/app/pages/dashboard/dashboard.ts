import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { MarketService } from '../../services/market.service';
import { PriceChart, ChartSeries } from '../../shared/price-chart/price-chart';
import { API_BASE } from '../../api';

// matches /api/portfolio
interface PortfolioItem {
  symbol: string;
  quantity: number;
}

const LINE = '#2e9e4f'; // brand green for the chart

@Component({
  selector: 'app-dashboard',
  imports: [MatCardModule, MatButtonModule, RouterLink, CurrencyPipe, PriceChart],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  readonly market = inject(MarketService);

  readonly email = this.auth.getEmail();
  // live status falls back to the jwt until the first poll
  readonly status = computed(() => this.notifications.accountStatus() ?? this.auth.getStatus());

  portfolio = signal<PortfolioItem[] | null>(null);
  error = signal<string | null>(null);

  // holdings if you have any otherwise all symbols
  readonly chartSymbols = computed(() => {
    const held = this.portfolio()?.map(p => p.symbol) ?? [];
    return held.length ? held : this.market.stocks().map(s => s.symbol);
  });

  // one symbol at a time different price points would flatten each other on one axis
  readonly selected = signal<string | null>(null);

  constructor() {
    // default to the first symbol once we know them
    effect(() => {
      const syms = this.chartSymbols();
      if (!this.selected() && syms.length) {
        this.selected.set(syms[0]);
      }
    });
  }

  ngOnInit(): void {
    this.http.get<PortfolioItem[]>(`${API_BASE}/portfolio`).subscribe({
      next: items => this.portfolio.set(items),
      error: () => this.error.set('Could not load your portfolio.')
    });
  }

  isSelected(symbol: string): boolean {
    return this.selected() === symbol;
  }

  select(symbol: string): void {
    this.selected.set(symbol);
  }

  readonly series = computed<ChartSeries[]>(() => {
    const sym = this.selected();
    if (!sym) return [];
    return [{ symbol: sym, color: LINE, points: this.market.pointsOf(sym) }];
  });
}
