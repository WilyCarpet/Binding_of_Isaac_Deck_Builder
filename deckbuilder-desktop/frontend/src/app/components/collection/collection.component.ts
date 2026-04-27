import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CardRecord, CollectionCard } from '../../app.types';
import { getCardPrimaryImage } from '../../card-image.util';
import { CardDialogComponent } from '../card-dialog.component';

@Component({
    selector: 'app-collection',
    imports: [CommonModule, FormsModule, CardDialogComponent],
    templateUrl: './collection.component.html',
    styleUrl: './collection.component.scss',
})
export class CollectionComponent implements OnInit {
    cards: CollectionCard[] = [];
    filteredCards: CollectionCard[] = [];

    loading = false;
    bulkUpdating = false;
    loadError = '';

    search = '';
    ownedOnly = false;
    selectedTable = 'all';
    selectedSet = 'all';
    tables: string[] = [];
    sets: string[] = [];

    selectedCard: CollectionCard | null = null;
    selectedContext = 'Collection';

    private tileImageIndexes = new Map<string, number>();

    async ngOnInit(): Promise<void> {
        await this.loadCollection();
    }

    get ownedCardsCount(): number {
        return this.cards.filter(c => c.owned).length;
    }

    get totalOwnedCopies(): number {
        return this.cards.reduce((sum, c) => sum + c.owned_count, 0);
    }

    get areAllVisibleCardsOwned(): boolean {
        return this.filteredCards.length > 0 && this.filteredCards.every(card => card.owned);
    }

    async loadCollection(): Promise<void> {
        this.loading = true;
        this.loadError = '';

        try {
            let response: { cards: CollectionCard[] };

            if (window.electronAPI) {
                response = await window.electronAPI.getCollectionCards();
            } else {
                const r = await fetch('http://127.0.0.1:5001/collection/cards');
                if (!r.ok) throw new Error(await r.text());
                response = await r.json();
            }

            this.cards = response.cards ?? [];
            this.tables = ['all', ...new Set(this.cards.map(c => c._table))];
            this.sets = ['all', ...new Set(this.cards.map(c => this.getSetLabel(c)))];
            this.applyFilters();
        } catch (err) {
            this.loadError = err instanceof Error ? err.message : String(err);
        } finally {
            this.loading = false;
        }
    }

    applyFilters(): void {
        const q = this.search.trim().toLowerCase();

        this.filteredCards = this.cards.filter(card => {
            if (this.ownedOnly && !card.owned) {
                return false;
            }

            if (this.selectedTable !== 'all' && card._table !== this.selectedTable) {
                return false;
            }

            if (this.selectedSet !== 'all' && this.getSetLabel(card) !== this.selectedSet) {
                return false;
            }

            if (!q) {
                return true;
            }

            const haystack = [
                card['Name'] ?? '',
                card['Set'] ?? '',
                card['Set Code'] ?? '',
                card['Card Type'] ?? '',
                card._table,
            ].join(' ').toLowerCase();

            return haystack.includes(q);
        });
    }

    getSetLabel(card: CollectionCard): string {
        const setName = String(card['Set'] ?? '').trim();
        if (setName) {
            return setName;
        }

        const setCode = String(card['Set Code'] ?? '').trim();
        return setCode || 'Unknown Set';
    }

    async onOwnedToggle(card: CollectionCard, nextOwned: boolean): Promise<void> {
        const nextCount = nextOwned ? Math.max(1, card.owned_count) : 0;
        await this.persistCard(card, nextOwned, nextCount);
    }

    async onOwnedCountChange(card: CollectionCard, rawValue: string): Promise<void> {
        const parsed = Number.parseInt(rawValue, 10);
        const nextCount = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
        const nextOwned = nextCount > 0;
        await this.persistCard(card, nextOwned, nextCount);
    }

    async onVisibleOwnedCheckboxChange(nextChecked: boolean): Promise<void> {
        if (!nextChecked || this.filteredCards.length === 0 || this.bulkUpdating) {
            return;
        }

        this.bulkUpdating = true;
        this.loadError = '';

        try {
            for (const card of this.filteredCards) {
                const targetCount = Math.max(1, card.owned_count);
                if (card.owned && card.owned_count >= targetCount) {
                    continue;
                }
                await this.persistCard(card, true, targetCount, true);
            }
        } finally {
            this.bulkUpdating = false;
            this.applyFilters();
        }
    }

    openCardDialog(card: CollectionCard, event?: Event): void {
        event?.preventDefault();
        event?.stopPropagation();
        this.selectedCard = card;
    }

    closeCardDialog(): void {
        this.selectedCard = null;
    }

    get selectedCardRecord(): CardRecord | null {
        return this.selectedCard as unknown as CardRecord | null;
    }

    shouldShowTileImage(card: CollectionCard): boolean {
        return this.getTileImageIndex(card) === 0 && !!this.tileImageSrc(card);
    }

    tileImageSrc(card: CollectionCard): string {
        return getCardPrimaryImage(card as unknown as CardRecord);
    }

    onTileImageError(card: CollectionCard): void {
        this.tileImageIndexes.set(card.card_id, 1);
    }

    trackByCardId(_index: number, card: CollectionCard): string {
        return card.card_id;
    }

    private getTileImageIndex(card: CollectionCard): number {
        return this.tileImageIndexes.get(card.card_id) ?? 0;
    }

    private async persistCard(card: CollectionCard, nextOwned: boolean, nextCount: number, skipApplyFilters = false): Promise<void> {
        const previousOwned = card.owned;
        const previousCount = card.owned_count;

        card.owned = nextOwned;
        card.owned_count = nextCount;

        try {
            let response: { owned: boolean; owned_count: number };

            if (window.electronAPI) {
                response = await window.electronAPI.updateCollectionCard(card.card_id, {
                    owned: nextOwned,
                    owned_count: nextCount,
                });
            } else {
                const r = await fetch(`http://127.0.0.1:5001/collection/cards/${encodeURIComponent(card.card_id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ owned: nextOwned, owned_count: nextCount }),
                });
                if (!r.ok) throw new Error(await r.text());
                response = await r.json();
            }

            card.owned = response.owned;
            card.owned_count = response.owned_count;
        } catch (err) {
            card.owned = previousOwned;
            card.owned_count = previousCount;
            this.loadError = err instanceof Error ? err.message : String(err);
        }

        if (!skipApplyFilters) {
            this.applyFilters();
        }
    }
}
