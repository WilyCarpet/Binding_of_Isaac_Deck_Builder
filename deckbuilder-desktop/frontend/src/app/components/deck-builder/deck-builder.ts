import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
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
import { DeckResult, RatioValues, SavedConfig } from '../../app.types';
import { LeftColumnComponent } from '../left-column.component';
import { ResultsPanelComponent } from '../results-panel.component';
import { RightColumnComponent } from '../right-column.component';

const LS_KEY = 'deckbuilder-saved-configs';

@Component({
  selector: 'app-deck-builder',
  imports: [CommonModule, FormsModule, LeftColumnComponent, RightColumnComponent, ResultsPanelComponent],
  templateUrl: './deck-builder.html',
  styleUrl: './deck-builder.scss',
})
export class DeckBuilderComponent implements OnInit {
  ratio: 'o' | 'd' | 'c' = 'o';
  ratioValues: RatioValues = { ...OFFICIAL };

  coreDeckState = DECK_OPTIONS.core.map(d => ({ ...d }));
  promoDeckState = DECK_OPTIONS.promo.map(d => ({ ...d }));
  otherDeckState = DECK_OPTIONS.other.map(d => ({ ...d }));

  seed = '';
  specplayers = false;
  players = 4;
  eternalshuffle = false;
  ownedOnly = false;

  building = false;
  buildError = '';
  buildWarnings: string[] = [];
  deckResult: DeckResult | null = null;
  resultSeed: string | null = null;

  savedConfigs: SavedConfig[] = [];
  configNameInput = '';

  liveCardCount: number | null = null;
  countLoading = false;
  private _countTimer: ReturnType<typeof setTimeout> | null = null;

  readonly LABEL_MAP = LABEL_MAP;
  readonly LOOT_KEYS = LOOT_KEYS;
  readonly MONSTER_KEYS = MONSTER_KEYS;
  readonly TREASURE_KEYS = TREASURE_KEYS;

  async ngOnInit(): Promise<void> {
    if (window.electronAPI) {
      this.savedConfigs = await window.electronAPI.loadConfigs() as SavedConfig[];
    } else {
      const raw = localStorage.getItem(LS_KEY);
      this.savedConfigs = raw ? JSON.parse(raw) : [];
    }
    this.triggerCountUpdate();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key === 'Enter' && !this.building) {
      this.buildDeck();
    }
  }

  onRatioChange(nextRatio: 'o' | 'd' | 'c'): void {
    this.ratio = nextRatio;
    if (this.ratio === 'o') {
      this.ratioValues = { ...OFFICIAL };
    } else if (this.ratio === 'd') {
      this.ratioValues = { ...DRAFT };
    }
    this.triggerCountUpdate();
  }

  onSpecplayersChange(v: boolean): void {
    this.specplayers = v;
    this.triggerCountUpdate();
  }

  onPlayersChange(v: number): void {
    this.players = v;
    this.triggerCountUpdate();
  }

  onEternalshuffleChange(v: boolean): void {
    this.eternalshuffle = v;
    this.triggerCountUpdate();
  }

  onOwnedOnlyChange(v: boolean): void {
    this.ownedOnly = v;
    this.triggerCountUpdate();
  }

  triggerCountUpdate(): void {
    if (this._countTimer !== null) {
      clearTimeout(this._countTimer);
    }
    this._countTimer = setTimeout(() => this.fetchLiveCount(), 400);
  }

  private async fetchLiveCount(): Promise<void> {
    const selected = this.getSelectedDecks();
    if (selected.length === 0) {
      this.liveCardCount = 0;
      return;
    }
    this.countLoading = true;
    const payload: Record<string, unknown> = {
      decks: selected,
      ratio: this.ratio,
      specplayers: this.specplayers,
      players: this.players,
      eternal_count: this.eternalshuffle ? this.players : 0,
      owned_only: this.ownedOnly,
      ...this.ratioValues,
    };
    try {
      let response: { count: number };
      if (window.electronAPI) {
        response = await window.electronAPI.countDeck(payload as never);
      } else {
        const r = await fetch('http://127.0.0.1:5001/deck/count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(await r.text());
        response = await r.json();
      }
      this.liveCardCount = response.count;
    } catch {
      this.liveCardCount = null;
    } finally {
      this.countLoading = false;
    }
  }

  getSelectedDecks(): string[] {
    return [
      ...this.coreDeckState,
      ...this.promoDeckState,
      ...this.otherDeckState,
    ].filter(d => d.checked).map(d => d.code);
  }

  async saveCurrentConfig(): Promise<void> {
    const name = this.configNameInput.trim();
    if (!name) return;
    const config: SavedConfig = {
      name,
      ratio: this.ratio,
      ratioValues: { ...this.ratioValues },
      selectedDecks: this.getSelectedDecks(),
      seed: this.seed,
      specplayers: this.specplayers,
      players: this.players,
      eternalshuffle: this.eternalshuffle,
    };
    if (window.electronAPI) {
      await window.electronAPI.saveConfig(config);
      this.savedConfigs = await window.electronAPI.loadConfigs() as SavedConfig[];
    } else {
      const idx = this.savedConfigs.findIndex(c => c.name === name);
      if (idx >= 0) {
        this.savedConfigs = this.savedConfigs.map((c, i) => i === idx ? config : c);
      } else {
        this.savedConfigs = [...this.savedConfigs, config];
      }
      localStorage.setItem(LS_KEY, JSON.stringify(this.savedConfigs));
    }
    this.configNameInput = '';
  }

  loadConfig(config: SavedConfig): void {
    this.ratio = config.ratio;
    this.ratioValues = { ...config.ratioValues };
    this.seed = config.seed;
    this.specplayers = config.specplayers;
    this.players = config.players;
    this.eternalshuffle = config.eternalshuffle;
    for (const d of [...this.coreDeckState, ...this.promoDeckState, ...this.otherDeckState]) {
      d.checked = config.selectedDecks.includes(d.code);
    }
    this.triggerCountUpdate();
  }

  async deleteConfig(name: string): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.deleteConfig(name);
      this.savedConfigs = await window.electronAPI.loadConfigs() as SavedConfig[];
    } else {
      this.savedConfigs = this.savedConfigs.filter(c => c.name !== name);
      localStorage.setItem(LS_KEY, JSON.stringify(this.savedConfigs));
    }
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
      eternal_count: this.eternalshuffle ? this.players : 0,
      owned_only: this.ownedOnly,
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
