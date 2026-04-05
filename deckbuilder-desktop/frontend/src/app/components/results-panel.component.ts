import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { getCardImageCandidates } from '../card-image.util';
import { CardRecord, DeckResult } from '../app.types';
import { CardDialogComponent } from './card-dialog.component';

@Component({
    selector: 'app-results-panel',
    imports: [CommonModule, CardDialogComponent],
    templateUrl: './results-panel.component.html',
    styleUrl: './results-panel.component.scss'
})
export class ResultsPanelComponent {
    @Input({ required: true }) deckResult!: DeckResult;
    @Input({ required: true }) buildWarnings!: string[];
    @Input({ required: true }) resultSeed!: string | null;
    @Input({ required: true }) labelMap!: Record<string, string>;

    selectedCard: CardRecord | null = null;
    selectedContext = '';
    private tileImageIndexes = new Map<string, number>();

    sectionEntries(section: Record<string, CardRecord[]>): [string, CardRecord[]][] {
        return Object.entries(section).filter(([, arr]) => arr.length > 0);
    }

    countCards(section: Record<string, CardRecord[]>): number {
        return Object.values(section).reduce((sum, arr) => sum + arr.length, 0);
    }

    totalCards(): number {
        return (
            this.countCards(this.deckResult.loot) +
            this.countCards(this.deckResult.monster) +
            this.countCards(this.deckResult.treasure) +
            this.countCards(this.deckResult.souls) +
            this.countCards(this.deckResult.rooms)
        );
    }

    openCardDialog(card: CardRecord, contextLabel: string, event?: Event): void {
        event?.preventDefault();
        event?.stopPropagation();
        this.selectedCard = card;
        this.selectedContext = contextLabel;
    }

    closeCardDialog(): void {
        this.selectedCard = null;
        this.selectedContext = '';
    }

    shouldShowTileImage(card: CardRecord): boolean {
        const imageCandidates = this.getTileImageCandidates(card);
        return this.getTileImageIndex(card) < imageCandidates.length;
    }

    tileImageSrc(card: CardRecord): string {
        const imageCandidates = this.getTileImageCandidates(card);
        return imageCandidates[this.getTileImageIndex(card)] ?? '';
    }

    onTileImageError(card: CardRecord): void {
        const key = this.getCardKey(card);
        this.tileImageIndexes.set(key, this.getTileImageIndex(card) + 1);
    }

    tileFallbackTitle(card: CardRecord): string {
        return card['Name'] || 'Unknown Card';
    }

    private getTileImageCandidates(card: CardRecord): string[] {
        return getCardImageCandidates(card);
    }

    private getCardKey(card: CardRecord): string {
        return [card['URL'] ?? '', card['Name'] ?? '', card['Set Code'] ?? ''].join('|');
    }

    private getTileImageIndex(card: CardRecord): number {
        return this.tileImageIndexes.get(this.getCardKey(card)) ?? 0;
    }
}
