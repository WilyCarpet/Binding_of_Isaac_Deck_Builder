import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface RatioValues {
  ld_wc: number; ld_t: number; ld_pr: number; ld_bb: number;
  ld_bo: number; ld_ba: number; ld_dsh: number; ld_ls: number;
  ld_5c: number; ld_4c: number; ld_3c: number; ld_2c: number; ld_1c: number;
  md_eb: number; md_bo: number; md_b: number; md_ce: number;
  md_hce: number; md_ge: number; md_be: number; md_c: number;
  td_a: number; td_pas: number; td_pai: number; td_ou: number; td_s: number;
  sd_s: number; rd_r: number;
}

const OFFICIAL: RatioValues = {
  ld_wc: 23, ld_t: 11, ld_pr: 6, ld_bb: 5, ld_bo: 6, ld_ba: 6,
  ld_dsh: 5, ld_ls: 1, ld_5c: 6, ld_4c: 12, ld_3c: 11, ld_2c: 6, ld_1c: 2,
  md_eb: 1, md_bo: 30, md_b: 30, md_ce: 9, md_hce: 9, md_ge: 8, md_be: 8, md_c: 5,
  td_a: 40, td_pas: 44, td_pai: 10, td_ou: 5, td_s: 1,
  sd_s: 3, rd_r: 0,
};

const DRAFT: RatioValues = {
  ld_wc: 22, ld_t: 10, ld_pr: 5, ld_bb: 5, ld_bo: 5, ld_ba: 5,
  ld_dsh: 5, ld_ls: 1, ld_5c: 5, ld_4c: 10, ld_3c: 10, ld_2c: 5, ld_1c: 2,
  md_eb: 1, md_bo: 30, md_b: 30, md_ce: 9, md_hce: 9, md_ge: 8, md_be: 8, md_c: 5,
  td_a: 40, td_pas: 44, td_pai: 10, td_ou: 5, td_s: 1,
  sd_s: 3, rd_r: 0,
};

export const DECK_OPTIONS = {
  core: [
    { code: 'b2',   label: 'Base Game V2',    checked: true },
    { code: 'fsp2', label: 'Four Souls+ V2',  checked: false },
    { code: 'r',    label: 'Requiem',         checked: false },
    { code: 'soi',  label: 'Summer of Isaac', checked: false },
  ],
  promo: [
    { code: 'g2',   label: 'Gold Box V2',             checked: false },
    { code: 'rwz',  label: 'Requiem Warp Zone',        checked: false },
    { code: 'aa',   label: 'Big Boi Alt Art',          checked: false },
    { code: 't',    label: 'Target',                   checked: false },
    { code: 'gi',   label: 'Gish',                     checked: false },
    { code: 'tw',   label: 'Tapeworm',                 checked: false },
    { code: 'dk',   label: 'Dick Knots',               checked: false },
    { code: 'ret',  label: 'Retro',                    checked: false },
    { code: 'bum',  label: 'The Legend of Bum-bo!',    checked: false },
    { code: 'box',  label: 'The Unboxing of Isaac',    checked: false },
    { code: 'ytz',  label: 'Youtooz',                  checked: false },
    { code: 'p',    label: 'Promos',                   checked: false },
  ],
  other: [
    { code: 'tena', label: '10th Anniversary', checked: false },
    { code: 'gf',   label: 'G-Fuel',           checked: false },
    { code: 'mew',  label: 'Mewgenics',        checked: false },
    { code: 'nen',  label: 'Nendoroid',        checked: false },
  ],
} as const;

type CardRecord = Record<string, string>;

interface DeckResult {
  loot: Record<string, CardRecord[]>;
  monster: Record<string, CardRecord[]>;
  treasure: Record<string, CardRecord[]>;
  souls: Record<string, CardRecord[]>;
  rooms: Record<string, CardRecord[]>;
  characters?: CardRecord[];
  eternal?: CardRecord[];
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
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

  readonly LABEL_MAP: Record<string, string> = {
    ld_wc: 'WildCards', ld_t: 'Trinkets', ld_pr: 'Pills/Runes',
    ld_bb: 'Butter Beans', ld_bo: 'Bombs', ld_ba: 'Batteries',
    ld_dsh: 'Dice Shards/Soul Hearts', ld_ls: 'Lost Souls', ld_5c: 'Nickels',
    ld_4c: '4¢', ld_3c: '3¢', ld_2c: '2¢', ld_1c: '1¢',
    md_eb: 'Epic Bosses (+2 Soul Boss)', md_bo: 'Bosses', md_b: 'Basic Enemies',
    md_ce: 'Cursed Enemies', md_hce: 'Holy/Charmed Enemies',
    md_ge: 'Good Events', md_be: 'Bad Events', md_c: 'Curses',
    td_a: 'Active Items', td_pas: 'Passive Items', td_pai: 'Paid Items',
    td_ou: 'One Use Items', td_s: 'Soul Items',
    sd_s: 'Souls', rd_r: 'Rooms',
  };

  readonly LOOT_KEYS  = ['ld_wc','ld_t','ld_pr','ld_bb','ld_bo','ld_ba','ld_dsh','ld_ls','ld_5c','ld_4c','ld_3c','ld_2c','ld_1c'] as const;
  readonly MONSTER_KEYS = ['md_eb','md_bo','md_b','md_ce','md_hce','md_ge','md_be','md_c'] as const;
  readonly TREASURE_KEYS = ['td_a','td_pas','td_pai','td_ou','td_s'] as const;

  onRatioChange(): void {
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

  countCards(section: Record<string, CardRecord[]>): number {
    return Object.values(section).reduce((sum, arr) => sum + arr.length, 0);
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

  sectionEntries(section: Record<string, CardRecord[]>): [string, CardRecord[]][] {
    return Object.entries(section).filter(([, arr]) => arr.length > 0);
  }

  totalCards(): number {
    if (!this.deckResult) return 0;
    return (
      this.countCards(this.deckResult.loot) +
      this.countCards(this.deckResult.monster) +
      this.countCards(this.deckResult.treasure) +
      this.countCards(this.deckResult.souls) +
      this.countCards(this.deckResult.rooms)
    );
  }
}
