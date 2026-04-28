import { CommonModule } from '@angular/common';
import {
    Component,
    EventEmitter,
    HostListener,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
} from '@angular/core';

import { getCardImageCandidates } from '../card-image.util';
import { CardRecord } from '../app.types';

@Component({
    selector: 'app-card-dialog',
    imports: [CommonModule],
    templateUrl: './card-dialog.component.html',
    styleUrl: './card-dialog.component.scss',
})
export class CardDialogComponent implements OnChanges {
    @Input({ required: true }) card!: CardRecord;
    @Input() contextLabel = '';

    @Output() close = new EventEmitter<void>();

    imageIndex = 0;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['card']) {
            this.imageIndex = 0;
        }
    }

    @HostListener('document:keydown.escape')
    handleEscape(): void {
        this.close.emit();
    }

    get imageCandidates(): string[] {
        return getCardImageCandidates(this.card);
    }

    get imageSrc(): string {
        return this.imageCandidates[this.imageIndex] ?? '';
    }

    get hasImage(): boolean {
        return this.imageIndex < this.imageCandidates.length;
    }

    onImageError(): void {
        this.imageIndex += 1;
    }

    closeDialog(): void {
        this.close.emit();
    }

    onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.close.emit();
        }
    }

    stopClick(event: MouseEvent): void {
        event.stopPropagation();
    }

    detailEntries(): [string, string][] {
        const hiddenKeys = new Set([
            'Name',
            'Set',
            'Sub Box',
            'Card Type',
            'HP',
            'ATK',
            'Effect Type',
            'Effect',
            'Quote',
            'URL',
            'Image URL',
            'Image Local Path',
        ]);

        return Object.entries(this.card)
            .filter(([key, value]) =>
                !key.startsWith('_') &&
                !hiddenKeys.has(key) &&
                String(value ?? '').trim().length > 0
            )
            .map(([key, value]): [string, string] => [key, String(value)])
            .sort((a, b) => a[0].localeCompare(b[0]));
    }
}
