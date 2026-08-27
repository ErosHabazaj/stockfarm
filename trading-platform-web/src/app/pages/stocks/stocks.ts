import { Component, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe, PercentPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MarketService, Candle } from '../../services/market.service';
import { CandleChart } from '../../shared/candle-chart/candle-chart';
import { OrderDialog, OrderDialogData } from '../../shared/order-dialog/order-dialog';

@Component({
  selector: 'app-stocks',
  imports: [CurrencyPipe, PercentPipe, MatCardModule, MatButtonModule, MatIconModule, CandleChart],
  templateUrl: './stocks.html',
  styleUrl: './stocks.css'
})
export class Stocks {
  readonly market = inject(MarketService);
  private readonly dialog = inject(MatDialog);

  readonly selected = signal<string | null>(null);

  // the four range buttons value is what the api expects
  readonly ranges = [
    { label: '1H', value: '1h' },
    { label: '1D', value: '1day' },
    { label: '1W', value: '7days' },
    { label: '1M', value: '1month' },
  ];
  readonly range = signal<string>('1h');

  // candles for the selected symbol + range refetched when either changes
  readonly candles = signal<Candle[]>([]);

  constructor() {
    // auto select the first stock once prices arrive
    effect(() => {
      const s = this.market.stocks();
      if (!this.selected() && s.length) this.selected.set(s[0].symbol);
    });

    // refetch candles whenever the symbol or range changes
    // oncleanup cancels a stale request so a fast range click cant land out of order
    effect((onCleanup) => {
      const sym = this.selected();
      const range = this.range();
      if (!sym) { this.candles.set([]); return; }
      const sub = this.market.getCandles(sym, range).subscribe(cs => this.candles.set(cs));
      onCleanup(() => sub.unsubscribe());
    });
  }

  readonly selectedStock = computed(() =>
    this.market.stocks().find(s => s.symbol === this.selected()) ?? null
  );

  // percent change across the currently selected range first close to last
  readonly rangeChange = computed(() => {
    const cs = this.candles();
    if (cs.length < 2) return 0;
    const first = cs[0].close;
    const last = cs[cs.length - 1].close;
    return first === 0 ? 0 : (last - first) / first;
  });
  readonly absRangeChange = computed(() => Math.abs(this.rangeChange()));

  // sidebar spark uses the always-on history poll not the selected range
  changeOf(symbol: string): number {
    const pts = this.market.pointsOf(symbol);
    if (pts.length < 2) return 0;
    const first = pts[0].price;
    const last = pts[pts.length - 1].price;
    return first === 0 ? 0 : (last - first) / first;
  }

  // magnitude only the arrow carries the sign
  absChangeOf(symbol: string): number {
    return Math.abs(this.changeOf(symbol));
  }

  select(symbol: string): void {
    this.selected.set(symbol);
  }

  setRange(value: string): void {
    this.range.set(value);
  }

  trade(type: 'Buy' | 'Sell'): void {
    const stock = this.selectedStock();
    if (!stock) return;
    const data: OrderDialogData = { symbol: stock.symbol, name: stock.name, type };
    this.dialog.open(OrderDialog, { data, width: '380px' });
  }
}
