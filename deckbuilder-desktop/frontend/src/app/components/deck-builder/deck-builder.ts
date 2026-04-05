import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DECK_OPTIONS,
  DRAFT,
  LABEL_MAP,
  LOOT_KEYS,
  MONSTER_KEYS,
  OFFICIAL,
  TREASURE_KEYS,
} from '../../app.constants';
import { DeckResult, RatioValues } from '../../app.types';
import { LeftColumnComponent } from '../left-column.component';
import { ResultsPanelComponent } from '../results-panel.component';
import { RightColumnComponent } from '../right-column.component';

@Component({
  selector: 'app-deck-builder',
  imports: [CommonModule, FormsModule, LeftColumnComponent, RightColumnComponent, ResultsPanelComponent],
  templateUrl: './deck-builder.html',
  styleUrl: './deck-builder.scss',
})
export class DeckBuilderComponent {
  ratio: 'o' | 'd' | 'c' = 'o';
  ratioValues: RatioValues = { ...OFFICIAL };

  coreDeckState = DECK_OPTIONS.core.map(d => ({ ...d }));
  promoDeckState = DECK_OPTIONS.promo.map(d => ({ ...d }));
  otherDeckState = DECK_OPTIONS.other.map(d => ({ ...d }));

  seed = '';
  specplayers = false;
  players = 4;
  eternalshuffle = false;

  building = false;
  buildError = '';
  buildWarnings: string[] = [];
  deckResult: DeckResult | null = null;
  resultSeed: string | null = null;

  readonly LABEL_MAP = LABEL_MAP;
  readonly LOOT_KEYS = LOOT_KEYS;
  readonly MONSTER_KEYS = MONSTER_KEYS;
  readonly TREASURE_KEYS = TREASURE_KEYS;

  onRatioChange(nextRatio: 'o' | 'd' | 'c'): void {
    this.ratio = nextRatio;
    if (this.ratio === 'o') {
      this.ratioValues = { ...OFFICIAL };
    } else if (this.ratio === 'd') {
      this.ratioValues = { ...DRAFT };
    }
  }

  getSelectedDecks(): string[] {
    return [
      ...this.coreDeckState,
      ...this.promoDeckState,
      ...this.otherDeckState,
    ].filter(d => d.checked).map(d => d.code);
  }

  async buildDeck(): Promise<void> {
    const selected = this.getSelectedDecks();
    if (selected.length === 0) {
      this.buildError = 'Select at least one deck.';
      return;
    }

    this.building = true;
    this.buildError = '';
    this.deckResult = null;
    this.buildWarnings = [];

    const payload: Record<string, unknown> = {
      decks: selected,
      ratio: this.ratio,
      seed: this.seed,
      specplayers: this.specplayers,
      players: this.players,
      eternalshuffle: this.eternalshuffle,
      ...this.ratioValues,
    };

    try {
      let response: { deck: DeckResult; warnings: string[]; seed: string | null };

      if (window.electronAPI) {
        response = await window.electronAPI.buildDeck(payload as never);
      } else {
        const r = await fetch('http://127.0.0.1:5001/deck/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(await r.text());
        response = await r.json();
      }

      this.deckResult = response.deck;
      this.buildWarnings = response.warnings ?? [];
      this.resultSeed = response.seed;
    } catch (err) {
      this.buildError = err instanceof Error ? err.message : String(err);
    } finally {
      this.building = false;
    }
  }

}
