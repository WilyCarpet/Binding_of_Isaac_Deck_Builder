import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

type SetupStatus = 'idle' | 'running' | 'done' | 'error';
type PopulateStatus = 'idle' | 'running' | 'done' | 'error';

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

  populateStatus: PopulateStatus = 'idle';
  populateMessages: string[] = [];
  populateError = '';

  private eventSource: EventSource | null = null;

  constructor(private router: Router) {}

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  navigateToApp(): void {
    this.router.navigate(['/deck-builder']);
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
      // Don't auto-navigate — let user optionally populate starting items first.
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

  populateStartingItems(): void {
    this.populateStatus = 'running';
    this.populateMessages = [];
    this.populateError = '';

    const url = 'http://127.0.0.1:5001/setup/populate-starting-items';
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { message?: string };
      if (data.message) {
        this.populateMessages.push(data.message);
      }
    };

    this.eventSource.addEventListener('done', () => {
      this.eventSource?.close();
      this.eventSource = null;
      this.populateStatus = 'done';
      setTimeout(() => this.router.navigate(['/deck-builder']), 1500);
    });

    this.eventSource.addEventListener('scrape-error', (e: Event) => {
      this.eventSource?.close();
      this.eventSource = null;
      this.populateStatus = 'error';
      const data = JSON.parse((e as MessageEvent).data) as { error?: string };
      this.populateError = data.error ?? 'Unknown error';
    });

    this.eventSource.onerror = () => {
      if (this.populateStatus === 'running') {
        this.eventSource?.close();
        this.eventSource = null;
        this.populateStatus = 'error';
        this.populateError = 'Connection to the backend was lost.';
      }
    };
  }

  retry(): void {
    this.status = 'idle';
    this.messages = [];
    this.errorMessage = '';
  }
}
