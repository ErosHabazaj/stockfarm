import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap, catchError, of, map, Observable } from 'rxjs';
import { API_BASE } from '../api';

export interface Stock {
  symbol: string;
  name: string;
  price: number;
}

// one ohlc bar time is epoch ms after we parse the iso string
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
// raw shape from the api time is an iso string
interface RawCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// raw history point from the api t is an iso string
interface RawPoint {
  t: string;
  price: number;
}
interface RawHistory {
  symbol: string;
  points: RawPoint[];
}

// chart ready point with time as epoch ms
export interface PricePoint {
  t: number;
  price: number;
}

// one shared source of live market data so we poll once not once per page
@Injectable({ providedIn: 'root' })
export class MarketService {
  private readonly http = inject(HttpClient);

  // live prices every 3s
  readonly stocks = toSignal(
    interval(30000).pipe(
      startWith(0),
      switchMap(() =>
        this.http.get<Stock[]>(`${API_BASE}/stocks`).pipe(catchError(() => of([] as Stock[])))
      )
    ),
    { initialValue: [] as Stock[] }
  );

  // price history per symbol every 3s so charts grow live
  readonly history = toSignal(
    interval(3000).pipe(
      startWith(0),
      switchMap(() =>
        this.http.get<RawHistory[]>(`${API_BASE}/stocks/history`).pipe(
          catchError(() => of([] as RawHistory[]))
        )
      )
    ),
    { initialValue: [] as RawHistory[] }
  );

  // latest price for one symbol or null
  priceOf(symbol: string): number | null {
    return this.stocks().find(s => s.symbol === symbol)?.price ?? null;
  }

  // history for one symbol as chart ready points
  pointsOf(symbol: string): PricePoint[] {
    const h = this.history().find(x => x.symbol === symbol);
    if (!h) return [];
    return h.points.map(p => ({ t: Date.parse(p.t), price: p.price }));
  }

  // candles for one symbol over a range on demand not polled
  // range is one of 1h 1day 7days 1month backend validates it
  getCandles(symbol: string, range: string): Observable<Candle[]> {
    return this.http.get<RawCandle[]>(`${API_BASE}/stocks/${symbol}/candles?range=${range}`).pipe(
      map(cs => cs.map(c => ({ ...c, time: Date.parse(c.time) }))),
      catchError(() => of([] as Candle[]))
    );
  }
}
