import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

type SetupStatus = 'idle' | 'running' | 'done' | 'error';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [],
  templateUrl: './setup.component.html',
  styleUrl: './setup.component.scss'
})
export class SetupComponent implements OnDestroy {
  status: SetupStatus = 'idle';
  messages: string[] = [];
  errorMessage = '';
  noImages = true;

  private eventSource: EventSource | null = null;

  constructor(private router: Router) {}

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  startSetup(): void {
    this.status = 'running';
    this.messages = [];
    this.errorMessage = '';

    const url = `http://127.0.0.1:5001/setup/scrape?no_images=${this.noImages}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { message?: string };
      if (data.message) {
        this.messages.push(data.message);
      }
    };

    this.eventSource.addEventListener('done', () => {
      this.eventSource?.close();
      this.eventSource = null;
      this.status = 'done';
      setTimeout(() => this.router.navigate(['/deck-builder']), 1500);
    });

    this.eventSource.addEventListener('scrape-error', (e: Event) => {
      this.eventSource?.close();
      this.eventSource = null;
      this.status = 'error';
      const data = JSON.parse((e as MessageEvent).data) as { error?: string };
      this.errorMessage = data.error ?? 'Unknown error';
    });

    this.eventSource.onerror = () => {
      if (this.status === 'running') {
        this.eventSource?.close();
        this.eventSource = null;
        this.status = 'error';
        this.errorMessage = 'Connection to the backend was lost.';
      }
    };
  }

  retry(): void {
    this.status = 'idle';
    this.messages = [];
    this.errorMessage = '';
  }
}
