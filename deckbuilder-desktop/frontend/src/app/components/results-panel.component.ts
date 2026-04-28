import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { getCardImageCandidates } from '../card-image.util';
import { CardRecord, DeckResult } from '../app.types';
import { CardDialogComponent } from './card-dialog.component';

@Component({
    selector: 'app-results-panel',
    imports: [CommonModule, FormsModule, CardDialogComponent],
    templateUrl: './results-panel.component.html',
    styleUrl: './results-panel.component.scss'
})
export class ResultsPanelComponent {
    @Input({ required: true }) deckResult!: DeckResult;
    @Input({ required: true }) buildWarnings!: string[];
    @Input({ required: true }) resultSeed!: string | null;
    @Input({ required: true }) labelMap!: Record<string, string>;

    @Output() rebuild = new EventEmitter<void>();
    @Output() clearResults = new EventEmitter<void>();

    searchTerm = '';
    selectedCard: CardRecord | null = null;
    selectedContext = '';
    private tileImageIndexes = new Map<string, number>();

    sectionEntries(section: Record<string, CardRecord[]>): [string, CardRecord[]][] {
        return Object.entries(section)
            .filter(([, arr]) => arr.length > 0)
            .map(([key, arr]): [string, CardRecord[]] => [
                key,
                this.searchTerm ? arr.filter(c => this.matchesSearch(c)) : arr,
            ])
            .filter(([, arr]) => arr.length > 0);
    }

    filteredCards(cards: CardRecord[]): CardRecord[] {
        return this.searchTerm ? cards.filter(c => this.matchesSearch(c)) : cards;
    }

    private matchesSearch(card: CardRecord): boolean {
        const term = this.searchTerm.toLowerCase();
        return (
            String(card['Name'] ?? '').toLowerCase().includes(term) ||
            String(card['Set'] ?? '').toLowerCase().includes(term) ||
            String(card['Effect'] ?? '').toLowerCase().includes(term)
        );
    }

    private buildExportText(): string {
        const lines: string[] = [];

        if (this.resultSeed) {
            lines.push(`Seed: ${this.resultSeed}`);
            lines.push('');
        }

        if (this.deckResult.characters?.length) {
            lines.push('=== Characters ===');
            for (const c of this.deckResult.characters) {
                lines.push(`${c['Name']}${c['Set'] ? ` (${c['Set']})` : ''}`);
            }
            lines.push('');
        }

        if (this.deckResult.eternal?.length) {
            lines.push('=== Eternal Treasure ===');
            for (const c of this.deckResult.eternal) {
                lines.push(`${c['Name']}${c['Set'] ? ` (${c['Set']})` : ''}`);
            }
            lines.push('');
        }

        const sectionDefs: [string, Record<string, CardRecord[]>][] = [
            ['Loot Deck', this.deckResult.loot],
            ['Monster Deck', this.deckResult.monster],
            ['Treasure Deck', this.deckResult.treasure],
            ['Souls', this.deckResult.souls],
            ['Rooms', this.deckResult.rooms],
        ];

        for (const [sectionName, section] of sectionDefs) {
            const entries = Object.entries(section).filter(([, arr]) => arr.length > 0);
            if (!entries.length) continue;
            lines.push(`=== ${sectionName} ===`);
            for (const [key, arr] of entries) {
                lines.push(`--- ${this.labelMap[key] ?? key} ---`);
                for (const c of arr) {
                    lines.push(`${c['Name']}${c['Set'] ? ` (${c['Set']})` : ''}`);
                }
            }
            lines.push('');
        }

        return lines.join('\n');
    }

    exportResults(): void {
        const text = this.buildExportText();
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'deck-export.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    async copyToClipboard(): Promise<void> {
        await navigator.clipboard.writeText(this.buildExportText());
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

    allCards(): CardRecord[] {
        const cards: CardRecord[] = [];
        for (const section of [
            this.deckResult.loot,
            this.deckResult.monster,
            this.deckResult.treasure,
            this.deckResult.souls,
            this.deckResult.rooms,
        ]) {
            for (const arr of Object.values(section)) {
                cards.push(...arr);
            }
        }
        if (this.deckResult.characters) cards.push(...this.deckResult.characters);
        if (this.deckResult.eternal) cards.push(...this.deckResult.eternal);
        return cards;
    }

    hasOwnershipData(): boolean {
        const all = this.allCards();
        return all.length > 0 && '_owned' in all[0];
    }

    isOwned(card: CardRecord): boolean {
        return card['_owned'] === true;
    }

    shoppingList(): CardRecord[] {
        if (!this.hasOwnershipData()) return [];
        return this.allCards().filter(c => !this.isOwned(c));
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
        return String(card['Name'] || 'Unknown Card');
    }

    tableDisplayName(card: CardRecord): string {
        return String(card['_table'] ?? '').replace(/_/g, ' ');
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

