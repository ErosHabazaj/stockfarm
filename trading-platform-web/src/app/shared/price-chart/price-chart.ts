import {
  AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, input, signal
} from '@angular/core';
import { PricePoint } from '../../services/market.service';

export interface ChartSeries {
  symbol: string;
  color: string;
  points: PricePoint[];
}

// a point in svg coords keeps the raw values for the tooltip
interface PlotPoint { x: number; y: number; price: number; }
interface PlotSeries { symbol: string; color: string; path: string; pts: PlotPoint[]; }

// the whole chart precomputed so the template is just markup
interface ChartVM {
  w: number; h: number;
  padL: number; padT: number; padR: number; padB: number;
  plotW: number; plotH: number;
  n: number;               // points on the shared time axis
  times: number[];         // epoch ms per index
  series: PlotSeries[];
  yTicks: { y: number; label: string }[];
  xTicks: { x: number; label: string }[];
  empty: boolean;
}

// dependency free responsive line chart
// all series share timestamps so one hovered index lines up across every line
// we measure host width and use it as the viewbox width so 1 unit is 1px
@Component({
  selector: 'app-price-chart',
  templateUrl: './price-chart.html',
  styleUrl: './price-chart.css'
})
export class PriceChart implements AfterViewInit, OnDestroy {
  readonly series = input<ChartSeries[]>([]);
  readonly height = input(160);
  readonly showAxis = input(true);

  // which time index the pointer is over
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

  readonly vm = computed<ChartVM>(() => {
    const w = this.widthPx();
    const h = this.height();
    const showAxis = this.showAxis();
    const padL = showAxis ? 48 : 6;
    const padB = showAxis ? 20 : 6;
    const padT = 8;
    const padR = 8;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const series = this.series().filter(s => s.points.length > 1);
    if (series.length === 0) {
      return { w, h, padL, padT, padR, padB, plotW, plotH, n: 0, times: [], series: [], yTicks: [], xTicks: [], empty: true };
    }

    // shared time axis is the longest series timestamps
    const base = series.reduce((a, b) => (b.points.length > a.points.length ? b : a));
    const times = base.points.map(p => p.t);
    const n = times.length;
    const tMin = times[0];
    const tMax = times[n - 1];

    // price domain across all series with a little headroom
    let pMin = Infinity, pMax = -Infinity;
    for (const s of series) for (const p of s.points) {
      if (p.price < pMin) pMin = p.price;
      if (p.price > pMax) pMax = p.price;
    }
    if (pMin === pMax) { pMin -= 1; pMax += 1; } // flat line guard
    const padY = (pMax - pMin) * 0.08;
    pMin -= padY; pMax += padY;

    const xOf = (t: number) => padL + (tMax === tMin ? 0 : (t - tMin) / (tMax - tMin)) * plotW;
    const yOf = (p: number) => padT + (1 - (p - pMin) / (pMax - pMin)) * plotH;

    const plotSeries: PlotSeries[] = series.map(s => {
      const pts = s.points.map(p => ({ x: xOf(p.t), y: yOf(p.price), price: p.price }));
      const path = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
      return { symbol: s.symbol, color: s.color, path, pts };
    });

    const yTicks = [0, 0.5, 1].map(f => {
      const price = pMax - f * (pMax - pMin);
      return { y: yOf(price), label: this.fmtPrice(price) };
    });
    const xTicks = [0, 1].map(f => {
      const t = tMin + f * (tMax - tMin);
      return { x: xOf(t), label: this.fmtTime(t) };
    });

    return { w, h, padL, padT, padR, padB, plotW, plotH, n, times, series: plotSeries, yTicks, xTicks, empty: false };
  });

  // pointer to nearest index ticks are uniform so a linear map works
  onMove(event: PointerEvent): void {
    const vm = this.vm();
    if (vm.empty) return;
    const svg = event.currentTarget as SVGGraphicsElement;
    const rect = svg.getBoundingClientRect();
    const relX = ((event.clientX - rect.left) / rect.width) * vm.w; // into viewbox units
    const frac = (relX - vm.padL) / vm.plotW;
    const idx = Math.max(0, Math.min(vm.n - 1, Math.round(frac * (vm.n - 1))));
    this.hoverIndex.set(idx);
  }

  onLeave(): void {
    this.hoverIndex.set(null);
  }

  // tooltip x as a percent of viewbox width
  hoverLeftPct(): number {
    const vm = this.vm();
    const idx = this.hoverIndex();
    if (vm.empty || idx === null || !vm.series.length) return 0;
    return (vm.series[0].pts[idx].x / vm.w) * 100;
  }

  hoverTime(): string {
    const vm = this.vm();
    const idx = this.hoverIndex();
    if (idx === null || !vm.times.length) return '';
    return this.fmtTime(vm.times[idx]);
  }

  fmtPrice(p: number): string {
    return p.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  private fmtTime(t: number): string {
    return new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}
