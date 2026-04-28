export { };

type DeckCard = Record<string, string>;

declare global {
    interface Window {
        electronAPI?: {
            buildDeck: (payload: DeckBuildRequest) => Promise<DeckBuildResponse>;
            countDeck: (payload: DeckBuildRequest) => Promise<{ count: number }>;
            getCollectionCards: () => Promise<CollectionCardsResponse>;
            updateCollectionCard: (cardId: string, payload: CollectionUpdateRequest) => Promise<CollectionUpdateResponse>;
            checkDbExists: () => Promise<boolean>;
            saveConfig: (config: SavedConfigIpc) => Promise<{ ok: boolean }>;
            loadConfigs: () => Promise<SavedConfigIpc[]>;
            deleteConfig: (name: string) => Promise<{ ok: boolean }>;
        };
    }
}

interface DeckBuildRequest {
    decks: string[];
    ratio: 'o' | 'd' | 'c';
    seed?: string;
    specplayers?: boolean;
    players?: number;
    eternalshuffle?: boolean;
    // Custom ratio fields
    ld_wc?: number; ld_t?: number; ld_pr?: number; ld_bb?: number;
    ld_bo?: number; ld_ba?: number; ld_dsh?: number; ld_ls?: number;
    ld_5c?: number; ld_4c?: number; ld_3c?: number; ld_2c?: number; ld_1c?: number;
    md_eb?: number; md_bo?: number; md_b?: number; md_ce?: number;
    md_hce?: number; md_ge?: number; md_be?: number; md_c?: number;
    td_a?: number; td_pas?: number; td_pai?: number; td_ou?: number; td_s?: number;
    sd_s?: number; rd_r?: number;
}

interface DeckSection {
    [key: string]: DeckCard[];
}

interface DeckBuildResponse {
    deck: {
        loot: DeckSection;
        monster: DeckSection;
        treasure: DeckSection;
        souls: DeckSection;
        rooms: DeckSection;
        characters?: DeckCard[];
        eternal?: DeckCard[];
    };
    warnings: string[];
    seed: string | null;
    selected_decks: string[];
    ratio_mode: string;
}

interface CollectionCard {
    [key: string]: string | number | boolean;
    card_id: string;
    _table: string;
    _card_rowid: number;
    owned: boolean;
    owned_count: number;
}

interface CollectionCardsResponse {
    cards: CollectionCard[];
    count: number;
}

interface CollectionUpdateRequest {
    owned?: boolean;
    owned_count?: number;
}

interface CollectionUpdateResponse {
    card_id: string;
    owned: boolean;
    owned_count: number;
}

interface SavedConfigIpc {
    name: string;
    ratio: 'o' | 'd' | 'c';
    ratioValues: Record<string, number>;
    selectedDecks: string[];
    seed: string;
    specplayers: boolean;
    players: number;
    eternalshuffle: boolean;
}
