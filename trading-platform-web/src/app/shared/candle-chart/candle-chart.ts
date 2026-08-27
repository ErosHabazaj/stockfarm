import {
  AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, input, signal
} from '@angular/core';
import { Candle } from '../../services/market.service';

// one drawn candlestick keeps the raw candle for the tooltip
interface Candlestick {
  x: number;          // center of the candle
  wickTop: number;    // y of the high
  wickBottom: number; // y of the low
  bodyY: number;
  bodyH: number;
  bodyW: number;
  up: boolean;        // close >= open drives the colour
  c: Candle;
}

interface CandleVM {
  w: number; h: number;
  padL: number; padT: number; padR: number; padB: number;
  plotW: number; plotH: number;
  n: number;
  candles: Candlestick[];
  yTicks: { y: number; label: string }[];
  xTicks: { x: number; label: string }[];
  empty: boolean;
}

// dependency free candlestick chart
// plots by bar INDEX not by time so overnight + weekend gaps dont leave holes
// this is how real stock charts avoid the jump and it lines candles up under the volume bars
@Component({
  selector: 'app-candle-chart',
  templateUrl: './candle-chart.html',
  styleUrl: './candle-chart.css'
})
export class CandleChart implements AfterViewInit, OnDestroy {
  readonly candles = input<Candle[]>([]);
  readonly height = input(300);
  readonly showAxis = input(true);

  readonly hoverIndex = signal<number | null>(null);

  private readonly host = inject(ElementRef<HTMLElement>);
  private ro?: ResizeObserver;
  private readonly widthPx = signal(600);

  ngAfterViewInit(): void {
    const el = this.host.nativeElement as HTMLElement;
    this.ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      if (w > 0) this.widthPx.set(Math.round(w));
    });
    this.ro.observe(el);
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
  }

  readonly vm = computed<CandleVM>(() => {
    const w = this.widthPx();
    const h = this.height();
    const showAxis = this.showAxis();
    const padL = showAxis ? 48 : 6;
    const padB = showAxis ? 20 : 6;
    const padT = 8;
    const padR = 8;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const cs = this.candles();
    if (cs.length === 0) {
      return { w, h, padL, padT, padR, padB, plotW, plotH, n: 0, candles: [], yTicks: [], xTicks: [], empty: true };
    }

    // price domain spans lows to highs since a candle shows both wicks
    let pMin = Infinity, pMax = -Infinity;
    for (const c of cs) {
      if (c.low < pMin) pMin = c.low;
      if (c.high > pMax) pMax = c.high;
    }
    if (pMin === pMax) { pMin -= 1; pMax += 1; } // flat guard
    const padY = (pMax - pMin) * 0.08;
    pMin -= padY; pMax += padY;

    const n = cs.length;
    const slot = plotW / n;                    // one even slot per candle by index
    const bodyW = Math.max(1, slot * 0.7);     // gap between candles
    const xCenter = (i: number) => padL + (i + 0.5) * slot;
    const yOf = (p: number) => padT + (1 - (p - pMin) / (pMax - pMin)) * plotH;

    const candles: Candlestick[] = cs.map((c, i) => {
      const openY = yOf(c.open);
      const closeY = yOf(c.close);
      return {
        x: xCenter(i),
        wickTop: yOf(c.high),
        wickBottom: yOf(c.low),
        bodyY: Math.min(openY, closeY),
        bodyH: Math.max(1, Math.abs(closeY - openY)), // min 1px so a flat candle still shows
        bodyW,
        up: c.close >= c.open,
        c,
      };
    });

    const yTicks = [0, 0.5, 1].map(f => {
      const price = pMax - f * (pMax - pMin);
      return { y: yOf(price), label: this.fmtPrice(price) };
    });

    // if the range covers more than a couple days label with dates else times
    const spanMs = cs[n - 1].time - cs[0].time;
    const showDate = spanMs > 2 * 24 * 3600 * 1000;
    const xTicks = [0, Math.floor((n - 1) / 2), n - 1].map(i => ({
      x: xCenter(i),
      label: showDate ? this.fmtDate(cs[i].time) : this.fmtTime(cs[i].time),
    }));

    return { w, h, padL, padT, padR, padB, plotW, plotH, n, candles, yTicks, xTicks, empty: false };
  });

  // pointer to nearest candle slots are uniform so a floor divide finds it
  onMove(event: PointerEvent): void {
    const vm = this.vm();
    if (vm.empty) return;
    const svg = event.currentTarget as SVGGraphicsElement;
    const rect = svg.getBoundingClientRect();
    const relX = ((event.clientX - rect.left) / rect.width) * vm.w;
    const slot = vm.plotW / vm.n;
    const idx = Math.max(0, Math.min(vm.n - 1, Math.floor((relX - vm.padL) / slot)));
    this.hoverIndex.set(idx);
  }

  onLeave(): void {
    this.hoverIndex.set(null);
  }

  hoverLeftPct(): number {
    const vm = this.vm();
    const idx = this.hoverIndex();
    if (vm.empty || idx === null || idx >= vm.candles.length) return 0;
    return (vm.candles[idx].x / vm.w) * 100;
  }

  // raw candle under the pointer for the tooltip null if none
  hoverCandle(): Candle | null {
    const idx = this.hoverIndex();
    const cs = this.candles();
    if (idx === null || idx >= cs.length) return null;
    return cs[idx];
  }

  fmtPrice(p: number): string {
    return p.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }
  fmtTime(t: number): string {
    return new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  fmtDate(t: number): string {
    return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  // short human volume for the tooltip
  fmtVol(v: number): string {
    if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return String(v);
  }
}
