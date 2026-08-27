import { Component, inject, input } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.css'
})
export class ThemeToggle {
  readonly theme = inject(ThemeService);

  // true pins it to the corner for pages with no bar false sits inline in a bar
  readonly floating = input(false);
}
