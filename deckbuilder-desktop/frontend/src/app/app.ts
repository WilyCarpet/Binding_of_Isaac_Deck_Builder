import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  constructor(public router: Router) {}

  async ngOnInit(): Promise<void> {
    if (window.electronAPI?.checkDbExists) {
      const dbExists = await window.electronAPI.checkDbExists();
      if (!dbExists) {
        this.router.navigate(['/setup']);
      }
    }
  }
}
