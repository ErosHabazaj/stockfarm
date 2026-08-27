import { Injectable, computed, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'theme';

  // current theme
  readonly theme = signal<Theme>(this.initialTheme());

  readonly isDark = computed(() => this.theme() === 'dark');

  // wave stays green in both themes only the backdrop flips
  readonly waveColor = computed<[number, number, number]>(() => [0.2235, 0.6, 0.1294]);

  // backdrop white in light black in dark
  readonly bgColor = computed<[number, number, number]>(() =>
    this.theme() === 'dark' ? [0, 0, 0] : [1, 1, 1]
  );

  constructor() {
    // flip the roots color scheme and remember the choice
    effect(() => {
      const theme = this.theme();
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem(this.storageKey, theme);
    });
  }

  toggle(): void {
    this.theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }

  private initialTheme(): Theme {
    const saved = localStorage.getItem(this.storageKey);
    if (saved === 'light' || saved === 'dark') return saved;
    // fall back to the os preference
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
