import { DeckOption, RatioValues } from './app.types';

export const OFFICIAL: RatioValues = {
    ld_wc: 23, ld_t: 11, ld_pr: 6, ld_bb: 5, ld_bo: 6, ld_ba: 6,
    ld_dsh: 5, ld_ls: 1, ld_5c: 6, ld_4c: 12, ld_3c: 11, ld_2c: 6, ld_1c: 2,
    md_eb: 1, md_bo: 30, md_b: 30, md_ce: 9, md_hce: 9, md_ge: 8, md_be: 8, md_c: 5,
    td_a: 40, td_pas: 44, td_pai: 10, td_ou: 5, td_s: 1,
    sd_s: 3, rd_r: 9, // 3×3 room grid (Requiem mechanic; ignored if no Room cards in selected sets)
};

export const DRAFT: RatioValues = {
    ld_wc: 22, ld_t: 10, ld_pr: 5, ld_bb: 5, ld_bo: 5, ld_ba: 5,
    ld_dsh: 5, ld_ls: 1, ld_5c: 5, ld_4c: 10, ld_3c: 10, ld_2c: 5, ld_1c: 2,
    md_eb: 1, md_bo: 30, md_b: 30, md_ce: 9, md_hce: 9, md_ge: 8, md_be: 8, md_c: 5,
    td_a: 40, td_pas: 44, td_pai: 10, td_ou: 5, td_s: 1,
    sd_s: 3, rd_r: 9, // 3×3 room grid (Requiem mechanic; ignored if no Room cards in selected sets)
};

export const DECK_OPTIONS: {
    core: DeckOption[];
    promo: DeckOption[];
    other: DeckOption[];
} = {
    core: [
        { code: 'b2', label: 'Base Game V2', checked: true },
        { code: 'fsp2', label: 'Four Souls+ V2', checked: false },
        { code: 'r', label: 'Requiem', checked: false },
        { code: 'soi', label: 'Summer of Isaac', checked: false },
    ],
    promo: [
        { code: 'g2', label: 'Gold Box V2', checked: false },
        { code: 'rwz', label: 'Requiem Warp Zone', checked: false },
        { code: 'aa', label: 'Big Boi Alt Art', checked: false },
        { code: 't', label: 'Target', checked: false },
        { code: 'gi', label: 'Gish', checked: false },
        { code: 'tw', label: 'Tapeworm', checked: false },
        { code: 'dk', label: 'Dick Knots', checked: false },
        { code: 'ret', label: 'Retro', checked: false },
        { code: 'bum', label: 'The Legend of Bum-bo!', checked: false },
        { code: 'box', label: 'The Unboxing of Isaac', checked: false },
        { code: 'ytz', label: 'Youtooz', checked: false },
        { code: 'p', label: 'Promos', checked: false },
    ],
    other: [
        { code: 'tena', label: '10th Anniversary', checked: false },
        { code: 'gf', label: 'G-Fuel', checked: false },
        { code: 'mew', label: 'Mewgenics', checked: false },
        { code: 'nen', label: 'Nendoroid', checked: false },
    ],
};

export const LABEL_MAP: Record<string, string> = {
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

export const LOOT_KEYS = ['ld_wc', 'ld_t', 'ld_pr', 'ld_bb', 'ld_bo', 'ld_ba', 'ld_dsh', 'ld_ls', 'ld_5c', 'ld_4c', 'ld_3c', 'ld_2c', 'ld_1c'] as const;
export const MONSTER_KEYS = ['md_eb', 'md_bo', 'md_b', 'md_ce', 'md_hce', 'md_ge', 'md_be', 'md_c'] as const;
export const TREASURE_KEYS = ['td_a', 'td_pas', 'td_pai', 'td_ou', 'td_s'] as const;
