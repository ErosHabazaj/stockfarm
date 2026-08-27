import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ThemeService } from '../../services/theme.service';
import { Dither } from '../../shared/dither/dither';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatButtonModule, Dither, ThemeToggle],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit, OnDestroy {
  readonly theme = inject(ThemeService);

  private readonly phrases = [
    'Trade smarter.',
    'Trade quicker.',
    'Trade in one place.',
    'Just trade.'
  ];

  readonly text = signal('');

  private phraseIndex = 0;
  private charIndex = 0;
  private deleting = false;
  private timer?: number;

  // mouse driven 3d tilt two signals feed a transform on the hero
  readonly tiltX = signal(0);
  readonly tiltY = signal(0);
  readonly heroTransform = computed(
    () => `perspective(900px) rotateX(${this.tiltX()}deg) rotateY(${this.tiltY()}deg)`
  );

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    const nx = e.clientX / window.innerWidth - 0.5;  // range -0.5 to 0.5
    const ny = e.clientY / window.innerHeight - 0.5;
    const max = 9; // degrees keep it gentle
    this.tiltY.set(+(nx * max).toFixed(2));
    this.tiltX.set(+(-ny * max).toFixed(2));
  }

  // typewriter loop
  ngOnInit(): void {
    this.tick();
  }

  private readonly tick = (): void => {
    const phrase = this.phrases[this.phraseIndex];

    if (!this.deleting) {
      this.charIndex++;
      this.text.set(phrase.slice(0, this.charIndex));
      if (this.charIndex === phrase.length) {
        this.deleting = true;
        this.timer = window.setTimeout(this.tick, 1400); // hold on the full phrase
        return;
      }
      this.timer = window.setTimeout(this.tick, 80);
    } else {
      this.charIndex--;
      this.text.set(phrase.slice(0, this.charIndex));
      if (this.charIndex === 0) {
        this.deleting = false;
        this.phraseIndex = (this.phraseIndex + 1) % this.phrases.length; // shuffle on
        this.timer = window.setTimeout(this.tick, 350);
        return;
      }
      this.timer = window.setTimeout(this.tick, 40);
    }
  };

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}
