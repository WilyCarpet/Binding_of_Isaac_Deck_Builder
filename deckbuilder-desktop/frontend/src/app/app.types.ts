export interface RatioValues {
    [key: string]: number;
    ld_wc: number; ld_t: number; ld_pr: number; ld_bb: number;
    ld_bo: number; ld_ba: number; ld_dsh: number; ld_ls: number;
    ld_5c: number; ld_4c: number; ld_3c: number; ld_2c: number; ld_1c: number;
    md_eb: number; md_bo: number; md_b: number; md_ce: number;
    md_hce: number; md_ge: number; md_be: number; md_c: number;
    td_a: number; td_pas: number; td_pai: number; td_ou: number; td_s: number;
    sd_s: number; rd_r: number;
}

export interface DeckOption {
    code: string;
    label: string;
    checked: boolean;
}

export type CardRecord = Record<string, string | boolean | number>;

export interface CollectionCard {
    [key: string]: string | number | boolean;
    card_id: string;
    _table: string;
    _card_rowid: number;
    owned: boolean;
    owned_count: number;
}

export interface DeckResult {
    loot: Record<string, CardRecord[]>;
    monster: Record<string, CardRecord[]>;
    treasure: Record<string, CardRecord[]>;
    souls: Record<string, CardRecord[]>;
    rooms: Record<string, CardRecord[]>;
    characters?: CardRecord[];
    eternal?: CardRecord[];
}
